const { corsHeaders, getUser, getUserProfile, incrementUsage, supabase } = require("./utils/db");

const PROP_MARKETS = {
  basketball_nba: ['player_points','player_rebounds','player_assists','player_threes','player_blocks','player_steals','player_turnovers','player_points_rebounds_assists','player_points_rebounds','player_points_assists','player_rebounds_assists'],
  basketball_ncaab: ['player_points','player_rebounds','player_assists','player_threes'],
  icehockey_nhl: ['player_goals','player_assists','player_points','player_shots_on_goal','player_blocked_shots'],
  baseball_mlb: ['batter_hits','batter_total_bases','batter_rbis','batter_runs_scored','batter_strikeouts','batter_home_runs','pitcher_strikeouts','pitcher_hits_allowed','pitcher_outs'],
  americanfootball_nfl: ['player_pass_yds','player_pass_tds','player_pass_completions','player_rush_yds','player_rush_attempts','player_reception_yds','player_receptions','player_anytime_td'],
  americanfootball_ncaaf: ['player_pass_yds','player_pass_tds','player_rush_yds','player_reception_yds','player_receptions','player_anytime_td'],
};
function getPropMarkets(k) {
  if (PROP_MARKETS[k]) return PROP_MARKETS[k];
  if (k.startsWith('soccer_')) return ['player_goals','player_assists','player_shots_on_target'];
  return [];
}

const CACHE_TTL = 15 * 60 * 1000;
const memCache = new Map();
function memGet(k) { const c = memCache.get(k); return (c && Date.now() - c.ts < CACHE_TTL) ? c.data : null; }
function memSet(k, d) {
  memCache.set(k, { data: d, ts: Date.now() });
  const now = Date.now();
  for (const [key, val] of memCache) { if (now - val.ts > 30*60*1000) memCache.delete(key); }
}

async function dbGet(k) {
  try {
    const { data } = await supabase.from('odds_cache').select('data,fetched_at').eq('cache_key', k).single();
    if (!data) return null;
    if (Date.now() - new Date(data.fetched_at).getTime() > CACHE_TTL) return null;
    return typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
  } catch { return null; }
}

async function dbSet(k, d) {
  try { await supabase.from('odds_cache').upsert({ cache_key: k, data: d, fetched_at: new Date().toISOString() }, { onConflict: 'cache_key' }); }
  catch (e) { console.error('Cache write:', e.message); }
}

async function cached(key, fetcher) {
  let d = memGet(key);
  if (d) return d;
  d = await dbGet(key);
  if (d) { memSet(key, d); return d; }
  d = await fetcher();
  if (d) { memSet(key, d); await dbSet(key, d); }
  return d;
}

const API = 'https://api.the-odds-api.com/v4';
const KEY = () => process.env.ODDS_API_KEY;

function mergeProps(coreGames, propMap) {
  if (!propMap || !propMap.size) return coreGames;
  return coreGames.map(g => {
    const pg = propMap.get(g.id);
    if (!pg) return g;
    const merged = (g.bookmakers || []).map(bk => {
      const pbk = (pg.bookmakers || []).find(p => p.key === bk.key);
      if (!pbk) return bk;
      const mkts = [...(bk.markets || [])];
      for (const m of (pbk.markets || [])) { if (!mkts.some(x => x.key === m.key)) mkts.push(m); }
      return { ...bk, markets: mkts };
    });
    for (const pbk of (pg.bookmakers || [])) {
      if (!merged.some(m => m.key === pbk.key)) merged.push(pbk);
    }
    return { ...g, bookmakers: merged };
  });
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: corsHeaders, body: "" };
  try {
    const user = await getUser(event.headers.authorization);
    if (!user) return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: "Unauthorized" }) };
    const profile = await getUserProfile(user.id);
    if (!profile) return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ error: "No profile found." }) };

    const plan = profile.plan || "free";
    const used = profile.fetches_used || 0;
    const limit = plan === "free" ? 10 : plan === "standard" ? 300 : null;
    if (limit !== null && used >= limit) {
      return { statusCode: 429, headers: corsHeaders, body: JSON.stringify({ error: "Fetch limit reached", used, limit, plan, message: plan === "free" ? "You've used all 10 free fetches." : "Monthly limit reached." }) };
    }

    const params = event.queryStringParameters || {};
    const sportKey = params.sport;
    if (!sportKey) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: "Missing sport" }) };
    const bookmakers = params.bookmakers || "pinnacle,betonlineag,bovada,draftkings,fanduel,betmgm,williamhill_us,espnbet,fanatics,betrivers,hardrockbet";

    await incrementUsage(user.id);

    // 1) Core markets (bulk endpoint, 3 credits)
    const core = await cached('core:' + sportKey, async () => {
      const url = API + '/sports/' + sportKey + '/odds/?apiKey=' + KEY() + '&regions=us&markets=h2h,spreads,totals&oddsFormat=decimal&bookmakers=' + bookmakers;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Core odds ' + res.status);
      return res.json();
    });

    // 2) Player props (per-event endpoint, cached per game)
    const propList = getPropMarkets(sportKey);
    const propMap = new Map();

    if (propList.length > 0 && core && core.length > 0) {
      const mkts = propList.join(',');
      const promises = core.map(game =>
        cached('props:' + game.id, async () => {
          try {
            const url = API + '/sports/' + sportKey + '/events/' + game.id + '/odds?apiKey=' + KEY() + '&regions=us&markets=' + mkts + '&oddsFormat=decimal&bookmakers=' + bookmakers;
            const res = await fetch(url);
            if (!res.ok) return null;
            return res.json();
          } catch { return null; }
        }).then(d => { if (d) propMap.set(game.id, d); })
      );
      await Promise.all(promises);
    }

    // 3) Merge
    const merged = mergeProps(core, propMap);

    return {
      statusCode: 200, headers: corsHeaders,
      body: JSON.stringify({ odds: merged, propMarkets: propList, usage: { used: used + 1, limit, plan } }),
    };
  } catch (err) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: err.message }) };
  }
};

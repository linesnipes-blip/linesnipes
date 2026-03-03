// ═══════════════════════════════════════════════════
// LINESNIPES engine.js — State, Constants, Math, API
// ═══════════════════════════════════════════════════

const CONFIG = {
  SUPABASE_URL: 'https://ayriinlzirgyktawgfhc.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5cmlpbmx6aXJneWt0YXdnZmhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0OTM5MzUsImV4cCI6MjA4ODA2OTkzNX0.Iz_uLYRJxOwaT0W5aWf8CdSn5gEARxkYh-E1yYFDu5g',
  API_BASE: '/api',
};

let sb = null;
try {
  if (CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY) {
    sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  }
} catch (e) { console.warn('Supabase not configured yet'); }

// ─── PROMO CODES ───
async function applyPromo(code) {
  const c = (code || '').trim().toUpperCase();
  if (!c) return 'Please enter a code.';
  try {
    const data = await apiFetch('promo', { method: 'POST', body: JSON.stringify({ code: c }) });
    if (data.error) return data.error;
    // Reload profile from server
    await loadProfile();
    return null;
  } catch (e) { return 'Failed to apply promo.'; }
}

// ─── STATE ───
const S = {
  user: null, profile: null, page: 'landing',
  sports: null, sport: null, odds: null,
  loading: false, error: '',
  bonusType: 'profit_boost', boostPct: '50', maxBet: '50',
  numLegs: '3', parlayMode: 'standard',
  minOdds: '', maxOdds: '', sportsbook: 'draftkings',
  selectedGame: null, singleResults: null, parlayResults: null,
  expandedIdx: null, expandedMath: null, expandedGroups: {},
};

function set(u) { Object.assign(S, u); render(); }

// ─── CONSTANTS ───
const BONUS_TYPES = [
  { key: 'profit_boost', label: 'Profit Boost', icon: '🚀' },
  { key: 'risk_free', label: 'Risk-Free', icon: '🛡️' },
  { key: 'odds_boost', label: 'Odds Boost', icon: '⚡' },
  { key: 'parlay_boost', label: 'Parlay Boost', icon: '🔗' },
];

const BOOKS = [
  { key: 'draftkings', label: 'DraftKings', c: '#53d337' },
  { key: 'fanduel', label: 'FanDuel', c: '#1493ff' },
  { key: 'betmgm', label: 'BetMGM', c: '#c4a64f' },
  { key: 'williamhill_us', label: 'Caesars', c: '#0a4d2c' },
  { key: 'espnbet', label: 'ESPN BET', c: '#d00' },
  { key: 'fanatics', label: 'Fanatics', c: '#8866cc' },
  { key: 'betrivers', label: 'BetRivers', c: '#1e88e5' },
  { key: 'bovada', label: 'Bovada', c: '#e8433e' },
  { key: 'betonlineag', label: 'BetOnline', c: '#f5a623' },
  { key: 'hardrockbet', label: 'Hard Rock', c: '#c6a04c' },
];

const SHARP = ['pinnacle', 'betonlineag', 'bovada', 'betfair_ex_eu'];

const PRIO_SPORTS = [
  'americanfootball_ncaaf',
  'basketball_nba', 'basketball_ncaab',
  'icehockey_nhl', 'mma_mixed_martial_arts',
  'baseball_mlb', 'boxing_boxing',
];

// ─── MATH ───
function impliedProb(d) { return 1 / d; }

function removeVig(outcomes) {
  const t = outcomes.reduce((s, o) => s + impliedProb(o.price), 0);
  return outcomes.map(o => ({ ...o, fairProb: impliedProb(o.price) / t, fairDecimal: t / impliedProb(o.price) }));
}

function amOdds(d) {
  if (!d || d <= 1) return '—';
  return d >= 2 ? '+' + Math.round((d - 1) * 100) : '−' + Math.round(100 / (d - 1));
}

function amToDec(input) {
  if (!input || input === '') return null;
  const n = parseFloat(String(input).trim().replace('−', '-'));
  if (isNaN(n)) return null;
  return n > 0 ? 1 + n / 100 : n < 0 ? 1 + 100 / Math.abs(n) : null;
}

function passFilter(dec, minS, maxS) {
  const mn = amToDec(minS), mx = amToDec(maxS);
  if (mn != null && dec < mn) return false;
  if (mx != null && dec > mx) return false;
  return true;
}

function calcEV({ bonusType, boostPct, maxBet, bookDecimal, fairProb }) {
  const stake = maxBet;
  if (bonusType === 'profit_boost') {
    const np = (bookDecimal - 1) * stake;
    const bp = np * (1 + boostPct / 100);
    const bpay = stake + bp;
    const ev = fairProb * bpay - stake;
    const evPct = (ev / stake) * 100;
    return { ev, evPct, stake, math: [
      `Fair probability: ${(fairProb*100).toFixed(2)}%`,
      `Book odds: ${amOdds(bookDecimal)} (${bookDecimal.toFixed(3)})`,
      `Normal profit: (${bookDecimal.toFixed(3)} − 1) × $${stake.toFixed(2)} = $${np.toFixed(2)}`,
      `Boosted profit: $${np.toFixed(2)} × ${(1+boostPct/100).toFixed(2)} = $${bp.toFixed(2)}`,
      `Payout if win: $${stake.toFixed(2)} + $${bp.toFixed(2)} = $${bpay.toFixed(2)}`,
      `EV = ${(fairProb*100).toFixed(2)}% × $${bpay.toFixed(2)} − $${stake.toFixed(2)} = $${ev.toFixed(2)}`,
      `EV% = ${evPct.toFixed(2)}%`,
    ]};
  }
  if (bonusType === 'risk_free') {
    const profit = (bookDecimal - 1) * stake;
    const fbv = stake * 0.7;
    const ev = fairProb * profit + (1 - fairProb) * fbv;
    const evPct = (ev / stake) * 100;
    return { ev, evPct, stake, math: [
      `Fair probability: ${(fairProb*100).toFixed(2)}%`,
      `Book odds: ${amOdds(bookDecimal)} (${bookDecimal.toFixed(3)})`,
      `Profit if win: (${bookDecimal.toFixed(3)} − 1) × $${stake.toFixed(2)} = $${profit.toFixed(2)}`,
      `Free bet value if loss: $${stake.toFixed(2)} × 70% = $${fbv.toFixed(2)}`,
      `EV = ${(fairProb*100).toFixed(2)}% × $${profit.toFixed(2)} + ${((1-fairProb)*100).toFixed(2)}% × $${fbv.toFixed(2)} = $${ev.toFixed(2)}`,
      `EV% = ${evPct.toFixed(2)}%`,
    ]};
  }
  if (bonusType === 'odds_boost') {
    const bd = bookDecimal * (1 + boostPct / 100);
    const payout = bd * stake;
    const ev = fairProb * payout - stake;
    const evPct = (ev / stake) * 100;
    return { ev, evPct, stake, math: [
      `Fair probability: ${(fairProb*100).toFixed(2)}%`,
      `Original: ${amOdds(bookDecimal)} → Boosted: ${amOdds(bd)} (${bd.toFixed(3)})`,
      `Payout if win: ${bd.toFixed(3)} × $${stake.toFixed(2)} = $${payout.toFixed(2)}`,
      `EV = ${(fairProb*100).toFixed(2)}% × $${payout.toFixed(2)} − $${stake.toFixed(2)} = $${ev.toFixed(2)}`,
      `EV% = ${evPct.toFixed(2)}%`,
    ]};
  }
  return { ev: 0, evPct: 0, stake: 0, math: [] };
}

function extractAllOutcomes(games, bookKey) {
  const out = [];
  for (const g of games) {
    const tb = g.bookmakers?.find(b => b.key === bookKey);
    const sharp = g.bookmakers?.find(b => SHARP.includes(b.key) && b.key !== bookKey);
    if (!tb || !sharp) continue;
    for (const m of tb.markets || []) {
      const sm = sharp.markets?.find(x => x.key === m.key);
      if (!sm) continue;
      const fair = removeVig(sm.outcomes);
      for (const o of m.outcomes) {
        const f = fair.find(fi => fi.name === o.name && (fi.point === o.point || (!fi.point && !o.point)));
        if (!f) continue;
        out.push({
          gameId: g.id, game: `${g.away_team} @ ${g.home_team}`,
          gameShort: `${g.away_team.split(' ').pop()} @ ${g.home_team.split(' ').pop()}`,
          market: m.key, marketLabel: m.key === 'h2h' ? 'ML' : m.key === 'spreads' ? 'Spread' : 'Total',
          outcome: o.name, point: o.point,
          bookDecimal: o.price, fairProb: f.fairProb, fairDecimal: f.fairDecimal,
          sharpBook: sharp.title, edge: (o.price / f.fairDecimal) - 1,
        });
      }
    }
  }
  return out.sort((a, b) => b.edge - a.edge);
}

function scoreParlays(combos, stake, boostPct, topN) {
  return combos.map(legs => {
    const cfp = legs.reduce((p, l) => p * l.fairProb, 1);
    const pd = legs.reduce((d, l) => d * l.bookDecimal, 1);
    const np = (pd - 1) * stake, bp = np * (1 + boostPct / 100);
    const bpay = stake + bp, bd = bpay / stake;
    const ev = cfp * bpay - stake, evPct = (ev / stake) * 100;
    const ug = new Set(legs.map(l => l.gameId)).size;
    const math = [
      '── LEG PROBABILITIES ──',
      ...legs.map((l, i) => `Leg ${i+1}: ${l.outcome}${l.point != null ? ` (${l.point > 0 ? '+' : ''}${l.point})` : ''}  Fair ${(l.fairProb*100).toFixed(2)}% · Book ${amOdds(l.bookDecimal)} [${l.gameShort}]`),
      '', '── PARLAY MATH ──',
      `Combined fair prob: ${(cfp*100).toFixed(4)}%`,
      `Parlay decimal: ${pd.toFixed(3)} (${amOdds(pd)})`,
      '', '── BOOST APPLICATION ──',
      `Normal profit: $${np.toFixed(2)}`,
      `Boosted profit: $${np.toFixed(2)} × ${(1+boostPct/100).toFixed(2)} = $${bp.toFixed(2)}`,
      `Boosted payout: $${bpay.toFixed(2)} (${amOdds(bd)})`,
      '', '── EXPECTED VALUE ──',
      `EV = ${(cfp*100).toFixed(4)}% × $${bpay.toFixed(2)} − $${stake.toFixed(2)} = $${ev.toFixed(2)}`,
      `EV% = ${evPct.toFixed(2)}%`,
    ];
    return { legs, combinedFairProb: cfp, parlayDecimal: pd, boostedDecimal: bd, boostedPayout: bpay, ev, evPct, stake, math, uniqueGames: ug };
  }).sort((a, b) => b.evPct - a.evPct).slice(0, topN);
}

function findBestParlays({ allOutcomes, numLegs, boostPct, maxBet, parlayMode = 'standard', topN = 20 }) {
  const stake = maxBet;
  if (parlayMode === 'sgp') {
    const byGame = new Map();
    for (const o of allOutcomes) { if (!byGame.has(o.gameId)) byGame.set(o.gameId, []); byGame.get(o.gameId).push(o); }
    const all = [];
    for (const [, go] of byGame) {
      const bm = new Map();
      for (const o of go) { if (!bm.has(o.market)) bm.set(o.market, []); bm.get(o.market).push(o); }
      const best = [];
      for (const [, outs] of bm) { outs.sort((a, b) => b.edge - a.edge); best.push(outs[0]); }
      if (best.length < numLegs) continue;
      best.sort((a, b) => b.edge - a.edge);
      const pool = best.slice(0, 8);
      (function c(s, cur) { if (cur.length === numLegs) { all.push([...cur]); return; } for (let i = s; i < pool.length; i++) { if (cur.some(x => x.market === pool[i].market)) continue; cur.push(pool[i]); c(i + 1, cur); cur.pop(); } })(0, []);
    }
    return scoreParlays(all, stake, boostPct, topN);
  }
  if (parlayMode === 'sgpx') {
    const byGame = new Map();
    for (const o of allOutcomes) { if (!byGame.has(o.gameId)) byGame.set(o.gameId, []); byGame.get(o.gameId).push(o); }
    const gamePools = new Map();
    for (const [gid, go] of byGame) {
      const bm = new Map();
      for (const o of go) { if (!bm.has(o.market)) bm.set(o.market, []); bm.get(o.market).push(o); }
      const best = [];
      for (const [, outs] of bm) { outs.sort((a, b) => b.edge - a.edge); best.push(outs[0]); }
      if (best.length >= 2) gamePools.set(gid, best.sort((a, b) => b.edge - a.edge).slice(0, 6));
    }
    const bpg = new Map();
    for (const o of allOutcomes) { if (!bpg.has(o.gameId) || o.edge > bpg.get(o.gameId).edge) bpg.set(o.gameId, o); }
    const all = [];
    for (const [pgid] of gamePools) {
      const sgpPool = gamePools.get(pgid);
      const cross = Array.from(bpg.entries()).filter(([g]) => g !== pgid).map(([, o]) => o).sort((a, b) => b.edge - a.edge).slice(0, 8);
      if (!cross.length) continue;
      for (let sc = 2; sc <= Math.min(numLegs - 1, sgpPool.length); sc++) {
        const cc = numLegs - sc;
        if (cc < 1 || cc > cross.length) continue;
        const sgpC = [];
        (function cs(s, c) { if (c.length === sc) { sgpC.push([...c]); return; } for (let i = s; i < sgpPool.length; i++) { if (c.some(x => x.market === sgpPool[i].market)) continue; c.push(sgpPool[i]); cs(i + 1, c); c.pop(); } })(0, []);
        const crC = [];
        (function cx(s, c) { if (c.length === cc) { crC.push([...c]); return; } for (let i = s; i < cross.length; i++) { if (c.some(x => x.gameId === cross[i].gameId)) continue; c.push(cross[i]); cx(i + 1, c); c.pop(); } })(0, []);
        for (const sg of sgpC.slice(0, 10)) for (const cr of crC.slice(0, 10)) all.push([...sg, ...cr]);
      }
    }
    return scoreParlays(all, stake, boostPct, topN);
  }
  // Standard
  const bpg = new Map();
  for (const c of allOutcomes) { if (!bpg.has(c.gameId) || c.edge > bpg.get(c.gameId).edge) bpg.set(c.gameId, c); }
  const unc = Array.from(bpg.values()).sort((a, b) => b.edge - a.edge);
  if (unc.length < numLegs) return [];
  const pool = unc.slice(0, 12);
  const combos = [];
  (function c(s, cur) { if (cur.length === numLegs) { combos.push([...cur]); return; } for (let i = s; i < pool.length; i++) { if (cur.some(x => x.gameId === pool[i].gameId)) continue; cur.push(pool[i]); c(i + 1, cur); cur.pop(); } })(0, []);
  return scoreParlays(combos, stake, boostPct, topN);
}

function analyzeGame({ game, bookKey, bonusType, boostPct, maxBet }) {
  const tb = game.bookmakers?.find(b => b.key === bookKey);
  const sharp = game.bookmakers?.find(b => SHARP.includes(b.key) && b.key !== bookKey);
  if (!tb || !sharp) return [];
  const results = [];
  for (const m of tb.markets || []) {
    const sm = sharp.markets?.find(x => x.key === m.key);
    if (!sm) continue;
    const fair = removeVig(sm.outcomes);
    for (const o of m.outcomes) {
      const f = fair.find(fi => fi.name === o.name && (fi.point === o.point || (!fi.point && !o.point)));
      if (!f) continue;
      const r = calcEV({ bonusType, boostPct, maxBet, bookDecimal: o.price, fairProb: f.fairProb });
      results.push({
        ...r, market: m.key,
        marketLabel: m.key === 'h2h' ? 'Moneyline' : m.key === 'spreads' ? 'Spread' : 'Total',
        outcome: o.name, point: o.point, bookDecimal: o.price,
        fairProb: f.fairProb, fairDecimal: f.fairDecimal, sharpBook: sharp.title,
      });
    }
  }
  return results.sort((a, b) => b.evPct - a.evPct);
}

// ─── API HELPERS ───
async function getToken() {
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data?.session?.access_token || null;
}

async function apiFetch(path, opts = {}) {
  const token = await getToken();
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(CONFIG.API_BASE + '/' + path, { ...opts, headers });
  return res.json();
}

async function fetchSports() {
  const data = await apiFetch('sports');
  if (!data.error) set({ sports: data });
}

async function fetchOdds() {
  if (!S.sport) { set({ error: 'Select a sport first' }); return; }
  set({ loading: true, error: '', odds: null, singleResults: null, parlayResults: null, selectedGame: null });
  try {
    const bk = BOOKS.map(b => b.key).join(',') + ',pinnacle,betfair_ex_eu';
    const data = await apiFetch('odds?sport=' + S.sport + '&bookmakers=' + bk);
    if (data.error) { set({ error: data.message || data.error, loading: false }); return; }
    const odds = data.odds || [];
    if (data.usage) set({ profile: { ...S.profile, fetches_used: data.usage.used } });
    if (!odds.length) { set({ error: 'No games found for this sport right now.', loading: false }); return; }
    let parlayResults = null;
    if (S.bonusType === 'parlay_boost') {
      const ao = extractAllOutcomes(odds, S.sportsbook);
      parlayResults = findBestParlays({
        allOutcomes: ao, numLegs: parseInt(S.numLegs) || 3,
        boostPct: parseFloat(S.boostPct) || 0, maxBet: parseFloat(S.maxBet) || 50,
        parlayMode: S.parlayMode,
      });
    }
    set({ odds, parlayResults, loading: false });
  } catch (err) { set({ error: err.message, loading: false }); }
}

function runSingle(game) {
  if (S.selectedGame?.id === game.id) { set({ selectedGame: null, singleResults: null, expandedIdx: null, expandedMath: null }); return; }
  const r = analyzeGame({ game, bookKey: S.sportsbook, bonusType: S.bonusType, boostPct: parseFloat(S.boostPct) || 0, maxBet: parseFloat(S.maxBet) || 50 });
  set({ selectedGame: game, singleResults: r, expandedIdx: null, expandedMath: null });
}

async function startCheckout(plan) {
  const data = await apiFetch('checkout', { method: 'POST', body: JSON.stringify({ plan }) });
  if (data.url) window.location.href = data.url;
  else set({ error: data.error || 'Checkout failed' });
}

async function loadProfile() {
  const data = await apiFetch('profile');
  if (!data.error) set({ profile: data });
}

async function openPortal() {
  const data = await apiFetch('profile', { method: 'POST' });
  if (data.portal_url) window.location.href = data.portal_url;
}

async function doLogout() {
  if (sb) await sb.auth.signOut();
  set({ user: null, profile: null, page: 'landing' });
}

async function doSignup(email, pw) {
  if (!sb) return 'Supabase not configured yet. Coming soon!';
  const { data, error } = await sb.auth.signUp({ email, password: pw });
  if (error) return error.message;
  if (data.user) { set({ user: data.user, page: 'app' }); await loadProfile(); fetchSports(); }
  return null;
}

async function doLogin(email, pw) {
  if (!sb) return 'Supabase not configured yet. Coming soon!';
  const { data, error } = await sb.auth.signInWithPassword({ email, password: pw });
  if (error) return error.message;
  if (data.user) { set({ user: data.user, page: 'app' }); await loadProfile(); fetchSports(); }
  return null;
}

async function initAuth() {
  if (!sb) return;
  const { data } = await sb.auth.getSession();
  if (data?.session?.user) { set({ user: data.session.user, page: 'app' }); await loadProfile(); fetchSports(); }
}

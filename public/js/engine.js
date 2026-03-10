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

// ─── DEVICE FINGERPRINT ───
async function getDeviceFingerprint() {
  const components = [];
  // Screen
  components.push(screen.width + 'x' + screen.height + 'x' + screen.colorDepth);
  // Timezone
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
  // Languages
  components.push((navigator.languages || [navigator.language]).join(','));
  // Platform
  components.push(navigator.platform || '');
  // Hardware concurrency
  components.push(navigator.hardwareConcurrency || '');
  // Device memory
  components.push(navigator.deviceMemory || '');
  // Touch support
  components.push(navigator.maxTouchPoints || 0);
  // Canvas fingerprint
  try {
    const c = document.createElement('canvas');
    c.width = 200; c.height = 50;
    const ctx = c.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(50, 0, 100, 50);
    ctx.fillStyle = '#069';
    ctx.fillText('LineSnipes🎯', 2, 15);
    ctx.fillStyle = 'rgba(102,204,0,0.7)';
    ctx.fillText('LineSnipes🎯', 4, 17);
    components.push(c.toDataURL());
  } catch (e) { components.push('no-canvas'); }
  // WebGL renderer
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) {
      components.push(gl.getParameter(ext.UNMASKED_VENDOR_WEBGL));
      components.push(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL));
    }
  } catch (e) { components.push('no-webgl'); }
  // Hash it
  const raw = components.join('|||');
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function checkDeviceSignups() {
  try {
    const fp = await getDeviceFingerprint();
    const res = await fetch(CONFIG.API_BASE + '/fingerprint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fingerprint: fp }),
    });
    const data = await res.json();
    return data;
  } catch (e) { return { allowed: true, count: 0 }; }
}

async function recordDeviceSignup() {
  try {
    const fp = await getDeviceFingerprint();
    await fetch(CONFIG.API_BASE + '/fingerprint', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fingerprint: fp }),
    });
  } catch (e) { /* silent */ }
}

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
  numLegs: '2', maxNumLegs: '2', parlayMode: 'standard',
  minOdds: '', maxOdds: '', minLegOdds: '', maxLegOdds: '', sportsbook: 'draftkings',
  selectedGame: null, singleResults: null, parlayResults: null,
  expandedIdx: null, expandedMath: null, expandedGroups: {}, excludedTeams: new Set(),
  liveOnly: false,
  _faqOpen: null,
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

const SHARP = ['pinnacle'];

const PRIO_SPORTS = [
  'americanfootball_ncaaf',
  'basketball_nba', 'basketball_ncaab',
  'icehockey_nhl', 'mma_mixed_martial_arts',
  'baseball_mlb', 'boxing_boxing',
];

// ─── MARKET LABELS ───
const MARKET_LABELS = {
  h2h:'ML', spreads:'Spread', totals:'Total',
  player_points:'Points', player_rebounds:'Rebounds', player_assists:'Assists',
  player_threes:'Threes', player_blocks:'Blocks', player_steals:'Steals',
  player_turnovers:'Turnovers',
  player_points_rebounds_assists:'Pts+Reb+Ast', player_points_rebounds:'Pts+Reb',
  player_points_assists:'Pts+Ast', player_rebounds_assists:'Reb+Ast',
  player_double_double:'Double-Double',
  player_goals:'Goals', player_shots_on_goal:'SOG', player_shots_on_target:'Shots OT',
  player_blocked_shots:'Blocked Shots', goalie_saves:'Saves',
  batter_hits:'Hits', batter_total_bases:'Total Bases', batter_rbis:'RBIs',
  batter_runs_scored:'Runs', batter_walks:'Walks',
  batter_strikeouts:'Batter Ks', batter_home_runs:'Home Runs',
  pitcher_strikeouts:'Pitcher Ks', pitcher_hits_allowed:'Hits Allowed',
  pitcher_earned_runs:'Earned Runs', pitcher_outs:'Outs',
  player_pass_yds:'Pass Yds', player_pass_tds:'Pass TDs',
  player_pass_completions:'Completions', player_pass_attempts:'Pass Att',
  player_pass_interceptions:'INTs',
  player_rush_yds:'Rush Yds', player_rush_attempts:'Rush Att',
  player_reception_yds:'Rec Yds', player_receptions:'Receptions',
  player_anytime_td:'Anytime TD',
};
function getMarketLabel(k) { return MARKET_LABELS[k] || k.replace(/^(player_|batter_|pitcher_|goalie_)/,'').replace(/_/g,' '); }
function isCoreMkt(k) { return k==='h2h'||k==='spreads'||k==='totals'; }
function isPropMkt(k) { return !isCoreMkt(k); }

// ─── MATH ───
function impliedProb(d) { return 1 / d; }

// Multiplicative devig — splits vig evenly
function devigMultiplicative(outcomes) {
  const t = outcomes.reduce((s, o) => s + impliedProb(o.price), 0);
  return outcomes.map(o => ({ ...o, fairProb: impliedProb(o.price) / t, fairDecimal: t / impliedProb(o.price) }));
}

// Shin devig — redistributes vig non-linearly (more accurate for heavy favorites)
function devigShin(outcomes) {
  if (outcomes.length !== 2) return devigMultiplicative(outcomes); // fallback for 3-way
  const pA = impliedProb(outcomes[0].price);
  const pB = impliedProb(outcomes[1].price);
  const S = pA + pB; // sum of implied probs (overround)
  // Solve for z (the shin parameter)
  const z = (S - 1) / (S - Math.sqrt(S * (pA * pA + pB * pB)));
  // Fair probs using Shin formula
  const fairA = (Math.sqrt(z * z + 4 * (1 - z) * pA * pA / S) - z) / (2 * (1 - z));
  const fairB = 1 - fairA;
  return [
    { ...outcomes[0], fairProb: fairA, fairDecimal: 1 / fairA },
    { ...outcomes[1], fairProb: fairB, fairDecimal: 1 / fairB },
  ];
}

// Auto devig — picks method based on market type and odds
function removeVig(outcomes, marketKey) {
  // Use Shin for all h2h (moneylines) with 2 outcomes — more accurate across the board
  if (marketKey === 'h2h' && outcomes.length === 2) {
    return devigShin(outcomes);
  }
  // Multiplicative for spreads, totals, props
  return devigMultiplicative(outcomes);
}

// Consensus sharp odds — average DK + FanDuel + BetMGM decimal odds
// Market average uses ALL available books (not just 3)
const CONSENSUS_BOOKS_CORE = null; // null = use all books for core markets
const CONSENSUS_BOOKS_PROPS = ['draftkings', 'fanduel', 'betmgm']; // props: top 3 US books
// Sports where Pinnacle props are thin — skip Pinnacle, use consensus
const SKIP_PINNACLE_SPORTS = ['basketball_nba', 'icehockey_nhl', 'basketball_ncaab'];

function getConsensusOutcomes(game, marketKey, bookFilter) {
  const allOutcomes = new Map();
  let count = 0;
  for (const bk of game.bookmakers || []) {
    // Skip Pinnacle (it's the sharp, not part of market avg)
    if (bk.key === 'pinnacle') continue;
    // If bookFilter provided, only use those books; otherwise use all
    if (bookFilter && !bookFilter.includes(bk.key)) continue;
    const mkt = bk.markets?.find(m => m.key === marketKey);
    if (!mkt) continue;
    count++;
    for (const o of mkt.outcomes) {
      const key = o.name + '|' + (o.point ?? '') + '|' + (o.description || '');
      if (!allOutcomes.has(key)) allOutcomes.set(key, { name: o.name, point: o.point, description: o.description, prices: [] });
      allOutcomes.get(key).prices.push(o.price);
    }
  }
  if (count < 2) return null;
  const result = [];
  for (const [, v] of allOutcomes) {
    // Use median — robust against outlier books
    const sorted = [...v.prices].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    // Skip if price is too extreme (< 1.05 for any outcome)
    if (median < 1.05) continue;
    const out = { name: v.name, point: v.point, price: median };
    if (v.description) out.description = v.description;
    result.push(out);
  }
  return result.length >= 2 ? result : null;
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

// Validate sharp outcomes — reject garbage data
function isValidSharp(outcomes, marketKey) {
  if (!outcomes || outcomes.length < 2) return false;
  for (const o of outcomes) {
    // Reject if any price is <= 1.01 or > 100
    if (o.price <= 1.01 || o.price > 100) return false;
  }
  // For h2h (moneyline): reject if any side is below 1.05 — too extreme to devig reliably
  if (marketKey === 'h2h') {
    for (const o of outcomes) {
      if (o.price < 1.05) return false;
    }
  }
  // For 2-way markets, implied probs should sum to roughly 95-115%
  if (outcomes.length === 2) {
    const totalImpl = outcomes.reduce((s, o) => s + 1/o.price, 0);
    if (totalImpl < 0.95 || totalImpl > 1.15) return false;
  }
  return true;
}

function calcEV({ bonusType, boostPct, maxBet, bookDecimal, fairProb }) {
  const stake = maxBet;
  const fairDecimal = 1 / fairProb;
  const edge = (bookDecimal / fairDecimal - 1) * 100;
  if (bonusType === 'profit_boost') {
    const np = (bookDecimal - 1) * stake;
    const bp = np * (1 + boostPct / 100);
    const bpay = stake + bp;
    const ev = fairProb * bpay - stake;
    return { ev, evPct: edge, stake, math: [
      `Fair probability: ${(fairProb*100).toFixed(2)}%`,
      `Book odds: ${amOdds(bookDecimal)} (${bookDecimal.toFixed(3)})`,
      `Normal profit: (${bookDecimal.toFixed(3)} − 1) × $${stake.toFixed(2)} = $${np.toFixed(2)}`,
      `Boosted profit: $${np.toFixed(2)} × ${(1+boostPct/100).toFixed(2)} = $${bp.toFixed(2)}`,
      `Payout if win: $${stake.toFixed(2)} + $${bp.toFixed(2)} = $${bpay.toFixed(2)}`,
      `EV = ${(fairProb*100).toFixed(2)}% × $${bpay.toFixed(2)} − $${stake.toFixed(2)} = $${ev.toFixed(2)}`,
      `EV% = ${edge.toFixed(2)}%`,
    ]};
  }
  if (bonusType === 'risk_free') {
    const profit = (bookDecimal - 1) * stake;
    const fbv = stake * 0.7;
    const ev = fairProb * profit + (1 - fairProb) * fbv;
    return { ev, evPct: edge, stake, math: [
      `Fair probability: ${(fairProb*100).toFixed(2)}%`,
      `Book odds: ${amOdds(bookDecimal)} (${bookDecimal.toFixed(3)})`,
      `Profit if win: (${bookDecimal.toFixed(3)} − 1) × $${stake.toFixed(2)} = $${profit.toFixed(2)}`,
      `Free bet value if loss: $${stake.toFixed(2)} × 70% = $${fbv.toFixed(2)}`,
      `EV = ${(fairProb*100).toFixed(2)}% × $${profit.toFixed(2)} + ${((1-fairProb)*100).toFixed(2)}% × $${fbv.toFixed(2)} = $${ev.toFixed(2)}`,
      `EV% = ${edge.toFixed(2)}%`,
    ]};
  }
  if (bonusType === 'odds_boost') {
    const bd = bookDecimal * (1 + boostPct / 100);
    const payout = bd * stake;
    const ev = fairProb * payout - stake;

    return { ev, evPct: edge, stake, math: [
      `Fair probability: ${(fairProb*100).toFixed(2)}%`,
      `Original: ${amOdds(bookDecimal)} → Boosted: ${amOdds(bd)} (${bd.toFixed(3)})`,
      `Payout if win: ${bd.toFixed(3)} × $${stake.toFixed(2)} = $${payout.toFixed(2)}`,
      `EV = ${(fairProb*100).toFixed(2)}% × $${payout.toFixed(2)} − $${stake.toFixed(2)} = $${ev.toFixed(2)}`,
      `EV% = ${edge.toFixed(2)}%`,
    ]};
  }
  return { ev: 0, evPct: 0, stake: 0, math: [] };
}

function extractAllOutcomes(games, bookKey) {
  const out = [];
  const sportKey = S.sport || '';
  const skipPinnacle = SKIP_PINNACLE_SPORTS.some(s => sportKey.startsWith(s));

  for (const g of games) {
    const tb = g.bookmakers?.find(b => b.key === bookKey);
    if (!tb) continue;

    for (const m of tb.markets || []) {
      let sharpOutcomes = null;
      let sharpName = '';
      const isProps = m.key !== 'h2h' && m.key !== 'spreads' && m.key !== 'totals';

      // For props on NBA/NHL/NCAAB, skip Pinnacle and go straight to consensus
      if (skipPinnacle && isProps) {
        const consensus = getConsensusOutcomes(g, m.key, CONSENSUS_BOOKS_PROPS);
        if (consensus) {
          sharpOutcomes = consensus;
          sharpName = 'Consensus (DK/FD/MGM)';
        }
      }

      // If we don't have consensus, try Pinnacle first
      if (!sharpOutcomes) {
        const sharp = g.bookmakers?.find(b => b.key === 'pinnacle');
        const sm = sharp?.markets?.find(x => x.key === m.key);
        if (sm && isValidSharp(sm.outcomes, m.key)) {
          sharpOutcomes = sm.outcomes;
          sharpName = sharp.title || 'Pinnacle';
        }
      }

      // If still no sharp, try other sharp books
      if (!sharpOutcomes) {
        for (const sk of SHARP) {
          if (sk === 'pinnacle' || sk === bookKey) continue;
          const sb = g.bookmakers?.find(b => b.key === sk);
          const sm = sb?.markets?.find(x => x.key === m.key);
          if (sm && isValidSharp(sm.outcomes, m.key)) {
            sharpOutcomes = sm.outcomes;
            sharpName = sb.title || sk;
            break;
          }
        }
      }

      // Last resort: consensus fallback — ONLY for props, not core h2h/spreads/totals
      // Consensus is unreliable for core markets (especially extreme moneylines)
      if (!sharpOutcomes && isPropMkt(m.key)) {
        const consensus = getConsensusOutcomes(g, m.key, CONSENSUS_BOOKS_PROPS);
        if (consensus) {
          sharpOutcomes = consensus;
          sharpName = 'Consensus (DK/FD/MGM)';
        }
      }

      if (!sharpOutcomes) continue;

      // For props: devig per-player pair (Over/Under for each description+point)
      // For core: devig the whole market
      const isProp = isPropMkt(m.key);

      if (isProp) {
        // Group sharp outcomes by player (description) + point
        const playerGroups = new Map();
        for (const so of sharpOutcomes) {
          const pk = (so.description || '') + '|' + (so.point ?? '');
          if (!playerGroups.has(pk)) playerGroups.set(pk, []);
          playerGroups.get(pk).push(so);
        }
        // Group book outcomes similarly
        for (const o of m.outcomes) {
          const pk = (o.description || '') + '|' + (o.point ?? '');
          const sharpPair = playerGroups.get(pk);
          if (!sharpPair || sharpPair.length < 2) continue;
          const fair = removeVig(sharpPair, m.key);
          const f = fair.find(fi => fi.name === o.name);
          if (!f) continue;
          const playerName = o.description || o.name;
          out.push({
            gameId: g.id, game: `${g.away_team} @ ${g.home_team}`,
            gameShort: `${g.away_team.split(' ').pop()} @ ${g.home_team.split(' ').pop()}`,
            market: m.key, marketLabel: getMarketLabel(m.key), isProp: true,
            outcome: playerName + ' ' + o.name + (o.point != null ? '' : ''), point: o.point,
            bookDecimal: o.price, fairProb: f.fairProb, fairDecimal: f.fairDecimal,
            sharpBook: sharpName, edge: (o.price / f.fairDecimal) - 1,
            devigMethod: 'Multiplicative', playerName,
            deepLink: o.link || null, sid: o.sid || null,
          });
        }
      } else {
        const fair = removeVig(sharpOutcomes, m.key);
        for (const o of m.outcomes) {
          const f = fair.find(fi => fi.name === o.name && (fi.point === o.point || (!fi.point && !o.point)));
          if (!f) continue;
          out.push({
            gameId: g.id, game: `${g.away_team} @ ${g.home_team}`,
            gameShort: `${g.away_team.split(' ').pop()} @ ${g.home_team.split(' ').pop()}`,
            market: m.key, marketLabel: getMarketLabel(m.key), isProp: false,
            outcome: o.name, point: o.point,
            bookDecimal: o.price, fairProb: f.fairProb, fairDecimal: f.fairDecimal,
            sharpBook: sharpName, edge: (o.price / f.fairDecimal) - 1,
            devigMethod: m.key === 'h2h' && sharpOutcomes.length === 2 ? 'Shin' : 'Multiplicative',
            deepLink: o.link || null, sid: o.sid || null,
          });
        }
      }
    }
  }
  return out.sort((a, b) => b.edge - a.edge);
}

function scoreParlays(combos, stake, boostPct, topN, parlayMinOdds = '', parlayMaxOdds = '') {
  const mn = amToDec(parlayMinOdds), mx = amToDec(parlayMaxOdds);
  return combos.map(legs => {
    const cfp = legs.reduce((p, l) => p * l.fairProb, 1);
    const pd = legs.reduce((d, l) => d * l.bookDecimal, 1);
    const np = (pd - 1) * stake, bp = np * (1 + boostPct / 100);
    const bpay = stake + bp, bd = bpay / stake;
    const ev = cfp * bpay - stake;
    const fairDecimal = 1 / cfp;
    const evPct = (bd / fairDecimal - 1) * 100;
    const legEVs = legs.map(l => ((l.bookDecimal / l.fairDecimal) - 1) * 100);
    const avgLegEV = legEVs.reduce((s, v) => s + v, 0) / legEVs.length;
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
    return { legs, combinedFairProb: cfp, parlayDecimal: pd, boostedDecimal: bd, boostedPayout: bpay, ev, evPct, avgLegEV, stake, math, uniqueGames: ug };
  })
  .filter(p => {
    if (mn != null && p.parlayDecimal < mn) return false;
    if (mx != null && p.parlayDecimal > mx) return false;
    return true;
  })
  .sort((a, b) => b.evPct - a.evPct).slice(0, topN);
}

function findBestParlays({ allOutcomes, numLegs, maxNumLegs = '', boostPct, maxBet, parlayMode = 'standard', topN = 60, legOddsMin = '', legOddsMax = '', parlayMinOdds = '', parlayMaxOdds = '' }) {
  const stake = maxBet;
  // Filter individual legs by per-leg odds range before building combos
  if (legOddsMin !== '' || legOddsMax !== '') {
    allOutcomes = allOutcomes.filter(o => passFilter(o.bookDecimal, legOddsMin, legOddsMax));
  }
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
  // Pool = all outcomes, but deduplicated so only the best-edge outcome per
  // game+market+side is kept (prevents identical duplicates).
  // The collision check during combo building uses gameId+market so you CAN
  // use Game A spread AND Game A total in the same parlay, but NOT both sides
  // of the same market (e.g. Over AND Under) in the same parlay.
  const seen = new Map();
  for (const o of allOutcomes) {
    // Key: game + market + outcome name + player (unique per side)
    const key = o.gameId + '|' + o.market + '|' + o.outcome + (o.playerName ? '|' + o.playerName : '');
    if (!seen.has(key) || o.edge > seen.get(key).edge) seen.set(key, o);
  }
  const pool = Array.from(seen.values()).sort((a, b) => b.edge - a.edge).slice(0, 40);

  // numLegs is min legs, maxNumLegs is max legs (defaults to minLegs + 2 if not set).
  const maxLegs = maxNumLegs ? parseInt(maxNumLegs) : numLegs + 2;
  // Cap pool to best outcome per game+market SIDE (keeps both Over AND Under, favorite AND underdog)
  // but takes only the top edge outcome per player+market to avoid prop explosion.
  // This gives ~2 outcomes per core market per game + top prop per player = manageable pool.
  const poolBySlot = new Map();
  for (const o of pool) {
    // Slot key: game + market + outcome name (each side is its own slot)
    const slotKey = o.gameId + '|' + o.market + '|' + (o.playerName || '') + '|' + o.outcome;
    if (!poolBySlot.has(slotKey) || o.edge > poolBySlot.get(slotKey).edge) poolBySlot.set(slotKey, o);
  }
  // Build top: top 30 by edge (best EV legs) + top 30 by bookDecimal (longest odds/underdogs)
  // This ensures both high-EV favorites AND long-odds underdogs are in the pool.
  const allSlots = Array.from(poolBySlot.values());
  const byEdge = [...allSlots].sort((a, b) => b.edge - a.edge).slice(0, 30);
  const byOdds = [...allSlots].sort((a, b) => b.bookDecimal - a.bookDecimal).slice(0, 30);
  const topSet = new Map();
  for (const o of [...byEdge, ...byOdds]) topSet.set(o.gameId + '|' + o.market + '|' + (o.playerName || '') + '|' + o.outcome, o);
  const top = Array.from(topSet.values()); // up to 60 unique outcomes

  const allCombos = [];
  for (let n = numLegs; n <= maxLegs; n++) {
    if (top.length < n) continue;
    (function c(s, cur) {
      if (cur.length === n) { allCombos.push([...cur]); return; }
      for (let i = s; i < top.length; i++) {
        const leg = top[i];
        // Block: same game+market already used (prevents Over+Under of same market in one parlay)
        if (cur.some(x => x.gameId === leg.gameId && x.market === leg.market && (!leg.playerName || x.playerName === leg.playerName))) continue;
        cur.push(leg); c(i + 1, cur); cur.pop();
      }
    })(0, []);
  }

  // Score all combos, filter by combined odds target, return top N by EV%
  return scoreParlays(allCombos, stake, boostPct, topN, parlayMinOdds, parlayMaxOdds);
}

function analyzeGame({ game, bookKey, bonusType, boostPct, maxBet }) {
  const tb = game.bookmakers?.find(b => b.key === bookKey);
  // Try multiple sharp sources
  let sharp = game.bookmakers?.find(b => b.key === 'pinnacle' && b.key !== bookKey);
  if (!sharp) sharp = game.bookmakers?.find(b => SHARP.includes(b.key) && b.key !== bookKey);
  if (!tb) return [];
  const results = [];
  for (const m of tb.markets || []) {
    // Find sharp outcomes for this market — try Pinnacle, then other sharps, then consensus
    let sharpOutcomes = null, sharpTitle = '';
    if (sharp) {
      const sm = sharp.markets?.find(x => x.key === m.key);
      if (sm && isValidSharp(sm.outcomes, m.key)) { sharpOutcomes = sm.outcomes; sharpTitle = sharp.title || 'Pinnacle'; }
    }
    if (!sharpOutcomes) {
      // Fallback: market average (all books for core, top 3 for props)
      const bkFilter = isPropMkt(m.key) ? CONSENSUS_BOOKS_PROPS : null;
      const consensus = getConsensusOutcomes(game, m.key, bkFilter);
      if (consensus) { sharpOutcomes = consensus; sharpTitle = bkFilter ? 'Consensus' : 'Market Avg'; }
    }
    if (!sharpOutcomes) continue;

    const isProp = isPropMkt(m.key);

    if (isProp) {
      // Devig per-player pair
      const playerGroups = new Map();
      for (const so of sharpOutcomes) {
        const pk = (so.description || '') + '|' + (so.point ?? '');
        if (!playerGroups.has(pk)) playerGroups.set(pk, []);
        playerGroups.get(pk).push(so);
      }
      for (const o of m.outcomes) {
        const pk = (o.description || '') + '|' + (o.point ?? '');
        const sharpPair = playerGroups.get(pk);
        if (!sharpPair || sharpPair.length < 2) continue;
        const fair = removeVig(sharpPair, m.key);
        const f = fair.find(fi => fi.name === o.name);
        if (!f) continue;
        const playerName = o.description || o.name;
        const r = calcEV({ bonusType, boostPct, maxBet, bookDecimal: o.price, fairProb: f.fairProb });
        results.push({
          ...r, market: m.key,
          marketLabel: getMarketLabel(m.key), isProp: true,
          outcome: playerName + ' ' + o.name, point: o.point, bookDecimal: o.price,
          fairProb: f.fairProb, fairDecimal: f.fairDecimal, sharpBook: sharpTitle,
          gameShort: game.away_team.split(' ').pop() + ' @ ' + game.home_team.split(' ').pop(),
          playerName, devigMethod: 'Multiplicative',
          deepLink: o.link || null, sid: o.sid || null,
        });
      }
    } else {
      const fair = removeVig(sharpOutcomes, m.key);
      for (const o of m.outcomes) {
        const f = fair.find(fi => fi.name === o.name && (fi.point === o.point || (!fi.point && !o.point)));
        if (!f) continue;
        const r = calcEV({ bonusType, boostPct, maxBet, bookDecimal: o.price, fairProb: f.fairProb });
        results.push({
          ...r, market: m.key,
          marketLabel: getMarketLabel(m.key), isProp: false,
          outcome: o.name, point: o.point, bookDecimal: o.price,
          fairProb: f.fairProb, fairDecimal: f.fairDecimal, sharpBook: sharpTitle,
          gameShort: game.away_team.split(' ').pop() + ' @ ' + game.home_team.split(' ').pop(),
          deepLink: o.link || null, sid: o.sid || null,
        });
      }
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
    set({ odds, loading: false });
    console.log('[LS] fetchOdds done. bonusType:', S.bonusType, 'numLegs:', S.numLegs, 'maxNumLegs:', S.maxNumLegs, 'minOdds:', S.minOdds, 'oddsCount:', odds.length);
    if (S.bonusType === 'parlay_boost') setTimeout(() => rebuildParlays(), 0);
  } catch (err) { set({ error: err.message, loading: false }); }
}

let _rebuildTimer = null;
function rebuildParlays(debounce = false) {
  if (!S.odds || S.bonusType !== 'parlay_boost') { console.log('[LS] rebuildParlays SKIPPED — odds:', !!S.odds, 'bonusType:', S.bonusType); return; }
  if (debounce) {
    clearTimeout(_rebuildTimer);
    _rebuildTimer = setTimeout(() => rebuildParlays(false), 400);
    return;
  }
  const filteredOdds = S.liveOnly ? S.odds.filter(g => new Date(g.commence_time) <= new Date()) : S.odds;
  const ao = extractAllOutcomes(filteredOdds, S.sportsbook)
    .filter(o => !S.excludedTeams.has(o.game));
  console.log('[LS] rebuildParlays — sportsbook:', S.sportsbook, 'numLegs:', S.numLegs, 'maxNumLegs:', S.maxNumLegs, 'minOdds:', S.minOdds, 'outcomes:', ao.length, 'parlayMode:', S.parlayMode);
  const parlayResults = findBestParlays({
    allOutcomes: ao, numLegs: parseInt(S.numLegs) || 2, maxNumLegs: S.maxNumLegs,
    boostPct: parseFloat(S.boostPct) || 0, maxBet: parseFloat(S.maxBet) || 50,
    parlayMode: S.parlayMode, legOddsMin: S.minLegOdds, legOddsMax: S.maxLegOdds,
    parlayMinOdds: S.minOdds, parlayMaxOdds: S.maxOdds,
  });
  console.log('[LS] rebuildParlays — results:', parlayResults.length);
  set({ parlayResults });
}

function toggleExcludeTeam(gameName) {
  const ex = new Set(S.excludedTeams);
  if (ex.has(gameName)) ex.delete(gameName); else ex.add(gameName);
  S.excludedTeams = ex;
  rebuildParlays();
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
  // Check device fingerprint
  const fpCheck = await checkDeviceSignups();
  if (fpCheck && !fpCheck.allowed) return '__DEVICE_LIMIT__';
  const { data, error } = await sb.auth.signUp({ email, password: pw });
  if (error) return error.message;
  if (data.user) {
    await recordDeviceSignup();
    set({ user: data.user, page: 'app' }); await loadProfile(); fetchSports();
  }
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

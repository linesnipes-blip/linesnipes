// ═══════════════════════════════════════════════════
// LINESNIPES ui.js — Render functions for all pages
// ═══════════════════════════════════════════════════

function h(tag, a, ...ch) {
  const el = document.createElement(tag);
  if (a) for (const [k, v] of Object.entries(a)) {
    if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'cls') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'disabled') { if (v) el.setAttribute('disabled', ''); }
    else el.setAttribute(k, v);
  }
  for (const c of ch.flat()) {
    if (c == null || c === false) continue;
    el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return el;
}

// ─── LANDING PAGE ───
function pgLanding() {
  return h('div', {},
    h('nav', { cls: 'nav' }, h('div', { cls: 'nav-inner' },
      h('div', { cls: 'nav-logo', onClick: () => set({ page: 'landing' }) }, h('div', { cls: 'crosshair' }, '🎯'), 'LineSnipes'),
      h('div', { cls: 'nav-links' },
        h('button', { cls: 'nbtn nbtn-g', onClick: () => set({ page: 'pricing' }) }, 'Pricing'),
        h('button', { cls: 'nbtn nbtn-g', onClick: () => set({ page: 'login' }) }, 'Log In'),
        h('button', { cls: 'nbtn nbtn-p', onClick: () => set({ page: 'signup' }) }, 'Get Started'),
      ),
    )),
    h('section', { cls: 'hero container' },
      h('div', { cls: 'htag fade-up' }, '🎯 Sharp Line Analysis'),
      h('h1', { cls: 'fade-up d1', html: '<em>Snipe +EV Bets</em><br>Before They Disappear' }),
      h('p', { cls: 'fade-up d2' }, 'Instantly find positive expected value in every boost, promo, and parlay. Powered by sharp lines from Pinnacle. Zero guesswork.'),
      h('button', { cls: 'hcta fade-up d3', onClick: () => set({ page: 'signup' }) }, '🎯 Start Sniping — Free'),
      h('div', { cls: 'fade-up d4', style: { marginTop: '16px', fontSize: '13px', color: 'var(--fg3)' } }, '10 free searches. No credit card required.'),
    ),
    h('section', { cls: 'fgrid container' },
      ...[ ['🔬','Sharp Line Devigging','Strip the vig from Pinnacle to calculate true fair probabilities for every outcome.'],
        ['🚀','Boost Analyzer','Profit boosts, risk-free bets, odds boosts — see the exact +EV percentage instantly.'],
        ['🔗','Parlay Optimizer','Standard, SGP, and SGP+ modes find the highest-EV leg combinations for your boost.'],
        ['📊','Full Math Breakdown','Step-by-step calculations. Fair probability, vig removal, boost application, final EV.'],
        ['⚡','Live Odds · 10 Books','DraftKings, FanDuel, BetMGM, Caesars, ESPN BET, Fanatics, BetRivers, Bovada, BetOnline, Hard Rock.'],
        ['🎾','Every Sport & Event','NFL to Champions League, ATP tennis to PGA golf. New tournaments appear automatically.'],
      ].map(([ic, t, d], i) => h('div', { cls: 'fcard fade-up d' + ((i % 5) + 1) },
        h('div', { cls: 'ficon' }, ic), h('h3', {}, t), h('p', {}, d))
      ),
    ),
    h('section', { cls: 'how container' },
      h('h2', { cls: 'fade-up' }, 'How It Works'),
      h('div', { cls: 'hsteps' },
        ...[ ['1','Pick Your Boost','Select bonus type, sportsbook, and sport.'],
          ['2','Fetch Live Odds','One click pulls real-time odds from 10+ books.'],
          ['3','Snipe the Edge','We rank every bet by expected value.'],
        ].map(([n, t, d]) => h('div', { cls: 'hstep fade-up' }, h('div', { cls: 'hnum' }, n), h('h3', {}, t), h('p', {}, d)))
      ),
    ),
    pgPricingSection(),
    h('footer', { cls: 'footer container' }, h('p', {}, 'LineSnipes © 2026 · For education & entertainment only · Gamble responsibly')),
  );
}

// ─── PRICING SECTION ───
function pgPricingSection() {
  const plans = [
    { name: 'Free Trial', price: '$0', per: '', desc: 'Try before you buy. No card needed.', feats: ['10 odds fetches','All bonus types','All 10 sportsbooks','Full math breakdowns'], btn: 'Start Free', cls: 'pbtn-o', plan: null },
    { name: 'Standard', price: '$29.99', per: '/mo', desc: 'For regular bettors hunting daily edges.', feats: ['300 fetches / month','All sports & events','SGP & SGP+ parlays','Min/Max odds filters'], btn: 'Get Standard', cls: 'pbtn-p', plan: 'standard', pop: true },
    { name: 'Unlimited', price: '$49.99', per: '/mo', desc: 'No limits. Fetch all day, every day.', feats: ['Unlimited fetches','Everything in Standard','Priority support','Zero throttling'], btn: 'Get Unlimited', cls: 'pbtn-o', plan: 'unlimited' },
    { name: 'Lifetime', price: '$499', per: ' once', desc: 'Pay once, snipe forever.', feats: ['Unlimited fetches forever','All future features','Never pay again','Founding member status'], btn: 'Get Lifetime', cls: 'pbtn-o', plan: 'lifetime' },
  ];
  return h('section', { cls: 'pricing container' },
    h('h2', { cls: 'fade-up' }, 'Simple Pricing'),
    h('p', { cls: 'psub fade-up' }, 'Start free. Upgrade when you\'re ready to go full send.'),
    h('div', { cls: 'pgrid' },
      ...plans.map((p, i) => h('div', { cls: 'pcard fade-up d' + (i + 1) + (p.pop ? ' pop' : '') },
        h('div', { cls: 'pname' }, p.name),
        h('div', { cls: 'pprice' }, p.price, p.per ? h('span', {}, p.per) : null),
        h('p', { cls: 'pdesc' }, p.desc),
        h('ul', { cls: 'pfeats' }, ...p.feats.map(f => h('li', {}, f))),
        h('button', { cls: 'pbtn ' + p.cls, onClick: () => {
          if (!p.plan) set({ page: 'signup' });
          else S.user ? startCheckout(p.plan) : set({ page: 'signup' });
        } }, p.btn),
      ))
    ),
  );
}

// ─── AUTH ───
function pgAuth(mode) {
  const isLogin = mode === 'login';
  const box = h('div', { cls: 'auth-wrap' }, h('div', { cls: 'auth-box' },
    h('div', { style: { textAlign: 'center', marginBottom: '24px' } },
      h('div', { style: { display: 'inline-flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--display)', fontSize: '24px', fontWeight: '800', color: '#fff' } },
        h('span', { style: { fontSize: '28px' } }, '🎯'), 'LineSnipes')),
    h('h2', {}, isLogin ? 'Welcome back' : 'Create your account'),
    h('p', { cls: 'sub' }, isLogin ? 'Log in to start sniping.' : '10 free searches. No credit card.'),
    h('label', {}, 'Email'), h('input', { type: 'email', placeholder: 'you@email.com', id: 'ae' }),
    h('label', {}, 'Password'), h('input', { type: 'password', placeholder: isLogin ? '••••••••' : 'Min 6 characters', id: 'ap' }),
    h('button', { cls: 'abtn', id: 'abtn' }, isLogin ? 'Log In' : 'Create Account'),
    h('div', { id: 'aerr' }),
    h('p', { cls: 'aswitch' }, isLogin ? "Don't have an account? " : 'Already have an account? ',
      h('a', { onClick: () => set({ page: isLogin ? 'signup' : 'login' }) }, isLogin ? 'Sign up' : 'Log in')),
    h('p', { style: { textAlign: 'center', marginTop: '12px' } },
      h('a', { onClick: () => set({ page: 'landing' }), style: { fontSize: '12px', color: 'var(--fg3)' } }, '← Back to home')),
  ));
  setTimeout(() => {
    const btn = document.getElementById('abtn');
    if (btn) btn.onclick = async () => {
      const em = document.getElementById('ae')?.value, pw = document.getElementById('ap')?.value;
      const errEl = document.getElementById('aerr');
      if (!em || !pw) { errEl.innerHTML = '<div class="aerr">Please fill in all fields.</div>'; return; }
      btn.disabled = true; btn.textContent = isLogin ? 'Logging in...' : 'Creating account...';
      const err = isLogin ? await doLogin(em, pw) : await doSignup(em, pw);
      if (err) { errEl.innerHTML = '<div class="aerr">' + err + '</div>'; btn.disabled = false; btn.textContent = isLogin ? 'Log In' : 'Create Account'; }
    };
  }, 0);
  return box;
}

// ─── APP HEADER ───
function appHeader() {
  const p = S.profile || {}, plan = p.plan || 'free', used = p.fetches_used || 0;
  const limit = plan === 'free' ? 10 : plan === 'standard' ? 300 : null;
  const pct = limit ? Math.min((used / limit) * 100, 100) : 0;
  const bc = pct > 90 ? 'danger' : pct > 70 ? 'warn' : '';
  return h('div', { cls: 'app-hdr' }, h('div', { cls: 'app-hdr-in' },
    h('div', { cls: 'app-logo' }, h('div', { cls: 'app-icon' }, '🎯'), 'LineSnipes'),
    h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } },
      limit ?
        h('div', { cls: 'ubadge' }, h('span', {}, used + '/' + limit), h('div', { cls: 'ubar' }, h('div', { cls: 'ufill ' + bc, style: { width: pct + '%' } })))
        : h('div', { cls: 'ubadge' }, h('span', { style: { color: 'var(--accent)' } }, used + ' fetches')),
      h('div', { cls: 'anav', style: { display: 'flex', gap: '4px' } },
        h('button', { cls: S.page === 'app' ? 'on' : '', onClick: () => set({ page: 'app' }) }, 'Tool'),
        h('button', { cls: S.page === 'settings' ? 'on' : '', onClick: () => set({ page: 'settings' }) }, 'Settings'),
      ),
    ),
  ));
}

// ─── SPORT PICKER ───
function sportPicker() {
  if (!S.sports) return h('div', { style: { textAlign: 'center', padding: '20px', color: 'var(--fg3)' } }, 'Loading sports...');
  const all = [];
  for (const [group, sports] of Object.entries(S.sports)) for (const s of sports) all.push({ ...s, group });
  const prio = all.filter(s => PRIO_SPORTS.includes(s.key));
  const rest = all.filter(s => !PRIO_SPORTS.includes(s.key));
  const rg = {};
  for (const s of rest) { const g = s.group || 'Other'; if (!rg[g]) rg[g] = []; rg[g].push(s); }
  return h('div', {},
    h('div', { cls: 'swrap', style: { marginBottom: '12px' } },
      ...prio.map(s => h('button', { cls: 'pill' + (S.sport === s.key ? ' on' : ''),
        onClick: () => set({ sport: s.key, odds: null, singleResults: null, parlayResults: null, selectedGame: null }) }, s.title))
    ),
    ...Object.entries(rg).map(([group, sports]) => {
      const open = S.expandedGroups[group] !== false;
      return h('div', { cls: 'sgr' },
        h('div', { cls: 'sgr-t', onClick: () => { const eg = { ...S.expandedGroups }; eg[group] = !open; set({ expandedGroups: eg }); } },
          h('span', {}, open ? '▾' : '▸'), group + ' (' + sports.length + ')'),
        open ? h('div', { cls: 'swrap' }, ...sports.map(s =>
          h('button', { cls: 'pill' + (S.sport === s.key ? ' on' : ''),
            onClick: () => set({ sport: s.key, odds: null, singleResults: null, parlayResults: null, selectedGame: null }) }, s.title)
        )) : null,
      );
    }),
  );
}

// ─── MATH BLOCK ───
function mathBlock(lines, open, toggle) {
  return h('div', { cls: 'mblk' },
    h('button', { cls: 'mtog', onClick: toggle },
      h('span', { style: { fontSize: '10.5px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' } }, 'Step-by-step math'),
      h('span', {}, open ? '▾' : '▸'),
    ),
    open ? h('div', { style: { padding: '0 14px 14px', animation: 'fadeIn .2s' } },
      ...lines.map(l => {
        const isH = l.startsWith('──');
        return h('div', { style: {
          fontSize: '12px', fontFamily: 'var(--mono)', padding: '3px 0',
          color: isH ? 'var(--accent)' : l.startsWith('EV') ? 'var(--accent)' : 'var(--fg2)',
          fontWeight: isH || l.startsWith('EV') ? '700' : '400',
          ...(isH ? { paddingTop: '6px', borderTop: '1px solid rgba(0,255,163,.1)' } : {}),
        } }, l);
      })
    ) : null,
  );
}

// ─── PARLAY RESULTS ───
function parlayResults() {
  const results = (S.parlayResults || []).filter(p => passFilter(p.parlayDecimal, S.minOdds, S.maxOdds));
  const icon = S.parlayMode === 'sgp' ? '🎯' : S.parlayMode === 'sgpx' ? '🔀' : '🔗';
  const ml = S.parlayMode === 'sgp' ? 'SGP' : S.parlayMode === 'sgpx' ? 'SGP+' : 'Parlays';
  return h('div', { cls: 'card', style: { borderColor: 'rgba(0,255,170,.12)', background: 'linear-gradient(180deg,rgba(0,255,170,.025) 0%,transparent 100%)', animation: 'fadeUp .4s ease' } },
    h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' } },
      h('span', { style: { fontSize: '18px' } }, icon),
      h('div', { style: { fontFamily: 'var(--display)', fontSize: '16px', fontWeight: '800', color: '#fff' } }, 'Best ' + S.numLegs + '-Leg ' + ml)),
    h('div', { style: { fontSize: '10.5px', color: 'var(--fg3)', marginBottom: '16px' } },
      results.filter(p => p.evPct > 0).length + ' +EV combinations · ' + S.boostPct + '% boost'),
    !results.length ? h('div', { style: { textAlign: 'center', padding: '24px', color: 'var(--fg3)', fontSize: '13px' } }, 'No parlays found matching your criteria.')
    : h('div', { style: { display: 'grid', gap: '8px' } },
      ...results.map((p, idx) => {
        const open = S.expandedIdx === idx, pos = p.evPct > 0;
        return h('div', { style: {
          background: idx === 0 && pos ? 'rgba(0,255,140,.05)' : 'var(--card)',
          border: idx === 0 && pos ? '1px solid rgba(0,255,140,.12)' : '1px solid var(--border)',
          borderRadius: '10px', overflow: 'hidden',
        } },
          h('button', { style: { width: '100%', textAlign: 'left', padding: '12px 14px', fontFamily: 'inherit', cursor: 'pointer', background: 'none', border: 'none', color: 'var(--fg)' },
            onClick: () => set({ expandedIdx: open ? null : idx }) },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
              h('div', {},
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '4px' } },
                  ...p.legs.map((l, i) => h('span', { style: { fontSize: '10px', background: 'rgba(0,255,170,.08)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '4px', fontFamily: 'var(--mono)' } },
                    (i + 1) + '. ' + l.outcome + (l.point != null ? ' (' + (l.point > 0 ? '+' : '') + l.point + ')' : '')))),
                h('div', { style: { fontSize: '10px', color: 'var(--fg3)' } },
                  p.uniqueGames + ' game' + (p.uniqueGames > 1 ? 's' : '') + ' · ' + amOdds(p.parlayDecimal) + ' parlay')),
              h('div', { style: { textAlign: 'right', marginLeft: '12px' } },
                h('span', { cls: 'ev-badge ' + (pos ? 'ev-pos' : 'ev-neg') }, (pos ? '+' : '') + p.evPct.toFixed(2) + '% EV'),
                h('div', { style: { fontSize: '10px', color: pos ? '#00ff8c' : '#ff5555', fontWeight: '600', marginTop: '2px', fontFamily: 'var(--mono)' } },
                  (pos ? '+' : '') + '$' + p.ev.toFixed(2))),
            )),
          open ? h('div', { style: { padding: '0 14px 14px', animation: 'fadeIn .2s' } },
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '8px' } },
              h('div', { cls: 'sbox' }, h('div', { cls: 'sl' }, 'Stake'), h('div', { cls: 'sv' }, '$' + p.stake.toFixed(0))),
              h('div', { cls: 'sbox' }, h('div', { cls: 'sl' }, 'Fair Prob'), h('div', { cls: 'sv' }, (p.combinedFairProb * 100).toFixed(3) + '%')),
              h('div', { cls: 'sbox' }, h('div', { cls: 'sl' }, 'Edge'), h('div', { cls: 'sv', style: { color: pos ? '#00ff8c' : '#ff5555' } }, (pos ? '+' : '') + p.evPct.toFixed(2) + '%'))),
            mathBlock(p.math, S.expandedMath === idx, () => set({ expandedMath: S.expandedMath === idx ? null : idx })),
          ) : null,
        );
      })),
  );
}

// ─── GAME CARDS (single bet mode) ───
function gameCards() {
  const games = S.odds || [], book = BOOKS.find(b => b.key === S.sportsbook);
  const withBook = games.filter(g => g.bookmakers?.some(b => b.key === S.sportsbook));
  return h('div', { style: { animation: 'fadeUp .35s ease' } },
    !withBook.length ? h('div', { cls: 'ib ib-y' }, '⚠ ' + (book?.label || S.sportsbook) + ' has no odds for these games. Try a different sportsbook.') : null,
    h('div', { style: { fontSize: '12px', color: 'var(--fg3)', marginBottom: '10px' } },
      games.length + ' games (' + withBook.length + ' with ' + (book?.label || '') + ')'),
    h('div', {},
      ...games.map(g => {
        const hasBook = g.bookmakers?.some(b => b.key === S.sportsbook);
        const hasSharp = g.bookmakers?.some(b => SHARP.includes(b.key) && b.key !== S.sportsbook);
        const active = S.selectedGame?.id === g.id;
        const h2h = g.bookmakers?.find(b => b.key === S.sportsbook)?.markets?.find(m => m.key === 'h2h');
        const gr = active && S.singleResults ? S.singleResults.filter(r => passFilter(r.bookDecimal, S.minOdds, S.maxOdds)) : null;
        return h('div', { cls: 'gcard' + (active ? ' on' : ''), style: !hasBook ? { opacity: '.4' } : {} },
          h('button', { cls: 'gbtn', onClick: () => hasBook && hasSharp ? runSingle(g) : null, style: !hasBook || !hasSharp ? { cursor: 'default' } : {} },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' } },
              h('div', {},
                h('div', { style: { fontSize: '13px', fontWeight: '600', color: active ? 'var(--accent)' : '#fff', fontFamily: 'var(--display)' } },
                  g.away_team + ' ', h('span', { style: { color: 'var(--fg3)', margin: '0 4px' } }, '@'), ' ' + g.home_team),
                h('div', { style: { fontSize: '10.5px', color: 'var(--fg3)', marginTop: '3px' } },
                  new Date(g.commence_time).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
                  !hasSharp ? h('span', { style: { color: 'var(--red)', marginLeft: '8px' } }, '⚠ No sharp lines') : null)),
              h2h ? h('div', { style: { textAlign: 'right', fontSize: '11px', fontFamily: 'var(--mono)' } },
                ...(h2h.outcomes || []).map(o => h('div', { style: { color: 'var(--fg3)', marginBottom: '1px' } },
                  h('span', { style: { color: 'var(--fg2)', marginRight: '6px' } }, o.name.length > 12 ? o.name.slice(0, 12) + '…' : o.name),
                  h('span', { style: { color: book?.c || 'var(--accent)', fontWeight: '600' } }, amOdds(o.price))))
              ) : null,
            )),
          active && gr ? h('div', { style: { padding: '0 12px 12px', animation: 'fadeIn .25s' } },
            h('div', { style: { borderTop: '1px solid rgba(0,255,170,.1)', paddingTop: '10px', marginTop: '2px' } },
              h('div', { style: { fontSize: '10.5px', color: 'var(--fg3)', marginBottom: '8px' } },
                'Sharp: ' + (gr[0]?.sharpBook || 'Pinnacle') + ' · ' + gr.filter(r => r.evPct > 0).length + ' +EV bets'),
              !gr.length ? h('div', { style: { textAlign: 'center', padding: '12px', color: 'var(--fg3)', fontSize: '12px' } }, 'No matching markets.')
              : h('div', { style: { display: 'grid', gap: '5px' } },
                ...gr.map((r, idx) => {
                  const open = S.expandedIdx === idx, pos = r.evPct > 0;
                  return h('div', { style: {
                    background: idx === 0 && pos ? 'rgba(0,255,140,.05)' : 'rgba(255,255,255,.02)',
                    border: idx === 0 && pos ? '1px solid rgba(0,255,140,.12)' : '1px solid rgba(255,255,255,.04)',
                    borderRadius: '8px', overflow: 'hidden',
                  } },
                    h('button', { style: { width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', background: 'none', border: 'none', padding: '10px 12px', color: 'var(--fg)' },
                      onClick: (e) => { e.stopPropagation(); set({ expandedIdx: open ? null : idx }); } },
                      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                        h('div', { style: { flex: '1' } },
                          h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' } },
                            idx === 0 && pos ? h('span', { style: { fontSize: '8px', fontWeight: '700', background: 'rgba(0,255,170,.15)', color: 'var(--accent)', padding: '1px 6px', borderRadius: '3px', letterSpacing: '.5px', textTransform: 'uppercase' } }, 'Best') : null,
                            h('span', { style: { fontFamily: 'var(--display)', fontSize: '12px', fontWeight: '600', color: '#fff' } },
                              r.outcome + ' ' + (r.point != null ? '(' + (r.point > 0 ? '+' : '') + r.point + ')' : ''))),
                          h('div', { style: { fontSize: '10px', color: 'var(--fg3)' } },
                            r.marketLabel + ' · ' + amOdds(r.bookDecimal) + ' · Fair ' + (r.fairProb * 100).toFixed(1) + '%')),
                        h('span', { cls: 'ev-badge ' + (pos ? 'ev-pos' : 'ev-neg') }, (pos ? '+' : '') + r.evPct.toFixed(2) + '%'))),
                    open ? h('div', { style: { padding: '0 12px 12px', animation: 'fadeIn .2s' } },
                      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '8px' } },
                        h('div', { cls: 'sbox' }, h('div', { cls: 'sl' }, 'Stake'), h('div', { cls: 'sv' }, '$' + r.stake.toFixed(0))),
                        h('div', { cls: 'sbox' }, h('div', { cls: 'sl' }, 'Fair Prob'), h('div', { cls: 'sv' }, (r.fairProb * 100).toFixed(2) + '%')),
                        h('div', { cls: 'sbox' }, h('div', { cls: 'sl' }, 'EV'), h('div', { cls: 'sv', style: { color: pos ? '#00ff8c' : '#ff5555' } }, (pos ? '+' : '') + '$' + r.ev.toFixed(2)))),
                      mathBlock(r.math, S.expandedMath === idx, () => set({ expandedMath: S.expandedMath === idx ? null : idx })),
                    ) : null,
                  );
                })),
            )) : null,
        );
      })),
  );
}

// ─── APP PAGE ───
function pgApp() {
  const isP = S.bonusType === 'parlay_boost';
  const book = BOOKS.find(b => b.key === S.sportsbook);
  const p = S.profile || {}, plan = p.plan || 'free', used = p.fetches_used || 0;
  const limit = plan === 'free' ? 10 : plan === 'standard' ? 300 : null;
  const atLimit = limit !== null && used >= limit;

  return h('div', {},
    appHeader(),
    h('div', { cls: 'container-sm', style: { paddingTop: '24px', paddingBottom: '80px' } },
      S.error ? h('div', { cls: 'ib ib-r', style: { display: 'flex', alignItems: 'center', gap: '8px', animation: 'fadeIn .2s' } },
        h('span', {}, '✕'), h('span', { style: { flex: '1' } }, S.error),
        h('button', { onClick: () => set({ error: '' }), style: { fontSize: '16px' } }, '×')) : null,
      // Bonus Config
      h('div', { cls: 'card fade-up' },
        h('div', { cls: 'stitle' }, h('span', { style: { color: 'var(--accent)' } }, '●'), ' Bonus Configuration'),
        h('div', { cls: 'lbl' }, 'Type'),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '5px', marginBottom: '14px' } },
          ...BONUS_TYPES.map(b => h('button', { cls: 'pill' + (S.bonusType === b.key ? ' on' : ''),
            onClick: () => set({ bonusType: b.key, singleResults: null, parlayResults: null, selectedGame: null, parlayMode: 'standard' }) },
            h('span', { style: { fontSize: '14px', display: 'block', marginBottom: '1px' } }, b.icon),
            h('span', { style: { fontSize: '10px' } }, b.label)))),
        isP ? h('div', {},
          h('div', { cls: 'lbl' }, 'Parlay Type'),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px', marginBottom: '14px' } },
            ...['standard', 'sgp', 'sgpx'].map(m => h('button', { cls: 'pill' + (S.parlayMode === m ? ' on' : ''),
              onClick: () => set({ parlayMode: m, parlayResults: null }) }, m === 'standard' ? 'Standard' : m === 'sgp' ? 'SGP' : 'SGP+'))),
          h('div', { cls: 'ib ib-g', style: { fontSize: '11.5px' } },
            S.parlayMode === 'standard' ? '🔗 One leg per game, no correlated legs.'
            : S.parlayMode === 'sgp' ? '🎯 All legs from one game, different markets.'
            : '🔀 2+ legs from one game + 1+ legs from other games.'),
        ) : null,
        h('div', { style: { display: 'grid', gridTemplateColumns: isP ? '1fr 1fr 1fr' : '1fr 1fr', gap: '10px', marginBottom: '14px' } },
          h('div', {}, h('div', { cls: 'lbl' }, S.bonusType === 'risk_free' ? 'Bet Amount ($)' : 'Boost %'),
            h('input', { type: 'number', value: S.boostPct, placeholder: '50', id: 'inp-boost', onInput: (e) => { S.boostPct = e.target.value; } })),
          h('div', {}, h('div', { cls: 'lbl' }, 'Max Bet ($)'),
            h('input', { type: 'number', value: S.maxBet, placeholder: '50', id: 'inp-maxbet', onInput: (e) => { S.maxBet = e.target.value; } })),
          isP ? h('div', {}, h('div', { cls: 'lbl' }, 'Min Legs'),
            h('input', { type: 'number', value: S.numLegs, placeholder: '3', min: '2', max: '10', id: 'inp-legs', onInput: (e) => { S.numLegs = e.target.value; } })) : null),
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' } },
          h('div', {}, h('div', { cls: 'lbl' }, 'Min Odds'), h('input', { type: 'text', value: S.minOdds, placeholder: 'e.g. -200', id: 'inp-minodds', onInput: (e) => { S.minOdds = e.target.value; } })),
          h('div', {}, h('div', { cls: 'lbl' }, 'Max Odds'), h('input', { type: 'text', value: S.maxOdds, placeholder: 'e.g. +500', id: 'inp-maxodds', onInput: (e) => { S.maxOdds = e.target.value; } }))),
        h('div', { cls: 'lbl' }, 'Your Sportsbook'),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' } },
          ...BOOKS.map(b => h('button', { cls: 'pill' + (S.sportsbook === b.key ? ' on' : ''),
            style: S.sportsbook === b.key ? { borderColor: b.c + '55', color: b.c, background: b.c + '14' } : {},
            onClick: () => set({ sportsbook: b.key }) },
            h('span', { style: { fontSize: '10px', fontWeight: '700' } }, b.label)))),
      ),
      // Sport & Fetch
      h('div', { cls: 'card fade-up' },
        h('div', { cls: 'stitle' }, h('span', { style: { color: 'var(--accent)' } }, '●'), ' Sport & Odds'),
        sportPicker(),
        h('div', { style: { marginTop: '16px' } },
          atLimit ? h('div', { cls: 'uprompt' },
            h('h3', {}, plan === 'free' ? 'Free trial limit reached' : 'Monthly limit reached'),
            h('p', {}, plan === 'free' ? "You've used all 10 free fetches. Upgrade to keep sniping." : "You've used all 300 fetches. Upgrade to Unlimited."),
            h('button', { style: { display: 'inline-block', padding: '12px 32px', background: 'var(--accent)', color: 'var(--bg)', fontWeight: '700', borderRadius: '10px', fontSize: '14px' }, onClick: () => set({ page: 'pricing' }) }, 'Upgrade Now'))
          : h('button', { cls: 'fbtn', disabled: S.loading || !S.sport, onClick: fetchOdds },
              S.loading ? 'Fetching live odds...' : isP ? 'Fetch Odds & Find Best Parlays' : 'Fetch Live Odds'))),
      isP && S.parlayResults ? parlayResults() : null,
      !isP && S.odds ? gameCards() : null,
      h('div', { style: { textAlign: 'center', marginTop: '28px', fontSize: '10px', color: '#1e2e40', lineHeight: '1.6' } },
        'Fair probabilities via multiplicative vig removal from sharp lines'),
    ),
  );
}

// ─── SETTINGS PAGE ───
function pgSettings() {
  const p = S.profile || {}, plan = p.plan || 'free', used = p.fetches_used || 0;
  const limit = plan === 'free' ? 10 : plan === 'standard' ? 300 : null;
  const pct = limit ? Math.min((used / limit) * 100, 100) : 0;
  const bc = pct > 90 ? 'danger' : pct > 70 ? 'warn' : '';
  return h('div', {},
    appHeader(),
    h('div', { cls: 'container-sm', style: { paddingTop: '24px', paddingBottom: '80px' } },
      h('h2', { style: { fontFamily: 'var(--display)', fontSize: '24px', color: '#fff', fontWeight: '800', marginBottom: '24px' } }, 'Settings'),
      h('div', { cls: 'scard' },
        h('h3', {}, 'Usage'), h('p', { cls: 'desc' }, 'Your fetch usage this billing period.'),
        h('div', { cls: 'ubar-lg' }, h('div', { cls: 'fill ' + bc, style: { width: (limit ? pct : 0) + '%', background: limit ? undefined : 'var(--accent)' } })),
        h('div', { cls: 'unums' }, h('span', {}, used + ' used'), h('span', {}, limit ? (limit - used) + ' remaining' : '∞ unlimited'))),
      h('div', { cls: 'scard' },
        h('h3', {}, 'Plan'),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', margin: '12px 0 16px' } },
          h('span', { cls: 'pbadge pb-' + plan }, plan.toUpperCase()),
          h('span', { style: { fontSize: '13px', color: 'var(--fg2)' } }, limit ? limit + ' fetches / month' : 'Unlimited fetches')),
        h('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap' } },
          (plan === 'standard' || plan === 'unlimited') ? h('button', { cls: 'mbtn', onClick: openPortal }, 'Manage Subscription') : null,
          (plan === 'free' || plan === 'standard') ? h('button', { cls: 'mbtn', style: { borderColor: 'var(--accent)', color: 'var(--accent)' }, onClick: () => set({ page: 'pricing' }) }, 'Upgrade Plan') : null)),
      h('div', { cls: 'scard' },
        h('h3', {}, 'Account'), h('p', { cls: 'desc' }, p.email || S.user?.email || ''),
        h('button', { cls: 'lobtn', onClick: doLogout }, 'Log Out')),
      // Promo code section
      h('div', { cls: 'scard' },
        h('h3', {}, 'Promo Code'),
        h('p', { cls: 'desc' }, (plan === 'unlimited' || plan === 'lifetime') ? '✅ Active: ' + plan.charAt(0).toUpperCase() + plan.slice(1) + ' access' : 'Have a promo code? Enter it below.'),
        (plan !== 'unlimited' && plan !== 'lifetime') ? h('div', { style: { display: 'flex', gap: '8px' } },
          h('input', { type: 'text', placeholder: 'Enter code', id: 'inp-promo', style: { flex: '1', textTransform: 'uppercase' } }),
          h('button', { cls: 'mbtn', style: { borderColor: 'var(--accent)', color: 'var(--accent)', whiteSpace: 'nowrap' }, onClick: async () => {
            const code = document.getElementById('inp-promo')?.value;
            const errEl = document.getElementById('promo-err');
            const err = await applyPromo(code);
            if (err && errEl) errEl.textContent = err;
          } }, 'Apply'),
        ) : null,
        h('div', { id: 'promo-err', style: { color: 'var(--red)', fontSize: '12px', marginTop: '8px' } }),
      ),
    ),
  );
}

// ─── PRICING PAGE (standalone) ───
function pgPricing() {
  return h('div', {},
    h('nav', { cls: 'nav' }, h('div', { cls: 'nav-inner' },
      h('div', { cls: 'nav-logo', onClick: () => set({ page: S.user ? 'app' : 'landing' }) }, h('div', { cls: 'crosshair' }, '🎯'), 'LineSnipes'),
      h('div', { cls: 'nav-links' },
        S.user ? h('button', { cls: 'nbtn nbtn-g', onClick: () => set({ page: 'app' }) }, '← Back to Tool')
          : h('button', { cls: 'nbtn nbtn-p', onClick: () => set({ page: 'signup' }) }, 'Get Started')),
    )),
    h('div', { style: { paddingTop: '80px' } }, pgPricingSection()),
    h('footer', { cls: 'footer container' }, h('p', {}, 'LineSnipes © 2026')),
  );
}

// ═══════════════════════════════════════════════════
// LINESNIPES app.js — Router & Init
// ═══════════════════════════════════════════════════

let _lastPage = null;
let _rendering = false;

function render() {
  if (_rendering) return;
  _rendering = true;
  requestAnimationFrame(() => {
    const root = document.getElementById('root');
    let page;
    switch (S.page) {
      case 'landing': page = pgLanding(); break;
      case 'login': page = pgAuth('login'); break;
      case 'signup': page = pgAuth('signup'); break;
      case 'app': page = pgApp(); break;
      case 'settings': page = pgSettings(); break;
      case 'pricing': page = pgPricing(); break;
      default: page = pgLanding();
    }
    // Only do full replace — but no scroll reset unless page changed
    root.replaceChildren(page);
    if (S.page !== _lastPage) { window.scrollTo(0, 0); _lastPage = S.page; }
    _rendering = false;
  });
}

// Render landing page immediately, then check auth in background
render();
initAuth();

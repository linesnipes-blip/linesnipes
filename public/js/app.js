// ═══════════════════════════════════════════════════
// LINESNIPES app.js — Router & Init
// ═══════════════════════════════════════════════════

function render() {
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
  root.innerHTML = '';
  root.appendChild(page);
  window.scrollTo(0, 0);
}

// Render landing page immediately, then check auth in background
render();
initAuth();

// ═══════════════════════════════════════════════════
// LINESNIPES app.js — Router & Init
// ═══════════════════════════════════════════════════

let _lastPage = null;
let _renderTimer = null;

function render() {
  // Debounce — batch multiple set() calls into one render
  if (_renderTimer) cancelAnimationFrame(_renderTimer);
  _renderTimer = requestAnimationFrame(_doRender);
}

function _doRender() {
  _renderTimer = null;
  const root = document.getElementById('root');

  // Save focused input state before re-render
  const activeEl = document.activeElement;
  const focusId = activeEl?.id || null;
  const focusStart = activeEl?.selectionStart ?? null;
  const focusEnd = activeEl?.selectionEnd ?? null;

  let page;
  switch (S.page) {
    case 'landing': page = pgLanding(); break;
    case 'login': page = pgAuth('login'); break;
    case 'signup': page = pgAuth('signup'); break;
    case 'app': page = pgApp(); break;
    case 'faq': page = pgFaq(); break;
    case 'settings': page = pgSettings(); break;
    case 'pricing': page = pgPricing(); break;
    default: page = pgLanding();
  }

  // For same-page updates, swap content without scroll reset
  const pageChanged = S.page !== _lastPage;

  // Wrap in a container div to do atomic swap
  const wrapper = document.createElement('div');
  wrapper.style.minHeight = '100vh';
  wrapper.appendChild(page);

  // Replace children atomically
  while (root.firstChild) root.removeChild(root.firstChild);
  root.appendChild(wrapper);

  if (pageChanged) {
    window.scrollTo(0, 0);
    _lastPage = S.page;
  }

  // Restore focus and cursor position after re-render
  if (focusId) {
    const el = document.getElementById(focusId);
    if (el) {
      el.focus();
      if (focusStart !== null && el.setSelectionRange) {
        try { el.setSelectionRange(focusStart, focusEnd); } catch(e) {}
      }
    }
  }
}

// Render landing page immediately, then check auth in background
_doRender();
initAuth();

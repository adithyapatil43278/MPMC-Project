// Simple theme loader and selector persistence
const THEME_KEY = 'cogapp_theme';
const THEMES = [
  { id: 'theme-light', label: 'Light' },
  { id: 'theme-dark', label: 'Dark' },
  { id: 'theme-dracula', label: 'Dracula' },
  { id: 'theme-nord', label: 'Nord' },
  { id: 'theme-solarized', label: 'Solarized' },
];

export function applyTheme(themeId) {
  const body = document.body;
  // Remove previous theme-xxx classes
  body.classList.remove(...THEMES.map(t => t.id));
  // Add selected class; default to light if invalid
  const id = THEMES.some(t => t.id === themeId) ? themeId : 'theme-light';
  body.classList.add(id);
  try { localStorage.setItem(THEME_KEY, id); } catch {}
}

export function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch {}
  applyTheme(saved || 'theme-light');
}

export function buildThemeSelector(selectEl) {
  // Populate options
  selectEl.innerHTML = '';
  for (const t of THEMES) {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.label;
    selectEl.appendChild(opt);
  }
  // Set current value
  let saved = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch {}
  selectEl.value = saved || 'theme-light';
  // Change handler
  selectEl.addEventListener('change', (e) => {
    applyTheme(selectEl.value);
  });
}

// Auto-apply on any page that imports theme.js as module
initTheme();

const MOON_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';
const SUN_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';

export function initializeThemeToggle({
  document = globalThis.document,
  matchMedia = globalThis.matchMedia.bind(globalThis),
  storage = globalThis.localStorage
} = {}) {
  const toggle = document.querySelector('#theme-toggle');

  function getEffectiveTheme() {
    const stored = document.documentElement.dataset.theme;

    if (stored === 'light' || stored === 'dark') {
      return stored;
    }

    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function render(theme) {
    toggle.innerHTML = theme === 'dark' ? SUN_SVG : MOON_SVG;
    toggle.setAttribute(
      'aria-label',
      `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`
    );
  }

  render(getEffectiveTheme());

  toggle.addEventListener('click', () => {
    const theme = getEffectiveTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;

    try {
      storage.setItem('theme', theme);
    } catch {
      // Ignore storage failures.
    }

    render(theme);
  });
}

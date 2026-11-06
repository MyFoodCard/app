// Run in the head so a saved theme is applied before the first paint.
(() => {
  const key = 'myfoodcard.theme.v1';
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  let preference = 'system';

  try {
    const saved = localStorage.getItem(key);
    if (['system', 'light', 'dark'].includes(saved)) preference = saved;
  } catch {
    // A theme still works for this visit when browser storage is unavailable.
  }

  function applyTheme() {
    const theme = preference === 'system' ? (system.matches ? 'dark' : 'light') : preference;
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]').content =
      theme === 'dark' ? '#111217' : '#f3f3ee';
  }

  applyTheme();
  system.addEventListener('change', applyTheme);

  document.addEventListener('DOMContentLoaded', () => {
    const select = document.getElementById('theme-select');
    select.value = preference;
    select.addEventListener('change', () => {
      preference = select.value;
      applyTheme();
      try {
        localStorage.setItem(key, preference);
      } catch {
        // Keep the selected theme for this visit.
      }
    });
  });
})();

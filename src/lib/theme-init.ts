/**
 * Inline script — runs before React hydrates to prevent FOUC (flash of unstyled content).
 * Inject this as a string into <head> via dangerouslySetInnerHTML.
 *
 * Reads localStorage['pulsar-theme'] and applies the .dark / .light class to <html>
 * before the first paint. Defaults to system preference if no stored value.
 */
export const themeInitScript = `(function() {
  try {
    var stored = localStorage.getItem('pulsar-theme');
    var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored || (systemDark ? 'dark' : 'light');
    var root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(theme);
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    window.__PULSAR_THEME_INIT__ = theme;
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();`;

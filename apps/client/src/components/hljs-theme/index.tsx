const LIGHT_THEME =
  'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css';
const DARK_THEME =
  'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css';

const LINK_ID = 'hljs-theme';

let observing = false;

const getThemeUrl = () => {
  const isDark = document.documentElement.classList.contains('dark');
  return isDark ? DARK_THEME : LIGHT_THEME;
};

const ensureHljsTheme = () => {
  let link = document.getElementById(LINK_ID) as HTMLLinkElement | null;

  if (!link) {
    link = document.createElement('link');
    link.id = LINK_ID;
    link.rel = 'stylesheet';
    link.href = getThemeUrl();
    document.head.appendChild(link);
  }

  if (!observing) {
    observing = true;

    const observer = new MutationObserver(() => {
      const existing = document.getElementById(
        LINK_ID
      ) as HTMLLinkElement | null;
      if (existing) {
        existing.href = getThemeUrl();
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
  }
};

export { ensureHljsTheme };

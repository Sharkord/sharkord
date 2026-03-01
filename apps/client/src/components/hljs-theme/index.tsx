import { useTheme } from '@/components/theme-provider';
import { useEffect } from 'react';

const LIGHT_THEME =
  'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css';
const DARK_THEME =
  'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css';

function HljsTheme() {
  const { theme } = useTheme();

  useEffect(() => {
    const isDark =
      theme === 'dark' ||
      (theme === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);

    const id = 'hljs-theme';
    let link = document.getElementById(id) as HTMLLinkElement | null;

    if (!link) {
      link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }

    link.href = isDark ? DARK_THEME : LIGHT_THEME;
  }, [theme]);

  return null;
}

export { HljsTheme };

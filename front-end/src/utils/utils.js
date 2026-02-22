import { useContext } from 'react';

import { ThemeContext } from '../App';

export const getSystemTheme = () => {
  if (globalThis.matchMedia && globalThis.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
};

export const useLogo = (logoDark, logoLight) => {
  const { theme } = useContext(ThemeContext);
  if (theme === 'auto') return getSystemTheme() === 'dark' ? logoLight : logoDark;
  return theme === 'dark' ? logoLight : logoDark;
};

export function scrollTop() {
  globalThis.scrollTo(0, 0);
}

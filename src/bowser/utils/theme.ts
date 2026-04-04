import { getStorageItem } from './storage';

export type BowserTheme = 'dark' | 'light' | 'system';

export function getEffectiveTheme(): BowserTheme {
  return getStorageItem<BowserTheme>('theme', 'dark');
}

export function applyBowserTheme(theme: BowserTheme) {
  const root = document.documentElement;
  const effective = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : theme;
  root.setAttribute('data-bowser-theme', effective);
}

import { getStorageItem, setStorageItem } from '../utils/storage';
import { SearchEngine } from './useOmnibox';

export type FontSize = 'small' | 'medium' | 'large';
export type TabLimit = 5 | 10 | 20 | 0; // 0 = unlimited

const FONT_SCALE: Record<FontSize, string> = {
  small: '0.9',
  medium: '1',
  large: '1.1',
};

export function getFontSize(): FontSize {
  return getStorageItem<FontSize>('font-size', 'medium');
}

export function setFontSize(size: FontSize): void {
  setStorageItem('font-size', size);
  applyFontScale(size);
}

export function applyFontScale(size: FontSize): void {
  document.documentElement.style.setProperty('--bw-font-scale', FONT_SCALE[size]);
}

export function getTabLimit(): TabLimit {
  return getStorageItem<TabLimit>('tab-limit', 20);
}

export function setTabLimit(limit: TabLimit): void {
  setStorageItem('tab-limit', limit);
}

export function getSearchEngineSetting(): SearchEngine {
  return getStorageItem<SearchEngine>('search-engine', 'duckduckgo');
}

export function setSearchEngineSetting(engine: SearchEngine): void {
  setStorageItem('search-engine', engine);
}

export function getAutoFullscreen(): boolean {
  return getStorageItem<boolean>('auto-fullscreen', true);
}

export function setAutoFullscreen(enabled: boolean): void {
  setStorageItem('auto-fullscreen', enabled);
}

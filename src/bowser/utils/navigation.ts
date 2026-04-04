import { TabKind } from '../types';
import { getStorageItem } from './storage';

export type SearchEngine = 'duckduckgo' | 'google' | 'bing' | 'brave';

const SEARCH_ENGINE_URLS: Record<SearchEngine, string> = {
  duckduckgo: 'https://duckduckgo.com/?q=',
  google: 'https://google.com/search?q=',
  bing: 'https://bing.com/search?q=',
  brave: 'https://search.brave.com/search?q=',
};

export interface NavigationDecision {
  kind: TabKind;
  url: string;
  query?: string;
  error?: string;
  rebuild?: boolean;
}

export function parseOmniboxInput(input: string, currentKind: TabKind): NavigationDecision {
  const trimmed = input.trim();
  
  if (!trimmed) {
    return { kind: currentKind, url: '', error: 'Please enter a URL or search query.' };
  }

  if (trimmed.startsWith('bowser://')) {
    const page = trimmed.replace('bowser://', '').toLowerCase();
    if (page === 'newtab') return { kind: 'new-tab', url: 'bowser://newtab' };
    if (page === 'history') return { kind: 'history', url: 'bowser://history' };
    if (page === 'bookmarks') return { kind: 'bookmarks', url: 'bowser://bookmarks' };
    if (page === 'settings') return { kind: 'settings', url: 'bowser://settings' };
    return { kind: 'new-tab', url: 'bowser://newtab' };
  }

  // Check if input looks like a URL
  const isUrl = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/i.test(trimmed);

  if (isUrl) {
    const url = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    return { kind: 'web', url };
  }

  // In web mode with non-URL input, treat as search via proxy
  if (currentKind === 'web') {
    const engine = getStorageItem<SearchEngine>('search-engine', 'duckduckgo');
    const searchUrl = SEARCH_ENGINE_URLS[engine] || SEARCH_ENGINE_URLS.duckduckgo;
    return { kind: 'web', url: `${searchUrl}${encodeURIComponent(trimmed)}`, query: trimmed };
  }

  if (currentKind === 'ai') {
    return { kind: 'ai', url: trimmed, query: trimmed };
  }

  // Default: route search queries through AI generation for better results
  return { kind: 'ai', url: trimmed, query: trimmed };
}

function validateWebUrl(input: string): NavigationDecision {
  let urlStr = input;
  if (!/^https?:\/\//i.test(urlStr)) {
    if (urlStr.includes(' ')) {
      return { kind: 'web', url: input, error: 'Please enter a valid URL without spaces.' };
    }
    urlStr = `https://${urlStr}`;
  }

  try {
    const parsed = new URL(urlStr);
    if (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost') {
      return { kind: 'web', url: input, error: 'Please enter a valid domain name.' };
    }
    return { kind: 'web', url: urlStr };
  } catch {
    return { kind: 'web', url: input, error: 'Invalid URL format. Please check and try again.' };
  }
}

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

  // In web mode, validate as URL
  if (currentKind === 'web') {
    return validateWebUrl(trimmed);
  }

  // Check if input looks like a URL regardless of mode
  const isUrl = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/i.test(trimmed);
  
  if (isUrl) {
    const url = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    return { kind: 'web', url };
  }

  if (currentKind === 'ai') {
    return { kind: 'ai', url: trimmed, query: trimmed };
  }

  // Use configured search engine
  const engine = getStorageItem<SearchEngine>('search-engine', 'duckduckgo');
  const searchUrl = SEARCH_ENGINE_URLS[engine] || SEARCH_ENGINE_URLS.duckduckgo;
  return { kind: 'web', url: `${searchUrl}${encodeURIComponent(trimmed)}`, query: trimmed };
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

import { TabKind } from '../types';

export interface NavigationDecision {
  kind: TabKind;
  url: string;
  query?: string;
}

export function parseOmniboxInput(input: string, currentKind: TabKind): NavigationDecision {
  const trimmed = input.trim();
  
  if (trimmed.startsWith('bowser://')) {
    const page = trimmed.replace('bowser://', '').toLowerCase();
    if (page === 'newtab') return { kind: 'new-tab', url: 'bowser://newtab' };
    if (page === 'history') return { kind: 'history', url: 'bowser://history' };
    if (page === 'bookmarks') return { kind: 'bookmarks', url: 'bowser://bookmarks' };
    if (page === 'settings') return { kind: 'settings', url: 'bowser://settings' };
    return { kind: 'new-tab', url: 'bowser://newtab' };
  }

  const isUrl = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/i.test(trimmed);
  
  if (isUrl) {
    const url = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    return { kind: 'web', url };
  }

  if (currentKind === 'ai') {
    return { kind: 'ai', url: trimmed, query: trimmed };
  }

  return { kind: 'web', url: `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`, query: trimmed };
}

import { Tab, TabKind, createTab } from '../types';
import { getStorageItem, setStorageItem } from '../utils/storage';

// ============================================
// Workspace persistence
// ============================================

export interface SerializedTab {
  tabKind: TabKind;
  browserUrl?: string;
  customTitle?: string;
  pinned?: boolean;
  breadcrumb: { sitename: string; page: string };
  lastPrompt?: string;
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

export function saveWorkspace(tabs: Tab[]): void {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    const serializable: SerializedTab[] = tabs.map(t => ({
      tabKind: t.tabKind,
      browserUrl: t.browserUrl,
      customTitle: t.customTitle,
      pinned: t.pinned,
      breadcrumb: t.breadcrumb,
      lastPrompt: t.currentIndex >= 0 ? t.history[t.currentIndex]?.prompt : undefined,
    }));
    setStorageItem('workspace', serializable);
  }, 2000);
}

export function restoreWorkspace(): Tab[] | null {
  const saved = getStorageItem<SerializedTab[]>('workspace', []);
  if (!saved.length) return null;

  return saved.map(s => {
    const tab = createTab(s.tabKind || 'new-tab');
    if (s.browserUrl) tab.browserUrl = s.browserUrl;
    if (s.customTitle) tab.customTitle = s.customTitle;
    if (s.pinned) tab.pinned = s.pinned;
    tab.breadcrumb = s.breadcrumb || { sitename: '', page: '' };
    return tab;
  });
}

// ============================================
// Recently closed tabs
// ============================================

export interface ClosedTabInfo {
  id: string;
  tabKind: TabKind;
  browserUrl?: string;
  title: string;
  lastPrompt?: string;
  timestamp: number;
}

export function getRecentlyClosed(): ClosedTabInfo[] {
  return getStorageItem<ClosedTabInfo[]>('recently-closed', []);
}

export function addRecentlyClosed(tab: Tab): void {
  if (tab.tabKind === 'new-tab') return;

  const info: ClosedTabInfo = {
    id: crypto.randomUUID(),
    tabKind: tab.tabKind,
    browserUrl: tab.browserUrl,
    title: tab.customTitle || tab.breadcrumb.sitename || tab.breadcrumb.page || 'Untitled',
    lastPrompt: tab.currentIndex >= 0 ? tab.history[tab.currentIndex]?.prompt : undefined,
    timestamp: Date.now(),
  };

  const current = getRecentlyClosed();
  const updated = [info, ...current].slice(0, 10);
  setStorageItem('recently-closed', updated);
}

export function popRecentlyClosed(): ClosedTabInfo | null {
  const current = getRecentlyClosed();
  if (!current.length) return null;
  const [first, ...rest] = current;
  setStorageItem('recently-closed', rest);
  return first;
}

// ============================================
// Recent prompts
// ============================================

export function getRecentPrompts(): string[] {
  return getStorageItem<string[]>('recent-prompts', []);
}

export function addRecentPrompt(prompt: string): void {
  const current = getRecentPrompts();
  const filtered = current.filter(p => p !== prompt);
  const updated = [prompt, ...filtered].slice(0, 20);
  setStorageItem('recent-prompts', updated);
}

import { useCallback } from 'react';
import { Tab, TabKind, Breadcrumb } from '../types';
import { parseOmniboxInput } from '../utils/navigation';
import { parseBreadcrumb } from '../utils/urlHelpers';
import { addRecentPrompt } from '../store/session';
import { getStorageItem } from '../utils/storage';

export type SearchEngine = 'duckduckgo' | 'google' | 'bing' | 'brave';

export const SEARCH_ENGINES: Record<SearchEngine, { name: string; url: string }> = {
  duckduckgo: { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
  google: { name: 'Google', url: 'https://google.com/search?q=' },
  bing: { name: 'Bing', url: 'https://bing.com/search?q=' },
  brave: { name: 'Brave Search', url: 'https://search.brave.com/search?q=' },
};

export function getSearchEngine(): SearchEngine {
  return getStorageItem<SearchEngine>('search-engine', 'duckduckgo');
}

export function useOmnibox(deps: {
  activeTab: Tab | undefined;
  currentPage: any;
  updateTabById: (id: string, updater: (t: Tab) => Tab) => void;
  generate: (prompt: string, html: string | null, fallback: Breadcrumb, push: boolean, formState?: any, tabId?: string) => void;
  rebuild: (url: string, tabId?: string) => void;
  addHistoryEntry: (entry: { url: string; title: string; tabKind: TabKind }) => void;
  executeAgent?: (goal: string, tabId: string) => Promise<any>;
}) {
  const { activeTab, currentPage, updateTabById, generate, rebuild, addHistoryEntry, executeAgent } = deps;

  const handleOmnibarNavigate = useCallback((_type: 'create' | 'edit', prompt: string) => {
    if (!activeTab) return;
    const tab = activeTab;
    const decision = parseOmniboxInput(prompt, tab.tabKind);

    if (decision.error) return;

    if (decision.kind === 'web') {
      updateTabById(tab.id, t => {
        const newWebHistory = [...t.webHistory.slice(0, t.webHistoryIndex + 1), decision.url];
        return {
          ...t, tabKind: 'web', browserUrl: decision.url,
          breadcrumb: { sitename: decision.url, page: '' }, navigationId: t.navigationId + 1,
          webHistory: newWebHistory, webHistoryIndex: newWebHistory.length - 1,
        };
      });
      addHistoryEntry({ url: decision.url, title: decision.url, tabKind: 'web' });
      return;
    }

    if (decision.kind === 'ai') {
      updateTabById(tab.id, t => ({ ...t, tabKind: 'ai' }));

      // Rebuild flow: URL pasted in Create mode
      if (decision.rebuild) {
        rebuild(decision.url, tab.id);
        addHistoryEntry({ url: decision.url, title: `Rebuild: ${decision.url}`, tabKind: 'ai' });
        return;
      }

      const parsed = parseBreadcrumb(prompt);
      const isEdit = parsed.sitename === activeTab.breadcrumb.sitename && parsed.page && parsed.page !== activeTab.breadcrumb.page;

      if (isEdit && currentPage) {
        const fallback: Breadcrumb = { sitename: activeTab.breadcrumb.sitename, page: parsed.page };
        generate(parsed.page, currentPage.html, fallback, false);
      } else {
        const query = decision.query || prompt;
        addRecentPrompt(query);
        const fallback: Breadcrumb = { sitename: query, page: 'Home' };
        generate(query, null, fallback, true);
      }
      addHistoryEntry({ url: decision.query || prompt, title: decision.query || prompt, tabKind: 'ai' });
      return;
    }

    // System pages
    updateTabById(tab.id, t => ({
      ...t, tabKind: decision.kind, browserUrl: undefined,
      currentIndex: -1, history: [], loading: false, generatedContent: '',
      breadcrumb: { sitename: decision.kind, page: '' },
    }));
  }, [activeTab, currentPage, updateTabById, generate, addHistoryEntry]);

  return { handleOmnibarNavigate };
}

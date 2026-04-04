import { useState, useCallback, useRef, useEffect } from 'react';
import { Tab, TabKind, createTab, Breadcrumb } from '../types';
import { saveWorkspace, restoreWorkspace, addRecentlyClosed, popRecentlyClosed } from '../store/session';
import { siteNameFromPrompt } from '../utils/urlHelpers';

export function useTabManager() {
  const [tabs, setTabs] = useState<Tab[]>(() => {
    const restored = restoreWorkspace();
    return restored && restored.length > 0 ? restored : [createTab('web')];
  });
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  // Persist workspace on structural changes only
  const prevTabsRef = useRef<string>('');
  useEffect(() => {
    const structural = tabs.map(t => `${t.id}|${t.tabKind}|${t.browserUrl || ''}|${t.customTitle || ''}|${t.pinned || ''}|${t.breadcrumb.sitename}|${t.breadcrumb.page}`).join(';;');
    if (structural !== prevTabsRef.current) {
      prevTabsRef.current = structural;
      saveWorkspace(tabs);
    }
  }, [tabs]);

  const safeIndex = Math.min(activeTabIndex, Math.max(tabs.length - 1, 0));
  const activeTab = tabs[safeIndex];
  const currentPage = activeTab?.currentIndex >= 0 ? activeTab.history[activeTab.currentIndex] : null;

  const updateTabById = useCallback((tabId: string, updater: (tab: Tab) => Tab) => {
    setTabs(prev => prev.map(t => t.id === tabId ? updater(t) : t));
  }, []);

  const handleNewTab = useCallback((tabLimit?: number) => {
    if (tabLimit && tabs.length >= tabLimit) return;
    const newTab = createTab('web');
    setTabs(prev => {
      const next = [...prev, newTab];
      queueMicrotask(() => setActiveTabIndex(next.length - 1));
      return next;
    });
  }, [tabs.length]);

  const handleCloseTab = useCallback((index: number) => {
    const closingTab = tabs[index];
    if (!closingTab || closingTab.pinned) return;

    addRecentlyClosed(closingTab);

    if (tabs.length === 1) {
      const newTab = createTab('web');
      setTabs([newTab]);
      setActiveTabIndex(0);
    } else {
      const newTabs = tabs.filter((_, i) => i !== index);
      let newActiveIndex: number;
      if (activeTabIndex === index) {
        newActiveIndex = Math.min(index, newTabs.length - 1);
      } else if (activeTabIndex > index) {
        newActiveIndex = activeTabIndex - 1;
      } else {
        newActiveIndex = activeTabIndex;
      }
      setTabs(newTabs);
      setActiveTabIndex(newActiveIndex);
    }
  }, [tabs, activeTabIndex]);

  const handleSwitchTab = useCallback((index: number) => {
    setActiveTabIndex(index);
  }, []);

  const handleRenameTab = useCallback((tabId: string, newTitle: string) => {
    updateTabById(tabId, tab => ({ ...tab, customTitle: newTitle }));
  }, [updateTabById]);

  const handlePinTab = useCallback((tabId: string) => {
    updateTabById(tabId, tab => ({ ...tab, pinned: !tab.pinned }));
  }, [updateTabById]);

  const handleReopenClosedTab = useCallback((generateFn?: (prompt: string, html: string | null, fallback: Breadcrumb, push: boolean, formState?: any, tabId?: string) => void) => {
    const closed = popRecentlyClosed();
    if (!closed) return;

    if (closed.tabKind === 'web' && closed.browserUrl) {
      const newTab = createTab('web');
      newTab.browserUrl = closed.browserUrl;
      newTab.breadcrumb = { sitename: closed.browserUrl, page: '' };
      setTabs(prev => {
        const next = [...prev, newTab];
        queueMicrotask(() => setActiveTabIndex(next.length - 1));
        return next;
      });
    } else if (closed.tabKind === 'ai' && closed.lastPrompt && generateFn) {
      const newTab = createTab('web');
      setTabs(prev => {
        const next = [...prev, newTab];
        queueMicrotask(() => setActiveTabIndex(next.length - 1));
        return next;
      });
      setTimeout(() => {
        updateTabById(newTab.id, t => ({ ...t, tabKind: 'ai' }));
        const prompt = closed.lastPrompt!;
        const fallback: Breadcrumb = { sitename: siteNameFromPrompt(prompt), page: 'Home' };
        generateFn(prompt, null, fallback, true, undefined, newTab.id);
      }, 100);
    } else {
      const kind = (['history', 'bookmarks', 'settings'] as TabKind[]).includes(closed.tabKind) ? closed.tabKind : 'web';
      const newTab = createTab(kind);
      newTab.breadcrumb = { sitename: kind, page: '' };
      setTabs(prev => {
        const next = [...prev, newTab];
        queueMicrotask(() => setActiveTabIndex(next.length - 1));
        return next;
      });
    }
  }, [updateTabById]);

  const navigateToSystemPage = useCallback((kind: TabKind) => {
    if (!activeTab) return;
    updateTabById(activeTab.id, t => ({
      ...t, tabKind: kind, browserUrl: undefined,
      currentIndex: -1, history: [], loading: false, generatedContent: '',
      breadcrumb: { sitename: kind, page: '' },
    }));
  }, [activeTab, updateTabById]);

  const handleReorderTabs = useCallback((fromIndex: number, toIndex: number) => {
    setTabs(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      // Adjust activeTabIndex
      if (activeTabIndex === fromIndex) {
        queueMicrotask(() => setActiveTabIndex(toIndex));
      } else if (fromIndex < activeTabIndex && toIndex >= activeTabIndex) {
        queueMicrotask(() => setActiveTabIndex(activeTabIndex - 1));
      } else if (fromIndex > activeTabIndex && toIndex <= activeTabIndex) {
        queueMicrotask(() => setActiveTabIndex(activeTabIndex + 1));
      }
      return next;
    });
  }, [activeTabIndex]);

  return {
    tabs,
    setTabs,
    activeTabIndex,
    setActiveTabIndex,
    safeIndex,
    activeTab,
    currentPage,
    updateTabById,
    handleNewTab,
    handleCloseTab,
    handleSwitchTab,
    handleRenameTab,
    handlePinTab,
    handleReopenClosedTab,
    navigateToSystemPage,
    handleReorderTabs,
  };
}

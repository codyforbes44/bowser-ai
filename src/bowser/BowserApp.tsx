import React, { useState, useCallback, useRef, useEffect } from 'react';
import { BrowserShell } from './components/BrowserShell';
import { Sandbox } from './components/Sandbox';
import { NewTab } from './components/NewTab';
import { HistoryTab } from './components/HistoryTab';
import { BookmarksTab } from './components/BookmarksTab';
import { SettingsTab, applyBowserTheme, getEffectiveTheme } from './components/SettingsTab';
import { CommandPalette } from './components/CommandPalette';
import { AiSidePanel } from './components/AiSidePanel';
import { streamPageGeneration } from './services/geminiService';
import { Page, Breadcrumb, TokenCount, FormFieldState, GroundingSource, Tab, createTab, TabKind } from './types';
import { siteNameFromPrompt, parsePageFromHref, extractTitleFromHtml, breadcrumbToDisplay, parseBreadcrumb } from './utils/urlHelpers';
import { useBookmarks } from './store/bookmarks';
import { useHistory } from './store/history';
import { parseOmniboxInput } from './utils/navigation';
import { saveWorkspace, restoreWorkspace, addRecentlyClosed, popRecentlyClosed, addRecentPrompt } from './store/session';

const BowserApp: React.FC = () => {
  // Restore workspace from session, or default to a single web tab
  const [tabs, setTabs] = useState<Tab[]>(() => {
    const restored = restoreWorkspace();
    return restored && restored.length > 0 ? restored : [createTab('web')];
  });
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [isGrounded, setIsGrounded] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);

  const { bookmarks, bookmarkFolders, toggleBookmark, isBookmarked, createFolder, renameFolder, deleteFolder, moveBookmark, removeBookmark } = useBookmarks();
  const { history, addHistoryEntry, clearHistory, removeHistoryEntry } = useHistory();

  useEffect(() => { applyBowserTheme(getEffectiveTheme()); }, []);

  // Persist workspace when tabs change
  useEffect(() => { saveWorkspace(tabs); }, [tabs]);

  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  // Guard activeTab derivation against stale index
  const safeIndex = Math.min(activeTabIndex, tabs.length - 1);
  const activeTab = tabs[safeIndex];
  const currentPage = activeTab.currentIndex >= 0 ? activeTab.history[activeTab.currentIndex] : null;

  // ID-based tab updater — resolves index at update time, not call time
  const updateTabById = useCallback((tabId: string, updater: (tab: Tab) => Tab) => {
    setTabs(prev => prev.map(t => t.id === tabId ? updater(t) : t));
  }, []);

  const generate = useCallback(async (
    prompt: string,
    currentHtml: string | null,
    fallbackBreadcrumb: Breadcrumb,
    pushHistory: boolean = true,
    formState?: FormFieldState[],
    targetTabId?: string,
  ) => {
    const tabId = targetTabId || tabs[activeTabIndex]?.id;
    if (!tabId) return;

    const existingController = abortControllersRef.current.get(tabId);
    if (existingController) existingController.abort();
    const controller = new AbortController();
    abortControllersRef.current.set(tabId, controller);

    updateTabById(tabId, tab => ({
      ...tab,
      loading: true,
      loadingMessage: 'Streaming website from Gemini 3.1 Flash',
      generatedContent: '',
      tokenCount: null,
      groundingSources: [],
      searchEntryPointHtml: '',
      breadcrumb: { sitename: fallbackBreadcrumb.sitename, page: '' },
      ...(pushHistory ? { navigationId: tab.navigationId + 1 } : {}),
    }));

    let fullHtml = '';
    let pageTokenCount: TokenCount = { input: 0, output: 0 };
    let pageGroundingSources: GroundingSource[] = [];
    let pageSearchEntryPointHtml = '';
    let titleExtracted = false;

    try {
      const stream = streamPageGeneration(prompt, currentHtml, isGrounded, controller.signal, formState, window.innerWidth <= 768);

      for await (const chunk of stream) {
        if (controller.signal.aborted) break;

        if (chunk.startsWith('__TOKEN__')) {
          try {
            const tokenData = JSON.parse(chunk.replace('__TOKEN__', ''));
            updateTabById(tabId, tab => ({ ...tab, tokenCount: tokenData }));
          } catch { }
          continue;
        }

        if (chunk.startsWith('__META__')) {
          try {
            const meta = JSON.parse(chunk.replace('__META__', ''));
            pageTokenCount = meta.tokenCount;
            updateTabById(tabId, tab => ({ ...tab, tokenCount: pageTokenCount }));
            if (meta.groundingSources?.length) {
              pageGroundingSources = meta.groundingSources;
              updateTabById(tabId, tab => ({ ...tab, groundingSources: meta.groundingSources }));
            }
            if (meta.searchEntryPointHtml) {
              pageSearchEntryPointHtml = meta.searchEntryPointHtml;
              updateTabById(tabId, tab => ({ ...tab, searchEntryPointHtml: meta.searchEntryPointHtml }));
            }
          } catch { }
          continue;
        }
        fullHtml += chunk;

        const currentFullHtml = fullHtml;
        let extractedBreadcrumb: Breadcrumb | null = null;
        if (!titleExtracted && currentFullHtml.includes('</title>')) {
          extractedBreadcrumb = extractTitleFromHtml(currentFullHtml);
          if (extractedBreadcrumb) titleExtracted = true;
        }

        updateTabById(tabId, tab => ({
          ...tab,
          generatedContent: currentFullHtml,
          loadingMessage: 'Streaming website from Gemini 3.1 Flash',
          ...(extractedBreadcrumb ? { breadcrumb: extractedBreadcrumb } : {}),
        }));
      }

      if (controller.signal.aborted) return;

      const finalBreadcrumb = titleExtracted
        ? (extractTitleFromHtml(fullHtml) || fallbackBreadcrumb)
        : fallbackBreadcrumb;

      const newPage: Page = {
        html: fullHtml,
        breadcrumb: finalBreadcrumb,
        scrollPosition: 0,
        timestamp: Date.now(),
        tokenCount: pageTokenCount,
        prompt,
        contextHtml: currentHtml,
        isGrounded,
        groundingSources: pageGroundingSources,
        searchEntryPointHtml: pageSearchEntryPointHtml,
      };

      updateTabById(tabId, tab => {
        if (pushHistory) {
          const newHistory = [...tab.history.slice(0, tab.currentIndex + 1), newPage];
          return { ...tab, history: newHistory, currentIndex: newHistory.length - 1, breadcrumb: finalBreadcrumb, tokenCount: pageTokenCount };
        } else {
          const updated = [...tab.history];
          if (tab.currentIndex >= 0) updated[tab.currentIndex] = newPage;
          return { ...tab, history: updated, breadcrumb: finalBreadcrumb, tokenCount: pageTokenCount };
        }
      });

    } catch (e: any) {
      if (e?.name === 'AbortError' || controller.signal.aborted) return;
      console.error('Generation failed', e);
      updateTabById(tabId, tab => ({
        ...tab,
        breadcrumb: fallbackBreadcrumb,
        generatedContent: `<div class="p-10"><h1>Error</h1><p>Failed to generate page</p></div>`,
      }));
    } finally {
      if (abortControllersRef.current.get(tabId) === controller) {
        updateTabById(tabId, tab => ({ ...tab, loading: false, loadingMessage: '' }));
        abortControllersRef.current.delete(tabId);
      }
    }
  }, [isGrounded, activeTabIndex, tabs, updateTabById]);

  const handleStop = useCallback(() => {
    const tabId = activeTab.id;
    const controller = abortControllersRef.current.get(tabId);
    if (controller) { controller.abort(); abortControllersRef.current.delete(tabId); }
    updateTabById(tabId, tab => ({ ...tab, loading: false, loadingMessage: '' }));
  }, [activeTab, updateTabById]);

  const handleCreate = useCallback((prompt: string) => {
    addRecentPrompt(prompt);
    const fallback: Breadcrumb = { sitename: siteNameFromPrompt(prompt), page: 'Home' };
    generate(prompt, null, fallback, true);
  }, [generate]);

  const handleLinkClick = useCallback((href: string, linkText: string, formState?: FormFieldState[]) => {
    const prompt = `User clicked "${linkText}" (href: ${href})`;
    const isExternal = /^https?:\/\//i.test(href) || /^[a-z0-9-]+\.[a-z]{2,}/i.test(href);

    if (isExternal) {
      const domain = href.replace(/^https?:\/\//, '').split('/')[0];
      const sitename = domain.replace(/^www\./, '').split('.')[0];
      const capitalizedSitename = sitename.charAt(0).toUpperCase() + sitename.slice(1);
      const fallback: Breadcrumb = { sitename: capitalizedSitename, page: 'Home' };
      generate(prompt, null, fallback, true, formState);
    } else {
      const currentSitename = activeTab.breadcrumb.sitename || 'Site';
      const page = parsePageFromHref(href);
      const fallback: Breadcrumb = { sitename: currentSitename, page };
      if (currentPage) {
        generate(prompt, currentPage.html, fallback, true, formState);
      } else {
        generate(prompt, null, fallback, true, formState);
      }
    }
  }, [generate, currentPage, activeTab.breadcrumb]);

  const handleAction = useCallback((intent: string, payload?: string, formState?: FormFieldState[]) => {
    if (!currentPage) return;
    const actionPrompt = payload ? `${intent}: ${payload}` : intent;
    generate(actionPrompt, currentPage.html, activeTab.breadcrumb, false, formState);
  }, [generate, currentPage, activeTab.breadcrumb]);

  const handleOmnibarNavigate = useCallback((_type: 'create' | 'edit', prompt: string) => {
    const tab = tabs[activeTabIndex];
    const decision = parseOmniboxInput(prompt, tab.tabKind);

    if (decision.error) {
      return;
    }

    if (decision.kind === 'web') {
      updateTabById(tab.id, t => ({
        ...t, tabKind: 'web', browserUrl: decision.url,
        breadcrumb: { sitename: decision.url, page: '' }, navigationId: t.navigationId + 1
      }));
      addHistoryEntry({ url: decision.url, title: decision.url, tabKind: 'web' });
      return;
    }

    if (decision.kind === 'ai') {
      updateTabById(tab.id, t => ({ ...t, tabKind: 'ai' }));
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

    updateTabById(tab.id, t => ({
      ...t, tabKind: decision.kind, browserUrl: undefined,
      currentIndex: -1, history: [], loading: false, generatedContent: '',
      breadcrumb: { sitename: decision.kind, page: '' },
    }));
  }, [generate, currentPage, activeTab.breadcrumb, tabs, activeTabIndex, updateTabById, addHistoryEntry]);

  const handleBack = useCallback(() => {
    if (activeTab.tabKind === 'web') return;
    if (activeTab.currentIndex > 0) {
      updateTabById(activeTab.id, tab => {
        const newIndex = tab.currentIndex - 1;
        const page = tab.history[newIndex];
        return { ...tab, currentIndex: newIndex, navigationId: tab.navigationId + 1, generatedContent: page.html, breadcrumb: page.breadcrumb, tokenCount: page.tokenCount, groundingSources: page.groundingSources || [], searchEntryPointHtml: page.searchEntryPointHtml || '' };
      });
      const page = activeTab.history[activeTab.currentIndex - 1];
      if (page) setIsGrounded(page.isGrounded);
    }
  }, [activeTab, updateTabById]);

  const handleForward = useCallback(() => {
    if (activeTab.tabKind === 'web') return;
    if (activeTab.currentIndex < activeTab.history.length - 1) {
      updateTabById(activeTab.id, tab => {
        const newIndex = tab.currentIndex + 1;
        const page = tab.history[newIndex];
        return { ...tab, currentIndex: newIndex, navigationId: tab.navigationId + 1, generatedContent: page.html, breadcrumb: page.breadcrumb, tokenCount: page.tokenCount, groundingSources: page.groundingSources || [], searchEntryPointHtml: page.searchEntryPointHtml || '' };
      });
      const page = activeTab.history[activeTab.currentIndex + 1];
      if (page) setIsGrounded(page.isGrounded);
    }
  }, [activeTab, updateTabById]);

  const handleRefresh = useCallback(() => {
    if (activeTab.tabKind === 'web') {
      updateTabById(activeTab.id, t => ({ ...t, navigationId: t.navigationId + 1 }));
      return;
    }
    if (currentPage) {
      generate(currentPage.prompt, currentPage.contextHtml, currentPage.breadcrumb, false);
    }
  }, [currentPage, generate, activeTab, updateTabById]);

  const handleHome = useCallback(() => {
    const tabId = activeTab.id;
    const controller = abortControllersRef.current.get(tabId);
    if (controller) { controller.abort(); abortControllersRef.current.delete(tabId); }

    if (activeTab.tabKind === 'web') {
      updateTabById(tabId, tab => ({
        ...tab, browserUrl: 'https://www.google.com/webhp?igu=1',
        breadcrumb: { sitename: 'https://www.google.com/webhp?igu=1', page: '' }, navigationId: tab.navigationId + 1
      }));
      return;
    }

    updateTabById(tabId, tab => ({
      ...tab, tabKind: 'new-tab', currentIndex: -1, loading: false, loadingMessage: '',
      generatedContent: '', breadcrumb: { sitename: '', page: '' }, tokenCount: null,
      groundingSources: [], searchEntryPointHtml: '',
    }));
  }, [activeTab, updateTabById]);

  const handleNewTab = useCallback(() => {
    const newTab = createTab('new-tab');
    setTabs(prev => {
      const next = [...prev, newTab];
      queueMicrotask(() => setActiveTabIndex(next.length - 1));
      return next;
    });
  }, []);

  const handleNewAiTab = useCallback(() => {
    const newTab = createTab('new-tab');
    setTabs(prev => {
      const next = [...prev, newTab];
      queueMicrotask(() => setActiveTabIndex(next.length - 1));
      return next;
    });
  }, []);

  // Atomic close with recently-closed tracking
  const handleCloseTab = useCallback((index: number) => {
    const closingTab = tabs[index];
    const controller = abortControllersRef.current.get(closingTab.id);
    if (controller) { controller.abort(); abortControllersRef.current.delete(closingTab.id); }

    // Track closed tab for reopen
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

  // Reopen most recently closed tab
  const handleReopenClosedTab = useCallback(() => {
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
    } else if (closed.tabKind === 'ai' && closed.lastPrompt) {
      const newTab = createTab('new-tab');
      setTabs(prev => {
        const next = [...prev, newTab];
        queueMicrotask(() => setActiveTabIndex(next.length - 1));
        return next;
      });
      // Regenerate the AI page
      setTimeout(() => {
        updateTabById(newTab.id, t => ({ ...t, tabKind: 'ai' }));
        const prompt = closed.lastPrompt!;
        const fallback: Breadcrumb = { sitename: siteNameFromPrompt(prompt), page: 'Home' };
        generate(prompt, null, fallback, true, undefined, newTab.id);
      }, 100);
    } else {
      // System page or unknown — open as system page or new tab
      const kind = (['history', 'bookmarks', 'settings'] as TabKind[]).includes(closed.tabKind) ? closed.tabKind : 'new-tab';
      const newTab = createTab(kind);
      newTab.breadcrumb = { sitename: kind, page: '' };
      setTabs(prev => {
        const next = [...prev, newTab];
        queueMicrotask(() => setActiveTabIndex(next.length - 1));
        return next;
      });
    }
  }, [generate, updateTabById]);

  // Tab rename
  const handleRenameTab = useCallback((tabId: string, newTitle: string) => {
    updateTabById(tabId, tab => ({ ...tab, customTitle: newTitle }));
  }, [updateTabById]);

  // Tab pin toggle
  const handlePinTab = useCallback((tabId: string) => {
    updateTabById(tabId, tab => ({ ...tab, pinned: !tab.pinned }));
  }, [updateTabById]);

  const handleSwitchTab = useCallback((index: number) => {
    setActiveTabIndex(index);
  }, []);

  const handleToggleBrowserMode = useCallback(() => {
    updateTabById(activeTab.id, tab => {
      const newKind = tab.tabKind === 'web' ? 'ai' : 'web';
      return {
        ...tab, tabKind: newKind,
        browserUrl: newKind === 'web' ? 'https://www.google.com/webhp?igu=1' : undefined,
        currentIndex: -1, history: [], loading: false, generatedContent: '',
        breadcrumb: { sitename: '', page: '' },
      };
    });
  }, [activeTab, updateTabById]);

  const handleToggleBookmark = useCallback(() => {
    const tab = tabs[activeTabIndex];
    let url = '';
    let title = '';

    if (tab.tabKind === 'web') {
      url = tab.browserUrl || '';
      title = tab.breadcrumb.sitename || url;
    } else {
      const page = tab.history[tab.currentIndex];
      if (!page) return;
      url = page.prompt;
      title = breadcrumbToDisplay(page.breadcrumb);
    }

    if (!url) return;
    toggleBookmark(url, title, tab.tabKind);
  }, [tabs, activeTabIndex, toggleBookmark]);

  const navigateToSystemPage = useCallback((kind: TabKind) => {
    updateTabById(activeTab.id, t => ({
      ...t, tabKind: kind, browserUrl: undefined,
      currentIndex: -1, history: [], loading: false, generatedContent: '',
      breadcrumb: { sitename: kind, page: '' },
    }));
  }, [activeTab, updateTabById]);

  const navigateToBookmarkUrl = useCallback((url: string, tabKind: TabKind) => {
    if (tabKind === 'web') {
      updateTabById(activeTab.id, tab => ({
        ...tab, tabKind: 'web', browserUrl: url, currentIndex: -1, history: [],
        loading: false, generatedContent: '', breadcrumb: { sitename: url, page: '' },
        navigationId: tab.navigationId + 1
      }));
    } else {
      updateTabById(activeTab.id, tab => ({ ...tab, tabKind: 'ai', browserUrl: undefined }));
      const fallback: Breadcrumb = { sitename: url, page: 'Home' };
      generate(url, null, fallback, true);
    }
  }, [activeTab, updateTabById, generate]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      if (e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      } else if (e.key === 'l') {
        e.preventDefault();
        window.dispatchEvent(new Event('bowser:focus-omnibar'));
      } else if (e.key === 't' && !e.shiftKey) {
        e.preventDefault();
        handleNewTab();
      } else if (e.key === 'T' && e.shiftKey) {
        e.preventDefault();
        handleReopenClosedTab();
      } else if (e.key === 'w') {
        if (tabs.length > 1) {
          e.preventDefault();
          handleCloseTab(activeTabIndex);
        }
      } else if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const idx = e.key === '9' ? tabs.length - 1 : Math.min(parseInt(e.key) - 1, tabs.length - 1);
        handleSwitchTab(idx);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tabs, activeTabIndex, handleNewTab, handleReopenClosedTab, handleCloseTab, handleSwitchTab]);

  const isMac = /Mac/i.test(navigator.userAgent);
  const modLabel = isMac ? '⌘' : 'Ctrl+';

  const commandActions = [
    { id: 'new-tab', label: 'New Tab', icon: 'add', shortcut: `${modLabel}T`, section: 'Tabs', onExecute: handleNewTab },
    { id: 'reopen-tab', label: 'Reopen Closed Tab', icon: 'restore', shortcut: `${modLabel}Shift+T`, section: 'Tabs', onExecute: handleReopenClosedTab },
    { id: 'close-tab', label: 'Close Tab', icon: 'close', shortcut: `${modLabel}W`, section: 'Tabs', onExecute: () => { if (tabs.length > 1) handleCloseTab(activeTabIndex); } },
    { id: 'pin-tab', label: activeTab.pinned ? 'Unpin Tab' : 'Pin Tab', icon: activeTab.pinned ? 'keep_off' : 'keep', section: 'Tabs', onExecute: () => handlePinTab(activeTab.id) },
    { id: 'focus-bar', label: 'Focus Address Bar', icon: 'search', shortcut: `${modLabel}L`, section: 'Navigation', onExecute: () => window.dispatchEvent(new Event('bowser:focus-omnibar')) },
    { id: 'open-history', label: 'Open History', icon: 'history', section: 'Navigation', onExecute: () => navigateToSystemPage('history') },
    { id: 'open-bookmarks', label: 'Open Bookmarks', icon: 'bookmarks', section: 'Navigation', onExecute: () => navigateToSystemPage('bookmarks') },
    { id: 'open-settings', label: 'Open Settings', icon: 'settings', section: 'Navigation', onExecute: () => navigateToSystemPage('settings') },
    { id: 'toggle-panel', label: sidePanelOpen ? 'Close Side Panel' : 'Open Side Panel', icon: 'right_panel_open', section: 'Actions', onExecute: () => setSidePanelOpen(prev => !prev) },
    { id: 'toggle-mode', label: 'Toggle AI/Web Mode', icon: 'swap_horiz', section: 'Actions', onExecute: handleToggleBrowserMode },
    { id: 'toggle-grounding', label: 'Toggle Real-time Browsing', icon: 'language', section: 'Actions', onExecute: () => setIsGrounded(prev => !prev) },
  ];

  const isNewTab = activeTab.tabKind === 'new-tab' || (activeTab.currentIndex === -1 && !activeTab.loading && activeTab.tabKind !== 'web');
  const displayContent = activeTab.loading ? activeTab.generatedContent : (currentPage?.html || '');

  // Side panel content — only available for AI pages
  const sidePanelHtml = activeTab.tabKind === 'ai' && currentPage ? currentPage.html : null;

  return (
    <>
      <BrowserShell
        breadcrumb={activeTab.breadcrumb}
        isLoading={activeTab.loading}
        loadingMessage={activeTab.loadingMessage}
        onNavigate={handleOmnibarNavigate}
        onBack={handleBack}
        onForward={handleForward}
        onRefresh={handleRefresh}
        onStop={handleStop}
        onHome={handleHome}
        canGoBack={activeTab.tabKind === 'web' ? false : activeTab.currentIndex > 0}
        canGoForward={activeTab.tabKind === 'web' ? false : activeTab.currentIndex < activeTab.history.length - 1}
        groundingSources={activeTab.groundingSources}
        searchEntryPointHtml={activeTab.searchEntryPointHtml}
        tabs={tabs}
        activeTabIndex={safeIndex}
        onNewTab={handleNewTab}
        onCloseTab={handleCloseTab}
        onSwitchTab={handleSwitchTab}
        isGrounded={isGrounded}
        onToggleGrounding={() => setIsGrounded(prev => !prev)}
        isBrowserMode={activeTab.tabKind === 'web'}
        onToggleBrowserMode={handleToggleBrowserMode}
        tokenCount={activeTab.tokenCount}
        isBookmarked={isBookmarked(activeTab.tabKind === 'web' ? (activeTab.browserUrl || '') : (currentPage?.prompt || ''))}
        onToggleBookmark={handleToggleBookmark}
        canBookmark={!isNewTab && activeTab.tabKind !== 'history' && activeTab.tabKind !== 'bookmarks' && activeTab.tabKind !== 'settings'}
        onRenameTab={handleRenameTab}
        onPinTab={handlePinTab}
        sidePanelOpen={sidePanelOpen}
        onToggleSidePanel={() => setSidePanelOpen(prev => !prev)}
        sidePanel={
          <AiSidePanel
            isOpen={sidePanelOpen}
            onClose={() => setSidePanelOpen(false)}
            pageHtml={sidePanelHtml}
            tabKind={activeTab.tabKind}
          />
        }
      >
        {isNewTab ? (
          <NewTab
            onCreatePage={(prompt) => {
              updateTabById(activeTab.id, t => ({ ...t, tabKind: 'ai' }));
              handleCreate(prompt);
            }}
            isGrounded={isGrounded}
            onToggleGrounding={() => setIsGrounded(prev => !prev)}
            bookmarks={bookmarks}
            onNavigateToBookmark={navigateToBookmarkUrl}
            onOpenBookmarks={() => navigateToSystemPage('bookmarks')}
            history={history}
          />
        ) : activeTab.tabKind === 'history' ? (
          <HistoryTab
            history={history}
            onClearHistory={clearHistory}
            onRemoveEntry={removeHistoryEntry}
            onNavigate={(url: string, tabKind: TabKind) => {
              if (tabKind === 'web') {
                handleOmnibarNavigate('create', url);
              } else {
                updateTabById(activeTab.id, t => ({ ...t, tabKind: 'ai' }));
                handleCreate(url);
              }
            }}
          />
        ) : activeTab.tabKind === 'bookmarks' ? (
          <BookmarksTab
            bookmarks={bookmarks}
            folders={bookmarkFolders}
            onCreateFolder={createFolder}
            onRenameFolder={renameFolder}
            onDeleteFolder={deleteFolder}
            onMoveBookmark={moveBookmark}
            onRemoveBookmark={removeBookmark}
            onNavigate={navigateToBookmarkUrl}
          />
        ) : activeTab.tabKind === 'settings' ? (
          <SettingsTab onClearHistory={clearHistory} />
        ) : activeTab.tabKind === 'web' ? (
          <iframe
            key={activeTab.navigationId}
            src={activeTab.browserUrl}
            className="w-full h-full border-none bg-white"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            title="Web content"
          />
        ) : (
          <Sandbox
            key={activeTab.navigationId}
            htmlContent={displayContent}
            onNavigate={handleLinkClick}
            onAction={handleAction}
          />
        )}
      </BrowserShell>
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        actions={commandActions}
      />
    </>
  );
};

export default BowserApp;

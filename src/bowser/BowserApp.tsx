import React, { useState, useCallback, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { BrowserShell } from './components/BrowserShell';
import { Sandbox } from './components/Sandbox';
import { NewTab } from './components/NewTab';
import { CommandPalette } from './components/CommandPalette';
import { OnboardingModal, hasSeenOnboarding } from './components/OnboardingModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ShortcutsOverlay } from './components/ShortcutsOverlay';
import { ProgressBar } from './components/ProgressBar';
import { applyBowserTheme, getEffectiveTheme } from './utils/theme';
import { Breadcrumb, FormFieldState, TabKind, createTab } from './types';
import { WebProxy } from './components/WebProxy';
import { siteNameFromPrompt, parsePageFromHref, breadcrumbToDisplay } from './utils/urlHelpers';
import { useBookmarks } from './store/bookmarks';
import { useHistory } from './store/history';
import { useTabManager } from './hooks/useTabManager';
import { useAIGenerate } from './hooks/useAIGenerate';
import { useOmnibox } from './hooks/useOmnibox';
import { getTabLimit, applyFontScale, getFontSize } from './hooks/useBowserSettings';
import { useSwipeGesture } from './hooks/useSwipeGesture';

const HistoryTab = lazy(() => import('./components/HistoryTab').then(m => ({ default: m.HistoryTab })));
const BookmarksTab = lazy(() => import('./components/BookmarksTab').then(m => ({ default: m.BookmarksTab })));
const SettingsTab = lazy(() => import('./components/SettingsTab').then(m => ({ default: m.SettingsTab })));
const AiSidePanel = lazy(() => import('./components/AiSidePanel').then(m => ({ default: m.AiSidePanel })));

const BowserApp: React.FC = () => {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !hasSeenOnboarding());
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);

  const { bookmarks, bookmarkFolders, toggleBookmark, isBookmarked, createFolder, renameFolder, deleteFolder, moveBookmark, removeBookmark } = useBookmarks();
  const { history, addHistoryEntry, clearHistory, removeHistoryEntry } = useHistory();

  const {
    tabs, activeTabIndex, safeIndex, activeTab, currentPage,
    updateTabById, handleNewTab, handleCloseTab, handleSwitchTab,
    handleRenameTab, handlePinTab, handleReopenClosedTab, navigateToSystemPage, handleReorderTabs,
  } = useTabManager();

  const { generate, handleStop, handleCreate, abortControllersRef } = useAIGenerate({
    activeTab, updateTabById,
  });

  const { handleOmnibarNavigate } = useOmnibox({
    activeTab, currentPage, updateTabById, generate, addHistoryEntry,
  });

  useEffect(() => {
    applyBowserTheme(getEffectiveTheme());
    applyFontScale(getFontSize());
  }, []);

  // Auto-fullscreen on first user interaction
  useEffect(() => {
    // Skip in iframes (Lovable preview)
    const isInIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
    if (isInIframe) return;

    const trigger = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => { /* browser denied */ });
      }
      document.removeEventListener('click', trigger);
      document.removeEventListener('keydown', trigger);
    };

    document.addEventListener('click', trigger, { once: true });
    document.addEventListener('keydown', trigger, { once: true });
    return () => {
      document.removeEventListener('click', trigger);
      document.removeEventListener('keydown', trigger);
    };
  }, []);


  // Swipe to switch tabs on mobile
  useSwipeGesture(viewportRef, {
    onSwipeLeft: () => {
      if (safeIndex < tabs.length - 1) handleSwitchTab(safeIndex + 1);
    },
    onSwipeRight: () => {
      if (safeIndex > 0) handleSwitchTab(safeIndex - 1);
    },
    enabled: window.innerWidth < 768,
  });

  const handleLinkClick = useCallback((href: string, linkText: string, formState?: FormFieldState[]) => {
    if (!activeTab) return;
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
      generate(prompt, currentPage?.html || null, fallback, true, formState);
    }
  }, [generate, currentPage, activeTab]);

  const handleAction = useCallback((intent: string, payload?: string, formState?: FormFieldState[]) => {
    if (!currentPage || !activeTab) return;
    const actionPrompt = payload ? `${intent}: ${payload}` : intent;
    generate(actionPrompt, currentPage.html, activeTab.breadcrumb, false, formState);
  }, [generate, currentPage, activeTab]);

  const handleBack = useCallback(() => {
    if (!activeTab) return;
    if (activeTab.tabKind === 'web') {
      if (activeTab.webHistoryIndex > 0) {
        updateTabById(activeTab.id, tab => {
          const newIndex = tab.webHistoryIndex - 1;
          const url = tab.webHistory[newIndex];
          return { ...tab, webHistoryIndex: newIndex, browserUrl: url, breadcrumb: { sitename: url, page: '' }, navigationId: tab.navigationId + 1 };
        });
      }
      return;
    }
    if (activeTab.currentIndex > 0) {
      updateTabById(activeTab.id, tab => {
        const newIndex = tab.currentIndex - 1;
        const page = tab.history[newIndex];
        if (!page) return tab;
        return { ...tab, currentIndex: newIndex, navigationId: tab.navigationId + 1, generatedContent: page.html, breadcrumb: page.breadcrumb, tokenCount: page.tokenCount, groundingSources: page.groundingSources || [], searchEntryPointHtml: page.searchEntryPointHtml || '' };
      });
    }
  }, [activeTab, updateTabById]);

  const handleForward = useCallback(() => {
    if (!activeTab) return;
    if (activeTab.tabKind === 'web') {
      if (activeTab.webHistoryIndex < activeTab.webHistory.length - 1) {
        updateTabById(activeTab.id, tab => {
          const newIndex = tab.webHistoryIndex + 1;
          const url = tab.webHistory[newIndex];
          return { ...tab, webHistoryIndex: newIndex, browserUrl: url, breadcrumb: { sitename: url, page: '' }, navigationId: tab.navigationId + 1 };
        });
      }
      return;
    }
    if (activeTab.currentIndex < activeTab.history.length - 1) {
      updateTabById(activeTab.id, tab => {
        const newIndex = tab.currentIndex + 1;
        const page = tab.history[newIndex];
        if (!page) return tab;
        return { ...tab, currentIndex: newIndex, navigationId: tab.navigationId + 1, generatedContent: page.html, breadcrumb: page.breadcrumb, tokenCount: page.tokenCount, groundingSources: page.groundingSources || [], searchEntryPointHtml: page.searchEntryPointHtml || '' };
      });
    }
  }, [activeTab, updateTabById]);

  const handleRefresh = useCallback(() => {
    if (!activeTab) return;
    if (activeTab.tabKind === 'web') {
      updateTabById(activeTab.id, t => ({ ...t, navigationId: t.navigationId + 1 }));
      return;
    }
    if (currentPage) {
      generate(currentPage.prompt, currentPage.contextHtml, currentPage.breadcrumb, false);
    }
  }, [currentPage, generate, activeTab, updateTabById]);

  const handleHome = useCallback(() => {
    if (!activeTab) return;
    const tabId = activeTab.id;
    const controller = abortControllersRef.current.get(tabId);
    if (controller) { controller.abort(); abortControllersRef.current.delete(tabId); }

    updateTabById(tabId, tab => ({
      ...tab, tabKind: 'new-tab', currentIndex: -1, loading: false, loadingMessage: '',
      generatedContent: '', breadcrumb: { sitename: '', page: '' }, tokenCount: null,
      groundingSources: [], searchEntryPointHtml: '', browserUrl: undefined,
      webHistory: [], webHistoryIndex: -1,
    }));
  }, [activeTab, updateTabById, abortControllersRef]);

  const handleToggleBrowserMode = useCallback(() => {
    if (!activeTab) return;
    updateTabById(activeTab.id, tab => {
      const newKind = tab.tabKind === 'web' ? 'ai' : 'web';
      return {
        ...tab, tabKind: newKind,
        browserUrl: undefined,
        currentIndex: -1, history: [], loading: false, generatedContent: '',
        breadcrumb: { sitename: '', page: '' },
        webHistory: [], webHistoryIndex: -1,
      };
    });
  }, [activeTab, updateTabById]);

  const handleToggleBookmark = useCallback(() => {
    if (!activeTab) return;
    let url = '';
    let title = '';

    if (activeTab.tabKind === 'web') {
      url = activeTab.browserUrl || '';
      title = activeTab.breadcrumb.sitename || url;
    } else {
      const page = activeTab.history[activeTab.currentIndex];
      if (!page) return;
      url = page.prompt;
      title = breadcrumbToDisplay(page.breadcrumb);
    }

    if (!url) return;
    toggleBookmark(url, title, activeTab.tabKind);
  }, [activeTab, toggleBookmark]);

  const navigateToBookmarkUrl = useCallback((url: string, tabKind: TabKind) => {
    if (!activeTab) return;
    if (tabKind === 'web') {
      updateTabById(activeTab.id, tab => {
        const newWebHistory = [...tab.webHistory.slice(0, tab.webHistoryIndex + 1), url];
        return {
          ...tab, tabKind: 'web', browserUrl: url, currentIndex: -1, history: [],
          loading: false, generatedContent: '', breadcrumb: { sitename: url, page: '' },
          navigationId: tab.navigationId + 1,
          webHistory: newWebHistory, webHistoryIndex: newWebHistory.length - 1,
        };
      });
    } else {
      updateTabById(activeTab.id, tab => ({ ...tab, tabKind: 'ai', browserUrl: undefined }));
      const fallback: Breadcrumb = { sitename: url, page: 'Home' };
      generate(url, null, fallback, true);
    }
  }, [activeTab, updateTabById, generate]);

  // Go-home event from WebProxy 404 page
  useEffect(() => {
    const handler = () => handleHome();
    window.addEventListener('bowser:go-home', handler);
    return () => window.removeEventListener('bowser:go-home', handler);
  }, [handleHome]);

  // Share current page as data: URL
  const handleShare = useCallback(() => {
    if (!currentPage?.html) return;
    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(currentPage.html)}`;
    navigator.clipboard.writeText(dataUrl).then(() => {
      // Brief visual feedback via document title
      const orig = document.title;
      document.title = '✓ Copied!';
      setTimeout(() => { document.title = orig; }, 1500);
    });
  }, [currentPage]);

  // Download current page as .html
  const handleDownload = useCallback(() => {
    if (!currentPage?.html) return;
    const blob = new Blob([currentPage.html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab?.breadcrumb.sitename || 'page'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [currentPage, activeTab]);

  // Duplicate tab
  const handleDuplicateTab = useCallback((tab: Tab) => {
    const newTab = createTab(tab.tabKind);
    newTab.breadcrumb = { ...tab.breadcrumb };
    newTab.history = [...tab.history];
    newTab.currentIndex = tab.currentIndex;
    newTab.generatedContent = tab.generatedContent;
    newTab.tokenCount = tab.tokenCount;
    newTab.browserUrl = tab.browserUrl;
    newTab.webHistory = [...tab.webHistory];
    newTab.webHistoryIndex = tab.webHistoryIndex;
    setTabs(prev => [...prev, newTab]);
  }, [setTabs]);

  // Close other tabs
  const handleCloseOtherTabs = useCallback((keepIndex: number) => {
    setTabs(prev => {
      const kept = prev.filter((t, i) => i === keepIndex || t.pinned);
      return kept.length > 0 ? kept : [createTab('new-tab')];
    });
    setActiveTabIndex(0);
  }, [setTabs, setActiveTabIndex]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape closes side panel or shortcuts
      if (e.key === 'Escape') {
        if (shortcutsOpen) { setShortcutsOpen(false); return; }
        if (sidePanelOpen) { setSidePanelOpen(false); return; }
        return;
      }

      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      if (e.key === '/') {
        e.preventDefault();
        setShortcutsOpen(prev => !prev);
      } else if (e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      } else if (e.key === 'l') {
        e.preventDefault();
        window.dispatchEvent(new Event('bowser:focus-omnibar'));
      } else if (e.key === 'A' && e.shiftKey) {
        e.preventDefault();
        setSidePanelOpen(prev => !prev);
      } else if (e.key === 't' && !e.shiftKey) {
        e.preventDefault();
        const limit = getTabLimit();
        handleNewTab(limit || undefined);
      } else if (e.key === 'T' && e.shiftKey) {
        e.preventDefault();
        handleReopenClosedTab(generate);
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
  }, [tabs, activeTabIndex, handleNewTab, handleReopenClosedTab, handleCloseTab, handleSwitchTab, generate, sidePanelOpen, shortcutsOpen]);

  const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.userAgent);
  const modLabel = isMac ? '⌘' : 'Ctrl+';

  const commandActions = useMemo(() => [
    { id: 'new-tab', label: 'New Tab', icon: 'add', shortcut: `${modLabel}T`, section: 'Tabs', onExecute: () => handleNewTab(getTabLimit() || undefined) },
    { id: 'reopen-tab', label: 'Reopen Closed Tab', icon: 'restore', shortcut: `${modLabel}Shift+T`, section: 'Tabs', onExecute: () => handleReopenClosedTab(generate) },
    { id: 'close-tab', label: 'Close Tab', icon: 'close', shortcut: `${modLabel}W`, section: 'Tabs', onExecute: () => { if (tabs.length > 1) handleCloseTab(activeTabIndex); } },
    { id: 'pin-tab', label: activeTab?.pinned ? 'Unpin Tab' : 'Pin Tab', icon: activeTab?.pinned ? 'keep_off' : 'keep', section: 'Tabs', onExecute: () => activeTab && handlePinTab(activeTab.id) },
    { id: 'focus-bar', label: 'Focus Address Bar', icon: 'search', shortcut: `${modLabel}L`, section: 'Navigation', onExecute: () => window.dispatchEvent(new Event('bowser:focus-omnibar')) },
    { id: 'open-history', label: 'History', icon: 'history', section: 'Navigation', onExecute: () => navigateToSystemPage('history') },
    { id: 'open-bookmarks', label: 'Bookmarks', icon: 'bookmarks', section: 'Navigation', onExecute: () => navigateToSystemPage('bookmarks') },
    { id: 'open-settings', label: 'Settings', icon: 'settings', section: 'Navigation', onExecute: () => navigateToSystemPage('settings') },
    { id: 'toggle-panel', label: sidePanelOpen ? 'Close Side Panel' : 'Open Side Panel', icon: 'right_panel_open', section: 'Actions', onExecute: () => setSidePanelOpen(prev => !prev) },
    { id: 'toggle-mode', label: 'Toggle Create / Web Mode', icon: 'swap_horiz', section: 'Actions', onExecute: handleToggleBrowserMode },
    
  ], [modLabel, handleNewTab, handleReopenClosedTab, tabs.length, activeTabIndex, handleCloseTab, activeTab, handlePinTab, sidePanelOpen, handleToggleBrowserMode, navigateToSystemPage, generate]);

  const isNewTab = activeTab?.tabKind === 'new-tab' || (activeTab?.currentIndex === -1 && !activeTab?.loading && activeTab?.tabKind !== 'web');
  const displayContent = activeTab?.loading ? activeTab.generatedContent : (currentPage?.html || '');
  const sidePanelHtml = activeTab?.tabKind === 'ai' && currentPage ? currentPage.html : null;

  if (!activeTab) return null;

  return (
    <>
      {/* Skip to content */}
      <a href="#bowser-viewport" className="sr-only focus:not-sr-only focus:absolute focus:z-[10000] focus:p-2 focus:bg-[var(--bw-accent)] focus:text-white focus:rounded">
        Skip to content
      </a>
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
        canGoBack={activeTab.tabKind === 'web' ? activeTab.webHistoryIndex > 0 : activeTab.currentIndex > 0}
        canGoForward={activeTab.tabKind === 'web' ? activeTab.webHistoryIndex < activeTab.webHistory.length - 1 : activeTab.currentIndex < activeTab.history.length - 1}
        tabs={tabs}
        activeTabIndex={safeIndex}
        onNewTab={() => handleNewTab(getTabLimit() || undefined)}
        onCloseTab={handleCloseTab}
        onSwitchTab={handleSwitchTab}
        isBrowserMode={activeTab.tabKind === 'web'}
        onToggleBrowserMode={handleToggleBrowserMode}
        tokenCount={activeTab.tokenCount}
        isBookmarked={isBookmarked(activeTab.tabKind === 'web' ? (activeTab.browserUrl || '') : (currentPage?.prompt || ''))}
        onToggleBookmark={handleToggleBookmark}
        canBookmark={!isNewTab && activeTab.tabKind !== 'history' && activeTab.tabKind !== 'bookmarks' && activeTab.tabKind !== 'settings'}
        onRenameTab={handleRenameTab}
        onPinTab={handlePinTab}
        onReorderTabs={handleReorderTabs}
        sidePanelOpen={sidePanelOpen}
        onToggleSidePanel={() => setSidePanelOpen(prev => !prev)}
        sidePanel={
          <Suspense fallback={<div className="w-full h-full" style={{ background: 'var(--bw-bg-app)' }} />}>
            <AiSidePanel
              isOpen={sidePanelOpen}
              onClose={() => setSidePanelOpen(false)}
              pageHtml={sidePanelHtml}
              tabKind={activeTab.tabKind}
              webTabUrl={activeTab.tabKind === 'web' ? activeTab.browserUrl : undefined}
              webTabTitle={activeTab.tabKind === 'web' ? activeTab.breadcrumb.sitename : undefined}
            />
          </Suspense>
        }
        viewportRef={viewportRef}
        webHistoryPosition={activeTab.tabKind === 'web' && activeTab.webHistory.length > 0 ? activeTab.webHistoryIndex + 1 : undefined}
        webHistoryTotal={activeTab.tabKind === 'web' && activeTab.webHistory.length > 0 ? activeTab.webHistory.length : undefined}
        webHistoryUrls={activeTab.tabKind === 'web' && activeTab.webHistory.length > 0 ? activeTab.webHistory : undefined}
        onWebHistoryNavigate={activeTab.tabKind === 'web' ? (index: number) => {
          updateTabById(activeTab.id, tab => {
            const url = tab.webHistory[index];
            if (!url) return tab;
            return { ...tab, webHistoryIndex: index, browserUrl: url, breadcrumb: { sitename: url, page: '' }, navigationId: tab.navigationId + 1 };
          });
        } : undefined}
      >
        <ErrorBoundary fallbackLevel="tab" onReset={handleHome}>
        {isNewTab ? (
          <NewTab
            onCreatePage={(prompt) => {
              updateTabById(activeTab.id, t => ({ ...t, tabKind: 'ai' }));
              handleCreate(prompt);
            }}
            onWebNavigate={(query) => {
              updateTabById(activeTab.id, t => ({ ...t, tabKind: 'web' }));
              handleOmnibarNavigate('create', query);
            }}
            bookmarks={bookmarks}
            onNavigateToBookmark={navigateToBookmarkUrl}
            onOpenBookmarks={() => navigateToSystemPage('bookmarks')}
            history={history}
            onShowOnboarding={() => setShowOnboarding(true)}
            onOpenSettings={() => navigateToSystemPage('settings')}
          />
        ) : activeTab.tabKind === 'history' ? (
          <Suspense fallback={<div className="w-full h-full" style={{ background: 'var(--bw-bg-app)' }} />}>
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
          </Suspense>
        ) : activeTab.tabKind === 'bookmarks' ? (
          <Suspense fallback={<div className="w-full h-full" style={{ background: 'var(--bw-bg-app)' }} />}>
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
          </Suspense>
        ) : activeTab.tabKind === 'settings' ? (
          <Suspense fallback={<div className="w-full h-full" style={{ background: 'var(--bw-bg-app)' }} />}>
            <SettingsTab
              onClearHistory={clearHistory}
              onClearBookmarks={() => {
                bookmarks.forEach(b => removeBookmark(b.url));
              }}
              onShowOnboarding={() => setShowOnboarding(true)}
            />
          </Suspense>
        ) : activeTab.tabKind === 'web' ? (
          <WebProxy
            key={activeTab.navigationId}
            url={activeTab.browserUrl || ''}
            navigationId={activeTab.navigationId}
            onNavigate={(newUrl: string) => {
              updateTabById(activeTab.id, tab => {
                const newWebHistory = [...tab.webHistory.slice(0, tab.webHistoryIndex + 1), newUrl];
                return {
                  ...tab, browserUrl: newUrl,
                  breadcrumb: { sitename: newUrl, page: '' },
                  navigationId: tab.navigationId + 1,
                  webHistory: newWebHistory,
                  webHistoryIndex: newWebHistory.length - 1,
                };
              });
            }}
          />
        ) : (
          <Sandbox
            key={activeTab.navigationId}
            htmlContent={displayContent}
            onNavigate={handleLinkClick}
            onAction={handleAction}
          />
        )}
        </ErrorBoundary>
      </BrowserShell>
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        actions={commandActions}
      />
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />
    </>
  );
};

export default BowserApp;

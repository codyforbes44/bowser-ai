import React, { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import { AddressBar } from './AddressBar';
import { Breadcrumb, Tab, TokenCount } from '../types';

const AnimatedNumber: React.FC<{ value: number; prefix?: string; prefixVisible?: boolean; animate?: boolean }> = React.memo(({ value, prefix, prefixVisible = true, animate = true }) => {
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef<number>(0);
  const currentRef = useRef(0);

  useEffect(() => {
    if (!animate) {
      cancelAnimationFrame(rafRef.current);
      currentRef.current = value;
      setDisplayed(value);
      return;
    }
    const target = value;
    const step = () => {
      const current = currentRef.current;
      const diff = target - current;
      if (Math.abs(diff) < 1) {
        currentRef.current = target;
        setDisplayed(target);
        return;
      }
      currentRef.current = current + diff * 0.15;
      setDisplayed(Math.round(currentRef.current));
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, animate]);

  return (
    <span className="animated-number">
      {prefix && <span className="animated-prefix" style={{ opacity: prefixVisible ? 0.7 : 0 }}>{prefix}</span>}
      {displayed.toLocaleString()}
    </span>
  );
});

const ElapsedTimer: React.FC<{ isActive: boolean }> = React.memo(({ isActive }) => {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (isActive) {
      startRef.current = Date.now();
      const tick = () => {
        setElapsed((Date.now() - startRef.current) / 1000);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafRef.current);
    } else if (startRef.current > 0) {
      setElapsed((Date.now() - startRef.current) / 1000);
    }
  }, [isActive]);

  return <span>{elapsed.toFixed(2)}s</span>;
});

interface BrowserShellProps {
  children: React.ReactNode;
  breadcrumb: Breadcrumb;
  isLoading: boolean;
  loadingMessage: string;
  onNavigate: (type: 'create' | 'edit', prompt: string) => void;
  onBack: () => void;
  onForward: () => void;
  onRefresh: () => void;
  onStop: () => void;
  onHome: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  tabs: Tab[];
  activeTabIndex: number;
  onNewTab: () => void;
  onCloseTab: (index: number) => void;
  onSwitchTab: (index: number) => void;
  isBrowserMode: boolean;
  onToggleBrowserMode: () => void;
  tokenCount: TokenCount | null;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  canBookmark: boolean;
  onRenameTab?: (tabId: string, newTitle: string) => void;
  onPinTab?: (tabId: string) => void;
  onReorderTabs?: (fromIndex: number, toIndex: number) => void;
  sidePanelOpen?: boolean;
  onToggleSidePanel?: () => void;
  sidePanel?: React.ReactNode;
  viewportRef?: React.RefObject<HTMLDivElement | null>;
  webHistoryPosition?: number;
  webHistoryTotal?: number;
  webHistoryUrls?: string[];
  onWebHistoryNavigate?: (index: number) => void;
  onOpenSettings?: () => void;
  onOpenHistory?: () => void;
  onOpenBookmarks?: () => void;
}

export const BrowserShell: React.FC<BrowserShellProps> = ({
  children,
  breadcrumb,
  isLoading,
  loadingMessage,
  onNavigate,
  onBack,
  onForward,
  onRefresh,
  onStop,
  onHome,
  canGoBack,
  canGoForward,
  tabs,
  activeTabIndex,
  onNewTab,
  onCloseTab,
  onSwitchTab,
  isBrowserMode,
  onToggleBrowserMode,
  tokenCount,
  isBookmarked,
  onToggleBookmark,
  canBookmark,
  onRenameTab,
  onPinTab,
  onReorderTabs,
  sidePanelOpen,
  onToggleSidePanel,
  sidePanel,
  viewportRef,
  webHistoryPosition,
  webHistoryTotal,
  webHistoryUrls,
  onWebHistoryNavigate,
}) => {
  const shellRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  const handleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      shellRef.current?.requestFullscreen?.();
    }
  }, []);

  const getTabTitle = (tab: Tab) => {
    if (tab.customTitle) return tab.customTitle;
    if (tab.loading) return 'Generating…';
    if (tab.tabKind === 'web') {
      try {
        const url = new URL(tab.browserUrl || '');
        return url.hostname;
      } catch {
        return tab.browserUrl || 'Browser';
      }
    }
    if (tab.tabKind === 'history') return 'History';
    if (tab.tabKind === 'bookmarks') return 'Bookmarks';
    if (tab.tabKind === 'settings') return 'Settings';
    const bc = tab.breadcrumb;
    return bc.page || bc.sitename || 'New Tab';
  };

  const getTabIcon = (tab: Tab): string => {
    switch (tab.tabKind) {
      case 'web': return 'public';
      case 'ai': return 'auto_awesome';
      case 'agent': return 'smart_toy';
      case 'history': return 'history';
      case 'bookmarks': return 'bookmarks';
      case 'settings': return 'settings';
      default: return 'add';
    }
  };

  const getTabAccentClass = (tab: Tab): string => {
    switch (tab.tabKind) {
      case 'ai': return 'tab-accent-ai';
      case 'agent': return 'tab-accent-ai';
      case 'web': return 'tab-accent-web';
      default: return 'tab-accent-system';
    }
  };

  const startRename = (tab: Tab) => {
    setRenamingTabId(tab.id);
    setRenameValue(tab.customTitle || getTabTitle(tab));
  };

  const confirmRename = () => {
    if (renamingTabId && renameValue.trim() && onRenameTab) {
      onRenameTab(renamingTabId, renameValue.trim());
    }
    setRenamingTabId(null);
  };

  const cancelRename = () => {
    setRenamingTabId(null);
  };

  // Sort: pinned tabs first
  const sortedTabs = useMemo(() => {
    const ordered = tabs.map((tab, index) => ({ tab, index }));
    const pinned = ordered.filter(x => x.tab.pinned);
    const unpinned = ordered.filter(x => !x.tab.pinned);
    return [...pinned, ...unpinned];
  }, [tabs]);

  // Drag and drop handlers (desktop only)
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    if (isMobile) return;
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
  }, [isMobile]);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (!isNaN(fromIndex) && fromIndex !== toIndex && onReorderTabs) {
      onReorderTabs(fromIndex, toIndex);
    }
    setDragOverIndex(null);
  }, [onReorderTabs]);

  const handleDragEnd = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const isOutputPhase = (tokenCount?.output ?? 0) > 0;
  const arrowIcon = isOutputPhase ? 'arrow_downward' : 'arrow_upward';
  const phaseClass = isOutputPhase ? 'token-out' : 'token-in';
  const totalTokens = (tokenCount?.input ?? 0) + (tokenCount?.output ?? 0);

  // Mobile: show max 5 tabs with overflow
  const MAX_MOBILE_TABS = 5;
  const visibleMobileTabs = isMobile ? sortedTabs.slice(0, MAX_MOBILE_TABS) : sortedTabs;
  const overflowCount = isMobile ? Math.max(0, sortedTabs.length - MAX_MOBILE_TABS) : 0;

  const renderTab = ({ tab, index }: { tab: Tab; index: number }, mobile: boolean) => {
    const tabTitle = getTabTitle(tab);
    const isActive = index === activeTabIndex;
    const isPinned = !!tab.pinned;

    return (
      <div
        key={tab.id}
        className={`tab ${isActive ? `active-tab ${getTabAccentClass(tab)}` : ''} ${isPinned ? 'tab-pinned' : ''} ${mobile ? 'tab-mobile' : ''}`}
        onClick={() => onSwitchTab(index)}
        role="tab"
        tabIndex={isActive ? 0 : -1}
        aria-selected={isActive}
        aria-label={`${tabTitle}${isPinned ? ' (pinned)' : ''}${tab.loading ? ' (loading)' : ''}`}
        draggable={!isMobile && !isPinned}
        onDragStart={(e) => handleDragStart(e, index)}
        onDragOver={(e) => handleDragOver(e, index)}
        onDrop={(e) => handleDrop(e, index)}
        onDragEnd={handleDragEnd}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSwitchTab(index);
          }
        }}
        onContextMenu={e => {
          e.preventDefault();
          if (onPinTab) onPinTab(tab.id);
        }}
        style={dragOverIndex === index ? { borderLeft: '2px solid var(--bw-accent)' } : undefined}
      >
        {tab.loading ? (
          <div className="tab-spinner" aria-hidden="true" />
        ) : isPinned ? (
          <span className="material-symbols-outlined tab-kind-icon tab-pin-icon" aria-hidden="true">keep</span>
        ) : (
          <span className="material-symbols-outlined tab-kind-icon" aria-hidden="true">{getTabIcon(tab)}</span>
        )}
        {!isPinned && !mobile && (
          renamingTabId === tab.id ? (
            <input
              type="text"
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => {
                e.stopPropagation();
                if (e.key === 'Enter') confirmRename();
                if (e.key === 'Escape') cancelRename();
              }}
              onBlur={confirmRename}
              className="tab-rename-input"
              autoFocus
              onClick={e => e.stopPropagation()}
              aria-label="Rename tab"
            />
          ) : (
            <span
              className="tab-title"
              onDoubleClick={(e) => {
                e.stopPropagation();
                startRename(tab);
              }}
            >
              {tabTitle}
            </span>
          )
        )}
        {!isPinned && !mobile && (
          <button
            className="tab-close"
            onClick={(e) => { e.stopPropagation(); onCloseTab(index); }}
            title={`Close ${tabTitle}`}
            aria-label={`Close ${tabTitle}`}
          >×</button>
        )}
      </div>
    );
  };

  // Desktop tab bar (top)
  const desktopTabBar = (
    <div className="tab-bar" role="toolbar" aria-label="Tab bar">
      <button onClick={onHome} className="flex-shrink-0 ml-2 mr-1 self-center rounded" aria-label="Home" style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}>
        <img src="/pwa-192x192.png" alt="Bowser" className="w-5 h-5 rounded" style={{ opacity: 0.85 }} />
      </button>
      <div className="tab-list" role="tablist" aria-label="Open tabs">
        {sortedTabs.map(item => renderTab(item, false))}
        <button className="tab-new" onClick={onNewTab} title="New Tab" aria-label="Open new tab">
          <span aria-hidden="true">+</span>
        </button>
      </div>

      {tokenCount && (
        <div className="flex items-center mr-4">
          <span className="token-display" aria-live="polite" aria-atomic="true">
            <span className={phaseClass}>
              <span className="material-symbols-outlined token-icon" aria-hidden="true">
                {isLoading ? arrowIcon : 'check'}
              </span>
              <AnimatedNumber value={totalTokens} prefix="~" prefixVisible={!!tokenCount.isEstimate} animate={isLoading} />
            </span>
            {' '}
            <span className="token-label">tokens in</span>
            {' '}
            <span className="token-label"><ElapsedTimer isActive={isLoading} /></span>
          </span>
        </div>
      )}

      {onToggleSidePanel && (
        <button
          className={`tab-bar-btn ${sidePanelOpen ? 'active' : ''}`}
          onClick={onToggleSidePanel}
          title={sidePanelOpen ? 'Close side panel' : 'Open side panel'}
          aria-label={sidePanelOpen ? 'Close side panel' : 'Open side panel'}
          aria-pressed={sidePanelOpen}
          style={sidePanelOpen ? { color: 'var(--bw-accent)' } : undefined}
        >
          <span className="material-symbols-outlined" aria-hidden="true">right_panel_open</span>
        </button>
      )}
      <button className="tab-bar-btn" onClick={() => window.open(window.location.href, '_blank')} title="Open new window" aria-label="Open new window">
        <span className="material-symbols-outlined" aria-hidden="true">open_in_new</span>
      </button>
      <button className="tab-bar-btn" onClick={handleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
        <span className="material-symbols-outlined" aria-hidden="true">{isFullscreen ? 'close_fullscreen' : 'fullscreen'}</span>
      </button>
    </div>
  );

  // Mobile bottom tab bar
  const mobileTabBar = (
    <div className="mobile-tab-bar" role="tablist" aria-label="Tabs">
      <button onClick={onHome} className="flex-shrink-0 ml-1.5 mr-0.5 self-center rounded" aria-label="Home" style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}>
        <img src="/pwa-192x192.png" alt="Bowser" className="w-5 h-5 rounded" style={{ opacity: 0.85 }} />
      </button>
      {visibleMobileTabs.map(item => renderTab(item, true))}
      {overflowCount > 0 && (
        <button
          className="tab tab-mobile tab-overflow"
          onClick={onNewTab}
          aria-label={`${overflowCount} more tabs`}
        >
          <span className="text-[11px] font-semibold" style={{ color: 'var(--bw-text-tertiary)' }}>+{overflowCount}</span>
        </button>
      )}
      <button className="tab-new-mobile" onClick={onNewTab} title="New Tab" aria-label="Open new tab">
        <span className="material-symbols-outlined" style={{ fontSize: '20px' }} aria-hidden="true">add</span>
      </button>
    </div>
  );

  return (
    <div className="browser-shell" ref={shellRef}>
      {/* Desktop: tab bar at top */}
      {!isMobile && desktopTabBar}

      {/* Desktop: address bar at top */}
      {!isMobile && (
        <AddressBar
          breadcrumb={breadcrumb}
          isLoading={isLoading}
          loadingMessage={loadingMessage}
          onNavigate={onNavigate}
          onBack={onBack}
          onForward={onForward}
          onRefresh={onRefresh}
          onStop={onStop}
          onHome={onHome}
          canGoBack={canGoBack}
          canGoForward={canGoForward}
          isBrowserMode={isBrowserMode}
          onToggleBrowserMode={onToggleBrowserMode}
          isBookmarked={isBookmarked}
          onToggleBookmark={onToggleBookmark}
          canBookmark={canBookmark}
          webHistoryPosition={webHistoryPosition}
          webHistoryTotal={webHistoryTotal}
          webHistoryUrls={webHistoryUrls}
          onWebHistoryNavigate={onWebHistoryNavigate}
        />
      )}

      {/* Content area */}
      <div className="browser-content-row" ref={viewportRef}>
        <div className="browser-viewport" id="bowser-viewport" role="tabpanel" aria-label="Page content">
          {children}
        </div>
        {sidePanelOpen && !isMobile && sidePanel}
      </div>

      {/* Mobile: side panel as bottom sheet overlay */}
      {sidePanelOpen && isMobile && (
        <div className="mobile-bottom-sheet-overlay" onClick={() => onToggleSidePanel?.()}>
          <div className="mobile-bottom-sheet" onClick={e => e.stopPropagation()}>
            <div className="mobile-bottom-sheet-handle" />
            {sidePanel}
          </div>
        </div>
      )}


      {/* Mobile: address bar above bottom tab bar */}
      {isMobile && (
        <div className="mobile-bottom-chrome">
          <AddressBar
            breadcrumb={breadcrumb}
            isLoading={isLoading}
            loadingMessage={loadingMessage}
            onNavigate={onNavigate}
            onBack={onBack}
            onForward={onForward}
            onRefresh={onRefresh}
            onStop={onStop}
            onHome={onHome}
            canGoBack={canGoBack}
            canGoForward={canGoForward}
            isBrowserMode={isBrowserMode}
            onToggleBrowserMode={onToggleBrowserMode}
            isBookmarked={isBookmarked}
            onToggleBookmark={onToggleBookmark}
            canBookmark={canBookmark}
            isMobile={true}
            webHistoryPosition={webHistoryPosition}
            webHistoryTotal={webHistoryTotal}
            webHistoryUrls={webHistoryUrls}
            onWebHistoryNavigate={onWebHistoryNavigate}
            onToggleSidePanel={onToggleSidePanel}
          />
          {mobileTabBar}
        </div>
      )}
    </div>
  );
};

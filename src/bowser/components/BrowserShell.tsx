import React, { useRef, useCallback, useState, useEffect } from 'react';
import { AddressBar } from './AddressBar';
import { Breadcrumb, GroundingSource, Tab, TokenCount } from '../types';

const AnimatedNumber: React.FC<{ value: number; prefix?: string; prefixVisible?: boolean; animate?: boolean }> = ({ value, prefix, prefixVisible = true, animate = true }) => {
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
};

const ElapsedTimer: React.FC<{ isActive: boolean }> = ({ isActive }) => {
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
};

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
  groundingSources: GroundingSource[];
  searchEntryPointHtml: string;
  tabs: Tab[];
  activeTabIndex: number;
  onNewTab: () => void;
  onCloseTab: (index: number) => void;
  onSwitchTab: (index: number) => void;
  isGrounded: boolean;
  onToggleGrounding: () => void;
  isBrowserMode: boolean;
  onToggleBrowserMode: () => void;
  tokenCount: TokenCount | null;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  canBookmark: boolean;
  onRenameTab?: (tabId: string, newTitle: string) => void;
  onPinTab?: (tabId: string) => void;
  sidePanelOpen?: boolean;
  onToggleSidePanel?: () => void;
  sidePanel?: React.ReactNode;
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
  groundingSources,
  searchEntryPointHtml,
  tabs,
  activeTabIndex,
  onNewTab,
  onCloseTab,
  onSwitchTab,
  isGrounded,
  onToggleGrounding,
  isBrowserMode,
  onToggleBrowserMode,
  tokenCount,
  isBookmarked,
  onToggleBookmark,
  canBookmark,
  onRenameTab,
  onPinTab,
  sidePanelOpen,
  onToggleSidePanel,
  sidePanel,
}) => {
  const shellRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

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
      case 'history': return 'history';
      case 'bookmarks': return 'bookmarks';
      case 'settings': return 'settings';
      default: return 'add';
    }
  };

  const getTabAccentClass = (tab: Tab): string => {
    switch (tab.tabKind) {
      case 'ai': return 'tab-accent-ai';
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

  // Sort: pinned tabs first, then unpinned, preserving original indices
  const orderedTabs = tabs.map((tab, index) => ({ tab, index }));
  const pinnedTabs = orderedTabs.filter(x => x.tab.pinned);
  const unpinnedTabs = orderedTabs.filter(x => !x.tab.pinned);
  const sortedTabs = [...pinnedTabs, ...unpinnedTabs];

  const isOutputPhase = (tokenCount?.output ?? 0) > 0;
  const arrowIcon = isOutputPhase ? 'arrow_downward' : 'arrow_upward';
  const phaseClass = isOutputPhase ? 'token-out' : 'token-in';
  const totalTokens = (tokenCount?.input ?? 0) + (tokenCount?.output ?? 0);

  return (
    <div className="browser-shell" ref={shellRef}>
      <div className="tab-bar" role="toolbar" aria-label="Tab bar">
        <div className="tab-list" role="tablist" aria-label="Open tabs">
          {sortedTabs.map(({ tab, index }) => {
            const tabTitle = getTabTitle(tab);
            const isActive = index === activeTabIndex;
            const isPinned = !!tab.pinned;

            return (
              <div
                key={tab.id}
                className={`tab ${isActive ? `active-tab ${getTabAccentClass(tab)}` : ''} ${isPinned ? 'tab-pinned' : ''}`}
                onClick={() => onSwitchTab(index)}
                role="tab"
                tabIndex={isActive ? 0 : -1}
                aria-selected={isActive}
                aria-label={`${tabTitle}${isPinned ? ' (pinned)' : ''}${tab.loading ? ' (loading)' : ''}`}
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
              >
                {tab.loading ? (
                  <div className="tab-spinner" aria-hidden="true" />
                ) : isPinned ? (
                  <span className="material-symbols-outlined tab-kind-icon tab-pin-icon" aria-hidden="true">keep</span>
                ) : (
                  <span className="material-symbols-outlined tab-kind-icon" aria-hidden="true">{getTabIcon(tab)}</span>
                )}
                {!isPinned && (
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
                {!isPinned && (
                  <button
                    className="tab-close"
                    onClick={(e) => { e.stopPropagation(); onCloseTab(index); }}
                    title={`Close ${tabTitle}`}
                    aria-label={`Close ${tabTitle}`}
                  >×</button>
                )}
              </div>
            );
          })}
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
        isGrounded={isGrounded}
        onToggleGrounding={onToggleGrounding}
        isBrowserMode={isBrowserMode}
        onToggleBrowserMode={onToggleBrowserMode}
        isBookmarked={isBookmarked}
        onToggleBookmark={onToggleBookmark}
        canBookmark={canBookmark}
      />

      <div className="browser-content-row">
        <div className="browser-viewport" role="tabpanel" aria-label="Page content">
          {children}
        </div>
        {sidePanelOpen && sidePanel}
      </div>

      {(groundingSources.length > 0 || searchEntryPointHtml) && (
        <div className="grounding-row" aria-label="Sources">
          {groundingSources.length > 0 && (
            <div className="sources-container">
              <div className="sources-row">
                {groundingSources.map((source, i) => (
                  <a key={i} className="source-chip" href={source.uri} target="_blank" rel="noopener noreferrer" title={source.title}>
                    <img className="source-favicon" src={`https://www.google.com/s2/favicons?sz=16&domain=${source.title}`} alt="" />
                    {source.title}
                  </a>
                ))}
              </div>
            </div>
          )}

          {searchEntryPointHtml && (
            <iframe
              srcDoc={`<script>document.addEventListener('click',function(e){var a=e.target.closest('a');if(a&&a.href){e.preventDefault();window.open(a.href,'_blank');}});<\/script>${searchEntryPointHtml}`}
              className="search-widget-iframe"
              sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
              title="Search suggestions"
            />
          )}
        </div>
      )}
    </div>
  );
};

import React, { useRef, useCallback, useState, useEffect } from 'react';
import { AddressBar } from './AddressBar';
import { Breadcrumb, GroundingSource, Tab, TokenCount, Bookmark, BookmarkFolder, TabKind } from '../types';

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
  bookmarks: Bookmark[];
  bookmarkFolders: BookmarkFolder[];
  onCreateBookmarkFolder: (name: string) => void;
  onRenameBookmarkFolder: (id: string, newName: string) => void;
  onDeleteBookmarkFolder: (id: string) => void;
  onMoveBookmark: (url: string, folderId: string | undefined) => void;
  onNavigateToBookmark: (url: string, tabKind: TabKind) => void;
  canBookmark: boolean;
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
}) => {
  const shellRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
    if (tab.loading) return 'Generating...';
    if (tab.tabKind === 'web') {
      try {
        const url = new URL(tab.browserUrl || '');
        return url.hostname;
      } catch {
        return tab.browserUrl || 'Browser';
      }
    }
    const bc = tab.breadcrumb;
    return bc.page || bc.sitename || 'New Tab';
  };

  const isOutputPhase = (tokenCount?.output ?? 0) > 0;
  const arrowIcon = isOutputPhase ? 'arrow_downward' : 'arrow_upward';
  const phaseClass = isOutputPhase ? 'token-out' : 'token-in';
  const totalTokens = (tokenCount?.input ?? 0) + (tokenCount?.output ?? 0);

  return (
    <div className="browser-shell" ref={shellRef}>
      <div className="tab-bar">
        <div className="tab-list" role="tablist">
          {tabs.map((tab, index) => (
            <div
              key={tab.id}
              className={`tab ${index === activeTabIndex ? 'active-tab' : ''}`}
              onClick={() => onSwitchTab(index)}
              role="tab"
              tabIndex={0}
              aria-selected={index === activeTabIndex}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSwitchTab(index);
                }
              }}
            >
              {tab.loading && <div className="tab-spinner" aria-hidden="true" />}
              <span className="tab-title">{getTabTitle(tab)}</span>
              <button
                className="tab-close"
                onClick={(e) => { e.stopPropagation(); onCloseTab(index); }}
                title="Close tab"
                aria-label="Close tab"
              >×</button>
            </div>
          ))}
          <button className="tab-new" onClick={onNewTab} title="New Tab" aria-label="New Tab">
            <span>+</span>
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

        <button className="tab-bar-btn" onClick={() => window.open(window.location.href, '_blank')} title="Open new window" aria-label="Open new window">
          <span className="material-symbols-outlined">open_in_new</span>
        </button>
        <button className="tab-bar-btn" onClick={handleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
          <span className="material-symbols-outlined">{isFullscreen ? 'close_fullscreen' : 'fullscreen'}</span>
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

      <div className="browser-viewport">
        {children}
      </div>

      {(groundingSources.length > 0 || searchEntryPointHtml) && (
        <div className="grounding-row">
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
              title="Search Suggestions"
            />
          )}
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Breadcrumb } from '../types';
import { breadcrumbToDisplay } from '../utils/urlHelpers';
import { getStorageItem, setStorageItem } from '../utils/storage';
import { parseOmniboxInput } from '../utils/navigation';

interface AddressBarProps {
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
  isBrowserMode: boolean;
  onToggleBrowserMode: () => void;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  canBookmark: boolean;
  isMobile?: boolean;
  onToggleSidePanel?: () => void;
  webHistoryPosition?: number;
  webHistoryTotal?: number;
  webHistoryUrls?: string[];
  onWebHistoryNavigate?: (index: number) => void;
}

export const AddressBar: React.FC<AddressBarProps> = ({
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
  isBrowserMode,
  onToggleBrowserMode,
  isBookmarked,
  onToggleBookmark,
  canBookmark,
  isMobile = false,
  onToggleSidePanel,
  webHistoryPosition,
  webHistoryTotal,
  webHistoryUrls,
  onWebHistoryNavigate,
}) => {
  const displayText = breadcrumbToDisplay(breadcrumb);
  const [inputVal, setInputVal] = useState(() => {
    const stored = getStorageItem<string | null>('current-input', null);
    return stored !== null ? stored : displayText;
  });
  const [isFocused, setIsFocused] = useState(false);
  const [hasEdited, setHasEdited] = useState(() => {
    const stored = getStorageItem<string | null>('current-input', null);
    return stored !== null && stored !== displayText;
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    return getStorageItem<string[]>('search-history', []);
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const [historyDropdownOpen, setHistoryDropdownOpen] = useState(false);
  const historyDropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFocusEvent = () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener('bowser:focus-omnibar', handleFocusEvent);
    return () => window.removeEventListener('bowser:focus-omnibar', handleFocusEvent);
  }, []);

  useEffect(() => {
    setStorageItem('current-input', inputVal);
  }, [inputVal]);

  const addToHistory = (query: string) => {
    setSearchHistory(prev => {
      const filtered = prev.filter(item => item !== query);
      const newHistory = [query, ...filtered].slice(0, 10);
      setStorageItem('search-history', newHistory);
      return newHistory;
    });
  };

  const removeFromHistory = (query: string) => {
    setSearchHistory(prev => {
      const newHistory = prev.filter(item => item !== query);
      setStorageItem('search-history', newHistory);
      return newHistory;
    });
  };

  useEffect(() => {
    if (!isFocused) {
      if (!hasEdited) {
        setInputVal(displayText);
      }
    }
  }, [displayText, isFocused, hasEdited]);

  useEffect(() => {
    if (isLoading) {
      setHasEdited(false);
      setError(null);
    }
  }, [isLoading]);

  useEffect(() => {
    if (!historyDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (historyDropdownRef.current && !historyDropdownRef.current.contains(e.target as Node)) {
        setHistoryDropdownOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setHistoryDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [historyDropdownOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    const handleBlur = () => setMenuOpen(false);
    const handleScroll = () => setMenuOpen(false);
    const handleResize = () => setMenuOpen(false);
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [menuOpen]);

  const navigateWithQuery = (query: string): boolean => {
    const currentKind = isBrowserMode ? 'web' as const : 'ai' as const;
    const decision = parseOmniboxInput(query, currentKind);

    if (decision.error) {
      setError(decision.error);
      return false;
    }

    setError(null);
    addToHistory(decision.url || query);
    onNavigate('create', query);
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputVal.trim();
    if (!trimmed) return;

    const success = navigateWithQuery(trimmed);

    if (success) {
      setHasEdited(false);
      inputRef.current?.blur();
    }
  };

  const handleHistoryClick = (item: string) => {
    setInputVal(item);
    const success = navigateWithQuery(item);
    if (success) {
      setHasEdited(false);
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputVal(e.target.value);
    setHasEdited(true);
    if (error) setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setInputVal(displayText);
      setHasEdited(false);
      setError(null);
      inputRef.current?.blur();
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (!hasEdited) {
      setInputVal(displayText.replace(/ › /g, '.'));
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (!hasEdited) {
      setInputVal(displayText);
    }
  };

  const displayValue = isLoading && !isFocused && !breadcrumb.page
    ? 'Generating…'
    : isFocused ? inputVal : inputVal.replace(/\./g, ' › ');

  // Determine favicon and security for current URL
  const currentUrl = isBrowserMode ? breadcrumb.sitename : '';
  let faviconUrl = '';
  let isHttps = true;
  if (currentUrl && currentUrl.startsWith('http')) {
    try {
      const parsed = new URL(currentUrl);
      faviconUrl = `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=32`;
      isHttps = parsed.protocol === 'https:';
    } catch { /* ignore */ }
  }

  return (
    <div className={`address-bar ${isMobile ? 'address-bar-mobile' : ''}`}>
      {/* Nav buttons - hidden on mobile */}
      {!isMobile && (
        <div className="nav-buttons">
          <button onClick={onBack} disabled={!canGoBack} className={`nav-btn ${!canGoBack ? 'disabled' : ''}`} title="Back" aria-label="Go back">
            <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
          </button>
          <button onClick={onForward} disabled={!canGoForward} className={`nav-btn ${!canGoForward ? 'disabled' : ''}`} title="Forward" aria-label="Go forward">
            <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
          </button>
          {isBrowserMode && webHistoryTotal != null && webHistoryTotal > 1 && (
            <div className="relative" ref={historyDropdownRef}>
              <button
                className="text-[10px] font-medium select-none tabular-nums px-1.5 py-0.5 rounded transition-colors"
                style={{ color: 'var(--bw-text-quaternary)', background: historyDropdownOpen ? 'var(--bw-bg-hover)' : 'transparent' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bw-bg-hover)')}
                onMouseLeave={e => { if (!historyDropdownOpen) e.currentTarget.style.background = 'transparent'; }}
                onClick={() => setHistoryDropdownOpen(prev => !prev)}
                title={`Page ${webHistoryPosition} of ${webHistoryTotal} — click to see history`}
                aria-label="Show web history"
                aria-haspopup="true"
                aria-expanded={historyDropdownOpen}
              >
                {webHistoryPosition}/{webHistoryTotal}
              </button>
              {historyDropdownOpen && webHistoryUrls && onWebHistoryNavigate && (
                <div
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-1 rounded-lg z-50 overflow-hidden max-h-60 overflow-y-auto min-w-[240px] max-w-[360px]"
                  style={{
                    background: 'var(--bw-bg-elevated)',
                    border: '1px solid var(--bw-border)',
                    boxShadow: 'var(--bw-shadow-lg)',
                  }}
                  role="listbox"
                  aria-label="Web navigation history"
                >
                  {webHistoryUrls.map((url, idx) => {
                    const isCurrent = idx === (webHistoryPosition! - 1);
                    let label = url;
                    try { label = new URL(url).hostname; } catch { /* use raw url */ }
                    return (
                      <button
                        key={idx}
                        className="w-full px-3 py-2 text-left text-[12px] flex items-center gap-2 transition-colors"
                        style={{
                          color: isCurrent ? 'var(--bw-accent)' : 'var(--bw-text-primary)',
                          background: isCurrent ? 'var(--bw-bg-hover)' : 'transparent',
                          fontWeight: isCurrent ? 600 : 400,
                        }}
                        onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = 'var(--bw-bg-hover)'; }}
                        onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'transparent'; }}
                        onClick={() => {
                          onWebHistoryNavigate(idx);
                          setHistoryDropdownOpen(false);
                        }}
                        role="option"
                        aria-selected={isCurrent}
                      >
                        <span className="material-symbols-outlined text-[14px] flex-shrink-0" aria-hidden="true">
                          {isCurrent ? 'arrow_right' : 'public'}
                        </span>
                        <span className="truncate">{label}</span>
                        <span className="ml-auto text-[10px] flex-shrink-0" style={{ color: 'var(--bw-text-quaternary)' }}>
                          {idx + 1}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          <button onClick={isLoading ? onStop : onRefresh} className="nav-btn" title={isLoading ? 'Stop' : 'Reload'} aria-label={isLoading ? 'Stop loading' : 'Reload page'}>
            <span className="material-symbols-outlined" aria-hidden="true">{isLoading ? 'close' : 'refresh'}</span>
          </button>
          <button onClick={onHome} className="nav-btn" title="New tab" aria-label="New tab">
            <span className="material-symbols-outlined" aria-hidden="true">home</span>
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="omnibar-form">
        <div className="omnibar-wrapper">
          {isLoading && !inputVal ? (
            <div className="omnibar-loading">{loadingMessage}</div>
          ) : (
            <div className="relative flex items-center w-full">
              {/* Security badge / favicon */}
              {faviconUrl && !isFocused && (
                <div className="flex items-center gap-1 pl-2 flex-shrink-0">
                  <span className="material-symbols-outlined text-[14px]" style={{ color: isHttps ? 'var(--bw-green)' : 'var(--bw-red)' }} aria-label={isHttps ? 'Secure connection' : 'Not secure'}>
                    {isHttps ? 'lock' : 'warning'}
                  </span>
                  <img src={faviconUrl} alt="" className="w-4 h-4 rounded-sm" />
                </div>
              )}
              {/* Mode badge */}
              {!isFocused && (
                <span
                  className="flex-shrink-0 ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide select-none"
                  style={{
                    background: isBrowserMode ? 'hsla(var(--bw-green-raw, 142 71% 45%), 0.15)' : 'hsla(var(--bw-accent-raw, 245 58% 51%), 0.12)',
                    color: isBrowserMode ? 'var(--bw-green)' : 'var(--bw-accent)',
                  }}
                >
                  {isBrowserMode ? 'Web' : 'Create'}
                </span>
              )}
              <input
                ref={inputRef}
                type="text"
                autoComplete="off"
                value={displayValue}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="omnibar-input pr-10"
                style={error ? { borderColor: 'var(--bw-red)', background: 'var(--bw-red-subtle)' } : undefined}
                placeholder={isBrowserMode ? 'Search or go to a URL' : 'Create anything…'}
                aria-label="Search or enter a URL"
              />
              {/* Voice input button */}
              {'webkitSpeechRecognition' in window || 'SpeechRecognition' in window ? (
                <button
                  type="button"
                  className="absolute right-8 top-1/2 -translate-y-1/2 p-1 rounded flex items-center justify-center transition-colors"
                  style={{ color: 'var(--bw-text-quaternary)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--bw-accent)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--bw-text-quaternary)')}
                  title="Voice input"
                  aria-label="Voice input"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                    if (!SpeechRecognition) return;
                    const recognition = new SpeechRecognition();
                    recognition.continuous = false;
                    recognition.interimResults = false;
                    recognition.lang = navigator.language || 'en-US';
                    recognition.onresult = (event: any) => {
                      const transcript = event.results[0][0].transcript;
                      if (transcript) {
                        setInputVal(transcript);
                        setHasEdited(true);
                        // Auto-submit after voice recognition
                        setTimeout(() => {
                          const success = navigateWithQuery(transcript);
                          if (success) {
                            setHasEdited(false);
                            inputRef.current?.blur();
                          }
                        }, 300);
                      }
                    };
                    recognition.onerror = () => { /* silently fail */ };
                    recognition.start();
                  }}
                >
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">mic</span>
                </button>
              ) : null}
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded flex items-center justify-center transition-colors"
                style={{ color: 'var(--bw-text-quaternary)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--bw-text-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--bw-text-quaternary)')}
                title="Go"
                aria-label="Go"
                onMouseDown={(e) => { e.preventDefault(); }}
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_forward</span>
              </button>
            </div>
          )}
          {error && (
            <div
              className="absolute top-full left-0 mt-1 text-xs px-3 py-1.5 rounded-md whitespace-nowrap z-50"
              style={{
                background: 'var(--bw-bg-elevated)',
                color: 'var(--bw-red)',
                border: '1px solid var(--bw-border)',
                boxShadow: 'var(--bw-shadow-md)',
              }}
              role="alert"
            >
              {error}
            </div>
          )}
          {isFocused && searchHistory.length > 0 && (
            <div
              className={`absolute ${isMobile ? 'bottom-full mb-1' : 'top-full mt-1'} left-0 right-0 rounded-lg z-50 overflow-hidden max-h-60 overflow-y-auto`}
              role="listbox"
              aria-label="Recent searches"
              style={{
                background: 'var(--bw-bg-elevated)',
                border: '1px solid var(--bw-border)',
                boxShadow: 'var(--bw-shadow-lg)',
              }}
            >
              {searchHistory.map((item, idx) => (
                <div
                  key={idx}
                  className="px-3 py-2 text-sm cursor-pointer flex items-center gap-3 transition-colors"
                  role="option"
                  aria-selected={false}
                  style={{ color: 'var(--bw-text-primary)' }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleHistoryClick(item);
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bw-bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span className="material-symbols-outlined text-[14px]" style={{ color: 'var(--bw-text-quaternary)' }} aria-hidden="true">
                    {item.startsWith('http') ? 'public' : 'history'}
                  </span>
                  <span className="truncate flex-1 text-[13px]">{item}</span>
                  <button
                    className="ml-auto p-0.5 rounded flex items-center justify-center transition-colors"
                    style={{ color: 'var(--bw-text-quaternary)' }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeFromHistory(item);
                    }}
                    title="Remove"
                    aria-label={`Remove "${item}" from recent searches`}
                  >
                    <span className="material-symbols-outlined text-[13px]" aria-hidden="true">close</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </form>

      {/* Mobile: compact action buttons */}
      {isMobile ? (
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onToggleBookmark}
            disabled={!canBookmark}
            className={`nav-btn nav-btn-mobile ${!canBookmark ? 'disabled' : ''}`}
            style={{ color: isBookmarked ? 'var(--bw-accent)' : undefined }}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
          >
            <span className="material-symbols-outlined" aria-hidden="true">{isBookmarked ? 'star' : 'star_border'}</span>
          </button>
          {onToggleSidePanel && (
            <button
              className="nav-btn nav-btn-mobile"
              onClick={onToggleSidePanel}
              aria-label="Assistant"
            >
              <span className="material-symbols-outlined" aria-hidden="true">auto_awesome</span>
            </button>
          )}
          <MobileMenuPortal
            menuRef={menuRef}
            menuOpen={menuOpen}
            setMenuOpen={setMenuOpen}
            onBack={onBack}
            onForward={onForward}
            onRefresh={onRefresh}
            onStop={onStop}
            onHome={onHome}
            canGoBack={canGoBack}
            canGoForward={canGoForward}
            isLoading={isLoading}
            isBrowserMode={isBrowserMode}
            onToggleBrowserMode={onToggleBrowserMode}
          />
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={onToggleBookmark}
            disabled={!canBookmark}
            className={`nav-btn ${!canBookmark ? 'disabled' : ''}`}
            style={{ color: isBookmarked ? 'var(--bw-accent)' : undefined }}
            title={isBookmarked ? 'Remove bookmark' : 'Bookmark this page'}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark this page'}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              {isBookmarked ? 'star' : 'star_border'}
            </span>
          </button>


          {/* Mode toggle */}
          <button
            onClick={onToggleBrowserMode}
            className="flex items-center gap-1.5 ml-1 mr-1 px-2.5 py-1.5 rounded-md transition-colors"
            style={{ border: '1px solid var(--bw-border)', background: 'transparent' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bw-bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            title={isBrowserMode ? 'Switch to Create mode' : 'Switch to Web mode'}
            aria-label={`Switch to ${isBrowserMode ? 'Create' : 'Web'} mode`}
          >
            <span className="text-[11px] font-semibold select-none" style={{ color: isBrowserMode ? 'var(--bw-green)' : 'var(--bw-text-quaternary)' }}>Web</span>
            <div
              className={`toggle-track ${!isBrowserMode ? 'active' : ''}`}
              role="switch"
              aria-checked={!isBrowserMode}
              style={{ width: '26px', height: '14px' }}
            >
              <div className="toggle-thumb" style={{ width: '10px', height: '10px', top: '1px', left: '1px', transform: !isBrowserMode ? 'translateX(12px)' : 'none' }} />
            </div>
            <span className="text-[11px] font-semibold select-none" style={{ color: !isBrowserMode ? 'var(--bw-accent)' : 'var(--bw-text-quaternary)' }}>Create</span>
          </button>

          <div className="menu-container" ref={menuRef}>
            <button className="nav-btn" onClick={() => setMenuOpen(!menuOpen)} title="More" aria-label="More options" aria-haspopup="true" aria-expanded={menuOpen}>
              <span className="material-symbols-outlined" aria-hidden="true">more_vert</span>
            </button>
            {menuOpen && (
              <div className="dropdown-menu" role="menu">
                <button className="dropdown-menu-item" role="menuitem" onClick={() => { onHome(); setMenuOpen(false); }}>
                  <span className="material-symbols-outlined text-base" aria-hidden="true">add</span>
                  <span className="text-[13px]">New tab</span>
                </button>
                <button className="dropdown-menu-item" role="menuitem" onClick={() => { isLoading ? onStop() : onRefresh(); setMenuOpen(false); }}>
                  <span className="material-symbols-outlined text-base" aria-hidden="true">{isLoading ? 'close' : 'refresh'}</span>
                  <span className="text-[13px]">{isLoading ? 'Stop' : 'Reload'}</span>
                </button>
                {onToggleSidePanel && (
                  <button className="dropdown-menu-item" role="menuitem" onClick={() => { onToggleSidePanel(); setMenuOpen(false); }}>
                    <span className="material-symbols-outlined text-base" aria-hidden="true">auto_awesome</span>
                    <span className="text-[13px]">Assistant</span>
                  </button>
                )}
                <div style={{ borderTop: '1px solid var(--bw-border-subtle)', margin: '4px 0' }} />
                <button className="dropdown-menu-item" role="menuitem" onClick={() => {
                  if (document.fullscreenElement) { document.exitFullscreen(); } else { document.documentElement.requestFullscreen?.(); }
                  setMenuOpen(false);
                }}>
                  <span className="material-symbols-outlined text-base" aria-hidden="true">{document.fullscreenElement ? 'fullscreen_exit' : 'fullscreen'}</span>
                  <span className="text-[13px]">{document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen'}</span>
                </button>
                <div style={{ borderTop: '1px solid var(--bw-border-subtle)', margin: '4px 0' }} />
                <button className="dropdown-menu-item" role="menuitem" onClick={() => {
                  window.dispatchEvent(new CustomEvent('bowser:open-system', { detail: 'settings' }));
                  setMenuOpen(false);
                }}>
                  <span className="material-symbols-outlined text-base" aria-hidden="true">settings</span>
                  <span className="text-[13px]">Settings</span>
                </button>
                <button className="dropdown-menu-item" role="menuitem" onClick={() => {
                  window.dispatchEvent(new CustomEvent('bowser:open-system', { detail: 'history' }));
                  setMenuOpen(false);
                }}>
                  <span className="material-symbols-outlined text-base" aria-hidden="true">history</span>
                  <span className="text-[13px]">History</span>
                </button>
                <button className="dropdown-menu-item" role="menuitem" onClick={() => {
                  window.dispatchEvent(new CustomEvent('bowser:open-system', { detail: 'bookmarks' }));
                  setMenuOpen(false);
                }}>
                  <span className="material-symbols-outlined text-base" aria-hidden="true">bookmarks</span>
                  <span className="text-[13px]">Bookmarks</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

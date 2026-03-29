import React, { useState, useEffect, useRef } from 'react';
import { Breadcrumb } from '../types';
import { parseBreadcrumb, breadcrumbToDisplay } from '../utils/urlHelpers';
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
  isGrounded: boolean;
  onToggleGrounding: () => void;
  isBrowserMode: boolean;
  onToggleBrowserMode: () => void;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  canBookmark: boolean;
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
  isGrounded,
  onToggleGrounding,
  isBrowserMode,
  onToggleBrowserMode,
  isBookmarked,
  onToggleBookmark,
  canBookmark,
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
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('blur', handleBlur);
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

    // Delegate all routing decisions to BowserApp via onNavigate
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

  return (
    <div className="address-bar">
      <div className="nav-buttons">
        <button onClick={onBack} disabled={!canGoBack} className={`nav-btn ${!canGoBack ? 'disabled' : ''}`} title="Go back" aria-label="Go back">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <button onClick={onForward} disabled={!canGoForward} className={`nav-btn ${!canGoForward ? 'disabled' : ''}`} title="Go forward" aria-label="Go forward">
          <span className="material-symbols-outlined">arrow_forward</span>
        </button>
        <button onClick={isLoading ? onStop : onRefresh} className="nav-btn" title={isLoading ? 'Stop' : 'Refresh'} aria-label={isLoading ? 'Stop loading' : 'Refresh'}>
          <span className="material-symbols-outlined">{isLoading ? 'close' : 'refresh'}</span>
        </button>
        <button onClick={onHome} className="nav-btn" title="Home" aria-label="Home">
          <span className="material-symbols-outlined">home</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="omnibar-form">
        <div className="omnibar-wrapper">
          {isLoading && !inputVal ? (
            <div className="omnibar-loading">{loadingMessage}</div>
          ) : (
            <div className="relative flex items-center w-full">
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
                aria-label="Address bar — enter a URL or prompt"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded flex items-center justify-center transition-colors"
                style={{ color: 'var(--bw-text-quaternary)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--bw-text-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--bw-text-quaternary)')}
                title="Go"
                aria-label="Navigate"
                onMouseDown={(e) => { e.preventDefault(); }}
              >
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
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
              className="absolute top-full left-0 right-0 mt-1 rounded-lg z-50 overflow-hidden max-h-60 overflow-y-auto"
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
                  style={{ color: 'var(--bw-text-primary)' }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleHistoryClick(item);
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bw-bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span className="material-symbols-outlined text-[14px]" style={{ color: 'var(--bw-text-quaternary)' }}>
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
                    title="Remove from history"
                    aria-label={`Remove ${item} from search history`}
                  >
                    <span className="material-symbols-outlined text-[13px]">close</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </form>

      <button
        type="button"
        onClick={onToggleBookmark}
        disabled={!canBookmark}
        className={`nav-btn ${!canBookmark ? 'disabled' : ''}`}
        style={{ color: isBookmarked ? 'var(--bw-accent)' : undefined }}
        title={isBookmarked ? 'Remove bookmark' : 'Bookmark this page'}
        aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark this page'}
      >
        <span className="material-symbols-outlined">
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
        aria-label={`Switch to ${isBrowserMode ? 'AI' : 'Web'} mode`}
      >
        <span
          className="text-[11px] font-semibold select-none"
          style={{ color: !isBrowserMode ? 'var(--bw-accent)' : 'var(--bw-text-quaternary)' }}
        >
          AI
        </span>
        <div
          className={`toggle-track ${isBrowserMode ? 'active' : ''}`}
          role="switch"
          aria-checked={isBrowserMode}
          style={{ width: '26px', height: '14px' }}
        >
          <div className="toggle-thumb" style={{ width: '10px', height: '10px', top: '1px', left: '1px', transform: isBrowserMode ? 'translateX(12px)' : 'none' }} />
        </div>
        <span
          className="text-[11px] font-semibold select-none"
          style={{ color: isBrowserMode ? 'var(--bw-green)' : 'var(--bw-text-quaternary)' }}
        >
          Web
        </span>
      </button>

      <button
        onClick={onToggleGrounding}
        className="nav-btn"
        style={{ color: isGrounded ? 'var(--bw-accent)' : undefined }}
        title={isGrounded ? 'Disable real-time browsing' : 'Enable real-time browsing'}
        aria-label={isGrounded ? 'Disable real-time browsing' : 'Enable real-time browsing'}
        aria-pressed={isGrounded}
      >
        <span className="material-symbols-outlined">language</span>
      </button>

      <div className="menu-container" ref={menuRef}>
        <button className="nav-btn" onClick={() => setMenuOpen(!menuOpen)} title="More" aria-label="More options" aria-haspopup="true" aria-expanded={menuOpen}>
          <span className="material-symbols-outlined">more_vert</span>
        </button>
        {menuOpen && (
          <div className="dropdown-menu" role="menu">
            <label className="dropdown-menu-item" onClick={(e) => e.stopPropagation()}>
              <span className="text-[13px]">Real-time browsing</span>
              <div
                className={`toggle-track ${isGrounded ? 'active' : ''}`}
                onClick={onToggleGrounding}
                role="switch"
                aria-checked={isGrounded}
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onToggleGrounding();
                  }
                }}
              >
                <div className="toggle-thumb" />
              </div>
            </label>
          </div>
        )}
      </div>
    </div>
  );
};

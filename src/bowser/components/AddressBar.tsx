import React, { useState, useEffect, useRef } from 'react';
import { Breadcrumb } from '../types';
import { parseBreadcrumb, breadcrumbToDisplay } from '../utils/urlHelpers';

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
    try {
      const stored = localStorage.getItem('flash-lite-current-input');
      return stored !== null ? stored : displayText;
    } catch {
      return displayText;
    }
  });
  const [isFocused, setIsFocused] = useState(false);
  const [hasEdited, setHasEdited] = useState(() => {
    try {
      const stored = localStorage.getItem('flash-lite-current-input');
      return stored !== null && stored !== displayText;
    } catch {
      return false;
    }
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('flash-lite-history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem('flash-lite-current-input', inputVal);
    } catch {}
  }, [inputVal]);

  const addToHistory = (query: string) => {
    setSearchHistory(prev => {
      const filtered = prev.filter(item => item !== query);
      const newHistory = [query, ...filtered].slice(0, 10);
      try {
        localStorage.setItem('flash-lite-history', JSON.stringify(newHistory));
      } catch (e) {
        console.warn('Failed to save history to localStorage', e);
      }
      return newHistory;
    });
  };

  const removeFromHistory = (query: string) => {
    setSearchHistory(prev => {
      const newHistory = prev.filter(item => item !== query);
      try {
        localStorage.setItem('flash-lite-history', JSON.stringify(newHistory));
      } catch (e) {
        console.warn('Failed to save history to localStorage', e);
      }
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

  const navigateWithQuery = (query: string) => {
    if (isBrowserMode) {
      let urlToTest = query;
      if (!/^https?:\/\//i.test(urlToTest)) {
        if (urlToTest.includes(' ')) {
          setError("Please enter a valid URL without spaces.");
          return false;
        }
        urlToTest = `https://${urlToTest}`;
      }
      
      try {
        const parsed = new URL(urlToTest);
        if (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost') {
          setError("Please enter a valid domain name.");
          return false;
        }
        setError(null);
        addToHistory(urlToTest);
        onNavigate('create', urlToTest);
        return true;
      } catch (err) {
        setError("Invalid URL format. Please check and try again.");
        return false;
      }
    } else {
      setError(null);
      addToHistory(query);
      const edited = parseBreadcrumb(query);

      if (!edited.page && breadcrumb.page) {
        onNavigate('create', edited.sitename);
      } else if (edited.sitename !== breadcrumb.sitename) {
        onNavigate('create', query);
      } else if (edited.page !== breadcrumb.page) {
        onNavigate('edit', edited.page);
      } else {
        onRefresh();
      }
      return true;
    }
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
    ? 'Generating...'
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
        <button onClick={isLoading ? onStop : onRefresh} className="nav-btn" title={isLoading ? 'Stop loading' : 'Refresh'} aria-label={isLoading ? 'Stop loading' : 'Refresh'}>
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
                className={`omnibar-input pr-10 ${error ? '!border-red-500/50 focus:!border-red-500/70 !bg-red-500/5' : ''}`}
                aria-label="Address bar — enter a URL or prompt"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9aa0a6] hover:text-[#e8eaed] p-1 rounded-full hover:bg-[#3c4043] flex items-center justify-center transition-colors"
                title="Go"
                aria-label="Navigate"
                onMouseDown={(e) => { e.preventDefault(); }}
              >
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          )}
          {error && (
            <div className="absolute top-full left-0 mt-1 bg-[#2a1010] text-red-400 text-xs px-3 py-1.5 rounded-md border border-red-500/20 whitespace-nowrap z-50 shadow-lg">
              {error}
            </div>
          )}
          {isFocused && searchHistory.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#292a2d] border border-[#3c4043] rounded-lg shadow-lg z-50 overflow-hidden max-h-60 overflow-y-auto">
              {searchHistory.map((item, idx) => (
                <div
                  key={idx}
                  className="px-4 py-2 text-sm text-[#e8eaed] hover:bg-[#3c4043] cursor-pointer flex items-center gap-3"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleHistoryClick(item);
                  }}
                >
                  <span className="material-symbols-outlined text-[16px] text-[#9aa0a6]">
                    {item.startsWith('http') ? 'public' : 'history'}
                  </span>
                  <span className="truncate flex-1">{item}</span>
                  <button 
                    className="ml-auto text-[#9aa0a6] hover:text-[#e8eaed] p-1 rounded-full hover:bg-[#4a4d51] flex items-center justify-center"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeFromHistory(item);
                    }}
                    title="Remove from history"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
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
        className={`nav-btn ${isBookmarked ? 'text-blue-400' : ''} ${!canBookmark ? 'disabled' : ''}`}
        title={isBookmarked ? 'Remove bookmark' : 'Bookmark this page'}
        aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark this page'}
      >
        <span className="material-symbols-outlined">
          {isBookmarked ? 'star' : 'star_border'}
        </span>
      </button>

      <div className="flex items-center gap-2 ml-2 mr-2 bg-[#1e1f23] px-3 py-1.5 rounded-full border border-white/10 hover:border-white/20 transition-colors cursor-pointer" onClick={onToggleBrowserMode}>
        <span className={`text-xs font-medium select-none ${!isBrowserMode ? 'text-blue-400' : 'text-gray-500'}`}>AI</span>
        <div
          className={`toggle-track ${isBrowserMode ? 'active' : ''}`}
          role="switch"
          aria-checked={isBrowserMode}
          style={{ width: '28px', height: '16px' }}
        >
          <div className="toggle-thumb" style={{ width: '12px', height: '12px', top: '2px', left: '2px', transform: isBrowserMode ? 'translateX(12px)' : 'none' }} />
        </div>
        <span className={`text-xs font-medium select-none ${isBrowserMode ? 'text-blue-400' : 'text-gray-500'}`}>Web</span>
      </div>

      <button
        onClick={onToggleGrounding}
        className={`nav-btn ${isGrounded ? 'text-blue-400' : ''}`}
        title={isGrounded ? 'Disable Real-time Web Browsing' : 'Enable Real-time Web Browsing'}
        aria-label={isGrounded ? 'Disable Real-time Web Browsing' : 'Enable Real-time Web Browsing'}
        aria-pressed={isGrounded}
      >
        <span className="material-symbols-outlined">language</span>
      </button>

      <div className="menu-container" ref={menuRef}>
        <button className="nav-btn" onClick={() => setMenuOpen(!menuOpen)} title="More options" aria-label="More options" aria-haspopup="true" aria-expanded={menuOpen}>
          <span className="material-symbols-outlined">more_vert</span>
        </button>
        {menuOpen && (
          <div className="dropdown-menu" role="menu">
            <label className="dropdown-menu-item" onClick={(e) => e.stopPropagation()}>
              <span>Real-time Web Browsing</span>
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

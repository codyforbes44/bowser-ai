import React, { useState, useMemo } from 'react';
import { Bookmark, HistoryEntry, TabKind } from '../types';
import { InstallPrompt } from './InstallPrompt';
import { getRecentPrompts } from '../store/session';

interface NewTabProps {
  onCreatePage: (prompt: string) => void;
  isGrounded: boolean;
  onToggleGrounding: () => void;
  bookmarks: Bookmark[];
  onNavigateToBookmark: (url: string, tabKind: TabKind) => void;
  onOpenBookmarks: () => void;
  history: HistoryEntry[];
  onShowOnboarding?: () => void;
  isBrowserMode?: boolean;
  onToggleBrowserMode?: () => void;
  onOpenSettings?: () => void;
}

export const NewTab: React.FC<NewTabProps> = ({
  onCreatePage,
  isGrounded,
  onToggleGrounding,
  bookmarks,
  onNavigateToBookmark,
  onOpenBookmarks,
  history,
  onShowOnboarding,
  isBrowserMode,
  onToggleBrowserMode,
  onOpenSettings,
}) => {
  const [prompt, setPrompt] = useState('');

  const recentPrompts = useMemo(() => getRecentPrompts().slice(0, 5), []);

  const recentActivity = useMemo(() => {
    const seen = new Set<string>();
    return history.filter(e => {
      if (seen.has(e.title)) return false;
      seen.add(e.title);
      return true;
    }).slice(0, 4);
  }, [history]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) onCreatePage(prompt.trim());
  };

  const topBookmarks = bookmarks.slice(0, 8);
  const isFirstRun = !recentPrompts.length && !recentActivity.length && !topBookmarks.length;

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="newtab-page overflow-y-auto">
      <div className="newtab-content min-h-full py-8 md:py-16 pb-20 md:pb-16">
        {/* Wordmark */}
        <div className="flex flex-col items-center gap-1 mb-4">
          <h1
            className="text-[24px] font-semibold"
            style={{ color: 'var(--bw-text-primary)', letterSpacing: '-0.03em' }}
          >
            Bowser
          </h1>
          {isFirstRun && (
            <p className="text-[12px] mt-1" style={{ color: 'var(--bw-text-tertiary)' }}>
              Search the web or create anything.
            </p>
          )}
        </div>

        {/* Omnibox */}
        <form onSubmit={handleSubmit} className="newtab-form">
          <div className="newtab-input-row">
            <input
              type="text"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              className="newtab-input"
              placeholder={isBrowserMode ? 'Search or go to a URL' : 'Create anything…'}
              aria-label="Search or create anything"
              autoFocus
            />
            <button type="submit" className="newtab-submit" aria-label="Go">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }} aria-hidden="true">arrow_forward</span>
            </button>
          </div>
        </form>

        {/* Mode + grounding controls */}
        <div className="flex items-center justify-center gap-2 mt-3">
          {onToggleBrowserMode && (
            <button
              onClick={onToggleBrowserMode}
              className="bw-chip bw-hover-bg"
              title={isBrowserMode ? 'Switch to Create mode' : 'Switch to Web mode'}
            >
              <span className="material-symbols-outlined icon-sm" aria-hidden="true">
                {isBrowserMode ? 'public' : 'auto_awesome'}
              </span>
              {isBrowserMode ? 'Web' : 'Create'}
            </button>
          )}

          <button
            onClick={onToggleGrounding}
            className="bw-chip"
            style={{
              borderColor: isGrounded ? 'var(--bw-accent)' : undefined,
              color: isGrounded ? 'var(--bw-accent)' : undefined,
              background: isGrounded ? 'var(--bw-accent-subtle)' : undefined,
            }}
            title={isGrounded ? 'Live data enabled' : 'Enable live data'}
          >
            <span className="material-symbols-outlined icon-sm" aria-hidden="true">language</span>
            Live data {isGrounded ? 'on' : 'off'}
          </button>
        </div>

        <InstallPrompt />

        {/* First-run quick-start chips */}
        {isFirstRun && (
          <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
            <QuickChip
              icon="search"
              label="Search DuckDuckGo"
              onClick={() => onCreatePage('https://duckduckgo.com')}
            />
            <QuickChip
              icon="public"
              label="Open Hacker News"
              onClick={() => onCreatePage('https://news.ycombinator.com')}
            />
            {onToggleBrowserMode && (
              <QuickChip
                icon="auto_awesome"
                label="Try Create mode"
                onClick={() => {
                  if (isBrowserMode) onToggleBrowserMode();
                }}
              />
            )}
            {onOpenSettings && (
              <QuickChip
                icon="keyboard"
                label="Keyboard shortcuts"
                onClick={onOpenSettings}
              />
            )}
          </div>
        )}

        {/* Pinned bookmarks */}
        {topBookmarks.length > 0 && (
          <div className="mt-8 w-full max-w-md">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[11px] font-medium uppercase tracking-widest" style={{ color: 'var(--bw-text-quaternary)' }}>
                Favorites
              </h2>
              {bookmarks.length > 8 && (
                <button
                  onClick={onOpenBookmarks}
                  className="text-[11px] font-medium bw-hover-text"
                  style={{ color: 'var(--bw-text-quaternary)', transition: 'color 0.1s ease' }}
                >
                  View all
                </button>
              )}
            </div>
            <div className="newtab-bookmark-grid grid grid-cols-4 gap-2">
              {topBookmarks.map(bm => (
                <button
                  key={bm.id}
                  onClick={() => onNavigateToBookmark(bm.url, bm.tabKind)}
                  className="flex flex-col items-center gap-1.5 p-2.5 min-h-[44px] rounded-md bw-hover-bg"
                  style={{ background: 'transparent', transition: 'background 0.12s ease' }}
                  title={bm.title}
                >
                  <span
                    className="material-symbols-outlined icon-lg"
                    style={{ color: bm.tabKind === 'web' ? 'var(--bw-green)' : 'var(--bw-accent)', opacity: 0.7 }}
                    aria-hidden="true"
                  >
                    {bm.tabKind === 'web' ? 'public' : 'auto_awesome'}
                  </span>
                  <span className="text-[11px] truncate w-full text-center" style={{ color: 'var(--bw-text-tertiary)' }}>
                    {bm.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent prompts */}
        {recentPrompts.length > 0 && (
          <div className="mt-8 w-full max-w-md">
            <h2 className="text-[11px] font-medium uppercase tracking-widest mb-2" style={{ color: 'var(--bw-text-quaternary)' }}>
              Recent
            </h2>
            <div className="space-y-px">
              {recentPrompts.map((p, i) => (
                <button
                  key={i}
                  onClick={() => onCreatePage(p)}
                  className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 min-h-[44px] rounded-md bw-hover-bg"
                  style={{ background: 'transparent', transition: 'background 0.12s ease' }}
                >
                  <span className="material-symbols-outlined icon-sm flex-shrink-0" style={{ color: 'var(--bw-text-quaternary)' }} aria-hidden="true">auto_awesome</span>
                  <span className="text-[12px] truncate flex-1" style={{ color: 'var(--bw-text-secondary)' }}>{p}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Continue browsing */}
        {recentActivity.length > 0 && (
          <div className="mt-6 w-full max-w-md">
            <h2 className="text-[11px] font-medium uppercase tracking-widest mb-2" style={{ color: 'var(--bw-text-quaternary)' }}>
              Continue browsing
            </h2>
            <div className="space-y-px">
              {recentActivity.map(entry => (
                <button
                  key={entry.id}
                  onClick={() => onNavigateToBookmark(entry.url, entry.tabKind)}
                  className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 min-h-[44px] rounded-md bw-hover-bg"
                  style={{ background: 'transparent', transition: 'background 0.12s ease' }}
                >
                  <span className="material-symbols-outlined icon-sm flex-shrink-0" style={{ color: 'var(--bw-text-quaternary)' }} aria-hidden="true">
                    {entry.tabKind === 'web' ? 'public' : 'auto_awesome'}
                  </span>
                  <span className="text-[12px] truncate flex-1" style={{ color: 'var(--bw-text-secondary)' }}>{entry.title}</span>
                  <span className="text-[11px] flex-shrink-0 tabular-nums" style={{ color: 'var(--bw-text-quaternary)' }}>{formatTime(entry.timestamp)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Learn more link for first run */}
        {isFirstRun && onShowOnboarding && (
          <button
            onClick={onShowOnboarding}
            className="mt-6 text-[12px] font-medium bw-hover-accent"
            style={{ color: 'var(--bw-text-quaternary)', transition: 'color 0.1s ease' }}
          >
            Learn how Bowser works
          </button>
        )}
      </div>
    </div>
  );
};

const QuickChip: React.FC<{ icon: string; label: string; onClick: () => void }> = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="bw-chip bw-hover-bg min-h-[44px]"
    style={{ touchAction: 'manipulation' }}
  >
    <span className="material-symbols-outlined icon-sm" aria-hidden="true">{icon}</span>
    {label}
  </button>
);

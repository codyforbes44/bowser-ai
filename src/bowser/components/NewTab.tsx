import React, { useState, useMemo } from 'react';
import { Bookmark, HistoryEntry, TabKind } from '../types';
import { InstallPrompt } from './InstallPrompt';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { getRecentPrompts } from '../store/session';

interface NewTabProps {
  onCreatePage: (prompt: string) => void;
  onWebNavigate: (query: string) => void;
  isGrounded: boolean;
  onToggleGrounding: () => void;
  bookmarks: Bookmark[];
  onNavigateToBookmark: (url: string, tabKind: TabKind) => void;
  onOpenBookmarks: () => void;
  history: HistoryEntry[];
  onShowOnboarding?: () => void;
  onOpenSettings?: () => void;
}

export const NewTab: React.FC<NewTabProps> = ({
  onCreatePage,
  onWebNavigate,
  isGrounded,
  onToggleGrounding,
  bookmarks,
  onNavigateToBookmark,
  onOpenBookmarks,
  history,
  onShowOnboarding,
  onOpenSettings,
}) => {
  const [prompt, setPrompt] = useState('');
  const [localBrowserMode, setLocalBrowserMode] = useState(true);
  const { canInstall, triggerInstall } = useInstallPrompt();

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
    if (!prompt.trim()) return;
    if (localBrowserMode) {
      onWebNavigate(prompt.trim());
    } else {
      onCreatePage(prompt.trim());
    }
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

        {isFirstRun ? (
          <FirstRunLanding
            prompt={prompt}
            setPrompt={setPrompt}
            onSubmit={handleSubmit}
            isBrowserMode={localBrowserMode}
            isGrounded={isGrounded}
            onToggleGrounding={onToggleGrounding}
            onToggleBrowserMode={() => setLocalBrowserMode(prev => !prev)}
            canInstall={canInstall}
            onInstall={triggerInstall}
            onShowOnboarding={onShowOnboarding}
            onOpenSettings={onOpenSettings}
            onWebNavigate={onWebNavigate}
          />
        ) : (
          <ReturningUserView
            prompt={prompt}
            setPrompt={setPrompt}
            onSubmit={handleSubmit}
            isBrowserMode={localBrowserMode}
            isGrounded={isGrounded}
            onToggleGrounding={onToggleGrounding}
            onToggleBrowserMode={() => setLocalBrowserMode(prev => !prev)}
            topBookmarks={topBookmarks}
            bookmarks={bookmarks}
            onNavigateToBookmark={onNavigateToBookmark}
            onOpenBookmarks={onOpenBookmarks}
            recentPrompts={recentPrompts}
            recentActivity={recentActivity}
            onCreatePage={onCreatePage}
            formatTime={formatTime}
          />
        )}
      </div>
    </div>
  );
};

/* ─── First-Run Install Landing ─── */

const FirstRunLanding: React.FC<{
  prompt: string;
  setPrompt: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isBrowserMode?: boolean;
  isGrounded: boolean;
  onToggleGrounding: () => void;
  onToggleBrowserMode?: () => void;
  canInstall: boolean;
  onInstall: () => void;
  onShowOnboarding?: () => void;
  onOpenSettings?: () => void;
  onWebNavigate: (query: string) => void;
}> = ({
  prompt, setPrompt, onSubmit, isBrowserMode, isGrounded,
  onToggleGrounding, onToggleBrowserMode, canInstall, onInstall,
  onShowOnboarding, onOpenSettings, onWebNavigate,
}) => (
  <>
    {/* Icon + Wordmark */}
    <div className="flex flex-col items-center gap-3 mb-6">
      <img
        src="/pwa-192x192.png"
        alt="Bowser"
        className="w-16 h-16 rounded-2xl"
        style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}
      />
      <div className="text-center">
        <h1
          className="text-[28px] font-semibold"
          style={{ color: 'var(--bw-text-primary)', letterSpacing: '-0.03em' }}
        >
          Bowser
        </h1>
        <p className="text-[13px] mt-1 max-w-[280px] leading-relaxed" style={{ color: 'var(--bw-text-tertiary)' }}>
          Your AI-powered browser. Search, create, and explore — all in one place.
        </p>
      </div>
    </div>

    {/* Omnibox */}
    <Omnibox
      prompt={prompt}
      setPrompt={setPrompt}
      onSubmit={onSubmit}
      isBrowserMode={isBrowserMode}
      isGrounded={isGrounded}
      onToggleGrounding={onToggleGrounding}
      onToggleBrowserMode={onToggleBrowserMode}
    />

    <p className="text-[12px] mt-2" style={{ color: 'var(--bw-text-quaternary)' }}>
      Or,{' '}
      <button
        onClick={() => onWebNavigate('https://google.com')}
        className="underline transition-colors"
        style={{ color: 'var(--bw-text-tertiary)' }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--bw-text-primary)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--bw-text-tertiary)')}
      >
        continue to Google Search.
      </button>
    </p>

    {/* Feature highlights */}
    <div className="mt-10 w-full max-w-sm space-y-3">
      <FeatureRow icon="auto_awesome" title="Create mode" desc="Generate any webpage instantly with AI" />
      <FeatureRow icon="public" title="Web mode" desc="Browse the real web with built-in search" />
      <FeatureRow icon="language" title="Live data" desc="Ground AI responses with real-time information" />
    </div>

    {/* Install CTA */}
    {canInstall && (
      <button
        onClick={onInstall}
        className="mt-8 flex items-center gap-2 px-6 py-3 text-[14px] font-semibold min-h-[48px]"
        style={{
          background: 'var(--bw-accent)',
          color: '#fff',
          borderRadius: 'var(--bw-radius-md)',
          transition: 'opacity 0.15s ease',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '20px' }} aria-hidden="true">download</span>
        Install Bowser
      </button>
    )}

    {/* Quick-start chips */}
    <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
      {onOpenSettings && (
        <QuickChip icon="keyboard" label="Shortcuts" onClick={onOpenSettings} />
      )}
      {onShowOnboarding && (
        <QuickChip icon="help_outline" label="How it works" onClick={onShowOnboarding} />
      )}
    </div>
  </>
);

/* ─── Returning User View ─── */

const ReturningUserView: React.FC<{
  prompt: string;
  setPrompt: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isBrowserMode?: boolean;
  isGrounded: boolean;
  onToggleGrounding: () => void;
  onToggleBrowserMode?: () => void;
  topBookmarks: import('../types').Bookmark[];
  bookmarks: import('../types').Bookmark[];
  onNavigateToBookmark: (url: string, tabKind: TabKind) => void;
  onOpenBookmarks: () => void;
  recentPrompts: string[];
  recentActivity: import('../types').HistoryEntry[];
  onCreatePage: (prompt: string) => void;
  formatTime: (ts: number) => string;
}> = ({
  prompt, setPrompt, onSubmit, isBrowserMode, isGrounded,
  onToggleGrounding, onToggleBrowserMode, topBookmarks, bookmarks,
  onNavigateToBookmark, onOpenBookmarks, recentPrompts, recentActivity,
  onCreatePage, formatTime,
}) => (
  <>
    {/* Wordmark */}
    <div className="flex flex-col items-center gap-1 mb-4">
      <h1
        className="text-[24px] font-semibold"
        style={{ color: 'var(--bw-text-primary)', letterSpacing: '-0.03em' }}
      >
        Bowser
      </h1>
    </div>

    {/* Omnibox */}
    <Omnibox
      prompt={prompt}
      setPrompt={setPrompt}
      onSubmit={onSubmit}
      isBrowserMode={isBrowserMode}
      isGrounded={isGrounded}
      onToggleGrounding={onToggleGrounding}
      onToggleBrowserMode={onToggleBrowserMode}
    />

    <InstallPrompt />

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
  </>
);

/* ─── Shared Omnibox ─── */

const Omnibox: React.FC<{
  prompt: string;
  setPrompt: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isBrowserMode?: boolean;
  isGrounded: boolean;
  onToggleGrounding: () => void;
  onToggleBrowserMode?: () => void;
}> = ({ prompt, setPrompt, onSubmit, isBrowserMode, isGrounded, onToggleGrounding, onToggleBrowserMode }) => (
  <>
    <form onSubmit={onSubmit} className="newtab-form">
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
  </>
);

/* ─── Small Components ─── */

const FeatureRow: React.FC<{ icon: string; title: string; desc: string }> = ({ icon, title, desc }) => (
  <div
    className="flex items-center gap-3 px-4 py-3 rounded-lg"
    style={{ background: 'var(--bw-bg-surface)' }}
  >
    <span
      className="material-symbols-outlined"
      style={{ fontSize: '22px', color: 'var(--bw-accent)', opacity: 0.85 }}
      aria-hidden="true"
    >
      {icon}
    </span>
    <div className="min-w-0">
      <p className="text-[13px] font-medium" style={{ color: 'var(--bw-text-primary)' }}>{title}</p>
      <p className="text-[11px]" style={{ color: 'var(--bw-text-tertiary)' }}>{desc}</p>
    </div>
  </div>
);

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

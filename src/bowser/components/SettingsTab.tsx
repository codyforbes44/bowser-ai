import React from 'react';
import { getStorageItem, setStorageItem } from '../utils/storage';
import { markOnboardingComplete } from './OnboardingModal';
import { SearchEngine, SEARCH_ENGINES, getSearchEngine } from '../hooks/useOmnibox';
import { FontSize, TabLimit, getFontSize, setFontSize, getTabLimit, setTabLimit, setSearchEngineSetting } from '../hooks/useBowserSettings';

export type BowserTheme = 'dark' | 'light' | 'system';

export function getEffectiveTheme(): BowserTheme {
  return getStorageItem<BowserTheme>('theme', 'dark');
}

export function applyBowserTheme(theme: BowserTheme) {
  const root = document.documentElement;
  const effective = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : theme;
  root.setAttribute('data-bowser-theme', effective);
}

const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.userAgent);
const mod = isMac ? '⌘' : 'Ctrl';

const SHORTCUTS = [
  { keys: `${mod}+K`, description: 'Command palette' },
  { keys: `${mod}+L`, description: 'Focus address bar' },
  { keys: `${mod}+T`, description: 'New tab' },
  { keys: `${mod}+Shift+T`, description: 'Reopen closed tab' },
  { keys: `${mod}+W`, description: 'Close tab' },
  { keys: `${mod}+1–9`, description: 'Switch to tab' },
];

interface SettingsTabProps {
  onClearHistory?: () => void;
  onClearBookmarks?: () => void;
  onShowOnboarding?: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ onClearHistory, onClearBookmarks, onShowOnboarding }) => {
  const [theme, setTheme] = React.useState<BowserTheme>(getEffectiveTheme);
  const [fontSize, setFontSizeState] = React.useState<FontSize>(getFontSize);
  const [tabLimit, setTabLimitState] = React.useState<TabLimit>(getTabLimit);
  const [searchEngine, setSearchEngineState] = React.useState<SearchEngine>(getSearchEngine);
  const [confirmClearHistory, setConfirmClearHistory] = React.useState(false);
  const [confirmClearBookmarks, setConfirmClearBookmarks] = React.useState(false);

  const handleThemeChange = (newTheme: BowserTheme) => {
    setTheme(newTheme);
    setStorageItem('theme', newTheme);
    applyBowserTheme(newTheme);
  };

  const handleFontSizeChange = (size: FontSize) => {
    setFontSizeState(size);
    setFontSize(size);
  };

  const handleTabLimitChange = (limit: TabLimit) => {
    setTabLimitState(limit);
    setTabLimit(limit);
  };

  const handleSearchEngineChange = (engine: SearchEngine) => {
    setSearchEngineState(engine);
    setSearchEngineSetting(engine);
  };

  const handleResetOnboarding = () => {
    setStorageItem('onboarding-complete', false);
    onShowOnboarding?.();
  };

  return (
    <div className="w-full h-full overflow-y-auto" style={{ background: 'var(--bw-bg-app)', color: 'var(--bw-text-primary)' }}>
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2.5 mb-8">
          <span className="material-symbols-outlined text-lg" style={{ color: 'var(--bw-text-quaternary)' }} aria-hidden="true">settings</span>
          <h1 className="text-lg font-semibold tracking-tight" style={{ letterSpacing: '-0.02em' }}>Settings</h1>
        </div>

        <div className="space-y-6">
          {/* Search engine */}
          <section className="settings-section">
            <h2 className="settings-heading">
              <span className="material-symbols-outlined text-base" style={{ color: 'var(--bw-text-quaternary)' }} aria-hidden="true">search</span>
              Search engine
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--bw-text-primary)' }}>Default search engine</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--bw-text-quaternary)' }}>Used when you type a search query in the address bar.</p>
              </div>
              <div className="flex gap-1 flex-wrap justify-end">
                {(Object.entries(SEARCH_ENGINES) as [SearchEngine, { name: string }][]).map(([key, { name }]) => (
                  <button
                    key={key}
                    onClick={() => handleSearchEngineChange(key)}
                    className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                    style={{
                      background: searchEngine === key ? 'var(--bw-accent)' : 'transparent',
                      color: searchEngine === key ? '#ffffff' : 'var(--bw-text-tertiary)',
                      border: `1px solid ${searchEngine === key ? 'var(--bw-accent)' : 'var(--bw-border)'}`,
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Appearance */}
          <section className="settings-section">
            <h2 className="settings-heading">
              <span className="material-symbols-outlined text-base" style={{ color: 'var(--bw-text-quaternary)' }} aria-hidden="true">palette</span>
              Appearance
            </h2>
            <div className="space-y-4">
              {/* Theme */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: 'var(--bw-text-primary)' }}>Theme</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--bw-text-quaternary)' }}>Choose light, dark, or match your system.</p>
                </div>
                <div className="flex gap-1">
                  {(['dark', 'light', 'system'] as BowserTheme[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => handleThemeChange(t)}
                      className="px-3 py-1.5 rounded-md text-xs capitalize transition-colors font-medium"
                      style={{
                        background: theme === t ? 'var(--bw-accent)' : 'transparent',
                        color: theme === t ? '#ffffff' : 'var(--bw-text-tertiary)',
                        border: `1px solid ${theme === t ? 'var(--bw-accent)' : 'var(--bw-border)'}`,
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font size */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: 'var(--bw-text-primary)' }}>Font size</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--bw-text-quaternary)' }}>Adjust text size across the interface.</p>
                </div>
                <div className="flex gap-1">
                  {(['small', 'medium', 'large'] as FontSize[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => handleFontSizeChange(s)}
                      className="px-3 py-1.5 rounded-md text-xs capitalize transition-colors font-medium"
                      style={{
                        background: fontSize === s ? 'var(--bw-accent)' : 'transparent',
                        color: fontSize === s ? '#ffffff' : 'var(--bw-text-tertiary)',
                        border: `1px solid ${fontSize === s ? 'var(--bw-accent)' : 'var(--bw-border)'}`,
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Tabs */}
          <section className="settings-section">
            <h2 className="settings-heading">
              <span className="material-symbols-outlined text-base" style={{ color: 'var(--bw-text-quaternary)' }} aria-hidden="true">tab</span>
              Tabs
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--bw-text-primary)' }}>Maximum tabs</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--bw-text-quaternary)' }}>Limit the number of tabs you can have open at once.</p>
              </div>
              <div className="flex gap-1">
                {([5, 10, 20, 0] as TabLimit[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => handleTabLimitChange(l)}
                    className="px-3 py-1.5 rounded-md text-xs transition-colors font-medium"
                    style={{
                      background: tabLimit === l ? 'var(--bw-accent)' : 'transparent',
                      color: tabLimit === l ? '#ffffff' : 'var(--bw-text-tertiary)',
                      border: `1px solid ${tabLimit === l ? 'var(--bw-accent)' : 'var(--bw-border)'}`,
                    }}
                  >
                    {l === 0 ? '∞' : l}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Keyboard Shortcuts */}
          <section className="settings-section">
            <h2 className="settings-heading">
              <span className="material-symbols-outlined text-base" style={{ color: 'var(--bw-text-quaternary)' }} aria-hidden="true">keyboard</span>
              Keyboard shortcuts
            </h2>
            <div className="space-y-0">
              {SHORTCUTS.map((s, i) => (
                <div
                  key={s.keys}
                  className="flex items-center justify-between py-2.5"
                  style={{ borderBottom: i < SHORTCUTS.length - 1 ? '1px solid var(--bw-border-subtle)' : 'none' }}
                >
                  <span className="text-sm" style={{ color: 'var(--bw-text-secondary)' }}>{s.description}</span>
                  <kbd
                    className="px-2 py-0.5 rounded text-[11px] font-medium"
                    style={{
                      background: 'var(--bw-bg-hover)',
                      border: '1px solid var(--bw-border)',
                      color: 'var(--bw-text-tertiary)',
                      fontFamily: 'var(--bw-font-mono)',
                    }}
                  >
                    {s.keys}
                  </kbd>
                </div>
              ))}
            </div>
          </section>

          {/* Data & Privacy */}
          <section className="settings-section">
            <h2 className="settings-heading">
              <span className="material-symbols-outlined text-base" style={{ color: 'var(--bw-text-quaternary)' }} aria-hidden="true">shield</span>
              Data &amp; privacy
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: 'var(--bw-text-primary)' }}>Clear history</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--bw-text-quaternary)' }}>Remove all browsing history and saved prompts.</p>
                </div>
                {confirmClearHistory ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => { onClearHistory?.(); setConfirmClearHistory(false); }}
                      className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
                      style={{ color: '#fff', background: 'var(--bw-red)' }}
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirmClearHistory(false)}
                      className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
                      style={{ color: 'var(--bw-text-tertiary)', border: '1px solid var(--bw-border)' }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmClearHistory(true)}
                    className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
                    style={{ color: 'var(--bw-text-secondary)', border: '1px solid var(--bw-border)', background: 'transparent' }}
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: 'var(--bw-text-primary)' }}>Clear bookmarks</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--bw-text-quaternary)' }}>Remove all saved bookmarks.</p>
                </div>
                {confirmClearBookmarks ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => { onClearBookmarks?.(); setConfirmClearBookmarks(false); }}
                      className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
                      style={{ color: '#fff', background: 'var(--bw-red)' }}
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirmClearBookmarks(false)}
                      className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
                      style={{ color: 'var(--bw-text-tertiary)', border: '1px solid var(--bw-border)' }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmClearBookmarks(true)}
                    className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
                    style={{ color: 'var(--bw-text-secondary)', border: '1px solid var(--bw-border)', background: 'transparent' }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* About */}
          <section className="settings-section">
            <h2 className="settings-heading">
              <span className="material-symbols-outlined text-base" style={{ color: 'var(--bw-text-quaternary)' }} aria-hidden="true">info</span>
              About Bowser
            </h2>
            <div className="space-y-4">
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--bw-text-tertiary)' }}>
                Bowser is an experimental AI browser. Pages are generated in real time by Gemini — they don't exist until you ask for them. Results may vary.
              </p>
              <div className="flex items-center gap-4">
                <span className="text-[12px] font-medium px-2 py-0.5 rounded" style={{ background: 'var(--bw-bg-hover)', color: 'var(--bw-text-quaternary)', fontFamily: 'var(--bw-font-mono)' }}>
                  v1.0.0
                </span>
                <a
                  href="https://bowser-build-buddy.lovable.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12px] font-medium transition-colors"
                  style={{ color: 'var(--bw-accent)' }}
                >
                  bowser-build-buddy.lovable.app
                </a>
              </div>
              {onShowOnboarding && (
                <button
                  onClick={handleResetOnboarding}
                  className="text-[13px] font-medium transition-colors"
                  style={{ color: 'var(--bw-accent)' }}
                >
                  Replay welcome tour
                </button>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

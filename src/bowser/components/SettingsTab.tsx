import React from 'react';
import { getStorageItem, setStorageItem } from '../utils/storage';

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
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ onClearHistory }) => {
  const [theme, setTheme] = React.useState<BowserTheme>(getEffectiveTheme);

  const handleThemeChange = (newTheme: BowserTheme) => {
    setTheme(newTheme);
    setStorageItem('theme', newTheme);
    applyBowserTheme(newTheme);
  };

  return (
    <div className="w-full h-full overflow-y-auto" style={{ background: 'var(--bw-bg-app)', color: 'var(--bw-text-primary)' }}>
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2.5 mb-8">
          <span className="material-symbols-outlined text-lg" style={{ color: 'var(--bw-text-quaternary)' }}>settings</span>
          <h1 className="text-lg font-semibold tracking-tight" style={{ letterSpacing: '-0.02em' }}>Settings</h1>
        </div>

        <div className="space-y-6">
          {/* Appearance */}
          <section
            className="p-5 rounded-lg"
            style={{ background: 'var(--bw-bg-surface)', border: '1px solid var(--bw-border-subtle)' }}
          >
            <h2 className="text-sm font-medium mb-4 flex items-center gap-2" style={{ color: 'var(--bw-text-primary)' }}>
              <span className="material-symbols-outlined text-base" style={{ color: 'var(--bw-text-quaternary)' }}>palette</span>
              Appearance
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--bw-text-primary)' }}>Theme</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--bw-text-quaternary)' }}>Choose your color scheme.</p>
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
          </section>

          {/* Keyboard Shortcuts */}
          <section
            className="p-5 rounded-lg"
            style={{ background: 'var(--bw-bg-surface)', border: '1px solid var(--bw-border-subtle)' }}
          >
            <h2 className="text-sm font-medium mb-4 flex items-center gap-2" style={{ color: 'var(--bw-text-primary)' }}>
              <span className="material-symbols-outlined text-base" style={{ color: 'var(--bw-text-quaternary)' }}>keyboard</span>
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

          {/* Privacy */}
          <section
            className="p-5 rounded-lg"
            style={{ background: 'var(--bw-bg-surface)', border: '1px solid var(--bw-border-subtle)' }}
          >
            <h2 className="text-sm font-medium mb-4 flex items-center gap-2" style={{ color: 'var(--bw-text-primary)' }}>
              <span className="material-symbols-outlined text-base" style={{ color: 'var(--bw-text-quaternary)' }}>shield</span>
              Privacy
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--bw-text-primary)' }}>Clear browsing data</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--bw-text-quaternary)' }}>Remove history and cached data.</p>
              </div>
              <button
                onClick={onClearHistory}
                className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
                style={{
                  color: 'var(--bw-text-secondary)',
                  border: '1px solid var(--bw-border)',
                  background: 'transparent',
                }}
              >
                Clear data
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

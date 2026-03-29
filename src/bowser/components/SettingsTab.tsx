import React from 'react';
import { getStorageItem, setStorageItem } from '../utils/storage';
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
  { keys: `${mod}+T`, description: 'New tab' },
  { keys: `${mod}+W`, description: 'Close tab' },
  { keys: `${mod}+L`, description: 'Focus address bar' },
  { keys: `${mod}+K`, description: 'Command palette' },
  { keys: `${mod}+Shift+T`, description: 'Reopen closed tab' },
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
  const [showShortcuts, setShowShortcuts] = React.useState(false);

  const handleThemeChange = (t: BowserTheme) => { setTheme(t); setStorageItem('theme', t); applyBowserTheme(t); };
  const handleFontSizeChange = (s: FontSize) => { setFontSizeState(s); setFontSize(s); };
  const handleTabLimitChange = (l: TabLimit) => { setTabLimitState(l); setTabLimit(l); };
  const handleSearchEngineChange = (e: SearchEngine) => { setSearchEngineState(e); setSearchEngineSetting(e); };

  return (
    <div className="w-full h-full overflow-y-auto" style={{ background: 'var(--bw-bg-app)', color: 'var(--bw-text-primary)' }}>
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2.5 mb-8" style={{ height: '40px', borderBottom: '1px solid var(--bw-border-subtle)', paddingBottom: '12px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--bw-text-quaternary)' }} aria-hidden="true">settings</span>
          <h1 className="text-[14px] font-semibold" style={{ letterSpacing: '-0.02em' }}>Settings</h1>
        </div>

        <div className="space-y-6">
          {/* Appearance */}
          <SettingsSection icon="palette" title="Appearance">
            <SettingsRow label="Theme" description="Choose light, dark, or match your system.">
              <SegmentedButtons options={['dark', 'light', 'system']} value={theme} onChange={v => handleThemeChange(v as BowserTheme)} />
            </SettingsRow>
            <SettingsRow label="Font size" description="Adjust text size across the interface.">
              <SegmentedButtons options={['small', 'medium', 'large']} value={fontSize} onChange={v => handleFontSizeChange(v as FontSize)} />
            </SettingsRow>
          </SettingsSection>

          {/* Search */}
          <SettingsSection icon="search" title="Search">
            <SettingsRow label="Default search engine" description="Used for search queries in the address bar.">
              <div className="flex gap-1 flex-wrap justify-end">
                {(Object.entries(SEARCH_ENGINES) as [SearchEngine, { name: string }][]).map(([key, { name }]) => (
                  <SegmentedButton key={key} label={name} active={searchEngine === key} onClick={() => handleSearchEngineChange(key)} />
                ))}
              </div>
            </SettingsRow>
          </SettingsSection>

          {/* Tabs */}
          <SettingsSection icon="tab" title="Tabs">
            <SettingsRow label="Maximum tabs" description="Limit open tabs at once.">
              <div className="flex gap-1">
                {([5, 10, 20, 0] as TabLimit[]).map(l => (
                  <SegmentedButton key={l} label={l === 0 ? '∞' : String(l)} active={tabLimit === l} onClick={() => handleTabLimitChange(l)} />
                ))}
              </div>
            </SettingsRow>
          </SettingsSection>

          {/* Privacy */}
          <SettingsSection icon="shield" title="Privacy">
            <SettingsRow label="Clear history" description="Remove all browsing history.">
              {confirmClearHistory ? (
                <div className="flex gap-2">
                  <button onClick={() => { onClearHistory?.(); setConfirmClearHistory(false); }} className="px-3 py-1 text-[12px] font-medium rounded" style={{ color: '#fff', background: 'var(--bw-red)' }}>Confirm</button>
                  <button onClick={() => setConfirmClearHistory(false)} className="px-3 py-1 text-[12px] font-medium rounded" style={{ color: 'var(--bw-text-tertiary)', border: '1px solid var(--bw-border)' }}>Cancel</button>
                </div>
              ) : (
                <ActionButton label="Clear" onClick={() => setConfirmClearHistory(true)} />
              )}
            </SettingsRow>
            <SettingsRow label="Clear bookmarks" description="Remove all saved bookmarks.">
              {confirmClearBookmarks ? (
                <div className="flex gap-2">
                  <button onClick={() => { onClearBookmarks?.(); setConfirmClearBookmarks(false); }} className="px-3 py-1 text-[12px] font-medium rounded" style={{ color: '#fff', background: 'var(--bw-red)' }}>Confirm</button>
                  <button onClick={() => setConfirmClearBookmarks(false)} className="px-3 py-1 text-[12px] font-medium rounded" style={{ color: 'var(--bw-text-tertiary)', border: '1px solid var(--bw-border)' }}>Cancel</button>
                </div>
              ) : (
                <ActionButton label="Clear" onClick={() => setConfirmClearBookmarks(true)} />
              )}
            </SettingsRow>
          </SettingsSection>

          {/* About */}
          <SettingsSection icon="info" title="About">
            <div className="space-y-3">
              <p className="text-[12px] leading-relaxed" style={{ color: 'var(--bw-text-tertiary)' }}>
                Bowser is an AI-native browser built for focused, intelligent browsing.
              </p>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-medium px-2 py-0.5 rounded" style={{ background: 'var(--bw-bg-hover)', color: 'var(--bw-text-quaternary)', fontFamily: 'var(--bw-font-mono)' }}>
                  v1.0.0-rc.1
                </span>
              </div>

              {onShowOnboarding && (
                <button
                  onClick={() => { setStorageItem('onboarding-complete', false); onShowOnboarding(); }}
                  className="text-[12px] font-medium"
                  style={{ color: 'var(--bw-accent)', transition: 'opacity 0.1s ease' }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  View welcome tour
                </button>
              )}

              <div>
                <button
                  onClick={() => setShowShortcuts(p => !p)}
                  className="flex items-center gap-1.5 text-[12px] font-medium"
                  style={{ color: 'var(--bw-text-secondary)', transition: 'color 0.1s ease' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', transform: showShortcuts ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s ease' }} aria-hidden="true">chevron_right</span>
                  Keyboard shortcuts
                </button>
                {showShortcuts && (
                  <div className="mt-2 space-y-0">
                    {SHORTCUTS.map((s, i) => (
                      <div key={s.keys} className="flex items-center justify-between py-2" style={{ borderBottom: i < SHORTCUTS.length - 1 ? '1px solid var(--bw-border-subtle)' : 'none' }}>
                        <span className="text-[12px]" style={{ color: 'var(--bw-text-secondary)' }}>{s.description}</span>
                        <kbd className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ background: 'var(--bw-bg-hover)', border: '1px solid var(--bw-border)', color: 'var(--bw-text-tertiary)', fontFamily: 'var(--bw-font-mono)' }}>
                          {s.keys}
                        </kbd>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </SettingsSection>
        </div>
      </div>
    </div>
  );
};

/* Reusable sub-components */
const SettingsSection: React.FC<{ icon: string; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <section className="settings-section">
    <h2 className="text-[11px] font-medium uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: 'var(--bw-text-quaternary)' }}>
      <span className="material-symbols-outlined" style={{ fontSize: '14px' }} aria-hidden="true">{icon}</span>
      {title}
    </h2>
    <div className="space-y-4">{children}</div>
  </section>
);

const SettingsRow: React.FC<{ label: string; description: string; children: React.ReactNode }> = ({ label, description, children }) => (
  <div className="flex items-center justify-between gap-4">
    <div className="min-w-0">
      <p className="text-[13px]" style={{ color: 'var(--bw-text-primary)' }}>{label}</p>
      <p className="text-[11px] mt-0.5" style={{ color: 'var(--bw-text-quaternary)' }}>{description}</p>
    </div>
    {children}
  </div>
);

const SegmentedButton: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className="px-3 py-1 rounded text-[12px] font-medium capitalize"
    style={{
      background: active ? 'var(--bw-accent)' : 'transparent',
      color: active ? '#fff' : 'var(--bw-text-tertiary)',
      border: `1px solid ${active ? 'var(--bw-accent)' : 'var(--bw-border)'}`,
      transition: 'all 0.1s ease',
    }}
  >
    {label}
  </button>
);

const SegmentedButtons: React.FC<{ options: string[]; value: string; onChange: (v: string) => void }> = ({ options, value, onChange }) => (
  <div className="flex gap-1">
    {options.map(o => <SegmentedButton key={o} label={o} active={value === o} onClick={() => onChange(o)} />)}
  </div>
);

const ActionButton: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button
    onClick={onClick}
    className="px-3 py-1 text-[12px] font-medium rounded"
    style={{ color: 'var(--bw-text-secondary)', border: '1px solid var(--bw-border)', background: 'transparent', transition: 'background 0.1s ease' }}
    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bw-bg-hover)')}
    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
  >
    {label}
  </button>
);
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

/* ------------------------------------------------------------------ */
/*  Schema-driven settings                                            */
/* ------------------------------------------------------------------ */

interface SegmentedSetting {
  type: 'segmented';
  key: string;
  label: string;
  description: string;
  options: { value: string; label: string }[];
  get: () => string;
  set: (v: string) => void;
}

interface SettingSection {
  icon: string;
  title: string;
  items: SegmentedSetting[];
}

const searchEngineOptions = (): { value: string; label: string }[] =>
  (Object.entries(SEARCH_ENGINES) as [SearchEngine, { name: string }][]).map(([key, { name }]) => ({
    value: key,
    label: name,
  }));

const buildSchema = (handlers: {
  onThemeChange: (v: BowserTheme) => void;
  onFontSizeChange: (v: FontSize) => void;
  onSearchEngineChange: (v: SearchEngine) => void;
  onTabLimitChange: (v: TabLimit) => void;
}): SettingSection[] => [
  {
    icon: 'palette',
    title: 'Appearance',
    items: [
      {
        type: 'segmented',
        key: 'theme',
        label: 'Theme',
        description: 'Choose light, dark, or match your system.',
        options: [
          { value: 'dark', label: 'dark' },
          { value: 'light', label: 'light' },
          { value: 'system', label: 'system' },
        ],
        get: getEffectiveTheme,
        set: v => handlers.onThemeChange(v as BowserTheme),
      },
      {
        type: 'segmented',
        key: 'font-size',
        label: 'Font size',
        description: 'Adjust text size across the interface.',
        options: [
          { value: 'small', label: 'small' },
          { value: 'medium', label: 'medium' },
          { value: 'large', label: 'large' },
        ],
        get: getFontSize,
        set: v => handlers.onFontSizeChange(v as FontSize),
      },
    ],
  },
  {
    icon: 'search',
    title: 'Search',
    items: [
      {
        type: 'segmented',
        key: 'search-engine',
        label: 'Default search engine',
        description: 'Used for search queries in the address bar.',
        options: searchEngineOptions(),
        get: getSearchEngine,
        set: v => handlers.onSearchEngineChange(v as SearchEngine),
      },
    ],
  },
  {
    icon: 'tab',
    title: 'Tabs',
    items: [
      {
        type: 'segmented',
        key: 'tab-limit',
        label: 'Maximum tabs',
        description: 'Limit open tabs at once.',
        options: [
          { value: '5', label: '5' },
          { value: '10', label: '10' },
          { value: '20', label: '20' },
          { value: '0', label: '∞' },
        ],
        get: () => String(getTabLimit()),
        set: v => handlers.onTabLimitChange(Number(v) as TabLimit),
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

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
  // Force re-render when a setting changes so the active button updates
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  const [confirmClearHistory, setConfirmClearHistory] = React.useState(false);
  const [confirmClearBookmarks, setConfirmClearBookmarks] = React.useState(false);
  const [showShortcuts, setShowShortcuts] = React.useState(false);

  const schema = React.useMemo(() => buildSchema({
    onThemeChange: t => { setStorageItem('theme', t); applyBowserTheme(t); forceUpdate(); },
    onFontSizeChange: s => { setFontSize(s); forceUpdate(); },
    onSearchEngineChange: e => { setSearchEngineSetting(e); forceUpdate(); },
    onTabLimitChange: l => { setTabLimit(l); forceUpdate(); },
  }), []);

  return (
    <div className="w-full h-full overflow-y-auto" style={{ background: 'var(--bw-bg-app)', color: 'var(--bw-text-primary)' }}>
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2.5 mb-8" style={{ height: '40px', borderBottom: '1px solid var(--bw-border-subtle)', paddingBottom: '12px' }}>
          <span className="material-symbols-outlined icon-lg" style={{ color: 'var(--bw-text-quaternary)' }} aria-hidden="true">settings</span>
          <h1 className="text-[14px] font-semibold" style={{ letterSpacing: '-0.02em' }}>Settings</h1>
        </div>

        <div className="space-y-6">
          {/* Schema-driven sections */}
          {schema.map(section => (
            <SectionBlock key={section.title} icon={section.icon} title={section.title}>
              {section.items.map(item => (
                <SettingsRow key={item.key} label={item.label} description={item.description}>
                  <SegmentedButtons options={item.options} value={item.get()} onChange={item.set} />
                </SettingsRow>
              ))}
            </SectionBlock>
          ))}

          {/* Privacy — custom confirm dialogs */}
          <SectionBlock icon="shield" title="Privacy">
            <SettingsRow label="Clear history" description="Remove all browsing history.">
              {confirmClearHistory ? (
                <ConfirmButtons onConfirm={() => { onClearHistory?.(); setConfirmClearHistory(false); }} onCancel={() => setConfirmClearHistory(false)} />
              ) : (
                <ActionButton label="Clear" onClick={() => setConfirmClearHistory(true)} />
              )}
            </SettingsRow>
            <SettingsRow label="Clear bookmarks" description="Remove all saved bookmarks.">
              {confirmClearBookmarks ? (
                <ConfirmButtons onConfirm={() => { onClearBookmarks?.(); setConfirmClearBookmarks(false); }} onCancel={() => setConfirmClearBookmarks(false)} />
              ) : (
                <ActionButton label="Clear" onClick={() => setConfirmClearBookmarks(true)} />
              )}
            </SettingsRow>
          </SectionBlock>

          {/* About — custom content */}
          <SectionBlock icon="info" title="About">
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
                  <span className="material-symbols-outlined icon-sm" style={{ transform: showShortcuts ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s ease' }} aria-hidden="true">chevron_right</span>
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
          </SectionBlock>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Reusable sub-components                                           */
/* ------------------------------------------------------------------ */

const SectionBlock: React.FC<{ icon: string; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <section className="settings-section">
    <h2 className="text-[11px] font-medium uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: 'var(--bw-text-quaternary)' }}>
      <span className="material-symbols-outlined icon-sm" aria-hidden="true">{icon}</span>
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

const SegmentedButtons: React.FC<{ options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }> = ({ options, value, onChange }) => (
  <div className="flex gap-1 flex-wrap justify-end">
    {options.map(o => (
      <button
        key={o.value}
        onClick={() => onChange(o.value)}
        className="px-3 py-1 rounded text-[12px] font-medium capitalize"
        style={{
          background: value === o.value ? 'var(--bw-accent)' : 'transparent',
          color: value === o.value ? '#fff' : 'var(--bw-text-tertiary)',
          border: `1px solid ${value === o.value ? 'var(--bw-accent)' : 'var(--bw-border)'}`,
          transition: 'all 0.1s ease',
        }}
      >
        {o.label}
      </button>
    ))}
  </div>
);

const ConfirmButtons: React.FC<{ onConfirm: () => void; onCancel: () => void }> = ({ onConfirm, onCancel }) => (
  <div className="flex gap-2">
    <button onClick={onConfirm} className="px-3 py-1 text-[12px] font-medium rounded" style={{ color: '#fff', background: 'var(--bw-red)' }}>Confirm</button>
    <button onClick={onCancel} className="px-3 py-1 text-[12px] font-medium rounded" style={{ color: 'var(--bw-text-tertiary)', border: '1px solid var(--bw-border)' }}>Cancel</button>
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

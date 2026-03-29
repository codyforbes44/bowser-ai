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
    <div className="w-full h-full bowser-settings-bg text-gray-200 p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-medium mb-8">Settings</h1>
        <div className="space-y-8">

          {/* Appearance */}
          <section className="bowser-settings-card p-6 rounded-xl border border-[#3c4043]">
            <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-yellow-400">palette</span>
              Appearance
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-200">Theme</h3>
                  <p className="text-sm text-gray-500">Choose your preferred color scheme.</p>
                </div>
                <div className="flex gap-2">
                  {(['dark', 'light', 'system'] as BowserTheme[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => handleThemeChange(t)}
                      className={`px-4 py-2 rounded-lg text-sm capitalize transition-colors border ${
                        theme === t
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'bowser-settings-card border-[#3c4043] hover:bg-[#3c4043] text-gray-300'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* General */}
          <section className="bowser-settings-card p-6 rounded-xl border border-[#3c4043]">
            <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-400">tune</span>
              General
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-200">Default Search Engine</h3>
                  <p className="text-sm text-gray-500">Choose the search engine used in the address bar.</p>
                </div>
                <select className="bowser-settings-bg border border-[#3c4043] rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500">
                  <option value="google">Google</option>
                  <option value="bing">Bing</option>
                  <option value="duckduckgo">DuckDuckGo</option>
                </select>
              </div>
            </div>
          </section>

          {/* AI Features */}
          <section className="bowser-settings-card p-6 rounded-xl border border-[#3c4043]">
            <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-400">auto_awesome</span>
              AI Features
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-200">Enable AI Search</h3>
                  <p className="text-sm text-gray-500">Use AI to generate answers for complex queries.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                </label>
              </div>
            </div>
          </section>

          {/* Privacy */}
          <section className="bowser-settings-card p-6 rounded-xl border border-[#3c4043]">
            <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-green-400">shield</span>
              Privacy and Security
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-200">Clear Browsing Data</h3>
                  <p className="text-sm text-gray-500">Clear history, cookies, cache, and more.</p>
                </div>
                <button
                  onClick={onClearHistory}
                  className="px-4 py-2 bowser-settings-bg hover:bg-[#3c4043] border border-[#3c4043] rounded-lg text-sm transition-colors"
                >
                  Clear Data
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

import React from 'react';

export const SettingsTab: React.FC = () => {
  return (
    <div className="w-full h-full bg-[#202124] text-gray-200 p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-medium mb-8">Settings</h1>
        <div className="space-y-8">
          <section className="bg-[#292a2d] p-6 rounded-xl border border-[#3c4043]">
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
                <select className="bg-[#202124] border border-[#3c4043] rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500">
                  <option value="google">Google</option>
                  <option value="bing">Bing</option>
                  <option value="duckduckgo">DuckDuckGo</option>
                </select>
              </div>
            </div>
          </section>

          <section className="bg-[#292a2d] p-6 rounded-xl border border-[#3c4043]">
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

          <section className="bg-[#292a2d] p-6 rounded-xl border border-[#3c4043]">
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
                <button className="px-4 py-2 bg-[#202124] hover:bg-[#3c4043] border border-[#3c4043] rounded-lg text-sm transition-colors">
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

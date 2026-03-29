import React, { useState, useMemo } from 'react';
import { HistoryEntry, TabKind } from '../types';

interface HistoryTabProps {
  history: HistoryEntry[];
  onClearHistory: () => void;
  onRemoveEntry: (id: string) => void;
  onNavigate: (url: string, tabKind: TabKind) => void;
}

function groupByDate(entries: HistoryEntry[]): { label: string; entries: HistoryEntry[] }[] {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;
  const weekStart = todayStart - 6 * 86400000;

  const groups: Record<string, HistoryEntry[]> = {};
  const order = ['Today', 'Yesterday', 'This Week', 'Older'];
  for (const o of order) groups[o] = [];

  for (const entry of entries) {
    if (entry.timestamp >= todayStart) groups['Today'].push(entry);
    else if (entry.timestamp >= yesterdayStart) groups['Yesterday'].push(entry);
    else if (entry.timestamp >= weekStart) groups['This Week'].push(entry);
    else groups['Older'].push(entry);
  }

  return order.filter(label => groups[label].length > 0).map(label => ({ label, entries: groups[label] }));
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  history,
  onClearHistory,
  onRemoveEntry,
  onNavigate
}) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return history;
    const q = search.toLowerCase();
    return history.filter(e => e.title.toLowerCase().includes(q) || e.url.toLowerCase().includes(q));
  }, [history, search]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  return (
    <div className="w-full h-full bowser-page-bg text-gray-200 p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-medium flex items-center gap-3">
            <span className="material-symbols-outlined text-gray-400">history</span>
            History
          </h1>
          {history.length > 0 && (
            <button onClick={onClearHistory} className="px-4 py-2 text-sm text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
              Clear All
            </button>
          )}
        </div>

        {history.length > 0 && (
          <div className="mb-6 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg">search</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search history..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#292a2d] border border-[#3c4043] rounded-xl text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>
        )}

        {history.length === 0 ? (
          <div className="text-center mt-24">
            <span className="material-symbols-outlined text-7xl mb-4 text-gray-600">history</span>
            <p className="text-lg text-gray-400 mb-2">No browsing history yet</p>
            <p className="text-sm text-gray-600">Pages you visit will show up here so you can easily get back to them.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center mt-20">
            <span className="material-symbols-outlined text-5xl mb-3 text-gray-600">search_off</span>
            <p className="text-gray-400">No results for "{search}"</p>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map(group => (
              <div key={group.label}>
                <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3 pl-1">{group.label}</h2>
                <div className="space-y-1">
                  {group.entries.map(entry => (
                    <div key={entry.id} className="flex items-center justify-between bowser-list-item px-4 py-3 rounded-xl group transition-colors">
                      <div className="flex items-center gap-4 flex-1 cursor-pointer min-w-0" onClick={() => onNavigate(entry.url, entry.tabKind)}>
                        <span className="material-symbols-outlined text-gray-500 flex-shrink-0">
                          {entry.tabKind === 'web' ? 'public' : 'auto_awesome'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-gray-200 group-hover:text-blue-400 transition-colors truncate">{entry.title}</h3>
                          <p className="text-xs text-gray-600 truncate">{entry.url}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                        <span className="text-xs text-gray-600">
                          {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <button onClick={() => onRemoveEntry(entry.id)} className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100" title="Remove">
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

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
  const order = ['Today', 'Yesterday', 'This week', 'Older'];
  for (const o of order) groups[o] = [];

  for (const entry of entries) {
    if (entry.timestamp >= todayStart) groups['Today'].push(entry);
    else if (entry.timestamp >= yesterdayStart) groups['Yesterday'].push(entry);
    else if (entry.timestamp >= weekStart) groups['This week'].push(entry);
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
    <div className="w-full h-full overflow-y-auto" style={{ background: 'var(--bw-bg-app)', color: 'var(--bw-text-primary)' }}>
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-lg" style={{ color: 'var(--bw-text-quaternary)' }}>history</span>
            <h1 className="text-lg font-semibold tracking-tight" style={{ letterSpacing: '-0.02em' }}>History</h1>
          </div>
          {history.length > 0 && (
            <button
              onClick={onClearHistory}
              className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
              style={{ color: 'var(--bw-red)', background: 'var(--bw-red-subtle)' }}
            >
              Clear all
            </button>
          )}
        </div>

        {/* Search */}
        {history.length > 0 && (
          <div className="mb-6 relative">
            <span
              className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-base"
              style={{ color: 'var(--bw-text-quaternary)' }}
            >search</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search history…"
              role="searchbox"
              className="w-full pl-9 pr-4 py-2 text-sm outline-none transition-colors"
              style={{
                background: 'var(--bw-bg-input)',
                border: '1px solid var(--bw-border)',
                borderRadius: 'var(--bw-radius-md)',
                color: 'var(--bw-text-primary)',
              }}
            />
          </div>
        )}

        {/* Content */}
        {history.length === 0 ? (
          <div className="text-center mt-24">
            <span className="material-symbols-outlined text-5xl mb-3" style={{ color: 'var(--bw-text-quaternary)' }}>history</span>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--bw-text-secondary)' }}>No history yet</p>
            <p className="text-xs" style={{ color: 'var(--bw-text-quaternary)' }}>Pages you visit will show up here.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center mt-20">
            <span className="material-symbols-outlined text-4xl mb-2" style={{ color: 'var(--bw-text-quaternary)' }}>search_off</span>
            <p className="text-sm" style={{ color: 'var(--bw-text-tertiary)' }}>No results for "{search}"</p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(group => (
              <div key={group.label}>
                <h2
                  className="text-[11px] font-medium uppercase tracking-widest mb-2 pl-1"
                  style={{ color: 'var(--bw-text-quaternary)' }}
                >{group.label}</h2>
                <div className="space-y-px">
                  {group.entries.map(entry => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between px-3 py-2.5 rounded-md group transition-colors cursor-pointer"
                      style={{ background: 'transparent' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bw-bg-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      onClick={() => onNavigate(entry.url, entry.tabKind)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span
                          className="material-symbols-outlined text-sm flex-shrink-0"
                          style={{ color: 'var(--bw-text-quaternary)' }}
                        >
                          {entry.tabKind === 'web' ? 'public' : 'auto_awesome'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm truncate" style={{ color: 'var(--bw-text-primary)' }}>{entry.title}</p>
                          <p className="text-[11px] truncate" style={{ color: 'var(--bw-text-quaternary)' }}>{entry.url}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        <span className="text-[11px] tabular-nums" style={{ color: 'var(--bw-text-quaternary)' }}>
                          {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <button
                          onClick={e => { e.stopPropagation(); onRemoveEntry(entry.id); }}
                          className="p-1 rounded transition-all opacity-0 group-hover:opacity-100"
                          style={{ color: 'var(--bw-text-quaternary)' }}
                          onMouseEnter={e => { e.currentTarget.style.color = 'var(--bw-red)'; e.currentTarget.style.background = 'var(--bw-red-subtle)'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--bw-text-quaternary)'; e.currentTarget.style.background = 'transparent'; }}
                          title="Remove"
                          aria-label="Remove from history"
                        >
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

import React from 'react';
import { HistoryEntry, TabKind } from '../types';

interface HistoryTabProps {
  history: HistoryEntry[];
  onClearHistory: () => void;
  onRemoveEntry: (id: string) => void;
  onNavigate: (url: string, tabKind: TabKind) => void;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  history,
  onClearHistory,
  onRemoveEntry,
  onNavigate
}) => {
  return (
    <div className="w-full h-full bg-[#202124] text-gray-200 p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-medium">History</h1>
          {history.length > 0 && (
            <button onClick={onClearHistory} className="px-4 py-2 text-sm text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
              Clear History
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="text-center text-gray-500 mt-20">
            <span className="material-symbols-outlined text-6xl mb-4 opacity-50">history</span>
            <p>Your browsing history will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between bg-[#292a2d] p-4 rounded-xl border border-[#3c4043] hover:border-gray-500 transition-colors group">
                <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => onNavigate(entry.url, entry.tabKind)}>
                  <span className="material-symbols-outlined text-gray-400">
                    {entry.tabKind === 'web' ? 'public' : 'auto_awesome'}
                  </span>
                  <div>
                    <h3 className="font-medium text-gray-200 group-hover:text-blue-400 transition-colors">{entry.title}</h3>
                    <p className="text-sm text-gray-500">{entry.url}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">{new Date(entry.timestamp).toLocaleString()}</span>
                  <button onClick={() => onRemoveEntry(entry.id)} className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100" title="Remove from history">
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

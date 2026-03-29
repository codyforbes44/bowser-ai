import { useState, useCallback } from 'react';
import { HistoryEntry, TabKind } from '../types';
import { getStorageItem, setStorageItem } from '../utils/storage';

export function useHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>(() => getStorageItem('history', []));

  const saveHistory = useCallback((entries: HistoryEntry[]) => {
    setHistory(entries);
    setStorageItem('history', entries);
  }, []);

  const addHistoryEntry = useCallback((entry: { url: string; title: string; tabKind: TabKind }) => {
    const newEntry: HistoryEntry = {
      id: crypto.randomUUID(),
      url: entry.url,
      title: entry.title,
      timestamp: Date.now(),
      tabKind: entry.tabKind,
    };
    saveHistory([newEntry, ...history].slice(0, 500));
  }, [history, saveHistory]);

  const clearHistory = useCallback(() => {
    saveHistory([]);
  }, [saveHistory]);

  const removeHistoryEntry = useCallback((id: string) => {
    saveHistory(history.filter(e => e.id !== id));
  }, [history, saveHistory]);

  return { history, addHistoryEntry, clearHistory, removeHistoryEntry };
}

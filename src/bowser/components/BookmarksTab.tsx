import React, { useState, useMemo } from 'react';
import { Bookmark, BookmarkFolder, TabKind } from '../types';

interface BookmarksTabProps {
  bookmarks: Bookmark[];
  folders: BookmarkFolder[];
  onCreateFolder: (name: string) => void;
  onRenameFolder: (id: string, newName: string) => void;
  onDeleteFolder: (id: string) => void;
  onMoveBookmark: (url: string, folderId: string | undefined) => void;
  onNavigate: (url: string, tabKind: TabKind) => void;
  onRemoveBookmark: (url: string) => void;
}

export const BookmarksTab: React.FC<BookmarksTabProps> = ({
  bookmarks, folders, onCreateFolder, onRenameFolder, onDeleteFolder, onMoveBookmark, onNavigate, onRemoveBookmark
}) => {
  const [search, setSearch] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return bookmarks;
    const q = search.toLowerCase();
    return bookmarks.filter(b => b.title.toLowerCase().includes(q) || b.url.toLowerCase().includes(q));
  }, [bookmarks, search]);

  const isSearching = search.trim().length > 0;
  const displayedBookmarks = isSearching
    ? filtered
    : filtered.filter(b => activeFolderId ? b.folderId === activeFolderId : !b.folderId);

  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const b of bookmarks) {
      const key = b.folderId || '__root__';
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [bookmarks]);

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) { onCreateFolder(newFolderName.trim()); setNewFolderName(''); setShowNewFolder(false); }
  };

  const handleRenameFolder = (id: string) => {
    if (editFolderName.trim()) { onRenameFolder(id, editFolderName.trim()); setEditingFolderId(null); }
  };

  return (
    <div className="w-full h-full bowser-page-bg text-gray-200 p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-medium flex items-center gap-3">
            <span className="material-symbols-outlined text-gray-400">bookmarks</span>
            Bookmarks
          </h1>
          <button
            onClick={() => setShowNewFolder(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[#292a2d] hover:bg-[#35363a] border border-[#3c4043] rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-sm">create_new_folder</span>
            New Folder
          </button>
        </div>

        <div className="mb-6 relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg">search</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search bookmarks..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#292a2d] border border-[#3c4043] rounded-xl text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>

        {showNewFolder && (
          <form onSubmit={handleCreateFolder} className="mb-6 flex items-center gap-2 bg-[#292a2d] p-3 rounded-xl border border-[#3c4043]">
            <span className="material-symbols-outlined text-gray-400">folder</span>
            <input type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Folder name..." className="bg-transparent border-none outline-none text-gray-200 flex-1 text-sm" autoFocus onKeyDown={e => { if (e.key === 'Escape') setShowNewFolder(false); }} />
            <button type="submit" disabled={!newFolderName.trim()} className="text-blue-400 hover:text-blue-300 px-3 py-1 text-sm rounded-md hover:bg-blue-400/10 transition-colors disabled:opacity-40">Create</button>
            <button type="button" onClick={() => setShowNewFolder(false)} className="text-gray-500 hover:text-gray-400 px-2 py-1 text-sm">Cancel</button>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar: Folders */}
          <div className="space-y-1">
            <button
              onClick={() => setActiveFolderId(null)}
              className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                !activeFolderId && !isSearching ? 'bg-blue-500/15 text-blue-400' : 'text-gray-400 hover:bg-[#292a2d]'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">home</span>
                All Bookmarks
              </span>
              <span className="text-xs text-gray-600">{folderCounts['__root__'] || 0}</span>
            </button>

            {folders.map(folder => (
              <div key={folder.id} className="group">
                {editingFolderId === folder.id ? (
                  <div className="flex items-center gap-1 px-2">
                    <input
                      type="text" value={editFolderName} onChange={e => setEditFolderName(e.target.value)}
                      className="flex-1 bg-[#202124] border border-[#3c4043] rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                      autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') handleRenameFolder(folder.id); if (e.key === 'Escape') setEditingFolderId(null); }}
                      onBlur={() => handleRenameFolder(folder.id)}
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setActiveFolderId(folder.id)}
                    className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                      activeFolderId === folder.id && !isSearching ? 'bg-blue-500/15 text-blue-400' : 'text-gray-400 hover:bg-[#292a2d]'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span className="material-symbols-outlined text-sm">folder</span>
                      <span className="truncate">{folder.name}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="text-xs text-gray-600">{folderCounts[folder.id] || 0}</span>
                      <span className="opacity-0 group-hover:opacity-100 flex items-center transition-opacity">
                        <button onClick={e => { e.stopPropagation(); setEditingFolderId(folder.id); setEditFolderName(folder.name); }} className="p-0.5 text-gray-500 hover:text-blue-400" title="Rename">
                          <span className="material-symbols-outlined text-[14px]">edit</span>
                        </button>
                        <button onClick={e => { e.stopPropagation(); onDeleteFolder(folder.id); if (activeFolderId === folder.id) setActiveFolderId(null); }} className="p-0.5 text-gray-500 hover:text-red-400" title="Delete">
                          <span className="material-symbols-outlined text-[14px]">delete</span>
                        </button>
                      </span>
                    </span>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Main: Bookmark list */}
          <div className="md:col-span-3">
            {bookmarks.length === 0 ? (
              <div className="text-center mt-20">
                <span className="material-symbols-outlined text-7xl mb-4 text-gray-600">bookmarks</span>
                <p className="text-lg text-gray-400 mb-2">No bookmarks yet</p>
                <p className="text-sm text-gray-600">Bookmark pages with ⭐ in the address bar to save them here.</p>
              </div>
            ) : displayedBookmarks.length === 0 ? (
              <div className="text-center mt-16">
                <span className="material-symbols-outlined text-5xl mb-3 text-gray-600">
                  {isSearching ? 'search_off' : 'folder_open'}
                </span>
                <p className="text-gray-400">
                  {isSearching ? `No results for "${search}"` : 'This folder is empty'}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {displayedBookmarks.map(bookmark => (
                  <div key={bookmark.id} className="flex items-center justify-between bowser-list-item px-4 py-3 rounded-xl group transition-colors">
                    <div className="flex items-center gap-3 flex-1 cursor-pointer min-w-0" onClick={() => onNavigate(bookmark.url, bookmark.tabKind)}>
                      <span className="material-symbols-outlined text-gray-500 flex-shrink-0">
                        {bookmark.tabKind === 'web' ? 'public' : 'auto_awesome'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-gray-200 group-hover:text-blue-400 transition-colors truncate">{bookmark.title}</h3>
                        <p className="text-xs text-gray-600 truncate">{bookmark.url}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-4">
                      <select
                        value={bookmark.folderId || ''}
                        onChange={e => onMoveBookmark(bookmark.url, e.target.value || undefined)}
                        className="bg-[#202124] border border-[#3c4043] rounded px-2 py-1 text-xs text-gray-400 focus:outline-none focus:border-blue-500 max-w-[120px]"
                        onClick={e => e.stopPropagation()}
                      >
                        <option value="">No Folder</option>
                        {folders.map(f => (<option key={f.id} value={f.id}>{f.name}</option>))}
                      </select>
                      <button onClick={() => onRemoveBookmark(bookmark.url)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors" title="Remove">
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

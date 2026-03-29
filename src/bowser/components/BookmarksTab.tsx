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
    <div className="w-full h-full overflow-y-auto" style={{ background: 'var(--bw-bg-app)', color: 'var(--bw-text-primary)' }}>
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-lg" style={{ color: 'var(--bw-text-quaternary)' }}>bookmarks</span>
            <h1 className="text-lg font-semibold tracking-tight" style={{ letterSpacing: '-0.02em' }}>Bookmarks</h1>
          </div>
          <button
            onClick={() => setShowNewFolder(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
            style={{ color: 'var(--bw-text-secondary)', border: '1px solid var(--bw-border)', background: 'transparent' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bw-bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span className="material-symbols-outlined text-sm">create_new_folder</span>
            New folder
          </button>
        </div>

        {/* Search */}
        <div className="mb-6 relative">
          <span
            className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-base"
            style={{ color: 'var(--bw-text-quaternary)' }}
          >search</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search bookmarks…"
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

        {/* New folder form */}
        {showNewFolder && (
          <form
            onSubmit={handleCreateFolder}
            className="mb-6 flex items-center gap-2 p-3 rounded-lg"
            style={{ background: 'var(--bw-bg-surface)', border: '1px solid var(--bw-border)' }}
          >
            <span className="material-symbols-outlined text-sm" style={{ color: 'var(--bw-text-quaternary)' }}>folder</span>
            <input
              type="text"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="bg-transparent border-none outline-none flex-1 text-sm"
              style={{ color: 'var(--bw-text-primary)' }}
              autoFocus
              onKeyDown={e => { if (e.key === 'Escape') setShowNewFolder(false); }}
            />
            <button
              type="submit"
              disabled={!newFolderName.trim()}
              className="text-xs font-medium px-3 py-1 rounded transition-colors disabled:opacity-30"
              style={{ color: 'var(--bw-accent)' }}
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowNewFolder(false)}
              className="text-xs px-2 py-1"
              style={{ color: 'var(--bw-text-quaternary)' }}
            >
              Cancel
            </button>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar: Folders */}
          <nav className="space-y-0.5">
            <button
              onClick={() => setActiveFolderId(null)}
              className="w-full text-left flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors"
              style={{
                background: !activeFolderId && !isSearching ? 'var(--bw-accent-subtle)' : 'transparent',
                color: !activeFolderId && !isSearching ? 'var(--bw-accent)' : 'var(--bw-text-secondary)',
              }}
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">home</span>
                All bookmarks
              </span>
              <span className="text-[11px] tabular-nums" style={{ color: 'var(--bw-text-quaternary)' }}>
                {folderCounts['__root__'] || 0}
              </span>
            </button>

            {folders.map(folder => (
              <div key={folder.id} className="group">
                {editingFolderId === folder.id ? (
                  <div className="flex items-center gap-1 px-2">
                    <input
                      type="text"
                      value={editFolderName}
                      onChange={e => setEditFolderName(e.target.value)}
                      className="flex-1 px-2 py-1 text-sm outline-none rounded"
                      style={{
                        background: 'var(--bw-bg-input)',
                        border: '1px solid var(--bw-border-focus)',
                        color: 'var(--bw-text-primary)',
                      }}
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleRenameFolder(folder.id);
                        if (e.key === 'Escape') setEditingFolderId(null);
                      }}
                      onBlur={() => handleRenameFolder(folder.id)}
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setActiveFolderId(folder.id)}
                    className="w-full text-left flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors"
                    style={{
                      background: activeFolderId === folder.id && !isSearching ? 'var(--bw-accent-subtle)' : 'transparent',
                      color: activeFolderId === folder.id && !isSearching ? 'var(--bw-accent)' : 'var(--bw-text-secondary)',
                    }}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span className="material-symbols-outlined text-sm">folder</span>
                      <span className="truncate">{folder.name}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="text-[11px] tabular-nums" style={{ color: 'var(--bw-text-quaternary)' }}>
                        {folderCounts[folder.id] || 0}
                      </span>
                      <span className="opacity-0 group-hover:opacity-100 flex items-center transition-opacity">
                        <button
                          onClick={e => { e.stopPropagation(); setEditingFolderId(folder.id); setEditFolderName(folder.name); }}
                          className="p-0.5 transition-colors"
                          style={{ color: 'var(--bw-text-quaternary)' }}
                          title="Rename"
                        >
                          <span className="material-symbols-outlined text-[13px]">edit</span>
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); onDeleteFolder(folder.id); if (activeFolderId === folder.id) setActiveFolderId(null); }}
                          className="p-0.5 transition-colors"
                          style={{ color: 'var(--bw-text-quaternary)' }}
                          title="Delete"
                        >
                          <span className="material-symbols-outlined text-[13px]">delete</span>
                        </button>
                      </span>
                    </span>
                  </button>
                )}
              </div>
            ))}
          </nav>

          {/* Main: Bookmark list */}
          <div className="md:col-span-3">
            {bookmarks.length === 0 ? (
              <div className="text-center mt-20">
                <span className="material-symbols-outlined text-5xl mb-3" style={{ color: 'var(--bw-text-quaternary)' }}>bookmarks</span>
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--bw-text-secondary)' }}>No bookmarks yet</p>
                <p className="text-xs" style={{ color: 'var(--bw-text-quaternary)' }}>
                  Click the ★ in the address bar to save pages you want to revisit.
                </p>
              </div>
            ) : displayedBookmarks.length === 0 ? (
              <div className="text-center mt-16">
                <span className="material-symbols-outlined text-4xl mb-2" style={{ color: 'var(--bw-text-quaternary)' }}>
                  {isSearching ? 'search_off' : 'folder_open'}
                </span>
                <p className="text-sm" style={{ color: 'var(--bw-text-tertiary)' }}>
                  {isSearching ? `No results for "${search}"` : 'This folder is empty'}
                </p>
              </div>
            ) : (
              <div className="space-y-px">
                {displayedBookmarks.map(bookmark => (
                  <div
                    key={bookmark.id}
                    className="flex items-center justify-between px-3 py-2.5 rounded-md group transition-colors"
                    style={{ background: 'transparent' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bw-bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div
                      className="flex items-center gap-3 flex-1 cursor-pointer min-w-0"
                      onClick={() => onNavigate(bookmark.url, bookmark.tabKind)}
                    >
                      <span
                        className="material-symbols-outlined text-sm flex-shrink-0"
                        style={{ color: 'var(--bw-text-quaternary)' }}
                      >
                        {bookmark.tabKind === 'web' ? 'public' : 'auto_awesome'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate" style={{ color: 'var(--bw-text-primary)' }}>{bookmark.title}</p>
                        <p className="text-[11px] truncate" style={{ color: 'var(--bw-text-quaternary)' }}>{bookmark.url}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-3">
                      <select
                        value={bookmark.folderId || ''}
                        onChange={e => onMoveBookmark(bookmark.url, e.target.value || undefined)}
                        className="rounded px-2 py-1 text-[11px] outline-none max-w-[100px]"
                        style={{
                          background: 'var(--bw-bg-input)',
                          border: '1px solid var(--bw-border)',
                          color: 'var(--bw-text-tertiary)',
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        <option value="">No folder</option>
                        {folders.map(f => (<option key={f.id} value={f.id}>{f.name}</option>))}
                      </select>
                      <button
                        onClick={() => onRemoveBookmark(bookmark.url)}
                        className="p-1 rounded transition-colors"
                        style={{ color: 'var(--bw-text-quaternary)' }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--bw-red)'; e.currentTarget.style.background = 'var(--bw-red-subtle)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--bw-text-quaternary)'; e.currentTarget.style.background = 'transparent'; }}
                        title="Remove"
                      >
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

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
  bookmarks, folders, onCreateFolder, onRenameFolder, onDeleteFolder, onMoveBookmark, onNavigate, onRemoveBookmark,
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
  const displayedBookmarks = isSearching ? filtered : filtered.filter(b => activeFolderId ? b.folderId === activeFolderId : !b.folderId);

  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const b of bookmarks) { const key = b.folderId || '__root__'; counts[key] = (counts[key] || 0) + 1; }
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
        <div className="flex items-center justify-between mb-6" style={{ height: '40px', borderBottom: '1px solid var(--bw-border-subtle)', paddingBottom: '12px' }}>
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--bw-text-quaternary)' }} aria-hidden="true">bookmarks</span>
            <h1 className="text-[14px] font-semibold" style={{ letterSpacing: '-0.02em' }}>Bookmarks</h1>
          </div>
          <button
            onClick={() => setShowNewFolder(true)}
            className="flex items-center gap-1.5 px-3 py-1 text-[12px] font-medium rounded"
            style={{ color: 'var(--bw-text-secondary)', border: '1px solid var(--bw-border)', background: 'transparent', transition: 'background 0.1s ease' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bw-bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }} aria-hidden="true">create_new_folder</span>
            New folder
          </button>
        </div>

        <div className="mb-6 relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2" style={{ fontSize: '16px', color: 'var(--bw-text-quaternary)' }} aria-hidden="true">search</span>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search bookmarks…" role="searchbox"
            className="w-full pl-9 pr-4 py-2 text-[12px] outline-none"
            style={{ background: 'var(--bw-bg-input)', border: '1px solid var(--bw-border)', borderRadius: 'var(--bw-radius-md)', color: 'var(--bw-text-primary)', transition: 'border-color 0.15s ease' }}
          />
        </div>

        {showNewFolder && (
          <form onSubmit={handleCreateFolder} className="mb-6 flex items-center gap-2 p-3 rounded" style={{ background: 'var(--bw-bg-surface)', border: '1px solid var(--bw-border)', borderRadius: 'var(--bw-radius-md)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--bw-text-quaternary)' }} aria-hidden="true">folder</span>
            <input type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Folder name" className="bg-transparent border-none outline-none flex-1 text-[12px]" style={{ color: 'var(--bw-text-primary)' }} autoFocus onKeyDown={e => { if (e.key === 'Escape') setShowNewFolder(false); }} />
            <button type="submit" disabled={!newFolderName.trim()} className="text-[12px] font-medium px-3 py-1 rounded disabled:opacity-30" style={{ color: 'var(--bw-accent)' }}>Create</button>
            <button type="button" onClick={() => setShowNewFolder(false)} className="text-[12px] px-2 py-1" style={{ color: 'var(--bw-text-quaternary)' }}>Cancel</button>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <nav className="space-y-0.5">
            <button
              onClick={() => setActiveFolderId(null)}
              className="w-full text-left flex items-center justify-between px-3 py-2 rounded-md text-[12px] transition-colors"
              style={{ background: !activeFolderId && !isSearching ? 'var(--bw-accent-subtle)' : 'transparent', color: !activeFolderId && !isSearching ? 'var(--bw-accent)' : 'var(--bw-text-secondary)' }}
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }} aria-hidden="true">home</span>
                All bookmarks
              </span>
              <span className="text-[11px] tabular-nums" style={{ color: 'var(--bw-text-quaternary)' }}>{folderCounts['__root__'] || 0}</span>
            </button>
            {folders.map(folder => (
              <div key={folder.id} className="group">
                {editingFolderId === folder.id ? (
                  <div className="flex items-center gap-1 px-2">
                    <input type="text" value={editFolderName} onChange={e => setEditFolderName(e.target.value)} className="flex-1 px-2 py-1 text-[12px] outline-none rounded" style={{ background: 'var(--bw-bg-input)', border: '1px solid var(--bw-border-focus)', color: 'var(--bw-text-primary)' }} autoFocus onKeyDown={e => { if (e.key === 'Enter') handleRenameFolder(folder.id); if (e.key === 'Escape') setEditingFolderId(null); }} onBlur={() => handleRenameFolder(folder.id)} />
                  </div>
                ) : (
                  <button
                    onClick={() => setActiveFolderId(folder.id)}
                    className="w-full text-left flex items-center justify-between px-3 py-2 rounded-md text-[12px] transition-colors"
                    style={{ background: activeFolderId === folder.id && !isSearching ? 'var(--bw-accent-subtle)' : 'transparent', color: activeFolderId === folder.id && !isSearching ? 'var(--bw-accent)' : 'var(--bw-text-secondary)' }}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }} aria-hidden="true">folder</span>
                      <span className="truncate">{folder.name}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="text-[11px] tabular-nums" style={{ color: 'var(--bw-text-quaternary)' }}>{folderCounts[folder.id] || 0}</span>
                      <span className="opacity-0 group-hover:opacity-100 flex items-center transition-opacity">
                        <button onClick={e => { e.stopPropagation(); setEditingFolderId(folder.id); setEditFolderName(folder.name); }} className="p-0.5" style={{ color: 'var(--bw-text-quaternary)' }} title="Rename" aria-label="Rename folder">
                          <span className="material-symbols-outlined" style={{ fontSize: '13px' }} aria-hidden="true">edit</span>
                        </button>
                        <button onClick={e => { e.stopPropagation(); onDeleteFolder(folder.id); if (activeFolderId === folder.id) setActiveFolderId(null); }} className="p-0.5" style={{ color: 'var(--bw-text-quaternary)' }} title="Delete" aria-label="Delete folder">
                          <span className="material-symbols-outlined" style={{ fontSize: '13px' }} aria-hidden="true">delete</span>
                        </button>
                      </span>
                    </span>
                  </button>
                )}
              </div>
            ))}
          </nav>

          <div className="md:col-span-3">
            {bookmarks.length === 0 ? (
              <div className="text-center mt-20">
                <span className="material-symbols-outlined mb-2" style={{ fontSize: '24px', color: 'var(--bw-text-quaternary)' }} aria-hidden="true">bookmarks</span>
                <p className="text-[13px]" style={{ color: 'var(--bw-text-tertiary)' }}>
                  Bookmark a page using the ★ in the address bar.
                </p>
              </div>
            ) : displayedBookmarks.length === 0 ? (
              <div className="text-center mt-16">
                <span className="material-symbols-outlined mb-2" style={{ fontSize: '24px', color: 'var(--bw-text-quaternary)' }} aria-hidden="true">
                  {isSearching ? 'search_off' : 'folder_open'}
                </span>
                <p className="text-[13px]" style={{ color: 'var(--bw-text-tertiary)' }}>
                  {isSearching ? `No results for "${search}"` : 'This folder is empty'}
                </p>
              </div>
            ) : (
              <div className="space-y-px">
                {displayedBookmarks.map(bm => (
                  <div
                    key={bm.id}
                    className="flex items-center justify-between px-3 py-2 rounded-md group"
                    style={{ background: 'transparent', height: '32px', transition: 'background 0.1s ease' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bw-bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div className="flex items-center gap-3 flex-1 cursor-pointer min-w-0" onClick={() => onNavigate(bm.url, bm.tabKind)}>
                      <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: '14px', color: 'var(--bw-text-quaternary)' }} aria-hidden="true">
                        {bm.tabKind === 'web' ? 'public' : 'auto_awesome'}
                      </span>
                      <span className="text-[12px] truncate" style={{ color: 'var(--bw-text-primary)' }}>{bm.title}</span>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-3">
                      <select
                        value={bm.folderId || ''} onChange={e => onMoveBookmark(bm.url, e.target.value || undefined)}
                        className="rounded px-2 py-0.5 text-[11px] outline-none max-w-[100px]"
                        style={{ background: 'var(--bw-bg-input)', border: '1px solid var(--bw-border)', color: 'var(--bw-text-tertiary)' }}
                        onClick={e => e.stopPropagation()}
                      >
                        <option value="">No folder</option>
                        {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                      </select>
                      <button onClick={() => onRemoveBookmark(bm.url)} className="p-1 rounded" style={{ color: 'var(--bw-text-quaternary)', transition: 'all 0.1s ease' }} onMouseEnter={e => { e.currentTarget.style.color = 'var(--bw-red)'; e.currentTarget.style.background = 'var(--bw-red-subtle)'; }} onMouseLeave={e => { e.currentTarget.style.color = 'var(--bw-text-quaternary)'; e.currentTarget.style.background = 'transparent'; }} title="Remove" aria-label="Remove bookmark">
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }} aria-hidden="true">delete</span>
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
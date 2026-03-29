import React, { useState } from 'react';
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
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState('');

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) { onCreateFolder(newFolderName.trim()); setNewFolderName(''); }
  };

  const handleRenameFolder = (id: string, e: React.FormEvent) => {
    e.preventDefault();
    if (editFolderName.trim()) { onRenameFolder(id, editFolderName.trim()); setEditingFolderId(null); }
  };

  return (
    <div className="w-full h-full bg-[#202124] text-gray-200 p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-medium mb-8">Bookmarks Manager</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-6">
            <div className="bg-[#292a2d] p-4 rounded-xl border border-[#3c4043]">
              <h2 className="text-lg font-medium mb-4">Folders</h2>
              <form onSubmit={handleCreateFolder} className="flex gap-2 mb-4">
                <input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="New folder name" className="flex-1 bg-[#202124] border border-[#3c4043] rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500" />
                <button type="submit" disabled={!newFolderName.trim()} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50">Add</button>
              </form>
              <div className="space-y-2">
                {folders.map(folder => (
                  <div key={folder.id} className="group flex items-center justify-between p-2 hover:bg-[#3c4043] rounded-lg transition-colors">
                    {editingFolderId === folder.id ? (
                      <form onSubmit={(e) => handleRenameFolder(folder.id, e)} className="flex gap-2 w-full">
                        <input type="text" value={editFolderName} onChange={(e) => setEditFolderName(e.target.value)} className="flex-1 bg-[#202124] border border-[#3c4043] rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-blue-500" autoFocus onBlur={() => setEditingFolderId(null)} />
                      </form>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-gray-400 text-sm">folder</span>
                          <span className="text-sm">{folder.name}</span>
                        </div>
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingFolderId(folder.id); setEditFolderName(folder.name); }} className="p-1 text-gray-500 hover:text-blue-400" title="Rename"><span className="material-symbols-outlined text-xs">edit</span></button>
                          <button onClick={() => onDeleteFolder(folder.id)} className="p-1 text-gray-500 hover:text-red-400" title="Delete"><span className="material-symbols-outlined text-xs">delete</span></button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="md:col-span-2 space-y-4">
            {bookmarks.length === 0 ? (
              <div className="text-center text-gray-500 mt-20">
                <span className="material-symbols-outlined text-6xl mb-4 opacity-50">bookmarks</span>
                <p>Your bookmarks will appear here.</p>
              </div>
            ) : (
              bookmarks.map(bookmark => (
                <div key={bookmark.id} className="bg-[#292a2d] p-4 rounded-xl border border-[#3c4043] hover:border-gray-500 transition-colors group flex items-start justify-between">
                  <div className="flex-1 cursor-pointer" onClick={() => onNavigate(bookmark.url, bookmark.tabKind)}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-gray-400 text-sm">{bookmark.tabKind === 'web' ? 'public' : 'auto_awesome'}</span>
                      <h3 className="font-medium text-gray-200 group-hover:text-blue-400 transition-colors">{bookmark.title}</h3>
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-1">{bookmark.url}</p>
                    {bookmark.folderId && (
                      <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded bg-[#3c4043] text-xs text-gray-400">
                        <span className="material-symbols-outlined text-[10px]">folder</span>
                        {folders.find(f => f.id === bookmark.folderId)?.name || 'Unknown Folder'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                    <select value={bookmark.folderId || ''} onChange={(e) => onMoveBookmark(bookmark.url, e.target.value || undefined)} className="bg-[#202124] border border-[#3c4043] rounded px-2 py-1 text-xs text-gray-400 focus:outline-none focus:border-blue-500">
                      <option value="">No Folder</option>
                      {folders.map(f => (<option key={f.id} value={f.id}>{f.name}</option>))}
                    </select>
                    <button onClick={() => onRemoveBookmark(bookmark.url)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors" title="Remove bookmark">
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

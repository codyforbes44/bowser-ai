import React, { useState } from 'react';
import { Bookmark, BookmarkFolder, TabKind } from '../types';
import { InstallPrompt } from './InstallPrompt';

interface NewTabProps {
  onCreatePage: (prompt: string) => void;
  isGrounded: boolean;
  onToggleGrounding: () => void;
  bookmarks: Bookmark[];
  bookmarkFolders: BookmarkFolder[];
  onCreateBookmarkFolder: (name: string) => void;
  onRenameBookmarkFolder: (id: string, newName: string) => void;
  onDeleteBookmarkFolder: (id: string) => void;
  onMoveBookmark: (url: string, folderId: string | undefined) => void;
  onNavigateToBookmark: (url: string, tabKind: TabKind) => void;
  onRemoveBookmark: (url: string) => void;
}

const LUCKY_PROMPTS = [
  "A real-time dashboard of the current weather in major world cities",
  "A news aggregator showing the latest headlines from today",
  "A stock market tracker with live price updates for tech companies",
  "A flight departure board for a retro-futuristic airport terminal",
  "A cocktail recipe builder where you pick ingredients and it suggests drinks",
  "A volcano monitoring dashboard with seismic activity and alert levels",
  "A deep sea creature field guide with depth zones and habitat maps",
  "A transit route planner showing connections, fares, and travel times",
  "A space mission log with crew profiles, experiments, and status updates",
  "A vintage vinyl record collection catalog sorted by genre and decade",
  "A hiking trail directory with elevation profiles and difficulty ratings",
  "A ferry timetable for an island archipelago with route maps",
];

export const NewTab: React.FC<NewTabProps> = ({ 
  onCreatePage, 
  isGrounded, 
  onToggleGrounding, 
  bookmarks, 
  bookmarkFolders,
  onCreateBookmarkFolder,
  onRenameBookmarkFolder,
  onDeleteBookmarkFolder,
  onMoveBookmark,
  onNavigateToBookmark, 
  onRemoveBookmark 
}) => {
  const [prompt, setPrompt] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [movingBookmarkUrl, setMovingBookmarkUrl] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onCreatePage(prompt.trim());
    }
  };

  const handleHowItWorks = () => {
    onCreatePage(
      `A docs page for "Bowser" — a demo powered by Gemini 3 Flash, a model released in March 2026.` +
      `The Bowser demo works by sending the user's description to the Gemini API, and Gemini generates a complete HTML page in real-time using streaming.` +
      `The page is rendered live in an iframe as tokens arrive. Links within the page trigger new prompts to Gemini, so users can navigate an entirely AI-generated web. ` +
      `Introduce Bowser in the docs, how every page is generated in realtime by Gemini 3 Flash, how each click becomes a new prompt, generated based on the previous page. ` +
      `All pages are generated from scratch using a prompt, including this one. Stat that this is enabled by the speed and coding capabilities of Gemini 3 Flash.` +
      `Add that this is an experiment only, Gemini can make mistakes, results may vary. Don't make claims about 'worlds first' or 'groundbreaking'.` +
      `Empasize that every page (*including this one*!) is generated from scratch. Generations use the previous page only, there is no state apart from the previous page.` +
      `Add a call to action of 'See Examples' which takes the user to a page with examples of things Gemini can generate.`
    );
  };

  const handleLucky = () => {
    if (prompt.trim().length >= 3) {
      onCreatePage(prompt.trim());
    } else {
      const randomPrompt = LUCKY_PROMPTS[Math.floor(Math.random() * LUCKY_PROMPTS.length)];
      onCreatePage(randomPrompt);
    }
  };

  const currentFolder = currentFolderId ? bookmarkFolders.find(f => f.id === currentFolderId) : null;
  const displayedBookmarks = bookmarks.filter(b => currentFolderId ? b.folderId === currentFolderId : !b.folderId);
  const displayedFolders = currentFolderId ? [] : bookmarkFolders;

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateBookmarkFolder(newFolderName.trim());
      setNewFolderName('');
      setIsCreatingFolder(false);
    }
  };

  const handleRenameFolder = (id: string) => {
    if (editingFolderName.trim()) {
      onRenameBookmarkFolder(id, editingFolderName.trim());
      setEditingFolderId(null);
    }
  };

  return (
    <div className="newtab-page overflow-y-auto">
      <div className="newtab-content min-h-full py-12">
        <form onSubmit={handleSubmit} className="newtab-form">
          <div className="newtab-input-row">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="newtab-input"
              placeholder="Imagine any website..."
              aria-label="Describe a website to generate"
              autoFocus
            />
            <button type="submit" className="newtab-submit" aria-label="Submit">
              <span className="material-symbols-outlined">keyboard_return</span>
            </button>
          </div>
        </form>

        <div className="flex flex-col items-center gap-6 mt-4">
          <div className="newtab-buttons">
            <button onClick={handleHowItWorks} className="newtab-btn newtab-how-it-works">
              How does this work?
            </button>
            <button onClick={handleLucky} className="newtab-btn newtab-lucky">
              I'm Feeling Lucky
            </button>
          </div>

          <div className="flex items-center gap-3 bg-[#1e1f23] px-4 py-2 rounded-full border border-white/10 hover:border-white/20 transition-colors cursor-pointer" onClick={onToggleGrounding}>
            <span className={`material-symbols-outlined text-xl ${isGrounded ? 'text-blue-400' : 'text-gray-500'}`}>
              language
            </span>
            <span className="text-sm text-gray-300 font-medium select-none">Real-time Web Browsing</span>
            <div
              className={`toggle-track ${isGrounded ? 'active' : ''}`}
              role="switch"
              aria-checked={isGrounded}
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onToggleGrounding(); }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onToggleGrounding();
                }
              }}
            >
              <div className="toggle-thumb" />
            </div>
          </div>
        </div>

        {(bookmarks.length > 0 || bookmarkFolders.length > 0) && (
          <div className="mt-16 w-full max-w-3xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-medium text-gray-200 flex items-center gap-2">
                {currentFolderId ? (
                  <>
                    <button onClick={() => setCurrentFolderId(null)} className="hover:text-blue-400 transition-colors flex items-center" title="Back to all bookmarks">
                      <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <span className="material-symbols-outlined">folder</span>
                    {currentFolder?.name}
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">bookmarks</span>
                    Bookmarks
                  </>
                )}
              </h2>
              {!currentFolderId && (
                <button onClick={() => setIsCreatingFolder(true)} className="text-sm bg-[#1e1f23] hover:bg-[#2a2b30] text-gray-300 px-3 py-1.5 rounded-md border border-[#3c4043] transition-colors flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">create_new_folder</span>
                  New Folder
                </button>
              )}
            </div>

            {isCreatingFolder && (
              <div className="mb-6 flex items-center gap-2 bg-[#202124] p-3 rounded-xl border border-[#3c4043]">
                <input type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Folder name..." className="bg-transparent border-none outline-none text-gray-200 flex-1" autoFocus onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setIsCreatingFolder(false); }} />
                <button onClick={handleCreateFolder} className="text-blue-400 hover:text-blue-300 px-2">Create</button>
                <button onClick={() => setIsCreatingFolder(false)} className="text-gray-500 hover:text-gray-400 px-2">Cancel</button>
              </div>
            )}

            {displayedFolders.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Folders</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {displayedFolders.map(folder => (
                    <div key={folder.id} className="bg-[#202124] border border-[#3c4043] rounded-xl p-3 hover:border-blue-500/50 transition-colors group flex items-center justify-between">
                      {editingFolderId === folder.id ? (
                        <input type="text" value={editingFolderName} onChange={e => setEditingFolderName(e.target.value)} className="bg-transparent border-none outline-none text-gray-200 flex-1 w-full" autoFocus onKeyDown={e => { if (e.key === 'Enter') handleRenameFolder(folder.id); if (e.key === 'Escape') setEditingFolderId(null); }} onBlur={() => handleRenameFolder(folder.id)} />
                      ) : (
                        <div className="flex items-center gap-2 cursor-pointer flex-1 overflow-hidden" onClick={() => setCurrentFolderId(folder.id)}>
                          <span className="material-symbols-outlined text-blue-400">folder</span>
                          <span className="text-gray-200 font-medium truncate">{folder.name}</span>
                        </div>
                      )}
                      {editingFolderId !== folder.id && (
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); setEditingFolderName(folder.name); setEditingFolderId(folder.id); }} className="text-gray-500 hover:text-blue-400 p-1" title="Rename folder">
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); onDeleteBookmarkFolder(folder.id); }} className="text-gray-500 hover:text-red-400 p-1" title="Delete folder">
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {displayedBookmarks.length > 0 ? (
              <div>
                {displayedFolders.length > 0 && <h3 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Pages</h3>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {displayedBookmarks.map((bookmark) => (
                    <div key={bookmark.id} className="bg-[#202124] border border-[#3c4043] rounded-xl p-4 hover:border-blue-500/50 transition-colors group flex flex-col relative">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="font-medium text-gray-200 line-clamp-2 cursor-pointer hover:text-blue-400" onClick={() => onNavigateToBookmark(bookmark.url, bookmark.tabKind)}>
                          {bookmark.title}
                        </h3>
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setMovingBookmarkUrl(movingBookmarkUrl === bookmark.url ? null : bookmark.url)} className="text-gray-500 hover:text-blue-400 p-1" title="Move to folder">
                            <span className="material-symbols-outlined text-sm">drive_file_move</span>
                          </button>
                          <button onClick={() => onRemoveBookmark(bookmark.url)} className="text-gray-500 hover:text-red-400 p-1" title="Remove bookmark">
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 line-clamp-1 mt-auto cursor-pointer" onClick={() => onNavigateToBookmark(bookmark.url, bookmark.tabKind)}>
                        {bookmark.url}
                      </div>
                      {movingBookmarkUrl === bookmark.url && (
                        <div className="absolute top-10 right-2 bg-[#2a2b30] border border-[#3c4043] rounded-lg shadow-xl z-10 p-2 w-48">
                          <div className="text-xs text-gray-400 mb-2 px-2 uppercase tracking-wider">Move to...</div>
                          <div className="max-h-40 overflow-y-auto">
                            {bookmark.folderId && (
                              <button onClick={() => { onMoveBookmark(bookmark.url, undefined); setMovingBookmarkUrl(null); }} className="w-full text-left px-2 py-1.5 text-sm text-gray-300 hover:bg-[#3c4043] rounded flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">home</span>
                                Root (Remove from folder)
                              </button>
                            )}
                            {bookmarkFolders.filter(f => f.id !== bookmark.folderId).map(folder => (
                              <button key={folder.id} onClick={() => { onMoveBookmark(bookmark.url, folder.id); setMovingBookmarkUrl(null); }} className="w-full text-left px-2 py-1.5 text-sm text-gray-300 hover:bg-[#3c4043] rounded flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm text-blue-400">folder</span>
                                <span className="truncate">{folder.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              currentFolderId && (
                <div className="text-center py-8 text-gray-500 border border-dashed border-[#3c4043] rounded-xl">
                  This folder is empty.
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

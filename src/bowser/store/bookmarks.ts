import { useState, useCallback } from 'react';
import { Bookmark, BookmarkFolder, TabKind } from '../types';
import { getStorageItem, setStorageItem } from '../utils/storage';

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => getStorageItem('bookmarks', []));
  const [bookmarkFolders, setBookmarkFolders] = useState<BookmarkFolder[]>(() => getStorageItem('bookmark-folders', []));

  const saveBookmarks = useCallback((bks: Bookmark[]) => {
    setBookmarks(bks);
    setStorageItem('bookmarks', bks);
  }, []);

  const saveFolders = useCallback((folders: BookmarkFolder[]) => {
    setBookmarkFolders(folders);
    setStorageItem('bookmark-folders', folders);
  }, []);

  const isBookmarked = useCallback((url: string) => {
    return bookmarks.some(b => b.url === url);
  }, [bookmarks]);

  const toggleBookmark = useCallback((url: string, title: string, tabKind: TabKind) => {
    if (isBookmarked(url)) {
      saveBookmarks(bookmarks.filter(b => b.url !== url));
    } else {
      const newBookmark: Bookmark = {
        id: crypto.randomUUID(),
        url,
        title,
        timestamp: Date.now(),
        tabKind,
      };
      saveBookmarks([newBookmark, ...bookmarks]);
    }
  }, [bookmarks, isBookmarked, saveBookmarks]);

  const removeBookmark = useCallback((url: string) => {
    saveBookmarks(bookmarks.filter(b => b.url !== url));
  }, [bookmarks, saveBookmarks]);

  const createFolder = useCallback((name: string) => {
    const folder: BookmarkFolder = {
      id: crypto.randomUUID(),
      name,
      timestamp: Date.now(),
    };
    saveFolders([...bookmarkFolders, folder]);
  }, [bookmarkFolders, saveFolders]);

  const renameFolder = useCallback((id: string, newName: string) => {
    saveFolders(bookmarkFolders.map(f => f.id === id ? { ...f, name: newName } : f));
  }, [bookmarkFolders, saveFolders]);

  const deleteFolder = useCallback((id: string) => {
    saveFolders(bookmarkFolders.filter(f => f.id !== id));
    saveBookmarks(bookmarks.map(b => b.folderId === id ? { ...b, folderId: undefined } : b));
  }, [bookmarkFolders, bookmarks, saveFolders, saveBookmarks]);

  const moveBookmark = useCallback((url: string, folderId: string | undefined) => {
    saveBookmarks(bookmarks.map(b => b.url === url ? { ...b, folderId } : b));
  }, [bookmarks, saveBookmarks]);

  return {
    bookmarks,
    bookmarkFolders,
    toggleBookmark,
    isBookmarked,
    createFolder,
    renameFolder,
    deleteFolder,
    moveBookmark,
    removeBookmark,
  };
}

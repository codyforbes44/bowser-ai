export const STORAGE_PREFIX = 'bowser-';
export const OLD_STORAGE_PREFIX = 'flash-lite-';

/** Check if localStorage is available and writable */
let _storageAvailable: boolean | null = null;
export function isStorageAvailable(): boolean {
  if (_storageAvailable !== null) return _storageAvailable;
  try {
    const testKey = '__bowser_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    _storageAvailable = true;
  } catch {
    _storageAvailable = false;
  }
  return _storageAvailable;
}

export function getStorageItem<T>(key: string, defaultValue: T): T {
  if (!isStorageAvailable()) return defaultValue;
  try {
    const newKey = `${STORAGE_PREFIX}${key}`;
    const oldKey = `${OLD_STORAGE_PREFIX}${key}`;
    
    let stored = localStorage.getItem(newKey);
    
    if (stored === null) {
      stored = localStorage.getItem(oldKey);
      if (stored !== null) {
        try {
          localStorage.setItem(newKey, stored);
        } catch {
          // Migration failed — quota or access issue; continue with old value
        }
      }
    }

    return stored !== null ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setStorageItem<T>(key: string, value: T): void {
  if (!isStorageAvailable()) return;
  try {
    const newKey = `${STORAGE_PREFIX}${key}`;
    localStorage.setItem(newKey, JSON.stringify(value));
  } catch {
    // Quota exceeded or storage unavailable — fail silently
  }
}

export function removeStorageItem(key: string): void {
  if (!isStorageAvailable()) return;
  try {
    const newKey = `${STORAGE_PREFIX}${key}`;
    localStorage.removeItem(newKey);
  } catch {
    // Storage unavailable — fail silently
  }
}

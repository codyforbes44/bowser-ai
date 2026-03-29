export const STORAGE_PREFIX = 'bowser-';
export const OLD_STORAGE_PREFIX = 'flash-lite-';

export function getStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const newKey = `${STORAGE_PREFIX}${key}`;
    const oldKey = `${OLD_STORAGE_PREFIX}${key}`;
    
    let stored = localStorage.getItem(newKey);
    
    if (stored === null) {
      stored = localStorage.getItem(oldKey);
      if (stored !== null) {
        try {
          localStorage.setItem(newKey, stored);
        } catch (e) {
          console.warn(`Failed to migrate key ${oldKey} to ${newKey}`, e);
        }
      }
    }

    return stored !== null ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setStorageItem<T>(key: string, value: T): void {
  try {
    const newKey = `${STORAGE_PREFIX}${key}`;
    localStorage.setItem(newKey, JSON.stringify(value));
  } catch (e) {
    console.warn(`Failed to save ${key} to localStorage`, e);
  }
}

export function removeStorageItem(key: string): void {
  try {
    const newKey = `${STORAGE_PREFIX}${key}`;
    localStorage.removeItem(newKey);
  } catch (e) {
    console.warn(`Failed to remove ${key} from localStorage`, e);
  }
}

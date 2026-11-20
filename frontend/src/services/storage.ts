import type { KeyStorage } from '../utils/checkout.ts';

// Browser storage with a memory fallback (private mode or blocked site data make it unavailable).

function memoryStorage(): KeyStorage {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
  };
}

function browserStorageOrMemory(pick: () => Storage): KeyStorage {
  try {
    const probe = '__foodiehub_probe__';
    const s = pick();
    s.setItem(probe, probe);
    s.removeItem(probe);
    return {
      getItem: (key) => {
        try {
          return s.getItem(key);
        } catch {
          return null;
        }
      },
      setItem: (key, value) => {
        try {
          s.setItem(key, value);
        } catch {
          // Quota or access error: the value is simply not kept.
        }
      },
      removeItem: (key) => {
        try {
          s.removeItem(key);
        } catch {
          // ignore
        }
      },
    };
  } catch {
    return memoryStorage();
  }
}

/** This tab only: the pending checkout key. */
export const sessionStore: KeyStorage = browserStorageOrMemory(() => window.sessionStorage);

/** This browser, across refreshes and restarts: the cart (prices in it are for display only). */
export const localStore: KeyStorage = browserStorageOrMemory(() => window.localStorage);

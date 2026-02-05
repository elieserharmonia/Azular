/**
 * Safe wrapper for localStorage to prevent crashes in restricted environments (like some sandbox previews)
 * or when the user has cookies/storage disabled.
 */

export const safeStorage = {
  get: (key: string): string | null => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return null;
      return localStorage.getItem(key);
    } catch (e) {
      console.warn(`Storage access denied for key: ${key}`, e);
      return null;
    }
  },

  set: (key: string, value: string): boolean => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return false;
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.warn(`Storage write denied for key: ${key}`, e);
      return false;
    }
  },

  remove: (key: string): void => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`Storage remove denied for key: ${key}`, e);
    }
  },

  clear: (): void => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      localStorage.clear();
    } catch (e) {
      console.warn(`Storage clear denied`, e);
    }
  }
};
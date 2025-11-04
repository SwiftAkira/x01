/**
 * Local Storage Wrapper
 * Type-safe wrapper for localStorage operations
 */

import { STORAGE_KEYS } from './constants';

/**
 * Get item from localStorage
 */
export const getStorageItem = <T>(key: string): T | null => {
  try {
    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : null;
  } catch (error) {
    console.error(`Error reading from localStorage: ${key}`, error);
    return null;
  }
};

/**
 * Set item in localStorage
 */
export const setStorageItem = <T>(key: string, value: T): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error writing to localStorage: ${key}`, error);
    return false;
  }
};

/**
 * Remove item from localStorage
 */
export const removeStorageItem = (key: string): boolean => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing from localStorage: ${key}`, error);
    return false;
  }
};

/**
 * Clear all app-related items from localStorage
 */
export const clearAppStorage = (): void => {
  Object.values(STORAGE_KEYS).forEach((key) => {
    removeStorageItem(key);
  });
};

/**
 * Check if localStorage is available
 */
export const isStorageAvailable = (): boolean => {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

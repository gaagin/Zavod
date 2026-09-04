/**
 * File System Storage Helper
 * Safely persists and restores FileSystemDirectoryHandle using browser IndexedDB.
 */

const DB_NAME = 'PromSchemaFS_DB';
const STORE_NAME = 'handles';
const KEY_DIR = 'target_directory_handle';
const KEY_FILENAME = 'target_project_filename';

function openHandleDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB is not available'));
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Stores the directory handle in IndexedDB
 */
export async function storeDirectoryHandle(handle: any): Promise<void> {
  try {
    const db = await openHandleDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(handle, KEY_DIR);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('[FS Storage] Could not save directory handle in IndexedDB:', e);
  }
}

/**
 * Retrieves the stored directory handle from IndexedDB
 */
export async function getStoredDirectoryHandle(): Promise<any | null> {
  try {
    const db = await openHandleDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY_DIR);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

/**
 * Deletes the stored directory handle from IndexedDB
 */
export async function clearStoredDirectoryHandle(): Promise<void> {
  try {
    const db = await openHandleDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(KEY_DIR);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('[FS Storage] Could not clear directory handle:', e);
  }
}

/**
 * Stores the target project filename
 */
export async function storeProjectFilename(filename: string): Promise<void> {
  try {
    const db = await openHandleDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(filename, KEY_FILENAME);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    try {
      localStorage.setItem('promschema_project_filename', filename);
    } catch {}
  }
}

/**
 * Retrieves the stored target project filename
 */
export async function getStoredProjectFilename(): Promise<string | null> {
  try {
    const db = await openHandleDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY_FILENAME);
      req.onsuccess = () => {
        if (req.result) return resolve(req.result);
        const fallback = localStorage.getItem('promschema_project_filename');
        resolve(fallback || null);
      };
      req.onerror = () => {
        const fallback = localStorage.getItem('promschema_project_filename');
        resolve(fallback || null);
      };
    });
  } catch (e) {
    return localStorage.getItem('promschema_project_filename');
  }
}

/**
 * Verifies readwrite permission for a directory handle
 */
export async function verifyDirectoryPermission(
  dirHandle: any,
  requestIfPrompt = false
): Promise<boolean> {
  if (!dirHandle || typeof dirHandle.queryPermission !== 'function') {
    return false;
  }
  try {
    const opts = { mode: 'readwrite' as const };
    const perm = await dirHandle.queryPermission(opts);
    if (perm === 'granted') {
      return true;
    }
    if (requestIfPrompt && typeof dirHandle.requestPermission === 'function') {
      const reqPerm = await dirHandle.requestPermission(opts);
      return reqPerm === 'granted';
    }
  } catch (err) {
    console.warn('[FS Storage] Error querying directory permission:', err);
  }
  return false;
}

const DATABASE_NAME = "tanbunism-local-files";
const STORE_NAME = "directory-handles";
const LAST_DIRECTORY_KEY = "reading-notes";

export type StoredDirectoryHandle = FileSystemDirectoryHandle & {
  queryPermission?: (options: { mode: "read" }) => Promise<PermissionState>;
  requestPermission?: (options: { mode: "read" }) => Promise<PermissionState>;
  entries: () => AsyncIterableIterator<
    [string, FileSystemFileHandle | FileSystemDirectoryHandle]
  >;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadDirectoryHandle(): Promise<
  StoredDirectoryHandle | undefined
> {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = database
        .transaction(STORE_NAME, "readonly")
        .objectStore(STORE_NAME)
        .get(LAST_DIRECTORY_KEY);
      request.onsuccess = () =>
        resolve(request.result as StoredDirectoryHandle | undefined);
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}

export async function saveDirectoryHandle(
  handle: StoredDirectoryHandle,
): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const request = database
        .transaction(STORE_NAME, "readwrite")
        .objectStore(STORE_NAME)
        .put(handle, LAST_DIRECTORY_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}

export async function filesFromDirectory(
  root: StoredDirectoryHandle,
): Promise<File[]> {
  const files: File[] = [];

  async function visit(directory: StoredDirectoryHandle, segments: string[]) {
    for await (const [name, handle] of directory.entries()) {
      const path = [...segments, name];
      if (handle.kind === "directory") {
        await visit(handle as StoredDirectoryHandle, path);
        continue;
      }
      const file = await (handle as FileSystemFileHandle).getFile();
      Object.defineProperty(file, "webkitRelativePath", {
        configurable: true,
        value: [root.name, ...path].join("/"),
      });
      files.push(file);
    }
  }

  await visit(root, []);
  return files;
}

import { openDB, DBSchema, IDBPDatabase } from "idb";

interface CryptoDBSchema extends DBSchema {
  keyPairs: {
    key: string;
    value: CryptoKey;
  };
}

const DB_NAME = "SecureChatDB";
const DB_VERSION = 1;
const STORE_NAME = "keyPairs";

export const ECDH_PRIVATE_KEY = "ecdhPrivateKey";
export const ECDSA_PRIVATE_KEY = "ecdsaPrivateKey";

async function getDB(): Promise<IDBPDatabase<CryptoDBSchema>> {
  return openDB<CryptoDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
}
export async function storePrivateKey(
  keyName: string,
  key: CryptoKey
): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAME, key, keyName);
}
export async function getPrivateKey(
  keyName: string
): Promise<CryptoKey | undefined> {
  const db = await getDB();
  return db.get(STORE_NAME, keyName);
}
export async function hasPrivateKey(keyName: string): Promise<boolean> {
  const db = await getDB();
  const key = await db.get(STORE_NAME, keyName);
  return !!key;
}
export async function clearAllKeys(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE_NAME);
}

import { openDB } from "idb";
import * as ecdsa from "@/lib/crypto/ecdsa";
import * as ecdh from "@/lib/crypto/ecdh";

const DB_NAME = "securechat-keys";
const STORE_NAME = "keys";

export interface KeyPair {
  ecdsaPrivateKey: CryptoKey;
  ecdsaPublicKey: string;
  ecdhPrivateKey: CryptoKey;
  ecdhPublicKey: string;
}

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
}

export async function generateAndStoreKeys(userId: string): Promise<KeyPair> {
  // Generate ECDSA keypair for signing
  const ecdsaKeyPair = await ecdsa.generateECDSAKeyPair();
  const ecdsaPublicKeyJwk = await ecdsa.exportPublicKey(ecdsaKeyPair.publicKey);
  const ecdsaPrivateKeyJwk = await ecdsa.exportPrivateKey(
    ecdsaKeyPair.privateKey
  );

  // Generate ECDH keypair for key exchange
  const ecdhKeyPair = await ecdh.generateECDHKeyPair();
  const ecdhPublicKeyJwk = await ecdh.exportPublicKeyJwk(ecdhKeyPair.publicKey);
  const ecdhPrivateKeyJwk = await crypto.subtle.exportKey(
    "jwk",
    ecdhKeyPair.privateKey
  );

  // Store private keys in IndexedDB
  const db = await getDB();
  await db.put(STORE_NAME, ecdsaPrivateKeyJwk, `${userId}-ecdsa-private`);
  await db.put(STORE_NAME, ecdhPrivateKeyJwk, `${userId}-ecdh-private`);

  console.log("Keys generated and stored in IndexedDB");

  return {
    ecdsaPrivateKey: ecdsaKeyPair.privateKey,
    ecdsaPublicKey: ecdsaPublicKeyJwk,
    ecdhPrivateKey: ecdhKeyPair.privateKey,
    ecdhPublicKey: ecdhPublicKeyJwk,
  };
}

export async function loadKeysFromStorage(
  userId: string
): Promise<KeyPair | null> {
  try {
    const db = await getDB();
    const ecdsaPrivateKeyJwk = await db.get(
      STORE_NAME,
      `${userId}-ecdsa-private`
    );
    const ecdhPrivateKeyJwk = await db.get(
      STORE_NAME,
      `${userId}-ecdh-private`
    );

    if (!ecdsaPrivateKeyJwk || !ecdhPrivateKeyJwk) {
      return null;
    }

    // Import private keys
    const ecdsaPrivateKey = await ecdsa.importPrivateKey(ecdsaPrivateKeyJwk);
    const ecdhPrivateKey = await crypto.subtle.importKey(
      "jwk",
      ecdhPrivateKeyJwk,
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveKey", "deriveBits"]
    );

    // Export public keys (from private keys)
    const ecdsaPublicKeyJwk = await ecdsa.exportPublicKey(
      await crypto.subtle.importKey(
        "jwk",
        { ...ecdsaPrivateKeyJwk, d: undefined, key_ops: ["verify"] },
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["verify"]
      )
    );

    const ecdhPublicKeyJwk = JSON.stringify({
      kty: ecdhPrivateKeyJwk.kty,
      crv: ecdhPrivateKeyJwk.crv,
      x: ecdhPrivateKeyJwk.x,
      y: ecdhPrivateKeyJwk.y,
    });

    console.log("Keys loaded from IndexedDB");

    return {
      ecdsaPrivateKey,
      ecdsaPublicKey: ecdsaPublicKeyJwk,
      ecdhPrivateKey,
      ecdhPublicKey: ecdhPublicKeyJwk,
    };
  } catch (error) {
    console.error("Failed to load keys:", error);
    return null;
  }
}

export async function clearKeys(userId: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, `${userId}-ecdsa-private`);
  await db.delete(STORE_NAME, `${userId}-ecdh-private`);
  console.log("Keys cleared from IndexedDB");
}

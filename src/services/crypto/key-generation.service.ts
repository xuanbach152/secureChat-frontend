import {
  storePrivateKey,
  storePublicKey,
  getPrivateKey,
  hasPrivateKey,
  ECDH_PRIVATE_KEY,
  ECDSA_PRIVATE_KEY,
  ECDH_PUBLIC_KEY,
  ECDSA_PUBLIC_KEY,
} from "./indexeddb.service";
import { keysService } from "../api/keys.service";

export async function generateECDHKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    ["deriveKey", "deriveBits"]
  );
}

export async function generateECDSAKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["sign", "verify"]
  );
}

export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("spki", key);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
  return base64;
}
export async function importECDHPublicKey(base64: string): Promise<CryptoKey> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return crypto.subtle.importKey(
    "spki",
    bytes,
    {
      name: "ECDH",
      namedCurve: "P-256",
    },
    true,
    []
  );
}
export async function importECDSAPublicKey(base64: string): Promise<CryptoKey> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return crypto.subtle.importKey(
    "spki",
    bytes,
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["verify"]
  );
}
export async function generateAndStoreKeys(): Promise<void> {
  // Generate ECDH key pair
  const ecdhKeyPair = await generateECDHKeyPair();
  const ecdhPublicKeyBase64 = await exportPublicKey(ecdhKeyPair.publicKey);
  await storePrivateKey(ECDH_PRIVATE_KEY, ecdhKeyPair.privateKey);
  await storePublicKey(ECDH_PUBLIC_KEY, ecdhPublicKeyBase64);

  // Generate ECDSA key pair
  const ecdsaKeyPair = await generateECDSAKeyPair();
  const ecdsaPublicKeyBase64 = await exportPublicKey(ecdsaKeyPair.publicKey);
  await storePrivateKey(ECDSA_PRIVATE_KEY, ecdsaKeyPair.privateKey);
  await storePublicKey(ECDSA_PUBLIC_KEY, ecdsaPublicKeyBase64);

  // Upload to backend
  await keysService.uploadKeys({
    ecdhPublicKey: ecdhPublicKeyBase64,
    ecdsaPublicKey: ecdsaPublicKeyBase64,
  });

  console.log(
    " Keys generated and stored (private + public in IndexedDB, public on server)"
  );
}
export async function hasLocalKeys(): Promise<boolean> {
  const hasECDH = await hasPrivateKey(ECDH_PRIVATE_KEY);
  const hasECDSA = await hasPrivateKey(ECDSA_PRIVATE_KEY);
  return hasECDH && hasECDSA;
}

// Load private keys from IndexedDB
export async function loadPrivateKeys(): Promise<{
  ecdhPrivateKey: CryptoKey;
  ecdsaPrivateKey: CryptoKey;
} | null> {
  const ecdhPrivateKey = await getPrivateKey(ECDH_PRIVATE_KEY);
  const ecdsaPrivateKey = await getPrivateKey(ECDSA_PRIVATE_KEY);

  if (!ecdhPrivateKey || !ecdsaPrivateKey) {
    return null;
  }

  return { ecdhPrivateKey, ecdsaPrivateKey };
}

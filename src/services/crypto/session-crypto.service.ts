import {
  generateECDHKeyPair,
  exportPublicKey,
  importECDHPublicKey,
} from "./key-generation.service";
import { signMessage } from "./signature.service";
import { storePrivateKey, getPrivateKey } from "./indexeddb.service";

export async function generateEphemeralKeys(): Promise<{
  publicKey: string;
  privateKey: CryptoKey;
  signature: string;
}> {
  const keyPair = await generateECDHKeyPair();
  const publicKeyBase64 = await exportPublicKey(keyPair.publicKey);
  const signature = await signMessage(publicKeyBase64);

  return {
    publicKey: publicKeyBase64,
    privateKey: keyPair.privateKey,
    signature,
  };
}

export async function storeEphemeralPrivateKey(
  sessionId: string,
  privateKey: CryptoKey
): Promise<void> {
  await storePrivateKey(`session_${sessionId}_ecdh`, privateKey);
}

export async function getEphemeralPrivateKey(
  sessionId: string
): Promise<CryptoKey | undefined> {
  return getPrivateKey(`session_${sessionId}_ecdh`);
}

export async function deriveSessionSharedSecret(
  sessionId: string,
  theirEphemeralPublicKey: string
): Promise<CryptoKey> {
  const myEphemeralPrivate = await getEphemeralPrivateKey(sessionId);
  if (!myEphemeralPrivate) {
    throw new Error(`Ephemeral private key not found for session ${sessionId}`);
  }
  const theirPublicKey = await importECDHPublicKey(theirEphemeralPublicKey);

  const sharedBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: theirPublicKey },
    myEphemeralPrivate,
    256
  );
  return crypto.subtle.importKey(
    "raw",
    sharedBits,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

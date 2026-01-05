import {
  generateAndStoreKeys,
  hasLocalKeys,
  loadPrivateKeys,
} from "./key-generation.service";
import {
  getSharedSecretWithUser,
  encryptMessage,
  decryptMessage,
} from "./encryption.service";
import { signMessage, verifySignature } from "./signature.service";
import { keysService } from "../api/keys.service";
import {
  clearAllKeys,
  getPublicKey,
  ECDH_PUBLIC_KEY,
  ECDSA_PUBLIC_KEY,
} from "./indexeddb.service";
import { deriveSessionSharedSecret } from "./session-crypto.service";
const sharedSecretCache = new Map<string, CryptoKey>();

export async function initializeUserKeys(userId: string): Promise<void> {
  if (!userId || userId === "undefined") {
    console.error(" Invalid userId:", userId);
    throw new Error("Cannot initialize keys: userId is invalid");
  }

  const hasLocalKeys_ = await hasLocalKeys();
  const hasServerKeys = await keysService.checkKeysExist(userId);

  console.log("Key status - Local:", hasLocalKeys_, "Server:", hasServerKeys);

  if (!hasLocalKeys_ && !hasServerKeys) {
    console.log(" No keys found. Generating new keys (first-time)...");
    await generateAndStoreKeys();
    return;
  }

  if (hasLocalKeys_ && !hasServerKeys) {
    console.log(" Local keys exist but NOT on server. Re-uploading...");

    const localEcdhPublic = await getPublicKey(ECDH_PUBLIC_KEY);
    const localEcdsaPublic = await getPublicKey(ECDSA_PUBLIC_KEY);

    if (localEcdhPublic && localEcdsaPublic) {
      await keysService.uploadKeys({
        ecdhPublicKey: localEcdhPublic,
        ecdsaPublicKey: localEcdsaPublic,
      });
      sharedSecretCache.clear();
      console.log(" Local keys re-synced to server (no regeneration)");
      return;
    }

    throw new Error(
      "Local public keys missing. Cannot re-upload. Restore from backup to keep history."
    );
  }

  if (!hasLocalKeys_ && hasServerKeys) {
    console.error(
      " Server has keys but local private keys are missing. Cannot decrypt history on this device."
    );
    throw new Error(
      "Missing local private keys. Restore your keys backup to read old messages."
    );
  }

  console.log(" Verifying local keys match server keys...");

  const localEcdhPublic = await getPublicKey(ECDH_PUBLIC_KEY);
  const localEcdsaPublic = await getPublicKey(ECDSA_PUBLIC_KEY);

  if (!localEcdhPublic || !localEcdsaPublic) {
    throw new Error(
      "Local public keys missing. Restore from backup to keep history."
    );
  }

  const serverKeys = await keysService.getPublicKeys(userId);

  const ecdhMatch = localEcdhPublic === serverKeys.ecdhPublicKey;
  const ecdsaMatch = localEcdsaPublic === serverKeys.ecdsaPublicKey;

  console.log("   ECDH keys match:", ecdhMatch);
  console.log("   ECDSA keys match:", ecdsaMatch);

  if (!ecdhMatch || !ecdsaMatch) {
    console.log(
      " Keys DO NOT match! Overwriting server keys with local (fixed keys policy)..."
    );
    await keysService.uploadKeys({
      ecdhPublicKey: localEcdhPublic,
      ecdsaPublicKey: localEcdsaPublic,
    });
    sharedSecretCache.clear();
    console.log(
      " Server keys overwritten to match local (history preserved on this device)"
    );
    return;
  }

  sharedSecretCache.clear();
  console.log(" Keys verified and cache cleared");
}

export async function encryptAndSignMessageWithSession(
  plaintext: string,
  sessionId: string,
  theirEphemeralPublicKey: string
): Promise<{
  encryptedContent: string;
  iv: string;
  signature: string;
  messageKeyInfo: {
    messageId: string;
    nonce: string;
    sessionId: string;
  };
}> {
  const sharedSecret = await deriveSessionSharedSecret(
    sessionId,
    theirEphemeralPublicKey
  );
  const { encryptedContent, iv } = await encryptMessage(
    plaintext,
    sharedSecret
  );

  const signature = await signMessage(encryptedContent);

  const messageId = crypto.randomUUID();
  const nonce = btoa(
    String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16)))
  );

  return {
    encryptedContent,
    iv,
    signature,
    messageKeyInfo: {
      messageId,
      nonce,
      sessionId,
    },
  };
}

export async function decryptAndVerifyMessageWithSession(
  encryptedContent: string,
  iv: string,
  signature: string,
  senderEcdsaPublicKey: string,
  sessionId: string,
  senderEphemeralPublicKey: string
): Promise<string> {
  const isValid = await verifySignature(
    encryptedContent,
    signature,
    senderEcdsaPublicKey
  );

  if (!isValid) {
    throw new Error("Invalid signature");
  }

  const sharedSecret = await deriveSessionSharedSecret(
    sessionId,
    senderEphemeralPublicKey
  );
  return decryptMessage(encryptedContent, iv, sharedSecret);
}

export async function clearCryptoData(): Promise<void> {
  await clearAllKeys();
  sharedSecretCache.clear();
  console.log(" Crypto data cleared");
}

export { hasLocalKeys, loadPrivateKeys, generateAndStoreKeys };

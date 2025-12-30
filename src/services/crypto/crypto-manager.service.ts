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

const sharedSecretCache = new Map<string, CryptoKey>();

export async function initializeUserKeys(userId: string): Promise<void> {
  if (!userId || userId === "undefined") {
    console.error(" Invalid userId:", userId);
    throw new Error("Cannot initialize keys: userId is invalid");
  }

  const hasLocalKeys_ = await hasLocalKeys();
  const hasServerKeys = await keysService.checkKeysExist(userId);

  console.log("Key status - Local:", hasLocalKeys_, "Server:", hasServerKeys);

  // Case 1: No keys anywhere -> first-time init (registration)
  if (!hasLocalKeys_ && !hasServerKeys) {
    console.log(" No keys found. Generating new keys (first-time)...");
    await generateAndStoreKeys();
    return;
  }

  // Case 2: Local keys exist, server missing -> push local pubkeys (keep history)
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

    // Missing local public keys means store is corrupted; but DO NOT regenerate to avoid breaking history
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

  // Case 4: Both exist - VERIFY they match!
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

  // Clear shared secret cache to force fresh derivation with verified keys
  sharedSecretCache.clear();
  console.log(" Keys verified and cache cleared");
}

export async function encryptAndSignMessage(
  plaintext: string,
  receiverUserId: string
): Promise<{
  encryptedContent: string;
  iv: string;
  signature: string;
}> {
  try {
    console.log(
      " Encrypting for receiver:",
      receiverUserId,
      "type:",
      typeof receiverUserId
    );

    const receiverKeys = await keysService.getPublicKeys(receiverUserId);

    if (!receiverKeys.ecdhPublicKey || !receiverKeys.ecdsaPublicKey) {
      throw new Error(
        `User ${receiverUserId} does not have public keys on server. They need to login first.`
      );
    }

    let sharedSecret = sharedSecretCache.get(receiverUserId);
    if (!sharedSecret) {
      sharedSecret = await getSharedSecretWithUser(receiverKeys.ecdhPublicKey);
      sharedSecretCache.set(receiverUserId, sharedSecret);
    }

    const { encryptedContent, iv } = await encryptMessage(
      plaintext,
      sharedSecret
    );

    console.log(
      " Encrypted content:",
      encryptedContent.substring(0, 50) + "..."
    );
    console.log(" IV:", iv.substring(0, 30) + "...");

    const signature = await signMessage(encryptedContent);

    console.log(" Created signature:", signature.substring(0, 50) + "...");
    console.log("Encryption complete");

    return {
      encryptedContent,
      iv,
      signature,
    };
  } catch (error) {
    console.error("Encryption failed:", error);
    throw error;
  }
}

export async function decryptAndVerifyMessage(
  encryptedContent: string,
  iv: string,
  signature: string,
  senderUserId: string
): Promise<string> {
  console.log(" Decrypting from sender:", senderUserId);

  const senderKeys = await keysService.getPublicKeys(senderUserId);
  console.log(
    " Sender's ECDH public key:",
    senderKeys.ecdhPublicKey?.substring(0, 50) + "..."
  );

  if (!senderKeys.ecdhPublicKey || !senderKeys.ecdsaPublicKey) {
    throw new Error(`Sender ${senderUserId} missing public keys on server`);
  }

  console.log(" Verifying signature...");
  const isValid = await verifySignature(
    encryptedContent,
    signature,
    senderKeys.ecdsaPublicKey
  );

  console.log("   Signature valid:", isValid);

  if (!isValid) {
    console.error(" Signature verification failed!");
    throw new Error("Invalid signature! Message may be tampered.");
  }

  console.log(" Deriving shared secret...");
  let sharedSecret = sharedSecretCache.get(senderUserId);
  if (!sharedSecret) {
    sharedSecret = await getSharedSecretWithUser(senderKeys.ecdhPublicKey);
    sharedSecretCache.set(senderUserId, sharedSecret);
    console.log("    Shared secret derived and cached");
  } else {
    console.log("    Using cached shared secret");
  }

  console.log(" Decrypting message...");
  try {
    const plaintext = await decryptMessage(encryptedContent, iv, sharedSecret);
    console.log("    Decryption successful!");
    return plaintext;
  } catch (error) {
    console.error(" Decryption failed:", error);
    console.log(" Clearing cache and retrying with fresh shared secret...");

    // Clear cache and retry once
    sharedSecretCache.delete(senderUserId);

    try {
      const freshSecret = await getSharedSecretWithUser(
        senderKeys.ecdhPublicKey
      );
      const plaintext = await decryptMessage(encryptedContent, iv, freshSecret);
      sharedSecretCache.set(senderUserId, freshSecret);
      console.log("    Retry successful!");
      return plaintext;
    } catch {
      console.error(" Retry failed. Keys are out of sync!");
      console.error(" Solution: Both users need to logout and login again");
      throw new Error(
        "Cannot decrypt message. Keys out of sync. Try re-login."
      );
    }
  }
}

export async function clearCryptoData(): Promise<void> {
  await clearAllKeys();
  sharedSecretCache.clear();
  console.log(" Crypto data cleared");
}

export { hasLocalKeys, loadPrivateKeys, generateAndStoreKeys };

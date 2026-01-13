import * as ecdh from "@/lib/crypto/ecdh";
import * as keyManager from "./keyManager";
import { axiosInstance } from "@/lib/axios";

// Cache shared secrets in memory
const sharedSecretCache = new Map<string, CryptoKey>();

export async function getSharedSecret(
  myUserId: string,
  otherUserId: string
): Promise<CryptoKey> {
  console.log(
    `[SharedSecret] Getting shared secret for myUserId=${myUserId}, otherUserId=${otherUserId}`
  );

  const cacheKey = [myUserId, otherUserId].sort().join("-");

  // Return cached if exists
  if (sharedSecretCache.has(cacheKey)) {
    console.log(`[SharedSecret] Returning cached for ${cacheKey}`);
    return sharedSecretCache.get(cacheKey)!;
  }

  console.log(`[SharedSecret] Deriving new shared secret for ${cacheKey}`);

  // Load my private ECDH key
  const myKeys = await keyManager.loadKeysFromStorage(myUserId);
  if (!myKeys) {
    throw new Error(`[SharedSecret] My keys not found for ${myUserId}`);
  }
  console.log(`[SharedSecret] Loaded my keys for ${myUserId}`);

  // Fetch other user's public ECDH key from server
  const response = await axiosInstance.get<{
    userId: string;
    ecdsaPublicKey: string;
    ecdhPublicKey: string;
  }>(`/users/public-keys/${otherUserId}`);

  if (!response.data.ecdhPublicKey) {
    throw new Error(
      `[SharedSecret] Other user's ECDH public key not found for ${otherUserId}`
    );
  }
  console.log(`[SharedSecret] Fetched public key for ${otherUserId}`);

  // Import other user's public key
  const otherPublicKey = await ecdh.importPublicKeyJwk(
    response.data.ecdhPublicKey
  );
  console.log(`[SharedSecret] Imported public key for ${otherUserId}`);

  // Derive shared secret using ECDH
  const sharedSecret = await crypto.subtle.deriveKey(
    {
      name: "ECDH",
      public: otherPublicKey,
    },
    myKeys.ecdhPrivateKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false, // non-extractable for security
    ["encrypt", "decrypt"]
  );

  // Cache it
  sharedSecretCache.set(cacheKey, sharedSecret);
  console.log(
    `[SharedSecret] ✓ Derived and cached shared secret for ${cacheKey}`
  );

  return sharedSecret;
}

export function clearCache() {
  sharedSecretCache.clear();
  console.log("Shared secret cache cleared");
}

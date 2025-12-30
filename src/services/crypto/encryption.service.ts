import { getPrivateKey, ECDH_PRIVATE_KEY } from "./indexeddb.service";
import { importECDHPublicKey } from "./key-generation.service";

// Derive shared secret using ECDH
export async function deriveSharedSecret(
  myPrivateKey: CryptoKey,
  theirPublicKeyBase64: string
): Promise<CryptoKey> {
  const theirPublicKey = await importECDHPublicKey(theirPublicKeyBase64);

  const sharedBits = await crypto.subtle.deriveBits(
    {
      name: "ECDH",
      public: theirPublicKey,
    },
    myPrivateKey,
    256
  );

  return crypto.subtle.importKey(
    "raw",
    sharedBits,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  );
}

// Encrypt message with AES-GCM
export async function encryptMessage(
  plaintext: string,
  sharedSecret: CryptoKey
): Promise<{ encryptedContent: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    sharedSecret,
    data
  );

  const encryptedBase64 = btoa(
    String.fromCharCode(...new Uint8Array(encrypted))
  );
  const ivBase64 = btoa(String.fromCharCode(...iv));

  return {
    encryptedContent: encryptedBase64,
    iv: ivBase64,
  };
}

// Decrypt message with AES-GCM
export async function decryptMessage(
  encryptedContentBase64: string,
  ivBase64: string,
  sharedSecret: CryptoKey
): Promise<string> {
  const encryptedBinary = atob(encryptedContentBase64);
  const encrypted = new Uint8Array(encryptedBinary.length);
  for (let i = 0; i < encryptedBinary.length; i++) {
    encrypted[i] = encryptedBinary.charCodeAt(i);
  }

  const ivBinary = atob(ivBase64);
  const iv = new Uint8Array(ivBinary.length);
  for (let i = 0; i < ivBinary.length; i++) {
    iv[i] = ivBinary.charCodeAt(i);
  }

  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    sharedSecret,
    encrypted
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

export async function getSharedSecretWithUser(
  otherUserPublicKey: string
): Promise<CryptoKey> {
  const myPrivateKey = await getPrivateKey(ECDH_PRIVATE_KEY);
  if (!myPrivateKey) {
    throw new Error("Private key not found. Please generate keys first.");
  }

  return deriveSharedSecret(myPrivateKey, otherUserPublicKey);
}

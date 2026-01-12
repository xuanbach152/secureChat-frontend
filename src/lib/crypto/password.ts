import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  stringToArrayBuffer,
  arrayBufferToString,
} from "./utils";

export async function encryptPrivateKey(
  privateKeyJwk: JsonWebKey,
  password: string
): Promise<{ encrypted: string; salt: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));

  const passwordKey = await crypto.subtle.importKey(
    "raw",
    stringToArrayBuffer(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const encryptionKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    passwordKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt"]
  );
  const jwkString = JSON.stringify(privateKeyJwk);
  const jwkBuffer = stringToArrayBuffer(jwkString);

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
      tagLength: 128,
    },
    encryptionKey,
    jwkBuffer
  );

  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.byteLength);

  return {
    encrypted: arrayBufferToBase64(combined.buffer),
    salt: arrayBufferToBase64(salt.buffer),
  };
}

export async function decryptPrivateKey(
  encryptedBase64: string,
  saltBase64: string,
  password: string
): Promise<CryptoKey> {
  const salt = base64ToArrayBuffer(saltBase64);
  const combined = base64ToArrayBuffer(encryptedBase64);

  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const passwordKey = await crypto.subtle.importKey(
    "raw",
    stringToArrayBuffer(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const decryptionKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    passwordKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["decrypt"]
  );
  try {
    const jwkBuffer = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
        tagLength: 128,
      },
      decryptionKey,
      ciphertext
    );

    const jwkString = arrayBufferToString(jwkBuffer);
    const jwk = JSON.parse(jwkString);

    return await crypto.subtle.importKey(
      "jwk",
      jwk,
      {
        name: "ECDSA",
        namedCurve: "P-256",
      },
      true,
      ["sign"]
    );
  } catch (error) {
    console.log(error);
    throw new Error("Incorrect password or corrupted key");
  }
}

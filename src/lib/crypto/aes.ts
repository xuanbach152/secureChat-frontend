import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  stringToArrayBuffer,
  arrayBufferToString,
} from "./utils";

export async function encryptMessage(
  plaintext: string,
  keyBuffer: ArrayBuffer
): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const key = await crypto.subtle.importKey(
    "raw",
    keyBuffer,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt"]
  );

  const plaintextBuffer = stringToArrayBuffer(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
      tagLength: 128,
    },
    key,
    plaintextBuffer
  );

  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv.buffer),
  };
}

export async function decryptMessage(
  ciphertextBase64: string,
  ivBase64: string,
  keyBuffer: ArrayBuffer
): Promise<string> {
  const ciphertext = base64ToArrayBuffer(ciphertextBase64);
  const iv = base64ToArrayBuffer(ivBase64);

  const key = await crypto.subtle.importKey(
    "raw",
    keyBuffer,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["decrypt"]
  );

  try {
    const plaintext = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
        tagLength: 128,
      },
      key,
      ciphertext
    );

    return arrayBufferToString(plaintext);
  } catch (error) {
    console.log(error)
    throw new Error("Decryption failed. Invalid key or corrupted data.");
  }
}

import { arrayBufferToBase64, base64ToArrayBuffer } from "./utils";

export async function generateECDSAKeyPair(): Promise<CryptoKeyPair> {
  return await crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["sign", "verify"]
  );
}

export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const jwk = await crypto.subtle.exportKey("jwk", publicKey);
  return JSON.stringify(jwk);
}

export async function exportPrivateKey(
  privateKey: CryptoKey
): Promise<JsonWebKey> {
  return await crypto.subtle.exportKey("jwk", privateKey);
}

export async function importPublicKey(jwkString: string): Promise<CryptoKey> {
  const jwk = JSON.parse(jwkString);
  return await crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["verify"]
  );
}

export async function importPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
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
}

export async function signData(
  data: ArrayBuffer,
  privateKey: CryptoKey
): Promise<string> {
  const signature = await crypto.subtle.sign(
    {
      name: "ECDSA",
      hash: "SHA-256",
    },
    privateKey,
    data
  );
  return arrayBufferToBase64(signature);
}

export async function verifySignature(
  data: ArrayBuffer,
  signatureBase64: string,
  publicKey: CryptoKey
): Promise<boolean> {
  const signature = base64ToArrayBuffer(signatureBase64);
  return await crypto.subtle.verify(
    {
      name: "ECDSA",
      hash: "SHA-256",
    },
    publicKey,
    signature,
    data
  );
}

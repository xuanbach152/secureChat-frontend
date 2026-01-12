import { base64ToArrayBuffer } from "./utils";

export async function deriveChainKey(
  rootKeyBase64: string,
  sharedSecret: ArrayBuffer,
  info: string
): Promise<ArrayBuffer> {
  const rootKey = base64ToArrayBuffer(rootKeyBase64);

  const hkdfKey = await crypto.subtle.importKey(
    "raw",
    rootKey,
    { name: "HKDF" },
    false,
    ["deriveBits"]
  );

  const chainKey = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(sharedSecret),
      info: new TextEncoder().encode(info),
    },
    hkdfKey,
    256
  );

  return chainKey;
}

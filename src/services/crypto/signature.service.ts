import { getPrivateKey, ECDSA_PRIVATE_KEY } from "./indexeddb.service";
import { importECDSAPublicKey } from "./key-generation.service";

// Sign message with ECDSA
export async function signMessage(message: string): Promise<string> {
  const privateKey = await getPrivateKey(ECDSA_PRIVATE_KEY);
  if (!privateKey) {
    throw new Error("ECDSA private key not found");
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(message);

  const signature = await crypto.subtle.sign(
    {
      name: "ECDSA",
      hash: "SHA-256",
    },
    privateKey,
    data
  );

  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

// Verify signature
export async function verifySignature(
  message: string,
  signatureBase64: string,
  publicKeyBase64: string
): Promise<boolean> {
  try {
    const publicKey = await importECDSAPublicKey(publicKeyBase64);

    const signatureBinary = atob(signatureBase64);
    const signature = new Uint8Array(signatureBinary.length);
    for (let i = 0; i < signatureBinary.length; i++) {
      signature[i] = signatureBinary.charCodeAt(i);
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(message);

    return await crypto.subtle.verify(
      {
        name: "ECDSA",
        hash: "SHA-256",
      },
      publicKey,
      signature,
      data
    );
  } catch {
    return false;
  }
}

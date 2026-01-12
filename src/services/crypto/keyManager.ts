import { keysService } from "../api/keys.service";
import { authService } from "../api/auth.service";
import {
  generateECDSAKeyPair,
  exportPublicKey,
  exportPrivateKey,
  importPublicKey,
  encryptPrivateKey,
  decryptPrivateKey,
} from "@/lib/crypto";

export const keyManager = {
  publicKeyCache: new Map<string, CryptoKey>(),

  async checkUserHasKeys(userId: string): Promise<boolean> {
    try {
      const hasKeys = await keysService.checkKeysExist(userId);
      return hasKeys;
    } catch (error) {
      console.error("Error checking keys:", error);
      return false;
    }
  },

  async generateAndUploadKeys(password: string): Promise<void> {
    try {
      const keyPair = await generateECDSAKeyPair();

      const publicKeyJwk = await exportPublicKey(keyPair.publicKey);

      const privateKeyJwk = await exportPrivateKey(keyPair.privateKey);

      const { encrypted, salt } = await encryptPrivateKey(
        privateKeyJwk,
        password
      );

      authService.saveEncryptedKeys(encrypted, salt);

      await keysService.uploadEncryptedKeys({
        ecdsaPublicKey: publicKeyJwk,
        encryptedEcdsaPrivateKey: encrypted,
        keySalt: salt,
      });

      console.log("Keys generated and uploaded successfully");
    } catch (error) {
      console.error("Failed to generate keys:", error);
      throw new Error("Failed to generate keys");
    }
  },

  async loadKeysOnLogin(password: string, userId?: string): Promise<CryptoKey> {
    try {
      let keys = authService.getEncryptedKeys();

      if (!keys && userId) {
        console.log("Keys not in localStorage, fetching from backend...");
        const response = await keysService.getEncryptedKeys(userId);

        if (!response.encryptedEcdsaPrivateKey || !response.keySalt) {
          throw new Error("User has no encrypted keys on backend");
        }

        authService.saveEncryptedKeys(
          response.encryptedEcdsaPrivateKey,
          response.keySalt
        );

        keys = {
          encrypted: response.encryptedEcdsaPrivateKey,
          salt: response.keySalt,
        };
        console.log(" Keys fetched from backend and saved to localStorage");
      }

      if (!keys) {
        throw new Error("No keys found in localStorage or backend");
      }

      const privateKey = await decryptPrivateKey(
        keys.encrypted,
        keys.salt,
        password
      );

      console.log("Private key loaded successfully");
      return privateKey;
    } catch (error) {
      console.error("Failed to load keys:", error);
      if (error instanceof Error && error.message.includes("decrypt")) {
        throw new Error("Incorrect password or corrupted key");
      }
      throw error;
    }
  },

  async fetchUserPublicKey(userId: string): Promise<CryptoKey> {
    try {
      if (this.publicKeyCache.has(userId)) {
        return this.publicKeyCache.get(userId)!;
      }

      const response = await keysService.getPublicKeys(userId);
      const publicKeyJwk = response.ecdsaPublicKey;

      if (!publicKeyJwk) {
        throw new Error(`User ${userId} has no public key`);
      }

      const publicKey = await importPublicKey(publicKeyJwk);

      this.publicKeyCache.set(userId, publicKey);

      return publicKey;
    } catch (error) {
      console.error(`Failed to fetch public key for ${userId}:`, error);
      throw error;
    }
  },

  clearCache(): void {
    this.publicKeyCache.clear();
    console.log("Public key cache cleared");
  },
};

"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/auth.store";
import {
  encryptAndSignMessage,
  decryptAndVerifyMessage,
} from "@/services/crypto/crypto-manager.service";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AxiosError } from "axios";

interface EncryptedData {
  encryptedContent: string;
  iv: string;
  signature: string;
}

export default function TestCryptoPage() {
  const user = useAuthStore((state) => state.user);
  const [receiverId, setReceiverId] = useState("");
  const [plaintext, setPlaintext] = useState(
    "Hello, this is a secret message!"
  );
  const [result, setResult] = useState("");
  const [encrypted, setEncrypted] = useState<EncryptedData | null>(null);

  const handleEncrypt = async () => {
    try {
      if (!receiverId) {
        setResult(" Please enter receiver User ID");
        return;
      }

      const data = await encryptAndSignMessage(plaintext, receiverId);
      setEncrypted(data);
      setResult(" ENCRYPTED:\n" + JSON.stringify(data, null, 2));
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      setResult(" ERROR:\n" + error.message);
    }
  };

  const handleDecrypt = async () => {
    try {
      if (!encrypted) {
        setResult(" Please encrypt a message first");
        return;
      }

      const decrypted = await decryptAndVerifyMessage(
        encrypted.encryptedContent,
        encrypted.iv,
        encrypted.signature,
        user?._id || "" // In real app, this would be sender's ID
      );

      setResult(" DECRYPTED:\n" + decrypted);
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      setResult(" ERROR:\n" + error.message);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please login first</p>
          <a href="/login" className="text-blue-600 hover:underline">
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-black"> Test Crypto Service</h1>

        <div className="bg-white p-6 rounded-lg shadow mb-4">
          <p className="text-sm text-gray-600 mb-2">
            Current User ID:{" "}
            <code className="bg-gray-100 px-2 py-1 rounded">{user._id}</code>
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow mb-4 space-y-4">
          <Input
            label="Receiver User ID (use your own ID for testing)"
            value={receiverId}
            onChange={(e) => setReceiverId(e.target.value)}
            placeholder={user._id}
          />

          <Input
            label="Plaintext Message"
            value={plaintext}
            onChange={(e) => setPlaintext(e.target.value)}
          />

          <div className="flex gap-4">
            <Button onClick={handleEncrypt} variant="primary">
               Encrypt & Sign
            </Button>
            <Button
              onClick={handleDecrypt}
              variant="secondary"
              disabled={!encrypted}
            >
               Decrypt & Verify
            </Button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="font-bold mb-2 text-black">Result:</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto text-black">
            {result || "Click a button to test..."}
          </pre>
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-bold text-blue-900 mb-2"> How to test:</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Enter your own User ID as receiver (to test with yourself)</li>
            <li>
              Click Encrypt & Sign - message is encrypted with your public key
            </li>
            <li>
              Click Decrypt & Verify - message is decrypted with your private
              key
            </li>
            <li>Check browser console for crypto logs</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

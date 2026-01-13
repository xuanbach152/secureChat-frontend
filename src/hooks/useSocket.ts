import { useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth.store";
import { useChatStore } from "@/store/chat.store";
import { socketService } from "@/services/socket/socket.service";
import { Message, User } from "@/types";
import * as aes from "@/lib/crypto/aes";
import * as ecdsa from "@/lib/crypto/ecdsa";
import * as keyManager from "@/services/crypto/keyManager";
import * as sharedSecretManager from "@/services/crypto/sharedSecretManager";

export function useSocket() {
  const user = useAuthStore((state) => state.user);
  const currentChatUser = useChatStore((state) => state.currentChatUser);
  const addMessage = useChatStore((state) => state.addMessage);
  const updateMessageReadStatus = useChatStore(
    (state) => state.updateMessageReadStatus
  );
  const setTyping = useChatStore((state) => state.setTyping);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token || !user) return;

    // Connect only once
    if (!socketService.isConnected()) {
      socketService.connect(token);
    }

    return () => {
      // Don't disconnect on unmount to prevent reconnections in strict mode
      // Only disconnect when user logs out
    };
  }, [user]);

  useEffect(() => {
    if (!currentChatUser || !socketService.isConnected()) return;

    socketService.joinRoom(currentChatUser._id).catch((error) => {
      console.error("Failed to join room:", error);
    });
  }, [currentChatUser]);

  useEffect(() => {
    const handleNewMessage = async (message: Message) => {
      try {
        // Extract senderId as string
        const senderId =
          typeof message.senderId === "string"
            ? message.senderId
            : String(message.senderId);

        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("[RECEIVE] New message received");
        console.log("[RECEIVE] From:", senderId);
        console.log("[RECEIVE] My ID:", user!._id);

        // Skip if this is my own message (already added optimistically)
        if (senderId === user!._id) {
          console.log("[RECEIVE] Skipping own message (already in UI)");
          console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
          return;
        }

        console.log("[RECEIVE] IV:", message.iv);
        console.log(
          "[RECEIVE] Encrypted:",
          message.encryptedContent.substring(0, 50) + "..."
        );

        // Get shared secret - IMPORTANT: order matters for ECDH
        const sharedSecret = await sharedSecretManager.getSharedSecret(
          user!._id,
          senderId
        );

        // Decrypt message
        if (!message.iv) {
          throw new Error("Message IV is missing");
        }

        console.log("[RECEIVE] Attempting decryption...");
        const plaintext = await aes.decrypt(
          message.encryptedContent,
          message.iv,
          sharedSecret
        );
        console.log("[RECEIVE] ✓ Decryption successful!");
        console.log("[RECEIVE] Plaintext:", plaintext);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

        addMessage({
          ...message,
          senderId: senderId, // Ensure it's a string
          content: plaintext,
        });

        if (document.hasFocus() && currentChatUser?._id === senderId) {
          socketService.markAsRead(senderId);
        }
      } catch (error) {
        console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.error("[RECEIVE] ✗ Failed to decrypt message:", error);
        console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        addMessage({
          ...message,
          content: "[Failed to decrypt]",
        });
      }
    };

    socketService.onNewMessage(handleNewMessage);

    return () => {
      socketService.off("newMessage", handleNewMessage);
    };
  }, [addMessage, currentChatUser, user]);

  useEffect(() => {
    const handleMessagesRead = (data: { by: string }) => {
      const messageIds = useChatStore
        .getState()
        .messages.filter((msg) => msg.receiverId === data.by && !msg.isRead)
        .map((msg) => msg._id);

      if (messageIds.length > 0) {
        updateMessageReadStatus(messageIds);
      }
    };

    socketService.onMessagesRead(handleMessagesRead);

    return () => {
      socketService.off("messagesRead", handleMessagesRead);
    };
  }, [updateMessageReadStatus]);

  useEffect(() => {
    const handleUserTyping = (data: { userId: string }) => {
      if (currentChatUser?._id === data.userId) {
        setTyping(data.userId);

        setTimeout(() => {
          setTyping(null);
        }, 3000);
      }
    };

    socketService.onUserTyping(handleUserTyping);

    return () => {
      socketService.off("userTyping", handleUserTyping);
    };
  }, [currentChatUser, setTyping]);

  const sendMessage = useCallback(
    async (
      plaintext: string,
      payload: {
        receiverId: string;
      }
    ) => {
      if (!user) throw new Error("User not authenticated");

      try {
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("[SEND] Sending message");
        console.log("[SEND] From:", user._id);
        console.log("[SEND] To:", payload.receiverId);
        console.log("[SEND] Plaintext:", plaintext);

        // 1. Get my keys
        const myKeys = await keyManager.loadKeysFromStorage(user._id);
        if (!myKeys) throw new Error("Keys not found");
        console.log("[SEND] ✓ Loaded my keys");

        // 2. Get shared secret (ECDH-derived AES key)
        const sharedSecret = await sharedSecretManager.getSharedSecret(
          user._id,
          payload.receiverId
        );
        console.log("[SEND] ✓ Got shared secret");

        // 3. Encrypt message with shared secret
        const { encryptedContent, iv } = await aes.encrypt(
          plaintext,
          sharedSecret
        );
        console.log("[SEND] ✓ Encrypted message");
        console.log("[SEND] IV:", iv);
        console.log(
          "[SEND] Encrypted:",
          encryptedContent.substring(0, 50) + "..."
        );

        // 4. Create signature payload (match backend - NO messageNumber)
        const signaturePayload = JSON.stringify({
          senderId: user._id,
          receiverId: payload.receiverId,
          iv,
          encryptedContent,
        });

        // 5. Sign the payload
        const signature = await ecdsa.signData(
          new TextEncoder().encode(signaturePayload).buffer,
          myKeys.ecdsaPrivateKey
        );
        console.log("[SEND] ✓ Signed message");

        // 6. Send via socket (backend will auto-calculate messageNumber)
        await socketService.sendMessage({
          receiverId: payload.receiverId,
          encryptedContent,
          iv,
          signature,
        });

        console.log("[SEND] ✓ Message sent via socket");

        // 7. Optimistic update - add message to UI immediately
        addMessage({
          _id: `temp-${Date.now()}`, // Temporary ID
          senderId: user._id,
          receiverId: payload.receiverId,
          content: plaintext, // Show plaintext immediately
          encryptedContent,
          iv,
          signature,
          isRead: false,
          createdAt: new Date().toISOString(),
          messageNumber: 0, // Will be updated by backend
        } as any);

        console.log("[SEND] ✓ Added to UI optimistically");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      } catch (error) {
        console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.error("[SEND] ✗ Failed to send message:", error);
        console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        throw error;
      }
    },
    [user]
  );

  const markAsRead = useCallback(() => {
    if (!currentChatUser) return;
    socketService.markAsRead(currentChatUser._id);
  }, [currentChatUser]);

  const emitTyping = useCallback(() => {
    if (!currentChatUser) return;
    socketService.emitTyping(currentChatUser._id);
  }, [currentChatUser]);

  return {
    isConnected: socketService.isConnected(),
    sendMessage,
    markAsRead,
    emitTyping,
  };
}

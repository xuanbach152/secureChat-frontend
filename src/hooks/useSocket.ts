import { useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth.store";
import { useChatStore } from "@/store/chat.store";
import { socketService } from "@/services/socket/socket.service";
import {
  encryptAndSignMessageWithSession,
  decryptAndVerifyMessageWithSession,
} from "@/services/crypto/crypto-manager.service";
import { sessionsService } from "@/services/api/sessions.service";
import { Message, User, SessionResponse } from "@/types";

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
    if (token && user) {
      socketService.connect(token);
    }

    return () => {
      socketService.disconnect();
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
        const senderId =
          typeof message.senderId === "string"
            ? message.senderId
            : (message.senderId as User)?._id || String(message.senderId);

        console.log("New message from:", senderId);

        // Fetch session data to get ephemeral keys
        const session = await sessionsService.getSessionById(message.sessionId);
        console.log("Session fetched:", session.sessionId);

        // Decrypt message với session keys
        const plaintext = await decryptAndVerifyMessageWithSession(
          message.encryptedContent,
          message.iv || "",
          message.signature || "",
          session.theirEcdsaPublicKey,
          message.sessionId,
          session.theirEcdhPublicKey
        );

        console.log("Message decrypted successfully");

        addMessage({
          ...message,
          content: plaintext,
        });

        if (document.hasFocus() && currentChatUser?._id === senderId) {
          socketService.markAsRead(senderId);
        }
      } catch (error) {
        console.warn("Cannot decrypt message:", error);

        addMessage({
          ...message,
          content: "[Cannot decrypt - Session or keys not found]",
        });
      }
    };

    socketService.onNewMessage(handleNewMessage);

    return () => {
      socketService.off("newMessage", handleNewMessage);
    };
  }, [addMessage, currentChatUser]);

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
    async (plaintext: string, session: SessionResponse) => {
      if (!currentChatUser) {
        throw new Error("No chat user selected");
      }

      const { encryptedContent, iv, signature, messageKeyInfo } =
        await encryptAndSignMessageWithSession(
          plaintext,
          session.sessionId,
          session.theirEcdhPublicKey
        );

      await socketService.sendMessage({
        receiverId: currentChatUser._id,
        sessionId: session.sessionId,
        messageKeyInfo,
        encryptedContent,
        iv,
        signature,
      });
    },
    [currentChatUser]
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

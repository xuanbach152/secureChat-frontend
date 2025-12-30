import { useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth.store";
import { useChatStore } from "@/store/chat.store";
import { socketService } from "@/services/socket/socket.service";
import {
  encryptAndSignMessage,
  decryptAndVerifyMessage,
} from "@/services/crypto/crypto-manager.service";
import { Message, User } from "@/types";

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
        // Extract senderId (handle both string and populated object)
        const senderId =
          typeof message.senderId === "string"
            ? message.senderId
            : (message.senderId as User)?._id || String(message.senderId);

        console.log(" New message from:", senderId);

        const plaintext = await decryptAndVerifyMessage(
          message.encryptedContent,
          message.iv || "",
          message.signature || "",
          senderId
        );

        addMessage({
          ...message,
          content: plaintext,
        });

        if (document.hasFocus() && currentChatUser?._id === senderId) {
          socketService.markAsRead(senderId);
        }
      } catch (error) {
        console.warn(
          " Cannot decrypt message (possibly encrypted with old keys):",
          error
        );

        // Still add the message but show it as encrypted
        addMessage({
          ...message,
          content: " [Encrypted - Cannot decrypt. Keys may have changed]",
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
      // Update read status of messages sent to this user
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
    async (plaintext: string) => {
      if (!currentChatUser || !user) {
        throw new Error("No chat user selected");
      }

      const { encryptedContent, iv, signature } = await encryptAndSignMessage(
        plaintext,
        currentChatUser._id
      );

      await socketService.sendMessage({
        receiverId: currentChatUser._id,
        encryptedContent,
        iv,
        signature,
      });
    },
    [currentChatUser, user]
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

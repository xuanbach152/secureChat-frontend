import { useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth.store";
import { useChatStore } from "@/store/chat.store";
import { socketService } from "@/services/socket/socket.service";
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
      const senderId =
        typeof message.senderId === "string"
          ? message.senderId
          : (message.senderId as User)?._id || String(message.senderId);

      console.log("📩 New message from:", senderId);

      // TODO: Decrypt message - crypto functionality to be re-implemented
      addMessage({
        ...message,
        content: message.encryptedContent, // Temporarily show encrypted content
      });

      if (document.hasFocus() && currentChatUser?._id === senderId) {
        socketService.markAsRead(senderId);
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
    async (
      plaintext: string,
      payload: {
        receiverId: string;
        encryptedContent?: string;
        iv?: string;
        signature?: string;
        senderEcdhPublicKey?: string;
      }
    ) => {
      // TODO: Add encryption here when crypto is re-implemented
      await socketService.sendMessage({
        receiverId: payload.receiverId,
        encryptedContent: payload.encryptedContent || plaintext,
        iv: payload.iv || "",
        signature: payload.signature || "",
        senderEcdhPublicKey: payload.senderEcdhPublicKey || "",
      });
    },
    []
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

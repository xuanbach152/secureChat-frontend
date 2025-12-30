import { create } from "zustand";
import { DecryptedMessage, User } from "@/types";

interface ChatState {
  currentChatUser: User | null;
  messages: DecryptedMessage[];

  isTyping: boolean;
  typingUserId: string | null;

  onlineUsers: Set<string>;

  unreadCount: number;

  setCurrentChatUser: (user: User | null) => void;
  addMessage: (message: DecryptedMessage) => void;
  setMessages: (messages: DecryptedMessage[]) => void;
  updateMessageReadStatus: (messageIds: string[]) => void;
  setTyping: (userId: string | null) => void;
  setUserOnline: (userId: string) => void;
  setUserOffline: (userId: string) => void;
  setUnreadCount: (count: number) => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  currentChatUser: null,
  messages: [],
  isTyping: false,
  typingUserId: null,
  onlineUsers: new Set(),
  unreadCount: 0,

  setCurrentChatUser: (user) => set({ currentChatUser: user }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  setMessages: (messages) => set({ messages }),

  updateMessageReadStatus: (messageIds) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        messageIds.includes(msg._id) ? { ...msg, isRead: true } : msg
      ),
    })),

  setTyping: (userId) =>
    set({
      isTyping: !!userId,
      typingUserId: userId,
    }),

  setUserOnline: (userId) =>
    set((state) => {
      const newOnlineUsers = new Set(state.onlineUsers);
      newOnlineUsers.add(userId);
      return { onlineUsers: newOnlineUsers };
    }),

  setUserOffline: (userId) =>
    set((state) => {
      const newOnlineUsers = new Set(state.onlineUsers);
      newOnlineUsers.delete(userId);
      return { onlineUsers: newOnlineUsers };
    }),

  setUnreadCount: (count) => set({ unreadCount: count }),

  clearChat: () =>
    set({
      currentChatUser: null,
      messages: [],
      isTyping: false,
      typingUserId: null,
    }),
}));

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useChatStore } from "@/store/chat.store";
import { User } from "@/types";
import { usersService } from "@/services/api/user.service";
import { messagesService } from "@/services/api/messages.service";
import { useSocket } from "@/hooks/useSocket";

export default function ChatWindow() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;

  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);

  const setCurrentChatUser = useChatStore((state) => state.setCurrentChatUser);
  const chatMessages = useChatStore((state) => state.messages);
  const setMessages = useChatStore((state) => state.setMessages);

  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [inputMessage, setInputMessage] = useState("");
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { sendMessage } = useSocket();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    async function initializeChat() {
      if (!user || !userId) return;

      try {
        setLoading(true);

        // Get other user info
        const userInfo = await usersService.getUserById(userId);
        setOtherUser(userInfo);
        setCurrentChatUser(userInfo);

        // Load message history
        const historyResponse = await messagesService.getMessages(userId);

        // TODO: Decrypt messages - crypto functionality to be re-implemented
        const messagesWithContent = historyResponse.messages.map((msg) => ({
          ...msg,
          content: msg.encryptedContent, // Temporarily show encrypted content
        }));
        setMessages(messagesWithContent);
      } catch (error) {
        console.error("Failed to initialize chat:", error);
      } finally {
        setLoading(false);
      }
    }

    initializeChat();

    return () => {
      setCurrentChatUser(null);
    };
  }, [user, userId, setCurrentChatUser, setMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSend = async () => {
    if (!inputMessage.trim() || sending) return;

    try {
      setSending(true);

      // TODO: Encrypt message - crypto functionality to be re-implemented
      // For now, send plain text (temporarily)
      await sendMessage(inputMessage, {
        receiverId: userId,
      });

      setInputMessage("");
    } catch (error) {
      console.error("❌ Failed to send message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p>Loading chat...</p>
        </div>
      </div>
    );
  }

  if (!user || !otherUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header - Messenger style */}
      <div className="bg-white shadow-sm px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => router.push("/chat")}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-blue-600" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-md">
              {otherUser.email[0].toUpperCase()}
            </div>
            {otherUser.isOnline && (
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white"></div>
            )}
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 text-base">
              {otherUser.email}
            </h2>
            <p className="text-xs text-gray-500">
              {otherUser.isOnline ? "Active now" : "Offline"}
            </p>
          </div>
        </div>
      </div>

      {/* Messages - Messenger style */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
        {chatMessages.length === 0 ? (
          <div className="text-center text-gray-400 mt-16">
            <p className="text-5xl mb-3">💬</p>
            <p className="text-base font-medium">No messages yet</p>
            <p className="text-sm">Send a message to start chatting</p>
          </div>
        ) : (
          chatMessages.map((message) => {
            const senderId =
              typeof message.senderId === "string"
                ? message.senderId
                : message.senderId._id;
            const isMine = senderId === user._id;

            return (
              <div
                key={message._id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-3xl px-4 py-2.5 shadow-sm ${
                    isMine ? "bg-blue-500 text-white" : "bg-white text-gray-900"
                  }`}
                >
                  <p className="text-[15px] leading-relaxed break-words">
                    {message.content}
                  </p>
                  <p
                    className={`text-[11px] mt-1 ${
                      isMine ? "text-blue-100" : "text-gray-400"
                    }`}
                  >
                    {new Date(message.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input - Messenger style */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex gap-2 items-center max-w-4xl mx-auto">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Aa"
            className="flex-1 px-4 py-2.5 text-[15px] rounded-full bg-gray-100 hover:bg-gray-200 focus:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={!inputMessage.trim() || sending}
            className="p-2.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-500 shadow-sm"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

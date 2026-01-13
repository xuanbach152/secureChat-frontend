"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Send, Phone, Video, Info, Sparkles } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useChatStore } from "@/store/chat.store";
import { User } from "@/types";
import { usersService } from "@/services/api/user.service";
import { messagesService } from "@/services/api/messages.service";
import { useSocket } from "@/hooks/useSocket";
import * as aes from "@/lib/crypto/aes";
import * as sharedSecretManager from "@/services/crypto/sharedSecretManager";

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
  const [summarizing, setSummarizing] = useState(false);
  const [lastSummaryIndex, setLastSummaryIndex] = useState(-1);

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

        // Clear old messages from previous chat
        console.log("[INIT] Clearing old messages");
        setMessages([]);

        // Get other user info
        console.log("[INIT] Fetching user info for:", userId);
        const userInfo = await usersService.getUserById(userId);
        console.log("[INIT] Got user info:", userInfo);
        setOtherUser(userInfo);
        setCurrentChatUser(userInfo);

        // Load message history
        console.log("[INIT] Fetching message history...");
        const historyResponse = await messagesService.getMessages(userId);

        console.log(
          `[HISTORY] Loaded ${historyResponse.messages.length} messages from API`
        );
        console.log("[HISTORY] Raw messages:", historyResponse.messages);

        if (historyResponse.messages.length === 0) {
          console.log("[HISTORY] No messages in history");
          setMessages([]);
          return;
        }

        // Decrypt messages
        const messagesWithContent = await Promise.all(
          historyResponse.messages.map(async (msg) => {
            try {
              // Determine sender and receiver
              const msgSenderId =
                typeof msg.senderId === "string"
                  ? msg.senderId
                  : msg.senderId._id;
              const msgReceiverId =
                typeof msg.receiverId === "string"
                  ? msg.receiverId
                  : msg.receiverId._id;

              console.log(
                `[HISTORY] Processing message - sender: ${msgSenderId}, receiver: ${msgReceiverId}`
              );

              // Get the other user's ID (the one we're chatting with)
              const otherUserId =
                msgSenderId === user._id ? msgReceiverId : msgSenderId;

              console.log(
                `[HISTORY] Using otherUserId: ${otherUserId} for shared secret`
              );

              // Get shared secret with the other user
              const sharedSecret = await sharedSecretManager.getSharedSecret(
                user._id,
                otherUserId
              );

              if (!msg.iv) {
                return { ...msg, content: "[Thiếu IV]" };
              }

              const plaintext = await aes.decrypt(
                msg.encryptedContent,
                msg.iv,
                sharedSecret
              );

              console.log(
                `[HISTORY] ✓ Decrypted message from ${
                  msgSenderId === user._id ? "me" : "other"
                }: "${plaintext}"`
              );

              return { ...msg, content: plaintext };
            } catch (error: any) {
              console.error("[HISTORY] Failed to decrypt message:", error);
              
              // Check error type
              if (error?.message?.includes("My keys not found")) {
                return { ...msg, content: "[Không thể giải mã - Thiếu private key. Vui lòng đăng xuất và đăng nhập lại]" };
              } else if (error?.message?.includes("public key not found")) {
                return { ...msg, content: "[Không thể giải mã - Thiếu public key của người gửi]" };
              } else {
                return { ...msg, content: "[Không thể giải mã - Tin nhắn được mã hóa với key cũ]" };
              }
            }
          })
        );

        console.log(
          `[HISTORY] Successfully decrypted ${
            messagesWithContent.filter((m) => !m.content.includes("Failed"))
              .length
          }/${messagesWithContent.length} messages`
        );
        console.log("[HISTORY] Decrypted messages:", messagesWithContent);

        console.log("[HISTORY] Calling setMessages with:", messagesWithContent);
        setMessages(messagesWithContent);
        console.log("[HISTORY] setMessages called successfully");
      } catch (error) {
        console.error("[INIT] Failed to initialize chat:", error);
      } finally {
        setLoading(false);
      }
    }

    console.log(
      `[INIT] useEffect triggered - user: ${user?._id}, userId: ${userId}`
    );
    initializeChat();

    return () => {
      console.log("[INIT] Cleanup - clearing current chat user");
      setCurrentChatUser(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSummarize = async () => {
    if (summarizing || !user) return;

    // Get messages to summarize (from last summary to current)
    const startIndex = lastSummaryIndex + 1;
    const messagesToSummarize = chatMessages.slice(startIndex);

    if (messagesToSummarize.length === 0) {
      alert("Không có tin nhắn mới để tóm tắt");
      return;
    }

    if (messagesToSummarize.length > 200) {
      alert("Tối đa 200 tin nhắn. Vui lòng tóm tắt sớm hơn.");
      return;
    }

    try {
      setSummarizing(true);

      // Format messages for API
      const formattedMessages = messagesToSummarize.map((msg) => ({
        sender:
          (typeof msg.senderId === "string"
            ? msg.senderId
            : msg.senderId._id) === user._id
            ? "Bạn"
            : otherUser?.displayName || otherUser?.username || "Người khác",
        content: msg.content,
        timestamp: new Date(msg.createdAt).toISOString(),
      }));

      // Call API
      const response = await fetch("http://localhost:3000/messages/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({ messages: formattedMessages }),
      });

      const data = await response.json();

      if (data.success) {
        // Create summary message
        const summaryMessage = {
          _id: `summary-${Date.now()}`,
          senderId: "system",
          receiverId: userId,
          content: `🤖 **Tóm tắt AI** (${data.messageCount} tin nhắn)\n\n${data.summary}`,
          createdAt: new Date().toISOString(),
          isRead: true,
          isSummary: true,
        };

        // Add summary to messages
        setMessages([...chatMessages, summaryMessage as any]);

        // Update last summary index
        setLastSummaryIndex(chatMessages.length - 1);
      } else {
        alert(data.error || "Không thể tạo tóm tắt");
      }
    } catch (error) {
      console.error("Failed to summarize:", error);
      alert("Lỗi khi tạo tóm tắt. Vui lòng thử lại.");
    } finally {
      setSummarizing(false);
    }
  };

  const handleSend = async () => {
    if (!inputMessage.trim() || sending) return;

    try {
      setSending(true);

      await sendMessage(inputMessage, {
        receiverId: userId,
      });

      setInputMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex flex-col">
      {/* Header - Modern gradient style */}
      <div className="bg-white/80 backdrop-blur-lg shadow-lg px-6 py-4 flex items-center gap-4 sticky top-0 z-10 border-b border-purple-100">
        <button
          onClick={() => router.push("/chat")}
          className="p-2 hover:bg-purple-100 rounded-full transition-all duration-200 hover:scale-110"
        >
          <ArrowLeft className="w-6 h-6 text-purple-600" />
        </button>

        <div className="flex items-center gap-3 flex-1">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg transform transition-transform hover:scale-105">
              {otherUser.displayName?.[0]?.toUpperCase() ||
                otherUser.email[0].toUpperCase()}
            </div>
            {otherUser.isOnline && (
              <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-md animate-pulse"></div>
            )}
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-gray-900 text-lg">
              {otherUser.displayName || otherUser.username}
            </h2>
            <p className="text-sm text-gray-700 flex items-center gap-1 font-medium">
              {otherUser.isOnline ? (
                <>
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Đang hoạt động
                </>
              ) : (
                "Offline"
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-purple-100 rounded-full transition-all duration-200 hover:scale-110">
            <Phone className="w-5 h-5 text-purple-600" />
          </button>
          <button className="p-2 hover:bg-purple-100 rounded-full transition-all duration-200 hover:scale-110">
            <Video className="w-5 h-5 text-purple-600" />
          </button>
          <button className="p-2 hover:bg-purple-100 rounded-full transition-all duration-200 hover:scale-110">
            <Info className="w-5 h-5 text-purple-600" />
          </button>
        </div>
      </div>

      {/* Messages - Modern bubble style */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-3">
        {chatMessages.length === 0 ? (
          <div className="text-center mt-20">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center shadow-2xl animate-bounce">
              <Send className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Bắt đầu cuộc trò chuyện
            </h3>
            <p className="text-gray-700 font-medium">
              Gửi tin nhắn đầu tiên để bắt đầu nhắn tin end-to-end encrypted
            </p>
          </div>
        ) : (
          chatMessages.map((message, index) => {
            const senderId =
              typeof message.senderId === "string"
                ? message.senderId
                : message.senderId._id;
            const isMine = senderId === user._id;
            const isSummary =
              (message as any).isSummary || senderId === "system";

            // Check if we should show timestamp
            const showTimestamp =
              index === 0 ||
              (index > 0 &&
                new Date(message.createdAt).getTime() -
                  new Date(chatMessages[index - 1].createdAt).getTime() >
                  300000); // 5 minutes

            return (
              <div key={message._id}>
                {showTimestamp && (
                  <div className="text-center my-4">
                    <span className="text-xs text-gray-600 bg-white/60 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm font-medium">
                      {new Date(message.createdAt).toLocaleString("vi-VN", {
                        weekday: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                )}
                <div
                  className={`flex ${
                    isSummary
                      ? "justify-center"
                      : isMine
                      ? "justify-end"
                      : "justify-start"
                  } animate-fadeIn`}
                >
                  <div
                    className={`group max-w-[75%] rounded-2xl px-4 py-3 shadow-md hover:shadow-xl transition-all duration-200 ${
                      isSummary
                        ? "bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 text-white rounded-xl max-w-[85%]"
                        : isMine
                        ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-br-sm"
                        : "bg-white text-gray-900 rounded-bl-sm"
                    }`}
                  >
                    <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">
                      {message.content}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p
                        className={`text-[11px] font-medium ${
                          isMine ? "text-purple-100" : "text-gray-600"
                        }`}
                      >
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {isMine && (
                        <span className="text-[11px] text-purple-100">
                          {message.isRead ? "✓✓" : "✓"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input - Modern floating style */}
      <div className="bg-white/80 backdrop-blur-lg border-t border-purple-100 px-6 py-4 shadow-lg">
        <div className="flex gap-3 items-end max-w-4xl mx-auto">
          {/* AI Summary button */}
          <button
            onClick={handleSummarize}
            disabled={summarizing || chatMessages.length === 0}
            className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-2xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            title="Tóm tắt cuộc hội thoại bằng AI"
          >
            {summarizing ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-6 h-6" />
            )}
          </button>

          <div className="flex-1 relative">
            <textarea
              value={inputMessage}
              onChange={(e) => {
                setInputMessage(e.target.value);
                // Auto-resize textarea
                e.target.style.height = "auto";
                e.target.style.height =
                  Math.min(e.target.scrollHeight, 120) + "px";
              }}
              onKeyPress={handleKeyPress}
              placeholder="Nhập tin nhắn..."
              rows={1}
              className="w-full px-5 py-3 text-[15px] text-gray-900 placeholder:text-gray-500 rounded-2xl bg-gray-100 hover:bg-gray-150 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none shadow-sm font-medium"
              style={{ maxHeight: "120px" }}
              disabled={sending}
            />
          </div>

          {/* Send or Mic button */}
          {inputMessage.trim() ? (
            <button
              onClick={handleSend}
              disabled={sending}
              className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-2xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-purple-500 disabled:hover:to-pink-500 shadow-lg hover:shadow-xl hover:scale-105 disabled:hover:scale-100"
            >
              {sending ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-6 h-6" />
              )}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

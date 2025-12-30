"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/store/auth.store";
import { useChatStore } from "@/store/chat.store";
import { useSocket } from "@/hooks/useSocket";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { messagesService } from "@/services/api/messages.service";
import { decryptAndVerifyMessage } from "@/services/crypto/crypto-manager.service";
import { Message, User, DecryptedMessage } from "@/types";

export default function TestSocketPage() {
  const user = useAuthStore((state) => state.user);
  const currentChatUser = useChatStore((state) => state.currentChatUser);
  const setCurrentChatUser = useChatStore((state) => state.setCurrentChatUser);
  const messages = useChatStore((state) => state.messages);
  const setMessages = useChatStore((state) => state.setMessages);
  const isTyping = useChatStore((state) => state.isTyping);

  const { isConnected, sendMessage, emitTyping } = useSocket();

  const [otherUserId, setOtherUserId] = useState("");
  const [messageText, setMessageText] = useState("");
  const [copied, setCopied] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper to extract senderId from Message
  const extractSenderId = (msg: Message): string => {
    return typeof msg.senderId === "string"
      ? msg.senderId
      : (msg.senderId as User)?._id || String(msg.senderId);
  };

  // Load chat history when currentChatUser changes
  const loadChatHistory = useCallback(
    async (otherUser: User) => {
      setIsLoadingHistory(true);
      try {
        console.log("📜 Loading chat history with:", otherUser._id);
        const response = await messagesService.getMessages(
          otherUser._id,
          50,
          0
        );

        // Decrypt all messages
        const decryptedMessages: DecryptedMessage[] = [];

        for (const msg of response.messages) {
          try {
            const senderId = extractSenderId(msg);
            const plaintext = await decryptAndVerifyMessage(
              msg.encryptedContent,
              msg.iv || "",
              msg.signature || "",
              senderId
            );
            decryptedMessages.push({
              ...msg,
              content: plaintext,
            });
          } catch (decryptError) {
            console.warn("⚠️ Cannot decrypt old message:", decryptError);
            decryptedMessages.push({
              ...msg,
              content: "🔒 [Cannot decrypt - keys may have changed]",
            });
          }
        }

        // Messages come sorted by createdAt DESC, reverse to show oldest first
        setMessages(decryptedMessages.reverse());
        console.log("✅ Loaded", decryptedMessages.length, "messages");
      } catch (error) {
        console.error("❌ Failed to load chat history:", error);
      } finally {
        setIsLoadingHistory(false);
      }
    },
    [setMessages]
  );

  // When currentChatUser is set, load history
  useEffect(() => {
    if (currentChatUser) {
      loadChatHistory(currentChatUser);
    }
  }, [currentChatUser, loadChatHistory]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Copy User ID
  const handleCopyUserId = async () => {
    if (!user) return;
    try {
      await navigator.clipboard.writeText(user._id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Copy thất bại: " + user._id);
    }
  };

  // Start chat
  const handleStartChat = () => {
    const trimmedId = otherUserId.trim();

    if (!trimmedId) {
      alert("⚠️ Vui lòng nhập User ID!");
      return;
    }

    if (!/^[a-f\d]{24}$/i.test(trimmedId)) {
      alert(
        "❌ User ID không hợp lệ!\n\nPhải là chuỗi 24 ký tự hex.\nVí dụ: 677147c5b1a2c3d4e5f67890"
      );
      return;
    }

    setCurrentChatUser({
      _id: trimmedId,
      email: "test@example.com",
      username: "Test User",
    });

    console.log("✅ Đã bắt đầu chat với user:", trimmedId);
  };

  // Send message
  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    try {
      await sendMessage(messageText);
      setMessageText("");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Lỗi gửi tin nhắn";
      console.error("❌ Lỗi:", err);
      alert(`❌ ${errorMsg}\n\n💡 Đảm bảo user kia đã đăng nhập để tạo keys!`);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center bg-white p-8 rounded-lg shadow">
          <p className="text-gray-600 mb-4 text-lg">Vui lòng đăng nhập trước</p>
          <a
            href="/login"
            className="text-blue-600 hover:underline font-medium"
          >
            → Đi đến Đăng nhập
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                🔌 WebSocket E2EE Chat
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Đăng nhập: <span className="font-medium">{user.email}</span>
              </p>
            </div>
            <div
              className={`px-4 py-2 rounded-lg font-medium ${
                isConnected
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {isConnected ? "🟢 Đã kết nối" : "🔴 Ngắt kết nối"}
            </div>
          </div>

          {/* User ID Card */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">
              📋 Your User ID:
            </p>
            <div className="flex gap-2">
              <code className="flex-1 bg-gray-100 px-4 py-3 rounded-lg font-mono text-sm border break-all">
                {user._id}
              </code>
              <Button onClick={handleCopyUserId} variant="secondary">
                {copied ? "✓ Copied!" : "📋 Copy"}
              </Button>
            </div>
          </div>
        </div>

        {/* Instructions */}
        {!currentChatUser && (
          <div className="bg-gradient-to-r from-blue-100 to-purple-100 border-2 border-blue-300 rounded-lg p-6 shadow">
            <h3 className="font-bold text-blue-900 mb-3 text-lg">
              📖 Hướng dẫn Test:
            </h3>
            <ol className="space-y-2 text-blue-800">
              <li className="flex gap-2">
                <span className="font-bold">1.</span>{" "}
                <span>Mở browser thứ 2 (Incognito hoặc Chrome khác)</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">2.</span>{" "}
                <span>Đăng nhập tài khoản khác (hoặc cùng tài khoản)</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">3.</span>{" "}
                <span>
                  Click <strong>📋 Copy</strong> ở trên để copy User ID
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">4.</span>{" "}
                <span>
                  Ở browser kia, paste vào ô dưới và click Bắt đầu chat
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">5.</span>{" "}
                <span>
                  Gửi tin nhắn - Sẽ tự động{" "}
                  <strong className="text-green-700">mã hóa E2EE</strong>! 🔐
                </span>
              </li>
            </ol>
          </div>
        )}

        {/* Start chat */}
        {!currentChatUser && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="font-bold mb-3 text-lg">💬 Bắt đầu Chat</h3>
            <div className="flex gap-2">
              <Input
                placeholder="Paste User ID của người nhận..."
                value={otherUserId}
                onChange={(e) => setOtherUserId(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleStartChat()}
                className="flex-1"
              />
              <Button onClick={handleStartChat} disabled={!otherUserId.trim()}>
                Bắt đầu chat
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              💡 Paste User ID từ browser khác vào đây
            </p>
          </div>
        )}

        {/* Chat Window */}
        {currentChatUser && (
          <div className="bg-white rounded-lg shadow-lg flex flex-col h-[600px]">
            {/* Chat Header */}
            <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg">
                    💬 Chat với: {currentChatUser.username}
                  </h3>
                  <p className="text-xs text-gray-600 font-mono">
                    {currentChatUser._id}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-green-700 font-medium bg-green-100 px-3 py-1 rounded-full">
                    🔒 E2E Encrypted
                  </span>
                  <Button
                    variant="secondary"
                    onClick={() => setCurrentChatUser(null)}
                  >
                    Rời chat
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50 to-white">
              {isLoadingHistory && (
                <div className="text-center text-gray-500 py-8">
                  <div className="text-4xl mb-2 animate-spin">⏳</div>
                  <p>Đang tải tin nhắn...</p>
                </div>
              )}

              {!isLoadingHistory && messages.length === 0 && (
                <div className="text-center text-gray-500 py-16">
                  <div className="text-6xl mb-4">💬</div>
                  <p className="text-lg font-medium mb-2">Chưa có tin nhắn</p>
                  <p className="text-sm">Gửi tin nhắn đầu tiên! 👋</p>
                  <p className="text-xs mt-3 text-green-600 font-medium">
                    🔐 Tin nhắn sẽ được mã hóa E2EE tự động
                  </p>
                </div>
              )}

              {messages.map((msg) => {
                // Extract senderId (handle both string and populated object)
                const senderId =
                  typeof msg.senderId === "string"
                    ? msg.senderId
                    : (msg.senderId as User)?._id || String(msg.senderId);

                const isMine = senderId === user._id;
                return (
                  <div
                    key={msg._id}
                    className={`flex ${
                      isMine ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-5 py-3 shadow-sm ${
                        isMine
                          ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                          : "bg-white border border-gray-200 text-gray-900"
                      }`}
                    >
                      <p className="break-words">{msg.content}</p>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <span className="text-xs opacity-70">
                          {new Date(msg.createdAt).toLocaleTimeString("vi-VN")}
                        </span>
                        {isMine && (
                          <span className="text-xs">
                            {msg.isRead ? "✓✓ Đã đọc" : "✓ Đã gửi"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl px-5 py-3 shadow-sm">
                    <p className="text-sm text-gray-600 italic">đang gõ...</p>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t bg-gray-50">
              <div className="flex gap-2">
                <Input
                  value={messageText}
                  onChange={(e) => {
                    setMessageText(e.target.value);
                    emitTyping();
                  }}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Nhập tin nhắn..."
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim()}
                >
                  📤 Gửi
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                💡 Enter để gửi • Shift+Enter xuống dòng
              </p>
            </div>
          </div>
        )}

        {/* Debug Info */}
        <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
          <h4 className="font-bold text-gray-700 mb-2">🔍 Debug Info:</h4>
          <div className="text-xs font-mono text-gray-600 space-y-1">
            <p>• Total Messages: {messages.length}</p>
            <p>• Connection: {isConnected ? "Active ✓" : "Disconnected ✗"}</p>
            <p>• Chat User: {currentChatUser?._id || "None"}</p>
            <p>• Typing: {isTyping ? "Yes" : "No"}</p>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Mở Console (F12) để xem encryption logs
          </p>
        </div>
      </div>
    </div>
  );
}

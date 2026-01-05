"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { usersService } from "@/services/api/user.service";
import { socketService } from "@/services/socket/socket.service";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { User } from "@/types";
import { Button } from "@/components/ui/Button";

export default function ChatPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const logout = useAuthStore((state) => state.logout);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);


  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  // Connect WebSocket first
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token && user) {
      console.log("🔌 Connecting WebSocket...");
      socketService.connect(token);

      // Wait a bit for connection to establish
      setTimeout(() => {
        setSocketConnected(true);
        console.log(" WebSocket connected");
      }, 1000);
    }

    return () => {
      socketService.disconnect();
    };
  }, [user]);

  // Fetch online users after WebSocket connected
  useEffect(() => {
    async function fetchOnlineUsers() {
      try {
        console.log(" Fetching online users...");
        const users = await usersService.getOnlineUsers();
        console.log(" Online users:", users);
        setOnlineUsers(users);
      } catch (error) {
        console.error(" Failed to fetch online users:", error);
      } finally {
        setLoading(false);
      }
    }

    if (user && socketConnected) {
      fetchOnlineUsers();
      const interval = setInterval(fetchOnlineUsers, 10000);
      return () => clearInterval(interval);
    }
  }, [user, socketConnected]);

  const handleBubbleClick = (userId: string) => {
    router.push(`/chat/${userId}`);
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  // Wait for auth to load before redirecting
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-200 via-blue-100 to-cyan-200">
        <div className="text-gray-700 text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-200 via-blue-100 to-cyan-200">
      <header className="bg-white/90 backdrop-blur-sm border-b border-white/20 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SecureChat</h1>
            <p className="text-sm text-gray-600">
              {user.email} | {onlineUsers.length} users online
            </p>
          </div>
          <Button onClick={handleLogout} variant="secondary">
            Logout
          </Button>
        </div>
      </header>

      <main className="relative h-[calc(100vh-80px)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-700 text-xl">Loading online users...</div>
          </div>
        ) : onlineUsers.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-700">
              <div className="text-6xl mb-4">💤</div>
              <h2 className="text-2xl font-bold mb-2">No users online</h2>
              <p className="text-gray-600">Waiting for others to join...</p>
            </div>
          </div>
        ) : (
          <>
            {onlineUsers.map((onlineUser, index) => (
              <ChatBubble
                key={onlineUser._id}
                user={onlineUser}
                onClick={handleBubbleClick}
                delay={index * 0.2}
              />
            ))}
          </>
        )}
      </main>
    </div>
  );
}

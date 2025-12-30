import { io, Socket } from "socket.io-client";
import { Message } from "@/types";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3000";

class SocketService {
  private socket: Socket | null = null;
  private token: string | null = null;

  connect(token: string): void {
    if (this.socket?.connected) {
      console.log("Socket already connected");
      return;
    }
    this.token = token;
    this.socket = io(WS_URL, {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    this.setupEventListeners();
  }
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log(" Socket disconnected");
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      console.log("Socket connected:", this.socket?.id);
    });

    this.socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

    this.socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
    });
  }

  joinRoom(otherUserId: string): Promise<{ roomId: string }> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error("Socket not connected"));
        return;
      }

      this.socket.emit(
        "joinRoom",
        { otherUserId },
        (response: { roomId: string }) => {
          console.log(" Joined room:", response.roomId);
          resolve(response);
        }
      );
    });
  }

  sendMessage(data: {
    receiverId: string;
    encryptedContent: string;
    iv: string;
    signature: string;
  }): Promise<{ success: boolean }> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error("Socket not connected"));
        return;
      }

      this.socket.emit(
        "sendMessage",
        data,
        (response: { success: boolean }) => {
          resolve(response);
        }
      );
    });
  }

  markAsRead(senderId: string): void {
    if (!this.socket) return;
    this.socket.emit("markAsRead", { senderId });
  }

  emitTyping(receiverId: string): void {
    if (!this.socket) return;
    this.socket.emit("typing", { receiverId });
  }

  onNewMessage(callback: (message: Message) => void): void {
    if (!this.socket) return;
    this.socket.on("newMessage", callback);
  }

  onMessagesRead(callback: (data: { by: string }) => void): void {
    if (!this.socket) return;
    this.socket.on("messagesRead", callback);
  }

  onUserTyping(callback: (data: { userId: string }) => void): void {
    if (!this.socket) return;
    this.socket.on("userTyping", callback);
  }

  off(event: string, callback?: (...args: never[]) => void): void {
    if (!this.socket) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.socket.off(event, callback as any);
  }
}

export const socketService = new SocketService();

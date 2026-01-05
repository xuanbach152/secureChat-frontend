"use client";

import { User } from "@/types";
import { useState } from "react";

interface ChatBubbleProps {
  user: User;
  onClick: (userId: string) => void;
  delay: number;
}

const colorPalette = [
  "linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)",
  "linear-gradient(135deg, #ec4899 0%, #dc2626 100%)",
  "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
  "linear-gradient(135deg, #10b981 0%, #14b8a6 100%)",
  "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
  "linear-gradient(135deg, #06b6d4 0%, #4f46e5 100%)",
  "linear-gradient(135deg, #a78bfa 0%, #ec4899 100%)",
  "linear-gradient(135deg, #fb923c 0%, #f43f5e 100%)",
  "linear-gradient(135deg, #fbbf24 0%, #f97316 100%)",
  "linear-gradient(135deg, #f43f5e 0%, #8b5cf6 100%)",
];

export function ChatBubble({ user, onClick, delay }: ChatBubbleProps) {
  const [randomValues] = useState(() => ({
    size: Math.random() * 50 + 50,
    left: Math.random() * 85 + 5,
    top: Math.random() * 85 + 5,
    floatDuration: Math.random() * 3 + 3,
    driftDuration: Math.random() * 5 + 6,
    pulseDuration: Math.random() * 2 + 2,
    colorIndex: Math.floor(Math.random() * colorPalette.length),
    rotateDelay: Math.random() * 2,
  }));

  const initials = user.email.substring(0, 2).toUpperCase();
  const bgGradient = colorPalette[randomValues.colorIndex];

  return (
    <button
      onClick={() => onClick(user._id)}
      className="absolute rounded-full flex items-center justify-center text-white font-bold shadow-2xl hover:scale-125 transition-all duration-300 cursor-pointer group"
      style={{
        width: `${randomValues.size}px`,
        height: `${randomValues.size}px`,
        left: `${randomValues.left}%`,
        top: `${randomValues.top}%`,
        background: bgGradient,
        animation: `
          float ${randomValues.floatDuration}s ease-in-out ${delay}s infinite,
          drift ${randomValues.driftDuration}s ease-in-out ${
          randomValues.rotateDelay
        }s infinite,
          pulse ${randomValues.pulseDuration}s ease-in-out ${
          delay + 0.5
        }s infinite
        `,
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
      }}
      title={user.email}
    >
      <span className="text-sm font-extrabold drop-shadow-lg">{initials}</span>

      <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-xl">
        {user.email}
      </div>

      <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
    </button>
  );
}

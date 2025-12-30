"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { authService } from "@/services/api/auth.service";
import { initializeUserKeys } from "@/services/crypto/crypto-manager.service";

export default function GoogleCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    const token = searchParams.get("token");

    if (token) {
      localStorage.setItem("access_token", token);

      authService
        .getProfile()
        .then(async (user) => {
          localStorage.setItem("user", JSON.stringify(user));
          setUser(user);

          // Initialize crypto keys for this user
          try {
            // Ensure _id is string
            const userId = typeof user._id === 'string' 
              ? user._id 
              : String(user._id);
            
            await initializeUserKeys(userId);
            console.log(" Keys initialized for Google OAuth user");
          } catch (err) {
            console.error(" Failed to initialize keys:", err);
          }

          router.push("/chat");
        })
        .catch((err) => {
          console.error(" Failed to get profile:", err);
          router.push("/login");
        });
    } else {
      router.push("/login");
    }
  }, [searchParams, router, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Đang xác thực với Google...</p>
      </div>
    </div>
  );
}

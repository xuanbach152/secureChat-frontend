"use client";

import { useEffect, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { authService } from "@/services/api/auth.service";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setUser = useAuthStore((state) => state.setUser);
  const [status, setStatus] = useState("Processing login...");

  useEffect(() => {
    const token = searchParams.get("token");

    if (token) {
      localStorage.setItem("access_token", token);

      authService
        .getProfile()
        .then(async (user) => {
          localStorage.setItem("user", JSON.stringify(user));
          setUser(user);

          setStatus("Login successful!");

          setTimeout(() => {
            router.push("/chat");
          }, 500);
        })
        .catch((err) => {
          console.error("Failed to get profile:", err);
          setStatus("Login failed, redirecting...");
          setTimeout(() => {
            router.push("/login");
          }, 1000);
        });
    } else {
      router.push("/login");
    }
  }, [searchParams, router, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">{status}</p>
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p>Loading...</p>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}

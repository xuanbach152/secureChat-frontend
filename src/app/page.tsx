"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth.store";
import { authService } from "@/services/api/auth.service";

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    const token = searchParams.get("token");

    if (token) {
      localStorage.setItem("access_token", token);

      authService
        .getProfile()
        .then((user) => {
          localStorage.setItem("user", JSON.stringify(user));
          setUser(user);
          router.push("/chat");
        })
        .catch(() => {
          router.push("/login");
        });
    }
  }, [searchParams, router, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center space-y-6 p-8">
        <h1 className="text-6xl font-bold text-gray-900"> SecureChat</h1>
        <p className="text-xl text-gray-600 max-w-md mx-auto">
          End-to-End Encrypted Messaging
          <br />
          Your privacy, guaranteed.
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <Link
            href="/login"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
          >
            Register
          </Link>
        </div>
        <p className="text-sm text-gray-500 pt-8">
          Powered by ECDH + AES-GCM + ECDSA
        </p>
      </div>
    </div>
  );
}

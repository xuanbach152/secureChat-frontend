"use client";

import { useEffect, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { authService } from "@/services/api/auth.service";
import * as keyManager from "@/services/crypto/keyManager";
import { axiosInstance } from "@/lib/axios";
import toast from "react-hot-toast";
import { Toaster } from "@/components/ui/Toaster";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setUser = useAuthStore((state) => state.setUser);
  const [status, setStatus] = useState("Đang xử lý đăng nhập...");

  useEffect(() => {
    const token = searchParams.get("token");

    if (token) {
      localStorage.setItem("access_token", token);

      authService
        .getProfile()
        .then(async (user) => {
          localStorage.setItem("user", JSON.stringify(user));
          setUser(user);

          // Check if user has keys, if not generate them
          setStatus("Đang kiểm tra khóa bảo mật...");
          const existingKeys = await keyManager.loadKeysFromStorage(user._id);

          if (!existingKeys) {
            setStatus("Đang tạo khóa bảo mật...");
            const newKeys = await keyManager.generateAndStoreKeys(user._id);

            // Upload public keys to server
            await axiosInstance.post(
              "/users/upload-keys",
              {
                ecdsaPublicKey: newKeys.ecdsaPublicKey,
                ecdhPublicKey: newKeys.ecdhPublicKey,
              },
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );

            toast.success("Đã tạo khóa bảo mật!");
          }

          toast.success("Đăng nhập Google thành công!");
          router.push("/chat");
        })
        .catch((err) => {
          console.error("Failed to get profile:", err);
          setStatus("Đăng nhập thất bại");
          toast.error("Đăng nhập thất bại");
          setTimeout(() => {
            router.push("/login");
          }, 1000);
        });
    } else {
      router.push("/login");
    }
  }, [searchParams, router, setUser]);

  return (
    <>
      <Toaster />
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{status}</p>
        </div>
      </div>
    </>
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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { keyManager } from "@/services/crypto/keyManager";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingModal } from "@/components/ui/LoadingModal";
import { Toaster } from "@/components/ui/Toaster";

const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const setPrivateKey = useAuthStore((state) => state.setPrivateKey);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      setError("");
      setLoadingMessage("Đang đăng nhập...");

      await login(data.email, data.password);

      const user = useAuthStore.getState().user;
      if (!user) throw new Error("Login failed");

      setLoadingMessage("Đang kiểm tra khóa...");
      const hasKeys = await keyManager.checkUserHasKeys(user._id);

      if (!hasKeys) {
    
        setLoadingMessage("Đang tạo khóa bảo mật...");
        await keyManager.generateAndUploadKeys(data.password);
        toast.success("Đã tạo khóa bảo mật!");
      }

      setLoadingMessage("Đang tải khóa...");
      const privateKey = await keyManager.loadKeysOnLogin(
        data.password,
        user._id
      );

      setPrivateKey(privateKey);
      console.log("Private key loaded successfully");

      router.push("/chat");
    } catch (err: unknown) {
      console.error("Login error:", err);
      if (err instanceof Error) {
        if (
          err.message.includes("decrypt") ||
          err.message.includes("password")
        ) {
          setError("Mật khẩu không đúng. Không thể giải mã khóa.");
        } else if (err.message.includes("No keys found")) {
          setError("Không tìm thấy khóa. Hệ thống sẽ tạo khóa mới.");
        } else {
          setError("Đăng nhập thất bại. Vui lòng thử lại.");
        }
      } else {
        setError("Đã xảy ra lỗi không xác định.");
      }
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };
  const handleGoogleLogin = () => {
    window.location.href = "http://localhost:3000/auth/google";
  };

  return (
    <>
      <Toaster />
      <LoadingModal isOpen={isLoading} message={loadingMessage} />

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900"> SecureChat</h1>
            <p className="text-gray-600 mt-2">
              Đăng nhập vào tài khoản của bạn
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="bach@example.com"
              error={errors.email?.message}
              {...register("email")}
            />

            <Input
              label="Mật khẩu"
              type="password"
              placeholder="••••••"
              error={errors.password?.message}
              {...register("password")}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={isLoading}
            >
              Đăng nhập
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Hoặc</span>
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            className="w-full flex items-center justify-center gap-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            onClick={handleGoogleLogin}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 48 48"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.7 1.22 9.18 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.33 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.5 24c0-1.64-.15-3.22-.43-4.75H24v9h12.7c-.55 2.97-2.22 5.49-4.74 7.18l7.62 5.9C43.98 37.36 46.5 31.15 46.5 24z"
              />
              <path
                fill="#FBBC05"
                d="M10.54 28.59c-.48-1.44-.76-2.98-.76-4.59s.28-3.15.76-4.59l-7.98-6.19C.92 16.05 0 19.94 0 24s.92 7.95 2.56 10.78l7.98-6.19z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.9-2.13 15.87-5.77l-7.62-5.9c-2.12 1.43-4.83 2.27-8.25 2.27-6.26 0-11.57-3.83-13.46-9.11l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
            </svg>

            <span className="font-medium">Đăng nhập với Google</span>
          </Button>

          {/* Register Link */}
          <p className="text-center text-sm text-gray-600 mt-6">
            Chưa có tài khoản?{" "}
            <Link
              href="/register"
              className="text-blue-600 hover:underline font-medium"
            >
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}

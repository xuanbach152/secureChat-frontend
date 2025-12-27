"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AxiosError } from "axios";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const registerSchema = z
  .object({
    email: z.string().email("Email không hợp lệ"),
    username: z.string().min(3, "Username phải có ít nhất 3 ký tự"),
    password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
    confirmPassword: z.string(),
    displayName: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const register = useAuthStore((state) => state.register);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const {
    register: formRegister,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setError("");
      setIsLoading(true);

      await register(
        data.email,
        data.username,
        data.password,
        data.displayName
      );

      router.push("/chat");
    } catch (err) {
      const error = err as AxiosError<{ message: string | string[] }>;
      const errorMsg = error.response?.data?.message;
      if (Array.isArray(errorMsg)) {
        setError(errorMsg.join(", "));
      } else {
        setError(errorMsg || "Đăng ký thất bại");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleRegister = () => {
    window.location.href = "http://localhost:3000/auth/google";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900"> SecureChat</h1>
          <p className="text-gray-600 mt-2">Tạo tài khoản mới</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Register Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="bach@example.com"
            error={errors.email?.message}
            {...formRegister("email")}
          />

          <Input
            label="Username"
            type="text"
            placeholder="bachhaha"
            error={errors.username?.message}
            {...formRegister("username")}
          />

          <Input
            label="Tên hiển thị (tùy chọn)"
            type="text"
            placeholder="Bách Đẹp Zai"
            error={errors.displayName?.message}
            {...formRegister("displayName")}
          />

          <Input
            label="Mật khẩu"
            type="password"
            placeholder="••••••"
            error={errors.password?.message}
            {...formRegister("password")}
          />

          <Input
            label="Xác nhận mật khẩu"
            type="password"
            placeholder="••••••"
            error={errors.confirmPassword?.message}
            {...formRegister("confirmPassword")}
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={isLoading}
          >
            Đăng ký
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

        {/* Google Register */}
        <Button
          type="button"
          variant="secondary"
          className="w-full flex items-center justify-center gap-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          onClick={handleGoogleRegister}
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

          <span className="font-medium">Đăng ký với Google</span>
        </Button>

        {/* Login Link */}
        <p className="text-center text-sm text-gray-600 mt-6">
          Đã có tài khoản?{" "}
          <Link
            href="/login"
            className="text-blue-600 hover:underline font-medium"
          >
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}

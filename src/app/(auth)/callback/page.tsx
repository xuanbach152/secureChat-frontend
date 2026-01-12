"use client";

import { useEffect, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { authService } from "@/services/api/auth.service";
import { keyManager } from "@/services/crypto/keyManager";
import toast from "react-hot-toast";
import { Toaster } from "@/components/ui/Toaster";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setUser = useAuthStore((state) => state.setUser);
  const setPrivateKey = useAuthStore((state) => state.setPrivateKey);
  const [status, setStatus] = useState("Đang xử lý đăng nhập...");
  const [needPassword, setNeedPassword] = useState(false);
  const [hasKeysState, setHasKeysState] = useState<boolean>(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");

    if (token) {
      localStorage.setItem("access_token", token);

      authService
        .getProfile()
        .then(async (user) => {
          localStorage.setItem("user", JSON.stringify(user));
          setUser(user);

          setStatus("Đang kiểm tra khóa bảo mật...");
          const hasKeys = await keyManager.checkUserHasKeys(user._id);
          setHasKeysState(hasKeys);

          if (!hasKeys) {
            setStatus("Cần tạo mật khẩu bảo vệ khóa");
            setNeedPassword(true);
          } else {
            setStatus("Cần mật khẩu để giải mã khóa");
            setNeedPassword(true);
          }
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

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password) {
      setError("Vui lòng nhập mật khẩu");
      return;
    }

    const user = useAuthStore.getState().user;
    if (!user) return;

    const hasKeys = await keyManager.checkUserHasKeys(user._id);

    try {
      if (!hasKeys) {
        if (password !== confirmPassword) {
          setError("Mật khẩu xác nhận không khớp");
          return;
        }

        if (password.length < 6) {
          setError("Mật khẩu phải có ít nhất 6 ký tự");
          return;
        }

        setStatus("Đang tạo khóa bảo mật...");
        await keyManager.generateAndUploadKeys(password);
        toast.success("Đã tạo khóa bảo mật!");
      }

      setStatus("Đang tải khóa...");
      const privateKey = await keyManager.loadKeysOnLogin(password, user._id);
      setPrivateKey(privateKey);

      toast.success("Đăng nhập thành công!");
      router.push("/chat");
    } catch (err) {
      console.error("Key error:", err);
      if (err instanceof Error && err.message.includes("decrypt")) {
        setError("Mật khẩu không đúng");
      } else {
        setError("Có lỗi xảy ra. Vui lòng thử lại.");
      }
    }
  };

  if (needPassword) {
    return (
      <>
        <Toaster />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Bảo Mật Khóa
            </h2>
            <p className="text-gray-600 mb-6">
              {!hasKeysState
                ? "Tạo mật khẩu để bảo vệ khóa mã hóa của bạn"
                : "Nhập mật khẩu để giải mã khóa"}
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {!hasKeysState && (
                <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-yellow-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700 font-medium">
                        i. Quan trọng: Hãy ghi nhớ mật khẩu này!
                      </p>
                      <p className="text-sm text-yellow-700 font-medium">
                        ii. Mật khẩu này KHÔNG được lưu trên server. Nếu quên,
                        bạn sẽ toang.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mật khẩu
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                  autoFocus
                />
              </div>

              {!hasKeysState && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Xác nhận mật khẩu
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    placeholder="Nhập lại mật khẩu"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Tiếp tục
              </button>
            </form>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700">
                <span className="font-semibold">i. Lưu ý:</span> Mật khẩu này
                dùng để mã hóa khóa riêng tư trên thiết bị của bạn. Không ai có
                thể truy cập tin nhắn của bạn mà không có mật khẩu này.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

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

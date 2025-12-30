"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/auth.store";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export default function ChatPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please login first</p>
          <Link href="/login" className="text-blue-600 hover:underline">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🔐 SecureChat</h1>
            <p className="text-sm text-gray-600">
              Logged in as: <span className="font-medium">{user.email}</span>
            </p>
          </div>
          <Button onClick={handleLogout} variant="secondary">
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex items-center justify-center p-8 min-h-[calc(100vh-80px)]">
        <div className="text-center space-y-6 max-w-2xl">
          <h2 className="text-4xl font-bold text-gray-900">
            Chat UI Coming Soon...
          </h2>
          <p className="text-lg text-gray-600">
            Phase 4 & 5 will build the complete chat interface with real-time
            messaging.
          </p>

          {/* Development Links */}
          <div className="bg-white p-6 rounded-lg shadow-lg border-2 border-blue-200">
            <h3 className="text-xl font-bold mb-4 text-blue-900">
              🔧 Development Tools
            </h3>
            <div className="space-y-3">
              <Link href="/test-crypto">
                <div className="block p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-300 transition">
                  <div className="font-bold text-blue-900">
                    🔐 Test Crypto Service
                  </div>
                  <div className="text-sm text-blue-700">
                    Test encryption, decryption, signing
                  </div>
                </div>
              </Link>

              <Link href="/test-api">
                <div className="block p-4 bg-green-50 hover:bg-green-100 rounded-lg border border-green-300 transition">
                  <div className="font-bold text-green-900">🌐 Test API</div>
                  <div className="text-sm text-green-700">
                    Test backend API endpoints
                  </div>
                </div>
              </Link>

              <Link href="/test-socket">
                <div className="block p-4 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-300 transition">
                  <div className="font-bold text-purple-900">
                    🔌 Test WebSocket
                  </div>
                  <div className="text-sm text-purple-700">
                    Test real-time encrypted chat
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* User Info */}
          <div className="bg-gray-100 p-6 rounded-lg">
            <h4 className="font-bold mb-2">Your Info:</h4>
            <pre className="text-left text-sm overflow-auto">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

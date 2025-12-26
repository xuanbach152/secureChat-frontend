"use client";

import { useState } from "react";
import { authService } from "@/services/api/auth.service";

export default function TestAPIPage() {
  const [result, setResult] = useState("");

  const testRegister = async () => {
    try {
      const response = await authService.register({
        email: "bach@example.com",
        username: "bachhaha",
        password: "123456",
      });
      setResult("✅ SUCCESS:\n" + JSON.stringify(response, null, 2));
    } catch (error: any) {
      setResult(
        "❌ ERROR:\n" +
          JSON.stringify(error.response?.data || error.message, null, 2)
      );
    }
  };

  const testLogin = async () => {
    try {
      const response = await authService.login({
        identifier: "bach@example.com", // Phải dùng EMAIL, không phải username
        password: "123456",
      });
      setResult("✅ SUCCESS:\n" + JSON.stringify(response, null, 2));

      // Save token
      authService.saveAuth(response.accessToken, response.user);
    } catch (error: any) {
      setResult(
        "❌ ERROR:\n" +
          JSON.stringify(error.response?.data || error.message, null, 2)
      );
    }
  };

  const testProfile = async () => {
    try {
      const profile = await authService.getProfile();
      setResult("✅ SUCCESS:\n" + JSON.stringify(profile, null, 2));
    } catch (error: any) {
      setResult(
        "❌ ERROR:\n" +
          JSON.stringify(error.response?.data || error.message, null, 2)
      );
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test API Connection</h1>

      <div className="space-x-4 mb-4">
        <button
          onClick={testRegister}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Test Register
        </button>
        <button
          onClick={testLogin}
          className="px-4 py-2 bg-green-500 text-white rounded"
        >
          Test Login
        </button>
        <button
          onClick={testProfile}
          className="px-4 py-2 bg-purple-500 text-white rounded"
        >
          Test Profile (JWT)
        </button>
      </div>

      <pre className="bg-yellow-100 p-4 rounded text-black">
        {result || "Click a button to test..."}
      </pre>
    </div>
  );
}

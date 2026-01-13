import { axiosInstance } from "@/lib/axios";
import { LoginDto, RegisterDto, AuthResponse, User } from "../../types";
import * as keyManager from "../crypto/keyManager";

export const authService = {
  async register(data: RegisterDto): Promise<AuthResponse> {
    const tempUserId = data.email; // Use email as temporary ID
    const keys = await keyManager.generateAndStoreKeys(tempUserId);

    try {
      const response = await axiosInstance.post<AuthResponse>(
        "/auth/register",
        {
          email: data.email,
          username: data.username,
          password: data.password,
          displayName: data.displayName,
          ecdsaPublicKey: keys.ecdsaPublicKey,
          ecdhPublicKey: keys.ecdhPublicKey,
        }
      );

      // Update keys with real userId
      await keyManager.clearKeys(tempUserId);
      const finalKeys = await keyManager.generateAndStoreKeys(
        response.data.user._id
      );

      // Upload public keys to server
      await axiosInstance.post(
        "/users/upload-keys",
        {
          ecdsaPublicKey: finalKeys.ecdsaPublicKey,
          ecdhPublicKey: finalKeys.ecdhPublicKey,
        },
        {
          headers: { Authorization: `Bearer ${response.data.accessToken}` },
        }
      );

      return response.data;
    } catch (error) {
      // Clean up temporary keys if registration fails
      await keyManager.clearKeys(tempUserId);
      throw error;
    }
  },

  async login(data: LoginDto): Promise<AuthResponse> {
    const response = await axiosInstance.post<AuthResponse>(
      "/auth/login",
      data
    );

    // Try to load existing keys
    const keys = await keyManager.loadKeysFromStorage(response.data.user._id);

    if (!keys) {
      // Generate new keys if not found
      console.warn("Keys not found, generating new ones");
      const newKeys = await keyManager.generateAndStoreKeys(
        response.data.user._id
      );

      // Upload to server
      await axiosInstance.post(
        "/users/upload-keys",
        {
          ecdsaPublicKey: newKeys.ecdsaPublicKey,
          ecdhPublicKey: newKeys.ecdhPublicKey,
        },
        {
          headers: { Authorization: `Bearer ${response.data.accessToken}` },
        }
      );
    }

    return response.data;
  },

  async getProfile(): Promise<User> {
    const response = await axiosInstance.get<User>("/auth/profile");
    return response.data;
  },

  getGoogleAuthUrl(): string {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    return `${API_URL}/auth/google`;
  },

  saveAuth(token: string, user: User): void {
    localStorage.setItem("access_token", token);
    localStorage.setItem("user", JSON.stringify(user));
  },

  async logout(): Promise<void> {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      await keyManager.clearKeys(user._id);
    }

    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
  },

  getStoredUser(): User | null {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem("access_token");
  },
};

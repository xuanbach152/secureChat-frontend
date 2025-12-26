import { axiosInstance } from "@/lib/axios";
import { LoginDto, RegisterDto, AuthResponse, User } from "../../types";

export const authService = {
  async register(data: RegisterDto): Promise<AuthResponse> {
    const response = await axiosInstance.post<AuthResponse>(
      "/auth/register",
      data
    );
    return response.data;
  },

  async login(data: LoginDto): Promise<AuthResponse> {
    const response = await axiosInstance.post<AuthResponse>(
      "/auth/login",
      data
    );
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

  logout(): void {
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

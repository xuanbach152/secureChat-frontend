import { create } from "zustand";
import { User } from "@/types";
import { authService } from "@/services/api/auth.service";
import {
  initializeUserKeys,
  clearCryptoData,
} from "@/services/crypto/crypto-manager.service";
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    username: string,
    password: string,
    displayName?: string
  ) => Promise<void>;
  logout: () => void;
  loadUser: () => void;
  setUser: (user: User | null) => void;
}
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async (email: string, password: string) => {
    console.log(" Login started for:", email);
    const response = await authService.login({
      identifier: email,
      password,
    });

    console.log(" Login response:", response);
    console.log(" User object:", response.user);
    console.log(" User ID:", response.user._id);
    console.log(" Type:", typeof response.user._id);


    if (!response.user || !response.user._id) {
      console.error(" Invalid user object:", response.user);
      throw new Error("Invalid user data received from server");
    }


    const userId = typeof response.user._id === 'string' 
      ? response.user._id 
      : String(response.user._id);
    
    console.log(" Validated userId:", userId);

    authService.saveAuth(response.accessToken, response.user);

    set({
      user: response.user,
      isAuthenticated: true,
      isLoading: false,
    });

    console.log(" Initializing keys for userId:", userId);
    await initializeUserKeys(userId);
    console.log(" Keys initialized successfully");
  },
  register: async (
    email: string,
    username: string,
    password: string,
    displayName?: string
  ) => {
    const response = await authService.register({
      email,
      username,
      password,
      displayName,
    });

    // Ensure _id is string
    const userId = typeof response.user._id === 'string' 
      ? response.user._id 
      : String(response.user._id);

    authService.saveAuth(response.accessToken, response.user);

    set({
      user: response.user,
      isAuthenticated: true,
      isLoading: false,
    });

    await initializeUserKeys(userId);
  },

  logout: async () => {
    authService.logout();

    await clearCryptoData();

    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  loadUser: async () => {
    console.log(" loadUser called");
    const storedUser = authService.getStoredUser();
    const isAuth = authService.isAuthenticated();

    console.log(" Stored user:", storedUser);
    console.log(" Is authenticated:", isAuth);

    set({
      user: storedUser,
      isAuthenticated: isAuth,
      isLoading: false,
    });

    if (storedUser && isAuth) {
      // Ensure _id is string
      const userId = typeof storedUser._id === 'string' 
        ? storedUser._id 
        : String(storedUser._id);
      
      console.log(" Initializing keys for stored user:", userId);
      try {
        await initializeUserKeys(userId);
        console.log(" Keys initialized for stored user");
      } catch (err) {
        console.error(" Failed to initialize keys:", err);
      }
    } else {
      console.log("⏭ Skip key initialization (no user or not authenticated)");
    }
  },

  setUser: (user: User | null) => {
    set({
      user,
      isAuthenticated: !!user,
    });
  },
}));

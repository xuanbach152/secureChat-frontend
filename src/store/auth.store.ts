import { create } from "zustand";
import { User } from "@/types";
import { authService } from "@/services/api/auth.service";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  ecdsaPrivateKey: CryptoKey | null;
  setPrivateKey: (key: CryptoKey | null) => void;
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
  ecdsaPrivateKey: null,

  setPrivateKey: (key) => set({ ecdsaPrivateKey: key }),

  login: async (email: string, password: string) => {
    const response = await authService.login({
      identifier: email,
      password,
    });

    authService.saveAuth(response.accessToken, response.user);

    set({
      user: response.user,
      isAuthenticated: true,
      isLoading: false,
    });
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

    authService.saveAuth(response.accessToken, response.user);

    set({
      user: response.user,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  logout: async () => {
    authService.logout();

    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      ecdsaPrivateKey: null,
    });
  },

  loadUser: async () => {
    const storedUser = authService.getStoredUser();
    const isAuth = authService.isAuthenticated();

    set({
      user: storedUser,
      isAuthenticated: isAuth,
      isLoading: false,
    });
  },

  setUser: (user: User | null) => {
    set({
      user,
      isAuthenticated: !!user,
    });
  },
}));

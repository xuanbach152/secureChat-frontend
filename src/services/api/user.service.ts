import { axiosInstance } from "@/lib/axios";
import { User } from "@/types";

export const usersService = {
  async getOnlineUsers(): Promise<User[]> {
    const response = await axiosInstance.get<User[]>("/users/online");
    return response.data;
  },

  async getUserById(userId: string): Promise<User> {
    const response = await axiosInstance.get<User>(`/users/${userId}`);
    return response.data;
  },
};

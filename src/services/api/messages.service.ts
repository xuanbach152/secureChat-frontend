import { axiosInstance } from "@/lib/axios";
import { GetMessagesResponse, UnreadCountResponse } from "@/types";
export const messagesService = {
  async getMessages(
    otherUserId: string,
    limit: number = 50,
    skip: number = 0
  ): Promise<GetMessagesResponse> {
    const response = await axiosInstance.get<GetMessagesResponse>(
      `/messages/${otherUserId}`,
      {
        params: { limit, skip },
      }
    );
    return response.data;
  },
  async getUnreadCount(): Promise<number> {
    const response = await axiosInstance.get<UnreadCountResponse>(
      "/messages/unread/count"
    );
    return response.data.unreadCount;
  },
};

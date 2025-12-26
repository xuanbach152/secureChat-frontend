import { axiosInstance } from "@/lib/axios";
import { UpdateKeysDto, KeysResponse, CheckKeysResponse } from "@/types";

export const keysService = {
  async uploadKeys(data: UpdateKeysDto): Promise<{ message: string }> {
    const response = await axiosInstance.post("/keys", data);
    return response.data;
  },
  async getPublicKeys(userId: string): Promise<KeysResponse> {
    const response = await axiosInstance.get<KeysResponse>(`/keys/${userId}`);
    return response.data;
  },
  async checkKeysExist(userId: string): Promise<boolean> {
    const response = await axiosInstance.get<CheckKeysResponse>(
      `/keys/check/${userId}`
    );
    return response.data.hasKeys;
  },
};

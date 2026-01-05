import { axiosInstance } from "@/lib/axios";
import { SessionResponse } from "@/types";
export const sessionsService = {
  async getOrCreateSessionNoVerify(
    otherUserId: string,
    ephemeralPublicKey: string
  ): Promise<SessionResponse> {
    const response = await axiosInstance.post<SessionResponse>(
      "/sessions/dev/get-or-create-no-verify",
      { otherUserId, ecdhPublicKey: ephemeralPublicKey, ecdhSignature: "dummy" }
    );
    return response.data;
  },

  async getOrCreateSession(
    otherUserId: string,
    ephemeralPublicKey: string,
    signature: string
  ): Promise<SessionResponse> {
    const response = await axiosInstance.post<SessionResponse>(
      "/sessions/get-or-create",
      {
        otherUserId,
        ecdhPublicKey: ephemeralPublicKey,
        ecdhSignature: signature,
      }
    );
    return response.data;
  },

  async getSessionById(sessionId: string): Promise<SessionResponse> {
    const response = await axiosInstance.get<SessionResponse>(
      `/sessions/${sessionId}`
    );
    return response.data;
  },

  async rotateSession(
    sessionId: string,
    newEcdhPublicKey: string,
    newEcdhSignature: string
  ): Promise<SessionResponse> {
    const response = await axiosInstance.post<SessionResponse>(
      `/sessions/${sessionId}/rotate`,
      { newEcdhPublicKey, newEcdhSignature }
    );
    return response.data;
  },
  
};

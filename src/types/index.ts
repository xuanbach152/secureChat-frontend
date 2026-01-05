export interface User {
  _id: string;
  email: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  isOnline?: boolean;
  provider?: "local" | "google";
  createdAt?: string;
  updatedAt?: string;
}

export interface RegisterDto {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}
export interface LoginDto {
  identifier: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface UpdateKeysDto {
  ecdhPublicKey: string;
  ecdsaPublicKey: string;
}

export interface KeysResponse {
  userId: string;
  ecdhPublicKey: string;
  ecdsaPublicKey: string;
}

export interface CheckKeysResponse {
  hasKeys: boolean;
}

export interface MessageKeyInfo {
  messageId: string;
  nonce: string;
  sessionId: string;
}

export interface Message {
  _id: string;
  senderId: string | User; // Can be populated
  receiverId: string | User; // Can be populated
  roomId: string;
  sessionId: string;
  encryptedContent: string;
  iv: string | null;
  signature: string | null;
  messageKeyInfo: MessageKeyInfo;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  sender?: User;
  receiver?: User;
}

export interface SendMessageDto {
  receiverId: string;
  sessionId: string;
  messageKeyInfo: MessageKeyInfo;
  encryptedContent: string;
  iv: string;
  signature: string;
}

export interface GetMessagesResponse {
  messages: Message[];
  count: number;
  limit: number;
  skip: number;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

export interface JoinRoomDto {
  otherUserId: string;
}

export interface JoinRoomResponse {
  roomId: string;
}

export interface MarkAsReadDto {
  senderId: string;
}

export interface MessagesReadEvent {
  by: string;
}

export interface TypingDto {
  receiverId: string;
}

export interface UserTypingEvent {
  userId: string;
}

export interface DecryptedMessage extends Omit<Message, "encryptedContent"> {
  content: string;
}

export interface ChatRoom {
  otherUser: User;
  lastMessage?: DecryptedMessage;
  unreadCount: number;
}

export interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface StoredPrivateKeys {
  ecdhPrivateKey: JsonWebKey;
  ecdsaPrivateKey: JsonWebKey;
}

export interface ExportedPublicKeys {
  ecdhPublicKey: string;
  ecdsaPublicKey: string;
}

export interface SessionResponse {
  sessionId: string;
  myUserId: string;
  otherUserId: string;
  myEcdhPublicKey: string;
  myEcdhSignature: string;
  theirEcdhPublicKey: string;
  theirEcdhSignature: string;
  theirEcdsaPublicKey: string;
  createdAt: string;
  expiresAt: string;
  isNew: boolean;
}

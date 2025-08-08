import {
  NonceRequest,
  NonceResponse,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  TelegramLoginRequest,
  LinkTelegramRequest,
  UserProfileResponse,
  UpdateProfileResponse,
  UpdateUserProfile,
  UpdateNotificationPreferences,
  UpdateSocialLinks,
} from "@poolmind/shared-types";
import { useClient } from "@/hooks/api";
import { AxiosInstance } from "axios";
import { useAuthSession } from "@/components/auth/session-provider";
import { useCallback } from "react";
import { config } from "@/lib/config";


async function _generateNonce(client: AxiosInstance, data: NonceRequest): Promise<NonceResponse> {
  const response = await client.post<NonceResponse>("/auth/nonce", data);
  return response.data;
}

async function _login(client: AxiosInstance, data: LoginRequest, onSuccess?: (response: LoginResponse) => void): Promise<LoginResponse> {
  const response = await client.post<LoginResponse>("/auth/login", data);
  if (onSuccess) {
    onSuccess(response.data);
  }
  return response.data;
}

async function _refreshToken(client: AxiosInstance, data: RefreshTokenRequest): Promise<RefreshTokenResponse> {
  const response = await client.post<RefreshTokenResponse>("/auth/refresh", data);
  return response.data;
}

async function _getCurrentUser(client: AxiosInstance): Promise<UserProfileResponse> {
  const response = await client.get<UserProfileResponse>("/auth/me");
  return response.data;
}

async function _getUserProfile(client: AxiosInstance): Promise<UserProfileResponse> {
  const response = await client.get<UserProfileResponse>("/users/profile");
  return response.data;
}

async function _updateUserProfile(client: AxiosInstance, data: UpdateUserProfile): Promise<UpdateProfileResponse> {
  const response = await client.put<UpdateProfileResponse>("/users/profile", data);
  return response.data;
}

async function _telegramLogin(client: AxiosInstance, data: TelegramLoginRequest, onSuccess?: (response: LoginResponse) => void): Promise<LoginResponse> {
  const response = await client.post<LoginResponse>("/auth/telegram/login", data);
  if (onSuccess) {
    onSuccess(response.data);
  }
  return response.data;
}

async function _linkTelegram(client: AxiosInstance, data: LinkTelegramRequest): Promise<UserProfileResponse> {
  const response = await client.post<UserProfileResponse>("/auth/telegram/link", data);
  return response.data;
}

async function _unlinkTelegram(client: AxiosInstance): Promise<UserProfileResponse> {
  const response = await client.post<UserProfileResponse>("/auth/telegram/unlink");
  return response.data;
}

async function _updateNotificationPreferences(client: AxiosInstance, data: UpdateNotificationPreferences): Promise<UpdateProfileResponse> {
  const response = await client.put<UpdateProfileResponse>("/users/notifications", data);
  return response.data;
}

async function _updateSocialLinks(client: AxiosInstance, data: UpdateSocialLinks): Promise<UpdateProfileResponse> {
  const response = await client.put<UpdateProfileResponse>("/users/social-links", data);
  return response.data;
}

async function _generateAuthMessage(client: AxiosInstance, walletAddress: string): Promise<string> {
  try {
    const response = await _generateNonce(client, { walletAddress });
    return response.message;
  } catch (error) {
    console.error('Error generating auth message:', error);
    // Fallback to local generation if API fails
    const timestamp = new Date().toISOString();
    const randomNonce = Math.random().toString(36).substring(2);
    let message = "Sign this message to authenticate with PoolMind\n"
    message += `\nDomain: ${config.nextAuthUrl}`
    message += `\nWallet Address: ${walletAddress}`
    message += `\nTimestamp: ${timestamp}`
    message += `\nNonce: ${randomNonce}`
    message += `\n\nBy signing this message, you confirm that you are the owner of this wallet address and agree to authenticate with PoolMind.`
    return message;
  }
}

function useAuth() {
  const client = useClient();
  const { setSession, session } = useAuthSession();


  const loginWithWallet = useCallback(async (data: LoginRequest) => {
    const response = await _login(client, data, (response) => setSession({ user: response.user, token: response.token, expiresAt: response.expiresAt }));
    return response;
  }, [client, setSession]);

  const loginWithTelegram = useCallback(async (data: TelegramLoginRequest) => {
    const response = await _telegramLogin(client, data, (response) => setSession({ user: response.user, token: response.token, expiresAt: response.expiresAt }));
    return response;
  }, [client, setSession]);

  const generateNonce = useCallback(async (data: NonceRequest) => {
    const response = await _generateNonce(client, data);
    return response;
  }, [client]);

  const generateAuthMessage = useCallback(async (walletAddress: string) => {
    const response = await _generateAuthMessage(client, walletAddress);
    return response;
  }, [client]);

  const refreshToken = useCallback(async () => {
    if (!session) {
      throw new Error("No session found");
    }
    const response = await _refreshToken(client, { token: session.token });
    setSession({ ...session, token: response.token, expiresAt: response.expiresAt });
  }, [client, session, setSession]);

  const refreshCurrentUser = useCallback(async () => {
    if (!session) {
      throw new Error("No session found");
    }
    const response = await _getCurrentUser(client);
    setSession({ ...session, user: response.user, token: session.token, expiresAt: session.expiresAt });
  }, [client]);

  const getUserProfile = useCallback(async () => {
    if (!session) {
      throw new Error("No session found");
    }
    const response = await _getUserProfile(client);
    return response;
  }, [client]); 

  const updateUserProfile = useCallback(async (data: UpdateUserProfile) => {
    if (!session) {
      throw new Error("No session found");
    }
    const response = await _updateUserProfile(client, data);
    return response;
  }, [client]);

  const updateNotificationPreferences = useCallback(async (data: UpdateNotificationPreferences) => {
    if (!session) {
      throw new Error("No session found");
    }
    const response = await _updateNotificationPreferences(client, data);
    return response;
  }, [client]);

  const updateSocialLinks = useCallback(async (data: UpdateSocialLinks) => {
    if (!session) {
      throw new Error("No session found");
    }
    const response = await _updateSocialLinks(client, data);
    return response;
  }, [client]);

  const linkTelegram = useCallback(async (data: LinkTelegramRequest) => {
    if (!session) {
      throw new Error("No session found");
    }
    const response = await _linkTelegram(client, data);
    return response;
  }, [client]);

  const unlinkTelegram = useCallback(async () => {
    if (!session) {
      throw new Error("No session found");
    }
    const response = await _unlinkTelegram(client);
    return response;
  }, [client]);

  return {
    loginWithWallet,
    loginWithTelegram,
    generateNonce,
    generateAuthMessage,
    refreshToken,
    refreshCurrentUser,
    getUserProfile,
    updateUserProfile,
    updateNotificationPreferences,
    updateSocialLinks,
    linkTelegram,
    unlinkTelegram,
  }
}

export default useAuth;
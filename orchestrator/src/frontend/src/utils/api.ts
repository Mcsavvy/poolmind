import type { ApiResponse } from "../types/wallet";
import config from "../config";

interface ConnectUrlResponse {
  url: string;
  accessToken: string;
  expiresAt: number;
  message?: string;
}

interface User {
  _id: string;
  telegramId: string;
  username: string;
  firstName?: string;
  lastName?: string;
  walletAddress?: string;
  kycStatus: "pending" | "approved" | "rejected";
  isActive: boolean;
  preferences?: {
    notifications?: boolean;
    language?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface ProfileResponse {
  success: boolean;
  data: User;
  message?: string;
}

interface TokenBalance {
  balance: number;
  balanceFormatted: string;
  decimals?: number;
  unit?: string;
}

interface BalanceData {
  address: string;
  plmd?: TokenBalance;
  stx?: TokenBalance;
}

interface BalanceResponse {
  success: boolean;
  data: BalanceData;
  message?: string;
}

export interface PoolState {
  admin: string;
  paused: boolean;
  transferable: boolean;
  nav: number;
  navFormatted: string;
  entryFee: number;
  entryFeeFormatted: string;
  exitFee: number;
  exitFeeFormatted: string;
  stxBalance: number;
  stxBalanceFormatted: string;
}

// Token management
export const getAuthToken = (): string | null => {
  return localStorage.getItem(config.authTokenKey);
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem(config.authTokenKey, token);
};

export const removeAuthToken = (): void => {
  localStorage.removeItem(config.authTokenKey);
};

// User Profile API
export const getUserProfile = async (): Promise<ApiResponse<User>> => {
  try {
    const token = getAuthToken();

    if (!token) {
      return {
        success: false,
        error: "No authentication token found",
      };
    }

    const response = await fetch(config.getApiUrl("auth/profile"), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = (await response.json()) as ProfileResponse;

    if (!response.ok) {
      return {
        success: false,
        error: data.message || "Failed to fetch profile",
      };
    }

    return {
      success: true,
      data: data.data,
    };
  } catch (error) {
    console.error("API Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
};

// Link wallet address to user profile
export const linkWalletAddress = async (
  walletAddress: string,
): Promise<ApiResponse<User>> => {
  try {
    const token = getAuthToken();

    if (!token) {
      return {
        success: false,
        error: "No authentication token found",
      };
    }

    const response = await fetch(config.getApiUrl("auth/wallet"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        walletAddress,
      }),
    });

    const data = (await response.json()) as ProfileResponse;

    if (!response.ok) {
      return {
        success: false,
        error: data.message || "Failed to link wallet address",
      };
    }

    return {
      success: true,
      data: data.data,
    };
  } catch (error) {
    console.error("API Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
};

// Unlink wallet address from user profile
export const unlinkWalletAddress = async (): Promise<ApiResponse<User>> => {
  try {
    const token = getAuthToken();

    if (!token) {
      return {
        success: false,
        error: "No authentication token found",
      };
    }

    const response = await fetch(config.getApiUrl("auth/wallet"), {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = (await response.json()) as ProfileResponse;

    if (!response.ok) {
      return {
        success: false,
        error: data.message || "Failed to unlink wallet address",
      };
    }

    return {
      success: true,
      data: data.data,
    };
  } catch (error) {
    console.error("API Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
};

// Generate wallet connection URL with access token
// Get user balances (STX and PLMD)
export const getUserBalances = async (): Promise<ApiResponse<BalanceData>> => {
  try {
    const token = getAuthToken();

    if (!token) {
      return {
        success: false,
        error: "No authentication token found",
      };
    }

    const response = await fetch(config.getApiUrl("balance/all"), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = (await response.json()) as BalanceResponse;

    if (!response.ok) {
      return {
        success: false,
        error: data.message || "Failed to fetch balances",
      };
    }

    return {
      success: true,
      data: data.data,
    };
  } catch (error) {
    console.error("API Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
};

export const getWalletConnectUrl = async (
  userId?: string,
  redirectUrl?: string,
): Promise<ApiResponse<ConnectUrlResponse>> => {
  try {
    const params = new URLSearchParams();
    if (userId) params.append("userId", userId);
    if (redirectUrl) params.append("redirectUrl", redirectUrl);

    const response = await fetch(
      config.getApiUrl(`wallet/connect-url?${params.toString()}`),
      {
        method: "GET",
      },
    );

    const data = (await response.json()) as ConnectUrlResponse;

    if (!response.ok) {
      return {
        success: false,
        error: data.message || "Failed to get connection URL",
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("API Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
};

// Get pool state
export const getPoolState = async (): Promise<ApiResponse<PoolState>> => {
  try {
    const response = await fetch(config.getApiUrl("pool/state"), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || "Failed to fetch pool state",
      };
    }

    return {
      success: true,
      data: data.data,
    };
  } catch (error) {
    console.error("API Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
};

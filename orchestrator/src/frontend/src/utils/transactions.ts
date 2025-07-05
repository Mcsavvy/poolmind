import config from "../config";
import { getAuthToken } from "./api";
import type { ApiResponse } from "../types/wallet";

export type TransactionStatus = "pending" | "success" | "failed" | "timeout";

export interface TransactionData {
  txId: string;
  status: TransactionStatus;
  type: "deposit" | "withdrawal";
  stxAmount?: number;
  plmdAmount?: number;
  nav?: number;
  fee?: number;
  netAmount?: number;
  blockHeight?: number;
  retryCount: number;
  errorMessage?: string;
  createdAt: string;
  confirmedAt?: string;
  timeoutAt: string;
}

export interface SubmitTransactionParams {
  txId: string;
  type: "deposit" | "withdrawal";
  stxAmount?: number;
  plmdAmount?: number;
  nav?: number;
  fee?: number;
  netAmount?: number;
}

export interface PollResult {
  status: TransactionStatus;
  transaction?: TransactionData;
}

interface TransactionResponse {
  success: boolean;
  data: TransactionData;
  message?: string;
}

interface TransactionListResponse {
  success: boolean;
  data: {
    transactions: TransactionData[];
    pagination: {
      limit: number;
      skip: number;
      total: number;
    };
  };
  message?: string;
}

/**
 * Submit a transaction to the backend for monitoring
 * @param params - Transaction parameters
 * @returns Promise with the submitted transaction data
 */
export const submitTransaction = async (
  params: SubmitTransactionParams,
): Promise<ApiResponse<TransactionData>> => {
  try {
    const token = getAuthToken();

    if (!token) {
      return {
        success: false,
        error: "No authentication token found",
      };
    }

    const response = await fetch(config.getApiUrl("transactions/submit"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    const data = (await response.json()) as TransactionResponse;

    if (!response.ok) {
      return {
        success: false,
        error: data.message || "Failed to submit transaction",
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

/**
 * Get transaction status from the backend
 * @param txId - The transaction ID
 * @returns Promise with the transaction data
 */
export const getTransactionStatus = async (
  txId: string,
): Promise<ApiResponse<TransactionData>> => {
  try {
    const token = getAuthToken();

    if (!token) {
      return {
        success: false,
        error: "No authentication token found",
      };
    }

    const response = await fetch(
      config.getApiUrl(`transactions/${txId}/status`),
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (response.status === 404) {
      return {
        success: false,
        error: "Transaction not found",
      };
    }

    const data = (await response.json()) as TransactionResponse;

    if (!response.ok) {
      return {
        success: false,
        error: data.message || "Failed to get transaction status",
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

/**
 * Poll for transaction status using the backend API
 * @param txId - The transaction ID
 * @param onStatusUpdate - Optional callback for status updates
 * @returns Promise that resolves when transaction is final
 */
export const pollTransactionStatus = (
  txId: string,
  onStatusUpdate?: (status: TransactionStatus) => void,
): Promise<PollResult> => {
  return new Promise((resolve, reject) => {
    const POLL_INTERVAL = 3000; // 3 seconds
    const MAX_POLL_TIME = 5 * 60 * 1000; // 5 minutes
    const startTime = Date.now();

    const poll = async () => {
      try {
        // Check if we've exceeded max poll time
        if (Date.now() - startTime > MAX_POLL_TIME) {
          return reject(new Error("Transaction polling timed out"));
        }

        const response = await getTransactionStatus(txId);

        if (!response.success || !response.data) {
          return reject(new Error(response.error || "Transaction not found"));
        }

        const transaction = response.data;

        // Update status callback
        onStatusUpdate?.(transaction.status);

        // Check if transaction is final
        if (transaction.status === "success") {
          return resolve({
            status: "success",
            transaction,
          });
        } else if (transaction.status === "failed") {
          return resolve({
            status: "failed",
            transaction,
          });
        } else if (transaction.status === "timeout") {
          return resolve({
            status: "timeout",
            transaction,
          });
        }

        // Still pending, continue polling
        setTimeout(poll, POLL_INTERVAL);
      } catch (error) {
        return reject(error);
      }
    };

    poll();
  });
};

/**
 * Get user's transaction history
 * @param params - Query parameters
 * @returns Promise with transaction list
 */
export const getUserTransactions = async (params?: {
  limit?: number;
  skip?: number;
  type?: "deposit" | "withdrawal";
  status?: TransactionStatus;
}): Promise<
  ApiResponse<{
    transactions: TransactionData[];
    pagination: {
      limit: number;
      skip: number;
      total: number;
    };
  }>
> => {
  try {
    const token = getAuthToken();

    if (!token) {
      return {
        success: false,
        error: "No authentication token found",
      };
    }

    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.skip) queryParams.append("skip", params.skip.toString());
    if (params?.type) queryParams.append("type", params.type);
    if (params?.status) queryParams.append("status", params.status);

    const url = `transactions${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

    const response = await fetch(config.getApiUrl(url), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = (await response.json()) as TransactionListResponse;

    if (!response.ok) {
      return {
        success: false,
        error: data.message || "Failed to get user transactions",
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

/**
 * Legacy function for backward compatibility
 * @deprecated Use getTransactionStatus instead
 */
export const getTransaction = async (
  txId: string,
): Promise<ApiResponse<TransactionData>> => {
  console.warn(
    "getTransaction is deprecated. Use getTransactionStatus instead.",
  );
  return await getTransactionStatus(txId);
};

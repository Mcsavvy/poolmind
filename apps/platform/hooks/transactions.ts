'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useClient } from './api';
import { useAuthSession } from '@/components/auth/session-provider';
import { useEffect } from 'react';

// Transaction API types based on OpenAPI schema
export interface CreateDepositRequest {
  amount: string;
  sourceAddress: string;
  txId: string;
  network?: 'mainnet' | 'testnet';
  notes?: string;
  tags?: string[];
}

export interface CreateWithdrawalRequest {
  amount: string;
  destinationAddress: string;
  poolSharesBurned?: string;
  minimumAmount?: string;
  isEmergencyWithdrawal?: boolean;
  txId: string;
  network?: 'mainnet' | 'testnet';
  notes?: string;
  tags?: string[];
}

export interface TransactionQuery {
  page?: number;
  limit?: number;
  type?: 'deposit' | 'withdrawal';
  status?:
    | 'pending'
    | 'broadcast'
    | 'confirming'
    | 'confirmed'
    | 'failed'
    | 'cancelled';
  sortBy?: 'createdAt' | 'updatedAt' | 'amount';
  sortOrder?: 'asc' | 'desc';
  search?: string;
  fromDate?: string;
  toDate?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal';
  status:
    | 'pending'
    | 'broadcast'
    | 'confirming'
    | 'confirmed'
    | 'failed'
    | 'cancelled';
  notes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  version: number;

  // Nested metadata structure
  metadata: {
    network: string;
    txId: string;
    amount: string; // Amount is in metadata, not top level
    contractAddress: string;
    contractName?: string;
    functionName: string;
    functionArgs?: any[];
    confirmations: number;
    requiredConfirmations: number;
    retryCount: number;
    broadcastAt: string;
    confirmedAt?: string;
    lastCheckedAt?: string;
    blockHeight?: number;
    // Pool state at transaction time (if available)
    nav?: string;
    poolTotalValue?: string;
    poolTotalShares?: string;
  };

  // Deposit-specific metadata
  depositMetadata?: {
    sourceAddress: string;
    destinationAddress: string;
    poolSharesExpected?: string;
    poolSharesActual?: string;
    tokensReceived?: string;
    entryFeeRate?: string;
    entryFeeAmount?: string;
  };

  // Withdrawal-specific metadata
  withdrawalMetadata?: {
    destinationAddress: string;
    sourceAddress: string;
    poolSharesBurned?: string;
    tokensBurned?: string;
    exitFeeRate?: string;
    exitFeeAmount?: string;
    minimumAmount?: string;
    isEmergencyWithdrawal: boolean;
    approvedBy?: string;
    approvedAt?: string;
  };
}

export interface TransactionListResponse {
  success: boolean;
  data: {
    transactions: Transaction[];
    pagination: {
      page: string | number;
      limit: string | number;
      total: number;
      totalPages: number;
    };
    success: boolean;
  };
}

export interface TransactionResponse {
  success: boolean;
  data: {
    transaction: Transaction;
  };
  message?: string;
}

export interface TransactionStatsResponse {
  success: boolean;
  data: {
    totalTransactions: number;
    totalDeposits: number;
    totalWithdrawals: number;
    pendingTransactions: number;
    confirmedTransactions: number;
    failedTransactions: number;
    totalDepositAmount: string;
    totalWithdrawalAmount: string;
  };
}

/**
 * Hook to fetch user transactions with pagination and filtering
 */
export function useTransactions(query?: Partial<TransactionQuery>) {
  const client = useClient();
  const { session } = useAuthSession();

  return useQuery({
    queryKey: ['transactions', query],
    queryFn: async (): Promise<TransactionListResponse> => {
      const params = new URLSearchParams();
      if (query?.page) params.append('page', query.page.toString());
      if (query?.limit) params.append('limit', query.limit.toString());
      if (query?.type) params.append('type', query.type);
      if (query?.status) params.append('status', query.status);
      if (query?.sortBy) params.append('sortBy', query.sortBy);
      if (query?.sortOrder) params.append('sortOrder', query.sortOrder);
      if (query?.search) params.append('search', query.search);
      if (query?.fromDate) params.append('fromDate', query.fromDate);
      if (query?.toDate) params.append('toDate', query.toDate);

      const response = await client.get(`/transactions?${params.toString()}`);
      return response.data;
    },
    enabled: !!session?.token,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });
}

/**
 * Hook to fetch a specific transaction by ID
 */
export function useTransaction(transactionId: string) {
  const client = useClient();
  const { session } = useAuthSession();

  return useQuery({
    queryKey: ['transaction', transactionId],
    queryFn: async (): Promise<TransactionResponse> => {
      const response = await client.get(`/transactions/${transactionId}`);
      return response.data;
    },
    enabled: !!session?.token && !!transactionId,
  });
}

/**
 * Hook to fetch user transaction statistics
 */
export function useTransactionStats() {
  const client = useClient();
  const { session } = useAuthSession();

  return useQuery({
    queryKey: ['transaction-stats'],
    queryFn: async (): Promise<TransactionStatsResponse> => {
      const response = await client.get('/transactions/stats/summary');
      return response.data;
    },
    enabled: !!session?.token,
    refetchInterval: 60000, // Refetch every minute
  });
}

/**
 * Hook to create a deposit transaction
 */
export function useCreateDeposit() {
  const client = useClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      request: CreateDepositRequest,
    ): Promise<TransactionResponse> => {
      const response = await client.post('/transactions/deposits', request);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transaction-stats'] });
      queryClient.invalidateQueries({ queryKey: ['user-balance'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
    },
  });
}

/**
 * Hook to create a withdrawal transaction
 */
export function useCreateWithdrawal() {
  const client = useClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      request: CreateWithdrawalRequest,
    ): Promise<TransactionResponse> => {
      const response = await client.post('/transactions/withdrawals', request);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transaction-stats'] });
      queryClient.invalidateQueries({ queryKey: ['user-balance'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
    },
  });
}

/**
 * Hook to poll a specific transaction until it's completed
 * Useful for monitoring transaction status after submission
 */
export function useTransactionPolling(
  transactionId: string,
  enabled: boolean = true,
) {
  const client = useClient();
  const { session } = useAuthSession();

  return useQuery({
    queryKey: ['transaction-poll', transactionId],
    queryFn: async (): Promise<TransactionResponse> => {
      const response = await client.get(`/transactions/${transactionId}`);
      return response.data;
    },
    enabled: !!session?.token && !!transactionId && enabled,
    refetchInterval: 10000, // Poll every 10 seconds
    refetchIntervalInBackground: false,
  });
}

/**
 * Custom hook to track transaction lifecycle
 * Returns transaction data and helper functions
 */
export function useTransactionTracker(transactionId: string | null) {
  const queryClient = useQueryClient();

  // Only poll if we have a transaction ID and it's not completed
  const {
    data: transactionData,
    isLoading,
    error,
  } = useTransactionPolling(transactionId || '', !!transactionId);

  const transaction = transactionData?.data?.transaction;

  // Check if transaction is in final state
  const isCompleted =
    transaction?.status === 'confirmed' ||
    transaction?.status === 'failed' ||
    transaction?.status === 'cancelled';

  // Stop polling when transaction reaches final state
  useEffect(() => {
    if (isCompleted && transactionId) {
      // Invalidate relevant queries to update UI
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['user-balance'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });

      // Stop polling this specific transaction after a delay to allow final state to be captured
      setTimeout(() => {
        queryClient.removeQueries({
          queryKey: ['transaction-poll', transactionId],
        });
      }, 5000);
    }
  }, [isCompleted, transactionId, queryClient]);

  // Manual stop tracking function
  const stopTracking = () => {
    if (transactionId) {
      queryClient.removeQueries({
        queryKey: ['transaction-poll', transactionId],
      });
    }
  };

  return {
    transaction,
    isLoading,
    error,
    isCompleted,
    stopTracking,
  };
}

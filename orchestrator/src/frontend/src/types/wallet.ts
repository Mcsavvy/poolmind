// Simplified wallet types for frontend

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  publicKey: string | null;
  network: string | null;
  loading: boolean;
  error: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Note: Complex wallet authentication types removed
// Wallet address linking is now handled through simple profile API calls

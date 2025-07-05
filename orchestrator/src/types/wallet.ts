// Simplified Wallet Types

export interface WalletConnectUrlRequest {
  redirectUrl?: string;
}

export interface WalletConnectUrlResponse {
  url: string;
  accessToken: string;
}

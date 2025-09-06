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
} from '@poolmind/shared-types';
import { useClient } from '@/hooks/api';
import { AxiosInstance } from 'axios';
import { useAuthSession } from '@/components/auth/session-provider';
import { useCallback } from 'react';
import { config } from '@/lib/config';
import { useState, useEffect } from 'react';
import {
  isConnected,
  getLocalStorage,
  disconnect,
  connect,
  request,
} from '@stacks/connect';
import { Loader2 } from 'lucide-react';

async function _login(
  client: AxiosInstance,
  data: LoginRequest,
  onSuccess?: (response: LoginResponse) => void,
): Promise<LoginResponse> {
  const response = await client.post<LoginResponse>('/auth/login', data);
  if (onSuccess) {
    onSuccess(response.data);
  }
  return response.data;
}

async function _refreshToken(
  client: AxiosInstance,
  data: RefreshTokenRequest,
): Promise<RefreshTokenResponse> {
  const response = await client.post<RefreshTokenResponse>(
    '/auth/refresh',
    data,
  );
  return response.data;
}

async function _getCurrentUser(
  client: AxiosInstance,
): Promise<UserProfileResponse> {
  const response = await client.get<UserProfileResponse>('/auth/me');
  return response.data;
}

async function _telegramLogin(
  client: AxiosInstance,
  data: TelegramLoginRequest,
  onSuccess?: (response: LoginResponse) => void,
): Promise<LoginResponse> {
  const response = await client.post<LoginResponse>(
    '/auth/telegram/login',
    data,
  );
  if (onSuccess) {
    onSuccess(response.data);
  }
  return response.data;
}

async function _linkTelegram(
  client: AxiosInstance,
  data: LinkTelegramRequest,
): Promise<UserProfileResponse> {
  const response = await client.post<UserProfileResponse>(
    '/auth/telegram/link',
    data,
  );
  return response.data;
}

async function _unlinkTelegram(
  client: AxiosInstance,
): Promise<UserProfileResponse> {
  const response = await client.post<UserProfileResponse>(
    '/auth/telegram/unlink',
  );
  return response.data;
}

async function _connectWallet(connected: boolean) {
  if (!connected) {
    const response = await connect();
    const account = response.addresses.find(
      address => address.symbol === 'STX',
    );
    if (!account) {
      throw new Error('Could not find STX address');
    }
    return [account.address, account.publicKey];
  } else {
    const userData = getLocalStorage();
    if (!userData?.addresses) {
      throw new Error('No wallet addresses found');
    }
    const stxAddress = userData.addresses.stx[0].address;
    const accounts = await request('getAddresses');
    const account = accounts.addresses.find(
      address => address.address === stxAddress,
    );
    if (!account) {
      throw new Error('Could not find wallet address');
    }
    if (!account.publicKey) {
      throw new Error('Could not retrieve public key from wallet');
    }
    return [account.address, account.publicKey];
  }
}

async function _generateNonce(
  client: AxiosInstance,
  data: NonceRequest,
): Promise<NonceResponse> {
  const response = await client.post<NonceResponse>('/auth/nonce', data);
  return response.data;
}

async function _generateAuthMessage(
  client: AxiosInstance,
  walletAddress: string,
): Promise<string> {
  try {
    const response = await _generateNonce(client, { walletAddress });
    return response.message;
  } catch (error) {
    console.error('Error generating auth message:', error);
    // Fallback to local generation if API fails
    const timestamp = new Date().toISOString();
    const randomNonce = Math.random().toString(36).substring(2);
    let message = 'Sign this message to authenticate with PoolMind\n';
    message += `\nDomain: ${config.nextAuthUrl}`;
    message += `\nWallet Address: ${walletAddress}`;
    message += `\nTimestamp: ${timestamp}`;
    message += `\nNonce: ${randomNonce}`;
    message += `\n\nBy signing this message, you confirm that you are the owner of this wallet address and agree to authenticate with PoolMind.`;
    return message;
  }
}

export function useAuth() {
  const client = useClient();
  const { setSession, session } = useAuthSession();

  const refreshToken = useCallback(async () => {
    if (!session) {
      throw new Error('No session found');
    }
    const response = await _refreshToken(client, { token: session.token });
    setSession({
      ...session,
      token: response.token,
      expiresAt: response.expiresAt,
    });
  }, [client, session, setSession]);

  const refreshCurrentUser = useCallback(async () => {
    if (!session) {
      throw new Error('No session found');
    }
    const response = await _getCurrentUser(client);
    setSession({
      ...session,
      user: response.user,
      token: session.token,
      expiresAt: session.expiresAt,
    });
  }, [client]);

  return {
    refreshToken,
    refreshCurrentUser,
  };
}

export function useWallet() {
  const client = useClient();
  const { session, clearSession, setSession } = useAuthSession();
  const [connected, setConnected] = useState(false);
  const [data, setData] = useState<{
    address: string;
    publicKey?: string;
  } | null>(null);

  const loginWithWallet = useCallback(
    async (data: LoginRequest) => {
      const response = await _login(client, data, response =>
        setSession({
          user: response.user,
          token: response.token,
          expiresAt: response.expiresAt,
          authMethod: 'wallet',
        }),
      );
      return response;
    },
    [client, setSession],
  );

  const generateNonce = useCallback(
    async (data: NonceRequest) => {
      const response = await _generateNonce(client, data);
      return response;
    },
    [client],
  );

  const generateAuthMessage = useCallback(
    async (walletAddress: string) => {
      const response = await _generateAuthMessage(client, walletAddress);
      return response;
    },
    [client],
  );

  const connectWallet = useCallback(async () => {
    const [address, publicKey] = await _connectWallet(connected);
    setData({ address, publicKey });
    setConnected(true);
    return [address, publicKey];
  }, [connected, setData]);

  useEffect(() => {
    const checkConnection = () => {
      const connected = isConnected();
      console.log('Connected:', connected);

      if (connected) {
        const userData = getLocalStorage();
        const stxAddress = userData?.addresses?.stx?.[0]?.address;
        if (!stxAddress) {
          console.log('No STX address found');
          disconnect();
          setConnected(false);
          setData(null);
          if (session && session.authMethod === 'wallet') {
            console.log('Logging out');
            clearSession();
          }
          return;
        }
        if (session && session.user.walletAddress !== stxAddress) {
          console.log('STX address mismatch');
          disconnect();
          setConnected(false);
          setData(null);
          if (session.authMethod === 'wallet') {
            console.log('Logging out');
            clearSession();
          }
          return;
        }
        setConnected(true);
        setData({ address: stxAddress });
      } else {
        if (session && session.authMethod === 'wallet') {
          console.log('Wallet disconnected');
          setConnected(false);
          setData(null);
          clearSession();
        }
        setConnected(false);
      }
    };

    checkConnection();
    const handleStorageChange = () => {
      checkConnection();
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const disconnectWallet = () => {
    disconnect();
  };

  return {
    data,
    isConnected: connected,
    connect: connectWallet,
    disconnect: disconnectWallet,
    loginWithWallet,
    generateNonce,
    generateAuthMessage,
  };
}

export function useTelegram() {
  const client = useClient();
  const { refreshCurrentUser } = useAuth();
  const { session, clearSession, setSession } = useAuthSession();

  const loginWithTelegram = useCallback(
    async (data: TelegramLoginRequest) => {
      const response = await _telegramLogin(client, data, response =>
        setSession({
          user: response.user,
          token: response.token,
          expiresAt: response.expiresAt,
          authMethod: 'telegram',
        }),
      );
      return response;
    },
    [client, setSession],
  );

  const linkTelegram = useCallback(
    async (data: LinkTelegramRequest) => {
      if (!session) {
        throw new Error('No session found');
      }
      const response = await _linkTelegram(client, data);
      refreshCurrentUser();
      return response;
    },
    [client],
  );

  const unlinkTelegram = useCallback(async () => {
    if (!session) {
      throw new Error('No session found');
    }
    const response = await _unlinkTelegram(client);
    if (session && session.authMethod === 'telegram') {
      console.log('Logging out');
      clearSession();
    } else {
      setSession({ ...session, user: response.user });
    }
    return response;
  }, [client]);

  return {
    linkTelegram,
    unlinkTelegram,
    loginWithTelegram,
  };
}

function WalletConnectionFallback() {
  return (
    <div className='w-full h-full flex items-center justify-center'>
      <Loader2 className='w-4 h-4 animate-spin' />
    </div>
  );
}

export const withWalletAuth = <
  T extends {
    isConnected?: boolean;
    walletAddress?: string;
    publicKey?: string;
    connectWallet?: () => Promise<[string, string]>;
  },
>(
  Component: React.ComponentType<T>,
  Fallback?: React.ComponentType<T>,
) => {
  return (
    props: Omit<
      T,
      'isConnected' | 'walletAddress' | 'publicKey' | 'connectWallet'
    >,
  ) => {
    const { isConnected, data, connect } = useWallet();

    // Pass wallet data and connect handler as props to the wrapped component
    const walletProps = {
      ...props,
      isConnected,
      walletAddress: data?.address,
      publicKey: data?.publicKey,
      connectWallet: connect,
    } as T;

    // If wallet is not connected, show fallback
    if ((!isConnected || !data) && Fallback) {
      return <Fallback {...walletProps} />;
    }

    return <Component {...walletProps} />;
  };
};

export default useAuth;

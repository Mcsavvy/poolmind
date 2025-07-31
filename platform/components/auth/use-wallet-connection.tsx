'use client';

import { useState, useEffect } from 'react';
import { isConnected, getLocalStorage, disconnect } from '@stacks/connect';

interface WalletConnectionState {
  isConnected: boolean;
  stxAddress: string | null;
  btcAddress: string | null;
  loading: boolean;
}

export function useWalletConnection() {
  const [state, setState] = useState<WalletConnectionState>({
    isConnected: false,
    stxAddress: null,
    btcAddress: null,
    loading: true
  });

  useEffect(() => {
    const checkConnection = () => {
      const connected = isConnected();
      
      if (connected) {
        const userData = getLocalStorage();
        setState({
          isConnected: true,
          stxAddress: userData?.addresses?.stx?.[0]?.address || null,
          btcAddress: userData?.addresses?.btc?.[0]?.address || null,
          loading: false
        });
      } else {
        setState({
          isConnected: false,
          stxAddress: null,
          btcAddress: null,
          loading: false
        });
      }
    };

    checkConnection();

    // Listen for storage changes to detect wallet connection/disconnection
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
    setState({
      isConnected: false,
      stxAddress: null,
      btcAddress: null,
      loading: false
    });
  };

  return {
    ...state,
    disconnect: disconnectWallet
  };
}
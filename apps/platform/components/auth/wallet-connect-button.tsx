'use client';

import { useState, useCallback } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { connect, isConnected, getLocalStorage, request, disconnect } from '@stacks/connect';
import { Button } from '@/components/ui/button';
import { Wallet, Loader2 } from 'lucide-react';
import { config } from '@/lib/config';
import { generateAuthMessage } from '@/lib/auth';
import { toast } from 'sonner';

interface WalletConnectButtonProps {
  className?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  children?: React.ReactNode;
}

export default function WalletConnectButton({ 
  className,
  variant = 'default',
  size = 'default',
  children
}: WalletConnectButtonProps) {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  const connectWallet = useCallback(async () => {
    setIsLoading(true);
    let connected = false;

    try {
      // Check if already connected
      if (isConnected()) {
        toast.error('Already authenticated');
        setIsLoading(false);
        return;
      }

      // Connect to wallet using the new API
      const response = await connect();
      connected = true;
      toast.success('Connected to wallet');

      // Get stored addresses from local storage
      const userData = getLocalStorage();
      if (!userData?.addresses) {
        throw new Error('No wallet addresses found');
      }

      const stxAddress = userData.addresses.stx[0].address;
      
      // Get detailed account information including public keys
      const accounts = await request('getAddresses');
      const account = accounts.addresses.find(address => address.address === stxAddress);

      if (!account) {
        throw new Error('Could not find wallet address');
      }

      if (!account.publicKey) {
        throw new Error('Could not retrieve public key from wallet');
      }

      // Get authentication message from server
      const message = await generateAuthMessage(stxAddress);

      // Sign the message with the user's wallet
      const signatureResponse = await request('stx_signMessage', {
        message
      });

      // Authenticate with NextAuth
      const result = await signIn('stacks-wallet', {
        walletAddress: stxAddress,
        publicKey: account.publicKey,
        signature: signatureResponse.signature,
        message: message,
        walletType: 'stacks-wallet',
        network: config.stacksNetwork,
        redirect: false
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      // Redirect to dashboard or refresh page
      window.location.href = '/dashboard';
    } catch (error) {
      toast.error('Wallet connection error: ' + (error as Error).message);
      if (connected) {
        disconnect();
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Don't show button if already authenticated
  if (status === 'authenticated') {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        onClick={connectWallet}
        disabled={isLoading || status === 'loading'}
        variant={variant}
        size={size}
        className={className}
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Wallet className="mr-2 h-4 w-4" />
        )}
        {children || 'Connect Wallet'}
      </Button>
    </div>
  );
}
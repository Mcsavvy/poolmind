'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Wallet, Loader2 } from 'lucide-react';
import { config } from '@/lib/config';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/hooks/auth';
import { request } from '@stacks/connect';

interface WalletConnectButtonProps {
  className?: string;
  variant?:
    | 'default'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link'
    | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  children?: React.ReactNode;
}

export default function WalletConnectButton({
  className,
  variant = 'default',
  size = 'default',
  children,
}: WalletConnectButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { loginWithWallet, generateAuthMessage, connect } = useWallet();

  const connectWallet = useCallback(async () => {
    setIsLoading(true);

    try {
      const [stxAddress, publicKey] = await connect();

      // Get authentication message from server
      const message = await generateAuthMessage(stxAddress);

      // Sign the message with the user's wallet
      const signatureResponse = await request('stx_signMessage', {
        message,
      });

      // Authenticate directly with orchestrator and store session locally
      await loginWithWallet({
        walletAddress: stxAddress,
        publicKey: publicKey,
        signature: signatureResponse.signature,
        message,
        walletType: 'stacks-wallet',
        network: config.stacksNetwork as 'mainnet' | 'testnet',
      });

      // Redirect to dashboard or refresh page
      router.push('/dashboard');
    } catch (error) {
      toast.error('Wallet connection error: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [loginWithWallet, generateAuthMessage, connect, router]);

  // Button always shown; guard can be handled by caller if needed

  return (
    <div className='flex flex-col items-center gap-2'>
      <Button
        onClick={connectWallet}
        disabled={isLoading}
        variant={variant}
        size={size}
        className={className}
      >
        {isLoading ? (
          <Loader2 className='mr-2 h-4 w-4 animate-spin' />
        ) : (
          <Wallet className='mr-2 h-4 w-4' />
        )}
        {children || 'Connect Wallet'}
      </Button>
    </div>
  );
}

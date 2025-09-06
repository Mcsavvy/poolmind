'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Minus } from 'lucide-react';
import { withWalletAuth } from '@/hooks/auth';
import DepositModal from '@/components/modals/deposit-modal';
import WithdrawalModal from '@/components/modals/withdrawal-modal';

interface WalletConnectedDepositButtonProps {
  isConnected?: boolean;
  walletAddress?: string;
  publicKey?: string;
  connectWallet?: () => Promise<[string, string]>;
  variant?:
    | 'default'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link'
    | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

const DepositButton = ({
  isConnected,
  walletAddress,
  connectWallet,
  variant = 'default',
  size = 'default',
  className = '',
}: WalletConnectedDepositButtonProps) => {
  const [showDepositModal, setShowDepositModal] = useState(false);

  const handleClick = async () => {
    if (!isConnected && connectWallet) {
      try {
        await connectWallet();
      } catch (error) {
        console.error('Failed to connect wallet:', error);
        return;
      }
    } else {
      setShowDepositModal(true);
    }
    setShowDepositModal(true);
  };

  return (
    <>
      <Button
        onClick={handleClick}
        variant={variant}
        size={size}
        className={`flex items-center space-x-2 ${className}`}
      >
        <Plus className='h-4 w-4' />
        <span>Contribute</span>
      </Button>

      <DepositModal
        open={showDepositModal}
        onOpenChange={setShowDepositModal}
      />
    </>
  );
};

interface WalletConnectedWithdrawalButtonProps {
  isConnected?: boolean;
  walletAddress?: string;
  publicKey?: string;
  connectWallet?: () => Promise<[string, string]>;
  variant?:
    | 'default'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link'
    | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

const WithdrawalButton = ({
  isConnected,
  walletAddress,
  connectWallet,
  variant = 'outline',
  size = 'default',
  className = '',
}: WalletConnectedWithdrawalButtonProps) => {
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);

  const handleClick = async () => {
    if (!isConnected && connectWallet) {
      try {
        await connectWallet();
      } catch (error) {
        console.error('Failed to connect wallet:', error);
        return;
      }
    } else {
      setShowWithdrawalModal(true);
    }
  };

  return (
    <>
      <Button
        onClick={handleClick}
        variant={variant}
        size={size}
        className={`flex items-center space-x-2 ${className}`}
      >
        <Minus className='h-4 w-4' />
        <span>Burn & Withdraw</span>
      </Button>

      <WithdrawalModal
        open={showWithdrawalModal}
        onOpenChange={setShowWithdrawalModal}
      />
    </>
  );
};

// Create wallet-connected versions
export const WalletConnectedDepositButton = withWalletAuth(DepositButton);
export const WalletConnectedWithdrawalButton = withWalletAuth(WithdrawalButton);

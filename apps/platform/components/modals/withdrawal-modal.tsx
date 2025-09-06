'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Calculator, Loader2 } from 'lucide-react';
import { useAuthSession } from '@/components/auth/session-provider';
import { usePoolInfo, useUserBalance } from '@/hooks/pool';
import {
  useCreateWithdrawal,
  useTransactionTracker,
} from '@/hooks/transactions';
import { withdrawFromPool } from '@/lib/stacks';
import {
  formatSTX,
  formatPLMD,
  calculateWithdrawalAmount,
} from '@/lib/formatters';
import { STXIcon, PLMDIcon } from '@/components/ui/token-icon';
import { toast } from 'sonner';

interface WithdrawalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function WithdrawalModal({
  open,
  onOpenChange,
}: WithdrawalModalProps) {
  const { session } = useAuthSession();
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trackingTransactionId, setTrackingTransactionId] = useState<
    string | null
  >(null);

  const { data: poolInfo, isLoading: isLoadingPool } = usePoolInfo();
  const { data: userBalance, isLoading: isLoadingBalance } = useUserBalance();
  const createWithdrawal = useCreateWithdrawal();
  const { transaction, isCompleted, stopTracking } = useTransactionTracker(
    trackingTransactionId,
  );

  // Handle transaction completion
  useEffect(() => {
    if (isCompleted && transaction) {
      if (transaction.status === 'confirmed') {
        toast.success('Withdrawal confirmed!', {
          description: `Your withdrawal has been successfully processed on the blockchain.`,
        });
      } else if (transaction.status === 'failed') {
        toast.error('Withdrawal failed', {
          description: `Your withdrawal transaction failed. Please try again.`,
        });
      }

      // Stop tracking after showing notification
      stopTracking();
      setTrackingTransactionId(null);
    }
  }, [isCompleted, transaction, stopTracking]);

  // User's available PLMD balance in regular units (not micro)
  const availablePLMD = useMemo(() => {
    if (!userBalance) return 0;
    return Number(userBalance.plmdBalance) / 1_000_000;
  }, [userBalance]);

  // Calculate withdrawal preview
  const withdrawalPreview = useMemo(() => {
    if (!amount || !poolInfo || isNaN(Number(amount))) {
      return null;
    }

    const plmdAmount = Number(amount);
    const nav = Number(poolInfo.nav);
    const exitFeeRate = Number(poolInfo.exitFeeRate);

    return calculateWithdrawalAmount(plmdAmount, nav, exitFeeRate);
  }, [amount, poolInfo]);

  const handleWithdrawal = async () => {
    if (!amount || !session?.user || !withdrawalPreview) return;

    setIsSubmitting(true);

    try {
      // Convert PLMD to microPLMD
      const microPLMDAmount = (Number(amount) * 1_000_000).toString();

      // Step 1: Submit transaction to blockchain FIRST
      const stacksResult = await withdrawFromPool(microPLMDAmount);

      // Step 2: Only create backend record AFTER getting blockchain txid
      const withdrawalResult = await createWithdrawal.mutateAsync({
        amount: (withdrawalPreview.netAmount * 1_000_000).toString(), // Net STX amount in microSTX
        destinationAddress: session.user.walletAddress,
        poolSharesBurned: microPLMDAmount,
        txId: stacksResult.txid, // Include the actual blockchain transaction ID
        network: 'testnet', // This should come from config
        notes: `Withdrawal of ${amount} PLMD tokens`,
      });

      if (!withdrawalResult.success || !withdrawalResult.data?.transaction) {
        throw new Error(
          withdrawalResult.message || 'Failed to create withdrawal record',
        );
      }

      const transactionId = withdrawalResult.data.transaction.id;

      // Step 3: Start tracking the transaction
      setTrackingTransactionId(transactionId);

      toast.success('Withdrawal transaction submitted successfully!', {
        description: `Transaction ID: ${stacksResult.txid.slice(0, 8)}... | Monitoring blockchain confirmation`,
      });

      // Close modal and reset form
      onOpenChange(false);
      setAmount('');
    } catch (error) {
      console.error('Withdrawal error:', error);
      toast.error('Failed to submit withdrawal', {
        description:
          error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const setMaxAmount = () => {
    setAmount(availablePLMD.toFixed(6));
  };

  const resetForm = () => {
    setAmount('');
  };

  return (
    <Dialog
      open={open}
      onOpenChange={newOpen => {
        onOpenChange(newOpen);
        if (!newOpen) resetForm();
      }}
    >
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <PLMDIcon size={20} />
            Withdraw from Pool
          </DialogTitle>
          <DialogDescription>
            Burn your PLMD tokens to withdraw STX from the arbitrage pool.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-6'>
          {/* Amount Input */}
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <label
                htmlFor='amount'
                className='text-sm font-medium flex items-center gap-2'
              >
                <PLMDIcon size={16} />
                PLMD Amount to Withdraw
              </label>
              {!isLoadingBalance && (
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-auto p-0 text-xs'
                  onClick={setMaxAmount}
                >
                  Max: {formatPLMD(userBalance?.plmdBalance || '0')}
                </Button>
              )}
            </div>
            <Input
              id='amount'
              type='number'
              placeholder='0.000000'
              value={amount}
              onChange={e => setAmount(e.target.value)}
              min='0'
              max={availablePLMD}
              step='0.000001'
              className='text-lg'
            />
            <p className='text-xs text-muted-foreground flex items-center gap-1'>
              <PLMDIcon size={12} />
              Available: {formatPLMD(userBalance?.plmdBalance || '0')} PLMD
            </p>
          </div>

          {/* Pool Information */}
          {isLoadingPool ? (
            <Card>
              <CardContent className='flex items-center justify-center p-6'>
                <Loader2 className='h-6 w-6 animate-spin' />
                <span className='ml-2'>Loading pool information...</span>
              </CardContent>
            </Card>
          ) : poolInfo ? (
            <Card>
              <CardHeader className='pb-3'>
                <CardTitle className='text-sm'>Pool Information</CardTitle>
              </CardHeader>
              <CardContent className='space-y-3'>
                <div className='flex justify-between text-sm'>
                  <span className='text-muted-foreground'>Current NAV</span>
                  <span className='font-medium'>
                    {Number(poolInfo.nav).toFixed(6)} STX per PLMD
                  </span>
                </div>
                <div className='flex justify-between text-sm'>
                  <span className='text-muted-foreground'>Exit Fee</span>
                  <span className='font-medium'>{poolInfo.exitFeeRate}%</span>
                </div>
                <div className='flex justify-between text-sm'>
                  <span className='text-muted-foreground'>
                    Your Pool Share Value
                  </span>
                  <span className='font-medium'>
                    {formatSTX(userBalance?.poolShareValue || '0')} STX
                  </span>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Withdrawal Preview */}
          {withdrawalPreview && (
            <Card>
              <CardHeader className='pb-3'>
                <CardTitle className='text-sm flex items-center gap-2'>
                  <Calculator className='h-4 w-4' />
                  Withdrawal Preview
                </CardTitle>
                <CardDescription>
                  What you'll receive for withdrawing {amount} PLMD
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-3'>
                <div className='flex justify-between text-sm'>
                  <span className='text-muted-foreground'>Gross STX Value</span>
                  <span>{withdrawalPreview.grossAmountFormatted} STX</span>
                </div>
                <div className='flex justify-between text-sm'>
                  <span className='text-muted-foreground'>
                    Exit Fee ({poolInfo?.exitFeeRate}%)
                  </span>
                  <span className='text-red-600'>
                    -{withdrawalPreview.feeFormatted} STX
                  </span>
                </div>
                <Separator />
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>
                    STX You'll Receive
                  </span>
                  <span className='font-bold text-green-600'>
                    {withdrawalPreview.netAmountFormatted} STX
                  </span>
                </div>
                <div className='flex justify-between text-sm'>
                  <span className='text-muted-foreground'>
                    PLMD Tokens Burned
                  </span>
                  <span className='text-red-600'>-{amount} PLMD</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Validation Messages */}
          {amount && Number(amount) > availablePLMD && (
            <Card className='border-red-200 bg-red-50'>
              <CardContent className='p-2'>
                <div className='text-xs text-red-800'>
                  <p className='font-medium'>
                    <AlertTriangle className='h-4 w-4 text-red-600 mt-0.5 inline-block mr-1 mb-1' />
                    Insufficient Balance
                  </p>
                  <p>
                    You only have {formatPLMD(userBalance?.plmdBalance || '0')}{' '}
                    PLMD tokens available.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Warning */}
          <Card className='border-yellow-200 bg-yellow-50 p-2'>
            <CardContent className='p-2'>
              <div className='text-xs text-yellow-800'>
                <p className='font-medium'>
                  <AlertTriangle className='h-4 w-4 text-yellow-600 mt-0.5 inline-block mr-1 mb-1' />
                  Important Notice:
                </p>
                <p>
                  Withdrawals are irreversible. The STX amount you receive
                  depends on the current NAV and may be less than your original
                  deposit if the pool has losses.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className='gap-2'>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleWithdrawal}
            disabled={
              !amount ||
              Number(amount) <= 0 ||
              Number(amount) > availablePLMD ||
              isSubmitting ||
              !poolInfo ||
              !session?.user
            }
            className='min-w-[120px]'
            variant='destructive'
          >
            {isSubmitting ? (
              <>
                <Loader2 className='h-4 w-4 animate-spin mr-2' />
                Withdrawing...
              </>
            ) : (
              'Withdraw STX'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

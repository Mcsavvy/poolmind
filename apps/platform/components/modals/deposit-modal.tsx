'use client';

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Calculator, Loader2 } from 'lucide-react';
import { useAuthSession } from '@/components/auth/session-provider';
import { usePoolInfo } from '@/hooks/pool';
import { useCreateDeposit, useTransactionTracker } from '@/hooks/transactions';
import { depositToPool } from '@/lib/stacks';
import { formatSTX, formatPLMD, calculateDepositShares } from '@/lib/formatters';
import { STXIcon, PLMDIcon } from '@/components/ui/token-icon';
import { toast } from 'sonner';

interface DepositModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DepositModal({ open, onOpenChange }: DepositModalProps) {
  const { session } = useAuthSession();
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trackingTransactionId, setTrackingTransactionId] = useState<string | null>(null);
  
  const { data: poolInfo, isLoading: isLoadingPool } = usePoolInfo();
  const createDeposit = useCreateDeposit();
  const { transaction, isCompleted, stopTracking } = useTransactionTracker(trackingTransactionId);

  // Handle transaction completion
  useEffect(() => {
    if (isCompleted && transaction) {
      if (transaction.status === 'confirmed') {
        toast.success('Deposit confirmed!', {
          description: `Your deposit has been successfully processed on the blockchain.`,
        });
      } else if (transaction.status === 'failed') {
        toast.error('Deposit failed', {
          description: `Your deposit transaction failed. Please try again.`,
        });
      }
      
      // Stop tracking after showing notification
      stopTracking();
      setTrackingTransactionId(null);
    }
  }, [isCompleted, transaction, stopTracking]);

  // Calculate deposit preview
  const depositPreview = useMemo(() => {
    if (!amount || !poolInfo || isNaN(Number(amount))) {
      return null;
    }

    const stxAmount = Number(amount);
    const nav = Number(poolInfo.nav);
    const entryFeeRate = Number(poolInfo.entryFeeRate);

    return calculateDepositShares(stxAmount, nav, entryFeeRate);
  }, [amount, poolInfo]);

  const handleDeposit = async () => {
    if (!amount || !session?.user || !depositPreview) return;

    setIsSubmitting(true);

    try {
      // Convert STX to microSTX
      const microSTXAmount = (Number(amount) * 1_000_000).toString();

      // Step 1: Submit transaction to blockchain FIRST
      const stacksResult = await depositToPool(microSTXAmount);

      // Step 2: Only create backend record AFTER getting blockchain txid
      const depositResult = await createDeposit.mutateAsync({
        amount: microSTXAmount,
        sourceAddress: session.user.walletAddress,
        txId: stacksResult.txid, // Include the actual blockchain transaction ID
        network: 'testnet', // This should come from config
        notes: `Deposit of ${amount} STX`,
      });

      console.log('depositResult', JSON.stringify(depositResult, null, 2) );

      if (!depositResult.success || !depositResult.data?.transaction) {
        throw new Error(depositResult.message || 'Failed to create deposit record');
      }

      const transactionId = depositResult.data.transaction.id;

      // Step 3: Start tracking the transaction
      setTrackingTransactionId(transactionId);

      toast.success('Deposit transaction submitted successfully!', {
        description: `Transaction ID: ${stacksResult.txid.slice(0, 8)}... | Monitoring blockchain confirmation`,
      });

      // Close modal and reset form
      onOpenChange(false);
      setAmount('');
      
    } catch (error) {
      console.error('Deposit error:', error);
      toast.error('Failed to submit deposit', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setAmount('');
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      onOpenChange(newOpen);
      if (!newOpen) resetForm();
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <STXIcon size={20} />
            Contribute STX to Pool
          </DialogTitle>
          <DialogDescription>
            Contribute STX to the arbitrage pool and receive PLMD tokens representing your share.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Amount Input */}
          <div className="space-y-2">
            <label htmlFor="amount" className="text-sm font-medium flex items-center gap-2">
              <STXIcon size={16} />
              Amount to Contribute (STX)
            </label>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.000001"
              className="text-lg"
            />
            <p className="text-xs text-muted-foreground">
              Minimum deposit: 1 STX
            </p>
          </div>

          {/* Pool Information */}
          {isLoadingPool ? (
            <Card>
              <CardContent className="flex items-center justify-center p-6">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading pool information...</span>
              </CardContent>
            </Card>
          ) : poolInfo ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Pool Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Current NAV</span>
                  <span className="font-medium">{Number(poolInfo.nav).toFixed(6)} STX per PLMD</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Entry Fee</span>
                  <span className="font-medium">{poolInfo.entryFeeRate}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Pool Value</span>
                  <span className="font-medium">{formatSTX(poolInfo.totalPoolValue)} STX</span>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Deposit Preview */}
          {depositPreview && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Deposit Preview
                </CardTitle>
                <CardDescription>
                  What you'll receive for depositing {amount} STX
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Gross Amount</span>
                  <span>{amount} STX</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Entry Fee ({poolInfo?.entryFeeRate}%)</span>
                  <span className="text-red-600">-{depositPreview.feeFormatted} STX</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Net Deposit</span>
                  <span className="font-medium">{depositPreview.netAmountFormatted} STX</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">PLMD Tokens Received</span>
                  <span className="font-bold text-green-600">
                    {depositPreview.sharesFormatted} PLMD
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Warning */}
          <Card className="border-yellow-200 bg-yellow-50 p-2">
            <CardContent className="p-2">
              <div className="text-xs text-yellow-800">
                <p className="font-medium">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 inline-block mr-1 mb-1" />
                  Important Notice:
                </p>
                <p>
                  By depositing, you agree to the pool's terms. Your funds will be used for arbitrage trading,
                  which involves risk. The value of your PLMD tokens will fluctuate based on trading performance.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeposit}
            disabled={
              !amount ||
              Number(amount) < 1 ||
              isSubmitting ||
              !poolInfo ||
              !session?.user
            }
            className="min-w-[120px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Depositing...
              </>
            ) : (
              'Deposit STX'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

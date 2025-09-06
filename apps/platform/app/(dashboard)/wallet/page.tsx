'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Wallet, Plus, Minus, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { usePoolInfo, useUserBalance, useUserStats } from '@/hooks/pool';
import { formatSTX, formatPLMD, formatPercentage, formatCurrency } from '@/lib/formatters';
import { TokenAmount, STXIcon, PLMDIcon } from '@/components/ui/token-icon';
import { WalletConnectedDepositButton, WalletConnectedWithdrawalButton } from '@/components/ui/wallet-connected-buttons';

export default function WalletPage() {

  const { data: poolInfo, isLoading: isLoadingPool } = usePoolInfo();
  const { data: userBalance, isLoading: isLoadingBalance } = useUserBalance();
  const { data: userStats, isLoading: isLoadingStats } = useUserStats();

  // Mock USD prices for now - in production would come from price feed
  const stxPrice = 1.5; // $1.50 per STX

  const stxBalanceUSD = userBalance ? (Number(userBalance.stxBalance) / 1_000_000) * stxPrice : 0;
  const poolShareUSD = userBalance ? (Number(userBalance.poolShareValue) / 1_000_000) * stxPrice : 0;

  // Calculate P&L percentage if we have stats
  const pnlPercentage = userStats && Number(userStats.totalDeposited) > 0
    ? (Number(userStats.unrealizedPnL) / Number(userStats.totalDeposited))
    : 0;

  const pnlFormatted = formatPercentage(pnlPercentage);

  return (
    <>
      <div className="flex flex-col space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wallet className="h-8 w-8" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Wallet</h1>
              <p className="text-muted-foreground">
                Manage your STX balance and pool investments
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <WalletConnectedDepositButton />
            <WalletConnectedWithdrawalButton />
          </div>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <STXIcon size={20} />
                  STX Balance
                </div>
                <Badge variant="secondary" className="text-xs">Wallet</Badge>
              </CardTitle>
              <CardDescription>Your available STX balance</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingBalance ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ) : (
                <>
                  <div className="text-3xl font-bold">
                    {formatSTX(userBalance?.stxBalance || '0')} STX
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    ≈ {formatCurrency(stxBalanceUSD)}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PLMDIcon size={20} />
                  Pool Balance
                </div>
                <Badge variant="default" className="text-xs">PLMD</Badge>
              </CardTitle>
              <CardDescription>Your PLMD tokens in the pool</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingBalance ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ) : (
                <>
                  <div className="text-3xl font-bold">
                    {formatPLMD(userBalance?.plmdBalance || '0')} PLMD
                  </div>
                  <div className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                    <STXIcon size={14} />
                    ≈ {formatSTX(userBalance?.poolShareValue || '0')} STX
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Pool Value
                <Badge variant="outline" className="text-xs">USD</Badge>
              </CardTitle>
              <CardDescription>USD value of your pool share</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingBalance ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ) : (
                <>
                  <div className="text-3xl font-bold">
                    {formatCurrency(poolShareUSD)}
                  </div>
                  {!isLoadingStats && userStats && (
                    <p className={`text-sm mt-2 flex items-center gap-1 ${pnlFormatted.colorClass}`}>
                      {pnlFormatted.isPositive ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {pnlFormatted.formatted} P&L
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pool Information */}
        <Card>
          <CardHeader>
            <CardTitle>Pool Information</CardTitle>
            <CardDescription>Current pool metrics and your position</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingPool ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                ))}
              </div>
            ) : poolInfo ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Current NAV</p>
                  <p className="text-lg font-semibold">
                    {Number(poolInfo.nav).toFixed(6)} STX/PLMD
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Pool Value</p>
                  <p className="text-lg font-semibold">
                    {formatSTX(poolInfo.totalPoolValue)} STX
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Entry Fee</p>
                  <p className="text-lg font-semibold">{poolInfo.entryFeeRate}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Exit Fee</p>
                  <p className="text-lg font-semibold">{poolInfo.exitFeeRate}%</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center p-8">
                <p className="text-muted-foreground">Failed to load pool information</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance Stats */}
        {!isLoadingStats && userStats && Number(userStats.totalDeposited) > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Your Performance</CardTitle>
              <CardDescription>Overview of your pool investment performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Deposited</p>
                  <p className="text-lg font-semibold">
                    {formatSTX(userStats.totalDeposited)} STX
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Withdrawn</p>
                  <p className="text-lg font-semibold">
                    {formatSTX(userStats.totalWithdrawn)} STX
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Value</p>
                  <p className="text-lg font-semibold">
                    {formatSTX(userStats.currentValue)} STX
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Unrealized P&L</p>
                  <p className={`text-lg font-semibold ${pnlFormatted.colorClass}`}>
                    {formatSTX(userStats.unrealizedPnL)} STX
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

    </>
  );
}

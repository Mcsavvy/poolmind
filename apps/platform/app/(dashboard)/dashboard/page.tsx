'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  BarChart3, 
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import { useAuthSession } from '@/components/auth/session-provider';
import { usePoolInfo, useUserBalance, useUserStats } from '@/hooks/pool';
import { useTransactions } from '@/hooks/transactions';
import { formatSTX, formatPLMD, formatCurrency, formatPercentage } from '@/lib/formatters';
import { WalletConnectedDepositButton, WalletConnectedWithdrawalButton } from '@/components/ui/wallet-connected-buttons';
import { STXIcon, PLMDIcon } from '@/components/ui/token-icon';
import { TransactionList } from '@/components/ui/transaction-item';
import Link from 'next/link';

export default function DashboardPage() {
  const { session } = useAuthSession();
  const user = session?.user;
  

  const { data: poolInfo, isLoading: isLoadingPool } = usePoolInfo();
  const { data: userBalance, isLoading: isLoadingBalance } = useUserBalance();
  const { data: userStats, isLoading: isLoadingStats } = useUserStats();
  const { data: recentTransactions, isLoading: isLoadingTransactions } = useTransactions({ 
    limit: 5,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  // Mock USD price for now
  const stxPrice = 1.5; // $1.50 per STX
  
  const stxBalanceUSD = userBalance ? (Number(userBalance.stxBalance) / 1_000_000) * stxPrice : 0;
  const poolShareUSD = userBalance ? (Number(userBalance.poolShareValue) / 1_000_000) * stxPrice : 0;
  
  // Calculate P&L percentage
  const pnlPercentage = userStats && Number(userStats.totalDeposited) > 0
    ? (Number(userStats.unrealizedPnL) / Number(userStats.totalDeposited))
    : 0;
  
  const pnlFormatted = formatPercentage(pnlPercentage);

  return (
    <>
      <div className="flex flex-col space-y-8">
        {/* Welcome Header */}
        <div className="flex items-center justify-between">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {user?.displayName || user?.username || 'User'}!
          </h1>
          <p className="text-muted-foreground">
              Here&apos;s an overview of your PoolMind account and investment performance
            </p>
          </div>
          <div className="flex space-x-2">
            <WalletConnectedDepositButton />
            <WalletConnectedWithdrawalButton />
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <STXIcon size={16} />
                STX Balance
              </CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingBalance ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {formatSTX(userBalance?.stxBalance || '0')}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ≈ {formatCurrency(stxBalanceUSD)}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <PLMDIcon size={16} />
                Pool Value
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingBalance ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {formatCurrency(poolShareUSD)}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <PLMDIcon size={12} />
                    {formatPLMD(userBalance?.plmdBalance || '0')} PLMD
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current NAV</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingPool ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {Number(poolInfo?.nav || '1').toFixed(6)}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <STXIcon size={12} />
                    STX per
                    <PLMDIcon size={12} />
                    PLMD token
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">P&L</CardTitle>
              {pnlFormatted.isPositive ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className={`text-2xl font-bold ${pnlFormatted.colorClass}`}>
                    {pnlFormatted.formatted}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <STXIcon size={12} />
                    {formatSTX(userStats?.unrealizedPnL || '0')} STX
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pool Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Pool Overview
              </CardTitle>
              <CardDescription>
                Key metrics for the arbitrage pool
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPool ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              ) : poolInfo ? (
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Pool Value</span>
                    <span className="font-medium flex items-center gap-1">
                      <STXIcon size={14} />
                      {formatSTX(poolInfo.totalPoolValue)} STX
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total PLMD Issued</span>
                    <span className="font-medium flex items-center gap-1">
                      <PLMDIcon size={14} />
                      {formatPLMD(poolInfo.totalShares)}
                    </span>
                </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Entry Fee</span>
                    <span className="font-medium">{poolInfo.entryFeeRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Exit Fee</span>
                    <span className="font-medium">{poolInfo.exitFeeRate}%</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Failed to load pool data</p>
                )}
            </CardContent>
          </Card>

          {/* Your Position */}
            <Card>
              <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Your Position
              </CardTitle>
                <CardDescription>
                Summary of your investment position
                </CardDescription>
              </CardHeader>
              <CardContent>
              {isLoadingStats || isLoadingBalance ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex justify-between">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Deposited</span>
                    <span className="font-medium flex items-center gap-1">
                      <STXIcon size={14} />
                      {formatSTX(userStats?.totalDeposited || '0')} STX
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Current Value</span>
                    <span className="font-medium flex items-center gap-1">
                      <STXIcon size={14} />
                      {formatSTX(userStats?.currentValue || '0')} STX
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">PLMD Holdings</span>
                    <span className="font-medium flex items-center gap-1">
                      <PLMDIcon size={14} />
                      {formatPLMD(userBalance?.plmdBalance || '0')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Pool Share %</span>
                    <span className="font-medium">
                      {poolInfo && userBalance 
                        ? ((Number(userBalance.plmdBalance) / Number(poolInfo.totalShares)) * 100).toFixed(4)
                        : '0.0000'
                      }%
                    </span>
                  </div>
                </div>
              )}
              </CardContent>
            </Card>
        </div>

        {/* Recent Transactions */}
            <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Transactions
              </CardTitle>
                <CardDescription>
                Your latest deposits and withdrawals
                </CardDescription>
            </div>
            <Link href="/transactions">
              <Button variant="outline" size="sm">
                View All
                <ArrowUpRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
              </CardHeader>
              <CardContent>
            {isLoadingTransactions ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : recentTransactions?.data?.transactions?.length ? (
              <TransactionList 
                transactions={recentTransactions.data.transactions.slice(0, 5)}
                emptyMessage="No recent transactions"
                showExplorerLinks={true}
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Transactions Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start by contributing to the arbitrage pool to earn PLMD tokens.
                </p>
                <WalletConnectedDepositButton />
              </div>
            )}
              </CardContent>
            </Card>

        {/* Account Information */}
            <Card>
              <CardHeader>
            <CardTitle>Account Information</CardTitle>
                <CardDescription>
              Your profile and connection details
                </CardDescription>
              </CardHeader>
              <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Wallet Address</span>
                <span className="font-mono text-sm">
                  {user?.walletAddress ? 
                    `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}` : 
                    'Not connected'
                  }
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Email</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm">
                    {user?.email || 'Not provided'}
                  </span>
                  {user?.isEmailVerified && (
                    <Badge variant="secondary" className="text-xs">Verified</Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Role</span>
                <Badge variant="outline" className="text-xs">
                  {user?.role || 'User'}
                </Badge>
              </div>

              {user?.telegramAuth && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Telegram</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">
                      @{user.telegramAuth.username || user.telegramAuth.firstName}
                    </span>
                    <Badge variant="secondary" className="text-xs">Connected</Badge>
                  </div>
                </div>
              )}
            </div>
              </CardContent>
            </Card>
          </div>

    </>
  );
}
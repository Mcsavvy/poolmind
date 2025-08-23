'use client';

import { useQuery } from '@tanstack/react-query';
import { useClient } from './api';
import { useAuthSession } from '@/components/auth/session-provider';
import { contractService } from '@/lib/contract-service';
import { getCurrentUserAddress } from '@/lib/stacks';

// Pool and balance data types
export interface PoolInfo {
  nav: string;
  totalPoolValue: string;
  totalShares: string;
  entryFeeRate: string;
  exitFeeRate: string;
}

export interface UserBalance {
  stxBalance: string;
  plmdBalance: string;
  poolShareValue: string;
}

export interface UserStats {
  totalDeposited: string;
  totalWithdrawn: string;
  currentValue: string;
  unrealizedPnL: string;
  realizedPnL: string;
}

/**
 * Hook to fetch pool information
 */
export function usePoolInfo() {
  const { session } = useAuthSession();

  return useQuery({
    queryKey: ['pool-info'],
    queryFn: async (): Promise<PoolInfo> => {
      try {
        const [contractState, totalSupply] = await Promise.all([
          contractService.getContractState(),
          contractService.getTotalSupply(),
        ]);

        return {
          nav: (contractState.nav / 1000000).toFixed(6), // Convert from microSTX to STX
          totalPoolValue: contractState.stxBalance.toString(),
          totalShares: totalSupply.totalSupply.toString(),
          entryFeeRate: (contractState.entryFee / 10).toString(), // Convert from basis points to percentage
          exitFeeRate: (contractState.exitFee / 10).toString(), // Convert from basis points to percentage
        };
      } catch (error) {
        console.error('Error fetching pool info:', error);
        // Return fallback data if contract calls fail
        return {
          nav: '1.000000',
          totalPoolValue: '0',
          totalShares: '0',
          entryFeeRate: '0.5',
          exitFeeRate: '0.5',
        };
      }
    },
    enabled: !!session?.token,
    refetchInterval: 60000, // Refetch every minute
    retry: 2,
  });
}

/**
 * Hook to fetch user balance information
 */
export function useUserBalance() {
  const { session } = useAuthSession();

  return useQuery({
    queryKey: ['user-balance'],
    queryFn: async (): Promise<UserBalance> => {
      try {
        if (!session?.user?.walletAddress) {
          throw new Error('No wallet address found');
        }

        const userAddress = session.user.walletAddress;
        
        const [stxBalance, plmdBalance, nav] = await Promise.all([
          contractService.getStxBalance(userAddress),
          contractService.getBalance(userAddress),
          contractService.getNav(),
        ]);

        // Calculate pool share value (PLMD balance * NAV)
        const poolShareValue = Math.floor((plmdBalance.balance * nav.nav) / 1000000);

        return {
          stxBalance: stxBalance.toString(),
          plmdBalance: plmdBalance.balance.toString(),
          poolShareValue: poolShareValue.toString(),
        };
      } catch (error) {
        console.error('Error fetching user balance:', error);
        
        // Try to get wallet address from localStorage as fallback
        try {
          const userAddress = getCurrentUserAddress();
          const [stxBalance, plmdBalance] = await Promise.all([
            contractService.getStxBalance(userAddress),
            contractService.getBalance(userAddress),
          ]);

          return {
            stxBalance: stxBalance.toString(),
            plmdBalance: plmdBalance.balance.toString(),
            poolShareValue: '0',
          };
        } catch (fallbackError) {
          console.error('Fallback balance fetch also failed:', fallbackError);
          // Return zero balances if everything fails
          return {
            stxBalance: '0',
            plmdBalance: '0',
            poolShareValue: '0',
          };
        }
      }
    },
    enabled: !!session?.token,
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 1, // Retry once on failure
  });
}

/**
 * Hook to fetch user statistics - maps transaction stats to user stats format
 */
export function useUserStats() {
  const client = useClient();
  const { session } = useAuthSession();

  return useQuery({
    queryKey: ['user-stats'],
    queryFn: async (): Promise<UserStats> => {
      try {
        // Use the transaction stats endpoint and map to UserStats format
        const response = await client.get('/transactions/stats/summary');
        const stats = response.data.data;
        
        // Calculate derived values from transaction stats
        const totalDeposited = stats.totalDepositAmount || '0';
        const totalWithdrawn = stats.totalWithdrawalAmount || '0';
        
        // For now, set current value equal to total deposited - totalWithdrawn
        // In a real implementation, this would factor in gains/losses
        const currentValue = (parseFloat(totalDeposited) - parseFloat(totalWithdrawn)).toString();
        
        // Calculate unrealized P&L (this would come from actual pool performance)
        const unrealizedPnL = (parseFloat(currentValue) - parseFloat(totalDeposited)).toString();
        
        return {
          totalDeposited,
          totalWithdrawn,
          currentValue,
          unrealizedPnL,
          realizedPnL: '0', // This would be calculated from completed withdrawal gains
        };
      } catch (error) {
        // Return default values if API call fails
        return {
          totalDeposited: '0',
          totalWithdrawn: '0',
          currentValue: '0',
          unrealizedPnL: '0',
          realizedPnL: '0',
        };
      }
    },
    enabled: !!session?.token,
    refetchInterval: 60000, // Refetch every minute
  });
}

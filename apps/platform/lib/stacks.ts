import { request, getLocalStorage } from '@stacks/connect';
import { Cl } from '@stacks/transactions';
import config from './config';
import { contractService } from './contract-service';
import { STACKS_MAINNET, STACKS_TESTNET, STACKS_DEVNET } from '@stacks/network';

export interface DepositResult {
  txid: string;
  sharesMinted?: string;
}

export interface WithdrawResult {
  txid: string;
  stxReceived?: string;
}

// Configuration for the smart contract
const stacksConfig = {
  poolmindContractAddress: config.poolmindContractAddress,
  poolmindContractName: config.poolmindContractName,
  stacksNetwork: config.stacksNetwork as 'mainnet' | 'testnet' | 'devnet',
};

/**
 * Get the current user's STX address
 */
export const getCurrentUserAddress = (): string => {
  const userData = getLocalStorage();
  const address = userData?.addresses?.stx?.[0]?.address;
  if (!address) {
    throw new Error('No wallet address found. Please connect your wallet.');
  }
  return address;
};

/**
 * Deposit STX to the pool and receive PoolMind tokens
 */
export const depositToPool = async (
  amountStx: string,
): Promise<DepositResult> => {
  try {
    const userAddress = getCurrentUserAddress();

    // Check if contract is paused before proceeding
    const isPaused = await isContractPaused();
    if (isPaused) {
      throw new Error('Contract is currently paused. Please try again later.');
    }

    // Validate amount
    const amount = parseInt(amountStx);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Invalid deposit amount');
    }

    // Check user's STX balance
    const userStxBalance = await getUserSTXBalance(userAddress);
    if (parseInt(userStxBalance) < amount) {
      throw new Error('Insufficient STX balance for deposit');
    }

    // Create post conditions for safety
    const postConditions = [
      // STX post condition - user sends at least the specified amount
      {
        type: 'stx-postcondition' as const,
        address: userAddress,
        condition: 'gte' as const,
        amount: amountStx,
      },
    ];

    const response = await request('stx_callContract', {
      contract: `${stacksConfig.poolmindContractAddress}.${stacksConfig.poolmindContractName}`,
      functionName: 'deposit',
      functionArgs: [Cl.uint(amountStx)],
      network: stacksConfig.stacksNetwork,
      postConditions,
      postConditionMode: 'deny',
    });

    console.log('✓ Deposit transaction submitted:', response.txid);

    // Calculate expected shares for display purposes
    let expectedShares: string | undefined;
    try {
      const shares = await calculateDepositShares(amount);
      expectedShares = shares.toString();
    } catch (error) {
      console.warn('Failed to calculate expected shares:', error);
    }

    return {
      txid: response.txid ? `0x${response.txid}` : '',
      sharesMinted: expectedShares,
    };
  } catch (error) {
    console.error('Deposit failed:', error);

    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('insufficient')) {
        throw new Error('Insufficient STX balance for this deposit');
      } else if (error.message.includes('paused')) {
        throw new Error('Contract is currently paused');
      } else if (error.message.includes('cancelled')) {
        throw new Error('Transaction was cancelled');
      }
      throw error;
    }

    throw new Error('Failed to submit deposit transaction');
  }
};

/**
 * Withdraw STX from the pool by burning PoolMind tokens
 */
export const withdrawFromPool = async (
  amountShares: string,
): Promise<WithdrawResult> => {
  try {
    const userAddress = getCurrentUserAddress();

    // Check if contract is paused before proceeding
    const isPaused = await isContractPaused();
    if (isPaused) {
      throw new Error('Contract is currently paused. Please try again later.');
    }

    // Validate amount
    const shares = parseInt(amountShares);
    if (isNaN(shares) || shares <= 0) {
      throw new Error('Invalid withdrawal amount');
    }

    // Check user's PLMD token balance
    const userPlmdBalance = await getUserPLMDBalance(userAddress);
    if (parseInt(userPlmdBalance) < shares) {
      throw new Error('Insufficient PLMD token balance for withdrawal');
    }

    // Create post conditions for safety
    const postConditions = [
      // Fungible token post condition - user sends PLMD tokens
      {
        type: 'ft-postcondition' as const,
        address: userAddress,
        condition: 'gte' as const,
        amount: amountShares,
        asset:
          `${stacksConfig.poolmindContractAddress}.${stacksConfig.poolmindContractName}::PoolMind` as const,
      },
    ];

    const response = await request('stx_callContract', {
      contract: `${stacksConfig.poolmindContractAddress}.${stacksConfig.poolmindContractName}`,
      functionName: 'withdraw',
      functionArgs: [Cl.uint(amountShares)],
      network: stacksConfig.stacksNetwork,
      postConditions,
      postConditionMode: 'allow',
    });

    console.log('✓ Withdrawal transaction submitted:', response.txid);

    // Calculate expected STX amount for display purposes
    let expectedStx: string | undefined;
    try {
      const stxAmount = await calculateWithdrawalAmount(shares);
      expectedStx = stxAmount.toString();
    } catch (error) {
      console.warn('Failed to calculate expected STX amount:', error);
    }

    return {
      txid: response.txid ? `0x${response.txid}` : '',
      stxReceived: expectedStx,
    };
  } catch (error) {
    console.error('Withdraw failed:', error);

    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('insufficient')) {
        throw new Error('Insufficient PLMD token balance for this withdrawal');
      } else if (error.message.includes('paused')) {
        throw new Error('Contract is currently paused');
      } else if (error.message.includes('cancelled')) {
        throw new Error('Transaction was cancelled');
      }
      throw error;
    }

    throw new Error('Failed to submit withdrawal transaction');
  }
};

/**
 * Get current NAV from the smart contract
 */
export const getCurrentNAV = async (): Promise<string> => {
  try {
    const navResult = await contractService.getNav();
    return navResult.nav.toString();
  } catch (error) {
    console.error('Failed to get NAV:', error);
    throw new Error('Failed to get current NAV');
  }
};

/**
 * Get user's PLMD token balance
 */
export const getUserPLMDBalance = async (address: string): Promise<string> => {
  try {
    const balanceResult = await contractService.getBalance(address);
    return balanceResult.balance.toString();
  } catch (error) {
    console.error('Failed to get PLMD balance:', error);
    throw new Error('Failed to get PLMD balance');
  }
};

/**
 * Get user's STX balance from the blockchain
 */
export const getUserSTXBalance = async (address: string): Promise<string> => {
  try {
    const balance = await contractService.getStxBalance(address);
    return balance.toString();
  } catch (error) {
    console.error('Failed to get STX balance:', error);
    throw new Error('Failed to get STX balance');
  }
};

/**
 * Get complete contract state including NAV, fees, and pool balance
 */
export const getContractState = async () => {
  try {
    return await contractService.getContractState();
  } catch (error) {
    console.error('Failed to get contract state:', error);
    throw new Error('Failed to get contract state');
  }
};

/**
 * Get comprehensive token information
 */
export const getTokenInfo = async () => {
  try {
    return await contractService.getTokenInfo();
  } catch (error) {
    console.error('Failed to get token info:', error);
    throw new Error('Failed to get token info');
  }
};

/**
 * Calculate shares for deposit amount
 */
export const calculateDepositShares = async (
  stxAmount: number,
): Promise<number> => {
  try {
    return await contractService.calculateSharesForDeposit(stxAmount);
  } catch (error) {
    console.error('Failed to calculate deposit shares:', error);
    throw new Error('Failed to calculate deposit shares');
  }
};

/**
 * Calculate STX amount for withdrawal
 */
export const calculateWithdrawalAmount = async (
  sharesAmount: number,
): Promise<number> => {
  try {
    return await contractService.calculateStxForWithdraw(sharesAmount);
  } catch (error) {
    console.error('Failed to calculate withdrawal amount:', error);
    throw new Error('Failed to calculate withdrawal amount');
  }
};

/**
 * Check if contract is currently paused
 */
export const isContractPaused = async (): Promise<boolean> => {
  try {
    return await contractService.isPaused();
  } catch (error) {
    console.error('Failed to check if contract is paused:', error);
    return false; // Default to not paused on error
  }
};

/**
 * Wait for transaction confirmation on the blockchain
 */
export const waitForTransactionConfirmation = async (
  txId: string,
  maxWaitTime: number = 300000, // 5 minutes default
): Promise<{ success: boolean; data?: any; error?: string }> => {
  const startTime = Date.now();
  const pollInterval = 3000; // 3 seconds
  const networkUrl =
    contractService.getNetworkName() === 'mainnet'
      ? STACKS_MAINNET.client.baseUrl
      : contractService.getNetworkName() === 'testnet'
        ? STACKS_TESTNET.client.baseUrl
        : STACKS_DEVNET.client.baseUrl;

  while (Date.now() - startTime < maxWaitTime) {
    try {
      const response = await fetch(`${networkUrl}/extended/v1/tx/${txId}`);
      const txData = await response.json();

      if (txData.tx_status === 'success') {
        console.log('✅ Transaction confirmed:', txId);
        return { success: true, data: txData };
      } else if (
        txData.tx_status === 'abort_by_response' ||
        txData.tx_status === 'abort_by_post_condition'
      ) {
        console.log('❌ Transaction aborted:', txId, txData.tx_status);
        return {
          success: false,
          error: 'Transaction aborted',
          data: txData,
        };
      }

      // Log current status for debugging
      console.log(`⏳ Transaction ${txId} status: ${txData.tx_status}`);

      // Continue polling if transaction is still pending
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    } catch (error) {
      console.warn(`Polling error for ${txId}:`, error);
      // Continue polling on error (transaction might not be in mempool yet)
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }

  console.log('⏰ Transaction confirmation timeout:', txId);
  return {
    success: false,
    error: 'Transaction confirmation timeout',
  };
};

/**
 * Get transaction status from blockchain
 */
export const getTransactionStatus = async (
  txId: string,
): Promise<{
  status: 'pending' | 'success' | 'failed' | 'unknown';
  details?: any;
}> => {
  try {
    const networkUrl =
      contractService.getNetworkName() === 'mainnet'
        ? STACKS_MAINNET.client.baseUrl
        : contractService.getNetworkName() === 'testnet'
          ? STACKS_TESTNET.client.baseUrl
          : STACKS_DEVNET.client.baseUrl;

    const response = await fetch(`${networkUrl}/extended/v1/tx/${txId}`);
    const txData = await response.json();

    switch (txData.tx_status) {
      case 'success':
        return { status: 'success', details: txData };
      case 'abort_by_response':
      case 'abort_by_post_condition':
        return { status: 'failed', details: txData };
      case 'pending':
        return { status: 'pending', details: txData };
      default:
        return { status: 'unknown', details: txData };
    }
  } catch (error) {
    console.error('Failed to get transaction status:', error);
    return { status: 'unknown' };
  }
};

/**
 * Enhanced deposit with confirmation waiting
 */
export const depositToPoolWithConfirmation = async (
  amountStx: string,
  waitForConfirmation: boolean = false,
): Promise<DepositResult & { confirmed?: boolean }> => {
  const result = await depositToPool(amountStx);

  if (waitForConfirmation && result.txid) {
    console.log('⏳ Waiting for deposit confirmation...');
    const confirmation = await waitForTransactionConfirmation(result.txid);
    return {
      ...result,
      confirmed: confirmation.success,
    };
  }

  return result;
};

/**
 * Enhanced withdrawal with confirmation waiting
 */
export const withdrawFromPoolWithConfirmation = async (
  amountShares: string,
  waitForConfirmation: boolean = false,
): Promise<WithdrawResult & { confirmed?: boolean }> => {
  const result = await withdrawFromPool(amountShares);

  if (waitForConfirmation && result.txid) {
    console.log('⏳ Waiting for withdrawal confirmation...');
    const confirmation = await waitForTransactionConfirmation(result.txid);
    return {
      ...result,
      confirmed: confirmation.success,
    };
  }

  return result;
};

export { stacksConfig, contractService };

import {
  StacksNetwork,
  STACKS_MAINNET,
  STACKS_TESTNET,
  STACKS_DEVNET,
} from '@stacks/network';
import {
  fetchCallReadOnlyFunction,
  cvToValue,
  standardPrincipalCV,
  uintCV,
} from '@stacks/transactions';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/env.schema';

export interface ContractState {
  admin: string;
  paused: boolean;
  transferable: boolean;
  nav: number;
  entryFee: number;
  exitFee: number;
  stxBalance: number;
}

export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: number;
  tokenUri?: string;
}

export interface BalanceResult {
  balance: number;
}

export interface NavResult {
  nav: number;
}

export interface TotalSupplyResult {
  totalSupply: number;
}

export interface PoolStateSnapshot {
  nav: string;
  entryFeeRate: string;
  exitFeeRate: string;
  totalPoolValue: string;
  totalShares: string;
  stxBalance: string;
}

/**
 * Backend contract service for PoolMind smart contract interactions
 * Used by the NestJS orchestrator to read contract state
 */
@Injectable()
export class PoolMindContractService {
  private readonly logger = new Logger(PoolMindContractService.name);
  private network: StacksNetwork;
  private contractAddress: string;
  private contractName: string;

  constructor(private readonly configService: ConfigService<AppConfig>) {
    this.network = this.getNetwork();
    this.contractAddress = this.configService.get(
      'stacks.poolContractAddress',
    )!;
    this.contractName = this.configService.get('stacks.poolContractName')!;

    this.logger.log(
      `Initialized PoolMind contract service: ${this.contractAddress}.${this.contractName} on ${this.getNetworkName()}`,
    );
  }

  /**
   * Get the appropriate Stacks network instance based on configuration
   */
  private getNetwork(): StacksNetwork {
    const networkType = this.configService.get('stacks.network');

    switch (networkType) {
      case 'mainnet':
        return STACKS_MAINNET;
      case 'testnet':
        return STACKS_TESTNET;
      case 'devnet':
        return STACKS_DEVNET;
      default:
        return STACKS_TESTNET;
    }
  }

  /**
   * Get network name for logging
   */
  private getNetworkName(): string {
    return this.configService.get('stacks.network') || 'testnet';
  }

  /**
   * Call a read-only contract function with retry logic
   */
  private async callReadOnlyFunction(
    functionName: string,
    functionArgs: any[] = [],
    senderAddress?: string,
    retries: number = 3,
  ): Promise<any> {
    const readOnlyCall = async () => {
      const result = await fetchCallReadOnlyFunction({
        contractAddress: this.contractAddress,
        contractName: this.contractName,
        functionName,
        functionArgs,
        network: this.network,
        senderAddress: senderAddress || this.contractAddress,
      });

      return cvToValue(result);
    };

    let lastError: Error | undefined;
    for (let i = 0; i < retries; i++) {
      try {
        return await readOnlyCall();
      } catch (error) {
        lastError = error as Error;
        if (i < retries - 1) {
          this.logger.warn(
            `Retry attempt ${i + 1} for ${functionName} after error: ${
              lastError.message
            }. Retrying in 1s...`,
          );
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }

    this.logger.error(
      `Failed to call ${functionName} after ${retries} attempts: ${lastError?.message}`,
    );
    throw lastError;
  }

  // ============================
  // MAIN CONTRACT STATE METHODS
  // ============================

  /**
   * Get complete contract state
   */
  async getContractState(): Promise<ContractState> {
    try {
      this.logger.debug('Fetching contract state from blockchain...');
      const result = await this.callReadOnlyFunction('get-contract-state');

      if (result?.value) {
        const state = {
          admin: result.value.admin?.value || '',
          paused: Boolean(result.value.paused?.value),
          transferable: Boolean(result.value.transferable?.value),
          nav: result.value.nav?.value || 1000000,
          entryFee: result.value['entry-fee']?.value || 50, // 0.5%
          exitFee: result.value['exit-fee']?.value || 50, // 0.5%
          stxBalance: result.value['stx-balance']?.value || 0,
        };

        this.logger.debug(
          `Contract state fetched: NAV=${state.nav / 1000000} STX, STX Balance=${state.stxBalance / 1000000} STX`,
        );
        return state;
      }

      throw new Error('No contract state returned');
    } catch (error) {
      this.logger.error(
        'Error getting contract state, using fallback values:',
        error,
      );

      // Return conservative fallback values
      return {
        admin: '',
        paused: false,
        transferable: false,
        nav: 1000000, // 1 STX per token
        entryFee: 50, // 0.5%
        exitFee: 50, // 0.5%
        stxBalance: 0,
      };
    }
  }

  /**
   * Get current Net Asset Value (NAV)
   */
  async getNav(): Promise<NavResult> {
    try {
      const result = await this.callReadOnlyFunction('get-nav');
      const nav = result?.value || 1000000;
      this.logger.debug(`Current NAV: ${nav / 1000000} STX per PLMD token`);

      return { nav };
    } catch (error) {
      this.logger.error('Error getting NAV, using fallback:', error);
      return { nav: 1000000 }; // Default 1 STX per token
    }
  }

  /**
   * Get total token supply
   */
  async getTotalSupply(): Promise<TotalSupplyResult> {
    try {
      const result = await this.callReadOnlyFunction('get-total-supply');
      const totalSupply = result?.value || 0;
      this.logger.debug(`Total PLMD supply: ${totalSupply / 1000000} tokens`);

      return { totalSupply };
    } catch (error) {
      this.logger.error('Error getting total supply:', error);
      return { totalSupply: 0 };
    }
  }

  /**
   * Get token balance for an address
   */
  async getBalance(address: string): Promise<BalanceResult> {
    try {
      const functionArgs = [standardPrincipalCV(address)];
      const result = await this.callReadOnlyFunction(
        'get-balance',
        functionArgs,
      );

      return {
        balance: result?.value || 0,
      };
    } catch (error) {
      this.logger.error(`Error getting balance for ${address}:`, error);
      return { balance: 0 };
    }
  }

  /**
   * Get comprehensive pool state snapshot for transaction recording
   */
  async getPoolStateSnapshot(): Promise<PoolStateSnapshot> {
    try {
      this.logger.debug('Creating pool state snapshot...');

      const [contractState, totalSupply] = await Promise.all([
        this.getContractState(),
        this.getTotalSupply(),
      ]);

      const snapshot: PoolStateSnapshot = {
        nav: contractState.nav.toString(),
        entryFeeRate: (contractState.entryFee / 10).toString(), // Convert basis points to percentage (50 -> 5.0 -> 0.5%)
        exitFeeRate: (contractState.exitFee / 10).toString(),
        totalPoolValue: contractState.stxBalance.toString(),
        totalShares: totalSupply.totalSupply.toString(),
        stxBalance: contractState.stxBalance.toString(),
      };

      this.logger.debug(
        `Pool snapshot: NAV=${Number(snapshot.nav) / 1000000} STX/PLMD, ` +
          `Pool Value=${Number(snapshot.totalPoolValue) / 1000000} STX, ` +
          `Total Shares=${Number(snapshot.totalShares) / 1000000} PLMD, ` +
          `Entry Fee=${snapshot.entryFeeRate}%, Exit Fee=${snapshot.exitFeeRate}%`,
      );

      return snapshot;
    } catch (error) {
      this.logger.error(
        'Error creating pool state snapshot, using fallback values:',
        error,
      );

      // Return conservative fallback values
      return {
        nav: '1000000', // 1 STX per PLMD
        entryFeeRate: '0.5',
        exitFeeRate: '0.5',
        totalPoolValue: '0',
        totalShares: '0',
        stxBalance: '0',
      };
    }
  }

  // ============================
  // UTILITY FUNCTIONS
  // ============================

  /**
   * Calculate shares to mint for a given STX amount
   */
  async calculateSharesForDeposit(stxAmount: number): Promise<number> {
    try {
      const contractState = await this.getContractState();
      const nav = contractState.nav;
      const entryFeeRate = contractState.entryFee;

      if (nav === 0) {
        throw new Error('NAV is not set');
      }

      // Calculate entry fee (fee rate is in basis points, so divide by 1000)
      const fee = Math.floor((stxAmount * entryFeeRate) / 1000);
      const netAmount = stxAmount - fee;

      // Calculate shares (TOKEN_PRECISION = 1000000)
      const shares = Math.floor((netAmount * 1000000) / nav);

      this.logger.debug(
        `Deposit calculation: ${stxAmount / 1000000} STX -> ${shares / 1000000} PLMD (fee: ${fee / 1000000} STX)`,
      );
      return shares;
    } catch (error) {
      this.logger.error('Error calculating shares for deposit:', error);
      // Fallback calculation assuming 1:1 ratio
      return stxAmount;
    }
  }

  /**
   * Calculate STX to receive for a given shares amount
   */
  async calculateStxForWithdraw(sharesAmount: number): Promise<number> {
    try {
      const contractState = await this.getContractState();
      const nav = contractState.nav;
      const exitFeeRate = contractState.exitFee;

      if (nav === 0) {
        throw new Error('NAV is not set');
      }

      // Calculate STX value (TOKEN_PRECISION = 1000000)
      const stxValue = Math.floor((sharesAmount * nav) / 1000000);

      // Calculate exit fee (fee rate is in basis points, so divide by 1000)
      const fee = Math.floor((stxValue * exitFeeRate) / 1000);
      const netStx = stxValue - fee;

      this.logger.debug(
        `Withdrawal calculation: ${sharesAmount / 1000000} PLMD -> ${netStx / 1000000} STX (fee: ${fee / 1000000} STX)`,
      );
      return netStx;
    } catch (error) {
      this.logger.error('Error calculating STX for withdraw:', error);
      // Fallback calculation assuming 1:1 ratio
      return sharesAmount;
    }
  }

  /**
   * Check if contract is paused
   */
  async isPaused(): Promise<boolean> {
    try {
      const contractState = await this.getContractState();
      return contractState.paused;
    } catch (error) {
      this.logger.error('Error checking if contract is paused:', error);
      return false;
    }
  }

  /**
   * Get contract address
   */
  getContractAddress(): string {
    return this.contractAddress;
  }

  /**
   * Get contract name
   */
  getContractName(): string {
    return this.contractName;
  }

  /**
   * Get full contract identifier
   */
  getContractIdentifier(): string {
    return `${this.contractAddress}.${this.contractName}`;
  }
}

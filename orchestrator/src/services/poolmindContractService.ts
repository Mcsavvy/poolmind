import { BaseContractService } from "./baseContractService";
import { config } from "../config";
import {
  ContractCallOptions,
  ContractState,
  DepositParams,
  DepositResult,
  WithdrawParams,
  WithdrawResult,
  TransferParams,
  TransactionResult,
  UpdateNavParams,
  SetFeeRateParams,
  AdminWithdrawParams,
  AdminDepositParams,
  NavHistoryEntry,
  TokenInfo,
  BalanceResult,
  NavResult,
  TotalSupplyResult,
} from "../types/contract";

export class PoolMindContractService extends BaseContractService {
  private contractAddress: string;
  private contractName: string;

  constructor() {
    super();
    this.contractAddress = config.contracts.poolmind.address;
    this.contractName = config.contracts.poolmind.name;
  }

  // ============================
  // ADMIN FUNCTIONS
  // ============================

  /**
   * Set new admin address (only contract owner)
   */
  async setAdmin(
    newAdmin: string,
    options: ContractCallOptions,
  ): Promise<TransactionResult> {
    const functionArgs = [BaseContractService.createPrincipalCV(newAdmin)];

    return await this.makeContractCall(
      this.contractAddress,
      this.contractName,
      "set-admin",
      functionArgs,
      options,
    );
  }

  /**
   * Pause or unpause the contract
   */
  async setPaused(
    paused: boolean,
    options: ContractCallOptions,
  ): Promise<TransactionResult> {
    const functionArgs = [BaseContractService.createUintCV(paused ? 1 : 0)];

    return await this.makeContractCall(
      this.contractAddress,
      this.contractName,
      "set-paused",
      functionArgs,
      options,
    );
  }

  /**
   * Enable or disable token transfers
   */
  async setTokenTransferable(
    transferable: boolean,
    options: ContractCallOptions,
  ): Promise<TransactionResult> {
    const functionArgs = [
      BaseContractService.createUintCV(transferable ? 1 : 0),
    ];

    return await this.makeContractCall(
      this.contractAddress,
      this.contractName,
      "set-token-transferable",
      functionArgs,
      options,
    );
  }

  /**
   * Set entry fee rate
   */
  async setEntryFeeRate(
    params: SetFeeRateParams,
    options: ContractCallOptions,
  ): Promise<TransactionResult> {
    const functionArgs = [BaseContractService.createUintCV(params.rate)];

    return await this.makeContractCall(
      this.contractAddress,
      this.contractName,
      "set-entry-fee-rate",
      functionArgs,
      options,
    );
  }

  /**
   * Set exit fee rate
   */
  async setExitFeeRate(
    params: SetFeeRateParams,
    options: ContractCallOptions,
  ): Promise<TransactionResult> {
    const functionArgs = [BaseContractService.createUintCV(params.rate)];

    return await this.makeContractCall(
      this.contractAddress,
      this.contractName,
      "set-exit-fee-rate",
      functionArgs,
      options,
    );
  }

  /**
   * Update Net Asset Value (NAV)
   */
  async updateNav(
    params: UpdateNavParams,
    options: ContractCallOptions,
  ): Promise<TransactionResult> {
    const functionArgs = [BaseContractService.createUintCV(params.newNav)];

    return await this.makeContractCall(
      this.contractAddress,
      this.contractName,
      "update-nav",
      functionArgs,
      options,
    );
  }

  /**
   * Admin withdraw STX from contract
   */
  async withdrawToAdmin(
    params: AdminWithdrawParams,
    options: ContractCallOptions,
  ): Promise<TransactionResult> {
    const functionArgs = [BaseContractService.createUintCV(params.amount)];

    return await this.makeContractCall(
      this.contractAddress,
      this.contractName,
      "withdraw-to-admin",
      functionArgs,
      options,
    );
  }

  /**
   * Admin deposit STX to contract
   */
  async adminDeposit(
    params: AdminDepositParams,
    options: ContractCallOptions,
  ): Promise<TransactionResult> {
    const functionArgs = [BaseContractService.createUintCV(params.amountStx)];

    return await this.makeContractCall(
      this.contractAddress,
      this.contractName,
      "admin-deposit",
      functionArgs,
      options,
    );
  }

  // ============================
  // READ-ONLY FUNCTIONS
  // ============================

  /**
   * Get token name
   */
  async getName(): Promise<string> {
    const result = await this.callReadOnlyFunction(
      this.contractAddress,
      this.contractName,
      "get-name",
    );
    return result?.value || "";
  }

  /**
   * Get token symbol
   */
  async getSymbol(): Promise<string> {
    const result = await this.callReadOnlyFunction(
      this.contractAddress,
      this.contractName,
      "get-symbol",
    );
    return result?.value || "";
  }

  /**
   * Get token decimals
   */
  async getDecimals(): Promise<number> {
    const result = await this.callReadOnlyFunction(
      this.contractAddress,
      this.contractName,
      "get-decimals",
    );
    return result?.value || 0;
  }

  /**
   * Get token balance for an address
   */
  async getBalance(address: string): Promise<BalanceResult> {
    const functionArgs = [BaseContractService.createPrincipalCV(address)];

    const result = await this.callReadOnlyFunction(
      this.contractAddress,
      this.contractName,
      "get-balance",
      functionArgs,
    );

    return {
      balance: result?.value || 0,
    };
  }

  /**
   * Get total token supply
   */
  async getTotalSupply(): Promise<TotalSupplyResult> {
    const result = await this.callReadOnlyFunction(
      this.contractAddress,
      this.contractName,
      "get-total-supply",
    );

    return {
      totalSupply: result?.value || 0,
    };
  }

  /**
   * Get token URI
   */
  async getTokenUri(): Promise<string | null> {
    const result = await this.callReadOnlyFunction(
      this.contractAddress,
      this.contractName,
      "get-token-uri",
    );
    return result?.value || null;
  }

  /**
   * Get current Net Asset Value (NAV)
   */
  async getNav(): Promise<NavResult> {
    const result = await this.callReadOnlyFunction(
      this.contractAddress,
      this.contractName,
      "get-nav",
    );

    return {
      nav: result?.value || 0,
    };
  }

  /**
   * Get NAV history by ID
   */
  async getNavHistoryById(id: number): Promise<NavHistoryEntry | null> {
    const functionArgs = [BaseContractService.createUintCV(id)];

    const result = await this.callReadOnlyFunction(
      this.contractAddress,
      this.contractName,
      "get-nav-history-by-id",
      functionArgs,
    );

    if (result?.value) {
      return {
        nav: result.value.nav?.value || 0,
        timestamp: result.value.timestamp?.value || 0,
      };
    }

    return null;
  }

  /**
   * Get complete contract state
   */
  async getContractState(): Promise<ContractState> {
    const result = await this.callReadOnlyFunction(
      this.contractAddress,
      this.contractName,
      "get-contract-state",
    );

    if (result?.value) {
      return {
        admin: result.value.admin?.value || "",
        paused: Boolean(result.value.paused?.value),
        transferable: Boolean(result.value.transferable?.value),
        nav: result.value.nav?.value || 0,
        entryFee: result.value["entry-fee"]?.value || 0,
        exitFee: result.value["exit-fee"]?.value || 0,
        stxBalance: result.value["stx-balance"]?.value || 0,
      };
    }

    return {
      admin: "",
      paused: false,
      transferable: false,
      nav: 0,
      entryFee: 0,
      exitFee: 0,
      stxBalance: 0,
    };
  }

  /**
   * Get comprehensive token information
   */
  async getTokenInfo(): Promise<TokenInfo> {
    const [name, symbol, decimals, totalSupply, tokenUri] = await Promise.all([
      this.getName(),
      this.getSymbol(),
      this.getDecimals(),
      this.getTotalSupply(),
      this.getTokenUri(),
    ]);

    return {
      name,
      symbol,
      decimals,
      totalSupply: totalSupply.totalSupply,
      tokenUri: tokenUri || undefined,
    };
  }

  // ============================
  // UTILITY FUNCTIONS
  // ============================

  /**
   * Calculate shares to mint for a given STX amount
   */
  async calculateSharesForDeposit(stxAmount: number): Promise<number> {
    const contractState = await this.getContractState();
    const nav = contractState.nav;
    const entryFeeRate = contractState.entryFee;

    if (nav === 0) {
      throw new Error("NAV is not set");
    }

    const fee = Math.floor((stxAmount * entryFeeRate) / 1000);
    const netAmount = stxAmount - fee;
    const shares = Math.floor((netAmount * 1000000) / nav); // TOKEN_PRECISION = 1000000

    return shares;
  }

  /**
   * Calculate STX to receive for a given shares amount
   */
  async calculateStxForWithdraw(sharesAmount: number): Promise<number> {
    const contractState = await this.getContractState();
    const nav = contractState.nav;
    const exitFeeRate = contractState.exitFee;

    if (nav === 0) {
      throw new Error("NAV is not set");
    }

    const stxValue = Math.floor((sharesAmount * nav) / 1000000); // TOKEN_PRECISION = 1000000
    const fee = Math.floor((stxValue * exitFeeRate) / 1000);
    const netStx = stxValue - fee;

    return netStx;
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

// PoolMind Smart Contract Type Definitions

export interface ContractCallOptions {
  senderKey: string;
  fee?: number;
  nonce?: number;
  sponsored?: boolean;
}

export interface ContractState {
  admin: string;
  paused: boolean;
  transferable: boolean;
  nav: number;
  entryFee: number;
  exitFee: number;
  stxBalance: number;
}

export interface NavHistoryEntry {
  nav: number;
  timestamp: number;
}

export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: number;
  tokenUri?: string;
}

// Transaction result types
export interface TransactionResult {
  txId: string;
  success: boolean;
  result?: any;
  error?: string;
}

export interface DepositResult extends TransactionResult {
  sharesMinted?: number;
  stxAmount?: number;
}

export interface WithdrawResult extends TransactionResult {
  sharesBurned?: number;
  stxReceived?: number;
}

// Function parameter types
export interface DepositParams {
  amountStx: number;
}

export interface WithdrawParams {
  amountShares: number;
}

export interface TransferParams {
  amount: number;
  recipient: string;
  memo?: Buffer;
}

export interface UpdateNavParams {
  newNav: number;
}

export interface SetFeeRateParams {
  rate: number;
}

export interface AdminWithdrawParams {
  amount: number;
}

export interface AdminDepositParams {
  amountStx: number;
}

// Read-only function results
export interface BalanceResult {
  balance: number;
}

export interface NavResult {
  nav: number;
}

export interface TotalSupplyResult {
  totalSupply: number;
}

// Event types for contract events
export interface ContractEvent {
  topic: string;
  [key: string]: any;
}

export interface DepositEvent extends ContractEvent {
  topic: "deposit";
  depositor: string;
  stxAmount: number;
  sharesMinted: number;
}

export interface WithdrawEvent extends ContractEvent {
  topic: "withdraw";
  withdrawer: string;
  stxAmount: number;
  sharesBurned: number;
}

export interface NavUpdateEvent extends ContractEvent {
  topic: "nav-update";
  oldNav: number;
  newNav: number;
  updater: string;
}

export interface TransferEvent extends ContractEvent {
  topic: "ft_transfer_event";
  amount: number;
  sender: string;
  recipient: string;
  memo?: Buffer;
}

export type PoolMindEvent =
  | DepositEvent
  | WithdrawEvent
  | NavUpdateEvent
  | TransferEvent;

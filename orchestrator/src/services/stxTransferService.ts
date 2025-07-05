import {
  makeSTXTokenTransfer,
  broadcastTransaction,
  AnchorMode,
} from "@stacks/transactions";
import { BaseContractService } from "./baseContractService";
import { config } from "../config";
import winston from "winston";

const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: "stx-transfer" },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: config.logging.files.combined,
    }),
  ],
});

export interface STXTransferParams {
  recipientAddress: string;
  amount: number; // Amount in microSTX
  memo?: string;
  fee?: number; // Fee in microSTX
}

export interface STXTransferResult {
  txId: string;
  success: boolean;
  error?: string;
  result?: any;
}

export class STXTransferService extends BaseContractService {
  private adminPrivateKey: string;
  private adminAddress: string;

  constructor() {
    super();
    this.adminPrivateKey = config.contracts.poolmind.adminPrivateKey;
    this.adminAddress = config.contracts.poolmind.adminAddress;
  }

  /**
   * Transfer STX from admin wallet to specified address
   */
  async transferSTX(params: STXTransferParams): Promise<STXTransferResult> {
    try {
      logger.info("Initiating STX transfer", {
        recipientAddress: params.recipientAddress,
        amount: params.amount,
        memo: params.memo,
        senderAddress: this.adminAddress,
      });

      // Validate recipient address
      if (!params.recipientAddress || params.recipientAddress.length < 10) {
        throw new Error("Invalid recipient address");
      }

      // Validate amount
      if (params.amount <= 0) {
        throw new Error("Transfer amount must be greater than 0");
      }

      // Create the STX transfer transaction
      const txOptions = {
        recipient: params.recipientAddress,
        amount: params.amount,
        senderKey: this.adminPrivateKey,
        network: this.network,
        memo: params.memo || "",
        anchorMode: AnchorMode.Any,
        fee: params.fee,
      };

      const transaction = await makeSTXTokenTransfer(txOptions);

      // Broadcast the transaction
      const broadcastResponse = await broadcastTransaction({
        transaction,
        network: this.network,
      });

      if ("error" in broadcastResponse) {
        logger.error("STX transfer broadcast failed", {
          error: broadcastResponse.error,
          recipientAddress: params.recipientAddress,
          amount: params.amount,
        });

        return {
          txId: "",
          success: false,
          error: broadcastResponse.error,
        };
      }

      logger.info("STX transfer broadcast successful", {
        txId: broadcastResponse.txid,
        recipientAddress: params.recipientAddress,
        amount: params.amount,
        memo: params.memo,
      });

      return {
        txId: broadcastResponse.txid || "",
        success: true,
        result: broadcastResponse,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      logger.error("STX transfer failed", {
        error: errorMessage,
        recipientAddress: params.recipientAddress,
        amount: params.amount,
        stack: error instanceof Error ? error.stack : undefined,
      });

      return {
        txId: "",
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get admin wallet address
   */
  getAdminAddress(): string {
    return this.adminAddress;
  }

  /**
   * Validate STX address format
   */
  validateSTXAddress(address: string): boolean {
    // Basic validation for Stacks addresses
    // Mainnet addresses start with SP, testnet with ST
    switch (config.stacks.network) {
      case "mainnet":
        return /^SP[0-9A-HJ-NP-Z]{38}$/.test(address);
      default:
        return /^ST[0-9A-HJ-NP-Z]{38}$/.test(address);
    }
  }

  /**
   * Convert STX to microSTX
   */
  static stxToMicroSTX(stxAmount: number): number {
    return Math.floor(stxAmount * 1_000_000);
  }

  /**
   * Convert microSTX to STX
   */
  static microSTXToSTX(microSTXAmount: number): number {
    return microSTXAmount / 1_000_000;
  }
}

export const stxTransferService = new STXTransferService();

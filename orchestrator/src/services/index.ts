// Contract Services
export { BaseContractService } from "./baseContractService";
export { PoolMindContractService } from "./poolmindContractService";

// Contract Types
export * from "../types/contract";

// User Service (existing)
export { UserService } from "./userService";

// Notification Service
export { notificationService } from "./notificationService";

// Import for singleton instances
import { PoolMindContractService } from "./poolmindContractService";

// Create singleton instances for contract services
let poolMindServiceInstance: PoolMindContractService | null = null;

/**
 * Get singleton instance of PoolMind contract service
 */
export const getPoolMindService = (): PoolMindContractService => {
  if (!poolMindServiceInstance) {
    poolMindServiceInstance = new PoolMindContractService();
  }
  return poolMindServiceInstance;
};

/**
 * Reset contract service instances (useful for testing or config changes)
 */
export const resetContractServices = (): void => {
  poolMindServiceInstance = null;
};

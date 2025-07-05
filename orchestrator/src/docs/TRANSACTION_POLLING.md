# Transaction Polling System Usage Guide

This document explains how to use the new backend-based transaction polling system.

## Overview

The new system replaces frontend-only transaction polling with a robust backend queue system that:

- Polls transactions in the background using Bull.js queues
- Stores transaction details in MongoDB
- Automatically times out after 5 minutes
- Provides real-time status updates via API

## Backend API Endpoints

### 1. Submit Transaction for Monitoring

**POST** `/api/v1/transactions/submit`

Submit a transaction ID along with details for backend monitoring.

```json
{
  "txId": "0x1234567890abcdef",
  "type": "deposit",
  "stxAmount": 1000000,
  "nav": 1000000,
  "fee": 5000,
  "netAmount": 995000
}
```

### 2. Get Transaction Status

**GET** `/api/v1/transactions/{txId}/status`

Get the current status of a specific transaction.

### 3. Get User Transaction History

**GET** `/api/v1/transactions`

Query parameters:

- `limit`: Number of transactions (max 100)
- `skip`: Pagination offset
- `type`: Filter by "deposit" or "withdrawal"
- `status`: Filter by "pending", "success", "failed", or "timeout"

### 4. Queue Statistics (Admin)

**GET** `/api/v1/transactions/queue/stats`

Get queue processing statistics.

## Frontend Usage

### 1. Submit and Monitor Transaction

```typescript
import {
  submitTransaction,
  pollTransactionStatus,
  TransactionStatus,
} from "../utils/transactions";

// Submit transaction for monitoring
const result = await submitTransaction({
  txId: "0x1234567890abcdef",
  type: "deposit",
  stxAmount: 1000000,
  nav: 1000000,
  fee: 5000,
  netAmount: 995000,
});

if (result.success) {
  console.log("Transaction submitted:", result.data);

  // Poll for status updates
  try {
    const pollResult = await pollTransactionStatus(
      result.data.txId,
      (status: TransactionStatus) => {
        console.log("Status update:", status);
        // Update UI with current status
      },
    );

    console.log("Final result:", pollResult);
  } catch (error) {
    console.error("Polling failed:", error);
  }
} else {
  console.error("Submission failed:", result.error);
}
```

### 2. Check Transaction Status

```typescript
import { getTransactionStatus } from "../utils/transactions";

const statusResult = await getTransactionStatus("0x1234567890abcdef");

if (statusResult.success) {
  const transaction = statusResult.data;
  console.log("Transaction status:", transaction.status);
  console.log("Block height:", transaction.blockHeight);
  console.log("Retry count:", transaction.retryCount);
} else {
  console.error("Failed to get status:", statusResult.error);
}
```

### 3. Get Transaction History

```typescript
import { getUserTransactions } from "../utils/transactions";

const historyResult = await getUserTransactions({
  limit: 20,
  type: "deposit",
  status: "success",
});

if (historyResult.success) {
  const { transactions, pagination } = historyResult.data;
  console.log("Transactions:", transactions);
  console.log("Total:", pagination.total);
} else {
  console.error("Failed to get history:", historyResult.error);
}
```

## Transaction States

- **pending**: Transaction is being monitored
- **success**: Transaction confirmed on blockchain
- **failed**: Transaction failed or was aborted
- **timeout**: Monitoring timed out after 5 minutes

## Database Schema

The `transactions` collection stores:

```typescript
interface ITransaction {
  txId: string; // Unique transaction ID
  userId: string; // User who submitted
  userAddress: string; // User's wallet address
  type: "deposit" | "withdrawal";
  status: "pending" | "success" | "failed" | "timeout";
  stxAmount?: number; // Amount in microSTX
  plmdAmount?: number; // Amount in PLMD tokens
  nav?: number; // NAV at transaction time
  fee?: number; // Fee amount
  netAmount?: number; // Net amount after fees
  blockHeight?: number; // Block height when confirmed
  errorMessage?: string; // Error details if failed
  retryCount: number; // Number of polling attempts
  lastPolledAt?: Date; // Last polling time
  confirmedAt?: Date; // Confirmation time
  timeoutAt: Date; // When to stop polling
  createdAt: Date;
  updatedAt: Date;
}
```

## Queue System

The system uses two Bull.js queues:

1. **transaction-polling**: Polls transactions every 5 seconds
2. **transaction-cleanup**: Handles timeout cleanup after 5 minutes

## Benefits

1. **Reliability**: Backend continues polling even if user closes browser
2. **Scalability**: Queue system handles multiple transactions efficiently
3. **Persistence**: Transaction history stored in database
4. **Monitoring**: Admin can view queue statistics and system health
5. **Timeout Handling**: Automatic cleanup of stale transactions

## Migration from Old System

Replace direct Stacks API polling:

```typescript
// OLD - Direct polling
const tx = await getTransaction(txId);

// NEW - Backend API
const result = await getTransactionStatus(txId);
if (result.success) {
  const tx = result.data;
}
```

The old `getTransaction` function is deprecated but still available for backward compatibility.

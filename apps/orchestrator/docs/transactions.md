# Transaction Service Documentation

## Overview

The Transaction Service is a comprehensive system for managing cryptocurrency transactions (deposits and withdrawals) in the PoolMind platform. It provides secure transaction creation, automated status monitoring, and real-time notifications to users.

## Architecture

The transaction system consists of four main components:

### 1. Shared Types (`@poolmind/shared-types`)

- **Transaction schemas**: Zod validation schemas for all transaction types
- **Type definitions**: TypeScript interfaces for type safety
- **API contracts**: Request/response schemas for consistent API communication

### 2. Transaction Service (`TransactionsService`)

- **Core business logic**: Handle deposit and withdrawal creation
- **Transaction management**: CRUD operations for transactions
- **Status updates**: Process transaction state changes
- **Notifications**: Send user notifications for transaction events

### 3. Stacks Polling Service (`StacksPollingService`)

- **Background monitoring**: Continuously poll Stacks blockchain for transaction updates
- **Queue management**: Redis-based job queue for reliable processing
- **Confirmation tracking**: Monitor transaction confirmations and finality
- **Error handling**: Retry failed polling attempts with exponential backoff

### 4. Transaction Controller (`TransactionsController`)

- **REST API endpoints**: Expose transaction functionality via HTTP
- **Authentication**: Secure endpoints with JWT authentication
- **Authorization**: Role-based access control for admin functions
- **Validation**: Input validation and sanitization

## Database Schema

### Transaction Model

```typescript
interface ITransaction {
  // Basic fields
  userId: string; // User who initiated the transaction
  type: 'deposit' | 'withdrawal'; // Transaction type
  status: TransactionStatus; // Current status

  // Core metadata
  metadata: {
    network: 'mainnet' | 'testnet';
    txId?: string; // Stacks transaction ID (when broadcast)
    blockHeight?: number; // Block where transaction was included
    amount: string; // STX amount (as string for precision)
    fee?: string; // Transaction fee
    contractAddress?: string; // Smart contract address
    functionName?: string; // Contract function called
    functionArgs?: any[]; // Function arguments
    confirmations: number; // Current confirmation count
    requiredConfirmations: number; // Required confirmations for finality
    errorMessage?: string; // Error details if failed
    errorCode?: string; // Machine-readable error code
    retryCount: number; // Polling retry attempts
    lastCheckedAt?: Date; // Last polling check
    broadcastAt?: Date; // When transaction was broadcast
    confirmedAt?: Date; // When transaction was confirmed
  };

  // Type-specific metadata
  depositMetadata?: {
    sourceAddress: string; // Sending wallet address
    destinationAddress: string; // Pool contract address
    poolSharesExpected?: string; // Expected shares to receive
    poolSharesActual?: string; // Actual shares received
    expectedPrice?: string; // Expected STX price
    actualPrice?: string; // Actual price when processed
    slippage?: string; // Price slippage percentage
  };

  withdrawalMetadata?: {
    destinationAddress: string; // Receiving wallet address
    sourceAddress: string; // Pool contract address
    poolSharesBurned?: string; // Pool shares being burned
    minimumAmount?: string; // Minimum STX to receive
    isEmergencyWithdrawal: boolean; // Emergency withdrawal flag
    approvedBy?: string; // Admin who approved (if required)
    approvedAt?: Date; // Approval timestamp
  };

  // Additional fields
  notes?: string; // User notes
  tags?: string[]; // Categorization tags
  createdAt: Date; // Creation timestamp
  updatedAt: Date; // Last update timestamp
}
```

### Transaction Status Lifecycle

```
pending → broadcast → confirming → confirmed
   ↓         ↓           ↓
cancelled  failed     failed
```

**Status Definitions:**

- `pending`: Transaction created but not yet broadcast to network
- `broadcast`: Transaction sent to Stacks mempool
- `confirming`: Transaction included in block but awaiting confirmations
- `confirmed`: Transaction has required confirmations (default: 6)
- `failed`: Transaction rejected or failed execution
- `cancelled`: Transaction cancelled before broadcast

## API Endpoints

### User Endpoints

#### Create Deposit

```http
POST /transactions/deposits
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "amount": "100.000000",
  "sourceAddress": "SP1HTBVD3JG9C05J7HBJTHGR0GGW7KX975CN9AX18",
  "network": "mainnet",
  "notes": "Initial deposit",
  "tags": ["first", "large"]
}
```

#### Create Withdrawal

```http
POST /transactions/withdrawals
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "amount": "50.000000",
  "destinationAddress": "SP1HTBVD3JG9C05J7HBJTHGR0GGW7KX975CN9AX18",
  "poolSharesBurned": "45.123456",
  "minimumAmount": "49.000000",
  "network": "mainnet",
  "notes": "Partial withdrawal"
}
```

#### Get User Transactions

```http
GET /transactions?page=1&limit=20&type=deposit&status=confirmed&sortBy=createdAt&sortOrder=desc
Authorization: Bearer <jwt_token>
```

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (1-100, default: 20)
- `type`: Filter by transaction type (`deposit`, `withdrawal`)
- `status`: Filter by status (`pending`, `confirmed`, etc.)
- `sortBy`: Sort field (`createdAt`, `updatedAt`, `amount`)
- `sortOrder`: Sort direction (`asc`, `desc`)
- `search`: Search in notes, txId, addresses
- `fromDate`: Start date filter (ISO string)
- `toDate`: End date filter (ISO string)

#### Get Transaction by ID

```http
GET /transactions/{transactionId}
Authorization: Bearer <jwt_token>
```

#### Get User Statistics

```http
GET /transactions/stats/summary
Authorization: Bearer <jwt_token>
```

### Admin Endpoints

#### Get All Transactions (Admin)

```http
GET /transactions/admin/all?page=1&limit=50&userId={userId}
Authorization: Bearer <admin_jwt_token>
```

#### Get Global Statistics (Admin)

```http
GET /transactions/admin/stats
Authorization: Bearer <admin_jwt_token>
```

#### Trigger Manual Polling (Admin)

```http
POST /transactions/{transactionId}/poll
Authorization: Bearer <admin_jwt_token>
```

#### Update Transaction Status (Admin)

```http
PATCH /transactions/{transactionId}/status
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "status": "confirmed",
  "txId": "0x1234...abcd",
  "blockHeight": 123456,
  "confirmations": 6
}
```

#### Get Queue Statistics (Admin)

```http
GET /transactions/admin/queue-stats
Authorization: Bearer <admin_jwt_token>
```

## Background Processing

### Polling Service

The `StacksPollingService` continuously monitors pending transactions:

1. **Scheduler**: Runs every 30 seconds to find pending transactions
2. **Queue Processing**: Uses Redis-backed Bull queue for reliable job processing
3. **Stacks API Integration**: Queries blockchain for transaction status
4. **Confirmation Tracking**: Calculates confirmations based on block height
5. **Status Updates**: Updates database when transaction status changes
6. **Notifications**: Sends notifications on status changes

### Polling Configuration

```typescript
const POLL_INTERVAL = 30000; // 30 seconds between polls
const MAX_RETRIES = 50; // Maximum polling attempts
const CONFIRMATION_THRESHOLD = 6; // Required confirmations
```

### Queue Configuration

```typescript
{
  removeOnComplete: 100,    // Keep last 100 completed jobs
  removeOnFail: 50,         // Keep last 50 failed jobs
  attempts: 3,              // Retry failed jobs up to 3 times
  backoff: {
    type: 'exponential',
    delay: 5000             // Start with 5s delay, exponentially increase
  }
}
```

## Notification System

### Transaction Events

The system sends notifications for:

1. **Transaction Created**: When deposit/withdrawal is created
2. **Transaction Confirmed**: When transaction reaches required confirmations
3. **Transaction Failed**: When transaction fails or is rejected

### Notification Types

- **Email**: Sent to users with email notifications enabled
- **Telegram**: Sent to users with linked Telegram accounts
- **In-app**: Stored for display in the application

### Notification Format

```typescript
{
  title: "Deposit Confirmed",
  body: "Your deposit of 100.000000 STX has been confirmed.",
  type: NotificationType.TRANSACTION,
  priority: 5
}
```

## Error Handling

### Transaction Creation Errors

- **Invalid Amount**: Non-positive or improperly formatted amounts
- **Invalid Address**: Malformed Stacks wallet addresses
- **User Not Found**: Invalid user ID
- **Configuration Error**: Missing pool contract address

### Polling Errors

- **Network Errors**: Stacks API connectivity issues
- **Transaction Not Found**: Transaction not yet visible on network
- **Parsing Errors**: Invalid transaction data from API
- **Database Errors**: Failed to update transaction status

### Error Codes

- `INVALID_AMOUNT`: Amount validation failed
- `INVALID_ADDRESS`: Address format validation failed
- `USER_NOT_FOUND`: User ID not found in database
- `CONFIG_ERROR`: Missing or invalid configuration
- `NETWORK_ERROR`: Blockchain network connectivity issue
- `BROADCAST_TIMEOUT`: Transaction not broadcast within expected time
- `CONFIRMATION_TIMEOUT`: Transaction confirmation taking too long

## Security Considerations

### Access Control

- **User Isolation**: Users can only access their own transactions
- **Admin Access**: Admins can view all transactions and system status
- **Moderator Access**: Moderators have limited admin capabilities

### Data Validation

- **Input Sanitization**: All inputs validated with Zod schemas
- **Amount Precision**: STX amounts stored as strings to prevent float precision issues
- **Address Validation**: Stacks addresses validated with regex patterns
- **Rate Limiting**: API endpoints protected against abuse

### Audit Trail

- **Transaction History**: All status changes logged with timestamps
- **Admin Actions**: All admin actions logged with user identification
- **Retry Tracking**: Failed polling attempts tracked for analysis
- **Error Logging**: Comprehensive error logging for debugging

## Configuration

### Environment Variables

```bash
# Database
DATABASE_URI=mongodb://localhost:27017
DATABASE_NAME=poolmind

# Redis (for job queue)
REDIS_URL=redis://localhost:6379

# Stacks Configuration
STACKS_NETWORK=mainnet
STACKS_POOL_CONTRACT_ADDRESS=SP1HTBVD3JG9C05J7HBJTHGR0GGW7KX975CN9AX18

# Authentication
JWT_SECRET=your-super-secret-jwt-key-32-chars-min
JWT_EXPIRES_IN=7d

# Telegram (for notifications)
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_BOT_USERNAME=your-bot-username
```

### Pool Contract Configuration

The transaction service requires configuration of the Stacks smart contract that manages the pooled funds:

- **Contract Address**: The deployed contract address on Stacks blockchain
- **Function Names**: The contract functions for deposits (`deposit`) and withdrawals (`withdraw`)
- **Network**: Whether to use mainnet or testnet

## Performance Considerations

### Database Indexes

The transaction model includes optimized indexes for:

- User queries: `{ userId: 1, createdAt: -1 }`
- Status polling: `{ status: 1, 'metadata.lastCheckedAt': 1 }`
- Transaction lookup: `{ 'metadata.txId': 1 }`
- Admin queries: `{ type: 1, status: 1 }`

### Queue Performance

- **Concurrency**: Configure based on server capacity
- **Memory Usage**: Bull queue keeps completed jobs in memory
- **Redis Configuration**: Optimize Redis for queue workload
- **Job Cleanup**: Regular cleanup of old completed/failed jobs

### API Performance

- **Pagination**: All list endpoints support pagination
- **Filtering**: Efficient database queries with proper indexes
- **Caching**: Consider caching frequently accessed data
- **Rate Limiting**: Prevent abuse with request rate limiting

## Monitoring and Observability

### Logging

The service provides comprehensive logging:

- **Transaction Events**: Creation, status changes, errors
- **Polling Activity**: Queue processing, API calls, retries
- **Performance Metrics**: Response times, queue lengths
- **Error Tracking**: Failed operations with context

### Metrics

Key metrics to monitor:

- **Transaction Volume**: Deposits and withdrawals per hour/day
- **Processing Times**: Average time from creation to confirmation
- **Error Rates**: Failed transactions and polling errors
- **Queue Health**: Job completion rates and backlog size

### Health Checks

- **Database Connectivity**: MongoDB connection status
- **Redis Connectivity**: Queue system availability
- **Stacks API**: Blockchain API responsiveness
- **Queue Status**: Number of pending/failed jobs

## Development and Testing

### Local Development

1. Set up MongoDB and Redis locally
2. Configure environment variables
3. Run database migrations if needed
4. Start the NestJS application

### Testing Strategy

- **Unit Tests**: Service methods and business logic
- **Integration Tests**: Database operations and API endpoints
- **E2E Tests**: Complete transaction flows
- **Load Tests**: Queue processing under load

### Mock Implementation

The current implementation includes a mock Stacks API client for development. Replace with actual Stacks blockchain integration:

```typescript
// Replace mock implementation in stacks-polling.service.ts
import { StacksApi, Configuration } from '@stacks/blockchain-api-client';
```

## Future Enhancements

### Planned Features

1. **Webhook Support**: External system notifications
2. **Transaction Batching**: Optimize multiple transactions
3. **Advanced Analytics**: Transaction pattern analysis
4. **Fee Optimization**: Dynamic fee calculation
5. **Multi-signature Support**: Enhanced security for large transactions

### Scalability Improvements

1. **Horizontal Scaling**: Multiple polling service instances
2. **Database Sharding**: Partition transactions by user or date
3. **Caching Layer**: Redis caching for frequently accessed data
4. **Queue Optimization**: Separate queues for different transaction types

---

This documentation provides a comprehensive overview of the Transaction Service. For specific implementation details, refer to the source code and inline comments.

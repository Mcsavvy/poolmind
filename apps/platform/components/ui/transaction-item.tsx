'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Minus,
  Clock,
  ArrowUpDown,
  AlertCircle,
  CheckCircle,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import {
  formatSTX,
  formatPLMD,
  formatDate,
  formatTxHash,
  formatRelativeTime,
} from '@/lib/formatters';
import { STXIcon, PLMDIcon } from '@/components/ui/token-icon';
import type { Transaction } from '@/hooks/transactions';

interface TransactionItemProps {
  transaction: Transaction;
  showExplorerLink?: boolean;
  className?: string;
}

type TransactionStatus =
  | 'pending'
  | 'broadcast'
  | 'confirming'
  | 'confirmed'
  | 'failed'
  | 'cancelled';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  broadcast: 'bg-blue-100 text-blue-800',
  confirming: 'bg-purple-100 text-purple-800',
  confirmed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
} as const;

const STATUS_ICONS = {
  pending: Clock,
  broadcast: ArrowUpDown,
  confirming: AlertCircle,
  confirmed: CheckCircle,
  failed: XCircle,
  cancelled: XCircle,
} as const;

const StatusIcon = ({ status }: { status: TransactionStatus }) => {
  const Icon = STATUS_ICONS[status];
  return <Icon className='h-4 w-4' />;
};

const getTransactionDescription = (type: 'deposit' | 'withdrawal') => {
  switch (type) {
    case 'deposit':
      return 'Contributed to Pool';
    case 'withdrawal':
      return 'Burned for STX';
    default:
      return type;
  }
};

const getExplorerUrl = (txId: string, network: string = 'testnet') => {
  const baseUrl =
    network === 'mainnet'
      ? 'https://explorer.stacks.co'
      : 'https://explorer.stacks.co';
  return `${baseUrl}/txid/${txId}?chain=${network}`;
};

// Helper functions to extract data from nested transaction structure
const getTransactionAmount = (transaction: Transaction): string => {
  return transaction.metadata?.amount || '0';
};

const getTransactionTxId = (transaction: Transaction): string | undefined => {
  return transaction.metadata?.txId;
};

const getTransactionConfirmations = (transaction: Transaction): number => {
  return transaction.metadata?.confirmations || 0;
};

const getRequiredConfirmations = (transaction: Transaction): number => {
  return transaction.metadata?.requiredConfirmations || 6;
};

const getTransactionBlockHeight = (
  transaction: Transaction,
): number | undefined => {
  return transaction.metadata?.blockHeight;
};

const getTransactionNetwork = (transaction: Transaction): string => {
  return transaction.metadata?.network || 'testnet';
};

const getTokensReceived = (transaction: Transaction): string | undefined => {
  return transaction.depositMetadata?.tokensReceived;
};

const getTokensBurned = (transaction: Transaction): string | undefined => {
  return (
    transaction.withdrawalMetadata?.tokensBurned ||
    transaction.withdrawalMetadata?.poolSharesBurned
  );
};

const getEntryFeeAmount = (transaction: Transaction): string | undefined => {
  return transaction.depositMetadata?.entryFeeAmount;
};

const getExitFeeAmount = (transaction: Transaction): string | undefined => {
  return transaction.withdrawalMetadata?.exitFeeAmount;
};

const getEntryFeeRate = (transaction: Transaction): string | undefined => {
  return transaction.depositMetadata?.entryFeeRate;
};

const getExitFeeRate = (transaction: Transaction): string | undefined => {
  return transaction.withdrawalMetadata?.exitFeeRate;
};

const getPoolStateAtTransaction = (transaction: Transaction) => {
  return {
    nav: transaction.metadata?.nav,
    poolTotalValue: transaction.metadata?.poolTotalValue,
    poolTotalShares: transaction.metadata?.poolTotalShares,
  };
};

export function TransactionItem({
  transaction,
  showExplorerLink = true,
  className = '',
}: TransactionItemProps) {
  const txId = getTransactionTxId(transaction);
  const amount = getTransactionAmount(transaction);
  const network = getTransactionNetwork(transaction);
  const confirmations = getTransactionConfirmations(transaction);
  const requiredConfirmations = getRequiredConfirmations(transaction);
  const tokensReceived = getTokensReceived(transaction);
  const tokensBurned = getTokensBurned(transaction);
  const entryFeeAmount = getEntryFeeAmount(transaction);
  const exitFeeAmount = getExitFeeAmount(transaction);
  const entryFeeRate = getEntryFeeRate(transaction);
  const exitFeeRate = getExitFeeRate(transaction);
  const poolState = getPoolStateAtTransaction(transaction);

  const handleExplorerClick = () => {
    if (txId) {
      window.open(getExplorerUrl(txId, network), '_blank');
    }
  };

  return (
    <div
      className={`flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors ${className}`}
    >
      <div className='flex items-center space-x-4 flex-1'>
        {/* Transaction Type Icon */}
        <div
          className={`p-2 rounded-lg ${
            transaction.type === 'deposit' ? 'bg-green-100' : 'bg-red-100'
          }`}
        >
          {transaction.type === 'deposit' ? (
            <Plus className='h-4 w-4 text-green-600' />
          ) : (
            <Minus className='h-4 w-4 text-red-600' />
          )}
        </div>

        {/* Transaction Details */}
        <div className='flex-1 min-w-0'>
          <div className='flex items-center space-x-2 mb-1'>
            <span className='font-medium'>
              {getTransactionDescription(transaction.type)}
            </span>
            <Badge
              variant='secondary'
              className={STATUS_COLORS[transaction.status]}
            >
              <StatusIcon status={transaction.status} />
              <span className='ml-1 capitalize'>{transaction.status}</span>
            </Badge>
          </div>

          <p className='text-sm text-muted-foreground mb-1'>
            {formatDate(transaction.createdAt)} (
            {formatRelativeTime(transaction.createdAt)})
          </p>

          {/* Transaction confirmation info */}
          <div className='flex items-center space-x-4 text-xs text-muted-foreground mb-1'>
            <span>
              {confirmations}/{requiredConfirmations} confirmations
            </span>
            {transaction.status === 'confirmed' && (
              <span className='text-green-600'>✓ Confirmed</span>
            )}
          </div>

          {txId && (
            <div className='flex items-center space-x-1 text-xs text-muted-foreground'>
              <span className='font-mono'>{formatTxHash(txId)}</span>
              {showExplorerLink && (
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-4 w-4 p-0'
                  onClick={handleExplorerClick}
                >
                  <ExternalLink className='h-3 w-3' />
                </Button>
              )}
            </div>
          )}

          {transaction.notes && (
            <p className='text-xs text-muted-foreground italic mt-1'>
              {transaction.notes}
            </p>
          )}

          {/* Transaction Details */}
          {(poolState.nav || entryFeeAmount || exitFeeAmount) && (
            <div className='flex items-center space-x-4 mt-1 text-xs text-muted-foreground'>
              {poolState.nav && (
                <span className='flex items-center gap-1'>
                  NAV: {(Number(poolState.nav) / 1000000).toFixed(6)}
                  <STXIcon size={10} />/<PLMDIcon size={10} />
                </span>
              )}
              {transaction.type === 'deposit' && entryFeeAmount && (
                <span>
                  Fee: {formatSTX(entryFeeAmount)} STX ({entryFeeRate}%)
                </span>
              )}
              {transaction.type === 'withdrawal' && exitFeeAmount && (
                <span>
                  Fee: {formatSTX(exitFeeAmount)} STX ({exitFeeRate}%)
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Amount Display */}
      <div className='text-right'>
        {transaction.type === 'deposit' ? (
          <div>
            <div className='text-lg font-semibold text-green-600 flex items-center justify-end gap-1'>
              <STXIcon size={16} />
              {formatSTX(amount)} STX
            </div>
            {tokensReceived && (
              <div className='text-xs text-green-600 flex items-center justify-end gap-1 mt-1'>
                Received: <PLMDIcon size={12} />
                {formatPLMD(tokensReceived)} PLMD
              </div>
            )}
            {entryFeeAmount && (
              <div className='text-xs text-red-500 flex items-center justify-end gap-1'>
                Fee: <STXIcon size={10} />
                {formatSTX(entryFeeAmount)} STX
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className='text-lg font-semibold text-red-600 flex items-center justify-end gap-1'>
              <PLMDIcon size={16} />
              {formatPLMD(tokensBurned || '0')} PLMD
            </div>
            <div className='text-sm text-green-600 flex items-center justify-end gap-1 mt-1'>
              Received: <STXIcon size={12} />
              {formatSTX(amount)} STX
            </div>
            {exitFeeAmount && (
              <div className='text-xs text-red-500 flex items-center justify-end gap-1'>
                Fee: <STXIcon size={10} />
                {formatSTX(exitFeeAmount)} STX
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface TransactionListProps {
  transactions: Transaction[];
  emptyMessage?: string;
  showExplorerLinks?: boolean;
  className?: string;
}

export function TransactionList({
  transactions,
  emptyMessage = 'No transactions found',
  showExplorerLinks = true,
  className = '',
}: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className={`text-center py-8 text-muted-foreground ${className}`}>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {transactions.map(transaction => (
        <TransactionItem
          key={transaction.id}
          transaction={transaction}
          showExplorerLink={showExplorerLinks}
        />
      ))}
    </div>
  );
}

'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { History, Search, Filter, RefreshCw, XCircle } from 'lucide-react';
import { useTransactions, TransactionQuery } from '@/hooks/transactions';
import { TransactionList } from '@/components/ui/transaction-item';
import {
  WalletConnectedDepositButton,
  WalletConnectedWithdrawalButton,
} from '@/components/ui/wallet-connected-buttons';

type TransactionStatus =
  | 'pending'
  | 'broadcast'
  | 'confirming'
  | 'confirmed'
  | 'failed'
  | 'cancelled';
type TransactionType = 'deposit' | 'withdrawal';

export default function TransactionsPage() {
  const [query, setQuery] = useState<Partial<TransactionQuery>>({
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [searchTerm, setSearchTerm] = useState('');

  const {
    data: transactionData,
    isLoading,
    error,
    refetch,
  } = useTransactions(query);

  const transactions = transactionData?.data?.transactions || [];
  const pagination = transactionData?.data?.pagination;

  // Handle filter changes
  const updateQuery = (updates: Partial<TransactionQuery>) => {
    setQuery(prev => ({ ...prev, ...updates, page: 1 })); // Reset to page 1 when filtering
  };

  const handleSearch = () => {
    updateQuery({ search: searchTerm });
  };

  const handlePageChange = (newPage: number) => {
    setQuery(prev => ({ ...prev, page: newPage }));
  };

  return (
    <>
      <div className='flex flex-col space-y-8'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-2'>
            <History className='h-8 w-8' />
            <div>
              <h1 className='text-3xl font-bold tracking-tight'>
                Transactions
              </h1>
              <p className='text-muted-foreground'>
                View your transaction history and status
              </p>
            </div>
          </div>
          <div className='flex space-x-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => refetch()}
              className='flex items-center space-x-1'
            >
              <RefreshCw className='h-4 w-4' />
              <span>Refresh</span>
            </Button>
            <WalletConnectedDepositButton size='sm' />
            <WalletConnectedWithdrawalButton size='sm' />
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className='pb-4'>
            <CardTitle className='text-lg flex items-center gap-2'>
              <Filter className='h-5 w-5' />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-1 md:grid-cols-5 gap-4'>
              {/* Search */}
              <div className='md:col-span-2 flex space-x-2'>
                <Input
                  placeholder='Search by hash, notes, or address...'
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className='flex-1'
                />
                <Button onClick={handleSearch} size='sm'>
                  <Search className='h-4 w-4' />
                </Button>
              </div>

              {/* Type Filter */}
              <Select
                value={query.type || 'all'}
                onValueChange={(value: string) =>
                  updateQuery({
                    type:
                      value === 'all' ? undefined : (value as TransactionType),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder='All Types' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Types</SelectItem>
                  <SelectItem value='deposit'>Deposits</SelectItem>
                  <SelectItem value='withdrawal'>Withdrawals</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select
                value={query.status || 'all'}
                onValueChange={(value: string) =>
                  updateQuery({
                    status:
                      value === 'all'
                        ? undefined
                        : (value as TransactionStatus),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder='All Status' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Status</SelectItem>
                  <SelectItem value='pending'>Pending</SelectItem>
                  <SelectItem value='broadcast'>Broadcast</SelectItem>
                  <SelectItem value='confirming'>Confirming</SelectItem>
                  <SelectItem value='confirmed'>Confirmed</SelectItem>
                  <SelectItem value='failed'>Failed</SelectItem>
                  <SelectItem value='cancelled'>Cancelled</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select
                value={`${query.sortBy}-${query.sortOrder}`}
                onValueChange={(value: string) => {
                  const [sortBy, sortOrder] = value.split('-');
                  updateQuery({
                    sortBy: sortBy as 'createdAt' | 'updatedAt' | 'amount',
                    sortOrder: sortOrder as 'asc' | 'desc',
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='createdAt-desc'>Newest First</SelectItem>
                  <SelectItem value='createdAt-asc'>Oldest First</SelectItem>
                  <SelectItem value='amount-desc'>Highest Amount</SelectItem>
                  <SelectItem value='amount-asc'>Lowest Amount</SelectItem>
                  <SelectItem value='updatedAt-desc'>
                    Recently Updated
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
        <Card>
          <CardHeader className='flex flex-row items-center justify-between'>
            <div>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                {pagination
                  ? `Showing ${(Number(pagination.page) - 1) * Number(pagination.limit) + 1}-${Math.min(Number(pagination.page) * Number(pagination.limit), Number(pagination.total))} of ${Number(pagination.total)} transactions`
                  : 'Your recent transactions'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className='space-y-4'>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className='flex items-center justify-between p-4 border rounded-lg'
                  >
                    <div className='space-y-2 flex-1'>
                      <div className='flex items-center space-x-2'>
                        <Skeleton className='h-4 w-20' />
                        <Skeleton className='h-6 w-16' />
                      </div>
                      <Skeleton className='h-3 w-32' />
                      <Skeleton className='h-3 w-48' />
                    </div>
                    <Skeleton className='h-6 w-24' />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className='flex flex-col items-center justify-center p-8 text-center'>
                <XCircle className='h-12 w-12 text-red-500 mb-4' />
                <h3 className='text-lg font-semibold mb-2'>
                  Failed to Load Transactions
                </h3>
                <p className='text-muted-foreground mb-4'>
                  There was an error loading your transaction history.
                </p>
                <Button onClick={() => refetch()} variant='outline'>
                  <RefreshCw className='h-4 w-4 mr-2' />
                  Try Again
                </Button>
              </div>
            ) : transactions.length === 0 ? (
              <div className='flex flex-col items-center justify-center p-8 text-center'>
                <History className='h-12 w-12 text-muted-foreground mb-4' />
                <h3 className='text-lg font-semibold mb-2'>
                  No Transactions Found
                </h3>
                <p className='text-muted-foreground mb-4'>
                  {query.type || query.status || query.search
                    ? 'No transactions match your current filters.'
                    : "You haven't made any transactions yet."}
                </p>
                <div className='flex space-x-2'>
                  <WalletConnectedDepositButton size='sm' />
                  {(query.type || query.status || query.search) && (
                    <Button
                      variant='outline'
                      onClick={() => {
                        setQuery({
                          page: 1,
                          limit: 20,
                          sortBy: 'createdAt',
                          sortOrder: 'desc',
                        });
                        setSearchTerm('');
                      }}
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <TransactionList
                transactions={transactions}
                emptyMessage='No transactions found'
                showExplorerLinks={true}
              />
            )}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className='flex items-center justify-between mt-6 pt-4 border-t'>
                <div className='text-sm text-muted-foreground'>
                  Page {pagination.page} of {pagination.totalPages}
                </div>
                <div className='flex space-x-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() =>
                      handlePageChange(Number(pagination.page) - 1)
                    }
                    disabled={Number(pagination.page) <= 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() =>
                      handlePageChange(Number(pagination.page) + 1)
                    }
                    disabled={
                      Number(pagination.page) >= Number(pagination.totalPages)
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

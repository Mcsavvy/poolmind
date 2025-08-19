'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History } from 'lucide-react';

export default function TransactionsPage() {
  const mockTransactions = [
    {
      id: '1',
      type: 'Deposit',
      amount: '+1000 STX',
      status: 'Completed',
      date: '2023-09-20',
      hash: 'SP1A2B3C4D5E6F...'
    },
    {
      id: '2', 
      type: 'Withdrawal',
      amount: '-500 STX',
      status: 'Completed',
      date: '2023-09-15',
      hash: 'SP7G8H9I0J1K2L...'
    },
    {
      id: '3',
      type: 'Deposit',
      amount: '+2000 STX',
      status: 'Completed', 
      date: '2023-09-10',
      hash: 'SP3M4N5O6P7Q8R...'
    }
  ];

  return (
    <div className="flex flex-col space-y-8">
      <div className="flex items-center space-x-2">
        <History className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">
            View your transaction history and status
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>
            Your latest deposits, withdrawals, and transfers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{transaction.type}</span>
                    <Badge variant={transaction.status === 'Completed' ? 'default' : 'secondary'}>
                      {transaction.status}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">{transaction.date}</span>
                  <span className="text-xs text-muted-foreground font-mono">{transaction.hash}</span>
                </div>
                <div className={`text-lg font-semibold ${
                  transaction.amount.startsWith('+') ? 'text-green-500' : 'text-red-500'
                }`}>
                  {transaction.amount}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, Plus, Minus } from 'lucide-react';

export default function WalletPage() {
  return (
    <div className="flex flex-col space-y-8">
      <div className="flex items-center space-x-2">
        <Wallet className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Wallet</h1>
          <p className="text-muted-foreground">
            Manage your STX balance and transactions
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Balance</CardTitle>
            <CardDescription>Your current STX balance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">2,500 STX</div>
            <p className="text-sm text-muted-foreground mt-2">
              ≈ $3,750 USD
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pool Balance</CardTitle>
            <CardDescription>Your balance in the arbitrage pool</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">1,500 STX</div>
            <p className="text-sm text-muted-foreground mt-2">
              ≈ $2,250 USD
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Deposit or withdraw funds</CardDescription>
        </CardHeader>
        <CardContent className="flex space-x-4">
          <Button className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Deposit</span>
          </Button>
          <Button variant="outline" className="flex items-center space-x-2">
            <Minus className="h-4 w-4" />
            <span>Withdraw</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

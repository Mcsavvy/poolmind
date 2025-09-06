'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className='flex flex-col space-y-8'>
      <div className='flex items-center space-x-2'>
        <BarChart3 className='h-8 w-8' />
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Analytics</h1>
          <p className='text-muted-foreground'>
            Track your performance and pool statistics
          </p>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Returns</CardTitle>
            <TrendingUp className='h-4 w-4 text-green-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-green-500'>+15.2%</div>
            <p className='text-xs text-muted-foreground'>
              +2.1% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Pool Share</CardTitle>
            <BarChart3 className='h-4 w-4 text-blue-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>3.7%</div>
            <p className='text-xs text-muted-foreground'>Of total pool value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Monthly Profit
            </CardTitle>
            <TrendingUp className='h-4 w-4 text-green-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>+375 STX</div>
            <p className='text-xs text-muted-foreground'>+$562.50 USD</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance Chart</CardTitle>
          <CardDescription>
            Your investment performance over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='h-[300px] flex items-center justify-center border-2 border-dashed border-muted rounded-lg'>
            <p className='text-muted-foreground'>
              Chart component would go here
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

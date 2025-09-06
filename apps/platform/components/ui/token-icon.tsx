import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface TokenIconProps {
  symbol: 'STX' | 'PLMD';
  size?: number;
  className?: string;
}

const tokenIcons = {
  STX: '/stx.png',
  PLMD: '/plmd.png',
} as const;

export function TokenIcon({ symbol, size = 24, className }: TokenIconProps) {
  return (
    <div className={cn('relative flex-shrink-0', className)}>
      <Image
        src={tokenIcons[symbol]}
        alt={`${symbol} token`}
        width={size}
        height={size}
        className='rounded-full'
        priority
      />
    </div>
  );
}

// Convenience components for specific tokens
export function STXIcon(props: Omit<TokenIconProps, 'symbol'>) {
  return <TokenIcon {...props} symbol='STX' />;
}

export function PLMDIcon(props: Omit<TokenIconProps, 'symbol'>) {
  return <TokenIcon {...props} symbol='PLMD' />;
}

// Component for displaying token amount with icon
interface TokenAmountProps {
  symbol: 'STX' | 'PLMD';
  amount: string;
  size?: number;
  className?: string;
  showSymbol?: boolean;
}

export function TokenAmount({
  symbol,
  amount,
  size = 20,
  className,
  showSymbol = true,
}: TokenAmountProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <TokenIcon symbol={symbol} size={size} />
      <span className='font-medium'>
        {amount}
        {showSymbol && (
          <span className='text-muted-foreground ml-1'>{symbol}</span>
        )}
      </span>
    </div>
  );
}

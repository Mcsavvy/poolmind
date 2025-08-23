/**
 * Formatting utilities for financial data
 */

/**
 * Convert microSTX to STX with proper formatting
 * @param microSTX - Amount in microSTX (1 STX = 1,000,000 microSTX)
 * @param decimals - Number of decimal places to show (default: 6)
 * @returns Formatted STX amount as string
 */
export function formatSTX(microSTX: string | number, decimals: number = 6): string {
  const stx = Number(microSTX) / 1_000_000;
  return stx.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

/**
 * Convert microPLMD to PLMD with proper formatting
 * @param microPLMD - Amount in microPLMD (1 PLMD = 1,000,000 microPLMD)
 * @param decimals - Number of decimal places to show (default: 6)
 * @returns Formatted PLMD amount as string
 */
export function formatPLMD(microPLMD: string | number, decimals: number = 6): string {
  const plmd = Number(microPLMD) / 1_000_000;
  return plmd.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format currency with proper localization
 * @param amount - Amount to format
 * @param currency - Currency code (default: 'USD')
 * @returns Formatted currency string
 */
export function formatCurrency(amount: string | number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

/**
 * Format percentage with proper sign and color indication
 * @param percentage - Percentage as decimal (0.05 = 5%)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Object with formatted percentage and color class
 */
export function formatPercentage(percentage: string | number, decimals: number = 2) {
  const pct = Number(percentage) * 100;
  const formatted = `${pct >= 0 ? '+' : ''}${pct.toFixed(decimals)}%`;
  const colorClass = pct >= 0 ? 'text-green-600' : 'text-red-600';
  
  return {
    formatted,
    colorClass,
    isPositive: pct >= 0,
  };
}

/**
 * Format large numbers with appropriate suffixes (K, M, B)
 * @param num - Number to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string with suffix
 */
export function formatLargeNumber(num: string | number, decimals: number = 1): string {
  const n = Number(num);
  
  if (n >= 1_000_000_000) {
    return (n / 1_000_000_000).toFixed(decimals) + 'B';
  }
  if (n >= 1_000_000) {
    return (n / 1_000_000).toFixed(decimals) + 'M';
  }
  if (n >= 1_000) {
    return (n / 1_000).toFixed(decimals) + 'K';
  }
  
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format transaction hash for display (truncate with ellipsis)
 * @param hash - Transaction hash
 * @param startChars - Characters to show at start (default: 6)
 * @param endChars - Characters to show at end (default: 6)
 * @returns Truncated hash with ellipsis
 */
export function formatTxHash(hash: string, startChars: number = 6, endChars: number = 6): string {
  if (hash.length <= startChars + endChars) {
    return hash;
  }
  
  return `${hash.slice(0, startChars)}...${hash.slice(-endChars)}`;
}

/**
 * Format wallet address for display
 * @param address - Wallet address
 * @param startChars - Characters to show at start (default: 6)
 * @param endChars - Characters to show at end (default: 4)
 * @returns Truncated address with ellipsis
 */
export function formatAddress(address: string, startChars: number = 6, endChars: number = 4): string {
  if (address.length <= startChars + endChars) {
    return address;
  }
  
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Format date for display
 * @param date - Date to format
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  });
}

/**
 * Format relative time (e.g., "2 hours ago")
 * @param date - Date to format
 * @returns Relative time string
 */
export function formatRelativeTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return `${diffDays}d ago`;
  }
}

/**
 * Calculate shares to receive for a given STX deposit amount
 * @param stxAmount - STX amount to deposit (in STX, not microSTX)
 * @param nav - Current NAV (STX per PLMD token)
 * @param entryFeeRate - Entry fee rate as percentage (0.5 = 0.5%)
 * @returns Object with net deposit amount and shares to receive
 */
export function calculateDepositShares(
  stxAmount: number,
  nav: number,
  entryFeeRate: number = 0.5
) {
  const fee = (stxAmount * entryFeeRate) / 100;
  const netAmount = stxAmount - fee;
  const shares = netAmount / nav;
  
  return {
    fee,
    netAmount,
    shares,
    feeFormatted: formatSTX(fee * 1_000_000),
    netAmountFormatted: formatSTX(netAmount * 1_000_000),
    sharesFormatted: formatPLMD(shares * 1_000_000),
  };
}

/**
 * Calculate STX to receive for a given PLMD withdrawal amount
 * @param plmdAmount - PLMD amount to withdraw
 * @param nav - Current NAV (STX per PLMD token)
 * @param exitFeeRate - Exit fee rate as percentage (0.5 = 0.5%)
 * @returns Object with gross STX amount, fee, and net amount to receive
 */
export function calculateWithdrawalAmount(
  plmdAmount: number,
  nav: number,
  exitFeeRate: number = 0.5
) {
  const grossAmount = plmdAmount * nav;
  const fee = (grossAmount * exitFeeRate) / 100;
  const netAmount = grossAmount - fee;
  
  return {
    grossAmount,
    fee,
    netAmount,
    grossAmountFormatted: formatSTX(grossAmount * 1_000_000),
    feeFormatted: formatSTX(fee * 1_000_000),
    netAmountFormatted: formatSTX(netAmount * 1_000_000),
  };
}

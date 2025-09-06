'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { generateWalletAvatar, getWalletInitials } from '@/lib/avatar';

interface WalletAvatarProps {
  walletAddress: string;
  profilePicture?: string;
  displayName?: string;
  username?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function WalletAvatar({
  walletAddress,
  profilePicture,
  displayName,
  username,
  size = 'md',
  className,
}: WalletAvatarProps) {
  const getInitials = (name?: string) => {
    if (name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return getWalletInitials(walletAddress);
  };

  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <Avatar className={`${sizeClasses[size]} ${className || ''}`}>
      <AvatarImage
        src={profilePicture || generateWalletAvatar(walletAddress)}
        alt={displayName || username || 'User'}
      />
      <AvatarFallback>{getInitials(displayName || username)}</AvatarFallback>
    </Avatar>
  );
}

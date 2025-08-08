'use client';

import { useState } from 'react';
import { useAuthSession } from '@/components/auth/session-provider';
import { disconnect } from '@stacks/connect';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WalletAvatar } from '@/components/ui/wallet-avatar';
import { 
  User, 
  Settings, 
  LogOut, 
  Shield, 
  CreditCard,
  Bell,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function UserProfileDropdown() {
  const { session, clearSession, loading } = useAuthSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const router = useRouter();

  if (loading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Loader2 className="h-4 w-4 text-primary-foreground animate-spin" />
      </Button>
    );
  }

  if (!session?.user) {
    return null;
  }

  const user = session.user;

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      // Disconnect the wallet first
      disconnect();
      // Then clear client session
      clearSession();
      router.push('/');
    } catch (error) {
      console.error('Sign out error:', error);
      setIsSigningOut(false);
    }
  };

  const getInitials = (name?: string, walletAddress?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (walletAddress) {
      return walletAddress.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <WalletAvatar
            walletAddress={user.walletAddress}
            profilePicture={user.profilePicture || user.telegramAuth?.photoUrl}
            displayName={user.displayName}
            username={user.username}
            size="lg"
            className="h-12 w-12"
          />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user.displayName || user.username || 'Anonymous User'}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {formatWalletAddress(user.walletAddress)}
            </p>
            {user.email && (
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            )}
            <div className="flex items-center gap-1 mt-1">
              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                {user.role}
              </Badge>
              {user.isEmailVerified && (
                <Badge variant="outline" className="text-xs">
                  Verified
                </Badge>
              )}
            </div>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild>
          <Link href="/notifications">
            <Bell className="mr-2 h-4 w-4" />
            <span>Notifications</span>
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem>
          <CreditCard className="mr-2 h-4 w-4" />
          <span>Wallet</span>
        </DropdownMenuItem>
        
        {(user.role === 'admin' || user.role === 'moderator') && (
          <DropdownMenuItem>
            <Shield className="mr-2 h-4 w-4" />
            <span>Admin Panel</span>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="text-red-600 focus:text-red-600"
        >
          {isSigningOut ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="mr-2 h-4 w-4" />
          )}
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
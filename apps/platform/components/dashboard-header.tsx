'use client';

import { Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { SidebarTrigger } from '@/components/ui/sidebar';
import UserProfileDropdown from '@/components/auth/user-profile-dropdown';
import { ThemeToggle } from '@/components/theme-toggle';

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
}

// Mock notifications data - replace with real data from your API
const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'Deposit Successful',
    message: 'Your deposit of 1000 STX has been processed.',
    time: '2 min ago',
    read: false,
    type: 'success'
  },
  {
    id: '2', 
    title: 'Withdrawal Processed',
    message: 'Your withdrawal request has been completed.',
    time: '1 hour ago',
    read: false,
    type: 'info'
  },
  {
    id: '3',
    title: 'Pool Performance Update',
    message: 'Monthly returns are +15% this period.',
    time: '3 hours ago',
    read: true,
    type: 'success'
  }
];

export default function DashboardHeader() {
  const unreadCount = mockNotifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return '🟢';
      case 'warning':
        return '🟡';
      case 'error':
        return '🔴';
      default:
        return '🔵';
    }
  };

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      
      <div className="flex flex-1 items-center justify-between">
        {/* Search bar */}
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions, settings..."
            className="pl-8"
            disabled
          />
        </div>

        {/* Right side - Notifications, theme toggle, and user menu */}
        <div className="flex items-center gap-6">
          {/* Notification Bell */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {unreadCount}
                  </Badge>
                )}
                <span className="sr-only">Notifications</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                Notifications
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {unreadCount} new
                  </Badge>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {mockNotifications.length === 0 ? (
                <DropdownMenuItem disabled>
                  No notifications
                </DropdownMenuItem>
              ) : (
                mockNotifications.map((notification) => (
                  <DropdownMenuItem key={notification.id} className="flex flex-col items-start gap-1 p-3">
                    <div className="flex w-full items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span>{getNotificationIcon(notification.type)}</span>
                        <div className="flex flex-col">
                          <span className={`text-sm font-medium ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {notification.title}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {notification.message}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {notification.time}
                      </span>
                    </div>
                    {!notification.read && (
                      <div className="h-2 w-2 rounded-full bg-blue-500 ml-6" />
                    )}
                  </DropdownMenuItem>
                ))
              )}
              
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-center text-sm">
                View all notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <ThemeToggle />
          <UserProfileDropdown />
        </div>
      </div>
    </header>
  );
}

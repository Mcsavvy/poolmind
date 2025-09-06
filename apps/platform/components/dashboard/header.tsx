'use client';

import { Bell, Search, Loader2 } from 'lucide-react';
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
import { useNotificationManager } from '@/hooks/notifications';
import { useEffect } from 'react';

export default function DashboardHeader() {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    handleMarkAsRead,
    handleDelete,
    handleBulkAction,
  } = useNotificationManager();

  // Fetch notifications on component mount
  useEffect(() => {
    fetchNotifications();
  }, []); // Empty dependency array - only run once on mount

  const getNotificationIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return '🔴';
      case 'urgent':
        return '🚨';
      case 'normal':
        return '🔵';
      case 'low':
        return '🟢';
      default:
        return '🔵';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    if (diffInMinutes < 1440)
      return `${Math.floor(diffInMinutes / 60)} hour${Math.floor(diffInMinutes / 60) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffInMinutes / 1440)} day${Math.floor(diffInMinutes / 1440) > 1 ? 's' : ''} ago`;
  };

  return (
    <header className='flex h-16 shrink-0 items-center gap-2 border-b px-4'>
      <SidebarTrigger className='-ml-1' />

      <div className='flex flex-1 items-center justify-between'>
        {/* Search bar */}
        <div className='relative max-w-md flex-1'>
          <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder='Search transactions, settings...'
            className='pl-8'
            disabled
          />
        </div>

        {/* Right side - Notifications, theme toggle, and user menu */}
        <div className='flex items-center gap-6'>
          {/* Notification Bell */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' size='icon' className='relative'>
                <Bell className='h-4 w-4' />
                {unreadCount > 0 && (
                  <Badge
                    variant='destructive'
                    className='absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs'
                  >
                    {unreadCount}
                  </Badge>
                )}
                <span className='sr-only'>Notifications</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-80'>
              <DropdownMenuLabel className='flex items-center justify-between'>
                Notifications
                {unreadCount > 0 && (
                  <Badge variant='secondary' className='ml-auto'>
                    {unreadCount} new
                  </Badge>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {loading ? (
                <DropdownMenuItem disabled className='flex items-center gap-2'>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  Loading notifications...
                </DropdownMenuItem>
              ) : notifications.length === 0 ? (
                <DropdownMenuItem disabled>No notifications</DropdownMenuItem>
              ) : (
                notifications.map(notification => (
                  <DropdownMenuItem
                    key={notification.id}
                    className='flex flex-col items-start gap-1 p-3'
                    onClick={() =>
                      !notification.read && handleMarkAsRead(notification.id)
                    }
                  >
                    <div className='flex w-full items-start justify-between'>
                      <div className='flex items-center gap-2'>
                        <span>
                          {getNotificationIcon(notification.priority)}
                        </span>
                        <div className='flex flex-col'>
                          <span
                            className={`text-sm font-medium ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}
                          >
                            {notification.title}
                          </span>
                          <span className='text-xs text-muted-foreground'>
                            {notification.message}
                          </span>
                        </div>
                      </div>
                      <span className='text-xs text-muted-foreground whitespace-nowrap'>
                        {formatTimeAgo(notification.createdAt)}
                      </span>
                    </div>
                    {!notification.read && (
                      <div className='h-2 w-2 rounded-full bg-blue-500 ml-6' />
                    )}
                  </DropdownMenuItem>
                ))
              )}

              {error && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled
                    className='text-red-500 text-center text-sm'
                  >
                    Error: {error}
                  </DropdownMenuItem>
                </>
              )}

              {notifications.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <div className='flex gap-2 p-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      className='flex-1 text-xs'
                      onClick={() => {
                        const unreadIds = notifications
                          .filter(n => !n.read)
                          .map(n => n.id);
                        if (unreadIds.length > 0) {
                          handleBulkAction('markRead', unreadIds);
                        }
                      }}
                      disabled={notifications.filter(n => !n.read).length === 0}
                    >
                      Mark All Read
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      className='flex-1 text-xs'
                      onClick={() => {
                        const allIds = notifications.map(n => n.id);
                        if (allIds.length > 0) {
                          handleBulkAction('delete', allIds);
                        }
                      }}
                    >
                      Clear All
                    </Button>
                  </div>
                </>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem className='text-center text-sm'>
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

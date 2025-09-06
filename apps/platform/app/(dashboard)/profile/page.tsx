'use client';
import { redirect } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TelegramLinkButton } from '@/components/auth/telegram-link-button';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Settings, Wallet, MessageCircle } from 'lucide-react';
import ProtectedRoute from '@/components/auth/protected-route';
import { config } from '@/lib/config';
import Image from 'next/image';
import { useAuthSession } from '@/components/auth/session-provider';

export default function ProfilePage() {
  const { session, loading } = useAuthSession();

  const user = session!.user;
  const isLinked = !!user.telegramAuth;

  const handleProfileUpdate = async () => {};

  return (
    <ProtectedRoute>
      <div className='container mx-auto py-8 max-w-4xl'>
        <div className='flex flex-col space-y-8'>
          {/* Page Header */}
          <div className='flex items-center space-x-3'>
            <div className='p-2 bg-primary/10 rounded-lg'>
              <Settings className='h-6 w-6 text-primary' />
            </div>
            <div>
              <h1 className='text-3xl font-bold tracking-tight'>
                Profile Settings
              </h1>
              <p className='text-muted-foreground'>
                Manage your account settings and authentication methods
              </p>
            </div>
          </div>

          {/* Account Overview */}
          <Card>
            <CardHeader>
              <div className='flex items-center space-x-2'>
                <Wallet className='h-5 w-5' />
                <CardTitle>Account Overview</CardTitle>
              </div>
              <CardDescription>
                Your current account information and status
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div className='space-y-3'>
                  <div>
                    <label className='text-sm font-medium text-muted-foreground'>
                      Primary Wallet Address
                    </label>
                    <p className='text-sm font-mono break-all bg-muted p-2 rounded'>
                      {user.walletAddress}
                    </p>
                  </div>

                  <div>
                    <label className='text-sm font-medium text-muted-foreground'>
                      Account Role
                    </label>
                    <div className='mt-1'>
                      <Badge
                        variant={
                          user.role === 'admin' ? 'default' : 'secondary'
                        }
                      >
                        {user.role}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className='space-y-3'>
                  {user.displayName && (
                    <div>
                      <label className='text-sm font-medium text-muted-foreground'>
                        Display Name
                      </label>
                      <p className='text-sm'>{user.displayName}</p>
                    </div>
                  )}

                  {user.username && (
                    <div>
                      <label className='text-sm font-medium text-muted-foreground'>
                        Username
                      </label>
                      <p className='text-sm'>@{user.username}</p>
                    </div>
                  )}

                  {user.email && (
                    <div>
                      <label className='text-sm font-medium text-muted-foreground'>
                        Email Address
                      </label>
                      <div className='flex items-center gap-2'>
                        <p className='text-sm'>{user.email}</p>
                        {user.isEmailVerified && (
                          <Badge variant='outline' className='text-xs'>
                            Verified
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Authentication Methods */}
          <div className='space-y-6'>
            <div className='space-y-2'>
              <h2 className='text-2xl font-semibold tracking-tight'>
                Authentication Methods
              </h2>
              <p className='text-muted-foreground'>
                Manage how you can sign in to your account
              </p>
            </div>

            <div className='grid gap-6'>
              {/* Wallet Authentication */}
              <Card>
                <CardHeader>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <Image
                        src='/stx.png'
                        alt='Stacks'
                        width={20}
                        height={20}
                        className='w-8 h-8'
                      />
                      <CardTitle className='text-lg'>Stacks Wallet</CardTitle>
                      <Badge
                        variant='outline'
                        className='bg-green-50 text-green-700 border-green-200'
                      >
                        Primary
                      </Badge>
                    </div>
                  </div>
                  <CardDescription>
                    Your primary authentication method using your Stacks wallet
                    signature
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className='space-y-3'>
                    <div className='p-3 bg-background rounded-lg'>
                      <p className='text-sm text-muted-foreground font-medium'>
                        Wallet authentication is your primary and most secure
                        login method
                      </p>
                      <p className='text-xs text-muted-foreground mt-1'>
                        This cannot be disabled as it&apos;s required for
                        account access
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Telegram Authentication */}
              <TelegramLinkButton
                isLinked={isLinked}
                telegramAuth={user.telegramAuth}
                botName={config.telegramBotUsername!}
                onUpdate={handleProfileUpdate}
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className='space-y-4'>
            <h3 className='text-lg font-semibold'>Quick Actions</h3>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              <Button variant='outline' className='justify-start'>
                <Settings className='h-4 w-4 mr-2' />
                Edit Profile
              </Button>
              <Button variant='outline' className='justify-start'>
                Notification Settings
              </Button>
              <Button variant='outline' className='justify-start'>
                Security Settings
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

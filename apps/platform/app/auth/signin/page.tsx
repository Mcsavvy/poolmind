'use client';

import { useEffect, useState } from 'react';
import WalletConnectButton from '@/components/auth/wallet-connect-button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  TelegramLoginWidget,
  type TelegramUser,
} from '@/components/auth/telegram-login-widget';
import { toast } from 'sonner';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { config } from '@/lib/config';
import { useAuthSession } from '@/components/auth/session-provider';
import { WalletAvatar } from '@/components/ui/wallet-avatar';
import { useTelegram } from '@/hooks/auth';

export default function SignInPage() {
  const [showTelegramLogin, setShowTelegramLogin] = useState(false);
  const { loginWithTelegram } = useTelegram();
  const { session } = useAuthSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const next = searchParams.get('next');

  useEffect(() => {
    if (session) {
      toast.success('Signed in successfully', {
        id: 'signin-success',
      });
      router.push(next || '/');
    }
  }, [session, next, router]);

  const handleTelegramAuth = async (user: TelegramUser) => {
    try {
      await loginWithTelegram({
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        photo_url: user.photo_url,
        auth_date: user.auth_date,
        hash: user.hash,
      });
    } catch (error) {
      toast.error('Authentication error occurred');
      console.error('Auth error:', error);
    }
  };

  const handleTelegramError = (error: string) => {
    toast.error(`Telegram login error: ${error}`);
  };

  return (
    <div className='container flex h-screen w-screen flex-col items-center justify-center'>
      <div className='mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]'>
        <div className='flex flex-col space-y-2 text-center'>
          <h1 className='text-2xl font-semibold tracking-tight'>
            Welcome to PoolMind
          </h1>
          <p className='text-sm text-muted-foreground'>
            Sign in to access your pooled arbitrage account
          </p>
        </div>

        {session ? (
          <Card>
            <CardHeader className='space-y-1'>
              <CardTitle className='text-2xl text-center'>
                Already signed in
              </CardTitle>
              <CardDescription className='text-center'>
                You are already signed in as
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4 flex flex-col items-center'>
              <div className='flex flex-col items-center space-y-2'>
                <WalletAvatar
                  walletAddress={session.user.walletAddress}
                  size='lg'
                  username={
                    session?.user.username ||
                    session?.user.displayName ||
                    session?.user.email
                  }
                  profilePicture={
                    session.user.profilePicture ||
                    session.user.telegramAuth?.photoUrl
                  }
                />
                <span className='font-medium'>
                  {session.user?.username ||
                    session.user?.displayName ||
                    session.user?.email}
                </span>
              </div>
              <Button className='w-full' onClick={() => router.push('/')}>
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader className='space-y-1'>
                <CardTitle className='text-2xl text-center'>Sign in</CardTitle>
                <CardDescription className='text-center'>
                  Choose your preferred authentication method
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                {/* Primary Wallet Login */}
                <div className='space-y-3'>
                  <div className='flex items-center gap-2 text-sm font-medium'>
                    <Image src='/stx.png' alt='Stacks' width={20} height={20} />
                    <span>Stacks Wallet</span>
                    <span className='text-xs bg-primary/10 text-primary px-2 py-1 rounded'>
                      Recommended
                    </span>
                  </div>
                  <WalletConnectButton
                    variant='default'
                    size='lg'
                    className='w-full'
                  />
                  <p className='text-xs text-muted-foreground text-center'>
                    Connect your Stacks wallet to create an account or sign in
                  </p>
                </div>

                <div className='relative'>
                  <div className='absolute inset-0 flex items-center'>
                    <span className='w-full border-t' />
                  </div>
                  <div className='relative flex justify-center text-xs uppercase'>
                    <span className='bg-background px-2 text-muted-foreground'>
                      Or continue with
                    </span>
                  </div>
                </div>

                {/* Telegram Login */}
                <div className='space-y-3'>
                  {showTelegramLogin ? (
                    <div className='space-y-3'>
                      <div className=''>
                        <div className='flex justify-center'>
                          <TelegramLoginWidget
                            botName={config.telegramBotUsername}
                            onAuth={handleTelegramAuth}
                            onError={handleTelegramError}
                            buttonSize='large'
                            cornerRadius={6}
                          />
                        </div>
                      </div>
                      <Button
                        variant='link'
                        size='sm'
                        onClick={() => setShowTelegramLogin(false)}
                        className='w-full text-foreground'
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button
                        size='lg'
                        onClick={() => setShowTelegramLogin(true)}
                        className='w-full bg-background text-foreground group hover:bg-telegram hover:text-white border-telegram'
                      >
                        <Image
                          src='/telegram.png'
                          alt='Telegram'
                          width={20}
                          height={20}
                        />
                        Continue with Telegram
                      </Button>
                      <p className='text-xs text-muted-foreground text-center'>
                        Available if you&apos;ve already linked your Telegram
                        account
                      </p>
                    </>
                  )}
                </div>

                <div className='text-xs text-center text-muted-foreground pt-2'>
                  By signing in, you agree to our{' '}
                  <a
                    href='/terms'
                    className='underline underline-offset-4 hover:text-primary'
                  >
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a
                    href='/privacy'
                    className='underline underline-offset-4 hover:text-primary'
                  >
                    Privacy Policy
                  </a>
                </div>
              </CardContent>
            </Card>

            <div className='text-center text-sm text-muted-foreground'>
              <p>
                Don&apos;t have a Stacks wallet?{' '}
                <a
                  href='https://leather.io/wallet'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='underline underline-offset-4 hover:text-primary'
                >
                  Get Leather Wallet
                </a>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TelegramLoginWidget,
  type TelegramUser,
} from './telegram-login-widget';
import { useTelegram } from '@/hooks/auth';
import { Loader2, Unlink2 } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

interface TelegramLinkButtonProps {
  isLinked: boolean;
  telegramAuth?: {
    telegramId: number;
    firstName: string;
    lastName?: string;
    username?: string;
    photoUrl?: string;
    authDate: number;
    linkedAt: string;
  };
  botName: string;
  onUpdate: () => void;
}

export function TelegramLinkButton({
  isLinked,
  telegramAuth,
  botName,
  onUpdate,
}: TelegramLinkButtonProps) {
  const [isLinking, setIsLinking] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [showWidget, setShowWidget] = useState(false);
  const { linkTelegram, unlinkTelegram } = useTelegram();

  const handleTelegramAuth = async (telegramData: TelegramUser) => {
    setIsLinking(true);
    try {
      await linkTelegram({
        telegramData: {
          id: telegramData.id,
          first_name: telegramData.first_name,
          last_name: telegramData.last_name,
          username: telegramData.username,
          photo_url: telegramData.photo_url,
          auth_date: telegramData.auth_date,
          hash: telegramData.hash,
        },
      });

      toast.success('Telegram account linked successfully!');
      setShowWidget(false);
      onUpdate();
    } catch (error) {
      console.error('Error linking Telegram account:', error);
      toast.error(
        error instanceof Error && error.message.includes('already linked')
          ? 'This Telegram account is already linked to another user'
          : 'Failed to link Telegram account',
      );
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlink = async () => {
    setIsUnlinking(true);
    try {
      await unlinkTelegram();
      toast.success('Telegram account unlinked successfully');
      onUpdate();
    } catch (error) {
      console.error('Error unlinking Telegram account:', error);
      toast.error('Failed to unlink Telegram account');
    } finally {
      setIsUnlinking(false);
    }
  };

  const handleAuthError = (error: string) => {
    toast.error(`Telegram authentication error: ${error}`);
    setIsLinking(false);
  };

  if (isLinked && telegramAuth) {
    return (
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <Image
                src='/telegram.png'
                alt='Telegram'
                width={20}
                height={20}
                className='w-8 h-8'
              />
              <CardTitle className='text-lg'>Telegram Account</CardTitle>
              <Badge
                variant='outline'
                className='bg-green-50 text-green-700 border-green-200'
              >
                Linked
              </Badge>
            </div>
          </div>
          <CardDescription>
            Your Telegram account is linked. You can now use it to sign in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <div className='flex items-center gap-3 p-3 bg-background rounded-lg'>
              {telegramAuth.photoUrl && (
                <img
                  src={telegramAuth.photoUrl}
                  alt='Telegram profile'
                  className='w-10 h-10 rounded-full'
                />
              )}
              <div>
                <p className='font-medium'>
                  {telegramAuth.firstName} {telegramAuth.lastName}
                </p>
                {telegramAuth.username && (
                  <p className='text-sm text-gray-500'>
                    @{telegramAuth.username}
                  </p>
                )}
              </div>
            </div>
            <div className='text-xs text-gray-500'>
              Linked on {new Date(telegramAuth.linkedAt).toLocaleDateString()}
            </div>
            <Button
              variant='outline'
              size='sm'
              onClick={handleUnlink}
              disabled={isUnlinking}
              className='text-red-600 hover:text-red-700 hover:bg-red-50'
            >
              {isUnlinking ? (
                <>
                  <Loader2 className='h-4 w-4 animate-spin mr-2' />
                  Unlinking...
                </>
              ) : (
                <>
                  <Unlink2 className='h-4 w-4 mr-2' />
                  Unlink Account
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center gap-2'>
          <Image
            src='/telegram.png'
            alt='Telegram'
            width={20}
            height={20}
            className='w-8 h-8'
          />
          <CardTitle className='text-lg'>Link Telegram Account</CardTitle>
        </div>
        <CardDescription>
          Link your Telegram account for convenient sign-in access.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {showWidget ? (
          <div className='space-y-4'>
            <div className='p-4 bg-transparent rounded-lg'>
              <TelegramLoginWidget
                botName={botName}
                onAuth={handleTelegramAuth}
                onError={handleAuthError}
                buttonSize='large'
                cornerRadius={6}
                className='flex justify-center'
              />
            </div>
            {isLinking && (
              <div className='flex items-center justify-center gap-2 text-[#24A1DE]'>
                <Loader2 className='h-4 w-4 animate-spin' />
                <span className='text-sm'>Linking your account...</span>
              </div>
            )}
            <Button
              variant='outline'
              onClick={() => setShowWidget(false)}
              disabled={isLinking}
              className='w-full h-10 bg-transparent text-[#24A1DE] border-[#24A1DE] hover:bg-[#24A1DE]/10'
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className='space-y-4'>
            <div className='text-sm text-gray-600 space-y-2'>
              <p>Benefits of linking your Telegram account:</p>
              <ul className='list-disc pl-5 space-y-1'>
                <li>Quick and convenient sign-in</li>
                <li>No need to connect wallet every time</li>
                <li>Secure authentication via Telegram</li>
              </ul>
            </div>
            <Button
              onClick={() => setShowWidget(true)}
              className='w-full bg-[#24A1DE] hover:bg-[#24A1DE]/80 text-white h-10'
            >
              <Image
                src='/telegram.png'
                alt='Telegram'
                width={20}
                height={20}
                className='w-8 h-8'
              />
              Link Telegram Account
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

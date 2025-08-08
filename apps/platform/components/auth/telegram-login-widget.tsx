'use client';

import { LoginButton } from '@telegram-auth/react';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface TelegramLoginWidgetProps {
  botName: string;
  onAuth: (user: TelegramUser) => void;
  onError?: (error: string) => void;
  buttonSize?: 'large' | 'medium' | 'small';
  cornerRadius?: number;
  requestAccess?: boolean;
  className?: string;
}

export function TelegramLoginWidget({
  botName,
  onAuth,
  onError,
  buttonSize = 'large',
  cornerRadius = 20,
  requestAccess = false,
  className = '',
}: TelegramLoginWidgetProps) {
  const handleAuth = (user: TelegramUser) => {
    try {
      onAuth(user);
    } catch (error) {
      console.error('Error in Telegram auth callback:', error);
      onError?.(error instanceof Error ? error.message : 'Authentication failed');
    }
  };

  return (
    <div className={className}>
      <LoginButton
        botUsername={botName}
        onAuthCallback={handleAuth}
        buttonSize={buttonSize}
        cornerRadius={cornerRadius}
        requestAccess={requestAccess ? 'write' : undefined}
      />
    </div>
  );
}

// Hook for easier integration with NextAuth
export function useTelegramLogin() {
  const loginWithTelegram = async (telegramData: TelegramUser) => {
    try {
      // This function is kept for compatibility but not used in plain API auth flow
      return { ok: true } as any;
    } catch (error) {
      console.error('Telegram login error:', error);
      throw error;
    }
  };

  return { loginWithTelegram };
}

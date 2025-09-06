'use client';
import { useEffect, useRef } from 'react';
import useAuth from '@/hooks/auth';
import { useAuthSession } from './session-provider';

export function AuthRefresher() {
  const { session, clearSession } = useAuthSession();
  const { refreshToken } = useAuth();
  const lastRefreshedExpiry = useRef<number | null>(null);
  const FIVE_MINUTES = 1000 * 60 * 5;

  // Schedule a single refresh 5 minutes before expiry.
  // Guard against repeated refreshes for the same expiresAt value.
  useEffect(() => {
    if (!session?.expiresAt) return;

    const expiresAt = session.expiresAt * 1000;

    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    const timeUntilRefresh = timeUntilExpiry - FIVE_MINUTES;

    const triggerRefresh = () => {
      // Avoid refreshing multiple times for the same expiry value
      if (lastRefreshedExpiry.current === expiresAt) return;
      lastRefreshedExpiry.current = expiresAt;
      refreshToken();
    };

    // If token has already expired, refresh immediately
    if (timeUntilExpiry <= 0) {
      clearSession();
      return;
    }

    // If we're already within the 5-minute threshold, refresh once
    if (timeUntilRefresh <= 0) {
      triggerRefresh();
      return;
    }

    // Schedule refresh 5 minutes before expiry
    const timer = setTimeout(triggerRefresh, timeUntilRefresh);
    return () => clearTimeout(timer);
  }, [session?.expiresAt, refreshToken, clearSession]);

  return null;
}

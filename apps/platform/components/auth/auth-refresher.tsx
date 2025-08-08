"use client";
import { useEffect, useRef } from "react";
import useAuth from "@/hooks/auth";
import { useAuthSession } from "./session-provider";


export function AuthRefresher() {
  const { session } = useAuthSession();
  const { refreshToken } = useAuth();
  const lastRefreshedExpiry = useRef<number | null>(null);
  const FIVE_MINUTES = 1000 * 60 * 5;

  // Schedule a single refresh 5 minutes before expiry.
  // Guard against repeated refreshes for the same expiresAt value.
  useEffect(() => {
    if (!session?.expiresAt) return;

    const now = Date.now();
    const timeUntilRefresh = session.expiresAt - now - FIVE_MINUTES;

    const triggerRefresh = () => {
      // Avoid refreshing multiple times for the same expiry value
      if (lastRefreshedExpiry.current === session.expiresAt) return;
      lastRefreshedExpiry.current = session.expiresAt;
      refreshToken();
    };

    if (timeUntilRefresh <= 0) {
      // Already within the threshold; refresh once
      triggerRefresh();
      return;
    }

    const timer = setTimeout(triggerRefresh, timeUntilRefresh);
    return () => clearTimeout(timer);
  }, [session?.expiresAt, refreshToken]);

  return null;
}
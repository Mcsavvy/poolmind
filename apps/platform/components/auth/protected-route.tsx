'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, ReactNode, useState } from 'react';
import FullPageLoader from '@/components/ui/full-page-loader';
import { useAuthSession } from '@/components/auth/session-provider';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'user' | 'moderator' | 'admin';
  fallbackUrl?: string;
  loadingFallback?: ReactNode;
  unauthorizedFallback?: ReactNode;
  signingInFallback?: ReactNode;
}

export default function ProtectedRoute({
  children,
  requiredRole = 'user',
  fallbackUrl = '/auth/signin',
  loadingFallback,
  unauthorizedFallback,
  signingInFallback,
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, loading } = useAuthSession();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.push(`${fallbackUrl}?next=${pathname}`);
      return;
    }
    const roleHierarchy = { user: 0, moderator: 1, admin: 2 } as const;
    const userLevel = roleHierarchy[session.user.role];
    const requiredLevel = roleHierarchy[requiredRole];
    if (userLevel < requiredLevel) {
      router.push('/auth/unauthorized');
      return;
    }
  }, [router, requiredRole, fallbackUrl, session, loading]);

  if (loading) {
    return (
      loadingFallback ?? (
        <FullPageLoader text="Securing your session..." />
      )
    );
  }

  if (!session) {
    return (
      signingInFallback ?? (
        <FullPageLoader text="Redirecting to sign in..." />
      )
    );
  }

  // Check role access again to prevent flash of content
  const roleHierarchy = { user: 0, moderator: 1, admin: 2 } as const;
  const userLevel = roleHierarchy[session.user.role] ?? -1;
  const requiredLevel = roleHierarchy[requiredRole];

  if (userLevel < requiredLevel) {
    return (
      unauthorizedFallback ?? (
        <FullPageLoader text="Access denied. Redirecting..." />
      )
    );
  }

  return <>{children}</>;
}
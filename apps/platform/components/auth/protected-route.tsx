'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'user' | 'moderator' | 'admin';
  fallbackUrl?: string;
}

export default function ProtectedRoute({ 
  children, 
  requiredRole = 'user',
  fallbackUrl = '/auth/signin'
}: ProtectedRouteProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Still loading

    if (!session) {
      router.push(fallbackUrl);
      return;
    }

    // Check role-based access
    const userRole = session.user?.role;
    const roleHierarchy = { user: 0, moderator: 1, admin: 2 };
    
    const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] ?? -1;
    const requiredLevel = roleHierarchy[requiredRole];

    if (userLevel < requiredLevel) {
      router.push('/auth/unauthorized');
      return;
    }
  }, [session, status, router, requiredRole, fallbackUrl]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground">Redirecting to sign in...</p>
        </div>
      </div>
    );
  }

  // Check role access again to prevent flash of content
  const userRole = session.user?.role;
  const roleHierarchy = { user: 0, moderator: 1, admin: 2 };
  const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] ?? -1;
  const requiredLevel = roleHierarchy[requiredRole];

  if (userLevel < requiredLevel) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground">Access denied. Redirecting...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
'use client';

import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { AlertCircle, Home, RefreshCw } from 'lucide-react';

const errorMessages: Record<string, { title: string; description: string }> = {
  Configuration: {
    title: 'Configuration Error',
    description: 'There was a problem with the authentication configuration. Please try again or contact support.',
  },
  AccessDenied: {
    title: 'Access Denied',
    description: 'You do not have permission to access this resource.',
  },
  Verification: {
    title: 'Verification Error',
    description: 'The verification link is invalid or has expired.',
  },
  Default: {
    title: 'Authentication Error',
    description: 'An error occurred during authentication. Please try signing in again.',
  },
};

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error') || 'Default';
  
  const errorInfo = errorMessages[error] || errorMessages.Default;

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]">
        <div className="flex flex-col space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {errorInfo.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {errorInfo.description}
          </p>
        </div>
        
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-center">What happened?</CardTitle>
            <CardDescription className="text-center">
              {error === 'Configuration' ? (
                <>
                  There&apos;s an issue with the authentication setup. This usually resolves itself, but if it persists, please contact support.
                </>
              ) : (
                <>
                  Something went wrong during the authentication process. You can try signing in again or return to the homepage.
                </>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex flex-col space-y-3">
              <Button asChild className="w-full">
                <Link href="/auth/signin">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try signing in again
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="w-full">
                <Link href="/">
                  <Home className="mr-2 h-4 w-4" />
                  Return to homepage
                </Link>
              </Button>
            </div>
            
            {error && (
              <div className="text-xs text-center text-muted-foreground mt-4 p-2 bg-muted rounded">
                <strong>Error code:</strong> {error}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
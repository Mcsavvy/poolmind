import { Metadata } from 'next';
import WalletConnectButton from '@/components/auth/wallet-connect-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Sign In - PoolMind',
  description: 'Connect your Stacks wallet to access PoolMind',
};

export default function SignInPage() {
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome to PoolMind
          </h1>
          <p className="text-sm text-muted-foreground">
            Connect your Stacks wallet to get started
          </p>
        </div>
        
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Sign in</CardTitle>
            <CardDescription className="text-center">
              Use your Stacks wallet to sign in securely
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex flex-col space-y-4">
              <WalletConnectButton 
                variant="default" 
                size="lg"
                className="w-full"
              />
              
              <div className="text-xs text-center text-muted-foreground">
                By connecting your wallet, you agree to our{' '}
                <a href="/terms" className="underline underline-offset-4 hover:text-primary">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="underline underline-offset-4 hover:text-primary">
                  Privacy Policy
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Don&apos;t have a Stacks wallet?{' '}
            <a 
              href="https://wallet.hiro.so/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-primary"
            >
              Get Hiro Wallet
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
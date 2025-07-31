import { Metadata } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ProtectedRoute from '@/components/auth/protected-route';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Dashboard - PoolMind',
  description: 'Your PoolMind dashboard',
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin');
  }

  const user = session.user;

  return (
    <ProtectedRoute>
      <div className="container mx-auto py-8">
        <div className="flex flex-col space-y-8">
          {/* Welcome Header */}
          <div className="flex flex-col space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back, {user.displayName || user.username || 'User'}!
            </h1>
            <p className="text-muted-foreground">
              Here&apos;s an overview of your PoolMind account
            </p>
          </div>

          {/* User Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Your wallet and profile details
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Wallet Address
                  </label>
                  <p className="text-sm font-mono break-all">
                    {user.walletAddress}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Role
                  </label>
                  <div className="mt-1">
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role}
                    </Badge>
                  </div>
                </div>

                {user.email && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Email
                    </label>
                    <div className="flex items-center gap-2">
                      <p className="text-sm">{user.email}</p>
                      {user.isEmailVerified && (
                        <Badge variant="outline" className="text-xs">
                          Verified
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {user.username && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Username
                    </label>
                    <p className="text-sm">@{user.username}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Profile</CardTitle>
                <CardDescription>
                  Update your profile information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Customize your display name, bio, and social links
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notifications</CardTitle>
                <CardDescription>
                  Manage your notification preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Configure email, push, and SMS notifications
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Security</CardTitle>
                <CardDescription>
                  Review your account security
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  View connection history and manage wallet access
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
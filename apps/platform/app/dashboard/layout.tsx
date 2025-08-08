import { Metadata } from 'next';
import ProtectedRoute from '@/components/auth/protected-route';

export const metadata: Metadata = {
  title: 'Dashboard - PoolMind',
  description: 'Your PoolMind dashboard',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
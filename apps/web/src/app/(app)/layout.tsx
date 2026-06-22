'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AppSidebar } from '@/components/app-sidebar';
import { AppHeader } from '@/components/app-header';
import { SocketProvider } from '@/lib/socket-provider';
import { ToastProvider } from '@/lib/toast-provider';
import { NotificationToastManager } from '@/features/notifications/notification-toast-manager';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
    } else if (user.mustChangePassword) {
      router.replace('/change-password');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: 'var(--bg-base)' }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-transparent"
            style={{
              borderTopColor: 'var(--accent-primary)',
              borderRightColor: 'var(--accent-primary)',
            }}
          />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Loading…
          </p>
        </div>
      </div>
    );
  }

  if (!user || user.mustChangePassword) return null;

  return (
    <SocketProvider>
      <ToastProvider>
        <div className="flex min-h-screen" style={{ backgroundColor: 'var(--bg-base)' }}>
          <AppSidebar />
          <div className="flex flex-1 flex-col pl-60">
            <AppHeader />
            <main className="flex-1 overflow-auto pt-14 p-6">{children}</main>
          </div>
        </div>
        {/* Rich notification toasts — outside main flow so they overlay everything */}
        <NotificationToastManager />
      </ToastProvider>
    </SocketProvider>
  );
}

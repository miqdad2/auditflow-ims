'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { token } = useAuth();

  useEffect(() => {
    console.error('[AuditFlow] Page error:', error.message);

    // Report to backend if authenticated
    if (token) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/system-errors/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: error.message?.slice(0, 2000) ?? 'Unknown error',
          stack: error.stack?.slice(0, 5000),
          path: typeof window !== 'undefined' ? window.location.pathname : undefined,
        }),
      }).catch(() => {});
    }
  }, [error, token]);

  return (
    <div
      className="flex flex-1 items-center justify-center p-10"
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-10 text-center"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
      >
        <div
          className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full"
          style={{ backgroundColor: 'var(--state-error-soft)' }}
        >
          <AlertTriangle className="h-7 w-7" style={{ color: 'var(--state-error)' }} />
        </div>
        <h1 className="mb-2 text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Something went wrong
        </h1>
        <p className="mb-7 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          An unexpected error occurred on this page. Your data has not been lost. Please try again or go back to the dashboard.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-lg px-5 py-2.5 text-sm font-semibold"
            style={{ backgroundColor: 'var(--accent-primary)', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            Try again
          </button>
          <a
            href="/dashboard"
            className="rounded-lg px-5 py-2.5 text-sm font-semibold"
            style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-secondary)', textDecoration: 'none' }}
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

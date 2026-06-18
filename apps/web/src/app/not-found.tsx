import { FileQuestion } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      className="flex min-h-screen items-center justify-center p-6"
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-10 text-center"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
      >
        <div
          className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full"
          style={{ backgroundColor: 'var(--accent-soft)' }}
        >
          <FileQuestion className="h-7 w-7" style={{ color: 'var(--accent-primary)' }} />
        </div>
        <h1 className="mb-2 text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Page not found
        </h1>
        <p className="mb-7 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          The page you are looking for does not exist or has been moved. Check the URL or navigate back.
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg px-5 py-2.5 text-sm font-semibold"
            style={{ backgroundColor: 'var(--accent-primary)', color: '#fff' }}
          >
            Go to Dashboard
          </Link>
          <Link
            href="/workspaces"
            className="rounded-lg px-5 py-2.5 text-sm font-semibold"
            style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-secondary)' }}
          >
            View Workspaces
          </Link>
        </div>
      </div>
    </div>
  );
}

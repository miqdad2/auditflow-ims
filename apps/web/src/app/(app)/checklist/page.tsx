'use client';

import Link from 'next/link';
import { ClipboardX, ArrowLeft } from 'lucide-react';

export default function ChecklistPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-disabled)' }}
      >
        <ClipboardX className="h-8 w-8" />
      </div>
      <div className="max-w-sm">
        <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          Audit Checklist — Not Available
        </h2>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          This module has been removed from the active workspace flow.
          Checklist and evidence tracking is managed internally by the ISO/QHSE team.
        </p>
      </div>
      <div className="flex gap-3">
        <Link
          href="/workspaces"
          className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium"
          style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-primary)' }}
        >
          <ArrowLeft className="h-4 w-4" />
          Go to Workspaces
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium"
          style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-secondary)' }}
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}

'use client';

import { Suspense } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import BusinessActionCenter from '@/features/business-actions/business-action-center';
import type { DetectionRule } from '@/features/business-actions/types';

const ALLOWED_ROLES = ['SUPER_ADMIN', 'SUPER_USER'];

function ActionCenterContent() {
  const { user, token } = useAuth();
  const searchParams = useSearchParams();
  const roles = user?.roles ?? [];
  const canAccess = roles.some((r) => ALLOWED_ROLES.includes(r));

  // URL-param initial filters — ?type=OVERDUE_TASK, ?workspaceId=:id
  const initialType = (searchParams.get('type') ?? '') as DetectionRule | '';

  if (!canAccess) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 py-20 text-center">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ backgroundColor: 'var(--state-error-soft)', color: 'var(--state-error)' }}
        >
          <ShieldAlert className="h-7 w-7" />
        </div>
        <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          Access Denied
        </p>
        <p className="max-w-sm text-sm" style={{ color: 'var(--text-muted)' }}>
          The Business Action Center is available to Super User and Super Admin roles only.
          Contact your system administrator if you need access.
        </p>
      </div>
    );
  }

  if (!token) return null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          SUPER USER CONTROL
        </p>
        <h1 className="mt-1 text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Business Action Center
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          System-detected items that require review, delegation, or corrective action.
        </p>
      </div>
      <BusinessActionCenter token={token} initialRuleFilter={initialType} />
    </div>
  );
}

export default function ActionCenterPage() {
  return (
    <Suspense fallback={null}>
      <ActionCenterContent />
    </Suspense>
  );
}

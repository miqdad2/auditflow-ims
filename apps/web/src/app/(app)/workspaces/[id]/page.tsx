/**
 * Workspace detail page — server wrapper.
 *
 * WorkspaceDetailClient is a Client Component that uses useSearchParams()
 * for deep-link task auto-opening (?task=:id&fileId=:id).  Next.js App Router
 * requires useSearchParams() to be wrapped in <Suspense> so the server render
 * can complete while the client-side param reading is deferred.
 *
 * This file stays a Server Component (no 'use client') so it can own the
 * Suspense boundary cleanly.
 */

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import WorkspaceDetailClient from './workspace-client';

interface PageProps { params: Promise<{ id: string }>; }

function WorkspaceLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <Loader2
        className="h-6 w-6 animate-spin"
        style={{ color: 'var(--accent-primary)' }}
      />
    </div>
  );
}

export default function WorkspaceDetailPage({ params }: PageProps) {
  return (
    <Suspense fallback={<WorkspaceLoading />}>
      <WorkspaceDetailClient params={params} />
    </Suspense>
  );
}

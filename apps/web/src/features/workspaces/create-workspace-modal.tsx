'use client';

import { useState, useEffect, FormEvent } from 'react';
import { X, Loader2, Plus, Trash2, Users } from 'lucide-react';
import { apiPostAuth, apiGet } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { WorkspaceSummary } from './types';

interface Props {
  onClose: () => void;
  onCreated: (ws: WorkspaceSummary) => void;
}

interface UserOption { id: string; fullName: string; email: string; }

interface StagedMember {
  userId: string;
  fullName: string;
  email: string;
  roleInWorkspace: string;
}

const ROLE_OPTIONS = [
  { value: 'VIEWER',  label: 'Viewer  — read-only' },
  { value: 'MEMBER',  label: 'Member  — work on tasks/evidence' },
  { value: 'MANAGER', label: 'Manager — manage work & members' },
  { value: 'OWNER',   label: 'Owner   — full control' },
];

export function CreateWorkspaceModal({ onClose, onCreated }: Props) {
  const { token } = useAuth();
  const [name, setName]               = useState('');
  const [description, setDescription] = useState('');
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);

  // Initial members
  const [allUsers, setAllUsers]           = useState<UserOption[]>([]);
  const [stagedMembers, setStagedMembers] = useState<StagedMember[]>([]);
  const [pickerUserId, setPickerUserId]   = useState('');
  const [pickerRole, setPickerRole]       = useState('MEMBER');
  const [memberErrors, setMemberErrors]   = useState<string[]>([]);

  useEffect(() => {
    if (!token) return;
    apiGet<UserOption[]>('/users/search?isActive=true', token)
      .then(setAllUsers)
      .catch(() => setAllUsers([]));
  }, [token]);

  function addStagedMember() {
    if (!pickerUserId) return;
    if (stagedMembers.some((m) => m.userId === pickerUserId)) return;
    const u = allUsers.find((u) => u.id === pickerUserId);
    if (!u) return;
    setStagedMembers((prev) => [...prev, { userId: u.id, fullName: u.fullName, email: u.email, roleInWorkspace: pickerRole }]);
    setPickerUserId('');
    setPickerRole('MEMBER');
  }

  function removeStagedMember(userId: string) {
    setStagedMembers((prev) => prev.filter((m) => m.userId !== userId));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Workspace name is required.'); return; }
    setError('');
    setMemberErrors([]);
    setLoading(true);

    try {
      // Step 1: Create workspace
      const ws = await apiPostAuth<WorkspaceSummary>(
        '/workspaces',
        { name: name.trim(), description: description.trim() || undefined },
        token!,
      );

      // Step 2: Add initial members (best-effort — don't roll back workspace on failure)
      const failures: string[] = [];
      for (const m of stagedMembers) {
        try {
          await apiPostAuth(
            `/workspaces/${ws.id}/members`,
            { userId: m.userId, roleInWorkspace: m.roleInWorkspace },
            token!,
          );
        } catch {
          failures.push(`${m.fullName} (${m.roleInWorkspace})`);
        }
      }

      if (failures.length > 0) {
        setMemberErrors(failures);
        // Still proceed — workspace was created; show partial failure, then notify parent
        setTimeout(() => onCreated(ws), 2000);
      } else {
        onCreated(ws);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace.');
    } finally {
      setLoading(false);
    }
  }

  const availableToAdd = allUsers.filter((u) => !stagedMembers.some((m) => m.userId === u.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div
        className="flex w-full max-w-lg flex-col rounded-2xl shadow-xl"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>New ISO Workspace</h2>
          <button type="button" onClick={onClose} style={{ color: 'var(--text-muted)' }}><X className="h-5 w-5" /></button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <form id="create-ws-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Workspace Name *</label>
              <input
                type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g. ISO 9001:2015 Audit 2026"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-default)')}
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Description</label>
              <textarea
                value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
                rows={2}
                className="w-full resize-none rounded-lg px-3 py-2 text-sm outline-none"
                style={{ backgroundColor: 'var(--bg-muted)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-default)')}
              />
            </div>

            {error && <p className="text-sm" style={{ color: 'var(--state-error)' }}>{error}</p>}
          </form>

          {/* Initial Members section (outside form to avoid nested form) */}
          <div className="mt-4 border-t pt-4" style={{ borderColor: 'var(--border-default)' }}>
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Initial Members</p>
              <span className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>optional — you (creator) are always added as Owner</span>
            </div>

            {/* Member picker */}
            <div className="flex gap-2">
              <select
                value={pickerUserId}
                onChange={(e) => setPickerUserId(e.target.value)}
                className="flex-1 min-w-0 rounded-lg border px-2 py-1.5 text-xs"
                style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-muted)', color: 'var(--text-primary)' }}
              >
                <option value="">Select user to add…</option>
                {availableToAdd.map((u) => (
                  <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>
                ))}
              </select>
              <select
                value={pickerRole}
                onChange={(e) => setPickerRole(e.target.value)}
                className="w-28 shrink-0 rounded-lg border px-2 py-1.5 text-xs"
                style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--bg-muted)', color: 'var(--text-primary)' }}
              >
                {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label.split('—')[0].trim()}</option>)}
              </select>
              <button
                type="button"
                disabled={!pickerUserId}
                onClick={addStagedMember}
                className="flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              >
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>

            {/* Staged list */}
            {stagedMembers.length > 0 && (
              <div className="mt-2 flex flex-col gap-1">
                {stagedMembers.map((m) => (
                  <div
                    key={m.userId}
                    className="flex items-center gap-2 rounded-lg px-3 py-2"
                    style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}
                  >
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                      style={{ backgroundColor: 'var(--accent-primary)' }}>
                      {m.fullName.charAt(0).toUpperCase()}
                    </div>
                    <span className="flex-1 truncate text-xs" style={{ color: 'var(--text-primary)' }}>{m.fullName}</span>
                    <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-primary)' }}>
                      {m.roleInWorkspace}
                    </span>
                    <button type="button" onClick={() => removeStagedMember(m.userId)} style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--state-error, #DC2626)')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Partial failure notice */}
            {memberErrors.length > 0 && (
              <div className="mt-2 rounded-lg border px-3 py-2" style={{ borderColor: 'var(--state-warning, #F59E0B)', backgroundColor: 'var(--state-warning-soft, #FEF3C7)' }}>
                <p className="text-xs font-medium" style={{ color: 'var(--state-warning, #B45309)' }}>
                  Workspace created, but some members could not be added:
                </p>
                <ul className="mt-1 text-xs" style={{ color: 'var(--state-warning, #B45309)' }}>
                  {memberErrors.map((e, i) => <li key={i}>• {e}</li>)}
                </ul>
                <p className="mt-1 text-xs" style={{ color: 'var(--state-warning, #B45309)' }}>
                  Add them manually from the workspace Members tab.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4" style={{ borderTop: '1px solid var(--border-default)' }}>
          <button type="button" onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm"
            style={{ border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
            Cancel
          </button>
          <button
            type="submit"
            form="create-ws-form"
            disabled={loading}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</>
              : stagedMembers.length > 0
                ? `Create & Add ${stagedMembers.length} Member${stagedMembers.length !== 1 ? 's' : ''}`
                : 'Create Workspace'}
          </button>
        </div>
      </div>
    </div>
  );
}

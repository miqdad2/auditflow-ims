'use client';

import { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiPostAuth } from '@/lib/api';
import type { NcrCapaSummary } from './types';

interface Department { id: string; name: string; }
interface Workspace  { id: string; name: string; }

interface Props {
  defaultWorkspaceId?: string;
  onClose: () => void;
  onCreated: (record: NcrCapaSummary) => void;
}

export function CreateNcrModal({ defaultWorkspaceId, onClose, onCreated }: Props) {
  const { user, token } = useAuth();

  const [title, setTitle]             = useState('');
  const [description, setDescription] = useState('');
  const [type, setType]               = useState<'NCR' | 'CAPA' | 'OBSERVATION'>('NCR');
  const [severity, setSeverity]       = useState<'MINOR' | 'MAJOR' | 'CRITICAL' | 'OBSERVATION'>('MINOR');
  const [isoClause, setIsoClause]     = useState('');
  const [dueDate, setDueDate]         = useState('');
  const [ncrNumber, setNcrNumber]     = useState('');
  const [departmentId, setDeptId]     = useState('');
  const [workspaceId, setWsId]        = useState(defaultWorkspaceId ?? '');

  const [departments, setDepartments] = useState<Department[]>([]);
  const [workspaces, setWorkspaces]   = useState<Workspace[]>([]);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

    fetch(`${base}/departments`, { headers }).then(r => r.json()).then(d => {
      if (Array.isArray(d)) setDepartments(d);
    }).catch(() => {});

    fetch(`${base}/workspaces`, { headers }).then(r => r.json()).then(d => {
      if (Array.isArray(d)) setWorkspaces(d);
    }).catch(() => {});
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }

    setSaving(true);
    setError('');
    try {
      const record = await apiPostAuth<NcrCapaSummary>('/ncr-capa', {
        title:        title.trim(),
        description:  description.trim() || undefined,
        type,
        severity,
        isoClause:    isoClause.trim() || undefined,
        dueDate:      dueDate || undefined,
        ncrNumber:    ncrNumber.trim() || undefined,
        departmentId: departmentId || undefined,
        workspaceId:  workspaceId  || undefined,
      }, token ?? '');
      onCreated(record);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create record';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <h2 className="text-base font-semibold text-gray-900">Raise Issue / Corrective Action</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <p className="text-xs text-gray-500 -mt-1">
            Use this to report a problem, assign a corrective action, and track it until verified or closed.
          </p>

          {error && (
            <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="What happened? Describe the issue briefly."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <select value={type} onChange={e => setType(e.target.value as typeof type)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="NCR">Non-Conformity (NCR)</option>
                <option value="CAPA">Corrective Action (CAPA)</option>
                <option value="OBSERVATION">Observation</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
              <select value={severity} onChange={e => setSeverity(e.target.value as typeof severity)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="OBSERVATION">Observation</option>
                <option value="MINOR">Minor</option>
                <option value="MAJOR">Major</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">ISO Clause (optional)</label>
              <input type="text" value={isoClause} onChange={e => setIsoClause(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. 8.4.1" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Issue Reference (optional)</label>
              <input type="text" value={ncrNumber} onChange={e => setNcrNumber(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. ISSUE-2026-001" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
              <select value={departmentId} onChange={e => setDeptId(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— None —</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Workspace</label>
              <select value={workspaceId} onChange={e => setWsId(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— None —</option>
                {workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Due Date</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Optional additional details…" />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Raising…' : 'Raise Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiPostAuth } from '@/lib/api';

interface PasswordRequirement {
  label: string;
  test: (pw: string) => boolean;
}

const REQUIREMENTS: PasswordRequirement[] = [
  { label: 'At least 8 characters',        test: (pw) => pw.length >= 8 },
  { label: 'One uppercase letter (A–Z)',    test: (pw) => /[A-Z]/.test(pw) },
  { label: 'One lowercase letter (a–z)',    test: (pw) => /[a-z]/.test(pw) },
  { label: 'One number (0–9)',              test: (pw) => /\d/.test(pw) },
  { label: 'One special character',         test: (pw) => /[!@#$%^&*()\-_=+[\]{};':"\\|,.<>/?]/.test(pw) },
];

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, token, updateUser, isLoading } = useAuth();

  const [currentPassword, setCurrentPassword]   = useState('');
  const [newPassword, setNewPassword]           = useState('');
  const [confirmPassword, setConfirmPassword]   = useState('');
  const [showCurrent, setShowCurrent]           = useState(false);
  const [showNew, setShowNew]                   = useState(false);
  const [showConfirm, setShowConfirm]           = useState(false);
  const [error, setError]                       = useState('');
  const [loading, setLoading]                   = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!user.mustChangePassword) {
      router.replace(user.dashboardExperience === 'EXECUTIVE' ? '/executive-dashboard' : '/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || !user.mustChangePassword) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: 'var(--bg-base)' }}
      >
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-transparent"
          style={{
            borderTopColor: 'var(--accent-primary)',
            borderRightColor: 'var(--accent-primary)',
          }}
        />
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }
    const allMet = REQUIREMENTS.every((r) => r.test(newPassword));
    if (!allMet) {
      setError('New password does not meet all requirements.');
      return;
    }

    setLoading(true);
    try {
      await apiPostAuth<{ message: string }>(
        '/auth/change-password',
        { currentPassword, newPassword, confirmPassword },
        token!,
      );
      updateUser({ mustChangePassword: false });
      router.replace(user?.dashboardExperience === 'EXECUTIVE' ? '/executive-dashboard' : '/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8 shadow-sm"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
        }}
      >
        {/* Brand */}
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="relative h-14 w-14">
            <Image
              src="/brand/recafco-logo.png"
              alt="RECAFCO"
              fill
              className="rounded-xl object-contain"
              onError={(e) => {
                const t = e.currentTarget as HTMLImageElement;
                t.style.display = 'none';
                const fb = t.nextElementSibling as HTMLElement | null;
                if (fb) fb.style.display = 'flex';
              }}
            />
            <div
              className="absolute inset-0 hidden items-center justify-center rounded-xl text-white font-bold text-2xl"
              style={{ backgroundColor: 'var(--sidebar-bg)' }}
            >
              R
            </div>
          </div>

          <div>
            <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Set Permanent Password
            </h1>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              You are using a temporary password. Create a new permanent password to continue.
            </p>
          </div>
        </div>

        {/* Notice banner */}
        <div
          className="mb-5 rounded-lg px-3 py-2.5 text-xs"
          style={{
            backgroundColor: 'var(--state-warning-soft)',
            color: 'var(--state-warning)',
            border: '1px solid var(--state-warning)',
          }}
        >
          Your account is using a temporary password. You cannot access the system until you create a permanent password. There is no skip or remind-me-later option.
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          {/* Current password */}
          <PasswordField
            id="currentPassword"
            label="Current (Temporary) Password"
            value={currentPassword}
            onChange={setCurrentPassword}
            show={showCurrent}
            onToggleShow={() => setShowCurrent((v) => !v)}
            autoComplete="current-password"
          />

          {/* New password */}
          <PasswordField
            id="newPassword"
            label="New Password"
            value={newPassword}
            onChange={setNewPassword}
            show={showNew}
            onToggleShow={() => setShowNew((v) => !v)}
            autoComplete="new-password"
          />

          {/* Password requirements */}
          {newPassword.length > 0 && (
            <ul className="flex flex-col gap-1">
              {REQUIREMENTS.map((req) => {
                const met = req.test(newPassword);
                return (
                  <li key={req.label} className="flex items-center gap-1.5 text-xs">
                    <CheckCircle2
                      className="h-3.5 w-3.5 shrink-0"
                      style={{ color: met ? 'var(--state-success)' : 'var(--text-disabled)' }}
                    />
                    <span style={{ color: met ? 'var(--state-success)' : 'var(--text-muted)' }}>
                      {req.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Confirm password */}
          <PasswordField
            id="confirmPassword"
            label="Confirm New Password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            show={showConfirm}
            onToggleShow={() => setShowConfirm((v) => !v)}
            autoComplete="new-password"
          />

          {/* Match indicator */}
          {confirmPassword.length > 0 && (
            <p
              className="text-xs"
              style={{
                color:
                  confirmPassword === newPassword
                    ? 'var(--state-success)'
                    : 'var(--state-error)',
              }}
            >
              {confirmPassword === newPassword ? 'Passwords match' : 'Passwords do not match'}
            </p>
          )}

          {/* Error */}
          {error && (
            <div
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
              style={{
                backgroundColor: 'var(--state-error-soft)',
                color: 'var(--state-error)',
              }}
              role="alert"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-60"
            style={{ backgroundColor: loading ? 'var(--accent-hover)' : 'var(--accent-primary)' }}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating password…
              </>
            ) : (
              'Set new password'
            )}
          </button>
        </form>

        <p className="mt-5 text-center text-xs" style={{ color: 'var(--text-disabled)' }}>
          Signed in as <strong>{user.email}</strong>
        </p>
      </div>
    </div>
  );
}

// ── Local sub-component ────────────────────────────────────────────────────────

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  autoComplete?: string;
}

function PasswordField({ id, label, value, onChange, show, onToggleShow, autoComplete }: PasswordFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          required
          className="w-full rounded-lg px-3 py-2 pr-10 text-sm outline-none transition-colors"
          style={{
            backgroundColor: 'var(--bg-muted)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-default)')}
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-2.5 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--text-muted)' }}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

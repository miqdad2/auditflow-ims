'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiPost } from '@/lib/api';
import type { AuthUser } from '@/lib/auth-context';

export default function LoginPage() {
  const router   = useRouter();
  const { login } = useAuth();

  const [loginField, setLoginField] = useState('');
  const [password, setPassword]     = useState('');
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!loginField.trim() || !password.trim()) {
      setError('Please enter your email/username and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await apiPost<{ accessToken: string; user: AuthUser }>(
        '/auth/login',
        { login: loginField.trim(), password },
      );
      login(data.accessToken, data.user);
      // Forced password reset takes priority over dashboard routing.
      if (data.user.mustChangePassword) {
        router.replace('/change-password');
      } else if (data.user.dashboardExperience === 'EXECUTIVE') {
        router.replace('/executive-dashboard');
      } else {
        router.replace('/dashboard');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
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
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          {/* Show real logo if available, else fallback to letter mark */}
          <div className="relative h-14 w-14">
            <Image
              src="/recafco-logo.png"
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
            {/* Fallback letter mark */}
            <div
              className="absolute inset-0 hidden items-center justify-center rounded-xl text-white font-bold text-2xl"
              style={{ backgroundColor: 'var(--sidebar-bg)' }}
            >
              R
            </div>
          </div>

          <div>
            <h1
              className="text-lg font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              RECAFCO AuditFlow IMS
            </h1>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              Internal ISO &amp; QHSE Audit Readiness System
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="login"
              className="text-sm font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              Email or Username
            </label>
            <input
              id="login"
              type="text"
              autoComplete="username"
              value={loginField}
              onChange={(e) => setLoginField(e.target.value)}
              placeholder="admin@recafco.com"
              required
              className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
              style={{
                backgroundColor: 'var(--bg-muted)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-default)')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="password"
              className="text-sm font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 transition-colors"
                style={{ color: 'var(--text-muted)' }}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

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
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-xs" style={{ color: 'var(--text-disabled)' }}>
          For access, contact your IT Administrator.
        </p>
      </div>
    </div>
  );
}

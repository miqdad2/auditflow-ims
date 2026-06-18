'use client';

import {
  createContext, useCallback, useContext, useRef, useState,
} from 'react';

type ToastType = 'info' | 'success' | 'error';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const borderColor = (type: ToastType) => {
    if (type === 'success') return 'var(--state-success)';
    if (type === 'error')   return 'var(--state-error)';
    return 'var(--accent-primary)';
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              minWidth: '260px',
              maxWidth: '360px',
              padding: '10px 14px',
              borderRadius: '10px',
              borderLeft: `3px solid ${borderColor(t.type)}`,
              backgroundColor: 'var(--bg-surface)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              pointerEvents: 'all',
              animation: 'toast-in 0.2s ease',
            }}
          >
            <span style={{ fontSize: '13px', color: 'var(--text-primary)', flex: 1 }}>
              {t.message}
            </span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                padding: '2px',
                color: 'var(--text-muted)',
                fontSize: '14px',
                lineHeight: 1,
                flexShrink: 0,
              }}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

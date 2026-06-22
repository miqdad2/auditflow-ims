'use client';

import { useState, useRef, useEffect, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Loader2 } from 'lucide-react';

export interface BadgeOption {
  value: string;
  label: string;
  bg: string;
  color: string;
}

interface TaskBadgeSelectProps {
  value: string;
  options: BadgeOption[];
  onChange: (newValue: string) => void;
  disabled?: boolean;
  saving?: boolean;
  readOnly?: boolean;
  menuWidth?: number;
  ariaLabel?: string;
}

/**
 * Compact pill-shaped custom select for Task Status and Priority.
 * Renders a floating portal menu to avoid drawer overflow clipping.
 * Fully keyboard-accessible (Tab, Enter/Space, Arrow Up/Down, Escape).
 */
export function TaskBadgeSelect({
  value,
  options,
  onChange,
  disabled = false,
  saving = false,
  readOnly = false,
  menuWidth = 200,
  ariaLabel,
}: TaskBadgeSelectProps) {
  const [open, setOpen]           = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef    = useRef<HTMLDivElement>(null);
  const listboxId  = useId();

  const currentOpt = options.find((o) => o.value === value)
    ?? { value, label: value, bg: 'var(--bg-muted)', color: 'var(--text-muted)' };

  // ── Positioning ─────────────────────────────────────────────────────────────
  const openMenu = useCallback(() => {
    if (!triggerRef.current) return;
    const rect       = triggerRef.current.getBoundingClientRect();
    const estH       = options.length * 40 + 16;
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const flipUp     = spaceBelow < estH && spaceAbove > spaceBelow;
    const rawLeft    = rect.left;
    const left       = Math.max(8, Math.min(rawLeft, window.innerWidth - menuWidth - 8));
    const top        = flipUp ? rect.top - estH - 4 : rect.bottom + 4;

    setMenuStyle({ top, left });
    setHighlighted(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  }, [options, value, menuWidth]);

  // ── Click outside ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node)) return;
      if (menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  // ── Close on scroll (prevents stale portal position) ──────────────────────
  useEffect(() => {
    if (!open) return;
    const onScroll = () => setOpen(false);
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [open]);

  // ── Focus menu when it opens ─────────────────────────────────────────────
  useEffect(() => {
    if (open) menuRef.current?.focus();
  }, [open]);

  // ── Read-only mode (Viewer / no permission) ─────────────────────────────
  if (readOnly) {
    return (
      <span
        className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
        style={{ backgroundColor: currentOpt.bg, color: currentOpt.color }}
      >
        {currentOpt.label}
      </span>
    );
  }

  // ── Trigger keyboard ─────────────────────────────────────────────────────
  function handleTriggerKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (open) setOpen(false);
        else openMenu();
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!open) { openMenu(); }
        else setHighlighted((h) => Math.min(h + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (open) setHighlighted((h) => Math.max(h - 1, 0));
        break;
      case 'Escape':
        setOpen(false);
        break;
    }
  }

  // ── Menu keyboard ────────────────────────────────────────────────────────
  function handleMenuKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlighted((h) => Math.min(h + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlighted((h) => Math.max(h - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlighted >= 0 && highlighted < options.length) {
          commit(options[highlighted].value);
        }
        break;
      case 'Tab':
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        break;
    }
  }

  function commit(newValue: string) {
    onChange(newValue);
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <>
      {/* Trigger pill */}
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={ariaLabel}
        disabled={disabled || saving}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={handleTriggerKeyDown}
        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold
                   transition-all duration-150 select-none cursor-pointer
                   disabled:opacity-60 disabled:cursor-not-allowed
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
        style={{
          backgroundColor: currentOpt.bg,
          color:           currentOpt.color,
          borderColor:     'var(--border-default)',
        }}
      >
        <span className="leading-none whitespace-nowrap">{currentOpt.label}</span>
        {saving ? (
          <Loader2 className="h-3 w-3 flex-shrink-0 animate-spin" />
        ) : (
          <ChevronDown
            className={`h-3 w-3 flex-shrink-0 transition-transform duration-150 ${open ? '-rotate-180' : ''}`}
          />
        )}
      </button>

      {/* Floating menu (portal) */}
      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          tabIndex={-1}
          onKeyDown={handleMenuKeyDown}
          className="fixed z-[9999] rounded-xl overflow-hidden py-2 focus:outline-none"
          style={{
            top:             menuStyle.top,
            left:            menuStyle.left,
            width:           menuWidth,
            backgroundColor: 'var(--bg-surface)',
            border:          '1px solid var(--border-default)',
            boxShadow:       '0 4px 8px -2px rgba(0,0,0,0.08), 0 12px 28px -4px rgba(0,0,0,0.12)',
          }}
        >
          {options.map((opt, i) => {
            const isSelected    = opt.value === value;
            const isHighlighted = i === highlighted;
            return (
              <div
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => commit(opt.value)}
                onMouseEnter={() => setHighlighted(i)}
                className="flex items-center justify-between px-3 cursor-pointer transition-colors"
                style={{
                  minHeight:       '38px',
                  backgroundColor: isHighlighted ? 'var(--bg-subtle)' : 'transparent',
                }}
              >
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                  style={{ backgroundColor: opt.bg, color: opt.color }}
                >
                  {opt.label}
                </span>
                {isSelected && (
                  <Check
                    className="h-3.5 w-3.5 ml-2 flex-shrink-0"
                    style={{ color: 'var(--accent-primary)' }}
                  />
                )}
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
}

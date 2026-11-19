'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { SNAPPY_SPRING } from '@/lib/motion';
import { cn } from '@/lib/utils';

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'sage' | 'outline' | 'ghost' | 'danger' | 'terracotta';
    size?: 'sm' | 'md' | 'lg';
  }
>(({ className, variant = 'primary', size = 'md', type = 'button', children, ...props }, ref) => {
  const variants = {
    primary:
      'bg-[var(--accent-coral)] text-white hover:bg-[var(--accent-coral-deep)] shadow-[0_8px_24px_-8px_var(--accent-coral)] disabled:opacity-45 disabled:pointer-events-none',
    terracotta:
      'bg-[var(--accent-coral-soft)] text-[var(--accent-coral)] border border-[var(--accent-coral)]/35 hover:bg-[var(--accent-coral)]/22 disabled:opacity-45 disabled:pointer-events-none',
    secondary:
      'bg-[var(--ink-primary)] text-[var(--surface-canvas)] hover:opacity-90 shadow-sm disabled:opacity-45 disabled:pointer-events-none',
    sage:
      'bg-[var(--accent-sage)] text-white font-semibold hover:brightness-95 shadow-[0_8px_22px_-10px_var(--accent-sage)] disabled:opacity-45 disabled:pointer-events-none',
    outline:
      'bg-[var(--surface-glass)] text-[var(--ink-primary)] border border-[var(--border-hairline)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-subtle)] disabled:opacity-45 disabled:pointer-events-none',
    ghost:
      'bg-transparent text-[var(--ink-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--ink-primary)] disabled:opacity-45',
    danger:
      'bg-[var(--accent-danger)] text-white hover:brightness-90 disabled:opacity-45 disabled:pointer-events-none',
  };
  const sizes = {
    sm: 'h-8 px-3 text-xs rounded-xl',
    md: 'h-10 px-4 text-sm rounded-xl',
    lg: 'h-11 px-5 text-sm rounded-2xl',
  };

  return (
    <motion.button
      ref={ref}
      type={type}
      whileTap={props.disabled ? undefined : { scale: 0.97 }}
      transition={SNAPPY_SPRING}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-coral)]/50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...(props as Record<string, unknown>)}
    >
      {children}
    </motion.button>
  );
});
Button.displayName = 'Button';

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'terracotta' | 'sage' | 'ochre' | 'charcoal' | 'danger';
  className?: string;
}) {
  const tones = {
    neutral:
      'bg-[var(--surface-subtle)] text-[var(--ink-secondary)] border-[var(--border-hairline)]',
    terracotta:
      'bg-[var(--accent-coral-soft)] text-[var(--accent-coral)] border-[var(--accent-coral)]/25',
    sage:
      'bg-[var(--accent-sage-soft)] text-[var(--accent-sage)] border-[var(--accent-sage)]/30',
    ochre:
      'bg-[var(--accent-amber-soft)] text-[var(--accent-amber)] border-[var(--accent-amber)]/30',
    charcoal:
      'bg-[var(--ink-primary)] text-[var(--surface-canvas)] border-transparent',
    danger:
      'bg-[var(--accent-danger-soft)] text-[var(--accent-danger)] border-[var(--accent-danger)]/25',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Switch({
  checked,
  onCheckedChange,
  id,
  'aria-label': ariaLabel,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (val: boolean) => void;
  id?: string;
  'aria-label'?: string;
  disabled?: boolean;
}) {
  return (
    <SwitchPrimitive.Root
      id={id}
      aria-label={ariaLabel}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-[var(--border-hairline)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-coral)]/50 disabled:opacity-50',
        checked ? 'bg-[var(--accent-sage)]' : 'bg-[var(--surface-subtle)]',
      )}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'pointer-events-none block h-5 w-5 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export function Slider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  'aria-label': ariaLabel,
}: {
  value: number[];
  onValueChange: (val: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  'aria-label'?: string;
}) {
  return (
    <SliderPrimitive.Root
      aria-label={ariaLabel}
      value={value}
      onValueChange={onValueChange}
      min={min}
      max={max}
      step={step}
      className="relative flex w-full touch-none select-none items-center py-2"
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-[var(--surface-subtle)] border border-[var(--border-hairline)]">
        <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-[var(--accent-coral)] to-[var(--accent-amber)]" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-label={ariaLabel || 'Wavelength slider thumb'}
        className="block h-5 w-5 rounded-full border-2 border-[var(--accent-coral)] bg-[var(--surface-elevated)] shadow-md transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-coral)]/50"
      />
    </SliderPrimitive.Root>
  );
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[94vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-6 text-[var(--ink-primary)] shadow-2xl focus:outline-none max-h-[88vh] overflow-y-auto">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <DialogPrimitive.Title className="font-editorial text-2xl font-normal text-[var(--ink-primary)]">
                {title}
              </DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="mt-1 text-xs text-[var(--ink-secondary)]">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              aria-label="Close modal"
              className="rounded-xl p-1.5 text-[var(--ink-secondary)] hover:bg-[var(--surface-subtle)] cursor-pointer"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function SpotlightCard({
  children,
  className,
  onPointerMove,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--spot-x', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--spot-y', `${e.clientY - rect.top}px`);
    onPointerMove?.(e);
  };

  return (
    <div
      onPointerMove={handlePointerMove}
      className={cn('editorial-bento spotlight-card rounded-3xl', className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export function RadialScoreRing({
  label,
  value,
  accentColor = 'var(--accent-coral)',
  size = 68,
}: {
  label: string;
  value: number;
  accentColor?: string;
  size?: number;
}) {
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="flex flex-col items-center rounded-2xl border border-[var(--border-hairline)] bg-[var(--surface-subtle)]/70 p-3 text-center">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--border-hairline)"
            strokeWidth={stroke}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={accentColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <span className="font-mono-label absolute text-xs font-semibold text-[var(--ink-primary)]">
          {clamped}%
        </span>
      </div>
      <span className="mt-2 text-[11px] font-medium text-[var(--ink-secondary)]">{label}</span>
    </div>
  );
}

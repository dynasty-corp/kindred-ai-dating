'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'sage' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
  }
>(({ className, variant = 'primary', size = 'md', type = 'button', ...props }, ref) => {
  const variants = {
    primary:
      'bg-[#D96B4F] text-white hover:bg-[#B85137] shadow-sm disabled:opacity-50 disabled:pointer-events-none',
    secondary:
      'bg-[#15181C] text-[#FAF7F2] hover:bg-[#2A2E35] shadow-sm disabled:opacity-50 disabled:pointer-events-none',
    sage:
      'bg-[#6E8F78] text-white hover:bg-[#4E6E58] shadow-sm disabled:opacity-50 disabled:pointer-events-none',
    outline:
      'bg-white/90 text-[#15181C] border border-[#DFD7CA] hover:bg-[#F2ECE3] disabled:opacity-50 disabled:pointer-events-none',
    ghost:
      'bg-transparent text-[#535963] hover:bg-[#F2ECE3] hover:text-[#15181C] disabled:opacity-50',
    danger:
      'bg-[#9B3B2E] text-white hover:bg-[#7D2D22] disabled:opacity-50 disabled:pointer-events-none',
  };
  const sizes = {
    sm: 'h-8 px-3 text-xs rounded-lg',
    md: 'h-10 px-4 text-sm rounded-xl',
    lg: 'h-11 px-5 text-sm rounded-xl',
  };

  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D96B4F]/50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
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
    neutral: 'bg-[#F2ECE3] text-[#535963] border-[#E4DDD2]',
    terracotta: 'bg-[#D96B4F]/12 text-[#B85137] border-[#D96B4F]/25',
    sage: 'bg-[#6E8F78]/14 text-[#42614C] border-[#6E8F78]/30',
    ochre: 'bg-[#C89B54]/15 text-[#8A6427] border-[#C89B54]/30',
    charcoal: 'bg-[#15181C] text-[#FAF7F2] border-[#15181C]',
    danger: 'bg-[#9B3B2E]/12 text-[#9B3B2E] border-[#9B3B2E]/25',
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
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D96B4F]/50 disabled:opacity-50',
        checked ? 'bg-[#6E8F78]' : 'bg-[#D5CDC1]',
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
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-[#E4DDD2]">
        <SliderPrimitive.Range className="absolute h-full bg-[#D96B4F]" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-label={ariaLabel || 'Wavelength slider thumb'}
        className="block h-5 w-5 rounded-full border-2 border-[#D96B4F] bg-white shadow-md transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D96B4F]/50"
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
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#15181C]/45 backdrop-blur-xs" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[94vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#E4DDD2] bg-[#FAF7F2] p-6 shadow-2xl focus:outline-none max-h-[88vh] overflow-y-auto">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <DialogPrimitive.Title className="font-editorial text-xl font-semibold text-[#15181C]">
                {title}
              </DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="mt-1 text-xs text-[#535963]">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              aria-label="Close modal"
              className="rounded-lg p-1.5 text-[#535963] hover:bg-[#E4DDD2]/60"
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

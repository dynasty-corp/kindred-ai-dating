'use client';

import dynamic from 'next/dynamic';

export const AuraShaderDynamic = dynamic(
  () => import('./AuraShaderCanvas').then((mod) => mod.AuraShaderCanvas),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[2rem]"
        style={{
          background:
            'radial-gradient(circle at 22% 24%, var(--accent-coral-soft), transparent 52%), radial-gradient(circle at 78% 68%, var(--accent-amber-soft), transparent 56%)',
        }}
      />
    ),
  },
);

export const ResonanceOrbDynamic = dynamic(
  () => import('./ResonanceOrbWebGL').then((mod) => mod.ResonanceOrbWebGL),
  {
    ssr: false,
    loading: () => (
      <div className="h-60 w-full animate-pulse rounded-3xl border border-[var(--border-hairline)] bg-[var(--surface-subtle)]/50" />
    ),
  },
);

export const DreamGlobeDynamic = dynamic(
  () => import('./DreamGlobeWebGL').then((mod) => mod.DreamGlobeWebGL),
  {
    ssr: false,
    loading: () => (
      <div className="h-72 w-full animate-pulse rounded-3xl border border-[var(--border-hairline)] bg-[var(--surface-subtle)]/50" />
    ),
  },
);

'use client';

import type { AvatarConfig } from '@/lib/types/schemas';

export function AvatarPortrait({
  config,
  name,
  size = 48,
}: {
  config: AvatarConfig;
  name: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      role="img"
      aria-label={`${name} portrait`}
      className="shrink-0 rounded-2xl border border-[#E4DDD2] shadow-xs"
    >
      <rect width="80" height="80" rx="18" fill={config.accentColor} fillOpacity="0.18" />
      <circle cx="40" cy="74" r="24" fill={config.accentColor} />
      <rect x="34" y="47" width="12" height="12" rx="5" fill={config.skinTone} />
      {/* Hair back */}
      {config.hairStyle.includes('long') || config.hairStyle.includes('wavy') ? (
        <ellipse cx="40" cy="36" rx="22" ry="22" fill={config.hairColor} />
      ) : null}
      {/* Face */}
      <circle cx="40" cy="35" r="17" fill={config.skinTone} />
      {/* Hair top */}
      <path
        d="M22 33 C22 18, 58 18, 58 33 C52 25, 28 25, 22 33 Z"
        fill={config.hairColor}
      />
      {/* Eyes */}
      <circle cx="34" cy="35" r="2" fill="#15181C" />
      {config.expression === 'playful_wink' ? (
        <path d="M43 35 Q46 33 49 35" stroke="#15181C" strokeWidth="2" fill="none" strokeLinecap="round" />
      ) : (
        <circle cx="46" cy="35" r="2" fill="#15181C" />
      )}
      {/* Smile */}
      <path
        d={
          config.expression === 'calm_gaze'
            ? 'M35 43 Q40 45 45 43'
            : 'M34 42 Q40 47 46 42'
        }
        stroke="#15181C"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      {/* Accessory */}
      {config.accessory === 'glasses' && (
        <g stroke="#15181C" strokeWidth="1.6" fill="none">
          <circle cx="34" cy="35" r="5" />
          <circle cx="46" cy="35" r="5" />
          <line x1="39" y1="35" x2="41" y2="35" />
        </g>
      )}
      {config.accessory === 'earrings' && (
        <g fill="#C89B54">
          <circle cx="22" cy="40" r="2" />
          <circle cx="58" cy="40" r="2" />
        </g>
      )}
    </svg>
  );
}

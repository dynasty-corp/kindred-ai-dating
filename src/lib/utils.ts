import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function createId(prefix: string): string {
  const uuid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}-${uuid}`;
}

export function clampScore(value: number, min = 0, max = 100): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function formatTimestamp(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export const FORBIDDEN_OBJECT_KEYS = new Set<string>([
  '__proto__',
  'constructor',
  'prototype',
  'toString',
  'valueOf',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'toLocaleString',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
]);

export function isSafeIdentifier(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 128) return false;
  if (FORBIDDEN_OBJECT_KEYS.has(trimmed)) return false;
  return /^[a-zA-Z0-9._-]+$/.test(trimmed);
}

export function hasForbiddenKeysDeep(value: unknown, depth = 0): boolean {
  if (depth > 12 || value === null || typeof value !== 'object') return false;
  if (Array.isArray(value)) {
    return value.some((item) => hasForbiddenKeysDeep(item, depth + 1));
  }
  const obj = value as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (FORBIDDEN_OBJECT_KEYS.has(key)) return true;
    if (hasForbiddenKeysDeep(obj[key], depth + 1)) return true;
  }
  return false;
}

export function getOwnSafe<T>(map: Record<string, T> | undefined | null, key: string): T | undefined {
  if (!map || !isSafeIdentifier(key)) return undefined;
  if (!Object.prototype.hasOwnProperty.call(map, key)) return undefined;
  return map[key];
}

export function setOwnSafe<T>(map: Record<string, T>, key: string, value: T): boolean {
  if (!isSafeIdentifier(key)) return false;
  Object.defineProperty(map, key, {
    value,
    writable: true,
    enumerable: true,
    configurable: true,
  });
  return true;
}

export function deleteOwnSafe<T>(map: Record<string, T>, key: string): boolean {
  if (!isSafeIdentifier(key)) return false;
  if (!Object.prototype.hasOwnProperty.call(map, key)) return false;
  return delete map[key];
}

export function canonicalPairKey(userAId: string, userBId: string): string {
  return userAId < userBId ? `${userAId}::${userBId}` : `${userBId}::${userAId}`;
}

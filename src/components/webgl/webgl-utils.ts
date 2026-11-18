'use client';

import { useSyncExternalStore } from 'react';

function subscribeReducedMotion(callback: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

function getReducedMotionSnapshot(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribeReducedMotion, getReducedMotionSnapshot, () => false);
}

export function isWebGLAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl')),
    );
  } catch {
    return false;
  }
}

const CITY_COORDS: Array<[string, number, number]> = [
  ['kyoto', 35.0116, 135.7681],
  ['tokyo', 35.6762, 139.6503],
  ['osaka', 34.6937, 135.5023],
  ['naoshima', 34.4601, 133.9956],
  ['kanazawa', 36.5613, 136.6562],
  ['lisbon', 38.7223, -9.1393],
  ['porto', 41.1579, -8.6291],
  ['sintra', 38.8029, -9.3817],
  ['oaxaca', 17.0732, -96.7266],
  ['mexico city', 19.4326, -99.1332],
  ['san francisco', 37.7749, -122.4194],
  ['new york', 40.7128, -74.006],
  ['seattle', 47.6062, -122.3321],
  ['chicago', 41.8781, -87.6298],
  ['austin', 30.2672, -97.7431],
  ['reykjavik', 64.1466, -21.9426],
  ['edinburgh', 55.9533, -3.1883],
  ['london', 51.5072, -0.1276],
  ['paris', 48.8566, 2.3522],
  ['lyon', 45.764, 4.8357],
  ['barcelona', 41.3874, 2.1686],
  ['madrid', 40.4168, -3.7038],
  ['seville', 37.3891, -5.9845],
  ['rome', 41.9028, 12.4964],
  ['florence', 43.7696, 11.2558],
  ['amalfi', 40.6333, 14.6029],
  ['venice', 45.4408, 12.3155],
  ['bologna', 44.4949, 11.3426],
  ['copenhagen', 55.6761, 12.5683],
  ['stockholm', 59.3293, 18.0686],
  ['zurich', 47.3769, 8.5417],
  ['vienna', 48.2082, 16.3738],
  ['prague', 50.0755, 14.4378],
  ['istanbul', 41.0082, 28.9784],
  ['athens', 37.9838, 23.7275],
  ['marrakesh', 31.6295, -7.9811],
  ['marrakech', 31.6295, -7.9811],
  ['cape town', -33.9249, 18.4241],
  ['seoul', 37.5665, 126.978],
  ['taipei', 25.033, 121.5654],
  ['chiang mai', 18.7883, 98.9853],
  ['melbourne', -37.8136, 144.9631],
  ['sydney', -33.8688, 151.2093],
  ['queenstown', -45.0312, 168.6626],
  ['vancouver', 49.2827, -123.1207],
  ['montreal', 45.5017, -73.5673],
  ['buenos aires', -34.6037, -58.3816],
  ['patagonia', -50.9423, -73.4068],
  ['rio', -22.9068, -43.1729],
  ['tbilisi', 41.7151, 44.8271],
];

export function resolveCityCoordinates(cityLabel: string): { lat: number; lng: number } {
  const lower = cityLabel.toLowerCase();
  for (const [name, lat, lng] of CITY_COORDS) {
    if (lower.includes(name)) {
      return { lat, lng };
    }
  }
  let hash = 0;
  for (let i = 0; i < lower.length; i += 1) {
    hash = (hash * 31 + lower.charCodeAt(i)) >>> 0;
  }
  const lat = ((hash % 96) - 48) * 1.1;
  const lng = (((hash >>> 8) % 320) - 160) * 1.0;
  return { lat, lng };
}

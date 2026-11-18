'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import * as THREE from 'three';
import type { KindredTheme } from '@/lib/theme';
import { isWebGLAvailable, usePrefersReducedMotion } from './webgl-utils';

const subscribeNoop = () => () => {};

export function ResonanceOrbWebGL({
  turnsVisible,
  totalTurns,
  overallScore,
  isRunning,
  userAgentName,
  candidateAgentName,
  theme,
}: {
  turnsVisible: number;
  totalTurns: number;
  overallScore?: number;
  isRunning?: boolean;
  userAgentName: string;
  candidateAgentName: string;
  theme: KindredTheme;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const webglSupported = useSyncExternalStore(subscribeNoop, isWebGLAvailable, () => false);
  const [contextFailed, setContextFailed] = useState(false);

  const progress =
    totalTurns > 0 ? Math.max(0.08, Math.min(1, turnsVisible / totalTurns)) : isRunning ? 0.45 : 0.12;
  const scoreNorm = overallScore ? Math.max(0.2, Math.min(1, overallScore / 100)) : 0.5;
  const matchedPulse = Boolean(overallScore && overallScore >= 80 && turnsVisible >= totalTurns);

  const stateRef = useRef({
    progress,
    scoreNorm,
    matchedPulse,
    isRunning: Boolean(isRunning),
    theme,
  });

  useEffect(() => {
    stateRef.current = {
      progress,
      scoreNorm,
      matchedPulse,
      isRunning: Boolean(isRunning),
      theme,
    };
  }, [progress, scoreNorm, matchedPulse, isRunning, theme]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || reducedMotion || !webglSupported) return;

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    const width = Math.max(220, container.clientWidth);
    const height = Math.max(220, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0.25, 4.4);

    // Core subtle geodesic wireframe
    const icoGeo = new THREE.IcosahedronGeometry(0.95, 1);
    const icoMat = new THREE.MeshBasicMaterial({
      color: stateRef.current.theme === 'alabaster' ? 0x54505e : 0xb5aebe,
      wireframe: true,
      transparent: true,
      opacity: stateRef.current.theme === 'alabaster' ? 0.16 : 0.14,
    });
    const coreWire = new THREE.Mesh(icoGeo, icoMat);
    scene.add(coreWire);

    // Fibonacci particle resonance cloud
    const particleCount = 190;
    const positions = new Float32Array(particleCount * 3);
    const basePositions = new Float32Array(particleCount * 3);
    const phi = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < particleCount; i += 1) {
      const y = 1 - (i / (particleCount - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = phi * i;
      const rad = 1.05 + (i % 5) * 0.04;
      const x = Math.cos(theta) * r * rad;
      const z = Math.sin(theta) * r * rad;
      const py = y * rad;
      positions[i * 3] = x;
      positions[i * 3 + 1] = py;
      positions[i * 3 + 2] = z;
      basePositions[i * 3] = x;
      basePositions[i * 3 + 1] = py;
      basePositions[i * 3 + 2] = z;
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xff6b5b,
      size: 0.045,
      transparent: true,
      opacity: 0.72,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Two orbital ribbons: Coral (User Wingman) & Amber (Candidate Wingman)
    const SEGMENTS = 140;
    const ribbonAPoints = new Float32Array(SEGMENTS * 3);
    const ribbonBPoints = new Float32Array(SEGMENTS * 3);
    const ribbonAGeo = new THREE.BufferGeometry();
    const ribbonBGeo = new THREE.BufferGeometry();
    ribbonAGeo.setAttribute('position', new THREE.BufferAttribute(ribbonAPoints, 3));
    ribbonBGeo.setAttribute('position', new THREE.BufferAttribute(ribbonBPoints, 3));

    const ribbonAMat = new THREE.LineBasicMaterial({
      color: 0xff6b5b,
      transparent: true,
      opacity: 0.92,
    });
    const ribbonBMat = new THREE.LineBasicMaterial({
      color: 0xf5a623,
      transparent: true,
      opacity: 0.92,
    });

    const ribbonA = new THREE.LineLoop(ribbonAGeo, ribbonAMat);
    const ribbonB = new THREE.LineLoop(ribbonBGeo, ribbonBMat);
    const ribbonGroup = new THREE.Group();
    ribbonGroup.add(ribbonA);
    ribbonGroup.add(ribbonB);
    scene.add(ribbonGroup);

    // Subtle secondary halo rings for depth
    const ribbonAInnerGeo = new THREE.BufferGeometry();
    const ribbonBInnerGeo = new THREE.BufferGeometry();
    ribbonAInnerGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(SEGMENTS * 3), 3),
    );
    ribbonBInnerGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(SEGMENTS * 3), 3),
    );
    const ribbonAInner = new THREE.LineLoop(
      ribbonAInnerGeo,
      new THREE.LineBasicMaterial({ color: 0xff6b5b, transparent: true, opacity: 0.4 }),
    );
    const ribbonBInner = new THREE.LineLoop(
      ribbonBInnerGeo,
      new THREE.LineBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.42 }),
    );
    ribbonGroup.add(ribbonAInner, ribbonBInner);

    const resizeObserver = new ResizeObserver(() => {
      if (!renderer || !container) return;
      const w = Math.max(200, container.clientWidth);
      const h = Math.max(200, container.clientHeight);
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    resizeObserver.observe(container);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setContextFailed(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    let rafId = 0;
    const clock = new THREE.Clock();
    let smoothProgress = stateRef.current.progress;

    const tick = () => {
      rafId = window.requestAnimationFrame(tick);
      if (document.hidden || !renderer) return;

      const t = clock.getElapsedTime();
      const s = stateRef.current;
      smoothProgress += (s.progress - smoothProgress) * 0.06;

      // As conversation turns progress, the two ribbons draw closer and weave tightly
      const separation = THREE.MathUtils.lerp(0.68, 0.11, smoothProgress);
      const waveAmp = THREE.MathUtils.lerp(0.18, 0.34, smoothProgress);
      const pulse = s.matchedPulse ? 1 + Math.sin(t * 3.1) * 0.065 : 1 + Math.sin(t * 1.4) * 0.02;

      const posAttrA = ribbonAGeo.getAttribute('position') as THREE.BufferAttribute;
      const posAttrB = ribbonBGeo.getAttribute('position') as THREE.BufferAttribute;
      const posAttrA2 = ribbonAInnerGeo.getAttribute('position') as THREE.BufferAttribute;
      const posAttrB2 = ribbonBInnerGeo.getAttribute('position') as THREE.BufferAttribute;

      for (let i = 0; i < SEGMENTS; i += 1) {
        const a = (i / SEGMENTS) * Math.PI * 2;
        const radiusA = (1.38 + Math.sin(a * 3 + t * 1.5) * waveAmp * 0.45) * pulse;
        const radiusB = (1.38 + Math.cos(a * 3 - t * 1.4) * waveAmp * 0.45) * pulse;

        posAttrA.setXYZ(
          i,
          Math.cos(a) * radiusA,
          Math.sin(a * 2 + t * 1.2) * 0.36 + separation * 0.5,
          Math.sin(a) * radiusA,
        );
        posAttrB.setXYZ(
          i,
          Math.cos(a + 0.35) * radiusB,
          Math.cos(a * 2 - t * 1.1) * 0.36 - separation * 0.5,
          Math.sin(a + 0.35) * radiusB,
        );
        posAttrA2.setXYZ(
          i,
          Math.cos(a) * (radiusA * 0.86),
          Math.sin(a * 3 + t * 0.9) * 0.25 + separation * 0.28,
          Math.sin(a) * (radiusA * 0.86),
        );
        posAttrB2.setXYZ(
          i,
          Math.cos(a - 0.25) * (radiusB * 0.86),
          Math.cos(a * 3 - t * 0.95) * 0.25 - separation * 0.28,
          Math.sin(a - 0.25) * (radiusB * 0.86),
        );
      }
      posAttrA.needsUpdate = true;
      posAttrB.needsUpdate = true;
      posAttrA2.needsUpdate = true;
      posAttrB2.needsUpdate = true;

      const pAttr = particleGeo.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < particleCount; i += 1) {
        const breathe = pulse + Math.sin(t * 1.7 + i * 0.2) * 0.035;
        pAttr.setXYZ(
          i,
          basePositions[i * 3] * breathe,
          basePositions[i * 3 + 1] * breathe,
          basePositions[i * 3 + 2] * breathe,
        );
      }
      pAttr.needsUpdate = true;

      particleMat.color.setHex(
        s.matchedPulse ? 0x34d399 : s.theme === 'alabaster' ? 0xd96b4f : 0xff6b5b,
      );
      icoMat.color.setHex(s.theme === 'alabaster' ? 0x54505e : 0xb5aebe);
      icoMat.opacity = s.theme === 'alabaster' ? 0.16 : 0.14;

      const spinSpeed = s.isRunning ? 0.65 : 0.24;
      coreWire.rotation.y = t * spinSpeed * 0.6;
      coreWire.rotation.x = Math.sin(t * 0.35) * 0.22;
      particles.rotation.y = -t * spinSpeed * 0.45;
      ribbonGroup.rotation.y = t * spinSpeed;
      ribbonGroup.rotation.z = Math.sin(t * 0.45) * 0.28;

      renderer.render(scene, camera);
    };
    tick();

    return () => {
      window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      if (renderer) {
        renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
        if (renderer.domElement.parentNode === container) {
          container.removeChild(renderer.domElement);
        }
        renderer.dispose();
      }
      icoGeo.dispose();
      icoMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      ribbonAGeo.dispose();
      ribbonBGeo.dispose();
      ribbonAMat.dispose();
      ribbonBMat.dispose();
      ribbonAInnerGeo.dispose();
      ribbonBInnerGeo.dispose();
    };
  }, [reducedMotion, webglSupported]);

  const showFallbackSvg = reducedMotion || !webglSupported || contextFailed;

  return (
    <div
      className="relative flex h-60 w-full flex-col justify-between overflow-hidden rounded-3xl border border-[var(--border-hairline)] p-4"
      style={{
        background:
          theme === 'nocturne'
            ? 'radial-gradient(circle at 50% 45%, rgba(255, 107, 91, 0.16), rgba(245, 166, 35, 0.08) 45%, rgba(16, 14, 24, 0.96) 80%)'
            : 'radial-gradient(circle at 50% 45%, rgba(217, 107, 79, 0.14), rgba(200, 155, 84, 0.09) 48%, rgba(250, 247, 242, 0.98) 82%)',
      }}
    >
      <div className="relative z-10 flex items-center justify-between text-[11px]">
        <span className="inline-flex items-center gap-1.5 font-medium text-[var(--ink-primary)]">
          <span className="h-2 w-2 rounded-full bg-[var(--accent-coral)]" />
          {userAgentName}
        </span>
        <span className="font-mono-label text-[10px] uppercase tracking-wider text-[var(--ink-secondary)]">
          {matchedPulse
            ? 'Harmonic Match Resonance'
            : isRunning
              ? 'Live Agent Negotiation'
              : `Turn Sync ${turnsVisible}/${Math.max(1, totalTurns)}`}
        </span>
        <span className="inline-flex items-center gap-1.5 font-medium text-[var(--ink-primary)]">
          {candidateAgentName}
          <span className="h-2 w-2 rounded-full bg-[var(--accent-amber)]" />
        </span>
      </div>

      <div ref={containerRef} className="absolute inset-0" />

      {showFallbackSvg && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 220 140" className="h-44 w-64" aria-hidden="true">
            <ellipse
              cx="110"
              cy="70"
              rx="66"
              ry={34 - progress * 14}
              fill="none"
              stroke="var(--accent-coral)"
              strokeWidth="1.6"
              strokeOpacity="0.85"
              transform="rotate(-14 110 70)"
            />
            <ellipse
              cx="110"
              cy="70"
              rx="66"
              ry={34 - progress * 14}
              fill="none"
              stroke="var(--accent-amber)"
              strokeWidth="1.6"
              strokeOpacity="0.85"
              transform="rotate(14 110 70)"
            />
            <circle
              cx="110"
              cy="70"
              r={matchedPulse ? 24 : 18}
              fill={matchedPulse ? 'var(--accent-sage)' : 'var(--accent-coral)'}
              fillOpacity="0.2"
              stroke={matchedPulse ? 'var(--accent-sage)' : 'var(--accent-coral)'}
              strokeWidth="1.5"
            />
          </svg>
        </div>
      )}

      <div className="relative z-10 flex items-center justify-between text-[10px] text-[var(--ink-muted)]">
        <span>Coral Filament · Your Wingman</span>
        <span>Amber Filament · Candidate Wingman</span>
      </div>
    </div>
  );
}

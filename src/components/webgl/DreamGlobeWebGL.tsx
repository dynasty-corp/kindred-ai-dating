'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import * as THREE from 'three';
import type { KindredTheme } from '@/lib/theme';
import { isWebGLAvailable, resolveCityCoordinates, usePrefersReducedMotion } from './webgl-utils';

const subscribeNoop = () => () => {};

export interface GlobeStop {
  dayRange: string;
  city: string;
  highlight: string;
}

function latLngToVec3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

export function DreamGlobeWebGL({
  stops,
  selectedStopIndex,
  onSelectStop,
  theme,
}: {
  stops: GlobeStop[];
  selectedStopIndex: number;
  onSelectStop: (index: number) => void;
  theme: KindredTheme;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const webglSupported = useSyncExternalStore(subscribeNoop, isWebGLAvailable, () => false);
  const [contextFailed, setContextFailed] = useState(false);

  const geoStops = useMemo(
    () =>
      stops.map((s, idx) => ({
        ...s,
        idx,
        ...resolveCityCoordinates(s.city),
      })),
    [stops],
  );

  const selectedRef = useRef(selectedStopIndex);
  const themeRef = useRef(theme);
  const onSelectRef = useRef(onSelectStop);

  useEffect(() => {
    selectedRef.current = selectedStopIndex;
  }, [selectedStopIndex]);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    onSelectRef.current = onSelectStop;
  }, [onSelectStop]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || reducedMotion || !webglSupported || geoStops.length === 0) return;

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

    const width = Math.max(240, container.clientWidth);
    const height = Math.max(240, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.cursor = 'grab';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0.15, 4.35);

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const GLOBE_RADIUS = 1.32;

    // Minimalist glass/wire sphere
    const sphereGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 36, 28);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: themeRef.current === 'alabaster' ? 0xe4ddd2 : 0x1e1a2b,
      wireframe: true,
      transparent: true,
      opacity: themeRef.current === 'alabaster' ? 0.35 : 0.25,
    });
    const wireframeSphere = new THREE.Mesh(sphereGeo, sphereMat);
    globeGroup.add(wireframeSphere);

    // Inner core glow sphere
    const innerGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 0.985, 32, 24);
    const innerMat = new THREE.MeshBasicMaterial({
      color: themeRef.current === 'alabaster' ? 0xfaf7f2 : 0x100e17,
      transparent: true,
      opacity: 0.82,
    });
    const innerSphere = new THREE.Mesh(innerGeo, innerMat);
    globeGroup.add(innerSphere);

    // Subtle Fibonacci celestial lattice points
    const dotCount = 380;
    const dotPositions = new Float32Array(dotCount * 3);
    const phi = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < dotCount; i += 1) {
      const y = 1 - (i / (dotCount - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = phi * i;
      dotPositions[i * 3] = Math.cos(theta) * r * (GLOBE_RADIUS + 0.01);
      dotPositions[i * 3 + 1] = y * (GLOBE_RADIUS + 0.01);
      dotPositions[i * 3 + 2] = Math.sin(theta) * r * (GLOBE_RADIUS + 0.01);
    }
    const dotGeo = new THREE.BufferGeometry();
    dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPositions, 3));
    const dotMat = new THREE.PointsMaterial({
      color: themeRef.current === 'alabaster' ? 0x9c9283 : 0x6f6880,
      size: 0.025,
      transparent: true,
      opacity: 0.55,
    });
    globeGroup.add(new THREE.Points(dotGeo, dotMat));

    // Destination Beacons + Geodesic Arcs
    const beaconMeshes: THREE.Mesh[] = [];
    const disposables: Array<{ dispose: () => void }> = [
      sphereGeo,
      sphereMat,
      innerGeo,
      innerMat,
      dotGeo,
      dotMat,
    ];

    const stopVectors = geoStops.map((s) => latLngToVec3(s.lat, s.lng, GLOBE_RADIUS + 0.02));
    stopVectors.forEach((vec, idx) => {
      const bGeo = new THREE.SphereGeometry(0.055, 16, 16);
      const bMat = new THREE.MeshBasicMaterial({
        color: idx === selectedRef.current ? 0xff6b5b : 0xf5a623,
      });
      const mesh = new THREE.Mesh(bGeo, bMat);
      mesh.position.copy(vec);
      mesh.userData = { stopIndex: idx };
      globeGroup.add(mesh);
      beaconMeshes.push(mesh);
      disposables.push(bGeo, bMat);

      // Subtle halo ring around stop
      const ringGeo = new THREE.RingGeometry(0.075, 0.095, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: idx === selectedRef.current ? 0xff6b5b : 0x34d399,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.72,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(vec.clone().multiplyScalar(1.01));
      ring.lookAt(vec.clone().multiplyScalar(2));
      globeGroup.add(ring);
      disposables.push(ringGeo, ringMat);
    });

    // Geodesic arcs connecting stops sequentially
    const arcCurves: THREE.QuadraticBezierCurve3[] = [];
    for (let i = 0; i < stopVectors.length - 1; i += 1) {
      const start = stopVectors[i];
      const end = stopVectors[i + 1];
      const mid = start.clone().add(end).multiplyScalar(0.5);
      const dist = start.distanceTo(end);
      mid.normalize().multiplyScalar(GLOBE_RADIUS + Math.max(0.28, dist * 0.42));

      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      arcCurves.push(curve);
      const pts = curve.getPoints(48);
      const arcGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const arcMat = new THREE.LineBasicMaterial({
        color: i % 2 === 0 ? 0xff6b5b : 0x34d399,
        transparent: true,
        opacity: 0.9,
      });
      globeGroup.add(new THREE.Line(arcGeo, arcMat));
      disposables.push(arcGeo, arcMat);
    }

    // Animated flight tracer dot along the geodesic arcs
    const tracerGeo = new THREE.SphereGeometry(0.036, 12, 12);
    const tracerMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const tracer = new THREE.Mesh(tracerGeo, tracerMat);
    if (arcCurves.length > 0) {
      globeGroup.add(tracer);
    }
    disposables.push(tracerGeo, tracerMat);

    // Target orientation helper to rotate selected stop toward camera (+Z)
    const getYawPitchForStop = (idx: number) => {
      const s = geoStops[Math.max(0, Math.min(geoStops.length - 1, idx))];
      const yaw = -(s.lng + 90) * (Math.PI / 180);
      const pitch = THREE.MathUtils.clamp(s.lat * (Math.PI / 180) * 0.72, -0.75, 0.75);
      return { yaw, pitch };
    };

    const initialAngles = getYawPitchForStop(selectedRef.current);
    let rotY = initialAngles.yaw;
    let rotX = initialAngles.pitch;
    let targetRotY = initialAngles.yaw;
    let targetRotX = initialAngles.pitch;
    let isDragging = false;
    let userInteracting = false;
    let lastX = 0;
    let lastY = 0;
    let lastObservedStop = selectedRef.current;

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let dragDistance = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      userInteracting = true;
      dragDistance = 0;
      lastX = e.clientX;
      lastY = e.clientY;
      if (renderer) renderer.domElement.style.cursor = 'grabbing';
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      dragDistance += Math.abs(dx) + Math.abs(dy);
      lastX = e.clientX;
      lastY = e.clientY;
      targetRotY += dx * 0.0085;
      targetRotX = THREE.MathUtils.clamp(targetRotX + dy * 0.0065, -1.05, 1.05);
    };

    const onPointerUp = (e: PointerEvent) => {
      isDragging = false;
      if (renderer) renderer.domElement.style.cursor = 'grab';
      if (dragDistance < 6 && renderer) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(beaconMeshes, false);
        if (hits.length > 0) {
          const hitIdx = hits[0].object.userData.stopIndex;
          if (typeof hitIdx === 'number') {
            userInteracting = false;
            onSelectRef.current(hitIdx);
          }
        }
      }
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp);

    const resizeObserver = new ResizeObserver(() => {
      if (!renderer || !container) return;
      const w = Math.max(220, container.clientWidth);
      const h = Math.max(220, container.clientHeight);
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    resizeObserver.observe(container);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setContextFailed(true);
    };
    domEl.addEventListener('webglcontextlost', onContextLost);

    let rafId = 0;
    const clock = new THREE.Clock();

    const tick = () => {
      rafId = window.requestAnimationFrame(tick);
      if (document.hidden || !renderer) return;

      const t = clock.getElapsedTime();

      if (lastObservedStop !== selectedRef.current) {
        lastObservedStop = selectedRef.current;
        const next = getYawPitchForStop(lastObservedStop);
        targetRotY = next.yaw;
        targetRotX = next.pitch;
        userInteracting = false;
      } else if (!userInteracting && !isDragging) {
        targetRotY += 0.0018;
      }

      rotY += (targetRotY - rotY) * 0.07;
      rotX += (targetRotX - rotX) * 0.07;
      globeGroup.rotation.y = rotY;
      globeGroup.rotation.x = rotX;

      beaconMeshes.forEach((mesh, idx) => {
        const isSel = idx === selectedRef.current;
        const scale = isSel ? 1.45 + Math.sin(t * 4) * 0.18 : 1;
        mesh.scale.setScalar(scale);
        (mesh.material as THREE.MeshBasicMaterial).color.setHex(isSel ? 0xff6b5b : 0xf5a623);
      });

      if (arcCurves.length > 0) {
        const cycle = (t * 0.28) % arcCurves.length;
        const segIdx = Math.floor(cycle);
        const u = cycle - segIdx;
        const pos = arcCurves[segIdx].getPointAt(u);
        tracer.position.copy(pos);
      }

      const isLight = themeRef.current === 'alabaster';
      sphereMat.color.setHex(isLight ? 0xd9cfc1 : 0x262138);
      innerMat.color.setHex(isLight ? 0xfaf7f2 : 0x100e17);
      dotMat.color.setHex(isLight ? 0x8e8374 : 0x79708d);

      renderer.render(scene, camera);
    };
    tick();

    return () => {
      window.cancelAnimationFrame(rafId);
      domEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      domEl.removeEventListener('webglcontextlost', onContextLost);
      resizeObserver.disconnect();
      if (domEl.parentNode === container) {
        container.removeChild(domEl);
      }
      renderer?.dispose();
      disposables.forEach((d) => d.dispose());
    };
  }, [geoStops, reducedMotion, webglSupported]);

  const showFallbackSvg = reducedMotion || !webglSupported || contextFailed;

  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-[var(--border-hairline)] p-4"
      style={{
        background:
          theme === 'nocturne'
            ? 'radial-gradient(circle at 50% 45%, rgba(52, 211, 153, 0.14), rgba(255, 107, 91, 0.1) 46%, rgba(12, 10, 18, 0.96) 85%)'
            : 'radial-gradient(circle at 50% 45%, rgba(78, 122, 97, 0.14), rgba(217, 107, 79, 0.1) 46%, rgba(250, 247, 242, 0.98) 85%)',
      }}
    >
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <span className="font-mono-label uppercase tracking-wider text-[var(--ink-secondary)]">
          Interactive 3D Geodesic Globe · Drag to Orbit
        </span>
        <div className="flex flex-wrap gap-1.5">
          {geoStops.map((s, idx) => (
            <button
              key={`${s.city}-${idx}`}
              type="button"
              onClick={() => onSelectStop(idx)}
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition cursor-pointer ${
                idx === selectedStopIndex
                  ? 'border-[var(--accent-coral)] bg-[var(--accent-coral-soft)] text-[var(--accent-coral)]'
                  : 'border-[var(--border-hairline)] bg-[var(--surface-glass)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
              }`}
            >
              {idx + 1}. {s.city}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-2 h-64 w-full sm:h-72">
        <div ref={containerRef} className="h-full w-full" />

        {showFallbackSvg && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <svg viewBox="0 0 260 180" className="h-44 w-64" aria-hidden="true">
              <circle
                cx="130"
                cy="90"
                r="68"
                fill="none"
                stroke="var(--border-strong)"
                strokeWidth="1.2"
                strokeDasharray="3 4"
              />
              <ellipse
                cx="130"
                cy="90"
                rx="68"
                ry="26"
                fill="none"
                stroke="var(--border-hairline)"
                strokeWidth="1"
              />
              <path
                d="M78 100 Q130 34 184 94"
                fill="none"
                stroke="var(--accent-coral)"
                strokeWidth="2"
              />
              <path
                d="M110 74 Q146 126 176 72"
                fill="none"
                stroke="var(--accent-sage)"
                strokeWidth="2"
              />
              <circle cx="78" cy="100" r="4.5" fill="var(--accent-coral)" />
              <circle cx="130" cy="64" r="4.5" fill="var(--accent-amber)" />
              <circle cx="184" cy="94" r="4.5" fill="var(--accent-sage)" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

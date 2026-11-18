'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { KindredTheme } from '@/lib/theme';
import { isWebGLAvailable, usePrefersReducedMotion } from './webgl-utils';

const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision mediump float;
  varying vec2 vUv;

  uniform float u_time;
  uniform vec2 u_mouse;
  uniform vec2 u_resolution;
  uniform float u_depth;
  uniform float u_isLight;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    vec2 aspect = vec2(u_resolution.x / max(1.0, u_resolution.y), 1.0);
    vec2 p = (vUv - 0.5) * aspect;
    vec2 mouseOffset = (u_mouse - 0.5) * 0.45 * aspect;

    float t = u_time * mix(0.085, 0.165, u_depth);
    float n1 = snoise(p * 1.55 + vec2(t * 0.6, -t * 0.4) + mouseOffset * 0.45);
    float n2 = snoise(p * 2.4 - vec2(t * 0.35, t * 0.55) + vec2(n1 * 0.65));
    float field = clamp(0.5 + 0.5 * (n1 * 0.62 + n2 * 0.38), 0.0, 1.0);

    float pointerDist = length(p - mouseOffset);
    float pointerBloom = exp(-pointerDist * 2.1) * mix(0.28, 0.46, u_depth);

    if (u_isLight < 0.5) {
      // Warm Nocturne: velvet obsidian -> plum charcoal -> coral/amber ember
      vec3 obsidian = vec3(0.039, 0.035, 0.055);
      vec3 plum = vec3(0.118, 0.088, 0.155);
      vec3 coral = vec3(0.95, 0.38, 0.32);
      vec3 amber = vec3(0.96, 0.65, 0.16);
      vec3 sage = vec3(0.20, 0.72, 0.55);

      vec3 base = mix(obsidian, plum, smoothstep(0.15, 0.85, field));
      vec3 ember = mix(coral, amber, smoothstep(0.25, 0.9, n2 * 0.5 + 0.5));
      float glowMask = smoothstep(0.45, 0.92, field) * mix(0.22, 0.44, u_depth);
      vec3 color = mix(base, ember, glowMask);
      color += mix(coral, sage, 0.25) * pointerBloom * 0.32;

      float vignette = smoothstep(1.25, 0.2, length(p));
      color = mix(obsidian, color, vignette * 0.92 + 0.08);
      gl_FragColor = vec4(color, 1.0);
    } else {
      // Editorial Alabaster: warm cream linen -> sunlit coral & sage wash
      vec3 alabaster = vec3(0.980, 0.969, 0.949);
      vec3 sand = vec3(0.945, 0.915, 0.865);
      vec3 coralWash = vec3(0.92, 0.56, 0.46);
      vec3 amberWash = vec3(0.89, 0.74, 0.50);

      vec3 base = mix(alabaster, sand, smoothstep(0.2, 0.88, field));
      vec3 tint = mix(coralWash, amberWash, smoothstep(0.2, 0.85, n2 * 0.5 + 0.5));
      float washMask = smoothstep(0.48, 0.95, field) * mix(0.14, 0.26, u_depth);
      vec3 color = mix(base, tint, washMask);
      color = mix(color, coralWash, pointerBloom * 0.14);
      gl_FragColor = vec4(color, 1.0);
    }
  }
`;

export function AuraShaderCanvas({
  depthProgress,
  theme,
}: {
  depthProgress: number;
  theme: KindredTheme;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const [contextFailed, setContextFailed] = useState(false);
  const depthRef = useRef(depthProgress / 100);
  const themeRef = useRef(theme);

  useEffect(() => {
    depthRef.current = Math.max(0, Math.min(1, depthProgress / 100));
  }, [depthProgress]);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || reducedMotion || !isWebGLAvailable()) {
      return;
    }

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const uniforms = {
      u_time: { value: 0 },
      u_mouse: { value: new THREE.Vector2(0.55, 0.45) },
      u_resolution: { value: new THREE.Vector2(container.clientWidth, container.clientHeight) },
      u_depth: { value: depthRef.current },
      u_isLight: { value: themeRef.current === 'alabaster' ? 1.0 : 0.0 },
    };

    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms,
      depthWrite: false,
      depthTest: false,
    });
    const quad = new THREE.Mesh(geometry, material);
    scene.add(quad);

    const targetMouse = new THREE.Vector2(0.55, 0.45);
    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      targetMouse.set(
        Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
        Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height)),
      );
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
      if (!renderer || !container) return;
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      renderer.setSize(w, h);
      uniforms.u_resolution.value.set(w, h);
    });
    resizeObserver.observe(container);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setContextFailed(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    let rafId = 0;
    const clock = new THREE.Clock();

    const tick = () => {
      rafId = window.requestAnimationFrame(tick);
      if (document.hidden || !renderer) return;

      const elapsed = clock.getElapsedTime();
      uniforms.u_time.value = elapsed;
      uniforms.u_mouse.value.lerp(targetMouse, 0.04);
      uniforms.u_depth.value += (depthRef.current - uniforms.u_depth.value) * 0.05;
      const targetLight = themeRef.current === 'alabaster' ? 1.0 : 0.0;
      uniforms.u_isLight.value += (targetLight - uniforms.u_isLight.value) * 0.08;

      renderer.render(scene, camera);
    };
    tick();

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onPointerMove);
      resizeObserver.disconnect();
      if (renderer) {
        renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
        if (renderer.domElement.parentNode === container) {
          container.removeChild(renderer.domElement);
        }
        renderer.dispose();
      }
      geometry.dispose();
      material.dispose();
    };
  }, [reducedMotion]);

  const posterGradient =
    theme === 'nocturne'
      ? 'radial-gradient(circle at 22% 24%, rgba(255, 107, 91, 0.22), transparent 52%), radial-gradient(circle at 78% 68%, rgba(245, 166, 35, 0.16), transparent 56%), #0A090E'
      : 'radial-gradient(circle at 22% 24%, rgba(217, 107, 79, 0.16), transparent 52%), radial-gradient(circle at 78% 68%, rgba(200, 155, 84, 0.16), transparent 56%), #FAF7F2';

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem]"
      style={{ background: posterGradient }}
    >
      {!reducedMotion && !contextFailed && (
        <div ref={containerRef} className="h-full w-full opacity-95" />
      )}
    </div>
  );
}

import {
  AmbientLight,
  BufferGeometry,
  DirectionalLight,
  Float32BufferAttribute,
  MathUtils,
  PerspectiveCamera,
  PointLight,
  Points,
  PointsMaterial,
  Scene,
} from 'three';

import { createOrbits, createRack } from './models';
import { tint } from './palette';
import { autoResize, createRenderer, prefersReducedMotion, visibleLoop } from './three-common';

/**
 * Hero: glowing server rack with orbiting data packets. Reacts to the pointer (parallax) and to
 * scroll (rotation + camera dolly). Returns a dispose function, or null if WebGL is unavailable
 * (the static poster then simply stays).
 */
export function initHeroScene(canvas: HTMLCanvasElement, stage: HTMLElement): (() => void) | null {
  const renderer = createRenderer(canvas);
  if (!renderer) {
    return null;
  }

  const scene = new Scene();
  const camera = new PerspectiveCamera(38, 4 / 3, 0.1, 50);
  camera.position.set(0, 1.4, 8.5);

  scene.add(new AmbientLight(0xffffff, 0.9));
  const key = new DirectionalLight(0xffffff, 1.4);
  key.position.set(3, 5, 4);
  const cyan = tint(new PointLight(0xffffff, 30, 14), 'accent');
  cyan.position.set(-3.5, 1.5, 3);
  const violet = tint(new PointLight(0xffffff, 30, 14), 'accent2');
  violet.position.set(3.5, -1, 2.5);
  scene.add(key, cyan, violet);

  const rack = createRack();
  const orbits = createOrbits();
  scene.add(rack, orbits.group);

  const stars: number[] = [];
  for (let i = 0; i < 140; i += 1) {
    const r = 6 + Math.random() * 6;
    const a = Math.random() * Math.PI * 2;
    stars.push(Math.cos(a) * r, (Math.random() - 0.5) * 8, Math.sin(a) * r - 4);
  }
  const starGeometry = new BufferGeometry();
  starGeometry.setAttribute('position', new Float32BufferAttribute(stars, 3));
  scene.add(
    new Points(starGeometry, tint(new PointsMaterial({ size: 0.04, transparent: true, opacity: 0.6 }), 'accent')),
  );

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onMove = (event: PointerEvent): void => {
    const rect = stage.getBoundingClientRect();
    pointer.tx = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    pointer.ty = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
  };
  const onLeave = (): void => {
    pointer.tx = 0;
    pointer.ty = 0;
  };
  stage.addEventListener('pointermove', onMove);
  stage.addEventListener('pointerleave', onLeave);

  const render = (t: number): void => {
    const scrollP = MathUtils.clamp(window.scrollY / Math.max(stage.offsetHeight * 2, 1), 0, 1);
    pointer.x = MathUtils.lerp(pointer.x, pointer.tx, 0.06);
    pointer.y = MathUtils.lerp(pointer.y, pointer.ty, 0.06);

    rack.rotation.y = 0.6 + t * 0.22 + scrollP * 1.4 + pointer.x * 0.5;
    rack.rotation.x = pointer.y * 0.18;
    rack.position.y = Math.sin(t * 0.9) * 0.08;
    orbits.group.rotation.y = -t * 0.1 + scrollP * 0.8;
    orbits.update(t);
    camera.position.y = 1.4 + scrollP * 1.2;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  };

  const stopResize = autoResize(renderer, camera, canvas, () => {
    render(0.5);
  });
  render(0.5);

  // Reduced motion: one static frame, re-rendered only on resize.
  const stopLoop = prefersReducedMotion() ? (): void => undefined : visibleLoop(stage, render);

  return () => {
    stopLoop();
    stopResize();
    stage.removeEventListener('pointermove', onMove);
    stage.removeEventListener('pointerleave', onLeave);
    renderer.dispose();
  };
}

import { AmbientLight, DirectionalLight, MathUtils, PerspectiveCamera, PointLight, Scene } from 'three';

import { tint } from './palette';
import type { ModelInstance } from './models';
import { autoResize, createRenderer, prefersReducedMotion, visibleLoop } from './three-common';

export interface Viewer {
  setModel(name: string): void;
  dispose(): void;
}

/**
 * 3D viewer: one canvas, one procedural model at a time, built lazily by `build` and cached.
 * Rotate by dragging or, when the frame is focused, with the left/right arrow keys.
 */
export function initViewer(
  canvas: HTMLCanvasElement,
  frame: HTMLElement,
  initial: string,
  build: (name: string) => ModelInstance,
): Viewer | null {
  const renderer = createRenderer(canvas);
  if (!renderer) {
    return null;
  }

  const reduce = prefersReducedMotion();
  const scene = new Scene();
  const camera = new PerspectiveCamera(36, 4 / 3, 0.1, 50);
  camera.position.set(0, 2.2, 8.2);
  camera.lookAt(0, 0, 0);

  scene.add(new AmbientLight(0xffffff, 0.9));
  const key = new DirectionalLight(0xffffff, 1.3);
  key.position.set(3, 5, 4);
  const cyan = tint(new PointLight(0xffffff, 28, 14), 'accent');
  cyan.position.set(-3, 2, 3);
  const violet = tint(new PointLight(0xffffff, 28, 14), 'accent2');
  violet.position.set(3, -1, 3);
  scene.add(key, cyan, violet);

  const models = new Map<string, ModelInstance>();
  let active: ModelInstance | undefined;
  let appear = 1;
  let yaw = 0.5;
  let velocity = 0;
  let dragging = false;
  let lastX = 0;
  let last = 0;

  const show = (name: string): void => {
    let model = models.get(name);
    if (!model) {
      model = build(name);
      model.group.visible = false;
      scene.add(model.group);
      models.set(name, model);
    }
    if (active) {
      active.group.visible = false;
    }
    active = model;
    active.group.visible = true;
    appear = reduce ? 1 : 0;
  };

  const render = (t: number): void => {
    const dt = Math.min(t - last, 0.05);
    last = t;
    if (active) {
      if (!dragging && !reduce) {
        yaw += dt * 0.35 + velocity * 0.9;
        velocity *= 0.92;
      }
      appear = Math.min(1, appear + dt * 2.2);
      active.group.scale.setScalar(0.6 + 0.4 * MathUtils.smootherstep(appear, 0, 1));
      active.group.rotation.y = yaw;
      active.update(t);
    }
    renderer.render(scene, camera);
  };
  // With reduced motion there is no loop, so redraw on demand.
  const renderOnce = (): void => {
    if (reduce) {
      render(last + 0.016);
    }
  };

  const onDown = (event: PointerEvent): void => {
    dragging = true;
    lastX = event.clientX;
    frame.setPointerCapture(event.pointerId);
  };
  const onMove = (event: PointerEvent): void => {
    if (!dragging) {
      return;
    }
    velocity = (event.clientX - lastX) * 0.012;
    yaw += velocity;
    lastX = event.clientX;
    renderOnce();
  };
  const onUp = (): void => {
    dragging = false;
  };
  const onKey = (event: KeyboardEvent): void => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      yaw += event.key === 'ArrowLeft' ? -0.25 : 0.25;
      renderOnce();
    }
  };
  frame.addEventListener('pointerdown', onDown);
  frame.addEventListener('pointermove', onMove);
  frame.addEventListener('pointerup', onUp);
  frame.addEventListener('pointercancel', onUp);
  frame.addEventListener('keydown', onKey);

  const stopResize = autoResize(renderer, camera, canvas, () => {
    render(last);
  });
  show(initial);
  render(0);
  const stopLoop = reduce ? (): void => undefined : visibleLoop(frame, render);

  return {
    setModel(name) {
      show(name);
      renderOnce();
    },
    dispose() {
      stopLoop();
      stopResize();
      frame.removeEventListener('pointerdown', onDown);
      frame.removeEventListener('pointermove', onMove);
      frame.removeEventListener('pointerup', onUp);
      frame.removeEventListener('pointercancel', onUp);
      frame.removeEventListener('keydown', onKey);
      renderer.dispose();
    },
  };
}

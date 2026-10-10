import { AmbientLight, DirectionalLight, PerspectiveCamera, PointLight, Scene } from 'three';

import { tint } from './palette';
import type { ModelInstance } from './models';
import { autoResize, createRenderer, prefersReducedMotion, visibleLoop } from './three-common';

/** The products currently laid out in the row: `ids[0]` sits `firstRel` slots from the centre. */
export interface StripWindow {
  readonly ids: readonly string[];
  readonly firstRel: number;
}

export interface StripScene {
  /** Lay out `win`. `shift` (+1 / -1) slides the row one slot, matching the labels' own slide. */
  setWindow(win: StripWindow, shift: number): void;
  dispose(): void;
}

const VISIBLE_SLOTS = 5;
const SLIDE_MS = 480;
const FOV = 28;
/** Smallest comfortable slot width in world units (a normalised model is ~3.7 across). */
const MIN_SLOT = 3.9;
/** Height the row needs in world units (model + tilt + a little air). */
const NEED_HEIGHT = 5.2;

const easeOutCubic = (k: number): number => 1 - (1 - k) ** 3;

/**
 * A row of live 3D products on ONE canvas / ONE WebGL context. Models sit in a line, the middle one
 * larger; sliding the row is just an animated x offset. Each slot lines up with a DOM column laid
 * over the canvas (labels + click targets), so the spacing is derived from the canvas aspect.
 */
export function initStrip(
  canvas: HTMLCanvasElement,
  host: HTMLElement,
  build: (id: string) => ModelInstance,
): StripScene | null {
  const renderer = createRenderer(canvas);
  if (!renderer) {
    return null;
  }

  const reduce = prefersReducedMotion();
  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 5, 0.1, 100);
  scene.add(new AmbientLight(0xffffff, 0.95));
  const key = new DirectionalLight(0xffffff, 1.3);
  key.position.set(3, 6, 8);
  const cyan = tint(new PointLight(0xffffff, 40, 40), 'accent');
  cyan.position.set(-8, 3, 8);
  const violet = tint(new PointLight(0xffffff, 40, 40), 'accent2');
  violet.position.set(8, -2, 8);
  scene.add(key, cyan, violet);

  const models = new Map<string, ModelInstance>();
  let win: StripWindow = { ids: [], firstRel: 0 };
  let slideStart = -1;
  let slideFrom = 0;
  let spacing = MIN_SLOT;
  let last = 0;

  const fit = (): void => {
    const aspect = canvas.clientWidth / Math.max(canvas.clientHeight, 1);
    const tanHalf = Math.tan((FOV * Math.PI) / 360);
    // Far enough that the row's height fits AND each of the five slots is at least MIN_SLOT wide.
    const distance = Math.max(NEED_HEIGHT / 2 / tanHalf, (VISIBLE_SLOTS * MIN_SLOT) / 2 / (tanHalf * aspect));
    camera.position.set(0, 0, distance);
    camera.lookAt(0, 0, 0);
    spacing = (2 * distance * tanHalf * aspect) / VISIBLE_SLOTS;
  };

  const render = (t: number): void => {
    last = t;
    let offset = 0;
    if (slideStart >= 0) {
      const k = Math.min(1, (performance.now() - slideStart) / SLIDE_MS);
      offset = slideFrom * (1 - easeOutCubic(k));
      if (k >= 1) {
        slideStart = -1;
      }
    }

    models.forEach((m) => {
      m.group.visible = false;
    });
    const placed = new Set<string>();
    win.ids.forEach((id, i) => {
      if (placed.has(id)) {
        return;
      }
      placed.add(id);
      let model = models.get(id);
      if (!model) {
        model = build(id);
        scene.add(model.group);
        models.set(id, model);
      }
      const x = (win.firstRel + i + offset) * spacing;
      const distance = Math.abs(x) / spacing; // slots from the centre
      model.group.visible = true;
      model.group.position.set(x, 0.35, 0);
      model.group.scale.setScalar(1.1 - 0.2 * Math.min(distance, 2));
      model.group.rotation.y = reduce ? 0.6 : t * 0.5 + i * 0.7;
      model.update(reduce ? 0 : t);
    });
    renderer.render(scene, camera);
  };

  const stopResize = autoResize(renderer, camera, canvas, () => {
    fit();
    render(last);
  });
  fit();
  render(0);
  const stopLoop = reduce ? (): void => undefined : visibleLoop(host, render);

  return {
    setWindow(next, shift) {
      win = next;
      if (shift !== 0 && !reduce) {
        slideStart = performance.now();
        slideFrom = shift;
      } else {
        slideStart = -1;
      }
      if (reduce) {
        render(last);
      }
    },
    dispose() {
      stopLoop();
      stopResize();
      renderer.dispose();
    },
  };
}

import { WebGLRenderer } from 'three';
import type { PerspectiveCamera } from 'three';

export const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Creates a renderer, or returns null when WebGL is unavailable. */
export function createRenderer(canvas: HTMLCanvasElement): WebGLRenderer | null {
  try {
    const renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'low-power',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x000000, 0);
    return renderer;
  } catch {
    return null;
  }
}

/** Keeps renderer + camera in sync with the canvas CSS size. Returns a disconnect function. */
export function autoResize(
  renderer: WebGLRenderer,
  camera: PerspectiveCamera,
  canvas: HTMLCanvasElement,
  onResize?: () => void,
): () => void {
  const resize = (): void => {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (w === 0 || h === 0) {
      return;
    }
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    onResize?.();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  return () => {
    observer.disconnect();
  };
}

/**
 * Calls `frame(seconds)` every animation frame, but only while `element` is on screen and the
 * tab is visible, so off-screen scenes cost nothing. Returns a stop function.
 */
export function visibleLoop(element: Element, frame: (seconds: number) => void): () => void {
  let onScreen = false;
  let handle = 0;
  const t0 = performance.now();

  const tick = (): void => {
    frame((performance.now() - t0) / 1000);
    handle = requestAnimationFrame(tick);
  };
  const sync = (): void => {
    const shouldRun = onScreen && !document.hidden;
    if (shouldRun && !handle) {
      handle = requestAnimationFrame(tick);
    } else if (!shouldRun && handle) {
      cancelAnimationFrame(handle);
      handle = 0;
    }
  };

  const observer = new IntersectionObserver((entries) => {
    onScreen = entries.some((e) => e.isIntersecting);
    sync();
  });
  observer.observe(element);
  document.addEventListener('visibilitychange', sync);

  return () => {
    observer.disconnect();
    document.removeEventListener('visibilitychange', sync);
    cancelAnimationFrame(handle);
  };
}

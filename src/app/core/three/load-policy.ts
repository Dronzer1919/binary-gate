/** Deliberately free of any `three` import so it stays in the initial bundle at a few hundred bytes. */

interface NetworkInformation {
  readonly saveData?: boolean;
  readonly effectiveType?: string;
}

/** Skip 3D on Save-Data, 2G or very low-memory devices: the static poster remains. */
export function shouldSkip3d(): boolean {
  const nav = navigator as Navigator & { connection?: NetworkInformation; deviceMemory?: number };
  return (
    !!nav.connection?.saveData ||
    /(^|-)2g$/.test(nav.connection?.effectiveType ?? '') ||
    (nav.deviceMemory ?? 8) <= 1
  );
}

/**
 * Runs `task` on the first user input, or `timeout` ms after the window load event
 * (once idle), whichever comes first. Keeps heavy work off the critical path.
 * Returns a cancel function.
 */
export function whenIdleOrInteracted(task: () => void, timeout: number): () => void {
  let done = false;
  let timer = 0;

  // The app itself starts on the first interaction (see main.ts), so that input has already happened.
  if (window.__appInteracted) {
    const immediate = window.setTimeout(() => {
      if (!done) {
        done = true;
        task();
      }
    }, 0);
    return () => {
      done = true;
      window.clearTimeout(immediate);
    };
  }
  const events = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart'] as const;

  const cleanup = (): void => {
    events.forEach((name) => {
      window.removeEventListener(name, run);
    });
    window.removeEventListener('load', onLoad);
    clearTimeout(timer);
  };
  function run(): void {
    if (done) {
      return;
    }
    done = true;
    cleanup();
    task();
  }
  function onLoad(): void {
    timer = window.setTimeout(() => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(run);
      } else {
        run();
      }
    }, timeout);
  }

  events.forEach((name) => {
    window.addEventListener(name, run, { passive: true });
  });
  if (document.readyState === 'complete') {
    onLoad();
  } else {
    window.addEventListener('load', onLoad);
  }
  return () => {
    done = true;
    cleanup();
  };
}

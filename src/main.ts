/**
 * Every page is server-rendered and fully visible, so the browser does not need Angular to *show* anything:
 * it only needs it for interactivity. Bootstrapping + hydrating the app is therefore deferred until the
 * visitor first interacts, or `IDLE_MS` after the page has loaded, whichever comes first. That keeps the
 * framework's start-up cost off the critical rendering path and out of the load-time main-thread budget.
 *
 * Nothing is lost while waiting:
 *  - links are real `href`s, so they work (as normal page loads) before the app is running;
 *  - Angular's event replay (withEventReplay) records clicks/keys that happen before hydration and replays
 *    them once the app is ready.
 */
const IDLE_MS = 4000;

const INTERACTION_EVENTS = ['pointerdown', 'pointermove', 'wheel', 'scroll', 'keydown', 'touchstart', 'focusin'] as const;

let started = false;

const start = (interacted: boolean): void => {
  if (started) {
    return;
  }
  started = true;
  INTERACTION_EVENTS.forEach((name) => {
    window.removeEventListener(name, onInteraction, { capture: true });
  });
  // Lets other lazy work (3D scenes) treat this input as "the first interaction".
  window.__appInteracted = interacted;
  import('./bootstrap')
    .then(({ bootstrap }) => bootstrap())
    .catch((err: unknown) => {
      console.error(err);
    });
};

function onInteraction(): void {
  start(true);
}

INTERACTION_EVENTS.forEach((name) => {
  window.addEventListener(name, onInteraction, { capture: true, passive: true });
});

const scheduleIdleStart = (): void => {
  window.setTimeout(() => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        start(false);
      });
    } else {
      start(false);
    }
  }, IDLE_MS);
};

if (document.readyState === 'complete') {
  scheduleIdleStart();
} else {
  window.addEventListener('load', scheduleIdleStart, { once: true });
}

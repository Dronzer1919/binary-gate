/** Globals shared between main.ts (which defers app start-up) and the lazy 3D code. */
interface Window {
  /** True when the app was started by a real user interaction rather than the idle timer (see main.ts). */
  __appInteracted?: boolean;
}

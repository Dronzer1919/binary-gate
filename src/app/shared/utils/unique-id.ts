let counter = 0;

/** Deterministic, SSR-safe id for wiring label/aria attributes. */
export function uniqueId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

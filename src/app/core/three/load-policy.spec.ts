import { shouldSkip3d, whenIdleOrInteracted } from './load-policy';

describe('load policy', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('skips 3D on Save-Data, 2G and low-memory devices', () => {
    vi.stubGlobal('navigator', { connection: { saveData: true } });
    expect(shouldSkip3d()).toBe(true);
    vi.stubGlobal('navigator', { connection: { effectiveType: 'slow-2g' } });
    expect(shouldSkip3d()).toBe(true);
    vi.stubGlobal('navigator', { deviceMemory: 1 });
    expect(shouldSkip3d()).toBe(true);
  });

  it('allows 3D on a normal connection', () => {
    vi.stubGlobal('navigator', { connection: { effectiveType: '4g', saveData: false }, deviceMemory: 8 });
    expect(shouldSkip3d()).toBe(false);
  });

  it('runs immediately when the app itself was started by a user interaction', async () => {
    window.__appInteracted = true;
    try {
      const task = vi.fn();
      whenIdleOrInteracted(task, 60_000);
      expect(task).not.toHaveBeenCalled(); // asynchronous, never inside the caller
      await new Promise((resolve) => setTimeout(resolve, 5));
      expect(task).toHaveBeenCalledTimes(1);

      const cancelled = vi.fn();
      whenIdleOrInteracted(cancelled, 60_000)();
      await new Promise((resolve) => setTimeout(resolve, 5));
      expect(cancelled).not.toHaveBeenCalled();
    } finally {
      delete window.__appInteracted;
    }
  });

  it('runs the task once on first interaction, and can be cancelled', () => {
    const task = vi.fn();
    whenIdleOrInteracted(task, 60_000);
    window.dispatchEvent(new Event('pointermove'));
    window.dispatchEvent(new Event('keydown'));
    expect(task).toHaveBeenCalledTimes(1);

    const cancelled = vi.fn();
    const cancel = whenIdleOrInteracted(cancelled, 60_000);
    cancel();
    window.dispatchEvent(new Event('pointerdown'));
    expect(cancelled).not.toHaveBeenCalled();
  });
});

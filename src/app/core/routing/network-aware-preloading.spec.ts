import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';

import { NetworkAwarePreloading } from './network-aware-preloading';

describe('NetworkAwarePreloading', () => {
  const load = vi.fn(() => of('loaded'));

  afterEach(() => {
    load.mockClear();
    vi.unstubAllGlobals();
  });

  function strategy(): NetworkAwarePreloading {
    return TestBed.inject(NetworkAwarePreloading);
  }

  it('preloads on a normal connection', async () => {
    vi.stubGlobal('navigator', { connection: { effectiveType: '4g', saveData: false } });
    expect(await firstValueFrom(strategy().preload({ path: 'x' }, load), { defaultValue: 'skipped' })).toBe('loaded');
  });

  it('skips preloading on Save-Data', async () => {
    vi.stubGlobal('navigator', { connection: { saveData: true } });
    await firstValueFrom(strategy().preload({ path: 'x' }, load), { defaultValue: 'skipped' });
    expect(load).not.toHaveBeenCalled();
  });

  it('skips preloading on 2g / slow-2g', async () => {
    vi.stubGlobal('navigator', { connection: { effectiveType: 'slow-2g' } });
    await firstValueFrom(strategy().preload({ path: 'x' }, load), { defaultValue: 'skipped' });
    expect(load).not.toHaveBeenCalled();
  });

  it('respects data.preload = false', async () => {
    vi.stubGlobal('navigator', { connection: { effectiveType: '4g' } });
    await firstValueFrom(strategy().preload({ path: 'x', data: { preload: false } }, load), {
      defaultValue: 'skipped',
    });
    expect(load).not.toHaveBeenCalled();
  });
});

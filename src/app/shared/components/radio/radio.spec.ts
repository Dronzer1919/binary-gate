import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { Radio } from './radio';
import { RadioGroup } from './radio-group';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RadioGroup, Radio],
  template: `
    <app-radio-group ariaLabel="Size" [formControl]="ctrl">
      <app-radio value="s">Small</app-radio>
      <app-radio value="m">Medium</app-radio>
      <app-radio value="l" [disabled]="true">Large</app-radio>
    </app-radio-group>
  `,
})
class Host {
  readonly ctrl = new FormControl<string | null>('m');
}

describe('Radio / RadioGroup', () => {
  async function setup() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const inputs = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>('input[type=radio]'),
    );
    return { fixture, inputs, ctrl: fixture.componentInstance.ctrl };
  }

  it('renders native radios sharing one name, with the form value checked', async () => {
    const { inputs } = await setup();
    expect(inputs).toHaveLength(3);
    expect(new Set(inputs.map((i) => i.name)).size).toBe(1);
    expect(inputs.map((i) => i.checked)).toEqual([false, true, false]);
  });

  it('writes the selected value back to the form control', async () => {
    const { fixture, inputs, ctrl } = await setup();
    inputs[0]!.click();
    await fixture.whenStable();
    expect(ctrl.value).toBe('s');
    expect(inputs.map((i) => i.checked)).toEqual([true, false, false]);
  });

  it('disables individual options and the whole group', async () => {
    const { fixture, inputs, ctrl } = await setup();
    expect(inputs[2]!.disabled).toBe(true);
    ctrl.disable();
    await fixture.whenStable();
    expect(inputs.every((i) => i.disabled)).toBe(true);
    expect((fixture.nativeElement as HTMLElement).querySelector('app-radio-group')!.getAttribute('aria-label')).toBe('Size');
  });
});

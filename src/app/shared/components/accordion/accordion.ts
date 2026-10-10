import {
  ChangeDetectionStrategy,
  Component,
  contentChildren,
  inject,
  input,
  model,
  viewChild,
} from '@angular/core';
import type { ElementRef } from '@angular/core';

import { uniqueId } from '../../utils/unique-id';

/**
 * WAI-ARIA accordion. Headers are buttons inside a heading; Enter/Space toggle
 * (native button behaviour), Arrow Up/Down move focus between headers, Home/End jump.
 */
@Component({
  selector: 'app-accordion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(keydown)': 'onKeydown($event)' },
  styles: `
    :host {
      display: block;
      border: 1px solid var(--color-border-subtle);
      border-radius: var(--radius);
      background: var(--color-surface);
      overflow: hidden;
    }
  `,
  template: `<ng-content />`,
})
export class Accordion {
  /** Allow several panels open at once. Default: one at a time. */
  readonly multi = input<boolean>(false);

  private readonly items = contentChildren(AccordionItem, { descendants: true });

  /** Called by an item that just opened, to close its siblings in single mode. */
  collapseOthers(except: AccordionItem): void {
    if (this.multi()) {
      return;
    }
    this.items().forEach((item) => {
      if (item !== except) {
        item.expanded.set(false);
      }
    });
  }

  protected onKeydown(event: KeyboardEvent): void {
    const enabled = this.items().filter((i) => !i.disabled());
    const index = enabled.findIndex((i) => i.hasFocus());
    if (index < 0 || enabled.length === 0) {
      return;
    }
    let next: number;
    switch (event.key) {
      case 'ArrowDown':
        next = (index + 1) % enabled.length;
        break;
      case 'ArrowUp':
        next = (index - 1 + enabled.length) % enabled.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = enabled.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    enabled[next]?.focus();
  }
}

@Component({
  selector: 'app-accordion-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './accordion.scss',
  template: `
    <div class="heading" role="heading" [attr.aria-level]="headingLevel()">
      <button
        #trigger
        type="button"
        class="trigger"
        [id]="triggerId"
        [disabled]="disabled()"
        [attr.aria-expanded]="expanded()"
        [attr.aria-controls]="panelId"
        (click)="toggle()"
      >
        <span>{{ heading() }}</span>
        <span class="icon" aria-hidden="true"></span>
      </button>
    </div>
    <div class="panel" role="region" [id]="panelId" [attr.aria-labelledby]="triggerId" [hidden]="!expanded()">
      <div class="panel-content"><ng-content /></div>
    </div>
  `,
})
export class AccordionItem {
  private readonly accordion = inject(Accordion, { optional: true });
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');

  readonly heading = input.required<string>();
  readonly headingLevel = input<2 | 3 | 4 | 5 | 6>(3);
  readonly disabled = input<boolean>(false);
  readonly expanded = model<boolean>(false);

  protected readonly triggerId = uniqueId('acc-trigger');
  protected readonly panelId = uniqueId('acc-panel');

  toggle(): void {
    const next = !this.expanded();
    this.expanded.set(next);
    if (next) {
      this.accordion?.collapseOthers(this);
    }
  }

  focus(): void {
    this.trigger().nativeElement.focus();
  }

  hasFocus(): boolean {
    const el = this.trigger().nativeElement;
    return el.ownerDocument.activeElement === el;
  }
}

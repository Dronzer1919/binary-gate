import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

import type { ModelName } from '../../core/three/models';
import { Reveal } from '../../core/ui/reveal';
import { Accordion, AccordionItem, ModelViewer } from '../../shared';

interface Solution {
  readonly id: ModelName;
  readonly title: string;
  readonly text: string;
  readonly points: readonly string[];
  readonly caption: string;
}

@Component({
  selector: 'app-solutions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Accordion, AccordionItem, ModelViewer, Reveal],
  styleUrl: './solutions.scss',
  template: `
    <section id="solutions" class="section" aria-labelledby="solutions-title">
      <div class="container">
        <header class="section__head" appReveal>
          <p class="eyebrow annot">
            <span class="annot__dot"></span>04 / Solutions showcase<span class="annot__line"></span>
          </p>
          <h2 id="solutions-title" class="h2">Pick a solution. Explore it in 3D.</h2>
          <p class="lead">
            Choose an item to see a model of the kit involved. Drag the model, or focus it and use the arrow keys, to
            rotate.
          </p>
        </header>

        <div class="showcase">
          <app-accordion appReveal>
            @for (item of solutions; track item.id) {
              <app-accordion-item
                [heading]="item.title"
                [expanded]="selected() === item.id"
                (expandedChange)="onExpanded(item.id, $event)"
              >
                <p>{{ item.text }}</p>
                <ul class="ticks">
                  @for (point of item.points; track point) {
                    <li>{{ point }}</li>
                  }
                </ul>
              </app-accordion-item>
            }
          </app-accordion>

          <figure appReveal>
            <app-model-viewer [model]="selected()" />
            <figcaption class="annot annot--caption" aria-live="polite">
              <span class="annot__dot"></span>{{ caption() }}<span class="annot__line"></span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  `,
})
export class Solutions {
  protected readonly solutions: readonly Solution[] = [
    {
      id: 'hardware',
      title: 'Workstation refresh',
      text: 'Replace ageing desktops with tested, imaged machines delivered to each desk, with old kit securely collected and wiped.',
      points: ['Spec to workload', 'Zero-touch imaging', 'Secure data wipe & recycling'],
      caption: 'Model: processor and mainboard',
    },
    {
      id: 'network',
      title: 'Office network build-out',
      text: 'Structured cabling, a managed switch core and full-coverage Wi-Fi, designed from a site survey and handed over with documentation.',
      points: ['Wired and wireless coverage', 'Segmented guest & staff networks', '24/7 monitoring option'],
      caption: 'Model: managed switch and connected devices',
    },
    {
      id: 'peripherals',
      title: 'Peripherals fleet',
      text: 'Standardise keyboards, mice, headsets and monitors across teams and sites, with ergonomic options and simple re-ordering.',
      points: ['Ergonomic assessments', 'Standard catalogue', 'Replacement within 48 hours'],
      caption: 'Model: keyboard and mouse',
    },
    {
      id: 'software',
      title: 'Software rollout',
      text: 'License the right tools, deploy them to every device and keep them patched, with security and backup layered in from the start.',
      points: ['Licence audits & renewals', 'Automated patching', 'Backup & recovery'],
      caption: 'Model: layered software stack',
    },
  ];

  protected readonly selected = signal<ModelName>('hardware');
  protected readonly caption = computed(
    () => this.solutions.find((s) => s.id === this.selected())?.caption ?? '',
  );

  protected onExpanded(id: ModelName, expanded: boolean): void {
    if (expanded) {
      this.selected.set(id);
    }
  }
}

import { ChangeDetectionStrategy, Component } from '@angular/core';

import { Reveal } from '../../core/ui/reveal';
import { AppPicture } from '../../shared';

interface Value {
  readonly mark: string;
  readonly title: string;
  readonly text: string;
}

@Component({
  selector: 'app-about',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppPicture, Reveal],
  styleUrl: './about.scss',
  template: `
    <section id="about" class="section" aria-labelledby="about-title">
      <div class="container split">
        <div>
          <p class="eyebrow annot" appReveal>
            <span class="annot__dot"></span>01 / About us<span class="annot__line"></span>
          </p>
          <h2 id="about-title" class="h2" appReveal>A supplier that behaves like your in-house IT team.</h2>
          <p class="lead" appReveal>
            Node Network with Binary Gate started as a small hardware reseller and grew into a full-service technology
            partner. We combine vendor-neutral sourcing with hands-on engineering, so you get equipment that fits
            your budget and a network that works on day one.
          </p>
          <ul class="values">
            @for (value of values; track value.mark; let i = $index) {
              <li [appReveal]="i * 90">
                <span class="mark">{{ value.mark }}</span>
                <div>
                  <h3 class="h3">{{ value.title }}</h3>
                  <p>{{ value.text }}</p>
                </div>
              </li>
            }
          </ul>
        </div>
        <figure appReveal>
          <app-picture
            class="cover"
            name="about"
            [lightVariant]="true"
            alt="Illustration of a desktop monitor showing a dashboard with charts and text lines"
            sizes="(min-width: 60rem) 520px, 90vw"
            [width]="400"
            [height]="300"
          />
          <figcaption class="annot annot--caption">
            <span class="annot__dot"></span>Est. 2009 · Over 1,200 business customers<span class="annot__line"></span>
          </figcaption>
        </figure>
      </div>
    </section>
  `,
})
export class About {
  protected readonly values: readonly Value[] = [
    { mark: 'A', title: 'Vendor-neutral advice', text: 'We recommend what fits, not what carries the highest margin.' },
    { mark: 'B', title: 'Engineers on call', text: 'Certified technicians handle installation and troubleshooting.' },
    { mark: 'C', title: 'Transparent pricing', text: 'Itemised quotes, volume discounts and no surprise fees.' },
  ];
}

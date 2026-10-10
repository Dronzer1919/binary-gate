import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Reveal } from '../../core/ui/reveal';
import { Tilt } from '../../core/ui/tilt';
import { AppPicture, Card, Icon } from '../../shared';
import type { IconName } from '../../shared';

interface Product {
  readonly id: string;
  readonly icon: IconName;
  readonly title: string;
  readonly text: string;
  readonly image: string;
  readonly alt: string;
  readonly points: readonly string[];
}

@Component({
  selector: 'app-products',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Card, AppPicture, Icon, Reveal, Tilt, RouterLink],
  styleUrl: './products.scss',
  template: `
    <section id="products" class="section section--alt" aria-labelledby="products-title">
      <div class="container">
        <header class="section__head" appReveal>
          <p class="eyebrow annot">
            <span class="annot__dot"></span>02 / Products &amp; services<span class="annot__line"></span>
          </p>
          <h2 id="products-title" class="h2">Everything your team plugs into.</h2>
          <p class="lead">Four product lines, one point of contact, delivered and supported by the same people.</p>
        </header>

        <ul class="grid">
          @for (product of products; track product.id; let i = $index) {
            <li [appReveal]="i * 90">
              <app-card appTilt [heading]="product.title" [headingLevel]="3">
                <app-picture
                  cardMedia
                  class="cover"
                  [name]="product.image"
                  [lightVariant]="true"
                  [alt]="product.alt"
                  sizes="(min-width: 60rem) 280px, (min-width: 40rem) 45vw, 90vw"
                />
                <div class="body">
                  <app-icon class="lead-icon" [name]="product.icon" />
                  <p>{{ product.text }}</p>
                  <ul class="ticks">
                    @for (point of product.points; track point) {
                      <li>{{ point }}</li>
                    }
                  </ul>
                </div>
              </app-card>
            </li>
          }
        </ul>

        <p class="more" appReveal>
          <a class="btn btn--ghost" routerLink="/" fragment="catalogue">See all 30 products in 3D <app-icon name="arrow" /></a>
        </p>

        <ul class="perks" appReveal>
          <li><app-icon name="truck" />Same-day dispatch</li>
          <li><app-icon name="shield" />Full manufacturer warranty</li>
          <li><app-icon name="headset" />Business-hours support</li>
        </ul>
      </div>
    </section>
  `,
})
export class Products {
  protected readonly products: readonly Product[] = [
    {
      id: 'hardware',
      icon: 'chip',
      title: 'Computer hardware',
      text: 'Desktops, laptops, workstations and servers configured to spec and burn-in tested.',
      image: 'hardware',
      alt: 'Illustration of a processor chip with pins on all four sides',
      points: ['Bulk & custom builds', 'Warranty and RMA handling', 'Asset tagging & imaging'],
    },
    {
      id: 'peripherals',
      icon: 'keyboard',
      title: 'Peripherals',
      text: 'Keyboards, mice, monitors, docks, headsets, printers and storage for every desk.',
      image: 'peripherals',
      alt: 'Illustration of a keyboard, mouse and headset',
      points: ['Ergonomic ranges', 'Monitors & docking', 'Fleet standardisation'],
    },
    {
      id: 'network',
      icon: 'network',
      title: 'Network solutions',
      text: 'Design, cabling, switching, Wi-Fi and firewalls, installed and documented.',
      image: 'network',
      alt: 'Illustration of a central switch connected to five network nodes',
      points: ['Site surveys & design', 'Managed Wi-Fi & VPN', 'Monitoring & support'],
    },
    {
      id: 'software',
      icon: 'code',
      title: 'Software solutions',
      text: 'Licensing, endpoint security, backup and custom internal tools, rolled out and maintained.',
      image: 'software',
      alt: 'Illustration of three stacked layers with a code symbol',
      points: ['Licensing & compliance', 'Endpoint security', 'Custom development'],
    },
  ];
}

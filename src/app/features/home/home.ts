import { ChangeDetectionStrategy, Component } from '@angular/core';

import { About } from '../about/about';
import { Catalog } from '../catalog/catalog';
import { Hero } from '../hero/hero';
import { Products } from '../products/products';
import { Solutions } from '../solutions/solutions';

/**
 * Hero ships in the first chunk. Every section below it is rendered on the server (so crawlers and
 * no-JS visitors get full content) but its JavaScript is only downloaded and hydrated when it
 * approaches the viewport (incremental hydration), keeping the initial payload small on 3G/4G.
 */
@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Hero, About, Products, Catalog, Solutions],
  template: `
    <app-hero />
    @defer (hydrate on viewport) {
      <app-about />
    }
    @defer (hydrate on viewport) {
      <app-products />
    }
    @defer (hydrate on viewport) {
      <app-catalog [embedded]="true" />
    }
    @defer (hydrate on viewport) {
      <app-solutions />
    }
  `,
})
export class Home {}

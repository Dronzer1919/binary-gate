import type { SeoData } from '../../core/seo/seo.service';
import { GROUPS, PRODUCTS } from './catalog-data';

/** Lazy-loaded with the catalogue route so the 30-item list never enters the initial bundle. */
export const catalogSeo: SeoData = {
  title: 'Product catalogue',
  description:
    'Browse 30 computer hardware, peripheral, active networking and passive infrastructure products, with interactive 3D models and key specifications.',
  image: '/assets/img/og-image.jpg',
  jsonLd: [
    {
      '@type': 'ItemList',
      name: 'Node Network with Binary Gate product catalogue',
      numberOfItems: PRODUCTS.length,
      itemListElement: PRODUCTS.map((p) => ({
        '@type': 'ListItem',
        position: p.no,
        item: {
          '@type': 'Product',
          name: p.name,
          description: `${p.function} Interface: ${p.interface}.`,
          category: GROUPS.find((g) => g.id === p.group)?.title,
        },
      })),
    },
  ],
};

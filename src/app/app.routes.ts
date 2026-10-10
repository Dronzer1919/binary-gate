import type { Routes } from '@angular/router';

import type { SeoData } from './core/seo/seo.service';

const homeSeo: SeoData = {
  title: 'Node Network with Binary Gate',
  description:
    'Node Network with Binary Gate supplies computer hardware, peripherals, network infrastructure and software solutions for businesses: sourcing, deployment and ongoing support.',
  image: '/assets/img/og-image.jpg',
  jsonLd: [
    { '@type': 'WebSite', '@id': 'https://binarygate.in/#website', url: 'https://binarygate.in/', name: 'Node Network with Binary Gate' },
    {
      '@type': 'ComputerStore',
      '@id': 'https://binarygate.in/#org',
      name: 'Node Network with Binary Gate',
      url: 'https://binarygate.in/',
      logo: 'https://binarygate.in/favicon.svg',
      image: 'https://binarygate.in/assets/img/og-image.jpg',
      description:
        'Supplier of computer hardware, peripherals, network infrastructure and software solutions for businesses.',
      email: 'sales@binarygate.in',
      telephone: '+1-555-010-0142',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '100 Example Street',
        addressLocality: 'Sampletown',
        addressCountry: 'US',
      },
      openingHours: 'Mo-Fr 09:00-18:00',
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Products and services',
        itemListElement: [
          'Computer hardware supply',
          'Peripherals supply',
          'Network design and installation',
          'Software solutions and licensing',
        ].map((name) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name } })),
      },
    },
  ],
};

export const routes: Routes = [
  {
    path: '',
    data: { seo: homeSeo },
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
  },
  {
    path: 'contact',
    data: {
      seo: {
        title: 'Contact',
        description: 'Request a quote or ask a question. Tell us what you need and a specialist will reply within one business day.',
      } satisfies SeoData,
    },
    loadComponent: () => import('./features/contact/contact').then((m) => m.Contact),
  },
  {
    path: 'catalog',
    // SEO data (incl. the 30-item JSON-LD list) is resolved lazily so it stays out of the initial bundle.
    resolve: { seo: () => import('./features/catalog/catalog.seo').then((m) => m.catalogSeo) },
    loadComponent: () => import('./features/catalog/catalog').then((m) => m.Catalog),
  },
  {
    path: '**',
    data: { seo: { title: 'Page not found', noindex: true } satisfies SeoData, preload: false },
    loadComponent: () => import('./features/not-found/not-found').then((m) => m.NotFound),
  },
];

import { InjectionToken } from '@angular/core';

export interface SiteConfig {
  readonly siteName: string;
  /** Absolute origin used for canonical URLs, Open Graph and the sitemap. */
  readonly siteUrl: string;
  readonly defaultDescription: string;
  readonly defaultImage: string;
  /** Where contact-form enquiries are sent (mailto). */
  readonly contactEmail: string;
  /** GA4 measurement id (G-XXXXXXX). Empty string disables analytics. */
  readonly analyticsId: string;
  /** Sentry DSN. Empty string disables error reporting. */
  readonly sentryDsn: string;
  readonly environment: 'production' | 'development';
}

export const SITE_CONFIG = new InjectionToken<SiteConfig>('SITE_CONFIG');

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  siteName: 'Node Network with Binary Gate',
  siteUrl: 'https://binarygate.in',
  defaultDescription:
    'Computer hardware, peripherals, network infrastructure and software solutions for businesses: sourcing, deployment and support.',
  defaultImage: '/assets/img/og-image.jpg',
  contactEmail: 'sales@binarygate.in',
  analyticsId: '',
  sentryDsn: '',
  environment: 'production',
};

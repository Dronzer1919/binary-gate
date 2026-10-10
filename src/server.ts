import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import compression from 'compression';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

app.disable('x-powered-by');
app.use(compression());

/**
 * Static files from /browser.
 *  - Content-hashed bundles (main-ABC123.js, styles-XYZ.css): cache for a year, immutable.
 *  - Everything else (images, robots.txt, sitemap.xml): 1 day + stale-while-revalidate.
 * Keep these rules in sync with public/_headers (used when served straight from a CDN).
 */
app.use(
  express.static(browserDistFolder, {
    index: false,
    redirect: false,
    setHeaders(res, path) {
      if (/-[A-Z0-9]{8}\.(js|css|woff2?)$/.test(path)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      }
    },
  }),
);

/**
 * Everything else is rendered by Angular. Browsers always revalidate; a CDN may
 * keep the HTML for an hour and serve stale for a day while it refreshes.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => {
      if (!response) {
        next();
        return;
      }
      if (response.ok) {
        response.headers.set(
          'Cache-Control',
          'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
        );
      }
      return writeResponseToNodeResponse(response, res);
    })
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, it is ran via PM2, or a host launcher
 * (`npm start`, see scripts/start.mjs) sets START_SERVER.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id'] || process.env['START_SERVER']) {
  const port = process.env['PORT'] ?? 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.warn(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);

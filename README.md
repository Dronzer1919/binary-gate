# Node Network with Binary Gate: Angular 21 SSR site with 3D

The premium 3D hardware/network/software marketing site, built as a standalone, zoneless, signals-based
Angular app with SSR + prerendering. ("Node Network with Binary Gate" and all contact details are placeholders.)

```bash
npm install
npm start            # DEV server http://localhost:4200  (unminified: do NOT run Lighthouse on this)
npm run start:prod   # production build + SSR server http://localhost:4000  (measure performance here)
npm run lint         # ESLint (angular-eslint + typescript-eslint strict + template a11y rules)
npm run test:ci      # Vitest unit tests (44)
npm run build:prod   # production build + prerender
npm run serve:ssr    # SSR/Express server on :4000 (after build)
npm run smoke        # real-browser test: SSR content, 3D, accordion, form (CHROME_PATH required)
npm run smoke:catalog # real-browser test of /catalog: selects all 30 products in WebGL, writes a contact sheet
npm run lighthouse   # Lighthouse CI budgets (lighthouserc.json)
npm run images       # regenerate hero AVIF/WebP/PNG (legacy script; site images live in public/assets/img)
```

> Requires Node 20.19+/22.12+ for Angular 21.

## Structure
```
src/styles/        _themes (palettes), _mixins (theme-colors mixin), _typography (type mixin), _ui, _base
src/app/core/      config, seo (meta + JSON-LD), theme, http cache, preloading, monitoring (GA4, Sentry),
                   three/ (models, hero + viewer scenes, load policy), ui/ (reveal + tilt directives)
src/app/shared/    Card, Accordion, Radio(+Group), Input, Textarea, FormField, Picture, Icon
src/app/features/  hero, about, products, solutions, contact, home, catalog (30 products), not-found
```

## Product catalogue (`/catalog`)
30 products in four groups (Internal Hardware, External Peripherals, Active Networking, Passive Infrastructure).
Data lives in `features/catalog/catalog-data.ts`; each product has a procedural 3D model in
`core/three/product-models.ts` (add a product = one data row + one builder; a unit test enforces 1:1).
One shared, draggable viewer (also arrow-key rotatable) shows the selected product, so only one WebGL context
is used. All product text is in the prerendered HTML, with `ItemList` JSON-LD resolved lazily with the route.

## Measuring performance correctly
Lighthouse must be run against the **production build**, not `npm start`. The dev server ships ~2.7 MB of
unminified code and scores around 55-65 on performance; the production build scores 97-99 on mobile
(simulated slow 4G + 4x CPU) and 100 on desktop, with 0 ms Total Blocking Time.

```bash
npm run start:prod          # builds, then serves on http://localhost:4000
```
Then audit http://localhost:4000 in a private/incognito window with extensions disabled (extensions add
main-thread work and lower the score), or use `npm run lighthouse`.

### What keeps it fast (and the trade-offs)
- **The app starts on first interaction** (or ~4 s after load if the visitor does nothing): see `src/main.ts`.
  Every page is fully server-rendered and visible, so the framework is only needed for interactivity. This
  removes framework start-up from the load-time main thread (TBT 0 ms). Links are real `href`s (work before the
  app is running) and Angular's event replay re-plays clicks/keys made before hydration. Trade-off: the very first
  interaction waits briefly for the framework, which is prefetched at idle (`scripts/postbuild.mjs`).
- **`content-visibility: auto` on everything below the first screen** (home sections, catalogue lists): the
  browser skips layout/paint of off-screen content, cutting first layout from ~170 ms to ~55 ms on home.
- **Two font weights only (400/700)**: every distinct weight/size combination costs a font instance on first layout.
- The hero image is preloaded only on the home page (injected by the Hero component during prerender).
- No `HttpClient` in the bundle (the site makes no HTTP calls). `core/http/cache.interceptor.ts` remains if you add
  an API: `provideHttpClient(withFetch(), withInterceptors([cacheInterceptor]))`.

## Performance design
- **Prerendered, full content in HTML.** Every section is server-rendered; below the hero each section is
  `@defer (hydrate on viewport)`, so its JS is downloaded and hydrated only as it nears the viewport
  (incremental hydration) while crawlers and no-JS visitors still get everything.
- **Initial JS is ~9 kB (just the start-up loader); the ~91 kB framework loads on demand.** three.js (~115 kB gz) is a separate lazy chunk, loaded on first user input
  (or 6 s after load) for the hero, and when scrolled near for the showcase viewer. Skipped on Save-Data/2G/low-memory.
  Render loops pause off-screen and in background tabs; reduced motion renders a static scene.
- AVIF/WebP/PNG `<picture>` with explicit sizes, LCP image preloaded, `content-visibility: auto` on below-fold sections,
  system fonts, inline critical CSS, long-lived cache headers (`src/server.ts`, `public/_headers`).

## Accessibility
Skip link, landmarks, section-aware `aria-current` nav, ARIA accordion (arrow/Home/End), keyboard-rotatable 3D viewer,
labelled fields with linked live-region errors and focus management, 44px targets, visible focus, reduced motion,
`prefers-contrast: more` palette + forced-colors support, dark/light/high-contrast themes via one SCSS mixin.

## Before you deploy
1. `src/app/core/config/app-config.ts`: site URL, contact email, `analyticsId`, `sentryDsn`.
2. `binarygate.in` in `robots.txt`, `sitemap.xml` and the JSON-LD in `app.routes.ts`; phone/address in `contact.ts`.
3. `security.allowedHosts` in `angular.json`: add your production domain (SSR rejects unknown hosts).
4. The contact form opens the visitor's email client (no backend). Replace `submit()` in `contact.ts` with a `fetch` to a form service if desired.

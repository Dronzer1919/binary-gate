# Deploying the frontend to Hostinger (binarygate.in)

Only the static frontend is deployed. All three pages (`/`, `/catalog`, `/contact`) are prerendered at build
time and the contact form uses `mailto:`, so no Node server is needed: plain Hostinger shared hosting works.

Flow: change locally -> `git push` (main) -> GitHub Action builds -> `deploy` branch -> Hostinger pulls it into `public_html`.

## One-time setup
1. Push to GitHub. The `Build static site` action (`.github/workflows/deploy-static.yml`) creates the `deploy` branch
   containing only the built site (`dist/app/browser`, including `.htaccess`).
2. hPanel -> Websites -> binarygate.in -> Advanced -> **Git**: repository
   `https://github.com/Dronzer1919/binary-gate.git`, branch `deploy`, install path `public_html` (empty it first).
   (Private repo: add the deploy key hPanel shows to GitHub -> Settings -> Deploy keys.)
3. Enable the **auto-deployment webhook** hPanel shows and add it in GitHub -> Settings -> Webhooks, so every
   push deploys by itself. Otherwise press "Deploy" in hPanel after each push.
4. hPanel -> SSL: enable free SSL and "Force HTTPS" for binarygate.in.

## Manual alternative (no Git)
`npm run build:prod`, then upload the contents of `dist/app/browser/` (including the hidden `.htaccess`) to `public_html` via File Manager/FTP.

## Every update
`git add -A && git commit -m "message" && git push` -> wait for the green Action -> Hostinger redeploys.

## Prompt for Hostinger's AI agent
> Deploy my static website to binarygate.in. Source: GitHub repo https://github.com/Dronzer1919/binary-gate.git,
> branch `deploy`. It is already built (plain HTML/JS/CSS plus a `.htaccess`), no build step and no Node.js needed.
> Deploy the branch root into `public_html` for binarygate.in (clear the default placeholder files first), keep
> `.htaccess`, enable free SSL with Force HTTPS, set up auto-deploy on push, and make `www.binarygate.in` redirect to
> `binarygate.in`. Afterwards check that `/`, `/catalog/` and `/contact/` load over HTTPS and that a random URL shows the 404 page.

## Later: server (SSR) deploy
The Node/Express server (`npm run start:host`, `scripts/start.mjs`) needs a Node.js plan; only required if you add server-rendered routes or an API.

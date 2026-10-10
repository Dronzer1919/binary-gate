# Deploying to Hostinger (binarygate.in)

Workflow: change locally -> `git push` -> on the server `git pull` -> build -> restart.

This is an Angular SSR app, so it needs a **Node.js** plan on Hostinger (Business/Cloud "Node.js Web App", or a VPS).
Plain shared "static" hosting can't run it.

## One-time setup
1. Create a GitHub repo and push this folder (`git remote add origin <url>`, `git push -u origin main`).
2. In hPanel -> Websites -> binarygate.in -> **Node.js** (or "Add website" -> Node.js Web App) and connect the GitHub repo, branch `main`.
3. Settings:
   - Node version: 22
   - Install: `npm ci`
   - Build: `npm run build:prod`
   - Start file / command: `scripts/start.mjs` (or `npm run start:host`)
   - Environment: `NODE_ENV=production` (`PORT` is normally provided by Hostinger)
4. Point the domain at the app and enable SSL in hPanel.

## Every update
```
git add -A && git commit -m "message" && git push
```
Then in hPanel press **Redeploy** (or on a VPS: `git pull && npm ci && npm run build:prod && pm2 restart all`).

## VPS with PM2
```
npm ci && npm run build:prod
pm2 start scripts/start.mjs --name binarygate
```
Put Nginx in front, proxying `binarygate.in` to `http://127.0.0.1:4000`.

## Before going live
Replace the placeholder phone/address in `src/app/features/contact/contact.ts` and confirm `sales@binarygate.in` exists.

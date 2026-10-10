// Production launcher for hosts that run "node <file>" (Hostinger Node.js app, PM2, ...).
// Reads PORT from the environment (default 4000) and serves dist/app after `npm run build:prod`.
process.env.START_SERVER = '1';
await import('../dist/app/server/server.mjs');

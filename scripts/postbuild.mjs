// Post-build step: turn the framework chunk hints Angular puts into every prerendered page from
// <link rel="modulepreload"> (fetched immediately, competing with first paint) into <link rel="prefetch">
// (fetched at idle, after the page has loaded).
//
// Why: the app is deliberately started on first interaction (see src/main.ts), so the framework is not
// needed to render anything. Prefetching still leaves it in the HTTP cache by the time it is needed.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(process.cwd(), 'dist', 'app', 'browser');

function* htmlFiles(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      yield* htmlFiles(path);
    } else if (name.endsWith('.html')) {
      yield path;
    }
  }
}

let files = 0;
let links = 0;
for (const file of htmlFiles(root)) {
  const html = readFileSync(file, 'utf8');
  const next = html.replace(/<link rel="modulepreload" href="([^"]+)">/g, (_, href) => {
    links += 1;
    return `<link rel="prefetch" as="script" href="${href}">`;
  });
  if (next !== html) {
    writeFileSync(file, next);
    files += 1;
  }
}
console.log(`postbuild: ${links} modulepreload hints -> prefetch in ${files} page(s)`);

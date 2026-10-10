const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

console.log('Building Latest Web Frontend for Desktop...');
try {
  execSync('npx pnpm --filter @cricket-reports/web build', { cwd: path.join(__dirname, '../..'), stdio: 'inherit' });
  
  const webDistSrc = path.join(__dirname, '../web/dist');
  const webDistDest = path.join(__dirname, 'web/dist');
  if (fs.existsSync(webDistSrc)) {
    console.log('Syncing updated Web dist to desktop web/dist...');
    fs.cpSync(webDistSrc, webDistDest, { recursive: true, force: true });
  }
} catch (err) {
  console.error('Warning during web build for desktop launch:', err.message);
}

console.log('Bundling Desktop Main process with esbuild...');
esbuild.buildSync({
  entryPoints: [path.join(__dirname, 'src/main.js')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: path.join(__dirname, 'src/main-bundle.js'),
  external: ['electron', 'better-sqlite3'],
  banner: {
    js: `import { createRequire as __createRequire } from 'module'; import { fileURLToPath as __fileURLToPath } from 'url'; import { dirname as __dirnameFn } from 'path'; const require = __createRequire(import.meta.url); const __filename = __fileURLToPath(import.meta.url); const __dirname = __dirnameFn(__filename);`
  }
});
console.log('Main process bundled successfully into src/main-bundle.js');

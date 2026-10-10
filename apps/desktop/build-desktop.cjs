const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Building React Web Frontend...');
execSync('npx pnpm --filter @cricket-reports/web build', { cwd: path.join(__dirname, '../..'), stdio: 'inherit' });

const distDir = path.join(__dirname, '../dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Ensure default Cricket database file is included in apps/desktop/src/
const localCricketDbSrc = path.join(__dirname, '../api/src/database/Cricket');
const localCricketDbDest = path.join(__dirname, 'src/Cricket');
if (fs.existsSync(localCricketDbSrc)) {
  console.log('Copying default Cricket DB file into desktop package...');
  fs.copyFileSync(localCricketDbSrc, localCricketDbDest);
}

// Copy React web dist folder into apps/desktop/web/dist so @electron/packager bundles it inside resources/app/web/dist
const webDistSrc = path.join(__dirname, '../web/dist');
const webDistDest = path.join(__dirname, 'web/dist');
if (fs.existsSync(webDistSrc)) {
  console.log('Copying Web frontend build (web/dist) into desktop package...');
  fs.cpSync(webDistSrc, webDistDest, { recursive: true });
}

// Bundle Electron Main process code into standalone ESM file (inlining all JS dependencies)
execSync('node bundle-main.cjs', {
  cwd: __dirname,
  stdio: 'inherit'
});

// Rebuild native C++ modules (better-sqlite3) for Electron ABI
console.log('Rebuilding native modules (better-sqlite3) for Electron ABI...');
try {
  execSync('npx @electron/rebuild -f -w better-sqlite3', { cwd: __dirname, stdio: 'inherit' });
} catch (e) {
  console.warn('Warning: @electron/rebuild encountered an issue, proceeding with packaged build...', e.message);
}

// Ensure pnpm node_modules symlinks are followed into production app package
console.log('Packaging Standalone Desktop Executable Folder...');
execSync('npx @electron/packager . "Cricket Report Studio" --platform=win32 --arch=x64 --out=dist --overwrite --deref-symlinks=true --prune=false', {
  cwd: __dirname,
  stdio: 'inherit'
});


console.log('\n======================================================');
console.log('BUILD SUCCESSFUL!');
console.log('Your Windows Executable directory is ready at:');
console.log(path.join(distDir, 'Cricket Report Studio-win32-x64'));
console.log('Click on "Cricket Report Studio.exe" to launch!');
console.log('======================================================\n');

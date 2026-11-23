'use strict';

/**
 * Crea el instalador ED-BUBBLE-Setup-<versión>.exe a partir de dist/release/win-unpacked
 * con NSIS (el que descarga electron-builder). Funciona en Windows y en Linux sin Wine.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const app = path.join(__dirname, '..');
const version = require('../package.json').version;
const src = path.join(app, 'dist', 'release', 'win-unpacked');
const out = path.join(app, 'dist', 'release', `ED-BUBBLE-Setup-${version}.exe`);
if (!fs.existsSync(path.join(src, 'ED BUBBLE.exe'))) throw new Error(`Falta ${src}: ejecuta antes electron-builder --win --dir`);

// NSIS de la caché de electron-builder
const cache = process.env.ELECTRON_BUILDER_CACHE || (process.platform === 'win32'
  ? path.join(process.env.LOCALAPPDATA, 'electron-builder', 'Cache') : path.join(os.homedir(), '.cache', 'electron-builder'));
const nsisRoot = path.join(cache, 'nsis');
const nsisDir = fs.existsSync(nsisRoot) && fs.readdirSync(nsisRoot).filter((d) => /^nsis-\d/.test(d)).sort().pop();
if (!nsisDir) throw new Error('No encuentro NSIS en la caché de electron-builder (se descarga al compilar con target nsis una vez).');
const home = path.join(nsisRoot, nsisDir);
const makensis = process.platform === 'win32' ? path.join(home, 'Bin', 'makensis.exe') : path.join(home, process.platform === 'darwin' ? 'mac' : 'linux', 'makensis');

const v4 = `${version.replace(/-.*/, '')}.0`;
const flag = process.platform === 'win32' ? '/' : '-';
const args = [`${flag}V2`, `${flag}DVERSION=${version}`, `${flag}DVERSION4=${v4}`, `${flag}DSRC=${src}`, `${flag}DOUTFILE=${out}`,
  `${flag}DICON=${path.join(app, 'build', 'icon.ico')}`, path.join(app, 'build', 'installer.nsi')];
execFileSync(makensis, args, { stdio: 'inherit', env: { ...process.env, NSISDIR: home } });
console.log(`[instalador] ${out} (${(fs.statSync(out).size / 1048576).toFixed(1)} MB)`);

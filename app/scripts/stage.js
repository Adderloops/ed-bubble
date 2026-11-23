'use strict';

/**
 * Prepara la carpeta que se empaqueta en el instalador (app/dist/stage).
 *
 * La app usa código de fuera de app/ (core/, src/services/, definitions/), así
 * que se copia todo con la misma estructura del repo y un package.json raíz
 * que apunta a app/main.js.
 */

const fs = require('fs');
const path = require('path');

const repo = path.join(__dirname, '..', '..');
const appDir = path.join(repo, 'app');
const stage = path.join(appDir, 'dist', 'stage');

const copy = (rel, filter) => fs.cpSync(path.join(repo, rel), path.join(stage, rel), { recursive: true, filter: filter || (() => true) });

fs.rmSync(stage, { recursive: true, force: true });
fs.mkdirSync(stage, { recursive: true });

// app/ sin dependencias de desarrollo, pruebas ni salidas de compilación
for (const f of ['main.js', 'preload.js', 'package.json', 'renderer']) copy(path.join('app', f));
copy('app/node_modules/@fontsource');
copy('core');
for (const f of ['journal-tailer', 'status-reader', 'powerplay-control', 'powerplay-ranks']) copy(`src/services/${f}.js`);
copy('definitions/flags.js');
for (const f of ['LICENSE', 'THIRD_PARTY_NOTICES.md']) copy(f);

const pkg = JSON.parse(fs.readFileSync(path.join(appDir, 'package.json'), 'utf8'));
fs.writeFileSync(path.join(stage, 'package.json'), JSON.stringify({
  name: pkg.name, productName: 'ED BUBBLE', version: pkg.version, description: pkg.description,
  author: pkg.author, license: pkg.license, main: 'app/main.js',
}, null, 2));
console.log(`[stage] ${stage}`);

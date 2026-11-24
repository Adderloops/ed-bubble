'use strict';

/**
 * Pone el icono y los datos de versión en ED BUBBLE.exe con resedit (JavaScript
 * puro), así el instalador se puede compilar también fuera de Windows sin Wine.
 */

const fs = require('fs');
const path = require('path');

exports.default = async function afterPack(ctx) {
  if (ctx.electronPlatformName !== 'win32') return;
  const ResEdit = await import('resedit');
  const { NtExecutable, NtExecutableResource, Resource, Data } = ResEdit;
  const exe = path.join(ctx.appOutDir, `${ctx.packager.appInfo.productFilename}.exe`);
  const version = ctx.packager.appInfo.version.replace(/-.*/, '');
  const file = NtExecutable.from(fs.readFileSync(exe));
  const res = NtExecutableResource.from(file);
  const ico = Data.IconFile.from(fs.readFileSync(path.join(__dirname, '..', 'build', 'icon.ico')));
  const groups = Resource.IconGroupEntry.fromEntries(res.entries);
  Resource.IconGroupEntry.replaceIconsForResource(res.entries, groups.length ? groups[0].id : 1, groups.length ? groups[0].lang : 1033, ico.icons.map((i) => i.data));
  const vi = Resource.VersionInfo.fromEntries(res.entries)[0] || Resource.VersionInfo.createEmpty();
  const [a, b, c] = version.split('.').map(Number);
  vi.setFileVersion(a, b, c, 0, 1033); vi.setProductVersion(a, b, c, 0, 1033);
  vi.setStringValues({ lang: 1033, codepage: 1200 }, {
    FileDescription: 'ED BUBBLE', ProductName: 'ED BUBBLE', CompanyName: 'Adder', OriginalFilename: 'ED BUBBLE.exe',
    InternalName: 'ED BUBBLE', LegalCopyright: '© Adder · GPLv3', FileVersion: ctx.packager.appInfo.version, ProductVersion: ctx.packager.appInfo.version,
  });
  vi.outputToResourceEntries(res.entries);
  res.outputResource(file);
  fs.writeFileSync(exe, Buffer.from(file.generate()));
  console.log(`[after-pack] icono y versión en ${path.basename(exe)}`);
};

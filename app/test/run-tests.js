'use strict';

/* Tests del motor de datos de ED BUBBLE (core/). Se ejecutan con `npm test` en app/. */

const assert = require('assert');
const model = require('../../core/model');
const derive = require('../../core/derive');

let ok = 0; let fail = 0;
function test(name, fn) {
  try { fn(); ok += 1; console.log(`  OK  ${name}`); } catch (e) { fail += 1; console.log(`  FALLA  ${name}\n        ${e.message}`); }
}
const asyncTests = [];
function testAsync(name, fn) { asyncTests.push([name, fn]); }
const ev = (event, extra = {}) => ({ timestamp: '2026-11-22T14:00:00Z', event, ...extra });
const statusRaw = (flags, extra = {}) => ({ Flags: flags, Flags2: 0, Pips: [4, 4, 4], Fuel: { FuelMain: 10, FuelReservoir: 0.5 }, Cargo: 0, LegalState: 'Clean', ...extra });
function decoded(raw) { return require('../../src/services/status-reader').decode(raw); }

test('combustible recogible: KGB FOAM y gigantes sí; enanas blancas, neutrones y T Tauri no', () => {
  for (const c of ['K', 'G', 'B', 'F', 'O', 'A', 'M', 'M_RedGiant', 'K_OrangeGiant']) assert.strictEqual(derive.isScoopable(c), true, c);
  for (const c of ['DA', 'DB', 'N', 'H', 'TTS', 'AeBe', 'L', 'T', 'Y', 'W', 'C', 'MS', 'S']) assert.strictEqual(derive.isScoopable(c), false, c);
  assert.strictEqual(derive.isScoopable(null), null);
});

test('LoadGame + Loadout: nave, alcance y capacidades; el tipo localizado no se arrastra al cambiar de nave', () => {
  const s = model.createState();
  model.applyEvent(s, ev('LoadGame', { Commander: 'Adder', Ship: 'SmallCombat01_NX', Ship_Localised: 'Kestrel Mk II', ShipName: 'K', ShipIdent: 'X', Credits: 100 }));
  model.applyEvent(s, ev('Loadout', { Ship: 'panthermkii', ShipName: 'Sapo volador', ShipIdent: 'Truck', MaxJumpRange: 38.36, FuelCapacity: { Main: 128, Reserve: 1.11 }, CargoCapacity: 1148, HullHealth: 1 }));
  assert.strictEqual(s.ship.type, 'panthermkii');
  assert.strictEqual(s.ship.typeLocalised, null);
  assert.strictEqual(s.ship.cargoCapacity, 1148);
  assert.strictEqual(s.ship.fuelCapacity, 128);
});

test('atraque: DockingGranted activa la columna; Docked, cancelado o denegado la quitan', () => {
  const s = model.createState();
  model.applyEvent(s, ev('DockingGranted', { LandingPad: 7, StationName: 'X', StationType: 'Coriolis' }));
  assert.strictEqual(s.docking.active, true); assert.strictEqual(s.docking.pad, 7);
  model.applyEvent(s, ev('Docked', { StationName: 'X', StationType: 'Coriolis', StarSystem: 'Sol' }));
  assert.strictEqual(s.docking.active, false); assert.strictEqual(s.location.docked, true);
  model.applyEvent(s, ev('DockingGranted', { LandingPad: 3, StationName: 'Y', StationType: 'Orbis' }));
  model.applyEvent(s, ev('DockingCancelled', { StationName: 'Y' }));
  assert.strictEqual(s.docking.active, false);
});

test('FSDJump: sistema, último salto, sesión y objetivo de salto limpio al llegar', () => {
  const s = model.createState();
  model.applyEvent(s, ev('FSDTarget', { Name: 'Sol', StarClass: 'G' }));
  model.applyEvent(s, ev('FSDJump', { StarSystem: 'Sol', JumpDist: 12.5, FuelUsed: 2.1, SystemAllegiance: 'Federation', Population: 100, PowerplayState: 'Unoccupied' }));
  assert.strictEqual(s.location.system, 'Sol');
  assert.strictEqual(s.location.starClass, 'G');
  assert.strictEqual(s.fsdTarget.name, null);
  assert.strictEqual(s.lastJump.fuelUsed, 2.1);
  assert.strictEqual(s.session.jumps, 1);
});

test('colonización: progreso, toneladas que faltan y nombre de la obra por MarketID', () => {
  const s = model.createState();
  model.applyEvent(s, ev('Docked', { StationName: "Orbital Construction Site: Sisters' Pride", StationType: 'SpaceConstructionDepot', MarketID: 42, StarSystem: 'P' }));
  model.applyEvent(s, ev('ColonisationConstructionDepot', { MarketID: 42, ConstructionProgress: 0.25, ResourcesRequired: [
    { Name_Localised: 'Steel', RequiredAmount: 100, ProvidedAmount: 40 }, { Name_Localised: 'Titanium', RequiredAmount: 50, ProvidedAmount: 50 }] }));
  const c = derive.view(s).colonisation;
  assert.strictEqual(c.name, "Orbital Construction Site: Sisters' Pride");
  assert.strictEqual(c.remaining, 60);
  assert.strictEqual(c.progress, 0.25);
});

test('modo de vuelo y sección para AHORA', () => {
  const s = model.createState();
  model.applyStatus(s, statusRaw(1 << 4), decoded(statusRaw(1 << 4)));
  assert.strictEqual(derive.flightMode(s).key, 'supercruise');
  assert.strictEqual(derive.flightMode(s).section, 'vuelo');
  model.applyStatus(s, statusRaw(1), decoded(statusRaw(1)));
  assert.strictEqual(derive.flightMode(s).key, 'docked');
});

test('alertas: combustible bajo, sobrecalentamiento, buscado y carga robada', () => {
  const s = model.createState();
  s.ship.fuelCapacity = 64;
  const raw = statusRaw((1 << 20) | (1 << 24), { LegalState: 'Wanted', Fuel: { FuelMain: 8, FuelReservoir: 0.5 } });
  model.applyStatus(s, raw, decoded(raw));
  model.applyCargo(s, { Count: 4, Inventory: [{ Name: 'gold', Name_Localised: 'Gold', Count: 4, Stolen: 4 }] });
  const t = derive.alerts(s).map((a) => a.text).join(' | ');
  assert.ok(/Combustible bajo/.test(t), t);
  assert.ok(/Sobrecalentamiento/.test(t), t);
  assert.ok(/buscado/.test(t), t);
  assert.ok(/Carga robada a bordo · 4 t/.test(t), t);
});

test('ruta de NavRoute.json: distancias por coordenadas y recorte al sistema actual', () => {
  const s = model.createState();
  s.location.system = 'B';
  model.applyNavRoute(s, { Route: [{ StarSystem: 'A', StarClass: 'K', StarPos: [0, 0, 0] }, { StarSystem: 'B', StarClass: 'DA', StarPos: [3, 4, 0] }, { StarSystem: 'C', StarClass: 'M', StarPos: [3, 4, 12] }] });
  const r = derive.routeView(s);
  assert.strictEqual(r.legs.length, 2);
  assert.strictEqual(r.legs[0].system, 'B');
  assert.strictEqual(r.legs[1].distance, 12);
  assert.strictEqual(r.legs[0].scoopable, false);
});

const binds = require('../../core/binds');
const actions = require('../../core/actions');
const keysender = require('../../core/keysender');
const SAMPLE_BINDS = `<?xml version="1.0" encoding="UTF-8" ?>
<Root PresetName="Demo" MajorVersion="4" MinorVersion="2">
	<LandingGearToggle>
		<Primary Device="SaitekX56Throttle" Key="Joy_9" />
		<Secondary Device="Keyboard" Key="Key_7">
			<Modifier Device="Keyboard" Key="Key_LeftControl" />
		</Secondary>
	</LandingGearToggle>
	<TargetNextRouteSystem>
		<Primary Device="Keyboard" Key="Key_N">
			<Modifier Device="Keyboard" Key="Key_RightControl" />
		</Primary>
		<Secondary Device="{NoDevice}" Key="" />
	</TargetNextRouteSystem>
	<DeployHeatSink>
		<Primary Device="Keyboard" Key="Key_H">
			<Modifier Device="SaitekX56Joystick" Key="Joy_3" />
		</Primary>
		<Secondary Device="{NoDevice}" Key="" />
	</DeployHeatSink>
	<FocusLeftPanel><Primary Device="Keyboard" Key="Key_1" /><Secondary Device="{NoDevice}" Key="" /></FocusLeftPanel>
	<CyclePreviousPanel><Primary Device="Keyboard" Key="Key_PageUp" /><Secondary Device="{NoDevice}" Key="" /></CyclePreviousPanel>
	<UI_Right><Primary Device="Keyboard" Key="Key_D" /><Secondary Device="{NoDevice}" Key="" /></UI_Right>
	<UI_Select><Primary Device="Keyboard" Key="Key_Space" /><Secondary Device="{NoDevice}" Key="" /></UI_Select>
</Root>`;

test('controles: toma la tecla de teclado (Primary o Secondary) con sus modificadores e ignora el HOTAS', () => {
  const b = binds.parseBinds(SAMPLE_BINDS);
  assert.deepStrictEqual(b.LandingGearToggle, { key: 'Key_7', modifiers: ['Key_LeftControl'], slot: 'Secondary' });
  assert.strictEqual(binds.bindLabel(b.TargetNextRouteSystem), 'Ctrl D+N');
  assert.strictEqual(b.DeployHeatSink, undefined, 'un modificador de mando no se puede reproducir');
});

test('controles: esquema del juego sin archivo, archivo importado y archivo que no es de controles', () => {
  const fs = require('fs'); const os = require('os'); const path = require('path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'edb-binds-'));
  assert.strictEqual(binds.loadActive(path.join(dir, 'no-existe')).code, 'nofolder');
  assert.strictEqual(binds.loadActive(dir).code, 'nopreset');
  fs.writeFileSync(path.join(dir, 'StartPreset.4.start'), 'KeyboardMouseOnly\nKeyboardMouseOnly');
  const b = binds.loadActive(dir);
  assert.strictEqual(b.code, 'builtin'); assert.strictEqual(b.preset, 'KeyboardMouseOnly');
  const f = path.join(dir, 'Amigo.4.2.binds');
  fs.writeFileSync(f, SAMPLE_BINDS);
  const r = binds.loadFile(f);
  assert.ok(!r.error && r.binds.LandingGearToggle);
  assert.strictEqual(binds.presetFromFile(f), 'Amigo');
  const bad = path.join(dir, 'nota.binds'); fs.writeFileSync(bad, 'hola');
  assert.strictEqual(binds.loadFile(bad).code, 'format');
  assert.strictEqual(binds.loadFile(path.join(dir, 'x.binds')).code, 'read');
});

test('controles: elige el preset activo y su archivo de versión más alta', () => {
  const fs = require('fs'); const os = require('os'); const path = require('path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'edb-binds-'));
  fs.writeFileSync(path.join(dir, 'StartPreset.4.start'), 'Demo\nDemo\nDemo\nDemo');
  fs.writeFileSync(path.join(dir, 'Demo.binds'), '<Root></Root>');
  fs.writeFileSync(path.join(dir, 'Demo.4.2.binds'), SAMPLE_BINDS);
  const r = binds.loadActive(dir);
  assert.strictEqual(r.preset, 'Demo');
  assert.ok(r.file.endsWith('Demo.4.2.binds'));
  assert.ok(r.binds.LandingGearToggle);
});

test('acciones: disponibles solo con tecla de teclado; el atraque es una macro completa', () => {
  const b = binds.parseBinds(SAMPLE_BINDS);
  const d = actions.describe(b);
  assert.strictEqual(d.gear.available, true); assert.strictEqual(d.gear.key, 'Ctrl+7');
  assert.strictEqual(d.heatsink.available, false);
  assert.strictEqual(d.dock.available, true); assert.strictEqual(d.dock.macro, true);
  assert.strictEqual(d.eject.confirm, true);
  assert.strictEqual(actions.build('heatsink', b).error, 'no-key');
});

test('teclas: enfoca el juego primero, pulsa modificador y tecla, y suelta en orden inverso', () => {
  const b = binds.parseBinds(SAMPLE_BINDS);
  const { ops } = actions.build('nextsys', b);
  assert.strictEqual(ops[0].op, 'focus');
  const keys = ops.filter((o) => o.op !== 'sleep' && o.op !== 'focus').map((o) => `${o.op}:${o.sc.toString(16)}${o.ext ? 'e' : ''}`);
  assert.deepStrictEqual(keys, ['down:1de', 'down:31', 'up:31', 'up:1de']);
  const dock = actions.build('dock', b).ops.filter((o) => o.op === 'down').map((o) => o.sc);
  assert.deepStrictEqual(dock, [0x02, 0x49, 0x49, 0x20, 0x39]);
});

test('teclas: en simulación no se envía nada y las órdenes quedan registradas', async () => {
  const k = new keysender.KeySender({ simulate: true });
  const r = await k.run([{ op: 'focus' }]);
  assert.strictEqual(r.ok, true); assert.strictEqual(k.sent.length, 1);
});

test('revisión de controles: sin asignar, solo en mando y tecla compartida entre acciones de ED BUBBLE', () => {
  const kb = binds.parseBinds(SAMPLE_BINDS);
  kb.NightVisionToggle = { key: 'Key_7', modifiers: ['Key_LeftControl'], slot: 'Primary' }; // misma que el tren
  const r = actions.checkControls({ binds: kb, otherDevices: binds.parseOtherDevices(SAMPLE_BINDS) });
  const st = Object.fromEntries(r.problems.map((p) => [p.action, p.status]));
  assert.strictEqual(st.DeployHeatSink, 'unbound', 'modificador de mando: no hay tecla de teclado usable');
  assert.strictEqual(st.EjectAllCargo, 'unbound');
  assert.strictEqual(st.LandingGearToggle, 'shared');
  assert.strictEqual(st.NightVisionToggle, 'shared');
  assert.strictEqual(st.UI_Select, undefined, 'asignada: no es un problema');
  const vuelo = r.groups.find((g) => g.name === 'Vuelo');
  assert.ok(vuelo.ready < vuelo.total);
});

test('revisión de controles: una acción asignada solo al HOTAS se marca como "solo en mando"', () => {
  const xml = '<Root><UI_Up><Primary Device="SaitekX56Joystick" Key="Joy_2" /><Secondary Device="{NoDevice}" Key="" /></UI_Up></Root>';
  const r = actions.checkControls({ binds: binds.parseBinds(xml), otherDevices: binds.parseOtherDevices(xml) });
  assert.strictEqual(r.problems.find((p) => p.action === 'UI_Up').status, 'hotas');
});

test('progreso de la ruta: saltos hechos, que quedan y distancia sin contar el salto ya hecho', () => {
  const s = model.createState();
  s.location.system = 'B';
  model.applyNavRoute(s, { Route: [{ StarSystem: 'A', StarClass: 'K', StarPos: [0, 0, 0] }, { StarSystem: 'B', StarClass: 'G', StarPos: [10, 0, 0] }, { StarSystem: 'C', StarClass: 'DA', StarPos: [30, 0, 0] }, { StarSystem: 'D', StarClass: 'M', StarPos: [60, 0, 0] }] });
  const r = derive.routeView(s);
  assert.strictEqual(r.totalJumps, 3); assert.strictEqual(r.doneJumps, 1);
  assert.strictEqual(r.distance, 50); assert.strictEqual(r.fullDistance, 60); assert.strictEqual(r.doneDistance, 10);
  assert.deepStrictEqual(r.fullLegs.map((l) => (l.done ? 'd' : l.current ? 'c' : '-')).join(''), 'dc--');
  model.applyEvent(s, ev('FSDJump', { StarSystem: 'C', JumpDist: 20, FuelUsed: 1 }));
  const r2 = derive.routeView(s);
  assert.strictEqual(r2.doneJumps, 2); assert.strictEqual(r2.distance, 30);
});

testAsync('dónde comprar: pide a Spansh el material con stock mínimo y plataforma L, y resume cada estación', async () => {
  const sp = require('../../core/spansh');
  let sent = null;
  sp.setFetch(async (url, opts) => { sent = { url, body: JSON.parse(opts.body) }; return { ok: true, json: async () => ({ results: [
    { name: 'Rivera Horizon', system_name: 'HIP 1', type: 'Planetary Port', is_planetary: true, distance: 9.9, distance_to_arrival: 317, has_large_pad: true, market_updated_at: '2026-04-09T00:00:00Z', market: [{ commodity: 'Steel', supply: 5000, buy_price: 3556 }] },
    { name: 'X-1', system_name: 'HIP 2', type: 'Drake-Class Carrier', distance: 12, has_large_pad: true, market: [{ commodity: 'Steel', supply: 9000, buy_price: 3000 }] }] }) }; });
  const l = await sp.markets({ commodity: 'Steel', reference: 'Aquí', minSupply: 1148, largePad: true });
  assert.ok(/stations\/search/.test(sent.url));
  assert.deepStrictEqual(sent.body.filters.market[0].supply.value, ['1148', '1000000000']);
  assert.deepStrictEqual(sent.body.filters.has_large_pad, { value: true });
  assert.strictEqual(l[0].supply, 5000); assert.strictEqual(l[0].price, 3556); assert.strictEqual(l[0].planetary, true); assert.strictEqual(l[0].icon, 'surface_port');
  assert.strictEqual(l[1].carrier, true);
  sp.setFetch((...a) => fetch(...a));
});

// ---- Trazar ruta: con un juego simulado (teclas falsas y estado que reacciona) ----
const plot = require('../../core/plot');
function fakeGame({ confirm = true, loseFocusAt = null } = {}) {
  const state = { status: { guiFocus: 'NoFocus' }, route: [], fsdTarget: { name: null } };
  const kb = binds.parseBinds(SAMPLE_BINDS);
  const bind = (k) => ({ key: k, modifiers: [] });
  Object.assign(kb, { GalaxyMapOpen: bind('Key_M'), CamZoomIn: bind('Key_Insert'), CamZoomOut: bind('Key_Delete'), UI_Up: bind('Key_W') });
  const sent = [];
  let calls = 0;
  const keys = { run: async (ops) => {
    calls += 1;
    if (loseFocusAt && calls === loseFocusAt) return { ok: false, error: 'focus-lost' };
    for (const o of ops) if (o.op === 'down') sent.push(o.sc);
    const downs = ops.filter((o) => o.op === 'down').map((o) => o.sc);
    if (downs.includes(0x32)) state.status.guiFocus = state.status.guiFocus === 'GalaxyMap' ? 'NoFocus' : 'GalaxyMap'; // M = mapa
    const hold = ops.find((o) => o.op === 'sleep' && o.ms >= 1000);
    if (hold && confirm) state.route = [{ system: 'Aquí' }, { system: 'Sol' }];
    return { ok: true };
  } };
  let clip = null;
  return { state, kb, sent, keys, clipboard: { writeText: (t) => { clip = t; } }, clip: () => clip };
}
Object.assign(plot.T, { travelBase: 10, travelPer1000: 5, poll: 5, settle: 5, step: 1, afterSearchSelect: 1, afterPaste: 1, afterEnter: 1, afterRight: 1, mapOpenTimeout: 300, verifyTimeout: 200 });

testAsync('trazar ruta: abre el mapa, pega el nombre, mantiene seleccionar, confirma la ruta y cierra el mapa', async () => {
  const g = fakeGame();
  const steps = [];
  const r = await plot.plotRoute('Sol', 230, { keys: g.keys, binds: g.kb, getState: () => g.state, clipboard: g.clipboard, onStep: (t) => steps.push(t) });
  assert.deepStrictEqual(r, { ok: true });
  assert.strictEqual(g.clip(), 'Sol');
  assert.ok(g.sent.includes(0x2F) && g.sent.includes(0x1C), 'Ctrl+V e Intro');
  assert.strictEqual(g.state.status.guiFocus, 'NoFocus', 'el mapa queda cerrado');
  assert.ok(steps.includes('Trazando la ruta'));
});

testAsync('trazar ruta: si el juego no confirma la ruta, lo dice', async () => {
  const g = fakeGame({ confirm: false });
  const r = await plot.plotRoute('Sol', 0, { keys: g.keys, binds: g.kb, getState: () => g.state, clipboard: g.clipboard });
  assert.strictEqual(r.error, 'not-confirmed');
});

testAsync('trazar ruta: se detiene si el juego pierde el foco, y se puede cancelar', async () => {
  const g = fakeGame({ loseFocusAt: 2 });
  const r = await plot.plotRoute('Sol', 0, { keys: g.keys, binds: g.kb, getState: () => g.state, clipboard: g.clipboard });
  assert.strictEqual(r.error, 'focus-lost');
  const g2 = fakeGame(); let cancel = false;
  const r2 = await plot.plotRoute('Sol', 0, { keys: g2.keys, binds: g2.kb, getState: () => g2.state, clipboard: g2.clipboard, onStep: (t) => { if (t.startsWith('Buscando')) cancel = true; }, isCancelled: () => cancel });
  assert.strictEqual(r2.error, 'cancelled');
});

testAsync('trazar ruta: sin las teclas necesarias no envía nada', async () => {
  const g = fakeGame(); delete g.kb.CamZoomOut;
  const r = await plot.plotRoute('Sol', 0, { keys: g.keys, binds: g.kb, getState: () => g.state, clipboard: g.clipboard });
  assert.strictEqual(r.error, 'no-key'); assert.deepStrictEqual(r.missing, ['CamZoomOut']); assert.strictEqual(g.sent.length, 0);
});

test('atraque concedido: aviso en la cabecera visible desde cualquier sección', () => {
  const s = model.createState();
  model.applyEvent(s, ev('DockingGranted', { LandingPad: 25, StationName: 'Macgregor', StationType: 'Coriolis' }));
  assert.deepStrictEqual(derive.alerts(s)[0], { kind: 'dock', level: 'info', text: 'Atraque · plataforma 25' });
  model.applyEvent(s, ev('Docked', { StationName: 'Macgregor', StationType: 'Coriolis', StarSystem: 'S' }));
  assert.ok(!derive.alerts(s).some((a) => a.level === 'info'));
});

test('historial: recupera obras y última estación de Journals anteriores, sin ensuciar la sesión', () => {
  const fs = require('fs'); const os = require('os'); const path = require('path');
  const { Engine } = require('../../core/engine');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'edb-hist-'));
  const L = (o) => JSON.stringify(o);
  fs.writeFileSync(path.join(dir, 'Journal.2026-11-20T100000.01.log'), [
    L({ timestamp: '2026-11-20T10:00:00Z', event: 'Docked', StationName: 'Obra X', StationType: 'SpaceConstructionDepot', StarSystem: 'S', MarketID: 9 }),
    L({ timestamp: '2026-11-20T10:01:00Z', event: 'ColonisationConstructionDepot', MarketID: 9, ConstructionProgress: 0.5, ResourcesRequired: [{ Name: '$steel_name;', Name_Localised: 'Steel', RequiredAmount: 100, ProvidedAmount: 40, Payment: 1 }] }),
    L({ timestamp: '2026-11-20T10:02:00Z', event: 'MarketSell', Type: 'gold', Count: 1, TotalSale: 1 }),
  ].join('\n'));
  fs.writeFileSync(path.join(dir, 'Journal.2026-11-23T100000.01.log'), L({ timestamp: '2026-11-23T10:00:00Z', event: 'Fileheader' }));
  const e = new Engine({ folder: dir });
  const n = e.loadHistory();
  assert.strictEqual(n, 2);
  assert.strictEqual(e.state.colonisation.depots['9'].remaining, 60);
  assert.strictEqual(e.state.station.name, 'Obra X');
  assert.strictEqual(e.state.log.length, 0); assert.strictEqual(e.state.location.docked, false);
});

test('coordenadas: lee formatos pegados y calcula rumbo, distancia y giro', () => {
  const geo = require('../../core/geo');
  assert.deepStrictEqual(geo.parseCoords('12.345, -67.89'), { lat: 12.345, lon: -67.89 });
  assert.deepStrictEqual(geo.parseCoords('12,345 -67,89'), { lat: 12.345, lon: -67.89 });
  assert.deepStrictEqual(geo.parseCoords('Lat: -5.5 Lon: 120.25'), { lat: -5.5, lon: 120.25 });
  assert.strictEqual(geo.parseCoords('95, 10'), null);
  assert.strictEqual(geo.parseCoords('hola'), null);
  assert.strictEqual(Math.round(geo.bearing(0, 0, 0, 10)), 90); // al este
  assert.strictEqual(Math.round(geo.bearing(0, 0, 10, 0)), 0); // al norte
  const d = geo.distance(0, 0, 0, 1, 1000000); // 1° de longitud en un planeta de 1.000 km de radio
  assert.ok(Math.abs(d - 17453) < 2);
  assert.strictEqual(geo.relative(90, 350), 100); // giro a la derecha
  assert.strictEqual(geo.relative(10, 40), -30); // giro a la izquierda
  const n = geo.surfaceNav({ latitude: 0, longitude: 0, heading: 0, planetRadius: 1000000, bodyName: 'A 1' }, { lat: 0, lon: 1, body: 'A 1' });
  assert.strictEqual(Math.round(n.relative), 90); assert.strictEqual(n.sameBody, true);
  assert.strictEqual(geo.surfaceNav({ latitude: 0, longitude: 0, heading: 0, bodyName: 'B' }, { lat: 1, lon: 1, body: 'A 1' }).sameBody, false);
});

test('powerplay: corte semanal del jueves 07:00 UTC y sistema seguido con su ciclo anterior', () => {
  assert.strictEqual(new Date(derive.lastWeeklyCut(Date.parse('2026-11-23T13:00:00Z'))).toISOString(), '2026-11-19T07:00:00.000Z');
  assert.strictEqual(new Date(derive.lastWeeklyCut(Date.parse('2026-11-19T06:59:00Z'))).toISOString(), '2026-11-12T07:00:00.000Z');
  const s = model.createState();
  const jump = (at, progress, r, u) => ev('FSDJump', { timestamp: at, StarSystem: 'JN', PowerplayState: 'Fortified', ControllingPower: 'Li Yong-Rui', PowerplayStateControlProgress: progress, PowerplayStateReinforcement: r, PowerplayStateUndermining: u, JumpDist: 1, FuelUsed: 1 });
  model.applyEvent(s, jump('2026-11-15T10:00:00Z', 0.5, 90000, 10000));
  model.applyEvent(s, jump('2026-11-22T10:00:00Z', 0.6, 40000, 0));
  model.applyEvent(s, ev('FSDJump', { timestamp: '2026-11-22T11:00:00Z', StarSystem: 'Otro', JumpDist: 1, FuelUsed: 1 }));
  s.powerplay.tracked = 'JN';
  const p = derive.powerplayView(s, Date.parse('2026-11-23T13:00:00Z'));
  assert.strictEqual(p.system.name, 'JN'); assert.strictEqual(p.system.reinforcement, 40000);
  assert.strictEqual(p.system.previous.reinforcement, 90000); assert.strictEqual(p.system.stale, false);
  assert.strictEqual(p.system.nextState, 'Stronghold');
});

test('combustible: sin recolector avisa dónde te quedas corto; con recolector no', () => {
  const fuel = require('../../core/fuel');
  const s = model.createState();
  model.applyEvent(s, ev('Loadout', { Ship: 'smallcombat01_nx', FuelCapacity: { Main: 16, Reserve: 0.6 }, MaxJumpRange: 23, Modules: [{ Slot: 'FrameShiftDrive', Item: 'int_hyperdrive_overcharge_size4_class5' }] }));
  s.location.system = 'A';
  model.applyEvent(s, ev('FSDJump', { StarSystem: 'B', JumpDist: 22.302, FuelUsed: 3.189156 }));
  model.applyEvent(s, ev('FSDJump', { StarSystem: 'A', JumpDist: 13.768, FuelUsed: 0.983253 }));
  assert.strictEqual(s.ship.hasFuelScoop, false); assert.strictEqual(s.ship.fsdSize, 4);
  const m = fuel.fuelModel(s);
  assert.ok(Math.abs(m.k - 0.00244) < 0.0001, `k = ${m.k}`);
  s.status.fuelMain = 16;
  const R = [{ StarSystem: 'A', StarPos: [0, 0, 0] }];
  for (let i = 1; i <= 7; i += 1) R.push({ StarSystem: `S${i}`, StarPos: [22.2 * i, 0, 0] });
  model.applyNavRoute(s, { Route: R });
  const p = fuel.fuelPlan(s);
  assert.strictEqual(p.ok, false); assert.strictEqual(p.reachableSystem, 'S4'); assert.strictEqual(p.shortSystem, 'S5'); assert.strictEqual(p.fitsFullTank, false);
  assert.ok(derive.alerts(s).some((a) => /Combustible: solo 4 saltos/.test(a.text)));
  assert.strictEqual(derive.fuel(s).jumpsLeft, 4, 'saltos a alcance máximo, no con el último salto');
  s.ship.hasFuelScoop = true;
  assert.strictEqual(fuel.fuelPlan(s), null);
});

test('gravedad del cuerpo: escaneo del Journal (m/s² -> g), cuerpo en aproximación e id64 para Spansh', () => {
  const s = model.createState();
  model.applyEvent(s, ev('ApproachBody', { StarSystem: 'X', SystemAddress: 2106387827043, Body: 'X 1 a', BodyID: 2 }));
  assert.deepStrictEqual(s.location.approach, { body: 'X 1 a', bodyId: 2, systemAddress: 2106387827043 });
  model.applyEvent(s, ev('Scan', { BodyName: 'X 1 a', BodyID: 2, SurfaceGravity: 0.686466, Radius: 1200000, Landable: true }));
  assert.ok(Math.abs(s.bodies['X 1 a'].gravity - 0.07) < 0.001);
  assert.strictEqual(require('../../core/spansh').bodyId64(2106387827043, 2), '72059700425754979');
  model.applyEvent(s, ev('LeaveBody', { Body: 'X 1 a' }));
  assert.strictEqual(s.location.approach, null);
  model.applyEvent(s, ev('FSDJump', { StarSystem: 'Y', SystemAddress: 5, StarPos: [0, 0, 0] }));
  assert.deepStrictEqual(s.bodies, {});
});

test('destino en superficie: completa el cuerpo al llegar si se fijó sin él', () => {
  const geo = require('../../core/geo');
  const t = { lat: -45.7, lon: 94.6, body: null };
  assert.strictEqual(geo.adoptBody(t, { status: { bodyName: null }, location: { approach: null } }), null);
  assert.strictEqual(geo.adoptBody(t, { status: { bodyName: 'X 1 a' }, location: {} }).body, 'X 1 a');
  assert.strictEqual(geo.adoptBody(t, { status: {}, location: { approach: { body: 'X 2' } } }).body, 'X 2');
  assert.strictEqual(geo.adoptBody({ ...t, body: 'Y' }, { status: { bodyName: 'X 1 a' }, location: {} }), null); // no cambia uno ya puesto
});

test('plataformas: mapa de puertos estelares (línea, profundidad, tamaño) y comprobadas para la Dodec', () => {
  const pads = require('../../core/pads');
  // comprobadas en el juego (Coriolis): 9 a las 8, 25 a las 12, 27 a la 1
  assert.strictEqual(pads.padHour('Coriolis', 9), 8);
  assert.strictEqual(pads.padHour('Coriolis', 25), 0);
  assert.strictEqual(pads.padHour('Coriolis', 27), 1);
  assert.deepStrictEqual(pads.padInfo('Coriolis', 29), { hour: 1, depth: 3, size: 'S', source: 'mapa' });
  assert.strictEqual(pads.padInfo('Orbis', 1).hour, 6); // la 1, bajo la ranura
  assert.strictEqual(pads.padInfo('Bernal', 24).hour, 0); // la 24, encima
  assert.strictEqual(pads.padHour('Dodec', 32), 8);
  assert.strictEqual(pads.padInfo('Dodec', 5).source, 'regla');
  assert.strictEqual(pads.padHour('Orbis', 0), null);
});

test('colonización: material a bordo cruzado con la obra, viajes con la bodega y entregas de la sesión', () => {
  const s = model.createState();
  model.applyEvent(s, ev('Loadout', { Ship: 'panthermkii', CargoCapacity: 1000, FuelCapacity: { Main: 128 } }));
  model.applyEvent(s, ev('Docked', { StationName: 'Orbital Construction Site: X', StationType: 'SpaceConstructionDepot', StarSystem: 'S', MarketID: 7 }));
  model.applyEvent(s, ev('ColonisationConstructionDepot', { MarketID: 7, ConstructionProgress: 0.1, ResourcesRequired: [
    { Name: '$CMMComposite_name;', Name_Localised: 'CMM Composite', RequiredAmount: 2500, ProvidedAmount: 0, Payment: 1 },
    { Name: '$water_name;', Name_Localised: 'Water', RequiredAmount: 100, ProvidedAmount: 100, Payment: 1 }] }));
  model.applyCargo(s, { Count: 800, Inventory: [{ Name: 'cmmcomposite', Name_Localised: 'CMM Composite', Count: 600 }, { Name: 'gold', Count: 200 }] });
  model.applyEvent(s, ev('ColonisationContribution', { MarketID: 7, Contributions: [{ Name: '$CMMComposite_name;', Name_Localised: 'CMM Composite', Amount: 400 }] }));
  const c = derive.colonisationView(s);
  const d = c.depots[0];
  assert.strictEqual(d.type, 'SpaceConstructionDepot');
  assert.strictEqual(d.trips, 3); // 2500 t / 1000 t
  assert.strictEqual(d.resources[0].key, 'cmmcomposite'); assert.strictEqual(d.resources[0].aboard, 600);
  assert.strictEqual(d.resources[1].remaining, 0); assert.strictEqual(d.done, 1);
  assert.deepStrictEqual(c.cargo.map((i) => i.useful), [true, false]);
  assert.strictEqual(c.contributions[0].total, 400); assert.strictEqual(s.session.deliveredToConstruction, 400);
  assert.strictEqual(derive.flightMode(s).section, 'colonizacion', 'atracado en una obra -> Colonización');
});

test('Spansh: tipo de estación, icono y plataforma (las obras siempre L)', () => {
  const sp = require('../../core/spansh');
  assert.strictEqual(sp.stationKind('Coriolis Starport').icon, 'coriolis');
  assert.strictEqual(sp.stationKind('Planetary Construction Depot').label, 'Construcción en superficie');
  assert.strictEqual(sp.padSize({ type: 'Space Construction Depot', has_large_pad: false }), 'L');
  assert.strictEqual(sp.padSize({ type: 'Outpost', medium_pads: 2, has_large_pad: false }), 'M');
  const n = sp.normalise({ name: 'X', bodies: [{ is_main_star: true, subtype: 'K (Yellow-Orange) Star' }], stations: [{ name: 'A', distance_to_arrival: 5 }, { name: 'B', type: 'Orbis Starport', distance_to_arrival: 9, has_large_pad: true, has_market: true }] });
  assert.strictEqual(n.starClass, 'K');
  assert.deepStrictEqual(n.stations.map((x) => x.name), ['B'], 'sin tipo ni mercado se descarta');
});

(async () => {
  for (const [name, fn] of asyncTests) {
    try { await fn(); ok += 1; console.log(`  OK  ${name}`); } catch (e) { fail += 1; console.log(`  FALLA  ${name}\n        ${e.message}`); }
  }
  console.log(`\n${ok} pruebas OK, ${fail} fallidas.`);
  process.exit(fail ? 1 : 0);
})();

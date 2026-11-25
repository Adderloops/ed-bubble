'use strict';

/* Tests del motor de datos de ED BUBBLE (core/). Se ejecutan con `npm test` en app/. */

const assert = require('assert');
const model = require('../../core/model');
const derive = require('../../core/derive');
const combat = require('../../core/combat');

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

test('mercancías: nombre en inglés para Spansh desde el símbolo interno (juego en otro idioma)', () => {
  const { englishName } = require('../../core/commodities');
  assert.strictEqual(englishName('$steel_name;'), 'Steel');
  assert.strictEqual(englishName('cmmcomposite'), 'CMM Composite');
  assert.strictEqual(englishName('$LiquidOxygen_name;'), 'Liquid oxygen');
  assert.strictEqual(englishName('Acero'), null);
});

test('órbita planetaria: señales, géneros, muestras, anillos, modo y portanaves bastión', () => {
  const s = model.createState();
  model.applyEvent(s, ev('Scan', { BodyName: 'X 1', BodyID: 5, PlanetClass: 'Rocky body', SurfaceGravity: 0.98, Landable: true, Rings: [{ Name: 'X 1 A Ring' }] }));
  model.applyEvent(s, ev('SAASignalsFound', { BodyName: 'X 1', BodyID: 5, Signals: [{ Type: '$SAA_SignalType_Biological;', Type_Localised: 'Biológicas', Count: 3 }, { Type: '$SAA_SignalType_Geological;', Count: 2 }], Genuses: [{ Genus: '$Codex_Ent_Stratum_Genus_Name;', Genus_Localised: 'Stratum' }] }));
  model.applyEvent(s, ev('SAASignalsFound', { BodyName: 'X 1 A Ring', BodyID: 6, Signals: [{ Type: 'Platinum', Type_Localised: 'Platino', Count: 2 }] }));
  model.applyEvent(s, ev('ScanOrganic', { ScanType: 'Analyse', Genus: '$Codex_Ent_Stratum_Genus_Name;', Genus_Localised: 'Stratum', Species_Localised: 'Stratum Tectonicas', Body: 5, SystemAddress: 1 }));
  const b = s.bodies['X 1'];
  assert.deepStrictEqual(b.signals.map((x) => [x.key, x.count]), [['biological', 3], ['geological', 2]]);
  assert.strictEqual(b.genuses[0].name, 'Stratum');
  assert.deepStrictEqual(b.rings, ['X 1 A Ring']);
  assert.strictEqual(s.bodies['X 1 A Ring'].signals[0].name, 'Platino');
  assert.strictEqual(s.bio[5]['$Codex_Ent_Stratum_Genus_Name;'].step, 3);
  // modo: con coordenadas en Status.json, la sección es Órbita planetaria
  s.status.flags = { hasLatLong: true };
  assert.strictEqual(derive.flightMode(s).section, 'orbita');
  s.status.flags = { isSupercruise: true };
  assert.strictEqual(derive.flightMode(s).section, 'vuelo');
  // portanaves bastión de Powerplay (Spansh los da como Planetary Outpost)
  const sp = require('../../core/spansh');
  assert.strictEqual(sp.stationKind('Planetary Outpost', 'Stronghold Carrier').label, 'Portanaves bastión');
  assert.strictEqual(sp.stationKind('Planetary Outpost', 'Foo').label, 'Puesto planetario');
});

test('minería: sesión del plugin, zona, guía de taladros, sitios y minería con la nave', () => {
  const m = require('../../core/mining');
  const R = 1480000; const lat0 = -45.7; const lon0 = 94.65;
  const north = (dm) => lat0 + (dm / R) * (180 / Math.PI);
  // sesión del plugin
  const live = { saved_at: 1000, session: { body: 'X 1 a', start_t: 0, site_signal: null, srv_type: 'mev_rhino' }, summary: { rigs: 3, collections: 9, tonnes: 99, tonnes_by_type: { thorium: 99 }, type_names: { thorium: 'Torio' }, duration_s: 3600, rig_list: [{ lat: lat0, lon: lon0, type: 'thorium' }] } };
  const v = m.liveView(live, 1030);
  assert.strictEqual(v.perHour, 99); assert.strictEqual(v.byType[0].name, 'Torio'); assert.strictEqual(v.ageS, 30); assert.strictEqual(v.rigList.length, 1);
  // zona: el ancla más cercana del mismo cuerpo, hasta 10 km
  const anchors = { 'X 1 a|3': [lat0, lon0, 0, 't'], 'X 1 a|5': [north(20000), lon0, 0, 't'], 'Y|1': [lat0, lon0, 0, 't'] };
  assert.strictEqual(m.zoneAt(anchors, 'X 1 a', north(500), lon0, R), 3);
  assert.strictEqual(m.zoneAt(anchors, 'X 1 a', north(40000), lon0, R), null);
  // guía: a 60 m del taladro no se puede; a 80 m sí
  const rigs = [{ lat: lat0, lon: lon0 }];
  const g1 = m.rigGuide(rigs, { lat: north(60), lon: lon0, heading: 0 }, R, 75);
  assert.ok(!g1.ok && Math.round(g1.nearest.dist) === 60 && Math.round(g1.missing) === 15 && Math.abs(g1.nearest.rel) > 165);
  assert.ok(m.rigGuide(rigs, { lat: north(80), lon: lon0 }, R, 75).ok);
  // sitios ordenados por distancia; agotados marcados
  const sv = m.sitesView([{ lat: north(900), lon: lon0, mineral: 'B' }, { lat: north(100), lon: lon0, mineral: 'A', depleted: true }], { lat: lat0, lon: lon0, heading: 0 }, R);
  assert.deepStrictEqual(sv.map((x) => x.mineral), ['A', 'B']); assert.strictEqual(sv[0].usable, false);
  // nave: prospección, drones, refinado; se reinicia al despegar
  const s = model.createState();
  model.applyEvent(s, ev('LaunchDrone', { Type: 'Prospector' }));
  model.applyEvent(s, ev('ProspectedAsteroid', { Materials: [{ Name: 'Platinum', Name_Localised: 'Platino', Proportion: 31.2 }], Content: '$AsteroidMaterialContent_High;', MotherlodeMaterial: 'Monazite' }));
  model.applyEvent(s, ev('MiningRefined', { Type: '$platinum_name;', Type_Localised: 'Platino' }));
  assert.strictEqual(s.mining.prospects[0].content, 'Alto'); assert.strictEqual(s.mining.motherlodes, 1);
  assert.strictEqual(s.mining.refined.platinum.tonnes, 1); assert.strictEqual(s.mining.drones.prospector, 1);
  model.applyEvent(s, ev('Undocked', { StationName: 'X' }));
  assert.deepStrictEqual(s.mining.refined, {});
  // en el Rhino la sección es Minería
  model.applyEvent(s, ev('LaunchSRV', { SRVType: 'mev_rhino' }));
  s.status.flags = { isInSRV: true };
  assert.strictEqual(derive.flightMode(s).section, 'mineria');
});

test('a pie: equipo actual, mejoras de grado, taquilla y estado en Status.json', () => {
  const s = model.createState();
  model.applyEvent(s, ev('SuitLoadout', { SuitID: 1, SuitName: 'tacticalsuit_class3', SuitName_Localised: '$TacticalSuit_Class1_Name;', SuitMods: ['suit_nightvision'], LoadoutID: 9, LoadoutName: 'Combate',
    Modules: [{ SlotName: 'SecondaryWeapon', SuitModuleID: 22, ModuleName: 'wpn_s_pistol_plasma_charged', ModuleName_Localised: 'Manticore Tormentor', Class: 3, WeaponMods: [] },
      { SlotName: 'PrimaryWeapon1', SuitModuleID: 21, ModuleName: 'wpn_m_shotgun_plasma_doublebarrel', ModuleName_Localised: 'Manticore Intimidator', Class: 4, WeaponMods: ['weapon_range'] }] }));
  const l = s.onfoot.loadouts[s.onfoot.loadout];
  assert.strictEqual(l.suit.name, 'Dominator'); assert.strictEqual(l.suit.grade, 3);
  assert.deepStrictEqual(l.weapons.map((w) => w.slot), ['PrimaryWeapon1', 'SecondaryWeapon']);
  model.applyEvent(s, ev('UpgradeSuit', { Name: 'tacticalsuit_class3', SuitID: 1, Class: 4 }));
  model.applyEvent(s, ev('UpgradeWeapon', { Name: 'wpn_s_pistol_plasma_charged', SuitModuleID: 22, Class: 4 }));
  assert.strictEqual(s.onfoot.loadouts[9].suit.grade, 4); assert.strictEqual(s.onfoot.loadouts[9].weapons[1].grade, 4);
  model.applyLocker(s, { timestamp: 't', Items: [{ Name: 'gmeds', Name_Localised: 'G-Meds', Count: 3 }, { Name: 'gmeds', Name_Localised: 'G-Meds', Count: 2, MissionID: 7 }], Components: [{ Name: 'graphene', Count: 5 }], Consumables: [], Data: [] }, 'locker');
  assert.deepStrictEqual(s.onfoot.locker.items[0], { key: 'gmeds', name: 'G-Meds', count: 5, mission: 2 });
  assert.strictEqual(s.onfoot.locker.components[0].name, 'Graphene');
  model.applyStatus(s, { Flags: 0, Flags2: 1, Oxygen: 0.8, Health: 1, Temperature: 250 }, { flags: {} });
  assert.strictEqual(s.status.oxygen, 0.8); assert.strictEqual(s.status.temperature, 250);
});

test('a pie: materiales para subir de grado (trajes por modelo, armas por fabricante)', () => {
  const o = require('../../core/odyssey');
  const locker = { items: [{ key: 'suitschematic', count: 3, mission: 0 }, { key: 'weaponschematic', count: 9, mission: 4 }], components: [{ key: 'aerogel', count: 20, mission: 0 }], data: [] };
  const u = o.nextUpgrade('suit', 'explorationsuit_class2', 2, locker);
  assert.strictEqual(u.to, 3); assert.strictEqual(u.credits, 2250000);
  assert.deepStrictEqual(u.materials.map((m) => [m.key, m.need, m.have]), [['suitschematic', 2, 3], ['healthmonitor', 2, 0], ['manufacturinginstructions', 2, 0], ['aerogel', 5, 20], ['graphene', 5, 0]]);
  assert.strictEqual(u.missing, 9); assert.strictEqual(u.ready, false);
  // los objetos de misión no cuentan
  const w = o.nextUpgrade('weapon', 'wpn_m_sniper_plasma_charged', 4, locker);
  assert.strictEqual(w.materials[0].have, 5); assert.deepStrictEqual(w.materials.map((m) => m.key), ['weaponschematic', 'ionisedgas', 'manufacturinginstructions', 'chemicalsuperbase', 'microelectrode']);
  assert.strictEqual(o.weaponMaker('wpn_m_assaultrifle_laser_fauto'), 'takada');
  assert.strictEqual(o.nextUpgrade('suit', 'tacticalsuit_class5', 5, locker), null);
  // Maverick G1 → G5 (comprobado en Odyssey Materials Helper): 12 de cada común y 28 de Carbon Fibre Plating y Graphene
  const tot = {};
  for (let g = 1; g < 5; g++) for (const m of o.nextUpgrade('suit', 'utilitysuit_class1', g, locker).materials) tot[m.key] = (tot[m.key] || 0) + m.need;
  assert.deepStrictEqual(tot, { suitschematic: 12, healthmonitor: 12, manufacturinginstructions: 12, carbonfibreplating: 28, graphene: 28 });
  // armas G1 → G5 (comprobado en Odyssey Materials Helper con las 11 armas): 12 de cada común y 28 de cada propio
  const sum = (key) => { const t = {}; for (let g = 1; g < 5; g++) for (const m of o.nextUpgrade('weapon', key, g, locker).materials) t[m.key] = (t[m.key] || 0) + m.need; return t; };
  for (const k of ['wpn_m_assaultrifle_kinetic_fauto', 'wpn_m_submachinegun_kinetic_fauto', 'wpn_s_pistol_kinetic_sauto', 'wpn_m_launcher_rocket_sauto'])
    assert.deepStrictEqual(sum(k), { weaponschematic: 12, compressionliquefiedgas: 12, manufacturinginstructions: 12, tungstencarbide: 28, weaponcomponent: 28 }, k);
  for (const k of ['wpn_m_sniper_plasma_charged', 'wpn_m_shotgun_plasma_doublebarrel', 'wpn_m_assaultrifle_plasma_fauto', 'wpn_s_pistol_plasma_charged'])
    assert.deepStrictEqual(sum(k), { weaponschematic: 12, ionisedgas: 12, manufacturinginstructions: 12, chemicalsuperbase: 28, microelectrode: 28 }, k);
  for (const k of ['wpn_m_assaultrifle_laser_fauto', 'wpn_m_submachinegun_laser_fauto', 'wpn_s_pistol_laser_sauto'])
    assert.deepStrictEqual(sum(k), { weaponschematic: 12, ionisedgas: 12, manufacturinginstructions: 12, microelectrode: 28, opticalfibre: 28 }, k);
});

test('a pie: mejoras de ingeniero (materiales por tipo de arma, ranuras, acceso a ingenieros)', () => {
  const m = require('../../core/odymods');
  assert.strictEqual(m.MODS.filter((x) => x.kind === 'suit').length, 14);
  assert.strictEqual(m.MODS.filter((x) => x.kind === 'weapon').length, 11);
  assert.strictEqual(m.ENGINEERS.length, 13);
  // cada mejora la monta al menos un ingeniero, y cada variante tiene materiales
  for (const x of m.MODS) {
    assert.ok(m.ENGINEERS.some((e) => e[x.kind].includes(x.id)), x.id);
    if (x.variants) assert.deepStrictEqual(Object.keys(x.variants).sort(), ['kinetic', 'laser', 'plasma'], x.id);
  }
  const locker = { items: [], components: [{ key: 'weaponcomponent', count: 5, mission: 0 }, { key: 'metalcoil', count: 25, mission: 0 }, { key: 'rdx', count: 40, mission: 0 }], data: [{ key: 'ballisticsdata', count: 16, mission: 0 }, { key: 'topographicalsurveys', count: 14, mission: 0 }] };
  const ranks = { 'Domino Green': { progress: 'Unlocked' }, 'Wellington Beck': { progress: 'Invited' }, 'Rosa Dayette': { progress: 'Known' } };
  // Karma AR-50 en G3 con una mejora: 2 ranuras, 1 libre; Greater Range usa la variante cinética
  const r = m.modsFor('weapon', { key: 'wpn_m_assaultrifle_kinetic_fauto', grade: 3, mods: ['weapon_stability'] }, locker, ranks);
  assert.deepStrictEqual([r.type, r.slots, r.used, r.free], ['kinetic', 2, 1, 1]);
  const range = r.list.find((x) => x.id === 'weapon_range');
  assert.strictEqual(range.en, 'Greater Range (Kinetic)');
  assert.deepStrictEqual(range.materials.map((x) => [x.key, x.need]), [['weaponcomponent', 5], ['metalcoil', 10], ['rdx', 10], ['ballisticsdata', 10], ['topographicalsurveys', 10]]);
  assert.strictEqual(range.ready, true);
  // «Invited» ya da acceso en Odyssey; los de Colonia van detrás
  assert.deepStrictEqual(range.engineers.map((e) => [e.name, e.access]), [['Domino Green', 'yes'], ['Wellington Beck', 'yes'], ['Rosa Dayette', 'known']]);
  assert.strictEqual(r.list.find((x) => x.id === 'weapon_stability').installed, true);
  // Takada (láser) y Manticore (plasma) cogen su variante
  assert.strictEqual(m.modsFor('weapon', { key: 'wpn_s_pistol_laser_sauto', grade: 1, mods: [] }, null, {}).list.find((x) => x.id === 'weapon_range').materials[0].key, 'circuitboard');
  assert.strictEqual(m.modsFor('weapon', { key: 'wpn_m_shotgun_plasma_doublebarrel', grade: 5, mods: [] }, null, {}).list.find((x) => x.id === 'weapon_range').materials[0].key, 'electricalfuse');
  // traje en G1: sin ranuras
  assert.strictEqual(m.modsFor('suit', { key: 'utilitysuit_class1', grade: 1, mods: [] }, null, {}).slots, 0);
});

test('ingenieros de nave: 25, módulos conocidos, filtro por módulo y estado del diario', () => {
  const se = require('../../core/shipengineers');
  assert.strictEqual(se.ENGINEERS.length, 25);
  for (const e of se.ENGINEERS) for (const [m, g] of e.mods) { assert.ok(se.MODULES[m], m); assert.ok(g >= 1 && g <= 5); }
  const ranks = { 'Elvira Martuuk': { progress: 'Unlocked', rank: 5 }, 'Chloe Sedesi': { progress: 'Invited' }, 'Mel Brandon': { progress: 'Known' } };
  const fsd = se.shipList(ranks, 'Frame Shift Drive');
  assert.deepStrictEqual(fsd.map((e) => [e.name, e.grade, e.status]).slice(0, 3), [['Elvira Martuuk', 5, 'unlocked'], ['Mel Brandon', 5, 'known'], ['Felicity Farseer', 5, 'none']]);
  assert.strictEqual(fsd.find((e) => e.name === 'Chloe Sedesi').status, 'invited');
  assert.strictEqual(se.slug("Tod 'The Blaster' McQuinn"), 'tod-the-blaster-mcquinn');
  assert.deepStrictEqual(Object.keys(se.moduleIndex()).sort(), ['C', 'H', 'O', 'U']);
});

test('recetas de nave: materiales por grado, tope del ingeniero y materiales del diario', () => {
  const b = require('../../core/shipblueprints');
  const se = require('../../core/shipengineers');
  // todo material de una receta tiene nombre; los módulos de los ingenieros con recetas existen
  for (const bp of Object.values(b.BLUEPRINTS)) for (const g of Object.values(bp.g)) for (const [k] of g) assert.ok(b.MATS[k], k);
  for (const sp of Object.values(b.SPECIALS)) for (const [k] of sp.m) assert.ok(b.MATS[k], k);
  for (const m of Object.keys(b.MODULE_RECIPES)) assert.ok(se.MODULES[m], m);
  // FSD de mayor alcance, G1 a G3 (tope de Professor Palin)
  const r = b.recipesFor('Frame Shift Drive', 3, { disruptedwakeechoes: 2, chemicalprocessors: 1 });
  const lr = r.blueprints.find((x) => x.id === 'FSD_LongRange');
  assert.deepStrictEqual(lr.grades.map((g) => g.grade), [1, 2, 3]);
  assert.deepStrictEqual(lr.grades[0].materials.map((m) => [m.key, m.need, m.ok]), [['disruptedwakeechoes', 1, true]]);
  assert.strictEqual(lr.grades[1].ready, true);
  assert.ok(r.specials.some((x) => x.name === 'Mass Manager'));
  // recetas de Inara: todos los módulos de los ingenieros tienen receta; Merc Coin no cuenta como falta
  for (const m of Object.keys(se.MODULES)) assert.ok(b.MODULE_RECIPES[m], 'sin receta: ' + m);
  const ml = b.recipesFor('Mining Laser', 5, { sulphur: 1, heatdispersionplate: 1, consumerfirmware: 1 }).blueprints[0];
  assert.deepStrictEqual([ml.name, ml.merc, ml.grades.map((g) => g.grade)], ['Long range', true, [2, 3, 4, 5]]);
  assert.strictEqual(ml.grades[0].ready, true);
  assert.deepStrictEqual(b.recipesFor('Guardian Gauss Cannon', 1, {}).blueprints[0].grades[0].materials.map((m) => [m.name, m.need]), [['Hardened Surface Fragments', 2], ['Caustic Crystal', 1]]);
  // materiales del diario: total al arrancar y cambios
  const model = require('../../core/model');
  const s = model.createState();
  model.applyEvent(s, { event: 'Materials', Raw: [{ Name: 'iron', Count: 10 }], Manufactured: [{ Name: 'ChemicalProcessors', Count: 3 }], Encoded: [] });
  model.applyEvent(s, { event: 'MaterialCollected', Category: 'Raw', Name: 'iron', Count: 3 });
  model.applyEvent(s, { event: 'EngineerCraft', Engineer: 'Felicity Farseer', BlueprintName: 'FSD_LongRange', Level: 2, Ingredients: [{ Name: 'chemicalprocessors', Count: 1 }] });
  model.applyEvent(s, { event: 'MaterialTrade', Paid: { Material: 'iron', Quantity: 6 }, Received: { Material: 'nickel', Quantity: 2 } });
  assert.deepStrictEqual(s.materials, { iron: 7, chemicalprocessors: 2, nickel: 2 });
});

test('colonización: costes de referencia por tipo de construcción (SrvSurvey)', () => {
  const cc = require('../../core/colcosts');
  const l = cc.costList();
  assert.strictEqual(l.length, 55);
  for (const b of l) { assert.ok(b.cargo.length > 0, b.en); assert.notStrictEqual(b.name, '', b.en); assert.ok(['orbital', 'surface'].includes(b.location), b.en); }
  const cor = l.find((b) => b.en === 'Coriolis Starport');
  assert.deepStrictEqual([cor.name, cor.tier, cor.cargo[0].name, cor.cargo[0].t], ['Puerto estelar Coriolis', 2, 'Steel', 14076]);
  assert.strictEqual(cor.total, cor.cargo.reduce((a, x) => a + x.t, 0));
  assert.strictEqual(cc.esName('Bio Settlement - Large'), 'Asentamiento biológico grande');
  assert.strictEqual(cc.tripsFor(53723, 1148), 47);
});

test('equipo: naves y módulos (coriolis + EDCD) y módulos montados del Loadout', () => {
  const d = require('../../core/data/shipdata.json');
  assert.ok(Object.keys(d.ships).length >= 49);
  assert.strictEqual(d.ships.anaconda.spec.class, 3);
  assert.deepStrictEqual(d.ships.anaconda.slots.standard, [8, 7, 6, 5, 8, 8, 5]);
  const fsd = d.modules.int_hyperdrive_size5_class5;
  assert.deepStrictEqual([fsd.n, fsd.cl, fsd.r, fsd.c], ['Frame Shift Drive', 5, 'A', 'standard']);
  assert.ok(fsd.s.optmass > 0);
  const model = require('../../core/model');
  const s = model.createState();
  model.applyEvent(s, { event: 'Loadout', Ship: 'anaconda', ShipName: 'Prueba', HullValue: 100, ModulesValue: 50, Modules: [
    { Slot: 'FrameShiftDrive', Item: 'Int_Hyperdrive_Size5_Class5', On: true, Engineering: { BlueprintName: 'FSD_LongRange', Level: 5, ExperimentalEffect: 'special_fsd_heavy' } },
    { Slot: 'PaintJob', Item: 'paintjob_anaconda_default' },
  ] });
  assert.strictEqual(s.ship.modules.length, 1);
  assert.deepStrictEqual([s.ship.modules[0].item, s.ship.modules[0].eng.bp, s.ship.modules[0].eng.level, s.ship.modules[0].eng.exp], ['int_hyperdrive_size5_class5', 'FSD_LongRange', 5, 'special_fsd_heavy']);
  assert.deepStrictEqual(s.ship.shipValue, { hull: 100, modules: 50 });
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

test('combate: objetivo, zona de conflicto, bonos por cobrar, masacres y salto a Combate', () => {
  const s = model.createState();
  const T = (sec) => `2026-11-24T10:00:${String(sec).padStart(2, '0')}Z`;
  model.applyEvent(s, ev('LoadGame', { timestamp: T(0), Commander: 'Adder' }));
  model.applyEvent(s, ev('MissionAccepted', { timestamp: T(1), Name: 'Mission_Massacre_Conflict_CivilWar', Faction: 'A', TargetFaction: 'Z', KillCount: 2, Reward: 1000, MissionID: 1, Expiry: '2099-01-01T00:00:00Z' }));
  model.applyEvent(s, ev('MissionAccepted', { timestamp: T(2), Name: 'Mission_Massacre_Conflict_CivilWar', Faction: 'A', TargetFaction: 'Z', KillCount: 3, Reward: 2000, MissionID: 2, Expiry: '2099-01-01T00:00:00Z' }));
  model.applyEvent(s, ev('MissionAccepted', { timestamp: T(3), Name: 'Mission_Massacre_Conflict_CivilWar', Faction: 'B', TargetFaction: 'Z', KillCount: 2, Reward: 500, MissionID: 3, Expiry: '2099-01-01T00:00:00Z' }));
  model.applyEvent(s, ev('SupercruiseDestinationDrop', { timestamp: T(4), Type: '$Warzone_PointRace_High:#index=1;', Type_Localised: 'Conflict Zone [High Intensity]' }));
  model.applyEvent(s, ev('ShipTargeted', { timestamp: T(5), TargetLocked: true, Ship: 'vulture', ScanStage: 3, PilotName_Localised: 'Fuerzas', PilotRank: 'Master', ShieldHealth: 40, HullHealth: 90, Faction: 'Z', LegalStatus: 'Enemy' }));
  let v = combat.view(s, Date.parse(T(6)));
  assert.strictEqual(v.target.ship, 'Vulture'); assert.strictEqual(v.target.rank, 'Maestro'); assert.strictEqual(v.target.hostile, true);
  assert.strictEqual(v.zone.intensity, 'Alta');
  for (let i = 0; i < 3; i++) model.applyEvent(s, ev('FactionKillBond', { timestamp: T(10 + i), Reward: 100, AwardingFaction: 'Yo', VictimFaction: 'Z' }));
  model.applyEvent(s, ev('Bounty', { timestamp: T(20), Rewards: [{ Faction: 'Policía', Reward: 50 }], TotalReward: 50, Target: 'cobramkiv', VictimFaction: 'Piratas' }));
  v = combat.view(s, Date.parse(T(21)));
  assert.strictEqual(v.zone.side, 'Yo'); assert.strictEqual(v.zone.bonds, 3);
  assert.strictEqual(v.kills[1].ship, 'Vulture', 'la baja por bono toma la nave del último objetivo');
  assert.strictEqual(v.bondsTotal, 300); assert.strictEqual(v.bountiesTotal, 50);
  // A: la misión 1 (2 bajas) se completa y la tercera baja pasa a la 2; B recibe las mismas bajas a la vez
  assert.deepStrictEqual(v.massacre.map((m) => [m.id, m.kills, m.done]), [[1, 2, true], [2, 1, false], [3, 2, true]]);
  assert.strictEqual(v.stacks[0].left, 2);
  assert.strictEqual(derive.flightMode(s).section, 'combate', 'en zona de conflicto -> Combate');
  model.applyEvent(s, ev('RedeemVoucher', { timestamp: T(30), Type: 'CombatBond', Faction: 'Yo', Amount: 300 }));
  model.applyEvent(s, ev('SupercruiseEntry', { timestamp: T(31) }));
  v = combat.view(s, Date.parse(T(32)));
  assert.strictEqual(v.bondsTotal, 0); assert.strictEqual(v.zone, null); assert.strictEqual(v.target, null);
  model.applyEvent(s, ev('Died', { timestamp: T(40) }));
  assert.strictEqual(combat.view(s).bountiesTotal, 0, 'al morir se pierden las recompensas');
  model.applyEvent(s, ev('FSDJump', { timestamp: T(50), StarSystem: 'X', Conflicts: [{ WarType: 'civilwar', Status: 'active', Faction1: { Name: 'A', Stake: 'Base', WonDays: 2 }, Faction2: { Name: 'Z', Stake: '', WonDays: 1 } }] }));
  assert.strictEqual(combat.view(s).conflicts[0].type, 'Guerra civil');
});

test('builds: ranuras de la nave, exportar/importar (EDSY, Coriolis, SLEF) y lista de deseos', () => {
  const B = require('../../core/builds');
  const slots = B.slotsFor('lakonminer').map((x) => x.slot);
  assert.ok(slots.includes('LargeMiningHardpoint1') && slots.includes('MediumHardpoint3') && slots.includes('LimpetController01') && slots.includes('FighterBay01') && slots.includes('Slot10_Size1'));
  const pan = B.slotsFor('panthermkii').map((x) => x.slot);
  assert.ok(pan.includes('Cargo01') && pan.includes('Cargo02') && pan.includes('Slot02_Size7'));
  const mine = [{ slot: 'Armour', item: 'lakonminer_armour_grade1' }, { slot: 'MediumMiningHardpoint1', item: 'hpt_mining_seismchrgwarhd_fixed_medium' }, { slot: 'Slot06_Size4', item: 'int_shieldgenerator_size4_class5', eng: { bp: 'ShieldGenerator_Optimised', level: 5 } }, { slot: 'TinyHardpoint2', item: 'hpt_plasmapointdefence_turret_tiny' }];
  const lay = B.layout('lakonminer', mine);
  assert.strictEqual(lay.hard.find((x) => x.slot === 'LargeMiningHardpoint1').module, null, 'ranura vacía');
  const L = { event: 'Loadout', Ship: 'LakonMiner', ShipName: 'Ideal', Modules: [
    { Slot: 'Armour', Item: 'LakonMiner_Armour_Grade1' }, { Slot: 'MediumMiningHardpoint1', Item: 'hpt_mining_seismchrgwarhd_fixed_medium' },
    { Slot: 'LargeMiningHardpoint1', Item: 'hpt_miningtoolv2_fixed_large' }, { Slot: 'Slot06_Size4', Item: 'int_shieldgenerator_size4_class5_strong' },
    { Slot: 'PaintJob', Item: 'paintjob_x' }] };
  for (const kind of ['edsy', 'coriolis']) {
    const url = B.exportUrl(kind, L);
    assert.ok(url.startsWith(kind === 'edsy' ? 'https://edsy.org/#/I=' : 'https://coriolis.io/import?data='));
    const b = B.parse(url);
    assert.strictEqual(b.ship, 'lakonminer'); assert.strictEqual(b.modules.length, 4, 'sin la pintura');
  }
  const b = B.parse(B.toSlef(L, 'x'));
  assert.strictEqual(b.app, 'ED BUBBLE'); assert.strictEqual(b.name, 'Ideal');
  const d = B.diff(b, mine);
  assert.deepStrictEqual(d.map((x) => [x.slot, x.kind]), [['LargeMiningHardpoint1', 'add'], ['TinyHardpoint2', 'remove'], ['Slot06_Size4', 'buy']]);
  assert.strictEqual(B.itemDone(d[0], [...mine, { slot: 'LargeMiningHardpoint1', item: 'hpt_miningtoolv2_fixed_large' }]), true);
  assert.throws(() => B.parse('https://coriolis.io/outfit/mamba?code=A0p'), /código propio/);
  assert.throws(() => B.parse('hola'), /SLEF/);
  assert.strictEqual(B.moduleInfo('int_cargorack_size6_class1').name, 'Cargo Rack', 'no la versión Merc');
});

test('combate: salto con el armamento desplegado en modo combate y botones de combate y caza', () => {
  const s = model.createState();
  s.status.flags = { areHardpointsDeployed: true, isHUDInAnalysisMode: false };
  assert.strictEqual(derive.flightMode(s).section, 'combate');
  s.status.flags = { areHardpointsDeployed: true, isHUDInAnalysisMode: true };
  assert.notStrictEqual(derive.flightMode(s).section, 'combate', 'en modo análisis (minería) no');
  const acts = require('../../core/actions');
  for (const id of ['powerplant', 'wing1', 'wing2', 'wing3', 'f_orders', 'f_defend', 'f_attack', 'f_focus', 'f_hold', 'f_pos', 'f_follow', 'f_dock']) assert.ok(acts.ACTIONS[id], id);
  const binds = { CyclePreviousSubsystem: { key: 'Key_SemiColon', modifiers: [] }, OrderFocusTarget: { key: 'Key_Numpad_3', modifiers: [] } };
  const d = acts.describe(binds);
  assert.strictEqual(d.powerplant.available, true); assert.strictEqual(d.f_focus.available, true); assert.strictEqual(d.wing1.available, false);
  assert.strictEqual(acts.ACTIONS.powerplant.steps.filter((x) => x.press === 'CyclePreviousSubsystem').length, 6, 'como en Touch Portal');
  // la planta se reconoce por el símbolo del subsistema en ShipTargeted
  model.applyEvent(s, ev('ShipTargeted', { TargetLocked: true, Ship: 'vulture', ScanStage: 3, Subsystem: '$int_powerplant_size4_class3_name;', Subsystem_Localised: 'Power Plant' }));
  assert.ok(/powerplant/.test(s.combat.target.subSym)); assert.strictEqual(s.combat.target.seq, 1);
});

test('casco: el del caza no cuenta como el de tu nave; se guarda la hora del dato', () => {
  const s = model.createState();
  model.applyEvent(s, ev('Loadout', { timestamp: '2026-11-25T12:00:00Z', Ship: 'lakonminer', HullHealth: 1, Modules: [] }));
  model.applyEvent(s, ev('HullDamage', { timestamp: '2026-11-25T12:10:00Z', Health: 0.3, PlayerPilot: false, Fighter: true }));
  model.applyEvent(s, ev('HullDamage', { timestamp: '2026-11-25T12:11:00Z', Health: 0.4, PlayerPilot: true, Fighter: true }));
  assert.strictEqual(s.ship.hull, 1); assert.strictEqual(s.ship.hullAt, '2026-11-25T12:00:00Z');
  model.applyEvent(s, ev('HullDamage', { timestamp: '2026-11-25T12:12:00Z', Health: 0.55, PlayerPilot: true, Fighter: false }));
  assert.strictEqual(s.ship.hull, 0.55);
  model.applyEvent(s, ev('Repair', { timestamp: '2026-11-25T12:20:00Z', Items: ['Hull'], Cost: 100 }));
  assert.strictEqual(s.ship.hull, 1);
});

test('cuerpo: se sabe en qué planeta estás aunque no haya ApproachBody (Location, SupercruiseExit, Touchdown)', () => {
  const s = model.createState();
  model.applyEvent(s, ev('Location', { StarSystem: 'X', SystemAddress: 100, Body: 'X AB 1', BodyID: 7, BodyType: 'Planet', Docked: false }));
  assert.deepStrictEqual(s.location.approach, { body: 'X AB 1', bodyId: 7, systemAddress: 100 });
  const s2 = model.createState();
  model.applyEvent(s2, ev('Location', { StarSystem: 'X', SystemAddress: 100, Body: 'X', BodyID: 0, BodyType: 'Star', Docked: false }));
  assert.strictEqual(s2.location.approach, null, 'una estrella no');
  model.applyEvent(s2, ev('Touchdown', { Body: 'X 2 a', BodyID: 12, SystemAddress: 100, Latitude: 1, Longitude: 2 }));
  assert.strictEqual(s2.location.approach.bodyId, 12);
});

(async () => {
  for (const [name, fn] of asyncTests) {
    try { await fn(); ok += 1; console.log(`  OK  ${name}`); } catch (e) { fail += 1; console.log(`  FALLA  ${name}\n        ${e.message}`); }
  }
  console.log(`\n${ok} pruebas OK, ${fail} fallidas.`);
  process.exit(fail ? 1 : 0);
})();

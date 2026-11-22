'use strict';

/* Tests del motor de datos de ED BUBBLE (core/). Se ejecutan con `npm test` en app/. */

const assert = require('assert');
const model = require('../../core/model');
const derive = require('../../core/derive');

let ok = 0; let fail = 0;
function test(name, fn) {
  try { fn(); ok += 1; console.log(`  OK  ${name}`); } catch (e) { fail += 1; console.log(`  FALLA  ${name}\n        ${e.message}`); }
}
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
  const xml = '<Root><UI_Back><Primary Device="SaitekX56Joystick" Key="Joy_2" /><Secondary Device="{NoDevice}" Key="" /></UI_Back></Root>';
  const r = actions.checkControls({ binds: binds.parseBinds(xml), otherDevices: binds.parseOtherDevices(xml) });
  assert.strictEqual(r.problems.find((p) => p.action === 'UI_Back').status, 'hotas');
});

console.log(`\n${ok} pruebas OK, ${fail} fallidas.`);
process.exit(fail ? 1 : 0);

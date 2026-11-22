'use strict';

/**
 * Suite de pruebas SIN necesitar Elite Dangerous instalado ni Touch Portal
 * corriendo. Valida:
 *  1) Decodificación de flags de Status.json (bitfields).
 *  2) Que los handlers de cada categoría reaccionan correctamente a un
 *     journal de ejemplo (test/sample-journal.ndjson), usando un TPClient
 *     falso que solo graba los valores enviados.
 *  3) Que JournalTailer sigue un fichero de journal real de forma
 *     incremental (no relee líneas ya procesadas) y detecta líneas nuevas.
 *
 * Ejecutar con: npm test
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const StatusReader = require('../src/services/status-reader');
const { JournalTailer } = require('../src/services/journal-tailer');
const StateStore = require('../src/services/state-store');
const EventRouter = require('../src/event-router');
const SessionStats = require('../src/session-stats');
const registerAllHandlers = require('../src/handlers');

const cmdrDefs = require('../definitions/category-cmdr');
const navDefs = require('../definitions/category-nav');
const combatDefs = require('../definitions/category-combat');
const tradeDefs = require('../definitions/category-trade');
const missionsDefs = require('../definitions/category-missions');
const powerDefs = require('../definitions/category-powerplay');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  OK  ${name}`);
    passed += 1;
  } catch (err) {
    console.error(`FALLO ${name}`);
    console.error(`      ${err.message}`);
    failed += 1;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`  OK  ${name}`);
    passed += 1;
  } catch (err) {
    console.error(`FALLO ${name}`);
    console.error(`      ${err.message}`);
    failed += 1;
  }
}

// ---------------------------------------------------------------------
// 1) StatusReader.decode()
// ---------------------------------------------------------------------
console.log('\n[1] StatusReader.decode()');

test('decodifica isDocked, isLanded y areShieldsUp desde Flags', () => {
  // bit0=Docked, bit1=Landed(0), bit3=ShieldsUp
  const flags = (1 << 0) | (0 << 1) | (1 << 3);
  const decoded = StatusReader.decode({ Flags: flags, Flags2: 0, Pips: [4, 8, 4], Cargo: 12, Fuel: { FuelMain: 30, FuelReservoir: 0.5 }, LegalState: 'Clean', GuiFocus: 0, FireGroup: 0 });
  assert.strictEqual(decoded.isDocked, 'true');
  assert.strictEqual(decoded.isLanded, 'false');
  assert.strictEqual(decoded.areShieldsUp, 'true');
  assert.strictEqual(decoded.isSupercruise, 'false');
});

test('decodifica flags de Flags2 (on-foot)', () => {
  const flags2 = (1 << 0) | (1 << 6); // isOnFoot + isLowOxygen
  const decoded = StatusReader.decode({ Flags: 0, Flags2: flags2 });
  assert.strictEqual(decoded.isOnFoot, 'true');
  assert.strictEqual(decoded.isLowOxygen, 'true');
  assert.strictEqual(decoded.isInTaxi, 'false');
});

test('decodifica Pips y GuiFocus', () => {
  const decoded = StatusReader.decode({ Flags: 0, Flags2: 0, Pips: [2, 6, 8], GuiFocus: 6 });
  assert.strictEqual(decoded.pipsSystems, '2');
  assert.strictEqual(decoded.pipsEngines, '6');
  assert.strictEqual(decoded.pipsWeapons, '8');
  assert.strictEqual(decoded.guiFocus, 'GalaxyMap');
});

// ---------------------------------------------------------------------
// 2) Handlers contra un journal de ejemplo
// ---------------------------------------------------------------------
console.log('\n[2] Handlers de Journal (sample-journal.ndjson)');

function makeFakeTpClient() {
  const values = new Map();
  return {
    values,
    stateUpdate(id, value) {
      values.set(id, value);
    },
    stateUpdateMany(states) {
      for (const s of states) values.set(s.id, s.value);
    },
  };
}

const fakeTp = makeFakeTpClient();
const state = new StateStore(fakeTp);
const session = new SessionStats();
const router = new EventRouter();
registerAllHandlers(router, { state, session });

const journalPath = path.join(__dirname, 'sample-journal.ndjson');
const lines = fs.readFileSync(journalPath, 'utf8').split('\n').filter((l) => l.trim().length > 0);
for (const line of lines) {
  router.dispatch(JSON.parse(line));
}

test('Commander/LoadGame rellena nombre y nave', () => {
  assert.strictEqual(fakeTp.values.get(cmdrDefs.states.name.id), 'Adder');
  assert.strictEqual(fakeTp.values.get(cmdrDefs.states.shipType.id), 'Anaconda');
});

test('Rank traduce los índices numéricos a nombres de rango', () => {
  assert.strictEqual(fakeTp.values.get(cmdrDefs.states.combatRank.id), 'Master');
  assert.strictEqual(fakeTp.values.get(cmdrDefs.states.tradeRank.id), 'Dealer');
});

test('FSDJump actualiza el sistema actual de Navegación', () => {
  assert.strictEqual(fakeTp.values.get(navDefs.states.currentSystem.id), 'Sol');
  assert.strictEqual(String(fakeTp.values.get(navDefs.states.lastJumpDistance.id)), '8.59');
});

test('Interdicted + UnderAttack registran el nombre del atacante', () => {
  assert.strictEqual(fakeTp.values.get(combatDefs.states.lastInterdictorName.id), 'CMDR Villano');
});

test('Bounty acumula el total de recompensas de la sesión', () => {
  assert.strictEqual(String(fakeTp.values.get(combatDefs.states.sessionBountyTotal.id)), '15,000');
});

test('MarketBuy + MarketSell calculan el beneficio de la sesión (98000 - 95000)', () => {
  assert.strictEqual(String(fakeTp.values.get(tradeDefs.states.sessionProfit.id)), '3,000');
});

test('MissionAccepted + MissionCompleted actualizan contadores de misiones', () => {
  assert.strictEqual(String(fakeTp.values.get(missionsDefs.states.completedSession.id)), '1');
  assert.strictEqual(fakeTp.values.get(missionsDefs.states.lastCompleted.id), 'Courier mission');
});

test('PowerplayMerits + PowerplayRank (esquema Powerplay 2.0) actualizan el tracker', () => {
  assert.strictEqual(fakeTp.values.get(powerDefs.states.name.id), 'Yuri Grom');
  assert.strictEqual(String(fakeTp.values.get(powerDefs.states.totalMerits.id)), '15,420');
  assert.strictEqual(String(fakeTp.values.get(powerDefs.states.rank.id)), '4');
  assert.strictEqual(fakeTp.values.get(powerDefs.states.color.id), '#ef8435');
});

test('Died incrementa el contador de muertes de la sesión', () => {
  assert.strictEqual(String(fakeTp.values.get(combatDefs.states.deathsSession.id)), '1');
});

// ---------------------------------------------------------------------
// 3) JournalTailer: tailing incremental sobre un fichero real
// ---------------------------------------------------------------------
console.log('\n[3] JournalTailer (tailing incremental real)');

async function testJournalTailer() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ed-journal-test-'));
  const journalFile = path.join(tmpDir, 'Journal.2601010000.01.log');

  const line1 = JSON.stringify({ timestamp: '2026-01-01T00:00:00Z', event: 'Fileheader', part: 1 });
  fs.writeFileSync(journalFile, line1 + '\n');

  const tailer = new JournalTailer(tmpDir, 50);
  const received = [];
  tailer.on('event', (e) => received.push(e));

  tailer.start();
  await new Promise((r) => setTimeout(r, 200));

  assert.strictEqual(received.length, 1, `Debería haber leído 1 línea inicial, leyó ${received.length}`);
  assert.strictEqual(received[0].event, 'Fileheader');

  // Añadimos una línea nueva -> el tailer NO debe releer la primera
  const line2 = JSON.stringify({ timestamp: '2026-01-01T00:00:05Z', event: 'Commander', Name: 'Test' });
  fs.appendFileSync(journalFile, line2 + '\n');

  await new Promise((r) => setTimeout(r, 200));

  assert.strictEqual(received.length, 2, `Debería haber 2 líneas tras el append, hay ${received.length}`);
  assert.strictEqual(received[1].event, 'Commander');

  tailer.stop();
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
console.log('\n[4] Idioma de los valores en vivo (en / es)');
test('el ajuste Language cambia textos y formato de números', () => {
  const i18n = require('../src/i18n');
  const { formatThousands } = require('../src/services/format');
  const { buildLoadoutColumns } = require('../src/services/module-names');
  const mods = [{ Slot: 'PowerPlant', Item: 'int_powerplant_size5_class5' }];
  assert.strictEqual(i18n.languageFromSettings([{ 'Language (en / es)': 'es' }]), 'es');
  i18n.setLanguage('es');
  assert.strictEqual(formatThousands(1234567), '1.234.567');
  assert.strictEqual(i18n.t('buy'), 'Compra');
  assert.ok(buildLoadoutColumns(mods).core.includes('PLANTA ENERGIA'));
  i18n.setLanguage('Español');
  assert.strictEqual(i18n.getLanguage(), 'es');
  i18n.setLanguage('en');
  assert.strictEqual(formatThousands(1234567), '1,234,567');
  assert.ok(buildLoadoutColumns(mods).core.includes('POWER PLANT'));
  assert.ok(i18n.isAny('DESPEDIR\nNAVE', 'dismissShip'));
});

// ---------------------------------------------------------------------------
console.log('\n[5] Control del sistema Powerplay (datos reales de Journals, oct 2026)');

const control = require('../src/services/powerplay-control');

// Valores tal cual los escribió el juego en Location/FSDJump.
const JNS_START = { timestamp: '2026-10-30T12:19:13Z', event: 'Location', StarSystem: 'Pegasi Sector JN-S b4-7', ControllingPower: 'Li Yong-Rui', Powers: ['Li Yong-Rui'], PowerplayState: 'Fortified', PowerplayStateControlProgress: 0.740143, PowerplayStateReinforcement: 65780, PowerplayStateUndermining: 52087 };
const JNS_NOW = { timestamp: '2026-10-30T18:12:49Z', event: 'Location', StarSystem: 'Pegasi Sector JN-S b4-7', ControllingPower: 'Li Yong-Rui', Powers: ['Li Yong-Rui'], PowerplayState: 'Fortified', PowerplayStateControlProgress: 0.776854, PowerplayStateReinforcement: 89642, PowerplayStateUndermining: 52087 };
const ID_G = { timestamp: '2026-10-30T12:42:10Z', event: 'FSDJump', StarSystem: 'Pegasi Sector ID-G a12-1', Powers: ['Archon Delaine', 'Li Yong-Rui'], PowerplayState: 'Unoccupied' };
const NO_PP = { timestamp: '2026-10-30T12:23:44Z', event: 'FSDJump', StarSystem: 'Pegasi Sector GW-W d1-82' };
const AD_LEONIS_FORTIFIED = { event: 'FSDJump', StarSystem: 'AD Leonis', PowerplayState: 'Fortified', PowerplayStateControlProgress: 1.384615, PowerplayStateReinforcement: 5089527, PowerplayStateUndermining: 22986 };
const AD_LEONIS_STRONG = { event: 'FSDJump', StarSystem: 'AD Leonis', PowerplayState: 'Stronghold', PowerplayStateControlProgress: 0.269208, PowerplayStateReinforcement: 20159, PowerplayStateUndermining: 951 };

function freshPowerplay() {
  const tp = makeFakeTpClient();
  const st = new StateStore(tp);
  const rt = new EventRouter();
  const ctx = { state: st, session: new SessionStats() };
  registerAllHandlers(rt, ctx);
  return { tp, rt, ctx, get: (def) => tp.values.get(def.id) };
}
const D = powerDefs.states;

test('JN-S: 77,7 % de la banda Fortified, 504.955 de 650.000 CP y faltan 145.045', () => {
  const c = control.computeControl(JNS_NOW);
  assert.strictEqual(c.totalCp, 504955);
  assert.strictEqual(c.remaining, 145045);
  assert.strictEqual(c.net, 37555);
  assert.strictEqual(c.nextState, 'Stronghold');
  assert.ok(Math.abs(c.baseProgress - 0.719) < 0.001, `base ${c.baseProgress}`);
});

test('el progreso al inicio del ciclo es el mismo con cualquier lectura del mismo ciclo', () => {
  // 12:19 (65.780 refuerzo) y 18:12 (89.642): la base del ciclo debe coincidir (467.400 CP).
  assert.strictEqual(control.computeControl(JNS_START).totalCp - control.computeControl(JNS_START).net, 467400);
  assert.strictEqual(control.computeControl(JNS_NOW).totalCp - control.computeControl(JNS_NOW).net, 467400);
});

test('handler: Location de JN-S rellena los states del panel de control', () => {
  const x = freshPowerplay();
  x.rt.dispatch(JNS_NOW);
  assert.strictEqual(x.get(D.sysName), 'Pegasi Sector JN-S b4-7');
  assert.strictEqual(x.get(D.sysState), 'FORTIFIED');
  assert.strictEqual(x.get(D.sysNextState), 'STRONGHOLD');
  assert.strictEqual(x.get(D.sysProgress), '77.7%');
  assert.strictEqual(x.get(D.sysCp), '504,955 / 650,000');
  assert.strictEqual(x.get(D.sysRemaining), '145,045');
  assert.strictEqual(x.get(D.sysReinforcement), '89,642');
  assert.strictEqual(x.get(D.sysUndermining), '52,087');
  assert.strictEqual(x.get(D.sysNet), '+37,555');
  assert.ok(String(x.get(D.sysAsOf)).startsWith('DATA AS OF'));
});

test('barra de 12 celdas: 9 de base (71,9 %), 1 ganada (+5,8 % no desaparece) y 2 vacías', () => {
  const x = freshPowerplay();
  x.rt.dispatch(JNS_NOW);
  const segs = [];
  for (let i = 1; i <= 12; i += 1) segs.push(Number(x.tp.values.get(`edb.power.seg${String(i).padStart(2, '0')}`)));
  assert.deepStrictEqual(segs, [1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 0, 0]);
});

test('un sistema sin Powerplay o Unoccupied deja el panel en "sin datos" y la barra vacía', () => {
  const x = freshPowerplay();
  x.rt.dispatch(JNS_NOW);
  x.rt.dispatch(ID_G);
  assert.strictEqual(x.get(D.sysName), 'Pegasi Sector ID-G a12-1');
  assert.strictEqual(x.get(D.sysState), 'UNOCCUPIED');
  assert.strictEqual(x.get(D.sysProgress), '-');
  assert.strictEqual(String(x.tp.values.get('edb.power.seg01')), '0');
  x.rt.dispatch(NO_PP);
  assert.strictEqual(x.get(D.sysState), 'NO POWERPLAY');
});

test('sistema seguido: se queda en JN-S aunque se salte a otro sistema', () => {
  const x = freshPowerplay();
  x.ctx.powerplay.setTrackedSystem('pegasi sector jn-s B4-7'); // sin distinguir mayúsculas
  x.rt.dispatch(JNS_NOW);
  x.rt.dispatch(ID_G);
  assert.strictEqual(x.get(D.sysName), 'Pegasi Sector JN-S b4-7');
  assert.strictEqual(x.get(D.sysProgress), '77.7%');
  x.ctx.powerplay.setTrackedSystem('');
  assert.strictEqual(x.get(D.sysName), 'Pegasi Sector ID-G a12-1');
});

test('sistema seguido que aún no se ha visitado muestra el nombre y "NO_DATA"', () => {
  const x = freshPowerplay();
  x.ctx.powerplay.setTrackedSystem('Pegasi Sector JN-S b4-7');
  assert.strictEqual(x.get(D.sysName), 'Pegasi Sector JN-S b4-7');
  assert.strictEqual(x.get(D.sysState), 'NO_DATA');
});

test('progreso > 1,0 (antes del corte): REACHED y barra llena sin pasar del 100 %', () => {
  const c = control.computeControl(AD_LEONIS_FORTIFIED);
  assert.strictEqual(c.totalCp, 900000);
  assert.strictEqual(c.reached, true);
  assert.strictEqual(c.remaining, 0);
  const x = freshPowerplay();
  x.rt.dispatch(AD_LEONIS_FORTIFIED);
  assert.strictEqual(x.get(D.sysRemaining), 'REACHED');
  assert.strictEqual(x.get(D.sysProgress), '138.5%');
  for (let i = 1; i <= 12; i += 1) assert.notStrictEqual(String(x.tp.values.get(`edb.power.seg${String(i).padStart(2, '0')}`)), '0');
});

test('cambio real Fortified -> Stronghold: el sobrante se arrastra (900.000 - 650.000 + 19.208)', () => {
  const before = control.computeControl(AD_LEONIS_FORTIFIED);
  const after = control.computeControl(AD_LEONIS_STRONG);
  assert.strictEqual(after.cap, 1000000);
  assert.strictEqual(after.totalCp, 269208);
  assert.strictEqual(before.totalCp - 650000 + after.net, after.totalCp);
  assert.strictEqual(after.nextState, null);
});

test('Stronghold muestra MAX como siguiente estado', () => {
  const x = freshPowerplay();
  x.rt.dispatch(AD_LEONIS_STRONG);
  assert.strictEqual(x.get(D.sysNextState), 'MAX');
  assert.strictEqual(x.get(D.sysState), 'STRONGHOLD');
});

test('undermining mayor que refuerzo: neto negativo y celdas de pérdida', () => {
  const c = control.computeControl({ PowerplayState: 'Fortified', PowerplayStateControlProgress: 0.5, PowerplayStateReinforcement: 10000, PowerplayStateUndermining: 90000 });
  assert.strictEqual(c.net, -80000);
  const segs = control.segmentStates(c.baseProgress, c.progress);
  assert.ok(segs.includes(control.SEG_LOSS));
  assert.ok(!segs.includes(control.SEG_GAIN));
});

test('en español: estados, porcentaje con coma y separador de miles con punto', () => {
  const i18n = require('../src/i18n');
  i18n.setLanguage('es');
  try {
    const x = freshPowerplay();
    x.rt.dispatch(JNS_NOW);
    assert.strictEqual(x.get(D.sysState), 'FORTIFICADO');
    assert.strictEqual(x.get(D.sysNextState), 'BASTIÓN');
    assert.strictEqual(x.get(D.sysProgress), '77,7%');
    assert.strictEqual(x.get(D.sysRemaining), '145.045');
    assert.strictEqual(x.get(D.sysNet), '+37.555');
    assert.ok(String(x.get(D.sysAsOf)).startsWith('DATOS DE LAS'));
  } finally {
    i18n.setLanguage('en');
  }
});

test('powerplay-control: el ajuste "Tracked system" se lee del payload de Touch Portal', () => {
  assert.strictEqual(control.trackedSystemFromSettings([{ 'Language (en / es)': 'en' }, { 'Tracked system (blank = current system)': ' Foo ' }]), 'Foo');
  assert.strictEqual(control.trackedSystemFromSettings([{ 'Language (en / es)': 'en' }]), undefined);
});

test('vehicles: LaunchSRV fija tipo Rhino y DockSRV/Died lo limpian', () => {
  const vehiclesDefs = require('../definitions/category-vehicles');
  const tp = makeFakeTpClient();
  const state = new StateStore(tp);
  const router = new EventRouter();
  registerAllHandlers(router, { state, session: new SessionStats(), tp });
  router.dispatch({ event: 'LaunchSRV', SRVType: 'mev_rhino', SRVType_Localised: 'SRV Rhino', ID: 26 });
  assert.strictEqual(tp.values.get(vehiclesDefs.states.srvType.id), 'SRV Rhino');
  assert.strictEqual(tp.values.get(vehiclesDefs.states.srvTypeId.id), 'mev_rhino');
  assert.strictEqual(tp.values.get(vehiclesDefs.states.srvKind.id), 'rhino');
  assert.strictEqual(tp.values.get(vehiclesDefs.states.srvDeployed.id), 'true');
  router.dispatch({ event: 'DockSRV', SRVType: 'mev_rhino', ID: 26 });
  assert.strictEqual(tp.values.get(vehiclesDefs.states.srvType.id), '');
  assert.strictEqual(tp.values.get(vehiclesDefs.states.srvDeployed.id), 'false');
  router.dispatch({ event: 'LaunchSRV', SRVType: 'mev_rhino', SRVType_Localised: 'SRV Rhino', ID: 27 });
  router.dispatch({ event: 'Died' });
  assert.strictEqual(tp.values.get(vehiclesDefs.states.srvDeployed.id), 'false');
  router.dispatch({ event: 'LaunchVessel', VesselType: 'lander01', VesselType_Localised: 'Nomad', ID: 31, PlayerControlled: true });
  assert.strictEqual(tp.values.get(vehiclesDefs.states.srvType.id), 'Nomad');
  assert.strictEqual(tp.values.get(vehiclesDefs.states.srvTypeId.id), 'lander01');
  assert.strictEqual(tp.values.get(vehiclesDefs.states.srvKind.id), 'nomad');
  assert.strictEqual(tp.values.get(vehiclesDefs.states.srvDeployed.id), 'true');
  router.dispatch({ event: 'DockSRV', SRVType: 'lander01', SRVType_Localised: 'Nomad', ID: 31 });
  assert.strictEqual(tp.values.get(vehiclesDefs.states.srvDeployed.id), 'false');
  router.dispatch({ event: 'LaunchFighter' });
  assert.strictEqual(tp.values.get(vehiclesDefs.states.fighterDeployed.id), 'true');
  router.dispatch({ event: 'DockFighter' });
  assert.strictEqual(tp.values.get(vehiclesDefs.states.fighterDeployed.id), 'false');
});

(async () => {
  await asyncTest('sigue un journal de forma incremental sin releer líneas antiguas', testJournalTailer);

  console.log(`\n${passed} pruebas OK, ${failed} fallidas.`);
  process.exit(failed > 0 ? 1 : 0);
})();

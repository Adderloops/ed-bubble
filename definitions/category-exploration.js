'use strict';

const CATEGORY_ID = 'edb.explo';

const states = {
  bodiesInSystem: { id: 'edb.explo.bodiesInSystem', desc: 'Bodies detected in system (FSS)', default: '0' },
  allBodiesFound: { id: 'edb.explo.allBodiesFound', desc: 'All bodies found (pulse)', default: 'false' },
  lastScannedBody: { id: 'edb.explo.lastScannedBody', desc: 'Last scanned body', default: '' },
  lastScannedBodyType: { id: 'edb.explo.lastScannedBodyType', desc: 'Last scanned body type', default: '' },
  lastMaterialCollected: { id: 'edb.explo.lastMaterialCollected', desc: 'Last material collected', default: '' },
  sessionScansCount: { id: 'edb.explo.sessionScansCount', desc: 'Scans this session', default: '0' },
  lastCodexEntry: { id: 'edb.explo.lastCodexEntry', desc: 'Last Codex entry discovered', default: '' },
  explorationDataSoldSession: { id: 'edb.explo.explorationDataSoldSession', desc: 'Exploration data sold (credits, session)', default: '0' },
  lastMappedBody: { id: 'edb.explo.lastMappedBody', desc: 'Last mapped body (SAA)', default: '' },
};

const events = [
  { id: 'edb.explo.event.scan', name: 'When a body is scanned', format: 'Scanned: $val', valueStateId: states.lastScannedBody.id, valueType: 'text' },
  { id: 'edb.explo.event.allBodiesFound', name: 'When the system is fully scanned (FSS)', format: 'System complete: $val', valueStateId: states.allBodiesFound.id, valueType: 'choice', valueChoices: ['true', 'false'] },
  { id: 'edb.explo.event.codex', name: 'When a Codex entry is discovered', format: 'New Codex entry: $val', valueStateId: states.lastCodexEntry.id, valueType: 'text' },
];

module.exports = { categoryId: CATEGORY_ID, categoryName: 'Exploration', states, events, actions: [] };

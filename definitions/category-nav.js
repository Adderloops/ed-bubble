'use strict';

const CATEGORY_ID = 'edb.nav';

const states = {
  currentSystem: { id: 'edb.nav.currentSystem', desc: 'Current system', default: '' },
  currentBody: { id: 'edb.nav.currentBody', desc: 'Current body/station', default: '' },
  starClass: { id: 'edb.nav.starClass', desc: 'Main star class', default: '' },
  systemSecurity: { id: 'edb.nav.systemSecurity', desc: 'System security', default: '' },
  systemAllegiance: { id: 'edb.nav.systemAllegiance', desc: 'System allegiance', default: '' },
  systemGovernment: { id: 'edb.nav.systemGovernment', desc: 'System government', default: '' },
  systemEconomy: { id: 'edb.nav.systemEconomy', desc: 'System economy', default: '' },
  population: { id: 'edb.nav.population', desc: 'System population', default: '0' },
  nextSystem: { id: 'edb.nav.nextSystem', desc: 'Next destination on the route', default: '' },
  jumpsRemaining: { id: 'edb.nav.jumpsRemaining', desc: 'Jumps remaining on the plotted route', default: '0' },
  lastJumpDistance: { id: 'edb.nav.lastJumpDistance', desc: 'Distance of the last jump (ly)', default: '0' },
  lastJumpFuelUsed: { id: 'edb.nav.lastJumpFuelUsed', desc: 'Fuel used in the last jump (t)', default: '0' },
  isJumping: { id: 'edb.nav.isJumping', desc: 'Jumping right now (pulse)', default: 'false' },
  jumpType: { id: 'edb.nav.jumpType', desc: 'Type of jump started (Hyperspace/Supercruise)', default: '' },
  dockingRequestStatus: { id: 'edb.nav.dockingRequestStatus', desc: 'Docking request status', default: '' },
  dockingGrantedPad: { id: 'edb.nav.dockingGrantedPad', desc: 'Granted docking pad', default: '' },
  isTouchdown: { id: 'edb.nav.isTouchdown', desc: 'Surface touchdown occurred (pulse)', default: 'false' },
  isLiftoff: { id: 'edb.nav.isLiftoff', desc: 'Surface liftoff occurred (pulse)', default: 'false' },
};

const events = [
  { id: 'edb.nav.event.currentSystem', name: 'When the Current System changes', format: 'On arrival at $val', valueStateId: states.currentSystem.id, valueType: 'text' },
  { id: 'edb.nav.event.dockingRequestStatus', name: 'When the Docking Status changes', format: 'When the docking status becomes $val', valueStateId: states.dockingRequestStatus.id, valueType: 'choice', valueChoices: ['Requested', 'Cancelled', 'Denied', 'Granted', 'Timeout', ''] },
  { id: 'edb.nav.event.isJumping', name: 'When an FSD jump starts/ends', format: 'FSD jump: $val', valueStateId: states.isJumping.id, valueType: 'choice', valueChoices: ['true', 'false'] },
  { id: 'edb.nav.event.isTouchdown', name: 'When touching down on a surface', format: 'Surface touchdown: $val', valueStateId: states.isTouchdown.id, valueType: 'choice', valueChoices: ['true', 'false'] },
  { id: 'edb.nav.event.isLiftoff', name: 'When lifting off from a surface', format: 'Surface liftoff: $val', valueStateId: states.isLiftoff.id, valueType: 'choice', valueChoices: ['true', 'false'] },
];

module.exports = { categoryId: CATEGORY_ID, categoryName: 'Navigation', states, events, actions: [] };

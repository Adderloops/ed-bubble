'use strict';

const CATEGORY_ID = 'edb.combat';

const states = {
  isUnderAttack: { id: 'edb.combat.isUnderAttack', desc: 'Under attack (pulse)', default: 'false' },
  isInterdicted: { id: 'edb.combat.isInterdicted', desc: 'Being interdicted (pulse)', default: 'false' },
  lastInterdictorName: { id: 'edb.combat.lastInterdictorName', desc: 'Last interdictor', default: '' },
  escapedInterdiction: { id: 'edb.combat.escapedInterdiction', desc: 'Interdiction escaped (pulse)', default: 'false' },
  lastBountyAmount: { id: 'edb.combat.lastBountyAmount', desc: 'Last bounty amount', default: '0' },
  lastBountyFaction: { id: 'edb.combat.lastBountyFaction', desc: 'Last bounty faction', default: '' },
  sessionBountyTotal: { id: 'edb.combat.sessionBountyTotal', desc: 'Bounty total this session', default: '0' },
  lastKillbondAmount: { id: 'edb.combat.lastKillbondAmount', desc: 'Last combat bond amount', default: '0' },
  deathsSession: { id: 'edb.combat.deathsSession', desc: 'Deaths this session', default: '0' },
  lastDiedKilledBy: { id: 'edb.combat.lastDiedKilledBy', desc: 'Last death caused by', default: '' },
  hullHealthPercent: { id: 'edb.combat.hullHealthPercent', desc: 'Last reported hull health %', default: '100' },
  heatWarning: { id: 'edb.combat.heatWarning', desc: 'Heat warning (pulse)', default: 'false' },
  shieldsDown: { id: 'edb.combat.shieldsDown', desc: 'Shields down (pulse)', default: 'false' },
  targetName: { id: 'edb.combat.targetName', desc: 'Target name', default: '' },
  targetShip: { id: 'edb.combat.targetShip', desc: 'Target ship type', default: '' },
  fighterDestroyed: { id: 'edb.combat.fighterDestroyed', desc: 'Fighter destroyed (pulse)', default: 'false' },
};

const events = [
  { id: 'edb.combat.event.isUnderAttack', name: 'When under attack', format: 'Under attack: $val', valueStateId: states.isUnderAttack.id, valueType: 'text' },
  { id: 'edb.combat.event.isInterdicted', name: 'When interdicted', format: 'Interdicted: $val', valueStateId: states.isInterdicted.id, valueType: 'choice', valueChoices: ['true', 'false'] },
  { id: 'edb.combat.event.bounty', name: 'When a bounty is awarded', format: 'Bounty awarded: $val', valueStateId: states.lastBountyAmount.id, valueType: 'text' },
  { id: 'edb.combat.event.died', name: 'When you die', format: 'You died (killed by: $val)', valueStateId: states.lastDiedKilledBy.id, valueType: 'text' },
  { id: 'edb.combat.event.heatWarning', name: 'When there is a heat warning', format: 'Heat warning: $val', valueStateId: states.heatWarning.id, valueType: 'choice', valueChoices: ['true', 'false'] },
  { id: 'edb.combat.event.shieldsDown', name: 'When shields go down', format: 'Shields down: $val', valueStateId: states.shieldsDown.id, valueType: 'choice', valueChoices: ['true', 'false'] },
];

module.exports = { categoryId: CATEGORY_ID, categoryName: 'Combat', states, events, actions: [] };

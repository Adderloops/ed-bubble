'use strict';

const CATEGORY_ID = 'edb.power';

const states = {
  status: { id: 'edb.power.status', desc: 'Powerplay tracker status', default: 'NO_DATA' },
  name: { id: 'edb.power.name', desc: 'Pledged Power', default: '' },
  color: { id: 'edb.power.color', desc: 'Power colour', default: '#f07b05' },
  rank: { id: 'edb.power.rank', desc: 'Current Powerplay rank', default: '0' },
  nextRank: { id: 'edb.power.nextRank', desc: 'Next Powerplay rank', default: '1' },
  totalMerits: { id: 'edb.power.totalMerits', desc: 'Total merits', default: '0' },
  gainedMerits: { id: 'edb.power.gainedMerits', desc: 'Merits gained since last reset', default: '0' },
  remainingMerits: { id: 'edb.power.remainingMerits', desc: 'Merits remaining to next rank', default: '0' },
  lastVoucherAmount: { id: 'edb.power.lastVoucherAmount', desc: 'Last Powerplay voucher amount', default: '0' },

  // --- System control (Location / FSDJump). Shows the tracked system, or the current one. ---
  sysName: { id: 'edb.power.sysName', desc: 'System shown in the control panel', default: '-' },
  sysState: { id: 'edb.power.sysState', desc: 'Powerplay state of that system (Fortified, Stronghold...)', default: '-' },
  sysNextState: { id: 'edb.power.sysNextState', desc: 'Next Powerplay state of that system', default: '-' },
  sysProgress: { id: 'edb.power.sysProgress', desc: 'Control progress towards the next state, in percent', default: '-' },
  sysCp: { id: 'edb.power.sysCp', desc: 'Control points now / top of the current state band', default: '-' },
  sysRemaining: { id: 'edb.power.sysRemaining', desc: 'Control points still needed for the next state', default: '-' },
  sysReinforcement: { id: 'edb.power.sysReinforcement', desc: 'Reinforcement control points this cycle', default: '-' },
  sysUndermining: { id: 'edb.power.sysUndermining', desc: 'Undermining control points this cycle', default: '-' },
  sysNet: { id: 'edb.power.sysNet', desc: 'Net control points this cycle (reinforcement - undermining)', default: '-' },
  sysAsOf: { id: 'edb.power.sysAsOf', desc: 'When the game last reported this system', default: '-' },
};

// 12 cells of the progress bar. Value: 0 empty, 1 progress at cycle start, 2 gained this cycle, 3 lost this cycle.
for (let i = 1; i <= 12; i += 1) {
  const n = String(i).padStart(2, '0');
  states[`seg${n}`] = { id: `edb.power.seg${n}`, desc: `Control progress bar, cell ${i} of 12 (0 empty, 1 base, 2 gain, 3 loss)`, default: '0' };
}

const events = [
  { id: 'edb.power.event.rank', name: 'When the Powerplay Rank changes', format: 'Powerplay rank: $val', valueStateId: states.rank.id, valueType: 'text' },
  { id: 'edb.power.event.power', name: 'When the Power changes', format: 'Power: $val', valueStateId: states.name.id, valueType: 'text' },
  { id: 'edb.power.event.totalMerits', name: 'When Total Merits change', format: 'Total merits: $val', valueStateId: states.totalMerits.id, valueType: 'text' },
];

const actions = [
  { id: 'edb.power.action.resetMeritCounter', name: 'Powerplay: Reset merit counter', format: 'Powerplay: Reset gained merits counter' },
];

module.exports = { categoryId: CATEGORY_ID, categoryName: 'Powerplay', states, events, actions };

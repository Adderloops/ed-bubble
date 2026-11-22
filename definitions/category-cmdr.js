'use strict';

const CATEGORY_ID = 'edb.cmdr';

const states = {
  name: { id: 'edb.cmdr.name', desc: 'Commander name', default: '' },
  credits: { id: 'edb.cmdr.credits', desc: 'Credits (approximate, see README)', default: '0' },
  combatRank: { id: 'edb.cmdr.combatRank', desc: 'Combat rank', default: 'Harmless' },
  tradeRank: { id: 'edb.cmdr.tradeRank', desc: 'Trade rank', default: 'Penniless' },
  exploRank: { id: 'edb.cmdr.exploRank', desc: 'Exploration rank', default: 'Aimless' },
  cqcRank: { id: 'edb.cmdr.cqcRank', desc: 'CQC rank', default: 'Helpless' },
  federationRank: { id: 'edb.cmdr.federationRank', desc: 'Federation rank', default: 'None' },
  empireRank: { id: 'edb.cmdr.empireRank', desc: 'Empire rank', default: 'None' },
  reputationFederation: { id: 'edb.cmdr.reputationFederation', desc: 'Federation reputation (-100..100)', default: '0' },
  reputationEmpire: { id: 'edb.cmdr.reputationEmpire', desc: 'Empire reputation (-100..100)', default: '0' },
  reputationAlliance: { id: 'edb.cmdr.reputationAlliance', desc: 'Alliance reputation (-100..100)', default: '0' },
  reputationIndependent: { id: 'edb.cmdr.reputationIndependent', desc: 'Independent reputation (-100..100)', default: '0' },
  shipType: { id: 'edb.cmdr.shipType', desc: 'Current ship type', default: '' },
  shipName: { id: 'edb.cmdr.shipName', desc: 'Current ship name', default: '' },
  shipIdent: { id: 'edb.cmdr.shipIdent', desc: 'Current ship ID', default: '' },
  fuelCapacityMain: { id: 'edb.cmdr.fuelCapacityMain', desc: 'Main tank capacity (t)', default: '0' },
  fuelCapacityReserve: { id: 'edb.cmdr.fuelCapacityReserve', desc: 'Reservoir capacity (t)', default: '0' },
};

const events = [
  { id: 'edb.cmdr.event.shipType', name: 'When the Ship Type changes', format: 'When the ship becomes $val', valueStateId: states.shipType.id, valueType: 'text' },
  { id: 'edb.cmdr.event.combatRank', name: 'When the Combat Rank changes', format: 'When the Combat Rank becomes $val', valueStateId: states.combatRank.id, valueType: 'text' },
  { id: 'edb.cmdr.event.tradeRank', name: 'When the Trade Rank changes', format: 'When the Trade Rank becomes $val', valueStateId: states.tradeRank.id, valueType: 'text' },
  { id: 'edb.cmdr.event.exploRank', name: 'When the Exploration Rank changes', format: 'When the Exploration Rank becomes $val', valueStateId: states.exploRank.id, valueType: 'text' },
];

module.exports = { categoryId: CATEGORY_ID, categoryName: 'CMDR / Pilot', states, events, actions: [] };

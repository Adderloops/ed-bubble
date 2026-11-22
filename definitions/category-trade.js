'use strict';

const CATEGORY_ID = 'edb.trade';

const states = {
  lastCommodity: { id: 'edb.trade.lastCommodity', desc: 'Last commodity traded', default: '' },
  lastAction: { id: 'edb.trade.lastAction', desc: 'Last action (Buy/Sell)', default: '' },
  lastQty: { id: 'edb.trade.lastQty', desc: 'Last trade quantity', default: '0' },
  sessionProfit: { id: 'edb.trade.sessionProfit', desc: 'Trade profit this session (approx.)', default: '0' },
  lastMiningMaterial: { id: 'edb.trade.lastMiningMaterial', desc: 'Last refined material (mining)', default: '' },
  sessionMiningCount: { id: 'edb.trade.sessionMiningCount', desc: 'Materials refined this session', default: '0' },
  lastCargoCollected: { id: 'edb.trade.lastCargoCollected', desc: 'Last cargo collected', default: '' },
  lastMaterialCollected: { id: 'edb.trade.lastMaterialCollected', desc: 'Last raw material collected (SRV/on foot)', default: '' },
  shipCargoList: { id: 'edb.trade.shipCargoList', desc: 'Live ship cargo hold contents', default: 'No data yet (board your ship or move cargo)' },
  shipCargoCount: { id: 'edb.trade.shipCargoCount', desc: 'Total units in the ship cargo hold', default: '0' },
  shipCargoCapacity: { id: 'edb.trade.shipCargoCapacity', desc: 'Ship cargo capacity (t), from the last Loadout', default: '' },
  srvCargoList: { id: 'edb.trade.srvCargoList', desc: 'Live SRV cargo hold contents', default: 'No data yet (board the SRV or move cargo)' },
  srvCargoCount: { id: 'edb.trade.srvCargoCount', desc: 'Total units in the SRV cargo hold', default: '0' },
  srvCargoCapacity: { id: 'edb.trade.srvCargoCapacity', desc: 'Active SRV cargo capacity (t), by vehicle type', default: '' },
};

const events = [
  { id: 'edb.trade.event.commodity', name: 'When a commodity is bought or sold', format: '$val', valueStateId: states.lastCommodity.id, valueType: 'text' },
  { id: 'edb.trade.event.mining', name: 'When a mined material is refined', format: 'Refined: $val', valueStateId: states.lastMiningMaterial.id, valueType: 'text' },
];

module.exports = { categoryId: CATEGORY_ID, categoryName: 'Trade / Mining', states, events, actions: [] };

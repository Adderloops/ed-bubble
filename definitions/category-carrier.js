'use strict';

const CATEGORY_ID = 'edb.carrier';

const states = {
  name: { id: 'edb.carrier.name', desc: 'Fleet Carrier name', default: '' },
  callsign: { id: 'edb.carrier.callsign', desc: 'Fleet Carrier callsign', default: '' },
  fuelLevel: { id: 'edb.carrier.fuelLevel', desc: 'Tritium level', default: '0' },
  balance: { id: 'edb.carrier.balance', desc: 'Fleet Carrier balance', default: '0' },
  jumpDestination: { id: 'edb.carrier.jumpDestination', desc: 'Next jump destination', default: '' },
  jumpTime: { id: 'edb.carrier.jumpTime', desc: 'Scheduled jump time (UTC)', default: '' },
  jumpScheduled: { id: 'edb.carrier.jumpScheduled', desc: 'Jump scheduled (pulse)', default: 'false' },
};

const events = [
  { id: 'edb.carrier.event.jumpScheduled', name: 'When a Fleet Carrier jump is scheduled', format: 'Carrier jump scheduled to: $val', valueStateId: states.jumpDestination.id, valueType: 'text' },
];

module.exports = { categoryId: CATEGORY_ID, categoryName: 'Fleet Carrier', states, events, actions: [] };

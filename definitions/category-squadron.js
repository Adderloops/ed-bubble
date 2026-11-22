'use strict';

const CATEGORY_ID = 'edb.squadron';

const states = {
  name: { id: 'edb.squadron.name', desc: 'Squadron name', default: '' },
  rank: { id: 'edb.squadron.rank', desc: 'Squadron rank', default: '' },
  lastEvent: { id: 'edb.squadron.lastEvent', desc: 'Last Squadron event', default: '' },
};

const events = [
  { id: 'edb.squadron.event.lastEvent', name: 'When a Squadron event occurs', format: 'Squadron: $val', valueStateId: states.lastEvent.id, valueType: 'text' },
];

module.exports = { categoryId: CATEGORY_ID, categoryName: 'Squadron', states, events, actions: [] };

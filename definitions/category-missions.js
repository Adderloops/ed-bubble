'use strict';

const CATEGORY_ID = 'edb.missions';

const states = {
  activeCount: { id: 'edb.missions.activeCount', desc: 'Active missions', default: '0' },
  lastAccepted: { id: 'edb.missions.lastAccepted', desc: 'Last accepted mission', default: '' },
  lastCompleted: { id: 'edb.missions.lastCompleted', desc: 'Last completed mission', default: '' },
  lastFailed: { id: 'edb.missions.lastFailed', desc: 'Last failed mission', default: '' },
  completedSession: { id: 'edb.missions.completedSession', desc: 'Missions completed this session', default: '0' },
  failedSession: { id: 'edb.missions.failedSession', desc: 'Missions failed this session', default: '0' },
};

const events = [
  { id: 'edb.missions.event.accepted', name: 'When a mission is accepted', format: 'Mission accepted: $val', valueStateId: states.lastAccepted.id, valueType: 'text' },
  { id: 'edb.missions.event.completed', name: 'When a mission is completed', format: 'Mission completed: $val', valueStateId: states.lastCompleted.id, valueType: 'text' },
  { id: 'edb.missions.event.failed', name: 'When a mission fails', format: 'Mission failed: $val', valueStateId: states.lastFailed.id, valueType: 'text' },
];

module.exports = { categoryId: CATEGORY_ID, categoryName: 'Missions', states, events, actions: [] };

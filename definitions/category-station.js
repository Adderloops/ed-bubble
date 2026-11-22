'use strict';

const CATEGORY_ID = 'edb.station';

const states = {
  lastEngineer: { id: 'edb.station.lastEngineer', desc: 'Last engineer visited/updated', default: '' },
  lastEngineerRank: { id: 'edb.station.lastEngineerRank', desc: 'Rank with that engineer', default: '' },
  lastBlueprintApplied: { id: 'edb.station.lastBlueprintApplied', desc: 'Last modification applied', default: '' },
  communityGoalName: { id: 'edb.station.communityGoalName', desc: 'Active Community Goal', default: '' },
  communityGoalContribution: { id: 'edb.station.communityGoalContribution', desc: 'Your Community Goal contribution', default: '0' },
  communityGoalPosition: { id: 'edb.station.communityGoalPosition', desc: 'Your Community Goal position', default: '0' },
};

const events = [
  { id: 'edb.station.event.blueprint', name: 'When an engineering modification is applied', format: 'Modification applied: $val', valueStateId: states.lastBlueprintApplied.id, valueType: 'text' },
  { id: 'edb.station.event.communityGoal', name: 'When the Community Goal updates', format: 'Community Goal: $val', valueStateId: states.communityGoalName.id, valueType: 'text' },
];

module.exports = { categoryId: CATEGORY_ID, categoryName: 'Station / Engineers', states, events, actions: [] };

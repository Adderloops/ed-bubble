'use strict';

const { FLAGS2 } = require('./flags');

const CATEGORY_ID = 'edb.onfoot';

const states = {
  suitName: { id: 'edb.onfoot.suitName', desc: 'Equipped suit', default: '' },
  lastBackpackItem: { id: 'edb.onfoot.lastBackpackItem', desc: 'Last backpack item picked up/dropped', default: '' },
  lastOrganicScanned: { id: 'edb.onfoot.lastOrganicScanned', desc: 'Last organic species scanned', default: '' },
  lastOrganicStage: { id: 'edb.onfoot.lastOrganicStage', desc: 'Last organic scan stage (1/2/3)', default: '' },
  isEmbarked: { id: 'edb.onfoot.isEmbarked', desc: 'Embarked on taxi/dropship (pulse)', default: 'false' },
};

for (const flag of FLAGS2) {
  states[flag.id] = { id: `edb.onfoot.${flag.id}`, desc: flag.desc, default: 'false' };
}

const BOOLEAN_CHOICES = ['true', 'false'];

const events = [
  { id: 'edb.onfoot.event.suitName', name: 'When the equipped Suit changes', format: 'When the equipped suit becomes $val', valueStateId: states.suitName.id, valueType: 'text' },
  { id: 'edb.onfoot.event.organicScanned', name: 'When an organic species is scanned', format: 'Scanned: $val', valueStateId: states.lastOrganicScanned.id, valueType: 'text' },
  ...FLAGS2.map((flag) => ({
    id: `edb.onfoot.event.${flag.id}`,
    name: `When it changes: ${flag.desc}`,
    format: `When "${flag.desc}" becomes $val`,
    valueStateId: states[flag.id].id,
    valueType: 'choice',
    valueChoices: BOOLEAN_CHOICES,
  })),
];

module.exports = { categoryId: CATEGORY_ID, categoryName: 'On Foot / Suits', states, events, actions: [] };

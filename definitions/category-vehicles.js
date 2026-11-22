'use strict';

const CATEGORY_ID = 'edb.vehicles';

const states = {
  srvType: { id: 'edb.vehicles.srvType', desc: 'Deployed SRV type (e.g. "SRV Rhino"); empty when none', default: '' },
  srvTypeId: { id: 'edb.vehicles.srvTypeId', desc: 'Deployed SRV internal type (e.g. mev_rhino); empty when none', default: '' },
  srvKind: { id: 'edb.vehicles.srvKind', desc: 'Vehicle shown on the SRV page: none, srv, rhino or nomad', default: 'none' },
  srvDeployed: { id: 'edb.vehicles.srvDeployed', desc: 'An SRV is deployed (from Journal LaunchSRV/DockSRV)', default: 'false' },
  fighterDeployed: { id: 'edb.vehicles.fighterDeployed', desc: 'A ship-launched fighter is deployed', default: 'false' },
};

const KIND_CHOICES = ['none', 'srv', 'rhino', 'nomad'];
const BOOLEAN_CHOICES = ['true', 'false'];

const events = [
  { id: 'edb.vehicles.event.srvType', name: 'When the deployed SRV type changes', format: 'When the deployed SRV becomes $val', valueStateId: states.srvType.id, valueType: 'text' },
  { id: 'edb.vehicles.event.srvKind', name: 'When the deployed vehicle kind changes', format: 'When the deployed vehicle becomes $val', valueStateId: states.srvKind.id, valueType: 'choice', valueChoices: KIND_CHOICES },
  { id: 'edb.vehicles.event.srvDeployed', name: 'When an SRV is deployed or recovered', format: 'When "SRV deployed" becomes $val', valueStateId: states.srvDeployed.id, valueType: 'choice', valueChoices: BOOLEAN_CHOICES },
  { id: 'edb.vehicles.event.fighterDeployed', name: 'When a fighter is launched or recovered', format: 'When "Fighter deployed" becomes $val', valueStateId: states.fighterDeployed.id, valueType: 'choice', valueChoices: BOOLEAN_CHOICES },
];

module.exports = { categoryId: CATEGORY_ID, categoryName: 'SRV / Vehicles', states, events, actions: [] };

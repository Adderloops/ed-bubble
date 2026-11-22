'use strict';

const CATEGORY_ID = 'edb.meta';

const states = {
  status: { id: 'edb.meta.status', desc: 'Plugin status', default: 'STARTING' },
  lastEventName: { id: 'edb.meta.lastEventName', desc: 'Last Journal event received', default: '' },
  sessionStart: { id: 'edb.meta.sessionStart', desc: 'Plugin session start time', default: '' },
};

const events = [
  { id: 'edb.meta.event.status', name: 'When the plugin status changes', format: 'Plugin status: $val', valueStateId: states.status.id, valueType: 'choice', valueChoices: ['STARTING', 'CONNECTED', 'NO_JOURNAL', 'ERROR'] },
];

const actions = [
  {
    id: 'edb.meta.action.resetSession',
    name: 'Reset session counters',
    format: 'Reset all session counters (combat, trade, missions, powerplay...)',
  },
  {
    id: 'edb.meta.action.reloadJournal',
    name: 'Reload Journal from the start',
    format: 'Re-read the current Journal from the start',
  },
  {
    id: 'edb.meta.action.openInara',
    name: 'Open Inara for the current system',
    format: 'Open the current system\'s Inara page in the browser',
  },
  {
    id: 'edb.meta.action.openEDSM',
    name: 'Open EDSM for the current system',
    format: 'Open the current system\'s EDSM page in the browser',
  },
  {
    id: 'edb.meta.action.copySystemToClipboard',
    name: 'Copy current system to clipboard',
    format: 'Copy the current system name to the clipboard',
  },
  {
    id: 'edb.meta.action.exportSessionStats',
    name: 'Export session stats to file',
    format: 'Export a summary of the current session to a JSON file',
  },
];

module.exports = { categoryId: CATEGORY_ID, categoryName: 'Plugin Utilities', states, events, actions };

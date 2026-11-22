'use strict';

const defs = require('../../definitions/category-vehicles');

/**
 * Vehículo desplegado (SRV / caza). LaunchSRV y DockSRV traen SRVType
 * (p.ej. "mev_rhino") y SRVType_Localised ("SRV Rhino"); SRVDestroyed
 * también. El Nomad (juego 4.4.2.1) NO se lanza con LaunchSRV sino con
 * LaunchVessel { VesselType: "lander01", VesselType_Localised: "Nomad" };
 * al recogerlo sí emite DockSRV { SRVType: "lander01" }. Al morir/resucitar
 * se limpia todo, porque el juego no emite DockSRV en ese caso.
 */
// mev_rhino -> rhino, lander01 -> nomad; cualquier otro SRV (el estándar) -> srv
const kindOf = (id) => (id === 'mev_rhino' ? 'rhino' : id === 'lander01' ? 'nomad' : 'srv');

module.exports = function registerVehiclesHandlers(router, ctx) {
  const { state } = ctx;

  const setSrv = (e) => state.setMany([
    { id: defs.states.srvType.id, value: e.SRVType_Localised || e.SRVType || '' },
    { id: defs.states.srvTypeId.id, value: e.SRVType || '' },
    { id: defs.states.srvKind.id, value: kindOf(e.SRVType) },
    { id: defs.states.srvDeployed.id, value: 'true' },
  ]);

  const clearSrv = () => state.setMany([
    { id: defs.states.srvType.id, value: '' },
    { id: defs.states.srvTypeId.id, value: '' },
    { id: defs.states.srvKind.id, value: 'none' },
    { id: defs.states.srvDeployed.id, value: 'false' },
  ]);

  const clearAll = () => {
    clearSrv();
    state.set(defs.states.fighterDeployed.id, 'false');
  };

  router.on('LaunchSRV', setSrv);
  router.on('LaunchVessel', (e) => {
    if (e.PlayerControlled === false) return;
    setSrv({ SRVType: e.VesselType, SRVType_Localised: e.VesselType_Localised });
  });
  router.on('DockSRV', clearSrv);
  router.on('SRVDestroyed', clearSrv);
  router.on('LaunchFighter', () => state.set(defs.states.fighterDeployed.id, 'true'));
  router.on('DockFighter', () => state.set(defs.states.fighterDeployed.id, 'false'));
  router.on('FighterDestroyed', () => state.set(defs.states.fighterDeployed.id, 'false'));
  router.on('Died', clearAll);
  router.on('Resurrect', clearAll);
  router.on('LoadGame', clearAll);
};

'use strict';

/**
 * ED BUBBLE · minería.
 *
 * - Superficie (Rhino): lee lo que calcula el plugin Skull Mining de EDMC
 *   (live_session.json y zone_state.json) y los sitios de la flota de la web.
 * - Guía de taladros: distancia a los taladros marcados en la app.
 * - Nave (asteroides): sesión propia a partir del Journal (model.js).
 */

const geo = require('./geo');

/** Zona de una posición: el ancla conocida más cercana del cuerpo, hasta 10 km (como el plugin). */
function zoneAt(anchors, body, lat, lon, radius, maxM = 10000) {
  if (!anchors || !body || lat == null || lon == null || !radius) return null;
  let best = null;
  for (const [key, a] of Object.entries(anchors)) {
    const i = key.lastIndexOf('|');
    if (i < 0 || key.slice(0, i) !== body || !Array.isArray(a)) continue;
    const d = geo.distance(lat, lon, a[0], a[1], radius);
    if (d <= maxM && (!best || d < best.dist)) best = { index: Number(key.slice(i + 1)), dist: d };
  }
  return best ? best.index : null;
}

/** Resumen de la sesión en curso del plugin (live_session.json) para la pantalla. */
function liveView(live, now = Date.now() / 1000) {
  if (!live || !live.session) return null;
  const s = live.session; const sum = live.summary || {};
  const names = sum.type_names || {};
  const byType = Object.entries(sum.tonnes_by_type || {}).map(([k, t]) => ({ key: k, name: names[k] || k, tonnes: t }))
    .sort((a, b) => b.tonnes - a.tonnes);
  const hours = (sum.duration_s || 0) / 3600;
  return {
    body: s.body || null, system: (s.system && (s.system.name || s.system.StarSystem)) || null,
    start: s.start_t || null, savedAt: live.saved_at || null, ageS: live.saved_at ? Math.max(0, now - live.saved_at) : null,
    rigs: sum.rigs ?? null, collections: sum.collections ?? null, tonnes: sum.tonnes ?? 0, byType,
    perHour: hours > 0.05 ? (sum.tonnes || 0) / hours : null, perCollection: sum.tonnes_per_collection ?? null,
    cycleS: sum.cycle_s_median ?? null, terrain: sum.terrain || null, trackM: sum.track_len_m ?? null,
    siteSignal: s.site_signal ?? null, srvType: s.srv_type || null,
    rigList: (sum.rig_list || []).filter((r) => r.lat != null && r.lon != null).map((r) => ({ lat: r.lat, lon: r.lon, type: r.type || null })),
  };
}

/**
 * Guía de taladros: distancia desde la posición actual al taladro más cercano.
 * ok = ya estás a la distancia mínima de todos.
 */
function rigGuide(rigs, pos, radius, minM) {
  if (!pos || pos.lat == null || pos.lon == null || !radius) return null;
  if (!rigs || !rigs.length) return { count: 0, nearest: null, ok: true, minM };
  let nearest = null;
  rigs.forEach((r, i) => {
    const d = geo.distance(pos.lat, pos.lon, r.lat, r.lon, radius);
    if (!nearest || d < nearest.dist) nearest = { index: i + 1, dist: d, bearing: geo.bearing(pos.lat, pos.lon, r.lat, r.lon) };
  });
  if (pos.heading != null) nearest.rel = geo.relative(nearest.bearing, pos.heading);
  return { count: rigs.length, nearest, ok: nearest.dist >= minM, missing: Math.max(0, minM - nearest.dist), minM };
}

/** Sitios de la flota con distancia y dirección desde tu posición, del más cercano al más lejano. */
function sitesView(sites, pos, radius) {
  const list = (sites || []).filter((s) => s.lat != null && s.lon != null).map((s) => {
    const out = { ...s, usable: !s.depleted && !s.notWorth };
    if (pos && pos.lat != null && radius) {
      out.dist = geo.distance(pos.lat, pos.lon, s.lat, s.lon, radius);
      out.bearing = geo.bearing(pos.lat, pos.lon, s.lat, s.lon);
      if (pos.heading != null) out.rel = geo.relative(out.bearing, pos.heading);
    }
    return out;
  });
  return list.sort((a, b) => (a.dist ?? 1e12) - (b.dist ?? 1e12));
}

module.exports = { zoneAt, liveView, rigGuide, sitesView };

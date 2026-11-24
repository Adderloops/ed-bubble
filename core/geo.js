'use strict';

/**
 * ED BUBBLE · navegación sobre la superficie de un planeta.
 * Rumbo y distancia de círculo máximo entre tu posición (Status.json:
 * Latitude, Longitude, Heading, PlanetRadius) y unas coordenadas fijadas.
 */

const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;

/**
 * Lee coordenadas de un texto pegado o escrito. Acepta:
 *   "12.345, -67.89" · "12.345 -67.89" · "12,345 -67,89" (coma decimal) ·
 *   "Lat: 12.3 Lon: 45.6" · "(12.3; 45.6)". Devuelve { lat, lon } o null.
 */
function parseCoords(text) {
  const t = String(text || '').trim();
  if (!t) return null;
  let nums;
  if (/\d\.\d/.test(t)) nums = t.match(/[-+]?\d+(?:\.\d+)?/g);
  else nums = (t.match(/[-+]?\d+(?:,\d+)?/g) || []).map((x) => x.replace(',', '.'));
  if (!nums || nums.length !== 2) return null;
  const lat = Number(nums[0]); const lon = Number(nums[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}

/** Rumbo inicial (0-360°, 0 = norte) desde (lat1, lon1) hacia (lat2, lon2). */
function bearing(lat1, lon1, lat2, lon2) {
  const p1 = rad(lat1); const p2 = rad(lat2); const dl = rad(lon2 - lon1);
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

/** Distancia sobre la superficie (m), con el radio del planeta en metros. */
function distance(lat1, lon1, lat2, lon2, radius) {
  const p1 = rad(lat1); const p2 = rad(lat2);
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 2 * radius * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Giro necesario (-180..180, positivo = a la derecha) desde tu rumbo al del objetivo. */
function relative(targetBearing, heading) {
  return ((targetBearing - heading + 540) % 360) - 180;
}

/**
 * Navegación al objetivo con el estado de Status.json.
 * Devuelve null si no estás cerca de un cuerpo o no hay objetivo.
 */
function surfaceNav(status, target) {
  if (!target || status.latitude == null || status.longitude == null) return null;
  const sameBody = !target.body || !status.bodyName || target.body === status.bodyName;
  const b = bearing(status.latitude, status.longitude, target.lat, target.lon);
  const d = status.planetRadius ? distance(status.latitude, status.longitude, target.lat, target.lon, status.planetRadius) : null;
  const rel = status.heading != null ? relative(b, status.heading) : null;
  return { bearing: b, distance: d, relative: rel, sameBody, heading: status.heading, altitude: status.altitude };
}

/**
 * Si el destino se fijó sin saber el cuerpo (fuera de su órbita), lo completa con el
 * cuerpo en el que estás al llegar. Devuelve el destino nuevo o null si no cambia.
 */
function adoptBody(target, state) {
  if (!target || target.body) return null;
  const body = (state.status && state.status.bodyName) || (state.location && state.location.approach && state.location.approach.body) || null;
  return body ? { ...target, body } : null;
}

module.exports = { adoptBody, parseCoords, bearing, distance, relative, surfaceNav };

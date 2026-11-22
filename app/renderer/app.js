'use strict';

/* ED BUBBLE · interfaz (entrega 1: datos en vivo, solo lectura) */

const SECTIONS = [
  { id: 'puente', label: 'Puente de mando', home: true, built: true },
  { group: 'Nave' }, { id: 'vuelo', label: 'Vuelo', built: true }, { id: 'combate', label: 'Combate' }, { id: 'equipo', label: 'Equipo' }, { id: 'srv', label: 'SRV' },
  { group: 'Viaje' }, { id: 'navegacion', label: 'Navegación' }, { id: 'exploracion', label: 'Exploración' }, { id: 'estacion', label: 'Estación' }, { id: 'apie', label: 'A pie' },
  { group: 'Actividades' }, { id: 'powerplay', label: 'Powerplay' }, { id: 'comercio', label: 'Comercio' }, { id: 'mineria', label: 'Minería' }, { id: 'colonizacion', label: 'Colonización' },
  { group: 'Comandante' }, { id: 'cmdr', label: 'CMDR' }, { id: 'carrier', label: 'Carrier' }, { id: 'camara', label: 'Cámara' }, { id: 'utilidades', label: 'Utilidades' },
];
const BUILT = new Set(SECTIONS.filter((s) => s.built).map((s) => s.id));

const ui = { section: 'puente', autoJump: true, lastModeKey: null, snap: null };

/* ---------- utilidades ---------- */
const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = (s) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim());
// "Orbital Construction Site: Sisters' Pride" -> "Sisters' Pride"
const siteName = (s) => clean(s) && clean(s).replace(/^(Orbital|Planetary) Construction Site:\s*/i, '');
const nf = (n, d = 0) => (n == null || Number.isNaN(Number(n)) ? '—' : Number(n).toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d }));
const hhmm = (iso) => (iso ? String(iso).slice(11, 16) : '--:--');
const pct = (r, d = 1) => (r == null ? '—' : `${nf(r * 100, d)} %`);
const or = (v, alt = '—') => (v == null || v === '' ? alt : v);

const SHIP_NAMES = { panthermkii: 'Panther Mk II', smallcombat01_nx: 'Kestrel Mk II', type9: 'Type-9 Heavy', type10: 'Type-10 Defender', anaconda: 'Anaconda', python: 'Python', python_nx: 'Python Mk II', cutter: 'Imperial Cutter', federation_corvette: 'Federal Corvette', krait_mkii: 'Krait Mk II', mandalay: 'Mandalay', corsair: 'Corsair', asp: 'Asp Explorer', dolphin: 'Dolphin', type8: 'Type-8 Transporter', explorer_nx: 'Caspian Explorer' };
const shipName = (t, loc) => loc || SHIP_NAMES[String(t || '').toLowerCase()] || (t ? String(t).replace(/_/g, ' ') : '—');

const STATION_TYPES = {
  Coriolis: 'Coriolis', Orbis: 'Orbis', Bernal: 'Ocellus', Ocellus: 'Ocellus', Outpost: 'Puesto orbital', AsteroidBase: 'Base en asteroide', MegaShip: 'Meganave', FleetCarrier: 'Fleet carrier',
  CraterPort: 'Puerto planetario', CraterOutpost: 'Puesto planetario', OnFootSettlement: 'Asentamiento', SurfaceStation: 'Estación de superficie',
  SpaceConstructionDepot: 'Construcción orbital', PlanetaryConstructionDepot: 'Construcción en superficie',
};
const DIAGRAM_TYPES = new Set(['Coriolis', 'Orbis', 'Bernal', 'Ocellus', 'Dodec']);
const ES = { Independent: 'Independiente', Federation: 'Federación', Empire: 'Imperio', Alliance: 'Alianza', Expansion: 'Expansión', Boom: 'Auge', Bust: 'Recesión', None: 'Ninguno', Election: 'Elecciones', War: 'Guerra', CivilWar: 'Guerra civil', Investment: 'Inversión', Retreat: 'Retirada', Lockdown: 'Confinamiento', Outbreak: 'Brote', Famine: 'Hambruna', CivilUnrest: 'Disturbios', PirateAttack: 'Ataque pirata', Unoccupied: 'Sin ocupar', Exploited: 'Explotado', Fortified: 'Fortificado', Stronghold: 'Bastión' };
const tr = (v) => (v == null ? '—' : ES[v] || v);

function seg(ratio, cls = 'on') {
  const n = ratio == null ? 0 : Math.round(Math.max(0, Math.min(1, ratio)) * 10);
  return `<div class="seg">${Array.from({ length: 10 }, (_, i) => `<span class="${i < n ? cls : ''}"></span>`).join('')}</div>`;
}

/* ---------- cabecera y menú ---------- */
function renderHeader(s, v) {
  $('hdr-section').textContent = `ED BUBBLE · ${SECTIONS.find((x) => x.id === ui.section).label}`;
  $('hdr-system').textContent = or(clean(s.location.system), 'Esperando al juego…');
  const a = v.alerts;
  $('hdr-alerts').innerHTML = a.length
    ? `<span class="eb">Alertas</span>${a.map((x) => `<span class="alert ${x.level}">${esc(x.text)}</span>`).join('')}`
    : '<span class="eb dim">Alertas</span><span class="va soft" style="font-size:17px">Sin alertas activas</span>';
  const recent = s.connection.lastEventAt && (Date.now() - Date.parse(s.connection.lastEventAt) < 15 * 60 * 1000);
  const lamp = (on, label, title) => `<span class="eb lamp ${on ? 'cyan' : ''}" title="${esc(title)}"><span class="dot ${on ? 'on' : ''}"></span>${label}</span>`;
  $('hdr-lamps').innerHTML = lamp(s.connection.journal, 'Journal', s.connection.journalFile || 'Sin Journal')
    + lamp(s.connection.status && recent, 'Juego en vivo', recent ? 'Eventos en los últimos 15 min' : 'Sin eventos recientes')
    + lamp(false, 'Datos externos', 'Llega en la entrega 3 (Spansh)');
}

function renderRail(v) {
  const live = v ? v.mode.section : null;
  $('rail').innerHTML = SECTIONS.map((x) => {
    if (x.group) return `<span class="gp">${x.group}</span>`;
    const on = x.id === ui.section ? ' on' : '';
    const dis = x.built ? '' : ' disabled title="Próximamente"';
    const dot = live === x.id ? '<span class="dot on"></span>' : '';
    return `<button type="button" class="nv${on}${x.home ? ' home' : ''}" data-sec="${x.id}"${dis}>${x.label}${dot}</button>`;
  }).join('') + `<span class="note foot" id="autojump"></span>`;
  $('autojump').innerHTML = `Salto automático a la sección: <b class="${ui.autoJump ? 'cyan' : 'dim'}">${ui.autoJump ? 'activado' : 'desactivado'}</b>`;
}

/* ---------- Puente de mando ---------- */
function screenPuente(s, v) {
  const f = v.fuel; const r = v.route; const c = v.colonisation; const pp = s.powerplay;
  const hull = s.ship.hull;
  const routeRows = r.legs.length
    ? r.legs.slice(0, 7).map((l) => `<div class="in row" style="grid-template-columns:52px 44px minmax(0,1fr) 120px 150px;${l.here ? 'border-color:#8a5a1e;border-left:3px solid var(--amber)' : ''}">
        <span class="num" style="padding-left:12px;color:${l.here ? 'var(--amber)' : 'var(--eb)'}">${String(l.index).padStart(2, '0')}</span>
        <span class="starc ${l.scoopable === false ? 'no' : l.scoopable == null ? 'unk' : ''}">${esc(or(l.starClass, '?'))}</span>
        <span class="va nowrap" style="font-size:18px">${esc(l.system)}</span>
        <span class="num" style="text-align:right">${l.here ? 'aquí' : `${nf(l.distance, 1)} al`}</span>
        <span class="eb" style="text-align:right;padding-right:14px;color:${l.scoopable === false ? 'var(--amber)' : l.scoopable ? 'var(--cyan)' : 'var(--dim)'}">${l.scoopable === false ? 'No recogible' : l.scoopable ? 'Recogible' : 'Desconocida'}</span></div>`).join('')
      + (r.legs.length > 7 ? `<span class="note">+${r.legs.length - 7} saltos más hasta ${esc(r.destination)}</span>` : '')
    : '<div class="empty">Sin ruta trazada. Traza una en el mapa galáctico y aparecerá aquí.</div>';

  const log = s.log.slice(0, 9).map((l) => `<span class="num dim">${hhmm(l.at)}</span><span class="nowrap"><span class="va ${l.level === 'warn' ? 'yellow' : l.level === 'danger' ? 'red' : ''}">${esc(l.title)}</span> <span class="soft">${esc(clean(l.detail) ? '· ' + clean(l.detail) : '')}</span></span>`).join('');

  const ppCtl = pp.control;
  const ppCard = ppCtl
    ? `<span class="ti" style="font-size:24px">Faltan ${nf(ppCtl.remaining)} PC</span>
       <span style="display:flex;justify-content:space-between;align-items:baseline"><span class="soft" style="font-size:15px">${tr(ppCtl.state)} › ${tr(ppCtl.nextState)}</span><span class="num cyan" style="font-size:24px">${pct(ppCtl.progress)}</span></span>
       <span class="bar"><span style="width:${Math.min(100, ppCtl.baseProgress * 100)}%;background:#2a7fa3"></span><span style="left:${Math.min(100, ppCtl.baseProgress * 100)}%;width:${Math.max(0, Math.min(100, (ppCtl.progress - ppCtl.baseProgress) * 100))}%;background:var(--green)"></span></span>`
    : `<span class="va" style="font-size:18px">${esc(clean(s.location.system) || '—')}: ${tr(s.location.powerplayState)}</span><span class="soft" style="font-size:14px">El progreso aparece al entrar en un sistema con Powerplay activo.</span>`;

  const colCard = c
    ? `<span class="ti" style="font-size:24px">Faltan ${nf(c.remaining)} t</span>
       <span style="display:flex;justify-content:space-between;align-items:baseline"><span class="soft nowrap" style="font-size:15px">${esc(siteName(c.name) || 'Obra')}</span><span class="num cyan" style="font-size:24px">${pct(c.progress)}</span></span>
       <span class="bar"><span style="width:${(c.progress || 0) * 100}%;background:#2a7fa3"></span></span>`
    : '<span class="soft" style="font-size:14px">Sin obras de colonización en esta sesión.</span>';

  return `
  <div style="display:grid;grid-template-columns:minmax(0,1fr) 440px;gap:12px;min-height:0">
   <div style="display:flex;flex-direction:column;gap:12px;min-width:0;min-height:0">
    <div class="pn" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));padding:14px 0">
      ${idCell('Comandante', or(s.cmdr.name), `${nf(s.cmdr.credits)} CR`)}
      ${idCell('Nave', or(s.ship.name), `${shipName(s.ship.type, s.ship.typeLocalised)} · ${or(s.ship.ident)}`)}
      ${idCell(s.location.docked ? 'Atracado en' : 'Destino', clean(s.location.docked ? s.location.station : s.destination.name) || '—', s.location.docked ? (STATION_TYPES[s.location.stationType] || or(s.location.stationType)) : (s.destination.name ? 'Destino fijado' : 'Sin destino'))}
      ${idCell('Powerplay', or(pp.power), pp.rank != null ? `Rango ${pp.rank} · ${nf(pp.merits)} méritos` : '—', true)}
    </div>
    <section class="pn hero">
      <div style="display:flex;flex-direction:column;gap:10px;min-width:0">
        <span class="eb" style="display:flex;align-items:center;gap:8px"><span class="dot on"></span>Ahora · cambia solo según el estado del juego</span>
        <span class="ti title">${esc(v.mode.label)}</span>
        <span class="soft nowrap" style="font-size:17px">${esc(nowText(s, v))}</span>
      </div>
      <div class="in accent" style="display:flex;flex-direction:column;gap:4px;padding:14px 16px">
        <span class="eb">Sección para este estado</span>
        <span class="va" style="font-size:22px">${esc((SECTIONS.find((x) => x.id === v.mode.section) || {}).label || '—')}</span>
        <span class="eb" style="font-size:10px;color:var(--dim)">${BUILT.has(v.mode.section) ? 'Salto automático disponible' : 'Sección aún no construida'}</span>
      </div>
    </section>
    <div style="flex:1;display:grid;grid-template-columns:380px minmax(0,1fr);gap:12px;min-height:0">
      <section class="pn card">
        <span class="ti" style="font-size:16px">Estado de la nave</span>
        ${meter('Casco', hull != null ? pct(hull, 0) : '—', hull, hull != null && hull < 0.5 ? 'danger' : 'on')}
        ${meter('Escudos', s.status.flags.areShieldsUp ? 'Arriba' : (s.status.flags.areShieldsUp === false ? 'Caídos' : '—'), s.status.flags.areShieldsUp ? 1 : 0, 'on')}
        ${meter('Combustible', `${nf(f.main, 1)} / ${nf(f.cap, 0)} t`, f.ratio, f.ratio != null && f.ratio < 0.25 ? 'warn' : 'on')}
        ${meter('Carga', `${nf(s.cargo.count)} / ${nf(s.ship.cargoCapacity)} t`, s.ship.cargoCapacity ? s.cargo.count / s.ship.cargoCapacity : null, 'on')}
        <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">
          ${stat('Tren', s.status.flags.isLandingGearDown ? 'Bajado' : 'Arriba')}${stat('Armas', s.status.flags.areHardpointsDeployed ? 'Fuera' : 'Dentro')}${stat('Salto máx.', `${nf(s.ship.maxJumpRange, 2)} al`)}
        </div>
      </section>
      <section class="pn card">
        <div style="display:flex;justify-content:space-between;align-items:center"><span class="ti" style="font-size:16px">Ruta trazada</span><span class="eb">${r.legs.length ? `${r.jumps} saltos · ${nf(r.distance, 1)} al · ${esc(r.destination)}` : ''}</span></div>
        <div style="display:flex;flex-direction:column;gap:4px;min-height:0">${routeRows}</div>
        <span class="note" style="margin-top:auto">Desde NavRoute.json · cian = combustible recogible, ámbar = no recogible</span>
      </section>
    </div>
   </div>
   <aside class="pn" style="padding:14px;display:flex;flex-direction:column;gap:12px;min-height:0">
     <div class="in" style="padding:12px 14px"><span class="eb">Consola derecha</span><div class="ti" style="font-size:18px">Actividades</div></div>
     <div class="in accent" style="padding:16px;display:flex;flex-direction:column;gap:10px"><span class="eb">Powerplay · ${esc(clean(pp.system) || '—')}</span>${ppCard}</div>
     <div class="in" style="padding:16px;display:flex;flex-direction:column;gap:10px"><span class="eb">Colonización</span>${colCard}</div>
     <div class="in" style="flex:1;padding:16px;display:flex;flex-direction:column;gap:10px;min-height:0;overflow:hidden">
       <span class="ti" style="font-size:15px">Registro</span>
       <div style="display:grid;grid-template-columns:52px minmax(0,1fr);gap:9px 12px;font-size:14px;align-items:baseline">${log || '<span class="dim">—</span>'}</div>
     </div>
     <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">
       ${stat('Saltos sesión', nf(s.session.jumps))}${stat('Distancia', `${nf(s.session.distance, 0)} al`)}${stat('Entregado obra', `${nf(s.session.deliveredToConstruction)} t`)}
     </div>
   </aside>
  </div>`;
}

function idCell(label, value, sub, last) {
  return `<div style="display:flex;flex-direction:column;padding:0 18px;min-width:0;${last ? '' : 'border-right:1px solid var(--inline)'}"><span class="eb">${esc(label)}</span><span class="va nowrap" style="font-size:19px">${esc(value)}</span><span class="eb nowrap" style="font-size:10px;color:var(--dim)">${esc(sub)}</span></div>`;
}
function meter(label, value, ratio, cls) {
  return `<div style="display:flex;flex-direction:column;gap:6px"><div style="display:flex;justify-content:space-between"><span class="eb">${esc(label)}</span><span class="num" style="font-size:17px">${esc(value)}</span></div>${seg(ratio, cls)}</div>`;
}
function stat(label, value, cls = '') {
  return `<div class="in stat"><span class="eb" style="font-size:10px">${esc(label)}</span><span class="num ${cls}" style="font-size:18px">${esc(value)}</span></div>`;
}
function nowText(s, v) {
  const st = clean(s.location.station);
  switch (v.mode.key) {
    case 'docked': return `En ${st || 'una estación'} · ${clean(s.location.system) || ''}`;
    case 'supercruise': return s.destination.name ? `Hacia ${clean(s.destination.name)}` : `En ${clean(s.location.system) || ''}`;
    case 'approach': return `Atraque concedido en ${clean(s.docking.station)} · plataforma ${s.docking.pad}`;
    case 'jump': return `Saltando a ${s.fsdTarget.name || '…'}`;
    case 'landed': return `En ${clean(s.location.body) || 'superficie'}`;
    default: return clean(s.location.body) || clean(s.location.system) || '';
  }
}

/* ---------- Vuelo ---------- */
const INDICATORS = [
  ['Atracado', 'isDocked'], ['Aterrizado', 'isLanded'], ['Escudos', 'areShieldsUp'], ['Supercrucero', 'isSupercruise'], ['En ala', 'isInWing'], ['Modo silenc.', 'isSilentRunning'],
  ['Recog. comb.', 'isScoopingFuel'], ['Bloq. masa', 'isFSDMassLocked'], ['Carga FSD', 'isFSDCharging'], ['Enfriam. FSD', 'isFSDCooldown'], ['Comb. bajo', 'isLowFuel', 1], ['Sobrecalent.', 'isOverHeating', 1],
  ['En peligro', 'isInDanger', 1], ['Interdictado', 'isBeingInterdicted', 1], ['Saltando FSD', 'isFSDJump'], ['SRV luces lar.', 'isSRVHighBeam'], ['Alt. radio medio', 'isAltitudeFromAverageRadius'],
];
const TOGGLES = [['Tren aterr.', 'isLandingGearDown', 'Ctrl+7'], ['FA off', 'isFlightAssistOff', 'Ctrl+Z'], ['Armamento', 'areHardpointsDeployed', 'Ctrl+U'], ['Luces', 'areLightsOn', 'Ctrl+L'], ['Recolector', 'isCargoScoopDeployed', 'Ctrl+C'], ['Visión noct.', 'isNightVision', 'Ctrl+N']];
const ACTIONS = [['Disipador de calor', 'Ctrl+H'], ['Modo silencioso', 'Ctrl+S'], ['Expulsar carga', 'Ctrl+J'], ['Siguiente sistema', 'RCtrl+N'], ['Solicitar atraque', 'macro']];

function screenVuelo(s, v) {
  const fl = s.status.flags || {};
  const f = v.fuel;
  const docking = s.docking.active;
  const showDiagram = docking && (DIAGRAM_TYPES.has(s.docking.stationType) || /dodec/i.test(s.docking.stationType || ''));
  const inds = INDICATORS.map(([l, k, w]) => `<span class="chip ${fl[k] ? (w ? 'warnon' : 'on') : ''}"><span class="dot ${fl[k] ? (w ? 'warn' : 'on') : ''}"></span>${l}</span>`).join('');
  const toggles = TOGGLES.map(([l, k, key]) => `<button type="button" class="ctl ${fl[k] ? 'on' : ''}" disabled title="Las acciones llegan en la entrega 2"><span style="display:flex;align-items:center;gap:8px"><span class="dot ${fl[k] ? 'on' : ''}"></span>${l}</span><span class="k">${key}</span></button>`).join('');
  const actions = ACTIONS.map(([l, key]) => `<button type="button" class="act" disabled title="Las acciones llegan en la entrega 2">${l}<span class="k">${key}</span></button>`).join('');
  const nearBody = fl.hasLatLong;
  const approach = nearBody
    ? `<div class="in" style="padding:12px;display:flex;justify-content:space-between;align-items:center"><span class="eb">Cuerpo</span><span class="va nowrap" style="font-size:18px">${esc(clean(s.status.bodyName) || clean(s.location.body) || '—')}</span></div>
       <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">
         ${stat('Altitud', s.status.altitude != null ? `${nf(s.status.altitude)} m` : '—')}${stat('Gravedad', s.status.gravity != null ? `${nf(s.status.gravity, 2)} g` : '—')}
         ${stat('Rumbo', s.status.heading != null ? `${s.status.heading}°` : '—')}${stat('Lat · Long', `${nf(s.status.latitude, 2)} · ${nf(s.status.longitude, 2)}`)}
       </div>`
    : `<div class="in empty" style="flex-direction:column;gap:6px"><span class="va" style="font-size:20px;color:var(--dim)">No disponible ahora</span><span class="soft" style="font-size:14px">Aparece al acercarte a un planeta (altitud, rumbo y coordenadas de Status.json).</span></div>`;

  const dial = showDiagram ? (() => {
    const pad = Number(s.docking.pad) || 0;
    const hot = pad ? (pad - 1) % 12 : -1;
    const marks = Array.from({ length: 12 }, (_, i) => { const a = (i * 30 - 90) * Math.PI / 180; const x = 100 + 78 * Math.cos(a) - 7; const y = 100 + 78 * Math.sin(a) - 7;
      return `<span style="position:absolute;left:${x.toFixed(0)}px;top:${y.toFixed(0)}px;width:14px;height:14px;border-radius:2px;background:${i === hot ? 'var(--amber)' : 'var(--off)'};border:1px solid ${i === hot ? 'var(--amber)' : 'var(--line2)'}"></span>`; }).join('');
    return `<section class="pn card" style="align-items:center;grid-column:2;grid-row:1 / span 2">
      <span class="ti" style="font-size:16px;align-self:flex-start">Atraque</span>
      <span class="eb" style="align-self:flex-start">Concedido · ${esc(STATION_TYPES[s.docking.stationType] || s.docking.stationType)}</span>
      <div style="position:relative;width:200px;height:200px;border-radius:100px;border:1px solid var(--line2);background:radial-gradient(circle,#0e2036 0%,#06101c 70%)">
        <span style="position:absolute;left:84px;top:-6px;width:32px;height:12px;background:var(--cyan);border-radius:2px"></span>${marks}
        <span class="eb" style="position:absolute;left:0;right:0;top:78px;text-align:center">Plataforma</span>
        <span class="num amber" style="position:absolute;left:0;right:0;top:94px;text-align:center;font-size:34px">${String(pad).padStart(2, '0')}</span>
      </div>
      <span class="soft" style="font-size:14px;text-align:center">${esc(clean(s.docking.station))}</span>
      <span class="note" style="text-align:center">Ranura arriba (cian) · posición aproximada, por verificar</span>
    </section>`;
  })() : '';

  const L = s.location; const c = v.colonisation;
  const sysCard = `
    <div class="in accent" style="padding:14px;display:flex;flex-direction:column;gap:10px;min-height:0">
      <span class="eb">Sistema actual</span>
      <span class="ti nowrap" style="font-size:22px">${esc(clean(L.system) || '—')}</span>
      <span class="eb" style="font-size:10px;color:var(--dim)">Journal · ${hhmm(s.connection.lastEventAt)} UTC</span>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px">
        ${stat('Estrella', L.starClass ? `${L.starClass}` : '—', v.scoopableHere === false ? 'amber' : 'cyan')}
        ${stat('Combustible', v.scoopableHere == null ? '—' : v.scoopableHere ? 'Recogible' : 'No recogible', v.scoopableHere === false ? 'amber' : 'cyan')}
      </div>
      <div class="kv" style="font-size:14px">
        <span class="eb" style="font-size:10px">Alianza</span><span>${tr(L.allegiance)}</span>
        <span class="eb" style="font-size:10px">Gobierno</span><span>${esc(or(L.government))}</span>
        <span class="eb" style="font-size:10px">Economía</span><span>${esc(or(L.economy))}${L.secondEconomy ? ' / ' + esc(L.secondEconomy) : ''}</span>
        <span class="eb" style="font-size:10px">Seguridad</span><span>${esc(or(L.security))}</span>
        <span class="eb" style="font-size:10px">Población</span><span class="num">${nf(L.population)}</span>
        <span class="eb" style="font-size:10px">Facción</span><span>${esc(or(L.faction))} · ${tr(L.factionState)}</span>
        <span class="eb" style="font-size:10px">Powerplay</span><span class="amber">${tr(L.powerplayState)}${L.controllingPower ? ' · ' + esc(L.controllingPower) : ''}</span>
      </div>
    </div>`;
  const colCard = c ? `
    <div class="in" style="padding:14px;display:flex;flex-direction:column;gap:8px;min-height:0;overflow:hidden">
      <span class="eb nowrap">Colonización · ${esc(siteName(c.name) || 'obra')}</span>
      <span style="display:flex;justify-content:space-between;align-items:baseline"><span class="ti" style="font-size:20px">Faltan ${nf(c.remaining)} t</span><span class="num cyan" style="font-size:22px">${pct(c.progress)}</span></span>
      <span class="bar"><span style="width:${(c.progress || 0) * 100}%;background:#2a7fa3"></span></span>
      ${c.resources.filter((x) => x.required > x.provided).sort((a, b) => (b.required - b.provided) - (a.required - a.provided)).slice(0, 6)
        .map((x) => `<span style="display:flex;justify-content:space-between;font-size:14px"><span class="nowrap">${esc(x.name)}</span><span class="num soft">${nf(x.required - x.provided)} t</span></span>`).join('')}
    </div>` : '';
  const futureCard = `
    <div class="in" style="padding:14px;display:flex;flex-direction:column;gap:8px;flex:1;min-height:0">
      <span class="eb">Buscar sistema · Trazar ruta</span>
      <div class="empty" style="flex-direction:column;gap:8px"><span class="va" style="font-size:18px;color:var(--soft)">Llega en la entrega 3</span><span style="font-size:14px">Buscador con Spansh, ficha y estaciones de cualquier sistema, y Trazar ruta en el mapa galáctico.</span></div>
    </div>`;

  return `
  <div style="display:grid;grid-template-columns:minmax(0,1fr) ${showDiagram ? '440px' : '780px'};gap:12px;min-height:0">
   <main style="display:grid;grid-template-columns:${showDiagram ? 'minmax(0,1fr) 290px' : 'minmax(0,1fr)'};grid-template-rows:auto auto minmax(0,1fr);gap:12px;min-width:0;min-height:0">
    <section class="pn hero" style="grid-column:1;grid-row:1;grid-template-columns:minmax(0,1fr) 320px">
      <div style="display:flex;flex-direction:column;gap:8px;min-width:0"><span class="eb" style="display:flex;align-items:center;gap:8px"><span class="dot on"></span>Modo de vuelo</span><span class="ti title">${esc(v.mode.label)}</span></div>
      <div class="in accent kv" style="padding:12px 14px">
        <span class="eb" style="font-size:10px">Nave</span><span class="va" style="font-size:15px">${esc(or(s.ship.name))} · ${esc(shipName(s.ship.type, s.ship.typeLocalised))}</span>
        <span class="eb" style="font-size:10px">Objetivo de salto</span><span class="va" style="font-size:15px">${esc(or(s.fsdTarget.name, 'Sin objetivo'))}</span>
        <span class="eb" style="font-size:10px">Alcance máximo</span><span class="num">${nf(s.ship.maxJumpRange, 2)} al</span>
        <span class="eb" style="font-size:10px">Carga</span><span class="num">${nf(s.cargo.count)} / ${nf(s.ship.cargoCapacity)} t</span>
      </div>
    </section>
    ${dial}
    <section class="pn card" style="grid-column:1;grid-row:2">
      <div style="display:flex;justify-content:space-between"><span class="ti" style="font-size:16px">Estado</span><span class="eb dim">Los 17 indicadores de la página Vuelo</span></div>
      <div style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px">${inds}</div>
      <div style="display:flex;justify-content:space-between"><span class="ti" style="font-size:16px">Interruptores</span><span class="eb dim">Se iluminan según el juego · pulsables en la entrega 2</span></div>
      <div style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px">${toggles}</div>
      <span class="ti" style="font-size:16px">Acciones</span>
      <div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px">${actions}</div>
    </section>
    <section class="pn" style="grid-column:1 / -1;grid-row:3;padding:14px 18px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:20px;min-height:0;overflow:hidden">
      <div style="display:flex;flex-direction:column;gap:10px;min-width:0">
        <span class="ti" style="font-size:16px">Combustible</span>
        <div style="display:flex;justify-content:space-between;align-items:baseline"><span class="eb">Tanque principal</span><span class="num" style="font-size:26px">${nf(f.main, 2)} <span class="soft" style="font-size:16px">/ ${nf(f.cap, 0)} t</span></span></div>
        ${seg(f.ratio, f.ratio != null && f.ratio < 0.25 ? 'warn' : 'on').replace('height: 12px', 'height:16px')}
        <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px">
          ${stat('Reserva', `${nf(f.reservoir, 2)} t`)}${stat('Último salto', f.lastUsed != null ? `${nf(f.lastUsed, 2)} t` : '—')}${stat('Distancia últ.', f.lastDistance != null ? `${nf(f.lastDistance, 2)} al` : '—')}
          ${stat('Saltos con esto', f.jumpsLeft != null ? `≈ ${f.jumpsLeft}` : '—')}${stat('Recogida', f.scooping ? 'Activa' : 'Inactiva', f.scooping ? 'cyan' : 'dim')}${stat('Hasta destino', v.route.legs.length ? `${v.route.jumps} saltos` : 'Sin ruta', v.route.legs.length ? '' : 'dim')}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;min-width:0">
        <div style="display:flex;justify-content:space-between;gap:10px"><span class="ti nowrap" style="font-size:16px">Aproximación a planeta</span><span class="eb dim">Solo cerca de un cuerpo</span></div>
        ${approach}
      </div>
    </section>
   </main>
   <aside class="pn" style="padding:14px;display:grid;grid-template-columns:${showDiagram ? 'minmax(0,1fr)' : 'minmax(0,1fr) minmax(0,1fr)'};gap:12px;min-height:0">
     <div style="display:flex;flex-direction:column;gap:12px;min-height:0;min-width:0">${sysCard}${showDiagram ? '' : colCard}${showDiagram ? colCard : ''}</div>
     ${showDiagram ? '' : `<div style="display:flex;flex-direction:column;gap:12px;min-height:0;min-width:0">${futureCard}</div>`}
   </aside>
  </div>`;
}

/* ---------- ciclo de pintado ---------- */
function render() {
  const snap = ui.snap; if (!snap) return;
  const { state: s, view: v } = snap;
  if (ui.autoJump && v.mode.key !== ui.lastModeKey) {
    if (ui.lastModeKey !== null && BUILT.has(v.mode.section) && v.mode.section !== ui.section) ui.section = v.mode.section;
    ui.lastModeKey = v.mode.key;
  }
  renderHeader(s, v);
  renderRail(v);
  $('screen').innerHTML = ui.section === 'vuelo' ? screenVuelo(s, v) : screenPuente(s, v);
}

function fit() {
  const st = $('stage');
  const k = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  st.style.transform = `scale(${k})`;
  st.style.left = `${Math.round((window.innerWidth - 1920 * k) / 2)}px`;
  st.style.top = `${Math.round((window.innerHeight - 1080 * k) / 2)}px`;
}

$('rail').addEventListener('click', (ev) => {
  const b = ev.target.closest('button[data-sec]');
  if (b && !b.disabled) { ui.section = b.dataset.sec; render(); }
});
document.addEventListener('click', (ev) => { if (ev.target.closest('#autojump')) { ui.autoJump = !ui.autoJump; render(); } });
window.addEventListener('resize', fit);
setInterval(() => { $('hdr-clock').textContent = `${new Date().toISOString().slice(11, 16)} UTC`; }, 1000);

fit();
renderRail(null);
if (window.edbubble) {
  window.edbubble.onUpdate((snap) => { ui.snap = snap; render(); });
  window.edbubble.snapshot().then((snap) => { if (snap && !ui.snap) { ui.snap = snap; render(); } });
}

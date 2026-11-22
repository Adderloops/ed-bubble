'use strict';

/* ED BUBBLE · interfaz (entrega 2: datos en vivo + acciones en el juego) */

const SECTIONS = [
  { id: 'puente', label: 'Puente de mando', home: true, built: true },
  { group: 'Nave' }, { id: 'vuelo', label: 'Vuelo', built: true }, { id: 'combate', label: 'Combate' }, { id: 'equipo', label: 'Equipo' }, { id: 'srv', label: 'SRV' },
  { group: 'Viaje' }, { id: 'navegacion', label: 'Navegación', built: true }, { id: 'exploracion', label: 'Exploración' }, { id: 'estacion', label: 'Estación' }, { id: 'apie', label: 'A pie' },
  { group: 'Actividades' }, { id: 'powerplay', label: 'Powerplay' }, { id: 'comercio', label: 'Comercio' }, { id: 'mineria', label: 'Minería' }, { id: 'colonizacion', label: 'Colonización', built: true },
  { group: 'Comandante' }, { id: 'cmdr', label: 'CMDR' }, { id: 'carrier', label: 'Carrier' }, { id: 'camara', label: 'Cámara' }, { id: 'utilidades', label: 'Utilidades' },
];
const BUILT = new Set(SECTIONS.filter((s) => s.built).map((s) => s.id));

const ui = {
  section: 'puente', autoJump: true, lastModeKey: null, snap: null, controls: null, armed: null, flash: null, feedback: null,
  search: { q: '', results: [], loading: false, error: null, seq: 0 }, // buscador de Navegación
  sel: null, // sistema elegido: { name, loading, system, error }
  navTab: 'route', sysTab: 'stations', sysPage: 0,
  colDepot: null, colPage: 0, // Colonización: obra elegida y página de materiales
  colAside: 'buy', colSel: null, // pestaña de la derecha y material elegido
  mk: { key: null, loading: false, list: [], error: null, page: 0, pick: null }, // dónde comprar
  mkFilter: { large: null, surface: true, carriers: false },
  plot: null, // { running, target, text, ok, error }
  extOk: null, // última consulta a Spansh: true / false
};

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
  Coriolis: 'Coriolis', Orbis: 'Orbis', Bernal: 'Ocellus', Ocellus: 'Ocellus', Dodec: 'Dodec', Outpost: 'Puesto orbital', AsteroidBase: 'Base en asteroide', MegaShip: 'Meganave', FleetCarrier: 'Fleet carrier',
  CraterPort: 'Puerto planetario', CraterOutpost: 'Puesto planetario', OnFootSettlement: 'Asentamiento', SurfaceStation: 'Estación de superficie',
  SpaceConstructionDepot: 'Construcción orbital', PlanetaryConstructionDepot: 'Construcción en superficie',
};
const DIAGRAM_TYPES = new Set(['Coriolis', 'Orbis', 'Bernal', 'Ocellus', 'Dodec']);
const ES = { Independent: 'Independiente', Federation: 'Federación', Empire: 'Imperio', Alliance: 'Alianza', Expansion: 'Expansión', Boom: 'Auge', Bust: 'Recesión', None: 'Ninguno', Election: 'Elecciones', War: 'Guerra', CivilWar: 'Guerra civil', Investment: 'Inversión', Retreat: 'Retirada', Lockdown: 'Confinamiento', Outbreak: 'Brote', Famine: 'Hambruna', CivilUnrest: 'Disturbios', PirateAttack: 'Ataque pirata', Unoccupied: 'Sin ocupar', Exploited: 'Explotado', Fortified: 'Fortificado', Stronghold: 'Bastión', 'Low Security': 'Baja', 'Medium Security': 'Media', 'High Security': 'Alta', Low: 'Baja', Medium: 'Media', High: 'Alta', Anarchy: 'Anarquía', Lawless: 'Sin ley',
  Corporate: 'Corporativo', Communism: 'Comunismo', Democracy: 'Democracia', Dictatorship: 'Dictadura', Feudal: 'Feudal', Patronage: 'Mecenazgo', Theocracy: 'Teocracia', Confederacy: 'Confederación', Cooperative: 'Cooperativa', 'Prison colony': 'Colonia penitenciaria', Prison: 'Prisión',
  'High Tech': 'Alta tecnología', Industrial: 'Industrial', Extraction: 'Extracción', Refinery: 'Refinería', Agriculture: 'Agricultura', Tourism: 'Turismo', Military: 'Militar', Service: 'Servicios', Colony: 'Colonia', Terraforming: 'Terraformación',
  'High metal content world': 'Mundo rico en metales pesados', 'Metal-rich body': 'Cuerpo rico en metales', 'Rocky body': 'Cuerpo rocoso', 'Icy body': 'Cuerpo helado', 'Rocky Ice world': 'Mundo de roca y hielo', 'Rocky ice world': 'Mundo de roca y hielo',
  'Water world': 'Mundo de agua', 'Earth-like world': 'Mundo tipo Tierra', 'Ammonia world': 'Mundo de amoníaco', 'Water giant': 'Gigante de agua', 'Helium-rich gas giant': 'Gigante gaseoso rico en helio', 'Gas giant with water-based life': 'Gigante gaseoso con vida acuática', 'Gas giant with ammonia-based life': 'Gigante gaseoso con vida de amoníaco',
  'Class I gas giant': 'Gigante gaseoso clase I', 'Class II gas giant': 'Gigante gaseoso clase II', 'Class III gas giant': 'Gigante gaseoso clase III', 'Class IV gas giant': 'Gigante gaseoso clase IV', 'Class V gas giant': 'Gigante gaseoso clase V' };
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
    + lamp(ui.extOk === true, 'Datos externos', ui.extOk === true ? 'Spansh responde' : ui.extOk === false ? 'Spansh no responde' : 'Sin consultas a Spansh todavía');
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
     <div style="display:flex;flex-direction:column;gap:12px;min-height:0">
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
      ${controlsPanel()}
     </div>
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

/* ---------- ruta trazada compacta (Vuelo) ---------- */
function routeCard(r, perPage) {
  const head = `<div style="display:flex;justify-content:space-between;align-items:center"><span class="ti" style="font-size:16px">Ruta trazada</span>`;
  if (!r.legs.length) {
    return `<div class="in" style="flex:1;padding:14px;display:flex;flex-direction:column;gap:10px;min-height:0">${head}</div>
      <div class="empty" style="flex-direction:column;gap:6px"><span class="va" style="font-size:18px;color:var(--soft)">Sin ruta</span><span style="font-size:14px">Traza una en el mapa galáctico y aparecerá aquí.</span></div></div>`;
  }
  if (ui.routeKey !== r.destination + r.legs.length) { ui.routeKey = r.destination + r.legs.length; ui.routePage = 0; }
  const pages = Math.ceil(r.legs.length / perPage);
  ui.routePage = Math.min(ui.routePage || 0, pages - 1);
  const noScoop = r.legs.slice(1).filter((l) => l.scoopable === false).length;
  const rows = r.legs.slice(ui.routePage * perPage, (ui.routePage + 1) * perPage).map((l) => {
    const next = l.index === 1;
    const mark = l.here ? 'border-left:3px solid var(--amber);border-color:#8a5a1e' : next ? 'border-left:3px solid var(--cyan);border-color:var(--cyandim)' : '';
    return `<div class="in row" style="grid-template-columns:38px 36px minmax(0,1fr) 78px;height:40px;${mark}">
      <span class="num" style="padding-left:8px;font-size:13px;color:${l.here ? 'var(--amber)' : next ? 'var(--cyan)' : 'var(--eb)'}">${String(l.index).padStart(2, '0')}</span>
      <span class="starc ${l.scoopable === false ? 'no' : l.scoopable == null ? 'unk' : ''}" style="width:24px;height:24px;font-size:11px">${esc(or(l.starClass, '?')).slice(0, 2)}</span>
      <span class="va nowrap" style="font-size:15px">${esc(l.system)}</span>
      <span class="num" style="text-align:right;padding-right:10px;font-size:14px">${l.here ? 'aquí' : `${nf(l.distance, 1)} al`}</span></div>`;
  }).join('');
  const pager = pages > 1 ? `<span style="display:flex;align-items:center;gap:8px"><button type="button" class="pg" data-pager="route" data-d="-1" ${ui.routePage === 0 ? 'disabled' : ''}>‹</button><span class="num soft" style="font-size:13px">${ui.routePage + 1}/${pages}</span><button type="button" class="pg" data-pager="route" data-d="1" ${ui.routePage >= pages - 1 ? 'disabled' : ''}>›</button></span>` : '';
  return `<div class="in" style="flex:1;padding:14px;display:flex;flex-direction:column;gap:8px;min-height:0;overflow:hidden">
    ${head}${pager}</div>
    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px">
      ${stat('Saltos', nf(r.jumps))}${stat('Distancia', `${nf(r.distance, 0)} al`)}${stat('No recogibles', nf(noScoop), noScoop ? 'amber' : 'cyan')}
    </div>
    <span class="eb nowrap" style="font-size:11px">Destino · <span class="va" style="letter-spacing:0;text-transform:none;font-size:14px;color:var(--text,#fff)">${esc(r.destination)}</span></span>
    <div style="display:flex;flex-direction:column;gap:4px;min-height:0">${rows}</div>
  </div>`;
}

/* ---------- revisión de controles (Puente de mando) ---------- */
const CTL_PAGE = 3;
const CTL_ORDER = { unbound: 0, hotas: 1, unsupported: 2, shared: 3 };
const CTL_STATUS = {
  unbound: ['Sin asignar', 'red'],
  hotas: ['Solo en mando', 'yellow'],
  unsupported: ['Tecla no enviable', 'yellow'],
  shared: ['Tecla compartida', 'yellow'],
};

function controlsPanel() {
  const c = ui.controls;
  const head = (right) => `<div style="display:flex;justify-content:space-between;align-items:center"><span class="ti" style="font-size:16px">Controles</span>${right}</div>`;
  if (!c) return `<section class="pn card" style="flex:1;min-height:0">${head('')}<div class="empty">Leyendo tus controles…</div></section>`;
  if (c.error || !c.check) return `<section class="pn card" style="flex:1;min-height:0">${head('')}<div class="empty" style="flex-direction:column;gap:6px"><span class="red">${esc(c.error || 'Sin datos')}</span><span style="font-size:14px">Sin controles no se pueden pulsar los botones.</span></div></section>`;
  const k = c.check;
  const groups = k.groups.map((g) => {
    const full = g.ready === g.total;
    return `<div class="in" style="padding:8px 12px;display:flex;justify-content:space-between;align-items:center">
      <span class="va nowrap" style="font-size:15px">${esc(g.name)}${g.soon ? ' <span class="eb dim" style="font-size:10px">entrega 3</span>' : ''}</span>
      <span class="num ${full ? 'cyan' : 'yellow'}" style="font-size:16px">${full ? '✓ ' : ''}${g.ready} / ${g.total}</span></div>`;
  }).join('');
  let body;
  if (!k.problems.length) {
    body = `<div class="empty" style="flex-direction:column;gap:6px"><span class="va cyan" style="font-size:18px">Todo listo</span><span style="font-size:14px">Todas las acciones que usa ED BUBBLE tienen tecla de teclado.</span></div>`;
  } else {
    const pages = Math.ceil(k.problems.length / CTL_PAGE);
    ui.ctlPage = Math.min(ui.ctlPage || 0, pages - 1);
    const sorted = k.problems.slice().sort((a, b) => CTL_ORDER[a.status] - CTL_ORDER[b.status]);
    const rows = sorted.slice(ui.ctlPage * CTL_PAGE, ui.ctlPage * CTL_PAGE + CTL_PAGE).map((p) => {
      const [txt, cls] = CTL_STATUS[p.status] || [p.status, 'yellow'];
      const sub = p.status === 'shared' ? `${esc(p.key)} · también ${esc(p.with.join(', '))}` : p.status === 'unsupported' ? esc(p.key) : esc(p.groups.join(' · '));
      return `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--inline)">
        <span style="display:flex;flex-direction:column;min-width:0"><span class="nowrap" style="font-size:15px">${esc(p.label)}</span><span class="eb dim nowrap" style="font-size:10px;letter-spacing:.08em">${sub}</span></span>
        <span class="eb ${cls}" style="font-size:11px">${txt}</span></div>`;
    }).join('');
    const pager = pages > 1 ? `<span style="display:flex;align-items:center;gap:8px"><button type="button" class="pg" data-ctlpage="-1" ${ui.ctlPage === 0 ? 'disabled' : ''}>‹</button><span class="num soft" style="font-size:13px">${ui.ctlPage + 1}/${pages}</span><button type="button" class="pg" data-ctlpage="1" ${ui.ctlPage >= pages - 1 ? 'disabled' : ''}>›</button></span>` : '';
    body = `<div style="display:flex;justify-content:space-between;align-items:center"><span class="eb yellow">${k.problems.length} por revisar</span>${pager}</div><div style="display:flex;flex-direction:column;min-height:0">${rows}</div>`;
  }
  return `<section class="pn card" style="flex:1;min-height:0;overflow:hidden">
    ${head(`<span class="eb dim">Preset ${esc(c.preset)}</span>`)}
    <div style="display:flex;flex-direction:column;gap:6px">${groups}</div>
    ${body}
    <span class="note nowrap" style="margin-top:auto">Corrígelas en Opciones › Controles; se releen solas.</span>
  </section>`;
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
const TOGGLES = [['Tren aterr.', 'isLandingGearDown', 'gear'], ['FA off', 'isFlightAssistOff', 'fa'], ['Armamento', 'areHardpointsDeployed', 'hardpoints'], ['Luces', 'areLightsOn', 'lights'], ['Recolector', 'isCargoScoopDeployed', 'scoop'], ['Visión noct.', 'isNightVision', 'nightvision']];
const ACTIONS = [['Disipador de calor', 'heatsink'], ['Modo silencioso', 'silent'], ['Expulsar carga', 'eject'], ['Siguiente sistema', 'nextsys'], ['Solicitar atraque', 'dock']];

const ERRORS = {
  'game-not-running': 'El juego no está abierto',
  'focus-failed': 'No he podido traer el juego al frente',
  'focus-lost': 'El juego perdió el foco: acción detenida',
  'no-binds': 'No he podido leer tus controles',
  'no-key': 'Esa acción no tiene tecla de teclado en tu preset',
  timeout: 'El ayudante de teclas no responde',
  'helper-exited': 'El ayudante de teclas se ha cerrado; reintenta',
};

/** Atributos de un botón de acción según los controles cargados. */
function actAttrs(id) {
  const a = ui.controls && ui.controls.actions && ui.controls.actions[id];
  if (!a) return { dis: 'disabled', key: '…', title: 'Cargando controles' };
  if (!a.available) return { dis: 'disabled', key: 'sin tecla', title: `Asigna una tecla de teclado en el juego a: ${a.missing.join(', ')}` };
  const armed = ui.armed && ui.armed.id === id;
  return { dis: '', key: armed ? 'pulsa otra vez' : '', title: a.macro ? `${a.label} (macro de varias teclas)` : `${a.label} · ${a.key}`, cls: `${armed ? ' armed' : ''}${ui.flash && ui.flash.id === id ? (ui.flash.ok ? ' sent' : ' failed') : ''}` };
}

function feedbackLine() {
  const c = ui.controls;
  if (ui.feedback) return `<span class="eb ${ui.feedback.ok ? 'cyan' : 'red'}">${esc(ui.feedback.text)}</span>`;
  if (!c) return '<span class="eb dim">Cargando controles…</span>';
  if (c.error) return `<span class="eb red">${esc(c.error)}</span>`;
  return `<span class="eb dim">Preset ${esc(c.preset)}${c.simulate ? ' · SIMULACIÓN' : ''} · clic para pulsar en el juego</span>`;
}

async function runAction(id) {
  const a = ui.controls && ui.controls.actions[id];
  if (!a || !a.available || !window.edbubble) return;
  if (a.confirm && !(ui.armed && ui.armed.id === id)) {
    ui.armed = { id, until: Date.now() + 3000 };
    setTimeout(() => { if (ui.armed && ui.armed.id === id && Date.now() >= ui.armed.until) { ui.armed = null; render(); } }, 3050);
    render(); return;
  }
  ui.armed = null;
  const res = await window.edbubble.run(id);
  const at = Date.now();
  ui.flash = { id, ok: res.ok, at };
  ui.feedback = { ok: res.ok, at, text: res.ok ? `${a.label}: enviado${res.simulated ? ' (simulación)' : ''}` : `${a.label}: ${ERRORS[res.error] || res.error}` };
  setTimeout(() => { if (ui.flash && ui.flash.at === at) { ui.flash = null; render(); } }, 700);
  setTimeout(() => { if (ui.feedback && ui.feedback.at === at) { ui.feedback = null; render(); } }, 4000);
  render();
}

function screenVuelo(s, v) {
  const fl = s.status.flags || {};
  const f = v.fuel;
  const docking = s.docking.active;
  const showDiagram = docking && (DIAGRAM_TYPES.has(s.docking.stationType) || /dodec/i.test(s.docking.stationType || ''));
  const inds = INDICATORS.map(([l, k, w]) => `<span class="chip ${fl[k] ? (w ? 'warnon' : 'on') : ''}"><span class="dot ${fl[k] ? (w ? 'warn' : 'on') : ''}"></span>${l}</span>`).join('');
  const toggles = TOGGLES.map(([l, k, id]) => { const a = actAttrs(id); return `<button type="button" class="ctl ${fl[k] ? 'on' : ''}${a.cls || ''}" data-act="${id}" ${a.dis} title="${esc(a.title)}"><span style="display:flex;align-items:center;gap:8px"><span class="dot ${fl[k] ? 'on' : ''}"></span>${l}</span>${a.key ? `<span class="k">${esc(a.key)}</span>` : ''}</button>`; }).join('');
  const actions = ACTIONS.map(([l, id]) => { const a = actAttrs(id); return `<button type="button" class="act${a.cls || ''}" data-act="${id}" ${a.dis} title="${esc(a.title)}">${l}${a.key ? `<span class="k">${esc(a.key)}</span>` : ''}</button>`; }).join('');
  const nearBody = fl.hasLatLong;
  const approach = nearBody
    ? `<div class="in" style="padding:12px;display:flex;justify-content:space-between;align-items:center"><span class="eb">Cuerpo</span><span class="va nowrap" style="font-size:18px">${esc(clean(s.status.bodyName) || clean(s.location.body) || '—')}</span></div>
       <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">
         ${stat('Altitud', s.status.altitude != null ? `${nf(s.status.altitude)} m` : '—')}${stat('Gravedad', s.status.gravity != null ? `${nf(s.status.gravity, 2)} g` : '—')}
         ${stat('Rumbo', s.status.heading != null ? `${s.status.heading}°` : '—')}${stat('Lat · Long', `${nf(s.status.latitude, 2)} · ${nf(s.status.longitude, 2)}`)}
       </div>`
    : `<div class="in empty" style="flex-direction:column;gap:6px"><span class="va" style="font-size:20px;color:var(--dim)">No disponible ahora</span><span class="soft" style="font-size:14px">Aparece al acercarte a un planeta (altitud, rumbo y coordenadas de Status.json).</span></div>`;

  const dock = s.docking;
  const dockCard = docking ? `
    <section class="pn card" style="flex:1;min-height:0;align-items:center">
      <div style="display:flex;justify-content:space-between;width:100%"><span class="ti" style="font-size:16px">Atraque concedido</span><span class="eb">${esc(STATION_TYPES[dock.stationType] || dock.stationType || '—')}</span></div>
      <span class="va" style="font-size:20px;align-self:flex-start">${esc(siteName(dock.station) || '—')}</span>
      ${showDiagram ? `${dockingSvg(dock.pad, 430, v.dockPadHour)}
        <div style="display:flex;justify-content:space-between;width:430px"><span class="eb" style="color:#ff6b6b">● Luz roja</span><span class="eb dim">Vista al entrar</span><span class="eb" style="color:#3be37a">Luz verde ●</span></div>`
      : `<div class="empty" style="flex-direction:column;gap:10px"><span class="eb">Plataforma</span><span class="num amber" style="font-size:120px;line-height:1">${String(Number(dock.pad) || 0).padStart(2, '0')}</span><span style="font-size:14px">Sin esquema para este tipo de estación.</span></div>`}
    </section>` : '';
  const approachCard = `
    <section class="pn card" style="flex:1;min-height:0">
      <div style="display:flex;justify-content:space-between;gap:10px"><span class="ti nowrap" style="font-size:16px">Aproximación a planeta</span><span class="eb dim">Solo cerca de un cuerpo</span></div>
      ${approach}
    </section>`;

  const r = v.route;
  const nextLeg = r.legs.length ? (r.legs[0].here ? r.legs[1] : r.legs[0]) : null;
  const tgtName = nextLeg ? nextLeg.system : s.fsdTarget.name;
  const tgtClass = nextLeg ? nextLeg.starClass : s.fsdTarget.starClass;
  const tgtScoop = tgtClass ? (nextLeg ? nextLeg.scoopable : null) : null;
  const scoopTxt = (c) => { const sc = c == null ? null : /^[KGBFOAM](_|$)/.test(c); return sc == null ? ['Desconocida', 'dim'] : sc ? ['Recogible', 'cyan'] : ['No recogible', 'amber']; };
  const [stxt, scls] = scoopTxt(tgtClass);
  const nextCard = `
    <section class="pn card">
      <div style="display:flex;justify-content:space-between"><span class="ti" style="font-size:16px">Próximo salto</span><span class="eb dim">Ruta completa en Navegación</span></div>
      ${tgtName ? `
      <div style="display:flex;align-items:center;gap:14px">
        <span class="starc ${scls === 'amber' ? 'no' : scls === 'dim' ? 'unk' : ''}" style="width:44px;height:44px;border-radius:22px;font-size:15px">${esc(or(tgtClass, '?')).slice(0, 3)}</span>
        <span style="display:flex;flex-direction:column;min-width:0"><span class="ti nowrap" style="font-size:24px">${esc(tgtName)}</span><span class="eb ${scls}">Combustible ${stxt.toLowerCase()}</span></span>
      </div>
      ${r.legs.length ? `<div style="display:flex;flex-direction:column;gap:2px"><span class="eb amber" style="font-size:11px">${esc(routeProgressText(r))}</span>${routeGraph(r, 516, false)}</div>` : ''}
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">
        ${stat('Distancia', nextLeg && nextLeg.distance != null ? `${nf(nextLeg.distance, 2)} al` : '—')}${stat('Saltos restantes', r.legs.length ? nf(r.jumps) : or(s.fsdTarget.remainingJumps))}${stat('Destino', r.destination ? esc(r.destination) : esc(tgtName))}
      </div>` : `<div class="empty" style="flex-direction:column;gap:6px;padding:18px"><span class="va" style="font-size:18px;color:var(--soft)">Sin objetivo de salto</span><span style="font-size:14px">Fija un sistema o traza una ruta en el mapa galáctico.</span></div>`}
    </section>`;

  return `
  <div style="display:grid;grid-template-columns:minmax(0,1fr) 560px;gap:12px;min-height:0">
   <main style="display:flex;flex-direction:column;gap:12px;min-width:0;min-height:0">
    <section class="pn hero" style="grid-template-columns:minmax(0,1fr) 340px">
      <div style="display:flex;flex-direction:column;gap:8px;min-width:0"><span class="eb" style="display:flex;align-items:center;gap:8px"><span class="dot on"></span>Modo de vuelo</span><span class="ti title">${esc(v.mode.label)}</span></div>
      <div class="in accent kv" style="padding:12px 14px">
        <span class="eb" style="font-size:10px">Nave</span><span class="va nowrap" style="font-size:15px">${esc(or(s.ship.name))} · ${esc(shipName(s.ship.type, s.ship.typeLocalised))}</span>
        <span class="eb" style="font-size:10px">Alcance máximo</span><span class="num">${nf(s.ship.maxJumpRange, 2)} al</span>
        <span class="eb" style="font-size:10px">Carga</span><span class="num">${nf(s.cargo.count)} / ${nf(s.ship.cargoCapacity)} t</span>
        <span class="eb" style="font-size:10px">Sistema</span><span class="va nowrap" style="font-size:15px">${esc(clean(s.location.system) || '—')}</span>
      </div>
    </section>
    <section class="pn card vuelo-estado" style="flex:1;min-height:0;justify-content:space-between">
      <div style="display:flex;flex-direction:column;gap:10px">
        <div style="display:flex;justify-content:space-between"><span class="ti" style="font-size:16px">Estado</span><span class="eb dim">Los 17 indicadores de la página Vuelo</span></div>
        <div style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px">${inds}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <div style="display:flex;justify-content:space-between"><span class="ti" style="font-size:16px">Interruptores</span>${feedbackLine()}</div>
        <div style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px">${toggles}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <span class="ti" style="font-size:16px">Acciones</span>
        <div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px">${actions}</div>
      </div>
    </section>
    <section class="pn card">
      <div style="display:flex;justify-content:space-between;align-items:baseline"><span class="ti" style="font-size:16px">Combustible</span><span class="num" style="font-size:30px">${nf(f.main, 2)} <span class="soft" style="font-size:18px">/ ${nf(f.cap, 0)} t</span></span></div>
      ${seg(f.ratio, f.ratio != null && f.ratio < 0.25 ? 'warn' : 'on').replace('height: 12px', 'height:18px')}
      <div style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px">
        ${stat('Reserva', `${nf(f.reservoir, 2)} t`)}${stat('Último salto', f.lastUsed != null ? `${nf(f.lastUsed, 2)} t` : '—')}${stat('Distancia últ.', f.lastDistance != null ? `${nf(f.lastDistance, 2)} al` : '—')}
        ${stat('Saltos con esto', f.jumpsLeft != null ? `≈ ${f.jumpsLeft}` : '—')}${stat('Recogida', f.scooping ? 'Activa' : 'Inactiva', f.scooping ? 'cyan' : 'dim')}${stat('Hasta destino', r.legs.length ? `${r.jumps} saltos` : 'Sin ruta', r.legs.length ? '' : 'dim')}
      </div>
    </section>
   </main>
   <aside style="display:flex;flex-direction:column;gap:12px;min-height:0;min-width:0">
     ${nextCard}
     ${docking ? dockCard : approachCard}
   </aside>
  </div>`;
}

/* ---------- gráfico de saltos de la ruta (SVG) ---------- */
function routeGraph(r, width, big = true) {
  const legs = r.fullLegs || [];
  if (legs.length < 2) return '';
  const H = big ? 74 : 52; const y = big ? 30 : 22; const pad = 14;
  const span = width - pad * 2;
  let acc = 0; const xs = legs.map((l, i) => { if (i) acc += l.distance || 0; return acc; });
  const total = acc || 1;
  const X = (i) => pad + (r.fullDistance ? xs[i] / total : i / (legs.length - 1)) * span;
  const cur = legs.findIndex((l) => l.current);
  const ci = cur < 0 ? 0 : cur;
  const dense = legs.length > 45;
  const col = (l) => (l.scoopable === false ? '#f0a443' : l.scoopable ? '#49c7e8' : '#5d7590');
  const nodes = legs.map((l, i) => {
    const x = X(i).toFixed(1);
    if (i === 0 || i === legs.length - 1 || i === ci || i === ci + 1) return '';
    if (l.done) return dense ? '' : `<circle cx="${x}" cy="${y}" r="2.5" fill="#4d6a52"/>`;
    return dense ? `<line x1="${x}" y1="${y - 5}" x2="${x}" y2="${y + 5}" stroke="${col(l)}" stroke-width="1.5"/>`
      : `<circle cx="${x}" cy="${y}" r="${big ? 4 : 3}" fill="#06101c" stroke="${col(l)}" stroke-width="1.6"/>`;
  }).join('');
  const xe = X(legs.length - 1); const xc = X(ci); const xn = ci + 1 < legs.length ? X(ci + 1) : null;
  const end = legs[legs.length - 1];
  const fs = big ? 12 : 10;
  const nm = (t, n) => esc(String(t || '').length > n ? `${String(t).slice(0, n - 1)}…` : t || '');
  return `<svg width="${width}" height="${H}" viewBox="0 0 ${width} ${H}" style="display:block;overflow:visible">
    <defs><filter id="rg-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <line x1="${pad}" y1="${y}" x2="${xc.toFixed(1)}" y2="${y}" stroke="#4d6a52" stroke-width="4" stroke-linecap="round"/>
    <line x1="${xc.toFixed(1)}" y1="${y}" x2="${xe.toFixed(1)}" y2="${y}" stroke="#2a7fa3" stroke-width="4" stroke-linecap="round"/>
    ${nodes}
    <circle cx="${pad}" cy="${y}" r="5" fill="#06101c" stroke="#7d9a6a" stroke-width="2"/>
    ${xn != null && ci + 1 < legs.length - 1 ? `<circle cx="${xn.toFixed(1)}" cy="${y}" r="${big ? 8 : 6}" fill="#06101c" stroke="${col(legs[ci + 1])}" stroke-width="2.5" filter="url(#rg-glow)"/><circle cx="${xn.toFixed(1)}" cy="${y}" r="2.5" fill="${col(legs[ci + 1])}"/>` : ''}
    <circle cx="${xe.toFixed(1)}" cy="${y}" r="${big ? 9 : 7}" fill="#06101c" stroke="${col(end)}" stroke-width="2"/><circle cx="${xe.toFixed(1)}" cy="${y}" r="${big ? 4 : 3}" fill="${col(end)}"/>
    <g filter="url(#rg-glow)"><circle cx="${xc.toFixed(1)}" cy="${y}" r="${big ? 7 : 5.5}" fill="#f0a443"/></g>
    <path d="M${(xc - 5).toFixed(1)} ${y - (big ? 15 : 12)}l5 6l5 -6z" fill="#f0a443"/>
    <text x="${pad - 4}" y="${H - 4}" font-family="Share Tech Mono" font-size="${fs}" fill="#7f9bb8">${big ? nm(legs[0].system, 26) : 'origen'}</text>
    <text x="${(xe + 4).toFixed(1)}" y="${H - 4}" text-anchor="end" font-family="Share Tech Mono" font-size="${fs}" fill="#cfe3f5">${big ? nm(end.system, 26) + ' · ' : ''}${nf(r.fullDistance, 1)} al</text>
  </svg>`;
}

/** Línea de texto del progreso: "Salto 2 de 19 · quedan 560 al". */
function routeProgressText(r) {
  const next = Math.min(r.totalJumps, r.doneJumps + 1);
  const left = Math.max(0, r.fullDistance - r.doneDistance);
  return r.doneJumps >= r.totalJumps ? 'Destino alcanzado' : `Salto ${next} de ${r.totalJumps} · quedan ${nf(left, 1)} al`;
}

/* ---------- Navegación: dónde estoy y adónde voy ---------- */
const NAV_PAGE = 13;

function screenNavegacion(s, v) {
  const L = s.location; const r = v.route;
  const sys = clean(L.system);
  const [scTxt, scCls] = v.scoopableHere == null ? ['—', 'dim'] : v.scoopableHere ? ['Recogible', 'cyan'] : ['No recogible', 'amber'];
  const where = L.docked ? `Atracado en ${siteName(L.station)}` : L.landed ? `Aterrizado en ${clean(L.body)}` : clean(L.body) ? `Cerca de ${clean(L.body)}` : 'En el espacio';
  const nb = ui.navFeedback && Date.now() - ui.navFeedback.at < 3000 ? ui.navFeedback.text : '';
  const linkBtn = (site, label) => `<button type="button" class="nav-btn" data-link="${site}" ${sys ? '' : 'disabled'}>${label}</button>`;
  const sysCard = `
    <section class="pn card" style="border-left:3px solid var(--amber)">
      <div style="display:flex;justify-content:space-between;align-items:baseline"><span class="eb">Sistema actual</span><span class="eb dim">Journal · ${hhmm(s.connection.lastEventAt)} UTC</span></div>
      <span class="ti nowrap" style="font-size:30px">${esc(sys || '—')}</span>
      <span class="soft nowrap" style="font-size:15px">${esc(where)}</span>
      <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px">
        ${stat('Estrella', esc(or(L.starClass)))}${stat('Combustible', scTxt, scCls)}${stat('Población', nf(L.population))}${stat('Seguridad', esc(tr(L.security)))}
      </div>
      <div class="kv" style="font-size:15px">
        <span class="eb" style="font-size:10px">Alianza</span><span>${tr(L.allegiance)}</span>
        <span class="eb" style="font-size:10px">Gobierno</span><span>${esc(tr(L.government))}</span>
        <span class="eb" style="font-size:10px">Economía</span><span>${esc(tr(L.economy))}${L.secondEconomy ? ' / ' + esc(tr(L.secondEconomy)) : ''}</span>
        <span class="eb" style="font-size:10px">Facción</span><span class="nowrap">${esc(or(L.faction))} · ${tr(L.factionState)}</span>
        <span class="eb" style="font-size:10px">Powerplay</span><span class="amber">${tr(L.powerplayState)}${L.controllingPower ? ' · ' + esc(L.controllingPower) : ''}</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px">
        <button type="button" class="nav-btn" data-copy="1" ${sys ? '' : 'disabled'}>Copiar nombre</button>${linkBtn('inara', 'Inara')}${linkBtn('spansh', 'Spansh')}${linkBtn('edsm', 'EDSM')}
      </div>
      <span class="eb cyan" style="min-height:14px">${esc(nb)}</span>
    </section>`;
  const t = s.fsdTarget;
  const tScoop = t.starClass ? /^[KGBFOAM](_|$)/.test(t.starClass) : null;
  const targetCard = `
    <section class="pn card">
      <span class="ti" style="font-size:16px">Objetivo de salto</span>
      ${t.name ? `<div style="display:flex;align-items:center;gap:14px">
          <span class="starc ${tScoop === false ? 'no' : tScoop == null ? 'unk' : ''}" style="width:40px;height:40px;border-radius:20px;font-size:14px">${esc(or(t.starClass, '?')).slice(0, 3)}</span>
          <span style="display:flex;flex-direction:column;min-width:0"><span class="ti nowrap" style="font-size:22px">${esc(t.name)}</span><span class="eb ${tScoop === false ? 'amber' : tScoop ? 'cyan' : 'dim'}">${tScoop == null ? 'Estrella desconocida' : tScoop ? 'Combustible recogible' : 'Combustible no recogible'}${t.remainingJumps != null ? ` · quedan ${t.remainingJumps} saltos` : ''}</span></span>
        </div>` : '<span class="soft" style="font-size:15px">Sin objetivo. Fíjalo en el mapa galáctico o con "Siguiente sistema".</span>'}
    </section>`;
  const searchCard = searchPanel(s);

  let routeBody;
  if (!r.legs.length) {
    routeBody = '<div class="empty" style="flex-direction:column;gap:6px"><span class="va" style="font-size:20px;color:var(--soft)">Sin ruta trazada</span><span style="font-size:14px">Traza una en el mapa galáctico y aparecerá aquí.</span></div>';
  } else {
    if (ui.navRouteKey !== r.destination + r.legs.length) { ui.navRouteKey = r.destination + r.legs.length; ui.navPage = 0; }
    const pages = Math.ceil(r.legs.length / NAV_PAGE);
    ui.navPage = Math.min(ui.navPage || 0, pages - 1);
    let acc = 0; const cum = r.legs.map((l) => { acc += l.here ? 0 : (l.distance || 0); return acc; });
    const rows = r.legs.slice(ui.navPage * NAV_PAGE, (ui.navPage + 1) * NAV_PAGE).map((l) => {
      const next = l.index === 1 && r.legs[0].here;
      const mark = l.here ? 'border-left:3px solid var(--amber);border-color:#8a5a1e' : next ? 'border-left:3px solid var(--cyan);border-color:var(--cyandim)' : '';
      return `<div class="in row" style="grid-template-columns:52px 44px minmax(0,1fr) 150px 110px 120px;height:44px;${mark}">
        <span class="num" style="padding-left:12px;color:${l.here ? 'var(--amber)' : next ? 'var(--cyan)' : 'var(--eb)'}">${String(l.index).padStart(2, '0')}</span>
        <span class="starc ${l.scoopable === false ? 'no' : l.scoopable == null ? 'unk' : ''}">${esc(or(l.starClass, '?')).slice(0, 3)}</span>
        <span class="va nowrap" style="font-size:17px">${esc(l.system)}${l.here ? ' <span class="eb amber" style="font-size:10px">aquí</span>' : next ? ' <span class="eb cyan" style="font-size:10px">siguiente</span>' : ''}</span>
        <span class="eb" style="color:${l.scoopable === false ? 'var(--amber)' : l.scoopable ? 'var(--cyan)' : 'var(--dim)'}">${l.scoopable === false ? 'No recogible' : l.scoopable ? 'Recogible' : 'Desconocida'}</span>
        <span class="num" style="text-align:right">${l.here ? '—' : `${nf(l.distance, 2)} al`}</span>
        <span class="num soft" style="text-align:right;padding-right:14px">${nf(cum[l.index], 1)} al</span></div>`;
    }).join('');
    const pager = pages > 1 ? `<span style="display:flex;align-items:center;gap:8px"><button type="button" class="pg" data-pager="nav" data-d="-1" ${ui.navPage === 0 ? 'disabled' : ''}>‹</button><span class="num soft" style="font-size:13px">${ui.navPage + 1}/${pages}</span><button type="button" class="pg" data-pager="nav" data-d="1" ${ui.navPage >= pages - 1 ? 'disabled' : ''}>›</button></span>` : '';
    const noScoop = r.legs.filter((l) => !l.here && l.scoopable === false).length;
    routeBody = `
      <div class="in" style="padding:12px 14px 6px;display:flex;flex-direction:column;gap:6px">
        <div style="display:flex;justify-content:space-between;align-items:baseline"><span class="eb amber">${esc(routeProgressText(r))}</span><span class="eb dim">Combustible: <span class="cyan">●</span> recogible · <span class="amber">●</span> no recogible</span></div>
        ${routeGraph(r, 920, true)}
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px">
        ${stat('Saltos', nf(r.jumps))}${stat('Distancia', `${nf(r.distance, 1)} al`)}${stat('No recogibles', nf(noScoop), noScoop ? 'amber' : 'cyan')}${stat('Destino', esc(r.destination))}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span class="eb dim" style="display:grid;grid-template-columns:52px 44px minmax(0,1fr);width:60%"><span style="padding-left:12px">#</span><span>Estr.</span><span>Sistema</span></span>${pager}
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;min-height:0">${rows}</div>
      <span class="note" style="margin-top:auto">Desde NavRoute.json · salto y distancia acumulada · cian = combustible recogible, ámbar = no recogible</span>`;
  }

  return `
  <div style="display:grid;grid-template-columns:600px minmax(0,1fr);gap:12px;min-height:0">
    <div style="display:flex;flex-direction:column;gap:12px;min-height:0;min-width:0">${sysCard}${targetCard}${searchCard}</div>
    <section class="pn card" style="min-height:0;overflow:hidden">
      <div style="display:flex;gap:8px;align-items:center">
        <button type="button" class="tab ${ui.navTab === 'route' ? 'on' : ''}" data-navtab="route">Ruta trazada</button>
        ${ui.sel ? `<button type="button" class="tab ${ui.navTab === 'system' ? 'on' : ''}" data-navtab="system"><span class="nowrap" style="max-width:420px;display:inline-block;overflow:hidden;text-overflow:ellipsis;vertical-align:bottom">${esc(ui.sel.name)}</span></button>` : ''}
        <span style="margin-left:auto">${plotLine()}</span>
      </div>
      ${ui.navTab === 'system' && ui.sel ? systemDetail(s) : routeBody}
    </section>
  </div>`;
}

/* ---------- buscador (Spansh) y ficha de sistema ---------- */
const distTo = (a, b) => (a && b ? Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) : null);
const ls = (d) => (d == null ? '—' : d >= 100000 ? `${nf(d / 1000, 0)} mil ls` : `${nf(d, 0)} ls`);

function searchPanel(s) {
  const q = ui.search;
  const here = s.location.starPos;
  let list;
  if (q.error) list = `<div class="empty"><span class="red">${esc(q.error)}</span></div>`;
  else if (q.q.trim().length < 3) list = '<div class="empty" style="font-size:14px">Escribe al menos 3 letras del nombre del sistema.</div>';
  else if (q.loading && !q.results.length) list = '<div class="empty">Buscando en Spansh…</div>';
  else if (!q.results.length) list = '<div class="empty">Sin resultados.</div>';
  else {
    list = q.results.map((r, i) => {
      const d = distTo(here, r.pos);
      const on = ui.sel && ui.sel.name.toLowerCase() === r.name.toLowerCase();
      return `<button type="button" class="pick ${on ? 'on' : ''}" data-pick="${i}"><span class="nowrap">${esc(r.name)}</span><span class="num soft">${d != null ? `${nf(d, d < 100 ? 2 : 1)} al` : ''}</span></button>`;
    }).join('');
  }
  return `
    <section class="pn card" style="flex:1;min-height:0;overflow:hidden">
      <div style="display:flex;justify-content:space-between;align-items:baseline"><span class="ti" style="font-size:16px">Buscar sistema</span><span class="eb dim">Spansh</span></div>
      <input id="nav-search" class="search" type="text" spellcheck="false" autocomplete="off" placeholder="Nombre del sistema…" value="${esc(q.q)}">
      <div style="display:flex;flex-direction:column;gap:4px;min-height:0;overflow:hidden">${list}</div>
    </section>`;
}

const PLOT_ERRORS = {
  cancelled: 'Cancelado', 'not-confirmed': 'El juego no confirmó la ruta (revisa el mapa)', 'focus-lost': 'El juego perdió el foco: detenido',
  'focus-failed': 'No he podido traer el juego al frente', 'game-not-running': 'El juego no está abierto', 'no-key': 'Faltan teclas (mira Controles en el Puente)',
  'plot-busy': 'Ya se está trazando una ruta', timeout: 'El ayudante de teclas no responde',
};

function plotLine() {
  const p = ui.plot;
  if (!p) return '';
  if (p.running) return `<span style="display:flex;align-items:center;gap:10px"><span class="eb yellow">Trazando · ${esc(p.text || '')}</span><button type="button" class="pg" data-plotcancel="1" style="width:auto;padding:0 10px;font-family:Rajdhani;font-size:12px;font-weight:700;letter-spacing:.08em">CANCELAR</button></span>`;
  if (Date.now() - (p.at || 0) > 8000) return '';
  return p.ok ? `<span class="eb cyan">Ruta trazada a ${esc(p.target)}</span>` : `<span class="eb red">No trazada: ${esc(PLOT_ERRORS[p.error] || p.error)}</span>`;
}

function plotReady() {
  const c = ui.controls && ui.controls.check;
  const g = c && c.groups.find((x) => x.name === 'Trazar ruta');
  return g ? g.ready === g.total : false;
}

function systemDetail(s) {
  const sel = ui.sel;
  if (sel.loading) return '<div class="empty" style="font-size:18px">Consultando Spansh…</div>';
  if (sel.error) return `<div class="empty" style="flex-direction:column;gap:6px"><span class="red">${esc(sel.error)}</span><span style="font-size:14px">Reintenta en unos segundos.</span></div>`;
  const y = sel.system;
  const isHere = s.location.system && sel.name.toLowerCase() === s.location.system.toLowerCase();
  const missing = !plotReady() && ui.controls && ui.controls.check ? ui.controls.check.problems.filter((p) => p.groups.includes('Trazar ruta')).map((p) => p.label) : [];
  const head = (extra) => `${missing.length ? `<div class="in" style="padding:8px 12px;border-color:#5a4524"><span class="eb yellow">Trazar ruta desactivado · falta tecla de teclado para: ${esc(missing.join(', '))} (Opciones › Controles)</span></div>` : ''}
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px">
      <div style="display:flex;flex-direction:column;gap:4px;min-width:0">
        <span class="ti nowrap" style="font-size:28px">${esc(sel.name)}</span>
        ${extra}
      </div>
      <div style="display:flex;gap:8px;flex:none">
        <button type="button" class="nav-btn" style="width:120px" data-copy="1" data-name="${esc(sel.name)}">Copiar</button>
        <button type="button" class="nav-btn" style="width:100px" data-link="inara" data-name="${esc(sel.name)}">Inara</button>
        <button type="button" class="nav-btn" style="width:100px" data-link="spansh" data-name="${esc(sel.name)}" data-address="${esc(y && y.id64)}">Spansh</button>
        <button type="button" class="plot-btn" data-plot="1" ${isHere || (ui.plot && ui.plot.running) || !plotReady() ? 'disabled' : ''} title="${isHere ? 'Ya estás en este sistema' : !plotReady() ? 'Faltan teclas para trazar ruta: mira Controles en el Puente de mando' : 'Abre el mapa galáctico y traza la ruta'}">Trazar ruta</button>
      </div>
    </div>`;
  if (!y) return `${head('<span class="eb yellow">Spansh no conoce este sistema</span>')}<div class="empty" style="font-size:14px">Puedes trazar la ruta igualmente si el nombre es exacto.</div>`;

  const d = y.distance != null ? y.distance : distTo(s.location.starPos, y.pos);
  const scoop = y.starClass ? /^[KGBFOAM](_|$)/.test(y.starClass) : null;
  const pp = y.powers.length ? `${y.powers.map(esc).join(', ')} · ${tr(y.powerState)}` : tr(y.powerState) || '—';
  const conflict = y.conflict.length ? ` · ${y.conflict.map((c) => `${esc(c.power)} ${nf(c.progress * 100, 1)} %`).join(', ')}` : '';
  const upd = y.updatedAt ? `Spansh · actualizado ${String(y.updatedAt).slice(0, 10)}` : 'Spansh';
  const extra = `<span class="eb">${d != null ? `A ${nf(d, d < 100 ? 2 : 1)} al de ti` : 'Distancia desconocida'}${y.needsPermit ? ' · <span class="red">requiere permiso</span>' : ''} · ${esc(upd)}</span>`;

  const stats = `
    <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px">
      ${stat('Estrella', esc(or(y.starClass)), scoop === false ? 'amber' : scoop ? 'cyan' : '')}${stat('Combustible', scoop == null ? '—' : scoop ? 'Recogible' : 'No recogible', scoop === false ? 'amber' : scoop ? 'cyan' : 'dim')}${stat('Población', nf(y.population))}${stat('Seguridad', esc(tr(y.security)))}
      ${stat('Alianza', esc(tr(y.allegiance)))}${stat('Gobierno', esc(tr(y.government)))}${stat('Economía', esc(tr(y.economy)))}${stat('Economía 2.ª', esc(tr(y.secondEconomy)))}
    </div>
    <div class="in" style="padding:10px 14px;display:flex;justify-content:space-between;align-items:center;gap:12px"><span class="eb">Powerplay</span><span class="amber nowrap" style="font-size:16px">${pp}${conflict}</span></div>`;

  const tabs = [['stations', `Estaciones · ${y.stations.length}`], ['factions', `Facciones · ${y.factions.length}`], ['bodies', `Cuerpos · ${y.bodyCount}`]];
  const per = { stations: 7, factions: 9, bodies: 11 }[ui.sysTab];
  const items = ui.sysTab === 'stations' ? y.stations : ui.sysTab === 'factions' ? y.factions : y.bodies;
  const pages = Math.max(1, Math.ceil(items.length / per));
  ui.sysPage = Math.min(ui.sysPage, pages - 1);
  const slice = items.slice(ui.sysPage * per, (ui.sysPage + 1) * per);
  let rows;
  if (!items.length) rows = `<div class="empty">${ui.sysTab === 'stations' ? 'Sin estaciones conocidas.' : ui.sysTab === 'factions' ? 'Sin facciones (sistema sin poblar).' : 'Sin cuerpos registrados.'}</div>`;
  else if (ui.sysTab === 'stations') {
    rows = slice.map((st) => {
      const sv = st.services;
      const chip = (on, t) => (on ? `<span class="svc">${t}</span>` : '');
      return `<div class="in row" style="grid-template-columns:64px minmax(0,1fr) 64px 110px 250px;height:64px">
        <span style="display:flex;justify-content:center">${st.icon ? `<img src="icons/${st.icon}.png" alt="" style="width:48px;height:48px;object-fit:contain">` : '<span class="starc unk">?</span>'}</span>
        <span style="display:flex;flex-direction:column;min-width:0"><span class="va nowrap" style="font-size:17px">${esc(siteName(st.name))}</span><span class="eb nowrap" style="font-size:10px">${esc(st.label)}${st.faction ? ` · ${esc(st.faction)}` : ''}</span></span>
        <span class="pad pad-${st.pad || 'x'}">${st.pad || '?'}</span>
        <span class="num" style="text-align:right">${ls(st.distance)}</span>
        <span style="display:flex;gap:4px;justify-content:flex-end;padding-right:10px;flex-wrap:nowrap">${chip(sv.market, 'Mercado')}${chip(sv.shipyard, 'Astillero')}${chip(sv.outfitting, 'Equipam.')}</span>
      </div>`;
    }).join('');
  } else if (ui.sysTab === 'factions') {
    rows = slice.map((f) => `<div class="in row" style="grid-template-columns:minmax(0,1fr) 220px 150px 200px;height:52px;${f.controlling ? 'border-left:3px solid var(--amber)' : ''}">
        <span style="display:flex;flex-direction:column;min-width:0;padding-left:12px"><span class="va nowrap" style="font-size:16px">${esc(f.name)}</span><span class="eb" style="font-size:10px">${f.controlling ? '<span class="amber">Controla el sistema</span> · ' : ''}${esc(tr(f.allegiance))}</span></span>
        <span style="display:flex;align-items:center;gap:8px"><span class="bar" style="flex:1;height:8px"><span style="width:${(f.influence || 0) * 100}%;background:${f.controlling ? 'var(--amber)' : '#2a7fa3'}"></span></span><span class="num" style="width:62px;text-align:right">${nf((f.influence || 0) * 100, 1)} %</span></span>
        <span class="soft" style="text-align:right">${esc(tr(f.state))}</span>
        <span class="soft nowrap" style="text-align:right;padding-right:12px">${esc(tr(f.government))}</span>
      </div>`).join('');
  } else {
    const short = (n) => (n.toLowerCase().startsWith(y.name.toLowerCase()) ? n.slice(y.name.length).trim() || n : n);
    rows = slice.map((b) => `<div class="in row" style="grid-template-columns:minmax(0,1fr) 300px 130px;height:40px">
        <span class="va nowrap" style="font-size:16px;padding-left:12px">${b.mainStar ? '★ ' : ''}${esc(short(b.name) || b.name)}</span>
        <span class="soft nowrap">${esc(tr(b.subtype || b.type) || '—')}</span>
        <span class="num" style="text-align:right;padding-right:12px">${ls(b.distance)}</span>
      </div>`).join('');
  }
  const pager = pages > 1 ? `<span style="display:flex;align-items:center;gap:8px"><button type="button" class="pg" data-pager="sys" data-d="-1" ${ui.sysPage === 0 ? 'disabled' : ''}>‹</button><span class="num soft" style="font-size:13px">${ui.sysPage + 1}/${pages}</span><button type="button" class="pg" data-pager="sys" data-d="1" ${ui.sysPage >= pages - 1 ? 'disabled' : ''}>›</button></span>` : '';
  return `${head(extra)}${stats}
    <div style="display:flex;gap:8px;align-items:center">${tabs.map(([k, t]) => `<button type="button" class="tab small ${ui.sysTab === k ? 'on' : ''}" data-systab="${k}">${t}</button>`).join('')}<span style="margin-left:auto">${pager}</span></div>
    <div style="display:flex;flex-direction:column;gap:4px;min-height:0">${rows}</div>`;
}

/* ---------- Colonización ---------- */
const COL_PAGE = 14;

function screenColonizacion(s, v) {
  const c = v.col;
  if (!c.depots.length) {
    return `<section class="pn card"><span class="ti" style="font-size:16px">Colonización</span>
      <div class="empty" style="flex-direction:column;gap:8px"><span class="va" style="font-size:22px;color:var(--soft)">Sin obras todavía</span><span style="font-size:15px">Atraca en una obra de construcción (orbital o de superficie) y aquí aparecerán sus materiales, lo que falta y los viajes.</span></div></section>`;
  }
  if (!ui.colDepot || !c.depots.find((d) => d.marketId === ui.colDepot)) ui.colDepot = c.current && c.depots.find((d) => d.marketId === c.current) ? c.current : c.depots[0].marketId;
  const d = c.depots.find((x) => x.marketId === ui.colDepot);
  const typeLabel = STATION_TYPES[d.type] || (d.type ? d.type : 'Obra de construcción');
  const tabs = c.depots.length > 1 ? `<div style="display:flex;gap:8px;flex-wrap:nowrap;overflow:hidden">${c.depots.slice(0, 6).map((x) => `<button type="button" class="tab small ${x.marketId === d.marketId ? 'on' : ''}" data-depot="${esc(x.marketId)}"><span class="nowrap" style="max-width:260px;display:inline-block;overflow:hidden;text-overflow:ellipsis;vertical-align:bottom">${esc(siteName(x.name) || x.marketId)}</span> · ${pct(x.progress, 0)}</button>`).join('')}</div>` : '';
  const shipCap = c.capacity;
  const hero = `
    <section class="pn card" style="gap:10px">
      ${tabs}
      <div style="display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:20px;align-items:end">
        <div style="display:flex;flex-direction:column;gap:4px;min-width:0">
          <span class="eb">${esc(typeLabel)} · ${esc(clean(d.system) || '—')}${d.complete ? ' · <span class="cyan">Completada</span>' : d.failed ? ' · <span class="red">Fallida</span>' : ''}</span>
          <span class="ti nowrap" style="font-size:34px">${esc(siteName(d.name) || '—')}</span>
          <span class="eb dim">Datos del juego · última visita ${d.at ? `${String(d.at).slice(0, 10)} ${hhmm(d.at)} UTC` : '—'}</span>
        </div>
        <div style="text-align:right"><span class="num amber" style="font-size:64px;line-height:1">${nf((d.progress || 0) * 100, 1)}<span style="font-size:30px"> %</span></span></div>
      </div>
      <span class="bar" style="height:14px"><span style="width:${(d.progress || 0) * 100}%;background:var(--amber)"></span></span>
      <div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px">
        ${stat('Faltan', `${nf(d.remaining)} t`, 'amber')}${stat('Entregado', `${nf(d.provided)} t`)}${stat('Total', `${nf(d.required)} t`)}${stat('Materiales completos', `${d.done} / ${d.resources.length}`)}${stat(`Viajes${shipCap ? ` (${nf(shipCap)} t)` : ''}`, d.trips != null ? `≈ ${nf(d.trips)}` : '—', 'cyan')}
      </div>
    </section>`;

  const pages = Math.max(1, Math.ceil(d.resources.length / COL_PAGE));
  ui.colPage = Math.min(ui.colPage || 0, pages - 1);
  const rows = d.resources.slice(ui.colPage * COL_PAGE, (ui.colPage + 1) * COL_PAGE).map((r) => {
    const done = r.remaining === 0;
    const carry = r.aboard > 0 && !done;
    const sel = ui.colSel === r.key;
    return `<div class="in row mat" data-mat="${esc(r.key)}" style="grid-template-columns:minmax(0,1fr) 110px 110px 120px 200px 110px 90px;height:40px;${done ? 'opacity:.45;' : ''}${sel ? 'border-color:var(--amber);box-shadow:0 0 0 1px var(--amber) inset;' : carry ? 'border-left:3px solid var(--cyan);border-color:var(--cyandim)' : ''}">
      <span class="va nowrap" style="font-size:16px;padding-left:12px">${esc(r.name)}${carry ? ' <span class="eb cyan" style="font-size:10px">a bordo</span>' : ''}</span>
      <span class="num soft" style="text-align:right">${nf(r.required)}</span>
      <span class="num soft" style="text-align:right">${nf(r.provided)}</span>
      <span class="num ${done ? 'cyan' : 'amber'}" style="text-align:right">${done ? '✓' : nf(r.remaining)}</span>
      <span style="display:flex;align-items:center;gap:8px;padding-left:16px"><span class="bar" style="flex:1;height:8px"><span style="width:${Math.min(1, r.ratio) * 100}%;background:${done ? 'var(--cyandim)' : 'var(--amber)'}"></span></span><span class="num soft" style="width:52px;text-align:right;font-size:13px">${nf(r.ratio * 100, 0)} %</span></span>
      <span class="num ${carry ? 'cyan' : 'dim'}" style="text-align:right">${r.aboard ? nf(r.aboard) : '—'}</span>
      <span class="num soft" style="text-align:right;padding-right:12px">${done ? '' : r.trips != null ? nf(r.trips) : '—'}</span>
    </div>`;
  }).join('');
  const pager = pages > 1 ? `<span style="display:flex;align-items:center;gap:8px"><button type="button" class="pg" data-pager="col" data-d="-1" ${ui.colPage === 0 ? 'disabled' : ''}>‹</button><span class="num soft" style="font-size:13px">${ui.colPage + 1}/${pages}</span><button type="button" class="pg" data-pager="col" data-d="1" ${ui.colPage >= pages - 1 ? 'disabled' : ''}>›</button></span>` : '';
  const table = `
    <section class="pn card" style="flex:1;min-height:0;overflow:hidden">
      <div style="display:flex;justify-content:space-between;align-items:center"><span class="ti" style="font-size:16px">Materiales</span><span class="eb dim">Pulsa un material para ver dónde comprarlo</span>${pager}</div>
      <div class="eb dim" style="display:grid;grid-template-columns:minmax(0,1fr) 110px 110px 120px 200px 110px 90px;font-size:10px">
        <span style="padding-left:12px">Material</span><span style="text-align:right">Pedido</span><span style="text-align:right">Entregado</span><span style="text-align:right">Faltan (t)</span><span style="padding-left:16px">Progreso</span><span style="text-align:right">A bordo</span><span style="text-align:right;padding-right:12px">Viajes</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;min-height:0">${rows}</div>
    </section>`;

  const useful = c.cargo.filter((i) => i.useful);
  const other = c.cargo.filter((i) => !i.useful);
  const usefulT = useful.reduce((a, i) => a + i.count, 0);
  const cargoRows = c.cargo.length
    ? [...useful, ...other].slice(0, 16).map((i) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--inline)">
        <span style="display:flex;flex-direction:column;min-width:0"><span class="nowrap" style="font-size:15px">${esc(i.name)}</span><span class="eb ${i.useful ? 'cyan' : 'dim'}" style="font-size:10px">${i.useful ? 'La obra lo necesita' : 'No lo pide esta obra'}${i.stolen ? ' · <span class="red">robada</span>' : ''}</span></span>
        <span class="num ${i.useful ? 'cyan' : 'soft'}">${nf(i.count)} t</span></div>`).join('')
    : '<div class="empty">Bodega vacía.</div>';
  const cargoCard = `
    <div style="display:flex;flex-direction:column;gap:10px;min-height:0;overflow:hidden">
      <div style="display:flex;justify-content:space-between;align-items:baseline"><span class="eb">Bodega</span><span class="num soft">${nf(c.cargoCount)} / ${nf(c.capacity)} t</span></div>
      ${c.cargo.length ? `<span class="eb ${usefulT ? 'cyan' : 'dim'}">${usefulT ? `${nf(usefulT)} t útiles para la obra` : 'Nada de lo que llevas lo pide la obra actual'}</span>` : ''}
      <div style="display:flex;flex-direction:column;min-height:0">${cargoRows}</div>
    </div>`;
  const contrib = c.contributions.slice(0, 18).map((x) => `<div style="display:grid;grid-template-columns:52px minmax(0,1fr) 90px;gap:8px;align-items:baseline;font-size:14px">
      <span class="num dim">${hhmm(x.at)}</span><span class="nowrap">${esc(x.items.map((i) => i.name).join(', '))} <span class="soft">· ${esc(siteName(x.depot) || '')}</span></span><span class="num cyan" style="text-align:right">${nf(x.total)} t</span></div>`).join('');
  const sessionCard = `
    <div style="display:flex;flex-direction:column;gap:10px;min-height:0;overflow:hidden">
      <div style="display:flex;justify-content:space-between;align-items:baseline"><span class="eb">Entregas de la sesión</span><span class="eb">Sesión · <span class="num cyan" style="font-size:16px;letter-spacing:0">${nf(s.session.deliveredToConstruction)} t</span></span></div>
      <div style="display:flex;flex-direction:column;gap:8px;min-height:0">${contrib || '<div class="empty">Aún no has entregado nada en esta sesión.</div>'}</div>
    </div>`;

  return `
  <div style="display:grid;grid-template-columns:minmax(0,1fr) 500px;gap:12px;min-height:0">
    <main style="display:flex;flex-direction:column;gap:12px;min-width:0;min-height:0">${hero}${table}</main>
    <aside class="pn card" style="min-height:0;min-width:0;overflow:hidden">
      <div style="display:flex;gap:8px">
        ${[['buy', 'Dónde comprar'], ['cargo', `A bordo · ${nf(c.cargoCount)} t`], ['log', 'Entregas']].map(([k, t]) => `<button type="button" class="tab small ${ui.colAside === k ? 'on' : ''}" data-colaside="${k}">${t}</button>`).join('')}
      </div>
      ${ui.colAside === 'buy' ? buyPanel(s, d, c) : ui.colAside === 'cargo' ? cargoCard : sessionCard}
    </aside>
  </div>`;
}

/* ---------- Colonización: dónde comprar (Spansh) ---------- */
const LARGE_SHIPS = new Set(['anaconda', 'cutter', 'federation_corvette', 'type9', 'type9_military', 'type7', 'belugaliner', 'panthermkii']);
const MK_PAGE = 7;
const daysAgo = (iso) => (iso ? Math.floor((Date.now() - Date.parse(iso)) / 86400000) : null);
const ageText = (n) => (n == null ? '—' : n < 1 ? 'hoy' : n === 1 ? 'ayer' : n < 60 ? `hace ${n} d` : `hace ${Math.round(n / 30)} meses`);

function marketQuery(res, c) {
  const large = ui.mkFilter.large != null ? ui.mkFilter.large : LARGE_SHIPS.has(String((ui.snap && ui.snap.state.ship.type) || '').toLowerCase());
  const minSupply = Math.min(res.remaining, c.capacity || res.remaining) || 1;
  return { commodity: res.name, minSupply, largePad: large, key: `${res.name}|${minSupply}|${large}` };
}

async function loadMarkets(q) {
  ui.mk = { key: q.key, loading: true, list: [], error: null, page: 0, pick: null };
  render();
  const r = await window.edbubble.markets(q);
  if (ui.mk.key !== q.key) return;
  ui.extOk = r.ok;
  ui.mk = { ...ui.mk, loading: false, list: r.ok ? r.list : [], error: r.ok ? null : r.error, reference: r.reference };
  render();
}

function buyPanel(s, d, c) {
  const res = d.resources.find((r) => r.key === ui.colSel);
  if (!res) return '<div class="empty" style="flex-direction:column;gap:8px"><span class="va" style="font-size:18px;color:var(--soft)">Elige un material</span><span style="font-size:14px">Pulsa un material de la tabla y aquí verás las estaciones más cercanas que lo venden, con stock y precio.</span></div>';
  const q = marketQuery(res, c);
  if (ui.mk.key !== q.key && !ui.mk.loading) setTimeout(() => loadMarkets(q), 0);
  const f = ui.mkFilter;
  const large = q.largePad;
  const chip = (k, on, t) => `<button type="button" class="tab small ${on ? 'on' : ''}" data-mkf="${k}">${t}</button>`;
  const head = `
    <div style="display:flex;flex-direction:column;gap:4px">
      <span class="ti nowrap" style="font-size:22px">${esc(res.name)}</span>
      <span class="eb">${res.remaining ? `Faltan ${nf(res.remaining)} t · stock mínimo ${nf(q.minSupply)} t` : '<span class="cyan">Completado en esta obra</span>'}</span>
    </div>
    <div style="display:flex;gap:6px">${chip('large', large, 'Plataforma L')}${chip('surface', f.surface, 'Superficie')}${chip('carriers', f.carriers, 'Carriers')}</div>`;
  if (ui.mk.loading || ui.mk.key !== q.key) return `${head}<div class="empty">Buscando en Spansh…</div>`;
  if (ui.mk.error) return `${head}<div class="empty"><span class="red">${esc(ui.mk.error)}</span></div>`;
  const list = ui.mk.list.filter((m) => (f.surface || !m.planetary) && (f.carriers || !m.carrier));
  if (!list.length) return `${head}<div class="empty" style="font-size:14px">Ninguna estación cercana con ese stock. Prueba a quitar filtros.</div>`;
  const pages = Math.ceil(list.length / MK_PAGE);
  ui.mk.page = Math.min(ui.mk.page, pages - 1);
  const cap = c.capacity || 0;
  const rows = list.slice(ui.mk.page * MK_PAGE, (ui.mk.page + 1) * MK_PAGE).map((m) => {
    const i = list.indexOf(m);
    const age = daysAgo(m.updatedAt);
    const on = ui.mk.pick === i;
    return `<button type="button" class="mkrow ${on ? 'on' : ''}" data-mkpick="${i}">
      <span style="display:flex;justify-content:center">${m.icon ? `<img src="icons/${m.icon}.png" alt="" style="width:38px;height:38px;object-fit:contain">` : ''}</span>
      <span style="display:flex;flex-direction:column;min-width:0;text-align:left">
        <span class="va nowrap" style="font-size:16px">${esc(siteName(m.station))} <span class="pad pad-${m.pad || 'x'}" style="display:inline-flex;width:22px;height:20px;font-size:12px;vertical-align:middle">${m.pad || '?'}</span></span>
        <span class="eb nowrap" style="font-size:10px;letter-spacing:.06em;overflow:hidden;text-overflow:ellipsis">${nf(m.distance, 1)} al · ${nf(m.ls, 0)} ls · ${esc(m.system)}</span>
      </span>
      <span style="display:flex;flex-direction:column;align-items:flex-end">
        <span class="num ${cap && m.supply >= cap ? 'cyan' : 'yellow'}">${nf(m.supply)} t</span>
        <span class="eb soft" style="font-size:10px;letter-spacing:.04em">${nf(m.price)} cr</span>
        <span class="eb ${age != null && age > 30 ? 'yellow' : 'dim'}" style="font-size:10px;letter-spacing:.04em">${ageText(age)}</span>
      </span>
    </button>`;
  }).join('');
  const pick = ui.mk.pick != null ? list[ui.mk.pick] : null;
  const pager = pages > 1 ? `<span style="display:flex;align-items:center;gap:8px"><button type="button" class="pg" data-pager="mk" data-d="-1" ${ui.mk.page === 0 ? 'disabled' : ''}>‹</button><span class="num soft" style="font-size:13px">${ui.mk.page + 1}/${pages}</span><button type="button" class="pg" data-pager="mk" data-d="1" ${ui.mk.page >= pages - 1 ? 'disabled' : ''}>›</button></span>` : '';
  const here = s.location.system && pick && pick.system.toLowerCase() === s.location.system.toLowerCase();
  const action = pick ? `
    <div class="in" style="padding:10px 12px;display:flex;flex-direction:column;gap:8px;border-color:var(--amber)">
      <span class="nowrap" style="font-size:15px">${esc(siteName(pick.station))} <span class="soft">· ${esc(pick.system)}</span></span>
      <div style="display:flex;gap:8px">
        <button type="button" class="plot-btn" style="flex:1" data-mkplot="1" ${here || (ui.plot && ui.plot.running) || !plotReady() ? 'disabled' : ''} title="${here ? 'Ya estás en ese sistema' : 'Trazar ruta hasta ese sistema'}">${here ? 'En este sistema' : 'Trazar ruta'}</button>
        <button type="button" class="nav-btn" style="width:120px" data-copy="1" data-name="${esc(pick.station)}">Copiar</button>
      </div>
      ${plotLine()}
    </div>` : '<span class="eb dim">Pulsa una estación para trazar la ruta hasta ella.</span>';
  return `${head}
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;min-width:0"><span class="eb dim nowrap" style="min-width:0;overflow:hidden;text-overflow:ellipsis">Spansh · más cercanas a ti</span>${pager}</div>
    <div style="display:flex;flex-direction:column;gap:4px;min-height:0">${rows}</div>
    <div style="margin-top:auto">${action}</div>`;
}

/* ---------- esquema de atraque (SVG) ---------- */
function dockingSvg(padNum, width, hour) {
  const pad = Number(padNum) || 0;
  const hot = hour != null ? hour % 12 : -1; // hora de la plataforma (core/pads.js)
  const C = 150; const RP = 94;
  const pt = (r, deg) => { const a = (deg - 90) * Math.PI / 180; return [C + r * Math.cos(a), C + r * Math.sin(a)]; };
  const spokes = Array.from({ length: 12 }, (_, i) => {
    const [x1, y1] = pt(62, i * 30 + 15); const [x2, y2] = pt(122, i * 30 + 15);
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#3a5576" stroke-width="1.2"/>
      <circle cx="${x1.toFixed(1)}" cy="${y1.toFixed(1)}" r="2" fill="#f08a3a"/><circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="2" fill="#f08a3a"/>`;
  }).join('');
  const pads = Array.from({ length: 12 }, (_, i) => {
    const [x, y] = pt(RP, i * 30); const on = i === hot; const h = 11;
    return `<g${on ? ' filter="url(#glow)"' : ''}>
      <rect x="${(x - h).toFixed(1)}" y="${(y - h).toFixed(1)}" width="${2 * h}" height="${2 * h}" rx="3" fill="${on ? 'rgba(240,164,67,.28)' : '#081627'}" stroke="${on ? '#f0a443' : '#2f7fb0'}" stroke-width="${on ? 2.2 : 1.4}"/>
      <path d="M${x - 3} ${y}h6M${x} ${y - 3}v6" stroke="${on ? '#ffd08a' : '#2f7fb0'}" stroke-width="1"/></g>`;
  }).join('');
  const br = (x, y, dx, dy) => `<path d="M${x} ${y + dy * 9}V${y}H${x + dx * 9}" fill="none" stroke="#49c7e8" stroke-width="1.4"/>`;
  return `<svg viewBox="0 0 300 330" width="${width}" height="${Math.round(width * 330 / 300)}" style="display:block;overflow:visible;flex:none">
    <defs>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <radialGradient id="hub" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#0f2440"/><stop offset="1" stop-color="#06101c"/></radialGradient>
    </defs>
    <g transform="translate(0,15)">
    <circle cx="${C}" cy="${C}" r="134" fill="#06101c" stroke="#1f3a5a" stroke-width="1"/>
    <circle cx="${C}" cy="${C}" r="126" fill="none" stroke="#2b5379" stroke-width="2"/>
    <circle cx="${C}" cy="${C}" r="118" fill="none" stroke="#1f4a6e" stroke-width="1" stroke-dasharray="2 5"/>
    ${spokes}
    <circle cx="${C}" cy="${C}" r="62" fill="url(#hub)" stroke="#2b5379" stroke-width="1.5"/>
    <circle cx="${C}" cy="${C}" r="54" fill="none" stroke="#1f4a6e" stroke-width="1"/>
    ${pads}
    ${br(118, 138, 1, 1)}${br(182, 138, -1, 1)}${br(118, 180, 1, -1)}${br(182, 180, -1, -1)}
    <text x="${C}" y="127" text-anchor="middle" font-family="Rajdhani" font-weight="600" font-size="9" letter-spacing="2.5" fill="#7f9bb8">PLATAFORMA</text>
    <text x="${C}" y="172" text-anchor="middle" font-family="Share Tech Mono" font-size="38" fill="#f0a443" filter="url(#glow)">${String(pad).padStart(2, '0')}</text>
    <path d="M${C - 6} 6l6 9l6 -9z" fill="#49c7e8"/>
    <path d="M${C - 6} 294l6 -9l6 9z" fill="#49c7e8"/>
    <line x1="4" y1="${C}" x2="22" y2="${C}" stroke="#ff4b4b" stroke-width="2"/>
    <circle cx="16" cy="${C}" r="7" fill="#ff4b4b" filter="url(#glow)"/>
    <line x1="278" y1="${C}" x2="296" y2="${C}" stroke="#3be37a" stroke-width="2"/>
    <circle cx="284" cy="${C}" r="7" fill="#3be37a" filter="url(#glow)"/>
    </g>
    <text x="${C}" y="10" text-anchor="middle" font-family="Rajdhani" font-weight="700" font-size="11" letter-spacing="3" fill="#49c7e8">ARRIBA</text>
    <text x="${C}" y="328" text-anchor="middle" font-family="Rajdhani" font-weight="700" font-size="11" letter-spacing="3" fill="#49c7e8">ABAJO</text>
  </svg>`;
}

/* ---------- ciclo de pintado ---------- */
function render() {
  const snap = ui.snap; if (!snap) return;
  const { state: s, view: v } = snap;
  const typing = document.activeElement && document.activeElement.id === 'nav-search';
  if (ui.autoJump && v.mode.key !== ui.lastModeKey && !typing) {
    if (ui.lastModeKey !== null && BUILT.has(v.mode.section) && v.mode.section !== ui.section) ui.section = v.mode.section;
    ui.lastModeKey = v.mode.key;
  }
  renderHeader(s, v);
  renderRail(v);
  const sel = typing ? [document.activeElement.selectionStart, document.activeElement.selectionEnd] : null;
  $('screen').innerHTML = ui.section === 'vuelo' ? screenVuelo(s, v) : ui.section === 'navegacion' ? screenNavegacion(s, v) : ui.section === 'colonizacion' ? screenColonizacion(s, v) : screenPuente(s, v);
  if (sel) { const el = $('nav-search'); if (el) { el.focus(); el.setSelectionRange(sel[0], sel[1]); } }
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
document.addEventListener('click', (ev) => {
  if (ev.target.closest('#autojump')) { ui.autoJump = !ui.autoJump; render(); }
});
// Buscador: sugerencias de Spansh mientras se escribe (con pausa de 300 ms)
let searchTimer = null;
document.addEventListener('input', (ev) => {
  if (ev.target.id !== 'nav-search') return;
  ui.search.q = ev.target.value;
  clearTimeout(searchTimer);
  const q = ui.search.q.trim();
  if (q.length < 3) { ui.search.results = []; ui.search.loading = false; ui.search.error = null; render(); return; }
  ui.search.loading = true;
  searchTimer = setTimeout(async () => {
    const seq = ++ui.search.seq;
    const r = await window.edbubble.suggest(q);
    if (seq !== ui.search.seq) return; // llegó otra búsqueda después
    ui.search.loading = false;
    ui.extOk = r.ok;
    ui.search.error = r.ok ? null : `Spansh no responde (${r.error})`;
    ui.search.results = r.ok ? r.results : [];
    render();
  }, 300);
});
document.addEventListener('keydown', (ev) => {
  if (ev.target.id === 'nav-search' && ev.key === 'Enter') {
    const q = ui.search.q.trim();
    const exact = ui.search.results.find((r) => r.name.toLowerCase() === q.toLowerCase());
    if (exact || ui.search.results[0]) selectSystem((exact || ui.search.results[0]).name);
    else if (q.length >= 3) selectSystem(q);
  }
});

async function selectSystem(name) {
  ui.sel = { name, loading: true };
  ui.navTab = 'system'; ui.sysTab = 'stations'; ui.sysPage = 0;
  render();
  const r = await window.edbubble.system(name);
  if (!ui.sel || ui.sel.name !== name) return;
  ui.extOk = r.ok;
  ui.sel = r.ok ? { name: (r.system && r.system.name) || name, system: r.system } : { name, error: `Spansh no responde (${r.error})` };
  render();
}

// Las acciones responden al pulsar (pointerdown), no al soltar: la pantalla se
// repinta varias veces por segundo en vuelo y un clic normal podría perderse.
document.addEventListener('pointerdown', (ev) => {
  if (ev.button !== 0) return;
  const b = ev.target.closest('button[data-act]');
  if (b && !b.disabled) { ev.preventDefault(); runAction(b.dataset.act); return; }
  const pk = ev.target.closest('button[data-pick]');
  if (pk) { ev.preventDefault(); const r = ui.search.results[Number(pk.dataset.pick)]; if (r) selectSystem(r.name); return; }
  const nt = ev.target.closest('button[data-navtab]');
  if (nt) { ev.preventDefault(); ui.navTab = nt.dataset.navtab; render(); return; }
  const st = ev.target.closest('button[data-systab]');
  if (st) { ev.preventDefault(); ui.sysTab = st.dataset.systab; ui.sysPage = 0; render(); return; }
  const sp = ev.target.closest('button[data-pager="sys"]');
  if (sp && !sp.disabled) { ev.preventDefault(); ui.sysPage = Math.max(0, ui.sysPage + Number(sp.dataset.d)); render(); return; }
  const pc = ev.target.closest('button[data-plotcancel]');
  if (pc) { ev.preventDefault(); window.edbubble.plotCancel(); return; }
  const pl = ev.target.closest('button[data-plot]');
  if (pl && !pl.disabled && ui.sel) {
    ev.preventDefault();
    const y = ui.sel.system; const here = ui.snap && ui.snap.state.location.starPos;
    const d = y ? (y.distance != null ? y.distance : distTo(here, y.pos)) : 0;
    window.edbubble.plot(ui.sel.name, d || 0);
    return;
  }
  const mt = ev.target.closest('[data-mat]');
  if (mt) { ev.preventDefault(); ui.colSel = mt.dataset.mat; ui.colAside = 'buy'; ui.mk.page = 0; ui.mk.pick = null; render(); return; }
  const ca = ev.target.closest('button[data-colaside]');
  if (ca) { ev.preventDefault(); ui.colAside = ca.dataset.colaside; render(); return; }
  const mf = ev.target.closest('button[data-mkf]');
  if (mf) {
    ev.preventDefault();
    const k = mf.dataset.mkf;
    if (k === 'large') ui.mkFilter.large = !(ui.mkFilter.large != null ? ui.mkFilter.large : LARGE_SHIPS.has(String(ui.snap.state.ship.type || '').toLowerCase()));
    else ui.mkFilter[k] = !ui.mkFilter[k];
    ui.mk.page = 0; ui.mk.pick = null; render(); return;
  }
  const mp = ev.target.closest('button[data-mkpick]');
  if (mp) { ev.preventDefault(); ui.mk.pick = Number(mp.dataset.mkpick); render(); return; }
  const mpg = ev.target.closest('button[data-pager="mk"]');
  if (mpg && !mpg.disabled) { ev.preventDefault(); ui.mk.page = Math.max(0, ui.mk.page + Number(mpg.dataset.d)); ui.mk.pick = null; render(); return; }
  const mpl = ev.target.closest('button[data-mkplot]');
  if (mpl && !mpl.disabled) {
    ev.preventDefault();
    const f = ui.mkFilter;
    const list = ui.mk.list.filter((m) => (f.surface || !m.planetary) && (f.carriers || !m.carrier));
    const pick = list[ui.mk.pick];
    if (pick) window.edbubble.plot(pick.system, pick.distance || 0);
    return;
  }
  const dp = ev.target.closest('button[data-depot]');
  if (dp) { ev.preventDefault(); ui.colDepot = dp.dataset.depot; ui.colPage = 0; render(); return; }
  const cpg = ev.target.closest('button[data-pager="col"]');
  if (cpg && !cpg.disabled) { ev.preventDefault(); ui.colPage = Math.max(0, ui.colPage + Number(cpg.dataset.d)); render(); return; }
  const np = ev.target.closest('button[data-pager="nav"]');
  if (np && !np.disabled) { ev.preventDefault(); ui.navPage = Math.max(0, (ui.navPage || 0) + Number(np.dataset.d)); render(); return; }
  const cp = ev.target.closest('button[data-copy]');
  const ln = ev.target.closest('button[data-link]');
  if ((cp || ln) && !(cp || ln).disabled && window.edbubble && ui.snap) {
    ev.preventDefault();
    const L = ui.snap.state.location;
    const own = (cp || ln).dataset.name;
    const name = own || clean(L.system);
    const address = own ? (ln && ln.dataset.address) : L.systemAddress;
    const done = (text) => { ui.navFeedback = { text, at: Date.now() }; render(); setTimeout(render, 3100); };
    if (cp) window.edbubble.copy(name).then(() => done(`Copiado: ${name}`));
    else window.edbubble.open(ln.dataset.link, name, address).then((ok) => done(ok ? `Abriendo ${ln.textContent} en el navegador` : 'No se pudo abrir'));
    return;
  }
  const rp = ev.target.closest('button[data-pager="route"]');
  if (rp && !rp.disabled) { ev.preventDefault(); ui.routePage = Math.max(0, (ui.routePage || 0) + Number(rp.dataset.d)); render(); return; }
  const pg = ev.target.closest('button[data-ctlpage]');
  if (pg && !pg.disabled) { ev.preventDefault(); ui.ctlPage = Math.max(0, (ui.ctlPage || 0) + Number(pg.dataset.ctlpage)); render(); }
});
window.addEventListener('resize', fit);
setInterval(() => { $('hdr-clock').textContent = `${new Date().toISOString().slice(11, 16)} UTC`; }, 1000);

fit();
renderRail(null);
if (window.edbubble) {
  window.edbubble.onUpdate((snap) => { ui.snap = snap; render(); });
  window.edbubble.onControls((c) => { ui.controls = c; render(); });
  window.edbubble.onPlotStatus((p) => {
    ui.plot = { ...p, at: Date.now() };
    if (!p.running && p.ok) ui.navTab = 'route'; // ver la ruta recién trazada
    render();
    if (!p.running) setTimeout(render, 8100);
  });
  window.edbubble.controls().then((c) => { ui.controls = c; render(); });
  window.edbubble.snapshot().then((snap) => { if (snap && !ui.snap) { ui.snap = snap; render(); } });
}

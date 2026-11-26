'use strict';

/* ED BUBBLE · interfaz (entrega 2: datos en vivo + acciones en el juego) */

const SECTIONS = [
  { id: 'puente', label: 'Puente de mando', home: true, built: true },
  { group: 'Nave' }, { id: 'vuelo', label: 'Vuelo', built: true }, { id: 'orbita', label: 'Órbita planetaria', built: true }, { id: 'combate', label: 'Combate', built: true }, { id: 'equipo', label: 'Equipo', built: true }, { id: 'srv', label: 'SRV' },
  { group: 'Viaje' }, { id: 'navegacion', label: 'Navegación', built: true }, { id: 'exploracion', label: 'Exploración' }, { id: 'estacion', label: 'Estación', built: true }, { id: 'apie', label: 'A pie', built: true },
  { group: 'Actividades' }, { id: 'powerplay', label: 'Powerplay', built: true }, { id: 'comercio', label: 'Comercio' }, { id: 'mineria', label: 'Minería', built: true }, { id: 'colonizacion', label: 'Colonización', built: true },
  { group: 'Comandante' }, { id: 'cmdr', label: 'CMDR' }, { id: 'ingenieros', label: 'Ingenieros', built: true }, { id: 'carrier', label: 'Carrier' }, { id: 'camara', label: 'Cámara' }, { id: 'utilidades', label: 'Utilidades' }, { id: 'controles', label: 'Controles', built: true }, { id: 'ajustes', label: 'Ajustes', built: true, hidden: true }, // se abre desde la cabecera
];
const BUILT = new Set(SECTIONS.filter((s) => s.built).map((s) => s.id));

const ui = {
  section: 'puente', autoJump: true, lastModeKey: null, snap: null, controls: null, armed: null, flash: null, feedback: null,
  search: { q: '', results: [], loading: false, error: null, seq: 0 }, // buscador de Navegación
  sel: null, // sistema elegido: { name, loading, system, error }
  navTab: 'route', sysTab: 'stations', sysPage: 0,
  sysKinds: [], sysLarge: false, // filtro de estaciones: tipos elegidos (vacío = todos) y solo plataforma L
  colDepot: null, colPage: 0, // Colonización: construcción elegida y página de materiales
  colAside: 'buy', colSel: null, // pestaña de la derecha y material elegido
  mk: { key: null, loading: false, list: [], error: null, page: 0, pick: null }, // dónde comprar
  mkFilter: { large: null, surface: true, carriers: false },
  fuelStops: {}, // sistema -> estación con repostaje (Spansh) o null
  bodyInfo: {}, // datos de cuerpos desde Spansh (gravedad…), por nombre
  here: null, herePage: 0, hereKinds: [], hereLarge: false, // estaciones y portanaves del sistema actual (Spansh)
  bioPage: 0,
  lockTab: 'items', lockPage: 0, lockSrc: 'locker', // a pie: taquilla
  modTarget: 'suit', modPage: 0, modOpen: null, // a pie: mejoras de ingeniero
  engKind: 'ship', engCat: null, engModule: null, engPage: 0, engOpen: null, // pantalla Ingenieros
  recipes: null, engRecipe: null, engBp: null, engExp: false, // recetas de ingeniería de nave
  colMode: null, colCosts: null, planLoc: 'all', planPage: 0, planSel: null, // Colonización: planificar por tipo
  shipData: null, builds: null, buildSel: null, buildDel: null, wishSel: null, buy: null, buyDist: 0, buySort: 'dist', buyLarge: false, eqMsg: null, eqTab: 'mine', eqShipPage: 0, eqShip: null, eqCat: 'standard', eqGrpPage: 0, eqGrp: null, eqPages: {}, // Equipo: tu nave, naves y módulos
  skull: null, mineTab: null, sitesPage: 0, prospPage: 0, skullMsg: null, // minería
  coordText: '', coordMsg: null, // coordenadas en planeta: texto escrito y aviso
  finalDest: null, // estación de destino final: { station, system, ls, pad, icon, label, commodity, supply, price }
  plot: null, // { running, target, text, ok, error }
  extOk: null, // última consulta a Spansh: true / false
  prefs: { autoJump: true, jump: { vuelo: true, approach: true, docked: true, depot: true, orbita: true, mineria: true, combate: true }, rigMin: 75, startSection: 'puente', lastSection: 'puente', alerts: { dock: true, fuelRoute: true }, fullscreen: false },
  displays: null, info: null, // Ajustes: pantallas conectadas y datos de la app
};

/** Cambia un ajuste y lo guarda (settings.json). */
function setPref(key, value) {
  const [g, k] = key.split('.');
  if (k) ui.prefs[g] = { ...ui.prefs[g], [k]: value }; else ui.prefs[key] = value;
  if (key === 'autoJump') { ui.autoJump = value; if (value) ui.lastModeKey = null; }
  render();
  if (window.edbubble && window.edbubble.setSetting) window.edbubble.setSetting(key, value).then((p) => { if (p) { ui.prefs = p; ui.autoJump = p.autoJump; render(); } });
}
/** ¿Se salta solo a la sección de esta situación? */
function jumpAllowed(key) {
  const g = key === 'approach' ? 'approach' : key === 'docked' ? 'docked' : key === 'docked-depot' ? 'depot' : key === 'orbit' || key === 'landed' ? 'orbita' : key === 'rhino' || key === 'mining' ? 'mineria' : key === 'combat' ? 'combate' : 'vuelo';
  return ui.prefs.jump[g] !== false;
}
/** Abre una sección (y la recuerda para la próxima vez). */
function goSection(id) {
  if (ui.section === id) return;
  if (id === 'ajustes') ui.prevSection = ui.section;
  ui.section = id;
  if (id === 'ajustes') loadSettingsInfo();
  if (window.edbubble && window.edbubble.setSetting) window.edbubble.setSetting('lastSection', id);
}
function loadSettingsInfo() {
  if (!window.edbubble || !window.edbubble.displays) return;
  window.edbubble.displays().then((d) => { ui.displays = d; render(); });
  window.edbubble.info().then((i) => { ui.info = i; render(); });
}

/* ---------- utilidades ---------- */
const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = (s) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim());
// "Orbital Construction Site: Sisters' Pride" -> "Sisters' Pride" (también si el prefijo viene en otro idioma)
const SITE_PREFIX = /^[^:]{4,48}?(?:construct|constru[cç]|sitio|obra|chantier|baustelle|cantiere|budow|строит)[^:]{0,30}:\s*/i;
const siteName = (s) => clean(s) && clean(s).replace(SITE_PREFIX, '');
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
  $('hdr-settings').classList.toggle('on', ui.section === 'ajustes');
  $('hdr-system').textContent = or(clean(s.location.system), 'Esperando al juego…');
  const a = v.alerts.filter((x) => !x.kind || ui.prefs.alerts[x.kind] !== false);
  $('hdr-alerts').innerHTML = a.length
    ? `<span class="eb">Alertas</span>${a.map((x) => `<span class="alert ${x.level}"${x.level === 'info' ? ' data-goto="vuelo" title="Ver el esquema de atraque en Vuelo"' : ''}>${esc(x.text)}</span>`).join('')}`
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
    if (x.hidden) return '';
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
       <span style="display:flex;justify-content:space-between;align-items:baseline"><span class="soft nowrap" style="font-size:15px">${esc(siteName(c.name) || 'Construcción')}</span><span class="num cyan" style="font-size:24px">${pct(c.progress)}</span></span>
       <span class="bar"><span style="width:${(c.progress || 0) * 100}%;background:#2a7fa3"></span></span>`
    : '<span class="soft" style="font-size:14px">Sin construcciones de colonización en esta sesión.</span>';

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
       ${stat('Saltos sesión', nf(s.session.jumps))}${stat('Distancia', `${nf(s.session.distance, 0)} al`)}${stat('Entregas', `${nf(s.session.deliveredToConstruction)} t`)}
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
const CTL_ORDER = { unbound: 0, hotas: 1, unsupported: 2, shared: 3, ok: 4 };
const CTL_STATUS = {
  unbound: ['Sin asignar', 'red'],
  hotas: ['Solo en mando', 'yellow'],
  unsupported: ['Tecla no enviable', 'yellow'],
  shared: ['Tecla compartida', 'yellow'],
  ok: ['Lista', 'cyan'],
};

function controlsPanel() {
  const c = ui.controls;
  const head = (right) => `<div style="display:flex;justify-content:space-between;align-items:center"><span class="ti" style="font-size:16px">Controles</span>${right}</div>`;
  if (!c) return `<section class="pn card" style="flex:1;min-height:0">${head('')}<div class="empty">Leyendo tus controles…</div></section>`;
  if (c.error || !c.check) return `<section class="pn card" style="flex:1;min-height:0">${head('<button type="button" class="tab small" data-goto="controles">Guía</button>')}<div class="empty" style="flex-direction:column;gap:8px"><span class="red">${esc(c.error || 'Sin datos')}</span><span style="font-size:14px">Sin controles no se pueden pulsar los botones.</span><button type="button" class="tab" data-goto="controles">Preparar mis controles</button></div></section>`;
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
    ${head(`<span style="display:flex;align-items:center;gap:10px"><span class="eb dim">Preset ${esc(c.preset)}</span><button type="button" class="tab small" data-goto="controles">Guía</button></span>`)}
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
  const dock = s.docking;
  const dockCard = docking ? `
    <section class="pn card" style="flex:1;min-height:0;align-items:center">
      <div style="display:flex;justify-content:space-between;width:100%"><span class="ti" style="font-size:16px">Atraque concedido</span><span class="eb">${esc(STATION_TYPES[dock.stationType] || dock.stationType || '—')}</span></div>
      <span class="va" style="font-size:20px;align-self:flex-start">${esc(siteName(dock.station) || '—')}</span>
      ${showDiagram ? `${dockingSvg(dock.pad, 430, v.dockPadHour, v.dockPad && v.dockPad.depth)}
        ${v.dockPad && v.dockPad.depth != null ? `<span class="eb amber">${['Junto a la entrada', 'Cerca de la entrada', 'A media profundidad', 'Hacia el fondo', 'Al fondo'][v.dockPad.depth]} · plataforma ${({ S: 'pequeña', M: 'mediana', L: 'grande' })[v.dockPad.size]}</span>` : ''}
        <div style="display:flex;justify-content:space-between;width:430px"><span class="eb" style="color:#ff6b6b">● Luz roja</span><span class="eb dim">Vista al entrar</span><span class="eb" style="color:#3be37a">Luz verde ●</span></div>`
      : `<div class="empty" style="flex-direction:column;gap:10px"><span class="eb">Plataforma</span><span class="num amber" style="font-size:120px;line-height:1">${String(Number(dock.pad) || 0).padStart(2, '0')}</span><span style="font-size:14px">Sin esquema para este tipo de estación.</span></div>`}
    </section>` : '';
  const approachCard = hereCard(s);

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
      ${fuelBlock(s, v)}
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">
        ${stat('Distancia', nextLeg && nextLeg.distance != null ? `${nf(nextLeg.distance, 2)} al` : '—')}${stat('Saltos restantes', r.legs.length ? nf(r.jumps) : or(s.fsdTarget.remainingJumps))}${stat('Destino', r.destination ? esc(r.destination) : esc(tgtName))}
      </div>${finalStrip(s)}` : `<div class="empty" style="flex-direction:column;gap:6px;padding:18px"><span class="va" style="font-size:18px;color:var(--soft)">Sin objetivo de salto</span><span style="font-size:14px">Fija un sistema o traza una ruta en el mapa galáctico.</span></div>`}
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
        ${stat(f.jumpsAtMax ? 'Saltos a alcance máx.' : 'Saltos con esto', f.jumpsLeft != null ? `≈ ${f.jumpsLeft}` : '—')}${stat('Recogida', f.scooping ? 'Activa' : 'Inactiva', f.scooping ? 'cyan' : 'dim')}${stat('Hasta destino', r.legs.length ? `${r.jumps} saltos` : 'Sin ruta', r.legs.length ? '' : 'dim')}
      </div>
    </section>
   </main>
   <aside style="display:flex;flex-direction:column;gap:12px;min-height:0;min-width:0">
     ${arrivedCard(s) || nextCard}
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
    const fp = v.fuelPlan;
    // sin recolector: combustible con el que llegas a cada sistema (en lugar de "recogible")
    const after = fp ? new Map(fp.legs.map((x) => [x.index, x.fuelAfter])) : null;
    const fuelCol = (l) => {
      if (after) {
        if (l.here) return `<span class="num soft">${nf(fp.have, 1)} t</span>`;
        const f = after.get(l.index);
        return f == null ? '<span></span>' : f < 0 ? '<span class="eb red">no llegas</span>' : `<span class="num ${f < 2 ? 'yellow' : 'cyan'}">${nf(f, 1)} t</span>`;
      }
      return `<span class="eb" style="color:${l.scoopable === false ? 'var(--amber)' : l.scoopable ? 'var(--cyan)' : 'var(--dim)'}">${l.scoopable === false ? 'No recogible' : l.scoopable ? 'Recogible' : 'Desconocida'}</span>`;
    };
    const per = fp && !fp.ok ? 10 : NAV_PAGE;
    const pages = Math.ceil(r.legs.length / per);
    ui.navPage = Math.min(ui.navPage || 0, pages - 1);
    let acc = 0; const cum = r.legs.map((l) => { acc += l.here ? 0 : (l.distance || 0); return acc; });
    const rows = r.legs.slice(ui.navPage * per, (ui.navPage + 1) * per).map((l) => {
      const next = l.index === 1 && r.legs[0].here;
      const short = fp && fp.shortAt != null && l.index >= fp.shortAt;
      const mark = l.here ? 'border-left:3px solid var(--amber);border-color:#8a5a1e' : next ? 'border-left:3px solid var(--cyan);border-color:var(--cyandim)' : '';
      return `<div class="in row" style="grid-template-columns:52px 44px minmax(0,1fr) 150px 110px 120px;height:44px;${mark}${short ? 'background:rgba(255,75,75,.08);' : ''}">
        <span class="num" style="padding-left:12px;color:${l.here ? 'var(--amber)' : next ? 'var(--cyan)' : 'var(--eb)'}">${String(l.index).padStart(2, '0')}</span>
        <span class="starc ${l.scoopable === false ? 'no' : l.scoopable == null ? 'unk' : ''}">${esc(or(l.starClass, '?')).slice(0, 3)}</span>
        <span class="va nowrap" style="font-size:17px">${esc(l.system)}${l.here ? ' <span class="eb amber" style="font-size:10px">aquí</span>' : next ? ' <span class="eb cyan" style="font-size:10px">siguiente</span>' : ''}${fp && fp.shortAt === l.index ? ' <span class="eb red" style="font-size:10px">sin combustible</span>' : ''}${fp && !fp.ok && ui.fuelStops[l.system] ? ' <span class="eb yellow" style="font-size:10px">⛽ repostar</span>' : ''}</span>
        ${fuelCol(l)}
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
      ${fp && !fp.ok ? fuelBlock(s, v) : ''}
      <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px">
        ${stat('Saltos', nf(r.jumps))}${stat('Distancia', `${nf(r.distance, 1)} al`)}${stat('No recogibles', nf(noScoop), noScoop ? 'amber' : 'cyan')}${stat('Destino', esc(r.destination))}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span class="eb dim" style="display:grid;grid-template-columns:52px 44px minmax(0,1fr) 150px;width:calc(100% - 330px)"><span style="padding-left:12px">#</span><span>Estr.</span><span>Sistema</span><span>${fp ? 'Combustible al llegar' : ''}</span></span>${pager}
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

  const tabs = [['stations', `Estaciones · ${ui.sysKinds.length || ui.sysLarge ? `${y.stations.filter((st) => (!ui.sysKinds.length || ui.sysKinds.includes(st.label)) && (!ui.sysLarge || st.pad === 'L')).length}/` : ''}${y.stations.length}`], ['factions', `Facciones · ${y.factions.length}`], ['bodies', `Cuerpos · ${y.bodyCount}`]];
  const { bar, shown, filtering } = stationFilter(y.stations, 'sys');
  const filterBar = ui.sysTab === 'stations' && y.stations.length > 1 ? bar : '';
  const per = { stations: 7, factions: 9, bodies: 11 }[ui.sysTab];
  const items = ui.sysTab === 'stations' ? shown : ui.sysTab === 'factions' ? y.factions : y.bodies;
  const pages = Math.max(1, Math.ceil(items.length / per));
  ui.sysPage = Math.min(ui.sysPage, pages - 1);
  const slice = items.slice(ui.sysPage * per, (ui.sysPage + 1) * per);
  let rows;
  if (!items.length) rows = `<div class="empty">${ui.sysTab === 'stations' ? (filtering ? 'Ninguna estación con este filtro.' : 'Sin estaciones conocidas.') : ui.sysTab === 'factions' ? 'Sin facciones (sistema sin poblar).' : 'Sin cuerpos registrados.'}</div>`;
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
    <div style="display:flex;gap:8px;align-items:center">${tabs.map(([k, t]) => `<button type="button" class="tab small ${ui.sysTab === k ? 'on' : ''}" data-systab="${k}">${t}</button>`).join('')}<span style="margin-left:auto">${pager}</span></div>${filterBar}
    <div style="display:flex;flex-direction:column;gap:4px;min-height:0">${rows}</div>`;
}

/* ---------- Colonización ---------- */
const COL_PAGE = 14;

function screenColonizacion(s, v) {
  if (ui.colMode === 'plan' || (!v.col.depots.length && ui.colMode !== 'obras')) return screenColPlan(s, v);
  return screenColObras(s, v);
}

/* ---------- Colonización: planificar una construcción ---------- */
const PLAN_PAGE = 11;
const LOC_ES = { orbital: 'Orbital', surface: 'Superficie' };
function screenColPlan(s, v) {
  const c = v.col;
  if (!ui.colCosts && window.edbubble && window.edbubble.colCosts) { ui.colCosts = 'loading'; window.edbubble.colCosts().then((r) => { ui.colCosts = r; render(); }).catch(() => { ui.colCosts = null; }); }
  const all = Array.isArray(ui.colCosts) ? ui.colCosts : [];
  const list = all.filter((b) => ui.planLoc === 'all' || b.location === ui.planLoc);
  const pages = Math.max(1, Math.ceil(list.length / PLAN_PAGE));
  ui.planPage = Math.min(ui.planPage, pages - 1);
  const cap = c.capacity || 0;
  const sel = list.find((b) => b.key === ui.planSel) || list[0];
  const head = `<section class="pn card" style="gap:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
        <span style="display:flex;flex-direction:column;gap:2px"><span class="ti" style="font-size:20px">Planificar una construcción</span><span class="eb dim">Mercancías de referencia por tipo · el juego puede pedir algo más o algo menos, y el puerto primario cuesta más</span></span>
        <span style="display:flex;gap:8px;align-items:center">${[['all', 'Todas'], ['orbital', 'Orbitales'], ['surface', 'Superficie']].map(([k, t]) => `<button type="button" class="tab small ${ui.planLoc === k ? 'on' : ''}" data-planloc="${k}">${t}</button>`).join('')}
        ${c.depots.length ? '<button type="button" class="tab small" data-colmode="obras">‹ Mis construcciones</button>' : ''}</span>
      </div>
    </section>`;
  const rows = list.slice(ui.planPage * PLAN_PAGE, (ui.planPage + 1) * PLAN_PAGE).map((b) => `<button type="button" class="in plan-row ${sel && b.key === sel.key ? 'sel' : ''}" data-plansel="${esc(b.key)}">
      <span style="display:flex;flex-direction:column;min-width:0;text-align:left"><span class="va nowrap" style="font-size:16px">${esc(b.name)}</span><span class="eb dim" style="font-size:10px">${esc(LOC_ES[b.location] || b.location)} · nivel ${b.tier}</span></span>
      <span class="num soft" style="text-align:right">${nf(b.total)} t</span>
      <span class="num cyan" style="text-align:right">${cap ? `≈ ${nf(Math.ceil(b.total / cap))}` : '—'}</span>
    </button>`).join('') || `<div class="empty">${ui.colCosts === 'loading' ? 'Cargando…' : 'Sin datos de costes.'}</div>`;
  const listCard = `<section class="pn card" style="min-height:0;overflow:hidden">
      <div class="plan-row head"><span class="eb">Tipo</span><span class="eb" style="text-align:right">Total</span><span class="eb" style="text-align:right">Viajes${cap ? ` (${nf(cap)} t)` : ''}</span></div>
      <div style="display:flex;flex-direction:column;gap:4px">${rows}</div>
      <span style="display:flex;justify-content:space-between;align-items:center;margin-top:auto"><span class="eb dim" style="font-size:10px">Datos: Raven Colonial / SrvSurvey (GPLv3)</span>${pager2('plan', ui.planPage, pages)}</span>
    </section>`;
  let detail = '<div class="empty">Elige un tipo de construcción.</div>';
  if (sel) {
    const max = sel.cargo.length ? sel.cargo[0].t : 1;
    detail = `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px"><span style="display:flex;flex-direction:column;gap:2px;min-width:0"><span class="ti" style="font-size:22px">${esc(sel.name)}</span><span class="eb dim">${esc(sel.en)} · ${esc(LOC_ES[sel.location] || sel.location)} · nivel ${sel.tier}</span></span></div>
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">${stat('Total', `${nf(sel.total)} t`, 'amber')}${stat('Mercancías', nf(sel.cargo.length))}${stat(`Viajes${cap ? ` (${nf(cap)} t)` : ''}`, cap ? `≈ ${nf(Math.ceil(sel.total / cap))}` : '—', 'cyan')}</div>
      <div style="display:flex;flex-direction:column;gap:3px">${sel.cargo.map((x) => `<div class="plan-cargo"><span class="nowrap">${esc(x.name)}</span><span class="bar" style="height:6px"><span style="width:${(x.t / max) * 100}%;background:var(--amber)"></span></span><span class="num" style="text-align:right">${nf(x.t)} t</span></div>`).join('')}</div>`;
  }
  return `<div style="display:flex;flex-direction:column;gap:12px;min-height:0;height:100%">${head}
    <div style="flex:1;display:grid;grid-template-columns:minmax(0,1fr) 560px;gap:12px;min-height:0">${listCard}<section class="pn card" style="min-height:0;overflow:hidden">${detail}</section></div></div>`;
}

function screenColObras(s, v) {
  const c = v.col;
  if (!c.depots.length) {
    return `<section class="pn card"><span class="ti" style="font-size:16px">Colonización</span>
      <div class="empty" style="flex-direction:column;gap:8px"><span class="va" style="font-size:22px;color:var(--soft)">Sin construcciones todavía</span><span style="font-size:15px">Atraca en una construcción (orbital o de superficie) y aquí aparecerán sus materiales, lo que falta y los viajes.</span></div></section>`;
  }
  if (!ui.colDepot || !c.depots.find((d) => d.marketId === ui.colDepot)) ui.colDepot = c.current && c.depots.find((d) => d.marketId === c.current) ? c.current : c.depots[0].marketId;
  const d = c.depots.find((x) => x.marketId === ui.colDepot);
  const typeLabel = STATION_TYPES[d.type] || (d.type ? d.type : 'Construcción');
  const tabs = `<div style="display:flex;gap:8px;flex-wrap:nowrap;overflow:hidden;align-items:center">${c.depots.length > 1 ? c.depots.slice(0, 6).map((x) => `<button type="button" class="tab small ${x.marketId === d.marketId ? 'on' : ''}" data-depot="${esc(x.marketId)}"><span class="nowrap" style="max-width:260px;display:inline-block;overflow:hidden;text-overflow:ellipsis;vertical-align:bottom">${esc(siteName(x.name) || x.marketId)}</span> · ${pct(x.progress, 0)}</button>`).join('') : ''}</div>`;
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
        <span style="display:flex;flex-direction:column;min-width:0"><span class="nowrap" style="font-size:15px">${esc(i.name)}</span><span class="eb ${i.useful ? 'cyan' : 'dim'}" style="font-size:10px">${i.useful ? 'La construcción lo necesita' : 'No lo pide esta construcción'}${i.stolen ? ' · <span class="red">robada</span>' : ''}</span></span>
        <span class="num ${i.useful ? 'cyan' : 'soft'}">${nf(i.count)} t</span></div>`).join('')
    : '<div class="empty">Bodega vacía.</div>';
  const cargoCard = `
    <div style="display:flex;flex-direction:column;gap:10px;min-height:0;overflow:hidden">
      <div style="display:flex;justify-content:space-between;align-items:baseline"><span class="eb">Bodega</span><span class="num soft">${nf(c.cargoCount)} / ${nf(c.capacity)} t</span></div>
      ${c.cargo.length ? `<span class="eb ${usefulT ? 'cyan' : 'dim'}">${usefulT ? `${nf(usefulT)} t útiles para la construcción` : 'Nada de lo que llevas lo pide la construcción actual'}</span>` : ''}
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
        ${[['buy', 'Comprar'], ['cargo', `A bordo · ${nf(c.cargoCount)} t`], ['log', 'Entregas']].map(([k, t]) => `<button type="button" class="tab small ${ui.colAside === k ? 'on' : ''}" data-colaside="${k}" style="white-space:nowrap">${t}</button>`).join('')}
        <button type="button" class="tab small" data-colmode="plan" style="margin-left:auto;white-space:nowrap" title="Mercancías de referencia por tipo de construcción">Planificar</button>
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
  return { commodity: res.name, symbol: res.key, minSupply, largePad: large, key: `${res.key || res.name}|${minSupply}|${large}` };
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
      <span class="eb">${res.remaining ? `Faltan ${nf(res.remaining)} t · stock mínimo ${nf(q.minSupply)} t` : '<span class="cyan">Completado en esta construcción</span>'}</span>
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

/* ---------- combustible de la ruta (sin recolector) ---------- */
/** Estación para repostar más lejana dentro de lo que alcanzas. */
function bestFuelStop(s, p) {
  const route = s.route || [];
  for (let i = Math.min(p.reachable, route.length - 1); i >= 0; i -= 1) {
    const st = ui.fuelStops[route[i].system];
    if (st) return { system: route[i].system, index: i, ...st };
  }
  const pending = route.slice(0, p.reachable + 1).some((x) => ui.fuelStops[x.system] === undefined);
  return pending ? 'buscando' : null;
}

function fuelBlock(s, v) {
  const p = v.fuelPlan;
  if (!p) {
    if (s.ship.hasFuelScoop === false && s.route.length > 1) return '<span class="eb dim" style="font-size:10px">Combustible: haz un par de saltos con esta nave para calcular su consumo.</span>';
    return '';
  }
  if (p.ok) return `<span class="eb cyan" style="font-size:11px">Sin recolector · combustible suficiente para la ruta (sobran ${nf(p.spare, 1)} t)</span>`;
  const stop = bestFuelStop(s, p);
  const where = stop === 'buscando' ? '<span class="soft">Buscando estaciones con repostaje en la ruta…</span>'
    : stop ? `Reposta en <b>${esc(siteName(stop.name))}</b> · ${esc(stop.system)} · ${nf(stop.ls, 0)} ls${stop.index === 0 ? ' (aquí)' : ` (salto ${stop.index})`}`
    : '<span class="red">Ninguna estación con repostaje en los sistemas a los que llegas: cambia la ruta.</span>';
  const danger = p.jumpsOk <= 1;
  return `<div class="in" style="padding:10px 12px;display:flex;flex-direction:column;gap:4px;border-color:${danger ? 'var(--red,#ff4b4b)' : '#8a7a1e'}">
      <span class="eb ${danger ? 'red' : 'yellow'}">Sin recolector · no llegas al destino</span>
      <span style="font-size:15px">Combustible para <b>${p.jumpsOk} de ${p.jumpsLeft}</b> saltos (hasta ${esc(p.reachableSystem || '—')}). La ruta pide ≈ ${nf(p.need, 1)} t y tienes ${nf(p.have, 1)} t${p.fitsFullTank === false ? `; no cabe ni con el depósito lleno (${nf(p.capacity, 0)} t)` : ''}.</span>
      <span style="font-size:15px">${where}</span>
    </div>`;
}

/* ---------- coordenadas en planeta y brújula ---------- */
const fmtDist = (m) => (m == null ? '—' : m < 1000 ? `${nf(m, 0)} m` : m < 100000 ? `${nf(m / 1000, 1)} km` : `${nf(m / 1000, 0)} km`);

/** Gravedad (g) del cuerpo: a pie la da Status.json; si no, el escaneo del Journal o Spansh. */
function bodyGravity(s) {
  if (s.status.gravity != null) return Number(s.status.gravity);
  const n = s.status.bodyName || (s.location.approach && s.location.approach.body);
  if (!n) return null;
  const sc = s.bodies && s.bodies[n];
  if (sc && sc.gravity != null) return sc.gravity;
  const sp = ui.bodyInfo[n];
  return sp && sp.gravity != null ? sp.gravity : null;
}
const fmtGravity = (s) => { const g = bodyGravity(s); return g == null ? '—' : `${nf(g, g < 1 ? 2 : 1)} g`; };

function coordControls(s) {
  const t = s.surfaceTarget;
  const msg = ui.coordMsg && Date.now() - ui.coordMsg.at < 5000 ? `<span class="eb ${ui.coordMsg.ok ? 'cyan' : 'red'}">${esc(ui.coordMsg.text)}</span>` : '';
  if (t) {
    const other = t.body && s.status.bodyName && t.body !== s.status.bodyName;
    return `<div class="in" style="padding:10px 12px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;border-color:#5a4524">
        <span style="display:flex;flex-direction:column;min-width:0"><span class="num amber" style="font-size:18px">${nf(t.lat, 4)} · ${nf(t.lon, 4)}</span><span class="eb nowrap" style="font-size:10px">${t.body ? esc(clean(t.body)) : 'Cuerpo sin indicar'}${other ? ' · <span class="red">estás en otro cuerpo</span>' : ''}</span></span>
        <button type="button" class="nav-btn" style="width:110px" data-coord="clear">Quitar</button>
      </div>${msg}`;
  }
  return `<div style="display:grid;grid-template-columns:minmax(0,1fr) 96px 96px;gap:8px">
      <input id="coord-input" class="search" type="text" spellcheck="false" autocomplete="off" placeholder="Lat, Long  (ej. 12.345, -67.89)" value="${esc(ui.coordText)}">
      <button type="button" class="nav-btn" data-coord="paste">Pegar</button>
      <button type="button" class="nav-btn" data-coord="set" style="color:#1a1402;background:var(--amber);border-color:var(--amber)">Fijar</button>
    </div>${msg}`;
}

function compassSvg(nav, size) {
  const C = 160; const hd = nav.heading || 0;
  const ticks = Array.from({ length: 72 }, (_, i) => {
    const a = i * 5; const major = a % 30 === 0; const mid = a % 10 === 0;
    const len = major ? 18 : mid ? 10 : 5;
    return `<line x1="${C}" y1="${C - 132}" x2="${C}" y2="${C - 132 + len}" stroke="${major ? '#9fc2e0' : mid ? '#3d6488' : '#25405e'}" stroke-width="${major ? 2.2 : 1.2}" transform="rotate(${a} ${C} ${C})"/>`;
  }).join('');
  const label = (txt, a, col) => `<text x="${C}" y="${C - 98}" text-anchor="middle" dominant-baseline="middle" font-family="Rajdhani" font-weight="700" font-size="17" fill="${col}" transform="rotate(${a} ${C} ${C}) rotate(${-a + hd} ${C} ${C - 98})">${txt}</text>`;
  const arc = (r, a1, a2) => {
    const p = (a) => [C + r * Math.sin((a * Math.PI) / 180), C - r * Math.cos((a * Math.PI) / 180)];
    const [x1, y1] = p(a1); const [x2, y2] = p(a2);
    return `M${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  };
  const rel = nav.relative; const on = rel != null && Math.abs(rel) <= 8;
  const col = on ? '#49c7e8' : '#f0a443';
  return `<svg viewBox="0 0 320 320" width="${size}" height="${size}" style="display:block;flex:none;overflow:visible">
    <defs>
      <filter id="cglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <radialGradient id="cbg" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#0c2038"/><stop offset="1" stop-color="#050d18"/></radialGradient>
    </defs>
    <!-- arcos decorativos exteriores -->
    <path d="${arc(152, 232, 292)}" fill="none" stroke="#2b5379" stroke-width="3"/>
    <path d="${arc(152, 52, 112)}" fill="none" stroke="#2b5379" stroke-width="3"/>
    <path d="${arc(152, 250, 268)}" fill="none" stroke="#49c7e8" stroke-width="3" opacity=".8" filter="url(#cglow)"/>
    <path d="${arc(152, 70, 88)}" fill="none" stroke="#49c7e8" stroke-width="3" opacity=".8" filter="url(#cglow)"/>
    <circle cx="${C}" cy="${C}" r="142" fill="url(#cbg)" stroke="#1f3a5a"/>
    <circle cx="${C}" cy="${C}" r="134" fill="none" stroke="#49c7e8" stroke-width="1.6" opacity=".55" filter="url(#cglow)"/>
    <!-- mira fija -->
    <line x1="${C - 128}" y1="${C}" x2="${C + 128}" y2="${C}" stroke="#1f4a6e" stroke-width="1"/>
    <line x1="${C}" y1="${C - 128}" x2="${C}" y2="${C + 128}" stroke="#1f4a6e" stroke-width="1"/>
    <circle cx="${C}" cy="${C}" r="92" fill="none" stroke="#1f4a6e" stroke-width="1"/>
    <circle cx="${C}" cy="${C}" r="58" fill="none" stroke="#2b5379" stroke-width="1.2"/>
    <!-- anillo que gira con el rumbo -->
    <g transform="rotate(${-hd} ${C} ${C})">
      ${ticks}
      ${label('N', 0, '#ff6b6b')}${label('E', 90, '#cfe3f5')}${label('S', 180, '#cfe3f5')}${label('O', 270, '#cfe3f5')}
      <g transform="rotate(${nav.bearing} ${C} ${C})"><path d="M${C} ${C - 146} l10 14 l-10 14 l-10 -14 z" fill="#f0a443" filter="url(#cglow)"/></g>
    </g>
    <!-- tu rumbo -->
    <path d="M${C} ${C - 160} l11 18 h-22 z" fill="#cfe3f5" filter="url(#cglow)"/>
    ${rel != null ? `<g transform="rotate(${rel} ${C} ${C})" filter="url(#cglow)"><path d="M${C} ${C - 62} l26 36 h-15 v52 h-22 v-52 h-15 z" fill="${col}"/></g>` : ''}
  </svg>`;
}

function compassBlock(s, nav) {
  if (!nav.sameBody) return '<div class="in empty" style="flex-direction:column;gap:6px"><span class="va" style="font-size:18px;color:var(--soft)">El destino está en otro cuerpo</span><span style="font-size:14px">La brújula aparecerá al acercarte al cuerpo donde lo fijaste.</span></div>';
  const rel = nav.relative;
  const ahead = rel != null && Math.abs(rel) <= 5;
  const turn = rel == null ? 'Sin rumbo' : ahead ? 'De frente' : Math.abs(rel) >= 165 ? 'Detrás · da la vuelta' : `Gira ${nf(Math.abs(rel), 0)}° a la ${rel > 0 ? 'derecha' : 'izquierda'}`;
  const box = (label, value, cls) => `<div class="chamf"><div style="padding:8px 10px;display:flex;flex-direction:column;gap:2px"><span class="eb" style="font-size:10px">${label}</span><span class="num ${cls || ''}" style="font-size:20px">${value}</span></div></div>`;
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:12px;min-height:0;flex:1;justify-content:center">
      ${compassSvg(nav, 370)}
      <div style="display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:8px;width:100%">
        <div class="chamf amber"><div style="padding:12px 14px;display:flex;flex-direction:column;gap:6px;height:100%">
          <span class="eb">Distancia</span>
          <span class="num amber" style="font-size:40px;line-height:1">${fmtDist(nav.distance)}</span>
          <span class="va ${ahead ? 'cyan' : ''}" style="font-size:18px">${turn}</span>
        </div></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
          ${box('Rumbo obj.', `${nf(nav.bearing, 0)}°`, 'amber')}${box('Tu rumbo', nav.heading != null ? `${nav.heading}°` : '—')}
          ${box('Altitud', s.status.altitude != null ? fmtDist(s.status.altitude) : '—')}${box('Gravedad', fmtGravity(s))}
        </div>
      </div>
    </div>`;
}

async function coordAction(kind) {
  const say = (ok, text) => { ui.coordMsg = { ok, text, at: Date.now() }; render(); setTimeout(render, 5100); };
  if (kind === 'paste') {
    let text = '';
    try { text = await window.edbubble.clipboardRead(); } catch (e) { reportError('pegar', e.message); }
    if (!text.trim()) { say(false, 'El portapapeles está vacío o no tiene texto'); return; }
    ui.coordText = text.trim(); render(); return;
  }
  if (kind === 'clear') { await window.edbubble.targetClear(); ui.coordText = ''; say(true, 'Destino quitado'); return; }
  const r = await window.edbubble.targetSet(ui.coordText);
  say(r.ok, r.ok ? 'Destino fijado' : r.error);
}

/* Filtro de estaciones por tipo con iconos (Navegación y Vuelo). scope: 'sys' | 'here' */
const KIND_ORDER = ['Coriolis', 'Orbis', 'Ocellus', 'Dodec', 'Base en asteroide', 'Puesto orbital', 'Puerto planetario', 'Puesto planetario', 'Asentamiento', 'Construcción orbital', 'Construcción en superficie', 'Meganave', 'Portanaves bastión', 'Fleet carrier'];
function stationFilter(list, scope, compact) {
  const K = scope === 'here' ? 'hereKinds' : 'sysKinds'; const Lk = scope === 'here' ? 'hereLarge' : 'sysLarge';
  const kinds = [];
  for (const st of list) {
    const k = kinds.find((x) => x.label === st.label);
    if (k) k.n += 1; else kinds.push({ label: st.label, icon: st.icon, obra: /^Construcción/.test(st.label), bastion: !!st.bastion, n: 1 });
  }
  const ord = (l) => { const i = KIND_ORDER.indexOf(l); return i < 0 ? 99 : i; };
  kinds.sort((a, b) => ord(a.label) - ord(b.label));
  ui[K] = ui[K].filter((k) => kinds.some((x) => x.label === k));
  const shown = list.filter((st) => (!ui[K].length || ui[K].includes(st.label)) && (!ui[Lk] || st.pad === 'L'));
  const filtering = ui[K].length > 0 || ui[Lk];
  const tag = (k) => (k.obra ? `<span class="kf-obra">${compact ? 'Constr.' : 'Construcción'}</span>` : k.bastion ? '<span class="kf-obra">Bastión</span>' : '');
  const bar = `
    <div class="kf-bar${compact ? ' sm' : ''}">
      <button type="button" class="kf all${filtering ? '' : ' on'}" data-kind="" data-kscope="${scope}" title="Todas">Todas</button>
      ${kinds.map((k) => `<button type="button" class="kf${ui[K].includes(k.label) ? ' on' : ''}" data-kind="${esc(k.label)}" data-kscope="${scope}" title="${esc(k.label)}">${k.icon ? `<img src="icons/${k.icon}.png" alt="">` : '<span class="soft">?</span>'}${tag(k)}<span class="num">${k.n}</span></button>`).join('')}
      <button type="button" class="kf${ui[Lk] ? ' on' : ''}" data-kind="L" data-kscope="${scope}" title="Solo con plataforma grande" style="margin-left:auto"><span class="pad pad-L" style="width:${compact ? 20 : 24}px;height:${compact ? 20 : 24}px;font-size:${compact ? 11 : 13}px">L</span>Solo L</button>
    </div>`;
  return { bar, shown, filtering, kinds };
}

/* ---------- Vuelo: estaciones y portanaves del sistema actual (Spansh) ---------- */
const HERE_PAGE = 6;
function hereCard(s) {
  const h = ui.here;
  const sys = clean(s.location.system);
  const fresh = h && h.system && sys && h.system.toLowerCase() === sys.toLowerCase();
  let body;
  const all = fresh && h.stations ? h.stations : [];
  const { bar, shown: list, filtering } = stationFilter(all, 'here', true);
  const pages = Math.max(1, Math.ceil(list.length / HERE_PAGE));
  ui.herePage = Math.min(ui.herePage, pages - 1);
  if (!sys) body = '<div class="empty">Sin sistema actual.</div>';
  else if (!fresh) body = `<div class="empty">${h && h.error ? `Spansh no responde: ${esc(h.error)}` : 'Buscando estaciones en Spansh…'}</div>`;
  else if (!list.length) body = `<div class="empty">${filtering ? 'Ninguna con este filtro.' : 'Spansh no tiene estaciones en este sistema.'}</div>`;
  else {
    body = list.slice(ui.herePage * HERE_PAGE, (ui.herePage + 1) * HERE_PAGE).map((st) => `
      <div class="in" style="display:grid;grid-template-columns:40px minmax(0,1fr) auto 34px;gap:10px;align-items:center;padding:6px 10px;height:58px${st.bastion ? ';border-color:#5a4524' : ''}">
        ${st.icon ? `<img src="icons/${st.icon}.png" alt="" style="width:38px;height:38px;object-fit:contain">` : '<span></span>'}
        <span style="display:flex;flex-direction:column;min-width:0"><span class="va nowrap" style="font-size:16px">${esc(siteName(st.name))}</span><span class="eb nowrap ${st.bastion ? 'amber' : 'dim'}" style="font-size:10px">${esc(st.label)}${st.bastion && st.faction ? ` · ${esc(st.faction)}` : ''}</span></span>
        <span class="num soft" style="font-size:14px">${st.distance != null ? `${nf(st.distance, 0)} ls` : '—'}</span>
        <span class="pad pad-${st.pad || 'x'}">${st.pad || '?'}</span>
      </div>`).join('');
  }
  const pager = pages > 1 ? `<span style="display:flex;align-items:center;gap:6px"><button type="button" class="pg" data-pager="here" data-d="-1" ${ui.herePage === 0 ? 'disabled' : ''}>‹</button><span class="num soft" style="font-size:13px">${ui.herePage + 1}/${pages}</span><button type="button" class="pg" data-pager="here" data-d="1" ${ui.herePage >= pages - 1 ? 'disabled' : ''}>›</button></span>` : '';
  return `
    <section class="pn card" style="flex:1;min-height:0;overflow:hidden">
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><span class="ti nowrap" style="font-size:16px">En este sistema${fresh ? ` <span class="eb dim">· ${filtering ? `${list.length}/` : ''}${all.length}</span>` : ''}</span>${pager}</div>
      ${fresh && all.length > 1 ? bar : ''}
      <div style="display:flex;flex-direction:column;gap:4px;min-height:0">${body}</div>
      ${fresh && list.some((x) => x.carrier && !x.bastion) ? '<span class="soft" style="font-size:12px;margin-top:auto">Según Spansh: los portanaves de jugadores pueden haberse movido.</span>' : ''}
    </section>`;
}

/* ---------- Órbita planetaria ---------- */
const SIGNAL_LABEL = { biological: 'Biológicas', geological: 'Geológicas', human: 'Humanas', thargoid: 'Thargoid', guardian: 'Guardianes', other: 'Otras', planetanomaly: 'Anomalías', 'planetary mining location': 'Zonas de minería' };
const sigKey = (x) => (x.key || String(x.name || '').toLowerCase());
const fmtCr = (n) => (n == null ? '—' : n >= 1e6 ? `${nf(n / 1e6, 1)} M CR` : `${nf(n)} CR`);

function orbitBody(s) {
  const name = clean(s.status.bodyName) || (s.location.approach && s.location.approach.body) || null;
  if (!name) return null;
  const jb = (s.bodies && s.bodies[name]) || {};
  const sp = ui.bodyInfo[name] || null;
  // señales: las del Journal (escaneo) y, si falta alguna, las de Spansh
  const count = (k) => {
    const x = (jb.signals || []).find((y) => sigKey(y) === k) || ((sp && sp.signals) || []).find((y) => sigKey(y) === k);
    return x ? x.count : null;
  };
  const signals = jb.signals || (sp && sp.signals) || [];
  // anillos: puntos calientes del Journal (DSS) o de Spansh
  const ringNames = jb.rings && jb.rings.length ? jb.rings : sp ? sp.rings.map((r) => r.name) : [];
  const rings = ringNames.map((rn) => {
    const jr = s.bodies && s.bodies[rn];
    const spr = sp && sp.rings.find((r) => r.name === rn);
    const hot = jr && jr.signals && jr.signals.length ? jr.signals : spr ? spr.signals : [];
    return { name: rn, short: rn.startsWith(name) ? rn.slice(name.length).trim() : rn, type: spr && spr.type, hotspots: hot };
  });
  const scans = jb.id != null && s.bio ? s.bio[jb.id] || {} : {};
  return { name, jb, sp, signals, bio: count('biological'), geo: count('geological'), zones: count('planetary mining location'), rings, scans };
}

function screenOrbita(s, v) {
  const fl = s.status.flags || {};
  const b = orbitBody(s);
  const near = fl.hasLatLong;
  const approachStats = near
    ? `<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px">
         ${stat('Altitud', s.status.altitude != null ? fmtDist(s.status.altitude) : '—')}${stat('Rumbo', s.status.heading != null ? `${s.status.heading}°` : '—')}
         ${stat('Latitud', nf(s.status.latitude, 4))}${stat('Longitud', nf(s.status.longitude, 4))}
       </div>`
    : '';
  const left = `
    <section class="pn card" style="min-height:0;overflow:hidden">
      <div style="display:flex;justify-content:space-between;gap:10px"><span class="ti nowrap" style="font-size:16px">Destino en superficie</span><span class="eb dim">${s.surfaceTarget ? 'Destino fijado' : 'Pega o escribe unas coordenadas'}</span></div>
      ${coordControls(s)}
      ${approachStats}
      ${s.surfaceTarget && v.surfaceNav ? compassBlock(s, v.surfaceNav) : near ? '<div class="in empty" style="flex:1;flex-direction:column;gap:6px"><span class="va" style="font-size:18px;color:var(--soft)">Sin destino fijado</span><span style="font-size:14px">Fija unas coordenadas o una especie de la lista de exobiología y aparecerá la brújula.</span></div>' : '<div class="in empty" style="flex:1;flex-direction:column;gap:6px"><span class="va" style="font-size:18px;color:var(--soft)">Lejos de un planeta</span><span style="font-size:14px">La brújula funciona al entrar en la órbita del cuerpo (vuelo orbital, planeo o en superficie).</span></div>'}
    </section>`;

  if (!b) {
    return `<div style="display:grid;grid-template-columns:minmax(0,1fr) 640px;gap:12px;min-height:0">${left}
      <section class="pn card"><span class="ti" style="font-size:16px">Cuerpo</span><div class="empty" style="flex-direction:column;gap:6px"><span class="va" style="font-size:18px;color:var(--soft)">No estás cerca de un cuerpo</span><span style="font-size:14px">Al acercarte a un planeta verás su gravedad, exobiología y minería.</span></div></section></div>`;
  }
  const jb = b.jb; const sp = b.sp || {};
  const cls = jb.planetClass || sp.subtype || '—';
  const temp = jb.temperature != null ? jb.temperature : sp.temperature;
  const atmo = jb.atmosphere != null ? jb.atmosphere : sp.atmosphere;
  const landable = jb.landable != null ? jb.landable : sp.landable;
  const bodyCard = `
    <section class="pn card">
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline"><span class="ti nowrap" style="font-size:16px">Cuerpo</span><span class="eb ${landable ? 'cyan' : 'dim'}">${landable == null ? '' : landable ? 'Se puede aterrizar' : 'No se puede aterrizar'}</span></div>
      <span class="va nowrap" style="font-size:22px">${esc(b.name)}</span>
      <span class="eb dim nowrap">${esc(cls)}${atmo ? ` · ${esc(atmo)}` : ''}</span>
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">
        ${stat('Gravedad', fmtGravity(s))}${stat('Temperatura', temp != null ? `${nf(temp, 0)} K` : '—')}${stat('Radio', (jb.radius || sp.radius || s.status.planetRadius) ? `${nf(jb.radius ? jb.radius / 1000 : sp.radius || s.status.planetRadius / 1000, 0)} km` : '—')}
      </div>
      ${jb.gravity == null && jb.temperature == null && sp.gravity == null && sp.temperature == null ? `<div class="in" style="display:flex;flex-direction:column;gap:4px;padding:10px 12px;border-color:var(--amber);border-left:3px solid var(--amber)">
        <span class="eb amber">Este cuerpo no está escaneado en Spansh</span>
        <span style="font-size:14px">Nadie ha subido aún sus datos, y en tu diario tampoco hay escaneo. <b>Escanéalo con el FSS</b> (o con sondas, el DSS) y la gravedad, la temperatura y el resto aparecerán aquí. Si usas EDMC, tu escaneo llegará también a Spansh para los demás.</span>
      </div>` : ''}
    </section>`;

  // Exobiología: señales, géneros (DSS), muestras tomadas y especies conocidas (Spansh)
  const genuses = jb.genuses || [];
  const scanned = Object.entries(b.scans);
  const species = sp.species || [];
  // predicción de especies (core/biopredict.js con las reglas de SrvSurvey), agrupada por especie
  const preds = sp.predictions || [];
  const predGroups = [];
  for (const p of preds) {
    let g = predGroups.find((x) => x.species === p.species);
    if (!g) predGroups.push(g = { species: p.species, genus: p.genus, variants: [], unsure: true });
    if (p.variant) g.variants.push(p.variant);
    if (!p.unsure) g.unsure = false;
  }
  const GENUS_OF = { Bacterial: 'Bacterium', Fonticulus: 'Fonticulua', Shrubs: 'Frutexa', Tussocks: 'Tussock', Cactoid: 'Cactoida', Clypeus: 'Clypeus', Conchas: 'Concha', Electricae: 'Electricae', Fumerolas: 'Fumerola', Fungoids: 'Fungoida', Osseus: 'Osseus', Recepta: 'Recepta', Stratum: 'Stratum', Tubus: 'Tubus', Aleoids: 'Aleoida', Vents: 'Amphora Plant', Sphere: 'Luteolum Anemone', Cone: 'Bark Mounds', Brancae: 'Brain Trees', Ground_Struct_Ice: 'Crystalline Shards', Tubers: 'Roseum Sinuous Tubers' };
  const predForGenus = (g) => { const k = GENUS_OF[String(g.key || '').replace(/^\$Codex_Ent_|_Genus_Name;$/g, '')]; return k ? predGroups.filter((x) => x.genus === k) : []; };
  const shortSp = (x) => x.species.split(' ').slice(1).join(' ') || x.species;
  const dots = (n) => `<span style="display:inline-flex;gap:4px">${[1, 2, 3].map((i) => `<span class="dot ${i <= n ? 'on' : ''}"></span>`).join('')}</span>`;
  const bioRows = [
    ...scanned.map(([, x]) => `<div class="in" style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:8px 12px"><span style="display:flex;flex-direction:column;min-width:0"><span class="va nowrap" style="font-size:15px">${esc(x.species || x.genus)}</span><span class="eb dim" style="font-size:10px">${x.step >= 3 ? 'Análisis completo' : `Muestra ${x.step} de 3`}</span></span>${dots(x.step)}</div>`),
    ...genuses.filter((g) => !b.scans[g.key]).map((g) => { const pg = predForGenus(g); return `<div class="in" style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:8px 12px"><span style="display:flex;flex-direction:column;min-width:0"><span class="va nowrap" style="font-size:15px">${esc(g.name)}</span>${pg.length ? `<span class="eb cyan nowrap" style="font-size:10px" title="${esc(pg.map((x) => `${x.species}: ${x.variants.join(', ')}`).join(' · '))}">Posible: ${esc(pg.map(shortSp).join(' · '))}</span>` : ''}</span><span class="eb dim" style="font-size:10px">Sin muestras</span></div>`; }),
    ...(genuses.length || scanned.length || species.length || b.bio === 0 ? [] : predGroups.map((x) => `<div class="in" style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:6px 12px"><span style="display:flex;flex-direction:column;min-width:0"><span class="va nowrap" style="font-size:15px">${esc(x.species)}</span><span class="eb dim nowrap" style="font-size:10px">${esc(x.variants.join(', '))}</span></span><span class="eb ${x.unsure ? 'amber' : 'cyan'}" style="font-size:10px" title="${x.unsure ? 'Faltan datos del cuerpo (por ejemplo, la composición de la atmósfera): escanéalo para afinar' : ''}">${x.unsure ? 'Posible ?' : 'Posible'}</span></div>`)),
    ...(genuses.length || scanned.length ? [] : species.map((x) => `<div class="in" style="display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:10px;align-items:center;padding:6px 12px"><span style="display:flex;flex-direction:column;min-width:0"><span class="va nowrap" style="font-size:15px">${esc(x.species)}</span><span class="eb dim" style="font-size:10px">${fmtCr(x.value)} · ${x.count} conocida${x.count === 1 ? '' : 's'}</span></span>${x.lat != null ? `<button type="button" class="tab small" data-spot="${x.lat},${x.lon}" title="Fijar como destino la primera posición conocida">Fijar</button>` : '<span></span>'}</div>`)),
  ];
  const BIO_PAGE = 4;
  const bioPages = Math.max(1, Math.ceil(bioRows.length / BIO_PAGE));
  ui.bioPage = Math.min(ui.bioPage, bioPages - 1);
  const bioPager = bioPages > 1 ? `<span style="display:flex;align-items:center;gap:6px"><button type="button" class="pg" data-pager="bio" data-d="-1" ${ui.bioPage === 0 ? 'disabled' : ''}>‹</button><span class="num soft" style="font-size:13px">${ui.bioPage + 1}/${bioPages}</span><button type="button" class="pg" data-pager="bio" data-d="1" ${ui.bioPage >= bioPages - 1 ? 'disabled' : ''}>›</button></span>` : '';
  const bioSource = scanned.length || genuses.length ? `Tus escaneos${predGroups.length ? ' · posibles especies: reglas de SrvSurvey' : ''}` : species.length ? 'Especies conocidas · Spansh' : predGroups.length && b.bio !== 0 ? `Predicción con las reglas de SrvSurvey · datos ${sp.predictionSource === 'journal' ? 'de tu escaneo' : 'de Spansh'}${sp.region ? ` · ${sp.region}` : ''}` : '';
  const bioCard = `
    <section class="pn card" style="min-height:0">
      <div style="display:flex;justify-content:space-between;align-items:center"><span class="ti" style="font-size:16px">Exobiología</span>${bioPager}</div>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">${stat('Señales biológicas', b.bio != null ? nf(b.bio) : '—', b.bio ? 'cyan' : '')}${stat('Muestras completas', `${scanned.filter(([, x]) => x.step >= 3).length}${b.bio ? ` / ${b.bio}` : ''}`)}</div>
      ${bioSource ? `<span class="eb dim" style="font-size:10px">${bioSource}</span>` : ''}
      <div style="display:flex;flex-direction:column;gap:4px">${bioRows.slice(ui.bioPage * BIO_PAGE, (ui.bioPage + 1) * BIO_PAGE).join('') || `<span class="soft" style="font-size:14px">${b.bio ? 'Escanea el cuerpo con el DSS para ver los géneros.' : 'Sin señales biológicas conocidas.'}</span>`}</div>
    </section>`;

  const ringRows = b.rings.map((r) => `<div class="in" style="display:flex;flex-direction:column;gap:4px;padding:8px 12px">
      <span style="display:flex;justify-content:space-between;gap:10px"><span class="va nowrap" style="font-size:15px">${esc(r.short || r.name)}</span><span class="eb dim" style="font-size:10px">${esc(r.type || '')}</span></span>
      <span style="display:flex;flex-wrap:wrap;gap:6px">${r.hotspots.length ? r.hotspots.map((h) => `<span class="chip on" style="font-size:12px">${esc(h.name)} × ${h.count}</span>`).join('') : '<span class="soft" style="font-size:13px">Sin puntos calientes conocidos (escanea el anillo con el DSS)</span>'}</span>
    </div>`).slice(0, 2).join('');
  const mineCard = `
    <section class="pn card" style="min-height:0">
      <span class="ti" style="font-size:16px">Minería</span>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">${stat('Señales geológicas', b.geo != null ? nf(b.geo) : '—', b.geo ? 'cyan' : '')}${stat('Zonas de minería', b.zones != null ? nf(b.zones) : '—', b.zones ? 'cyan' : '')}</div>
      ${ringRows || '<span class="soft" style="font-size:14px">Este cuerpo no tiene anillos.</span>'}
    </section>`;

  return `<div style="display:grid;grid-template-columns:minmax(0,1fr) 640px;gap:12px;min-height:0">
    ${left}
    <div style="display:flex;flex-direction:column;gap:12px;min-height:0">${bodyCard}${bioCard}${mineCard}</div>
  </div>`;
}

/* ---------- A pie ---------- */
// Nombres del juego en español (los mismos que core/odymods.js).
const SUIT_MODS = {
  suit_increasedmeleedamage: 'Daño cuerpo a cuerpo añadido',
  suit_adsmovementspeed: 'Movimiento de velocidad de Combate',
  suit_improvedarmourrating: 'Resistencia al daño',
  suit_improvedradar: 'Seguimiento Mejorado',
  suit_quieterfootsteps: 'Pasos Silenciosos',
  suit_increasedammoreserves: 'Capacidad de munición adicional',
  suit_backpackcapacity: 'Capacidad De Mochila Adicional',
  suit_improvedbatterycapacity: 'Mejora de capacidad de Batería',
  suit_increasedshieldregen: 'Regeneración de escudo rápida',
  suit_reducedtoolbatteryconsumption: 'Consumo De Batería Reducido',
  suit_improvedjumpassist: 'Mejora de asistencia de salto',
  suit_increasedo2capacity: 'Reservas de oxígeno aumentadas',
  suit_increasedsprintduration: 'Aumento de duración del sprint',
  suit_nightvision: 'Visión Nocturna',
  suit_improvedmeleedamage: 'Daño cuerpo a cuerpo añadido',
  suit_enhancedtracking: 'Seguimiento Mejorado',
  suit_increasedbatterycapacity: 'Mejora de capacidad de Batería',
};
const WEAPON_MODS = {
  weapon_headshotdamage: 'Daño a la cabeza',
  weapon_clipsize: 'Tamaño de cargador',
  weapon_backpackreloading: 'Recarga guardada',
  weapon_scope: 'Visor',
  weapon_suppression_pressurised: 'Silenciador',
  weapon_suppression_unpressurised: 'Enmascaramiento de Audio',
  weapon_handling: 'Manejo rápido',
  weapon_range: 'Mayor Alcance',
  weapon_reloadspeed: 'Velocidad de recarga',
  weapon_stability: 'Estabilidad',
  weapon_accuracy: 'Precisión desde la cadera mejorada',
  weapon_stowedreloading: 'Recarga guardada',
  weapon_audiomasking: 'Enmascaramiento de Audio',
};
const modName = (m) => SUIT_MODS[m] || WEAPON_MODS[m] || String(m).replace(/^(suit|weapon)_/, '').replace(/_/g, ' ');
const SLOT_NAME = { PrimaryWeapon1: 'Principal 1', PrimaryWeapon2: 'Principal 2', SecondaryWeapon: 'Secundaria' };
const gradePill = (g) => (g ? `<span class="grade g${g}">G${g}</span>` : '');
const fmtCrShort = (n) => (n == null ? '' : n >= 1e6 ? `${(n / 1e6).toLocaleString('es-ES', { maximumFractionDigits: 3 })} M CR` : `${nf(n / 1e3, 0)} k CR`);
/** Línea de mejora al siguiente grado de un traje o arma. */
function upgradeLine(u, grade) {
  if (!grade) return '';
  if (!u) return grade >= 5 ? '<span class="eb dim" style="font-size:10px">Grado máximo</span>' : '';
  return `<span style="display:flex;flex-direction:column;gap:4px">
    <span class="eb ${u.ready ? 'cyan' : 'amber'}" style="font-size:10px">${u.ready ? `Listo para G${u.to}` : `Para G${u.to} faltan ${u.missing}`}${u.credits ? ` · ${fmtCrShort(u.credits)}` : ''}</span>
    <span style="display:flex;flex-wrap:wrap;gap:4px">${u.materials.map((m) => `<span class="upm ${m.ok ? 'ok' : ''}" title="${esc(m.name)}: tienes ${m.have}, hacen falta ${m.need}">${esc(m.name)} <b>${m.have}/${m.need}</b></span>`).join('')}</span>
  </span>`;
}
const LOCK_TABS = [['items', 'Bienes'], ['components', 'Componentes'], ['data', 'Datos'], ['consumables', 'Consumibles']];

const slotPill = (m) => (m ? `<span class="eb ${m.free ? 'cyan' : 'dim'}" style="font-size:10px" title="Ranuras para mejoras de ingeniero: una por grado a partir de G2">${m.used}/${m.slots} ranuras</span>` : '');
const ACCESS = { yes: ['cyan', 'Con acceso'], known: ['amber', 'Conocido, sin acceso'], no: ['dim', 'Sin desbloquear'] };
const MOD_PAGE = 7;
/** Mejoras de ingeniero para la pieza elegida del equipo (traje o arma). */
function modsPanel(l, mods) {
  const target = ui.modTarget === 'suit' ? 'suit' : l.weapons.find((w) => String(w.id) === String(ui.modTarget)) ? ui.modTarget : 'suit';
  const piece = target === 'suit' ? l.suit : l.weapons.find((w) => String(w.id) === String(target));
  const m = mods ? (target === 'suit' ? mods.suit : mods.weapons[piece.id]) : null;
  const picks = `<div style="display:flex;gap:6px;flex-wrap:wrap">${[['suit', 'Traje'], ...l.weapons.map((w) => [w.id, SLOT_NAME[w.slot] || w.name])].map(([k, t]) => `<button type="button" class="tab small ${String(k) === String(target) ? 'on' : ''}" data-modtarget="${esc(k)}">${esc(t)}</button>`).join('')}</div>`;
  if (!m) return `${picks}<div class="empty">Sin datos de este equipo.</div>`;
  const TYPE = { kinetic: 'cinética', laser: 'láser', plasma: 'plasma' };
  const slotsLine = !m.slots ? `<span class="eb amber">En G1 no tiene ranuras: súbelo a G2 para montar la primera mejora</span>`
    : !m.free ? `<span class="eb amber">Las ${m.slots} ranuras están ocupadas${m.slots < 4 ? `: sube a G${m.slots + 2} para otra mejora` : ''}</span>`
    : `<span class="eb cyan">${m.free} ranura${m.free > 1 ? 's' : ''} libre${m.free > 1 ? 's' : ''} de ${m.slots}${m.type ? ` · arma ${TYPE[m.type]}` : ''}</span>`;
  const open = ui.modOpen && m.list.find((x) => x.id === ui.modOpen);
  if (open) {
    return `${picks}
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span style="display:flex;flex-direction:column;min-width:0"><span class="va nowrap" style="font-size:18px">${esc(open.name)}</span><span class="eb dim" style="font-size:10px">${esc(open.en)}</span></span><button type="button" class="tab small" data-modopen="">‹ Volver</button></div>
      <span class="eb ${open.installed ? 'dim' : open.ready ? 'cyan' : 'amber'}">${open.installed ? 'Ya la lleva' : open.ready ? 'Tienes todos los materiales' : `Faltan ${open.missing}`}</span>
      <span style="display:flex;flex-wrap:wrap;gap:4px">${open.materials.map((x) => `<span class="upm ${x.ok ? 'ok' : ''}">${esc(x.name)} <b>${x.have}/${x.need}</b></span>`).join('')}</span>
      <span class="eb dim" style="margin-top:4px">Ingenieros que la montan</span>
      <div style="display:flex;flex-direction:column;gap:4px">${open.engineers.map((e) => `<div class="in" style="display:flex;flex-direction:column;gap:2px;padding:7px 12px">
        <span style="display:flex;justify-content:space-between;gap:8px"><span class="va nowrap">${esc(e.name)}</span><span class="eb ${ACCESS[e.access][0]}" style="font-size:10px">${ACCESS[e.access][1]}</span></span>
        <span class="soft nowrap" style="font-size:12px">${esc(e.site)} · ${esc(e.system)}${e.colonia ? ' · Colonia' : ''}</span>
        ${e.access !== 'yes' && e.unlock ? `<span class="soft" style="font-size:12px">${esc(e.unlock)}</span>` : ''}
      </div>`).join('')}</div>`;
  }
  const avail = m.list.filter((x) => !x.installed);
  const pages = Math.max(1, Math.ceil(avail.length / MOD_PAGE));
  ui.modPage = Math.min(ui.modPage, pages - 1);
  const rows = avail.slice(ui.modPage * MOD_PAGE, (ui.modPage + 1) * MOD_PAGE).map((x) => {
    const eng = x.engineers.find((e) => e.access === 'yes');
    const state = x.installed ? ['dim', 'Montada'] : x.ready ? ['cyan', 'Listo'] : ['amber', `Faltan ${x.missing}`];
    return `<button type="button" class="in modrow" data-modopen="${esc(x.id)}" style="display:flex;flex-direction:column;gap:2px;padding:7px 12px;text-align:left">
      <span style="display:flex;justify-content:space-between;gap:8px;width:100%"><span class="va nowrap">${esc(x.name)}</span><span class="eb ${state[0]}" style="font-size:10px">${state[1]}</span></span>
      <span class="soft nowrap" style="font-size:12px">${eng ? `${esc(eng.name)} · ${esc(eng.system)}` : 'Ningún ingeniero con acceso'}</span>
    </button>`;
  }).join('') || '<div class="empty">Ya lleva todas las mejoras posibles</div>';
  return `${picks}${slotsLine}<div style="display:flex;flex-direction:column;gap:4px">${rows}</div>
    <span style="display:flex;justify-content:space-between;align-items:center;margin-top:auto"><span class="eb dim" style="font-size:10px">Toca una mejora para ver materiales e ingenieros</span>${pager2('mod', ui.modPage, pages)}</span>`;
}

function screenApie(s, v) {
  const st = s.status; const fl = st.flags || {};
  const onFoot = fl.isOnFoot;
  const pct = (x) => (x == null || x === '' ? '—' : `${nf(Number(x) * 100, 0)} %`);
  const tempC = st.temperature != null && st.temperature !== '' ? `${nf(Number(st.temperature) - 273.15, 0)} °C` : '—';
  const low = (x) => x != null && x !== '' && Number(x) < 0.25;
  const left = `
    <section class="pn card" style="min-height:0;overflow:hidden">
      <div style="display:flex;justify-content:space-between;gap:10px"><span class="ti" style="font-size:16px">Estado</span><span class="eb ${onFoot ? 'cyan' : 'dim'}">${onFoot ? 'A pie' : 'En la nave'}</span></div>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">
        ${stat('Oxígeno', pct(st.oxygen), low(st.oxygen) ? 'red' : '')}${stat('Salud', pct(st.health), low(st.health) ? 'red' : '')}
        ${stat('Temperatura', tempC)}${stat('Gravedad', fmtGravity(s))}
      </div>
      ${onFoot ? `<span class="eb dim nowrap">${esc(clean(st.bodyName) || '')}${st.latitude != null ? ` · ${nf(st.latitude, 4)}, ${nf(st.longitude, 4)}` : ''}</span>` : ''}
      ${s.surfaceTarget && v.surfaceNav ? compassBlock(s, v.surfaceNav) : `<div class="in empty" style="flex:1;flex-direction:column;gap:6px"><span class="va" style="font-size:17px;color:var(--soft)">Sin destino</span><span style="font-size:14px">Fija unas coordenadas en Órbita planetaria y aquí verás la brújula.</span></div>`}
    </section>`;

  const of = s.onfoot || {};
  const l = of.loadout != null ? of.loadouts[of.loadout] : null;
  let eq;
  if (!l) eq = '<div class="empty" style="flex-direction:column;gap:6px"><span class="va" style="font-size:18px;color:var(--soft)">Sin equipo conocido</span><span style="font-size:14px">Aparece al elegir un equipo en el casillero o al bajar de la nave.</span></div>';
  else {
    eq = `
      <span class="eb dim">Equipo · ${esc(l.name || '—')}</span>
      <div class="in modpick ${ui.lockSrc === 'mods' && ui.modTarget === 'suit' ? 'sel' : ''}" data-modtarget="suit" style="display:flex;flex-direction:column;gap:6px;padding:10px 12px">
        <span style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span class="va" style="font-size:20px">${esc(l.suit.name)}</span><span style="display:flex;gap:6px;align-items:center">${slotPill(v.mods && v.mods.suit)}${gradePill(l.suit.grade)}</span></span>
        <span style="display:flex;flex-wrap:wrap;gap:5px">${l.suit.mods.map((m) => `<span class="chip">${esc(modName(m))}</span>`).join('') || '<span class="soft" style="font-size:13px">Sin mejoras</span>'}</span>
        ${upgradeLine(v.upgrades && v.upgrades.suit, l.suit.grade)}
      </div>
      ${l.weapons.map((w) => `<div class="in modpick ${ui.lockSrc === 'mods' && String(ui.modTarget) === String(w.id) ? 'sel' : ''}" data-modtarget="${esc(w.id)}" style="display:flex;flex-direction:column;gap:6px;padding:10px 12px">
        <span style="display:flex;justify-content:space-between;align-items:center;gap:10px"><span style="display:flex;flex-direction:column;min-width:0"><span class="va nowrap" style="font-size:17px">${esc(w.name)}</span><span class="eb dim" style="font-size:10px">${esc(SLOT_NAME[w.slot] || w.slot || '')}</span></span><span style="display:flex;gap:6px;align-items:center">${slotPill(v.mods && v.mods.weapons[w.id])}${gradePill(w.grade)}</span></span>
        <span style="display:flex;flex-wrap:wrap;gap:5px">${w.mods.map((m) => `<span class="chip">${esc(modName(m))}</span>`).join('') || '<span class="soft" style="font-size:13px">Sin mejoras</span>'}</span>
        ${upgradeLine(v.upgrades && v.upgrades.weapons[w.id], w.grade)}
      </div>`).join('')}`;
  }
  const others = Object.values(of.loadouts || {}).filter((x) => x !== l);
  const eqCard = `<section class="pn card" style="min-height:0;overflow:hidden">
      <span class="ti" style="font-size:16px">Equipo actual</span>${eq}
      ${others.length ? `<span class="eb dim" style="margin-top:auto">Otros equipos: ${others.slice(0, 4).map((x) => `${esc(x.name)} (${esc(x.suit.name)} G${x.suit.grade || '?'})`).join(' · ')}</span>` : ''}
    </section>`;

  // Taquilla o mochila
  const src = ui.lockSrc === 'backpack' && of.backpack ? of.backpack : of.locker;
  let lock;
  if (!src) lock = '<div class="empty">El juego aún no ha guardado tu taquilla (ShipLocker.json).</div>';
  else {
    const list = src[ui.lockTab] || [];
    const per = 10; const pages = Math.max(1, Math.ceil(list.length / per));
    ui.lockPage = Math.min(ui.lockPage, pages - 1);
    lock = `
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px">${LOCK_TABS.map(([k, t]) => `<button type="button" class="tab small ${ui.lockTab === k ? 'on' : ''}" data-locktab="${k}" style="white-space:nowrap;min-width:0" title="${(src[k] || []).reduce((a, x) => a + x.count, 0)} en total">${t}</button>`).join('')}</div>
      <span class="eb dim">${nf(list.reduce((a, x) => a + x.count, 0))} en total · ${list.length} tipos</span>
      <div style="display:flex;flex-direction:column;gap:4px">${list.slice(ui.lockPage * per, (ui.lockPage + 1) * per).map((x) => `<div class="in" style="display:flex;justify-content:space-between;gap:10px;padding:7px 12px"><span class="va nowrap">${esc(x.name)}${x.mission ? ' <span class="eb amber" style="font-size:10px">misión</span>' : ''}</span><span class="num">${nf(x.count)}</span></div>`).join('') || '<div class="empty">Vacío</div>'}</div>
      <span style="display:flex;justify-content:flex-end;margin-top:auto">${pager2('lock', ui.lockPage, pages)}</span>`;
  }
  const hasPack = of.backpack && ['items', 'components', 'data', 'consumables'].some((k) => (of.backpack[k] || []).length);
  const showMods = ui.lockSrc === 'mods' && l;
  const title = showMods ? 'Mejoras de ingeniero' : ui.lockSrc === 'backpack' && hasPack ? 'Mochila' : 'Taquilla de la nave';
  const lockCard = `<section class="pn card" style="min-height:0;overflow:hidden">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span class="ti nowrap" style="font-size:16px">${title}</span>
        <span style="display:flex;gap:6px"><button type="button" class="tab small ${!showMods && ui.lockSrc !== 'backpack' ? 'on' : ''}" data-locksrc="locker">Taquilla</button>${hasPack ? `<button type="button" class="tab small ${!showMods && ui.lockSrc === 'backpack' ? 'on' : ''}" data-locksrc="backpack">Mochila</button>` : ''}${l ? `<button type="button" class="tab small ${showMods ? 'on' : ''}" data-locksrc="mods">Mejoras</button>` : ''}</span></div>
      ${showMods ? modsPanel(l, v.mods) : lock}
    </section>`;
  return `<div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(0,1fr);gap:12px;min-height:0;height:100%">${left}${eqCard}${lockCard}</div>`;
}

/* ---------- Minería ---------- */
const SKULL_PAGE = 5;
const fmtDur = (sec) => { if (sec == null) return '—'; const m = Math.round(sec / 60); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`; };
const turnArrow = (rel) => (rel == null ? '' : Math.abs(rel) < 8 ? '↑' : Math.abs(rel) > 165 ? '↓' : rel > 0 ? '↗' : '↖');
const turnText = (rel) => (rel == null ? '' : Math.abs(rel) < 8 ? 'de frente' : Math.abs(rel) > 165 ? 'detrás' : `${Math.round(Math.abs(rel))}° a la ${rel > 0 ? 'derecha' : 'izquierda'}`);
const pager2 = (key, page, pages) => (pages > 1 ? `<span style="display:flex;align-items:center;gap:6px"><button type="button" class="pg" data-mpager="${key}" data-d="-1" ${page === 0 ? 'disabled' : ''}>‹</button><span class="num soft" style="font-size:13px">${page + 1}/${pages}</span><button type="button" class="pg" data-mpager="${key}" data-d="1" ${page >= pages - 1 ? 'disabled' : ''}>›</button></span>` : '');


function screenMineria(s, v) {
  const inSrv = s.status.flags && s.status.flags.isInSRV;
  const shipActive = s.mining && s.mining.lastAt;
  const tab = ui.mineTab || (inSrv ? 'surface' : shipActive ? 'ship' : 'surface');
  const tabs = `<div style="display:flex;gap:8px">
    <button type="button" class="tab ${tab === 'surface' ? 'on' : ''}" data-minetab="surface">Superficie · Rhino</button>
    <button type="button" class="tab ${tab === 'ship' ? 'on' : ''}" data-minetab="ship">Nave · asteroides</button></div>`;
  return `<div style="display:flex;flex-direction:column;gap:12px;min-height:0;height:100%">${tabs}${tab === 'ship' ? mineShip(s) : mineSurface(s, v)}</div>`;
}

function mineSurface(s, v) {
  const k = ui.skull || {};
  const mv = v.mine || {};
  const pos = mv.pos;
  const live = k.live;
  // --- Sesión del plugin
  let sess;
  if (!k.found) {
    sess = `<div class="empty" style="flex-direction:column;gap:8px"><span class="va" style="font-size:18px;color:var(--soft)">No encuentro Skull Mining</span><span style="font-size:14px">Instala el plugin en EDMC y ábrelo: ED BUBBLE lee la sesión que calcula.</span></div>`;
  } else if (!live) {
    sess = `<div class="empty" style="flex-direction:column;gap:8px"><span class="va" style="font-size:18px;color:var(--soft)">Sin sesión en curso</span><span style="font-size:14px">Baja con el Rhino y empieza a minar. Skull Mining guarda la sesión cada 20 s y aparece aquí.</span></div>`;
  } else {
    const zone = mv.zone ?? live.siteSignal ?? (k.zoneTarget && k.zoneTarget.body === live.body ? k.zoneTarget.index : null);
    sess = `
      <span class="va nowrap" style="font-size:20px">${esc(live.body || '—')}</span>
      <span class="eb ${zone == null ? 'amber' : 'dim'}">${zone == null ? 'Zona desconocida · fíjala como destino en el juego' : `Zona de minería ${zone}`}${live.terrain ? ` · terreno ${esc(live.terrain)}` : ''}</span>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">
        ${stat('Taladros', nf(live.rigs ?? 0))}${stat('Recogidas', nf(live.collections ?? 0))}
        ${stat('Toneladas', nf(live.tonnes), 'cyan')}${stat('t / hora', live.perHour != null ? nf(live.perHour, 0) : '—')}
      </div>
      <div style="display:flex;flex-direction:column;gap:4px">${live.byType.slice(0, 4).map((x) => `<div class="in" style="display:flex;justify-content:space-between;padding:8px 12px"><span class="va">${esc(x.name)}</span><span class="num">${nf(x.tonnes)} t</span></div>`).join('') || '<span class="soft" style="font-size:14px">Aún no has refinado nada.</span>'}</div>
      <span class="eb dim" style="font-size:10px;margin-top:auto">Skull Mining · ${live.perCollection ? `${nf(live.perCollection, 1)} t por recogida · ` : ''}${live.ageS != null ? `actualizado hace ${live.ageS < 60 ? `${Math.round(live.ageS)} s` : fmtDur(live.ageS)}` : ''}</span>`;
  }
  const sessCard = `<section class="pn card" style="min-height:0"><span class="ti" style="font-size:16px">Sesión con el Rhino</span>${sess}</section>`;

  // --- Guía de taladros
  const g = mv.guide;
  let guide;
  if (!pos) guide = '<div class="empty" style="flex-direction:column;gap:6px"><span class="va" style="font-size:18px;color:var(--soft)">Sin posición</span><span style="font-size:14px">La guía funciona en la superficie de un planeta.</span></div>';
  else if (!g || !g.nearest) guide = `<div class="in" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px"><span class="num cyan" style="font-size:44px">Libre</span><span class="soft">Sin taladros marcados en este cuerpo</span></div>`;
  else guide = `<div class="in" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border-color:${g.ok ? 'var(--cyan)' : 'var(--amber)'}">
      <span class="eb ${g.ok ? 'cyan' : 'amber'}">${g.ok ? 'Puedes colocar el taladro' : 'Demasiado cerca'}</span>
      <span class="num ${g.ok ? 'cyan' : 'amber'}" style="font-size:52px">${fmtDist(g.nearest.dist)}</span>
      <span class="soft" style="font-size:15px">${g.ok ? `del taladro ${g.nearest.index} (mínimo ${g.minM} m)` : `aléjate ${fmtDist(g.missing)} más del taladro ${g.nearest.index}`}</span>
      <span class="soft" style="font-size:14px">${g.nearest.rel != null ? `Está ${turnText(g.nearest.rel)} ${turnArrow(g.nearest.rel)}` : ''}</span>
    </div>`;
  const guideCard = `<section class="pn card" style="min-height:0">
      <div style="display:flex;justify-content:space-between;align-items:center"><span class="ti" style="font-size:16px">Guía de taladros</span><span class="eb dim">${mv.marked || 0} marcados${mv.known ? ` · ${mv.known} recogidos` : ''}</span></div>
      ${guide}
      <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:8px">
        <button type="button" class="plot-btn" data-rig="add" style="width:100%" ${pos ? '' : 'disabled'}>Taladro aquí</button>
        <button type="button" class="tab" data-rig="undo" ${mv.marked ? '' : 'disabled'}>Deshacer</button>
        <button type="button" class="tab" data-rig="clear" ${mv.marked ? '' : 'disabled'}>Borrar</button>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
        <span class="eb dim">Distancia mínima</span>
        <span style="display:flex;align-items:center;gap:8px"><button type="button" class="pg" data-rigmin="-5">−</button><span class="num" style="font-size:18px;min-width:60px;text-align:center">${ui.prefs.rigMin || 75} m</span><button type="button" class="pg" data-rigmin="5">+</button></span>
      </div>
    </section>`;

  // --- Sitios de la flota
  const web = k.web || {};
  let sitesBody;
  if (!web.configured) {
    sitesBody = `<div class="empty" style="flex-direction:column;gap:10px"><span style="font-size:14px">Para ver los sitios de la flota, ED BUBBLE usa la misma URL y clave que tienes en Skull Mining.</span><button type="button" class="tab" data-skull="connect">Usar la conexión de Skull Mining (EDMC)</button>${ui.skullMsg ? `<span class="red" style="font-size:13px">${esc(ui.skullMsg)}</span>` : ''}</div>`;
  } else if (!pos) {
    sitesBody = '<div class="empty">Aparecen al bajar a un planeta.</div>';
  } else if (web.status) {
    sitesBody = `<div class="empty" style="flex-direction:column;gap:8px"><span class="red">${esc(web.status)}</span><button type="button" class="tab small" data-skull="refresh">Reintentar</button></div>`;
  } else if (!mv.sites) {
    sitesBody = '<div class="empty">Buscando los sitios de la flota…</div>';
  } else {
    const list = mv.sites;
    const pages = Math.max(1, Math.ceil(list.length / SKULL_PAGE));
    ui.sitesPage = Math.min(ui.sitesPage, pages - 1);
    sitesBody = list.length ? list.slice(ui.sitesPage * SKULL_PAGE, (ui.sitesPage + 1) * SKULL_PAGE).map((x) => `
      <div class="in" style="display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:10px;align-items:center;padding:6px 12px;${x.usable ? '' : 'opacity:.55'}">
        <span style="display:flex;flex-direction:column;min-width:0"><span class="va nowrap" style="font-size:16px">${esc(x.mineral || x.type || '?')}${x.rigs ? ` ×${x.rigs}` : ''}</span><span class="eb dim nowrap" style="font-size:10px">${x.depleted ? 'Agotado' : x.notWorth ? 'No rentable' : x.zone != null ? `Zona ${x.zone}` : ''}${x.dist != null ? ` · ${turnText(x.rel)}` : ''}</span></span>
        <span class="num" style="font-size:16px">${x.dist != null ? `${fmtDist(x.dist)} ${turnArrow(x.rel)}` : '—'}</span>
        <button type="button" class="tab small" data-spot="${x.lat},${x.lon}" title="Fijar como destino de la brújula (Órbita planetaria)">Fijar</button>
      </div>`).join('') + `<span style="display:flex;justify-content:flex-end">${pager2('sites', ui.sitesPage, pages)}</span>` : '<div class="empty">La flota no tiene sitios en este cuerpo todavía.</div>';
  }
  const sitesCard = `<section class="pn card" style="min-height:0">
      <div style="display:flex;justify-content:space-between;align-items:center"><span class="ti" style="font-size:16px">Sitios de la flota</span>${web.configured ? '<button type="button" class="tab small" data-skull="web">Web Skullmining</button>' : ''}</div>
      <div style="display:flex;flex-direction:column;gap:4px;min-height:0">${sitesBody}</div>
      ${web.configured ? '<button type="button" class="tab small" data-skull="disconnect" style="margin-top:auto;align-self:flex-start">Desconectar</button>' : ''}
    </section>`;
  return `<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;flex:1;min-height:0">${sessCard}${guideCard}${sitesCard}</div>`;
}

function mineShip(s) {
  const m = s.mining || {};
  const p = (m.prospects || [])[0];
  const pros = p ? `
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">${stat('Contenido', esc(p.content || '—'), /high|alto/i.test(p.content || '') ? 'cyan' : '')}${stat('Queda', p.remaining != null ? `${nf(p.remaining, 0)} %` : '—')}</div>
      ${p.motherlode ? `<div class="in" style="padding:10px 12px;border-color:var(--amber)"><span class="eb amber">Núcleo de</span> <span class="va" style="font-size:18px">${esc(p.motherlode)}</span></div>` : ''}
      <div style="display:flex;flex-direction:column;gap:6px">${p.materials.slice(0, 5).map((x) => `<div style="display:grid;grid-template-columns:140px minmax(0,1fr) 60px;gap:10px;align-items:center"><span class="va nowrap">${esc(x.name)}</span><span class="bar"><span style="width:${Math.min(100, x.pct)}%;background:var(--cyan)"></span></span><span class="num" style="text-align:right">${nf(x.pct, 1)} %</span></div>`).join('')}</div>`
    : '<div class="empty" style="flex-direction:column;gap:6px"><span class="va" style="font-size:18px;color:var(--soft)">Sin prospecciones</span><span style="font-size:14px">Lanza un dron prospector a un asteroide.</span></div>';
  const refined = Object.values(m.refined || {}).sort((a, b) => b.tonnes - a.tonnes);
  const total = refined.reduce((a, x) => a + x.tonnes, 0);
  const hours = m.since && m.lastAt ? (Date.parse(m.lastAt) - Date.parse(m.since)) / 3600000 : 0;
  const cap = s.ship.cargoCapacity; const used = (s.cargo && s.cargo.count) || 0;
  const sess = `
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">
        ${stat('Refinado', `${nf(total)} t`, 'cyan')}${stat('t / hora', hours > 0.05 ? nf(total / hours, 0) : '—')}
        ${stat('Bodega', cap ? `${nf(used)} / ${nf(cap)} t` : nf(used), cap && used >= cap ? 'amber' : '')}${stat('Drones', `${nf(m.drones ? m.drones.prospector : 0)} P · ${nf(m.drones ? m.drones.collection : 0)} R`)}
      </div>
      <div style="display:flex;flex-direction:column;gap:4px">${refined.slice(0, 5).map((x) => `<div class="in" style="display:flex;justify-content:space-between;padding:8px 12px"><span class="va">${esc(x.name)}</span><span class="num">${nf(x.tonnes)} t</span></div>`).join('') || '<span class="soft" style="font-size:14px">Aún no has refinado nada desde el despegue.</span>'}</div>
      <span class="eb dim" style="font-size:10px;margin-top:auto">Desde el último despegue${m.cracked ? ` · ${m.cracked} núcleos abiertos` : ''}${m.since ? ` · ${fmtDur(hours * 3600)}` : ''}</span>`;
  const list = m.prospects || [];
  const pages = Math.max(1, Math.ceil(list.length / 6));
  ui.prospPage = Math.min(ui.prospPage, pages - 1);
  const hist = list.length ? list.slice(ui.prospPage * 6, (ui.prospPage + 1) * 6).map((x, i) => {
    const best = x.materials[0];
    return `<div class="in" style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:6px 12px">
      <span style="display:flex;flex-direction:column;min-width:0"><span class="va nowrap" style="font-size:15px">${best ? `${esc(best.name)} ${nf(best.pct, 1)} %` : '—'}${x.motherlode ? ` · <span class="amber">núcleo de ${esc(x.motherlode)}</span>` : ''}</span><span class="eb dim" style="font-size:10px">${esc(x.content || '')}${x.materials.length > 1 ? ` · ${x.materials.slice(1, 3).map((y) => `${esc(y.name)} ${nf(y.pct, 0)} %`).join(' · ')}` : ''}</span></span>
      <span class="num soft" style="font-size:13px">${x.at ? new Date(x.at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : ''}</span></div>`;
  }).join('') : '<div class="empty">Sin prospecciones desde el despegue.</div>';
  return `<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;flex:1;min-height:0">
    <section class="pn card" style="min-height:0"><span class="ti" style="font-size:16px">Última prospección</span>${pros}</section>
    <section class="pn card" style="min-height:0"><span class="ti" style="font-size:16px">Esta sesión</span>${sess}</section>
    <section class="pn card" style="min-height:0"><div style="display:flex;justify-content:space-between;align-items:center"><span class="ti" style="font-size:16px">Prospecciones</span>${pager2('prosp', ui.prospPage, pages)}</div><div style="display:flex;flex-direction:column;gap:4px">${hist}</div></section>
  </div>`;
}

async function skullAction(a) {
  const api = window.edbubble; ui.skullMsg = null;
  if (a === 'connect') { const r = await api.skullConnect(); if (!r.ok) ui.skullMsg = r.error; ui.skull = await api.skull(); }
  else if (a === 'disconnect') { await api.skullDisconnect(); ui.skull = await api.skull(); }
  else if (a === 'refresh') await api.skullRefresh();
  else if (a === 'web') await api.openSkullWeb();
  render();
}

/* ---------- Powerplay ---------- */
const PP_STATE = { Exploited: 'Explotado', Fortified: 'Fortificado', Stronghold: 'Stronghold', Unoccupied: 'Sin ocupar' };
const fmtCut = (ms) => { const d = ms - Date.now(); if (d <= 0) return 'ahora'; const h = Math.floor(d / 3600000); return h >= 24 ? `${Math.floor(h / 24)} d ${h % 24} h` : `${h} h ${Math.floor((d % 3600000) / 60000)} min`; };

function screenPowerplay(s, v) {
  const p = v.powerplay; const y = p.system;
  const pilot = p.pilot;
  const right = `
    <aside style="display:flex;flex-direction:column;gap:12px;min-height:0;min-width:0">
      <section class="pn card">
        <span class="ti" style="font-size:16px">Piloto</span>
        <div class="kv" style="font-size:16px">
          <span class="eb" style="font-size:10px">Potencia</span><span class="amber">${esc(or(pilot.power))}</span>
          <span class="eb" style="font-size:10px">Rango</span><span class="num">${or(pilot.rank)}</span>
          <span class="eb" style="font-size:10px">Para subir</span><span class="num">${pilot.toNext ? `${nf(pilot.toNext.remainingMerits)} méritos` : '—'}</span>
          <span class="eb" style="font-size:10px">Méritos</span><span class="num">${nf(pilot.merits)}</span>
          <span class="eb" style="font-size:10px">Esta sesión</span><span class="num cyan">+${nf(pilot.session)}</span>
        </div>
        ${pilot.toNext && pilot.rankStart != null ? `<span class="bar" style="height:8px"><span style="width:${Math.max(0, Math.min(1, (pilot.merits - pilot.rankStart) / Math.max(1, pilot.toNext.requiredMerits - pilot.rankStart))) * 100}%;background:var(--amber)"></span></span><span class="eb dim" style="font-size:10px">Rango ${pilot.toNext.nextRank} a ${nf(pilot.toNext.requiredMerits)} méritos</span>` : ''}
      </section>
      <section class="pn card">
        <span class="ti" style="font-size:16px">Sistema seguido</span>
        <span class="va nowrap" style="font-size:18px">${esc(p.tracked || '—')}</span>
        <span class="soft" style="font-size:13px">${p.pinned ? 'Se mantiene aunque saltes a otro sistema.' : 'Sin fijar: se muestra el sistema actual si tiene Powerplay.'}</span>
        <div style="display:flex;gap:8px">
          ${p.canTrackHere ? `<button type="button" class="nav-btn" style="flex:1" data-pptrack="${esc(p.here)}">Seguir ${esc(p.here)}</button>` : ''}
          ${p.pinned ? '<button type="button" class="nav-btn" style="width:150px" data-pptrack="">Dejar de fijar</button>' : ''}
        </div>
      </section>
      <section class="pn card" style="flex:1;min-height:0;overflow:hidden">
        <span class="ti" style="font-size:16px">Sistemas con datos</span>
        <div style="display:flex;flex-direction:column;gap:4px">
          ${Object.entries(s.powerplay.systems).map(([name, list]) => ({ name, x: list[list.length - 1] })).sort((a, b) => String(b.x.at).localeCompare(String(a.x.at))).slice(0, 7).map(({ name, x }) => `<button type="button" class="pick ${name === p.tracked ? 'on' : ''}" data-pptrack="${esc(name)}" title="Seguir este sistema"><span class="nowrap">${esc(name)}</span><span class="num soft" style="font-size:13px">${esc(PP_STATE[x.control.state] || x.control.state)} · ${nf(x.control.progress * 100, 1)} %</span></button>`).join('') || '<span class="soft" style="font-size:14px">Entra en un sistema con Powerplay para ver sus datos.</span>'}
        </div>
        <span class="note" style="margin-top:auto">Topes: Explotado 350.000 · Fortificado 650.000 · Stronghold 1.000.000 PC. El Journal solo da estos datos al entrar en el sistema.</span>
      </section>
    </aside>`;
  if (!y) {
    return `<div style="display:grid;grid-template-columns:minmax(0,1fr) 460px;gap:12px;min-height:0">
      <section class="pn card"><span class="ti" style="font-size:16px">Control del sistema</span><div class="empty" style="flex-direction:column;gap:8px"><span class="va" style="font-size:20px;color:var(--soft)">Sin sistema que seguir</span><span style="font-size:15px">Entra en un sistema con Powerplay (o elige uno de la lista) para ver su progreso de control.</span></div></section>${right}</div>`;
  }
  const pct = (x) => `${nf(x * 100, 1)} %`;
  const segColor = { 0: '#0c1b2e', 1: '#2a7fa3', 2: '#49c7e8', 3: '#ff4b4b' };
  const segs = y.segments.map((k) => `<span style="flex:1;height:28px;background:${segColor[k]};border:1px solid ${k ? 'transparent' : 'var(--line2)'};border-radius:2px;${k === 2 ? 'box-shadow:0 0 8px rgba(73,199,232,.6)' : ''}"></span>`).join('');
  const scale = [0, 0.25, 0.5, 0.75, 1].map((f) => `<span class="num soft" style="font-size:12px">${nf(y.cap * f)}</span>`).join('');
  const prev = y.previous;
  const bar = (label, cur, old, col) => {
    const mx = Math.max(cur || 0, (old && old.v) || 0, 1);
    return `<div style="display:grid;grid-template-columns:120px minmax(0,1fr) 110px;gap:10px;align-items:center">
      <span class="eb">${label}</span>
      <span style="display:flex;flex-direction:column;gap:3px"><span class="bar" style="height:10px"><span style="width:${(cur / mx) * 100}%;background:${col}"></span></span>${old ? `<span class="bar" style="height:6px;opacity:.5"><span style="width:${(old.v / mx) * 100}%;background:${col}"></span></span>` : ''}</span>
      <span class="num" style="text-align:right">${nf(cur)}${old ? `<br><span class="soft" style="font-size:12px">${nf(old.v)}</span>` : ''}</span></div>`;
  };
  const head = y.nextState
    ? `<span class="num amber" style="font-size:36px">Faltan ${nf(y.remaining)} PC</span><span class="soft" style="font-size:15px">${esc(y.name)} está ${esc((PP_STATE[y.state] || y.state).toLowerCase())} al ${pct(y.progress)}. Al llegar al 100 % sube a ${esc(PP_STATE[y.nextState])} en el siguiente corte del jueves y el sobrante pasa al estado nuevo.</span>`
    : `<span class="num amber" style="font-size:36px">Nivel máximo</span><span class="soft" style="font-size:15px">${esc(y.name)} es Stronghold al ${pct(y.progress)}. El progreso protege el sistema frente al undermining.</span>`;
  const main = `
    <main style="display:flex;flex-direction:column;gap:12px;min-width:0;min-height:0">
      <section class="pn card" style="border-left:3px solid var(--amber)">
        <span class="eb">Control del sistema · ${esc(y.power || '—')}${y.stale ? ' · <span class="yellow">datos de un ciclo anterior</span>' : ''}</span>
        <span class="ti nowrap" style="font-size:32px">${esc(y.name)}</span>
        <div style="display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:20px;align-items:end">
          <div style="display:flex;flex-direction:column;gap:6px">${head}</div>
          <div style="display:flex;flex-direction:column;gap:4px;text-align:right"><span class="eb">Siguiente estado</span><span class="va" style="font-size:22px">${esc(y.nextState ? PP_STATE[y.nextState] : '—')}</span><span class="eb dim" style="font-size:10px">Tope ${nf(y.cap)} PC · datos ${String(y.at).slice(0, 10)} ${hhmm(y.at)} UTC</span></div>
        </div>
      </section>
      <section class="pn card">
        <div style="display:flex;justify-content:space-between;align-items:baseline"><span class="ti" style="font-size:16px">Progreso · ${esc(PP_STATE[y.state] || y.state)}</span><span class="num amber" style="font-size:34px">${pct(y.progress)}</span></div>
        <div style="display:flex;gap:4px">${segs}</div>
        <div style="display:flex;justify-content:space-between">${scale}</div>
        <div style="display:flex;gap:18px;flex-wrap:wrap"><span class="eb"><span style="color:#2a7fa3">■</span> Antes del ciclo · ${pct(y.baseProgress)}</span><span class="eb"><span class="cyan">■</span> Ganado este ciclo</span><span class="eb"><span class="red">■</span> Perdido</span></div>
        <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px">
          ${stat('Puntos de control', `${nf(y.totalCp)}`)}${stat('Refuerzo', `+${nf(y.reinforcement)}`, 'cyan')}${stat('Undermining', y.undermining ? `−${nf(y.undermining)}` : '0', y.undermining ? 'red' : '')}${stat('Neto del ciclo', `${y.net >= 0 ? '+' : '−'}${nf(Math.abs(y.net))}`, y.net >= 0 ? 'cyan' : 'red')}
        </div>
      </section>
      <section class="pn card" style="flex:1;min-height:0">
        <div style="display:flex;justify-content:space-between;align-items:baseline"><span class="ti" style="font-size:16px">Ciclo actual frente al anterior · historial</span><span class="eb">Corte semanal · jueves 07:00 UTC · faltan ${fmtCut(p.nextCut)}</span></div>
        ${bar('Refuerzo', y.reinforcement, prev && { v: prev.reinforcement }, 'var(--cyan)')}
        ${bar('Undermining', y.undermining, prev && { v: prev.undermining }, 'var(--red,#ff4b4b)')}
        <span class="note">${prev ? `Barra clara: ciclo actual · barra oscura: ciclo anterior (datos del ${String(prev.at).slice(0, 10)}).` : 'Sin datos del ciclo anterior: aparecerán cuando entres en el sistema en dos semanas distintas.'}${y.stale ? ' Los datos son de antes del último corte: entra en el sistema para actualizarlos.' : ''}</span>
        <div style="display:flex;flex-direction:column;gap:4px;min-height:0;overflow:hidden;margin-top:6px">
          <div class="eb dim" style="display:grid;grid-template-columns:190px 140px minmax(0,1fr) 130px 130px;font-size:10px;padding:0 12px"><span>Visita</span><span>Estado</span><span>Progreso</span><span style="text-align:right">Refuerzo</span><span style="text-align:right">Undermining</span></div>
          ${(s.powerplay.systems[y.name] || []).slice().reverse().slice(0, 9).map((x) => `<div class="in row" style="grid-template-columns:190px 140px minmax(0,1fr) 130px 130px;height:34px">
            <span class="num soft" style="padding-left:12px">${String(x.at).slice(0, 10)} ${hhmm(x.at)}</span>
            <span>${esc(PP_STATE[x.control.state] || x.control.state)}</span>
            <span style="display:flex;align-items:center;gap:8px"><span class="bar" style="flex:1;height:6px"><span style="width:${Math.min(1, x.control.progress) * 100}%;background:var(--amber)"></span></span><span class="num" style="width:64px;text-align:right">${pct(x.control.progress)}</span></span>
            <span class="num cyan" style="text-align:right">+${nf(x.control.reinforcement)}</span>
            <span class="num ${x.control.undermining ? 'red' : 'soft'}" style="text-align:right;padding-right:12px">${x.control.undermining ? `−${nf(x.control.undermining)}` : '0'}</span>
          </div>`).join('')}
        </div>
      </section>
    </main>`;
  return `<div style="display:grid;grid-template-columns:minmax(0,1fr) 460px;gap:12px;min-height:0">${main}${right}</div>`;
}

/* ---------- Combate ---------- */
const CB_PER = { kills: 6, cobrar: 3, masacre: 3, conflictos: 2 };
function cbPager(key, page, pages) {
  return pages > 1 ? `<span style="display:flex;align-items:center;gap:8px"><button type="button" class="pg" data-cbpg="${key}" data-d="-1" ${page === 0 ? 'disabled' : ''}>‹</button><span class="num soft" style="font-size:13px">${page + 1}/${pages}</span><button type="button" class="pg" data-cbpg="${key}" data-d="1" ${page >= pages - 1 ? 'disabled' : ''}>›</button></span>` : '';
}
function cbPage(key, list) {
  const per = CB_PER[key]; const pages = Math.max(1, Math.ceil(list.length / per));
  const k = `cb_${key}`; ui[k] = Math.min(ui[k] || 0, pages - 1);
  return { items: list.slice(ui[k] * per, ui[k] * per + per), pager: cbPager(key, ui[k], pages) };
}
function cbBar(label, pct, col) {
  const r = pct == null ? null : Math.max(0, Math.min(100, pct));
  return `<div style="display:flex;flex-direction:column;gap:4px"><div style="display:flex;justify-content:space-between"><span class="eb">${label}</span><span class="num" style="font-size:18px;color:${col}">${r == null ? '—' : `${nf(r)} %`}</span></div><span class="bar" style="height:10px"><span style="width:${r || 0}%;background:${col}"></span></span></div>`;
}
const agoText = (iso) => { if (!iso) return ''; const sec = Math.max(0, (Date.now() - Date.parse(iso)) / 1000); return sec < 60 ? 'ahora' : sec < 3600 ? `hace ${Math.round(sec / 60)} min` : `${String(iso).slice(0, 10)} ${hhmm(iso)}`; };

function cbAct(id, label, extra = '') {
  const a = actAttrs(id);
  return `<button type="button" class="act${a.cls || ''} ${extra}" data-act="${id}" ${a.dis} title="${esc(a.title)}">${label}${a.key ? `<span class="k">${esc(a.key)}</span>` : ''}</button>`;
}
const FIGHTER = [['f_focus', 'Atacar mi objetivo'], ['f_attack', 'Atacar a discreción'], ['f_defend', 'Defenderme'], ['f_hold', 'Alto el fuego'], ['f_pos', 'Mantener posición'], ['f_follow', 'Seguirme'], ['f_dock', 'Volver a la nave'], ['f_orders', 'Abrir órdenes']];
function screenCombate(s, v) {
  const c = v.combat || {};
  const t = c.target;
  const f = s.status.flags || {};
  // --- Objetivo
  let tgt;
  if (!t) {
    tgt = '<div class="empty" style="flex-direction:column;gap:8px"><span class="va" style="font-size:20px;color:var(--soft)">Sin objetivo</span><span style="font-size:14px">Fija una nave en el juego: aquí verás quién la pilota, su estado legal y su recompensa.</span></div>';
  } else {
    const legalCol = t.hostile ? 'var(--cyan)' : t.legal === 'Clean' ? 'var(--amber)' : 'var(--soft)';
    tgt = `
      <span class="ti nowrap" style="font-size:28px">${esc(t.ship || '—')}</span>
      <span class="soft nowrap" style="font-size:15px">${t.stage >= 1 ? esc(or(t.pilot, 'Piloto desconocido')) : 'Escaneando…'}${t.rank ? ` · <span class="va">${esc(t.rank)}</span>` : ''}</span>
      <div class="kv" style="font-size:16px">
        <span class="eb" style="font-size:10px">Facción</span><span class="nowrap">${esc(or(t.faction))}</span>
        <span class="eb" style="font-size:10px">Estado legal</span><span style="color:${legalCol}">${esc(or(t.legalEs))}${t.legal === 'Clean' ? ' · atacarla es delito' : ''}</span>
        <span class="eb" style="font-size:10px">Recompensa</span><span class="num ${t.bounty ? 'cyan' : 'soft'}">${t.bounty ? fmtCr(t.bounty) : t.stage >= 3 ? 'Ninguna' : '—'}</span>
        ${t.power ? `<span class="eb" style="font-size:10px">Potencia</span><span>${esc(t.power)}</span>` : ''}
      </div>
      ${cbBar('Escudo', t.shield, 'var(--cyan)')}
      ${cbBar('Casco', t.hull, 'var(--amber)')}
      ${t.subsystem ? `<div class="in" style="display:flex;justify-content:space-between;padding:8px 12px"><span class="eb">Subsistema · ${esc(t.subsystem)}</span><span class="num">${t.subHealth != null ? `${nf(t.subHealth)} %` : '—'}</span></div>` : ''}
      <span class="eb dim" style="font-size:10px;margin-top:auto">${t.stage >= 3 ? 'Escaneo completo' : `Escaneo ${t.stage}/3`} · ${agoText(t.at)}</span>`;
  }
  // Escudo y casco de tu nave no se muestran: el juego los enseña al momento y el diario no los da al día.
  const legal = s.cmdr.legalState;
  const own = `<section class="pn card" style="gap:6px">
      <div style="display:flex;justify-content:space-between;align-items:center"><span class="eb">Tu estado legal</span><span class="va ${legal && legal !== 'Clean' ? 'amber' : ''}" style="font-size:18px">${esc(legal === 'Clean' ? 'Limpio' : or(legal))}</span></div>
      <span class="nowrap" style="display:block;overflow:hidden">${feedbackLine()}</span>
    </section>`;
  const left = `<aside style="display:flex;flex-direction:column;gap:12px;min-height:0;min-width:0">
      <section class="pn card" style="flex:1;min-height:0;overflow:hidden;border-left:3px solid ${t && t.hostile ? 'var(--cyan)' : t && t.legal === 'Clean' ? 'var(--amber)' : 'var(--line2)'}"><span class="eb">Objetivo</span>${tgt}</section>
      ${cbAct('powerplant', 'Fijar planta de energía', 'pp')}
      ${cbAct('wing1', 'Fijar objetivo de mi compañero', 'wing')}
      ${own}
    </aside>`;

  // --- Zona y sesión
  const z = c.zone; const S = c.session || {};
  const zoneHead = z
    ? `<span class="ti nowrap" style="font-size:24px">${esc(z.name)}</span>
       <span class="soft" style="font-size:15px">${z.side ? `Luchas por <span class="cyan">${esc(z.side)}</span> contra <span class="red">${esc(z.enemy || '—')}</span>` : z.kind === 'cz' ? 'Elige bando en el panel de funciones: el primer bono dirá por quién luchas.' : 'Las recompensas se cobran en la facción que las emite.'}</span>
       <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">
         ${stat('Bajas aquí', nf(z.bonds + z.bounties), 'cyan')}${stat('Créditos aquí', fmtCr(z.bondCr + z.bountyCr), 'cyan')}${stat('Desde', hhmm(z.at))}
       </div>`
    : `<span class="ti" style="font-size:24px;color:var(--soft)">Fuera de zona de combate</span><span class="soft" style="font-size:14px">Al caer en una zona de conflicto o de extracción, aquí se cuentan las bajas y los créditos de esa zona.</span>`;
  const { items: kills, pager: killPager } = cbPage('kills', c.kills || []);
  const mid = `<main style="display:flex;flex-direction:column;gap:12px;min-width:0;min-height:0">
      <section class="pn card" style="border-left:3px solid ${z ? 'var(--red,#ff4b4b)' : 'var(--line2)'}"><span class="eb">Zona</span>${zoneHead}</section>
      <section class="pn card">
        <span class="ti" style="font-size:16px">Esta sesión de juego</span>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">
          ${stat('Bonos de combate', `${nf(S.bonds)} · ${fmtCr(S.bondCr)}`)}${stat('Recompensas', `${nf(S.bounties)} · ${fmtCr(S.bountyCr)}`)}${stat('Interdicciones', `${nf((S.interdicted || 0) + (S.escaped || 0))}${S.escaped ? ` · ${nf(S.escaped)} evadidas` : ''}`)}${stat('Destruido', nf(S.deaths), S.deaths ? 'red' : '')}
        </div>
      </section>
      <section class="pn card" style="flex:1;min-height:0;overflow:hidden">
        <div style="display:flex;justify-content:space-between;align-items:center"><span class="ti" style="font-size:16px">Últimas bajas</span>${killPager}</div>
        <div style="display:flex;flex-direction:column;gap:4px">
          ${kills.map((k) => `<div class="in row" style="grid-template-columns:70px minmax(0,1fr) minmax(0,1fr) 130px;height:38px">
            <span class="num soft" style="padding-left:12px">${hhmm(k.at)}</span>
            <span class="nowrap va">${esc(or(k.ship, k.kind === 'bond' ? 'Nave enemiga' : 'Nave buscada'))}${k.pilot ? ` <span class="soft">· ${esc(k.pilot)}</span>` : ''}</span>
            <span class="nowrap soft">${esc(or(k.faction))}</span>
            <span class="num ${k.kind === 'bond' ? 'amber' : 'cyan'}" style="text-align:right;padding-right:12px">${fmtCr(k.reward)}</span></div>`).join('') || '<span class="soft" style="font-size:14px">Sin bajas en esta sesión.</span>'}
        </div>
        <span class="note" style="margin-top:auto"><span class="amber">■</span> bono de combate · <span class="cyan">■</span> recompensa</span>
      </section>
    </main>`;

  // --- Pestañas de la derecha
  const tab = ui.cbTab || 'cobrar';
  const nMass = (c.massacre || []).length;
  const tabs = `<div style="display:flex;gap:6px">
      <button type="button" class="tab ${tab === 'cobrar' ? 'on' : ''}" data-cbtab="cobrar" style="flex:1;white-space:nowrap;padding:0 6px">Por cobrar</button>
      <button type="button" class="tab ${tab === 'masacre' ? 'on' : ''}" data-cbtab="masacre" style="flex:1;white-space:nowrap;padding:0 6px">Masacres${nMass ? ` <span class="num">${nMass}</span>` : ''}</button>
      <button type="button" class="tab ${tab === 'conflictos' ? 'on' : ''}" data-cbtab="conflictos" style="flex:1;white-space:nowrap;padding:0 6px">Conflictos${c.conflicts && c.conflicts.length ? ` <span class="num">${c.conflicts.length}</span>` : ''}</button></div>`;
  let body;
  if (tab === 'cobrar') {
    const rows = [...(c.bonds || []).map((x) => ({ ...x, kind: 'bond' })), ...(c.bounties || []).map((x) => ({ ...x, kind: 'bounty' }))];
    const { items, pager } = cbPage('cobrar', rows);
    body = `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">${stat('Bonos de combate', fmtCr(c.bondsTotal), 'amber')}${stat('Recompensas', fmtCr(c.bountiesTotal), 'cyan')}</div>
      <div style="display:flex;justify-content:space-between;align-items:center"><span class="eb">Por facción</span>${pager}</div>
      <div style="display:flex;flex-direction:column;gap:4px">${items.map((x) => `<div class="in" style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:8px 12px"><span style="display:flex;flex-direction:column;min-width:0"><span class="nowrap va">${esc(x.faction)}</span><span class="eb dim" style="font-size:10px">${x.kind === 'bond' ? 'Bonos' : 'Recompensas'} · ${nf(x.n)}</span></span><span class="num ${x.kind === 'bond' ? 'amber' : 'cyan'}">${fmtCr(x.cr)}</span></div>`).join('') || '<span class="soft" style="font-size:14px">Nada pendiente de cobrar.</span>'}</div>
      <span class="note" style="margin-top:auto">Los bonos se cobran en una estación de la facción que los da (o en un Interstellar Factors, con descuento). Si destruyen tu nave, se pierden.</span>`;
  } else if (tab === 'masacre') {
    const { items, pager } = cbPage('masacre', c.massacre || []);
    const st = (c.stacks || [])[0];
    body = `${st ? `<div class="in" style="display:flex;flex-direction:column;gap:4px;padding:10px 12px;border-color:var(--amber)"><span class="eb">Objetivo · ${esc(st.target)}</span><span class="num amber" style="font-size:26px">${st.left ? `Faltan ${nf(st.left)} bajas` : 'Todas listas'}</span><span class="soft" style="font-size:13px">${nf(st.missions)} misiones de ${nf(Object.keys(st.issuers).length)} facciones · ${fmtCr(st.reward)}</span></div>` : ''}
      <div style="display:flex;justify-content:space-between;align-items:center"><span class="eb">Misiones</span>${pager}</div>
      <div style="display:flex;flex-direction:column;gap:6px">${items.map((m) => `<div class="in" style="display:flex;flex-direction:column;gap:4px;padding:8px 12px;${m.done ? 'border-color:var(--cyan)' : ''}">
          <div style="display:flex;justify-content:space-between;gap:8px"><span class="nowrap va">${esc(m.faction)}</span><span class="num ${m.done ? 'cyan' : ''}">${nf(Math.min(m.kills, m.need))}/${nf(m.need)}</span></div>
          <span class="bar" style="height:6px"><span style="width:${Math.min(1, m.kills / Math.max(1, m.need)) * 100}%;background:${m.done ? 'var(--cyan)' : 'var(--amber)'}"></span></span>
          <span class="eb dim nowrap" style="font-size:10px">Contra ${esc(m.target)} · ${fmtCr(m.reward)}${m.wing ? ' · ala' : ''}${m.done ? ' · <span class="cyan">entrégala</span>' : m.expiry ? ` · vence ${String(m.expiry).slice(5, 10)} ${hhmm(m.expiry)}` : ''}</span></div>`).join('') || '<span class="soft" style="font-size:14px">No tienes misiones de masacre.</span>'}</div>
      <span class="note" style="margin-top:auto">Cada baja cuenta para una misión de cada facción que te la dio, como en el juego. Las bajas que hiciste antes de abrir la app se cuentan desde tus diarios.</span>`;
  } else {
    const { items, pager } = cbPage('conflictos', c.conflicts || []);
    body = `<div style="display:flex;justify-content:space-between;align-items:center"><span class="eb">${esc(or(clean(s.location.system), 'Sistema'))}</span>${pager}</div>
      <div style="display:flex;flex-direction:column;gap:8px">${items.map((x) => {
        const side = (y, col) => `<div style="display:grid;grid-template-columns:minmax(0,1fr) 54px;gap:8px;align-items:center"><span style="display:flex;flex-direction:column;min-width:0"><span class="nowrap va">${esc(y.name)}</span><span class="eb dim nowrap" style="font-size:10px">${y.stake ? `En juego: ${esc(y.stake)}` : 'Sin activo en juego'}</span></span><span class="num" style="font-size:22px;color:${col};text-align:right">${nf(y.won)}</span></div>`;
        return `<div class="in" style="display:flex;flex-direction:column;gap:6px;padding:10px 12px"><div style="display:flex;justify-content:space-between"><span class="eb">${esc(x.type)}</span><span class="eb ${x.status === 'En curso' ? 'red' : 'dim'}">${esc(x.status)}</span></div>${side(x.a, 'var(--cyan)')}${side(x.b, 'var(--amber)')}</div>`;
      }).join('') || '<span class="soft" style="font-size:14px">No hay guerras ni elecciones en este sistema.</span>'}</div>
      <span class="note" style="margin-top:auto">Los números grandes son los días ganados de cada bando. El diario los da al entrar en el sistema.</span>`;
  }
  const fighter = `<section class="pn card" style="gap:8px"><div style="display:flex;justify-content:space-between;align-items:center"><span class="ti" style="font-size:16px">Caza</span><span class="eb ${c.fighter ? 'cyan' : 'dim'}">${c.fighter ? `Fuera · ${c.fighter.crew ? 'tripulante' : 'tú'}` : 'En el hangar'}</span></div>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px">${FIGHTER.map(([id, l]) => cbAct(id, l, 'sm')).join('')}</div>
      <span class="note">Para lanzar el caza usa el panel de funciones (derecha) del juego.</span></section>`;
  const right = `<aside style="display:flex;flex-direction:column;gap:12px;min-height:0;min-width:0">${fighter}<section class="pn card" style="flex:1;min-height:0;overflow:hidden">${tabs}${body}</section></aside>`;
  return `<div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr) 440px;gap:12px;min-height:0;height:100%">${left}${mid}${right}</div>`;
}

/* ---------- Estación ---------- */
const STATION_ICON = { Coriolis: 'coriolis', Orbis: 'orbis', Bernal: 'ocellus', Ocellus: 'ocellus', Dodec: 'dodec', Outpost: 'outpost', AsteroidBase: 'asteroid', MegaShip: 'megaship', FleetCarrier: 'carrier', CraterPort: 'surface_port', CraterOutpost: 'surface_outpost', OnFootSettlement: 'settlement', SpaceConstructionDepot: 'outpost', PlanetaryConstructionDepot: 'surface_outpost' };
const STATE_ES = { Expansion: 'Expansión', Boom: 'Auge', Bust: 'Quiebra', CivilUnrest: 'Disturbios', CivilWar: 'Guerra civil', War: 'Guerra', Election: 'Elecciones', Lockdown: 'Confinamiento', Outbreak: 'Epidemia', Famine: 'Hambruna', Retreat: 'Retirada', InfrastructureFailure: 'Fallo de infraestructuras', Investment: 'Inversión', PirateAttack: 'Ataque pirata', PublicHoliday: 'Festividad', Drought: 'Sequía', Blight: 'Plaga', None: 'Sin estado' };

function screenEstacion(s, v) {
  const st = v.station;
  if (!st) return '<section class="pn card"><span class="ti" style="font-size:16px">Estación</span><div class="empty" style="flex-direction:column;gap:8px"><span class="va" style="font-size:22px;color:var(--soft)">Aún no has atracado</span><span style="font-size:15px">Al atracar en una estación aparecerán aquí sus servicios, su mercado y lo que te interesa comprar o vender.</span></div></section>';
  const icon = STATION_ICON[st.type];
  const econ = st.economies.slice(0, 4);
  const econTotal = st.economies.reduce((a, e) => a + e.proportion, 0) || 1;
  const hero = `
    <section class="pn card" style="display:grid;grid-template-columns:96px minmax(0,1fr) 420px 360px;gap:22px;align-items:center">
      <span style="display:flex;justify-content:center">${icon ? `<img src="icons/${icon}.png" alt="" style="width:88px;height:88px;object-fit:contain">` : ''}</span>
      <span style="display:flex;flex-direction:column;gap:4px;min-width:0">
        <span class="eb">${st.here ? '<span class="cyan">Atracado</span>' : `Último atraque · ${st.at ? `${String(st.at).slice(0, 10)} ${hhmm(st.at)} UTC` : '—'}`}</span>
        <span class="ti nowrap" style="font-size:34px">${esc(siteName(st.name))}</span>
        <span class="eb">${esc(STATION_TYPES[st.type] || st.type || '—')} · ${esc(clean(st.system) || '—')} · ${nf(st.distLs, 0)} ls de la estrella</span>
      </span>
      <div class="kv" style="font-size:15px">
        <span class="eb" style="font-size:10px">Facción</span><span class="nowrap">${esc(or(st.faction))}</span>
        <span class="eb" style="font-size:10px">Estado</span><span class="amber">${esc(STATE_ES[st.factionState] || tr(st.factionState) || '—')}</span>
        <span class="eb" style="font-size:10px">Gobierno</span><span>${esc(tr(st.government) || '—')}</span>
        <span class="eb" style="font-size:10px">Plataformas</span><span class="num">${st.pads.S ?? '—'} S · ${st.pads.M ?? '—'} M · <span class="amber">${st.pads.L ?? '—'} L</span></span>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <span class="eb">Economías</span>
        ${econ.map((e) => `<div style="display:grid;grid-template-columns:130px minmax(0,1fr) 40px;gap:8px;align-items:center"><span class="nowrap" style="font-size:14px">${esc(tr(e.name))}</span><span class="bar" style="height:7px"><span style="width:${(e.proportion / econTotal) * 100}%;background:var(--cyan)"></span></span><span class="num soft" style="font-size:12px;text-align:right">${nf((e.proportion / econTotal) * 100, 0)} %</span></div>`).join('') || '<span class="soft">—</span>'}
      </div>
    </section>`;

  const services = `
    <section class="pn card" style="min-height:0;overflow:hidden">
      <div style="display:flex;justify-content:space-between"><span class="ti" style="font-size:16px">Servicios</span><span class="eb dim">${st.services.filter((x) => x.on).length} de ${st.services.length}</span></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
        ${st.services.map((x) => `<span class="svc-row ${x.on ? 'on' : ''}"><span class="dot ${x.on ? 'on' : ''}"></span>${esc(x.label)}</span>`).join('')}
      </div>
    </section>`;

  const m = st.market;
  const block = (title, right, rows, empty) => `
    <div style="display:flex;flex-direction:column;gap:6px">
      <div style="display:flex;justify-content:space-between;align-items:baseline"><span class="eb amber">${title}</span>${right || ''}</div>
      ${rows || `<span class="soft" style="font-size:14px;padding:4px 0">${empty}</span>`}
    </div>`;
  let market;
  if (!m) {
    market = `<div class="empty" style="flex-direction:column;gap:8px"><span class="va" style="font-size:18px;color:var(--soft)">Abre el mercado en el juego</span><span style="font-size:14px">El juego solo guarda los precios de esta estación (Market.json) cuando abres su mercado de mercancías.</span></div>`;
  } else {
    const row = (cols, cells) => `<div class="in row" style="grid-template-columns:${cols};height:34px">${cells}</div>`;
    const vsMean = (p, mean) => (mean ? `<span class="${p >= mean ? 'cyan' : 'yellow'}">${p >= mean ? '+' : ''}${nf(((p - mean) / mean) * 100, 0)} %</span>` : '');
    const dep = m.forDepot.slice(0, 5).map((r) => row('minmax(0,1fr) 120px 140px 110px', `<span class="nowrap" style="padding-left:12px">${esc(r.name)}</span><span class="num amber" style="text-align:right">faltan ${nf(r.remaining)}</span><span class="num cyan" style="text-align:right">${nf(r.stock)} t</span><span class="num soft" style="text-align:right;padding-right:12px">${nf(r.buy)} cr</span>`)).join('');
    const sell = m.sellCargo.slice(0, 5).map((c) => row('minmax(0,1fr) 90px 110px 90px 140px', `<span class="nowrap" style="padding-left:12px">${esc(c.name)}${c.stolen ? ' <span class="eb red" style="font-size:10px">robada</span>' : ''}</span><span class="num soft" style="text-align:right">${nf(c.count)} t</span><span class="num" style="text-align:right">${c.sell ? `${nf(c.sell)} cr` : '<span class="dim">no compra</span>'}</span><span class="num" style="text-align:right">${c.sell ? vsMean(c.sell, c.mean) : ''}</span><span class="num cyan" style="text-align:right;padding-right:12px">${c.total ? `${nf(c.total)} cr` : '—'}</span>`)).join('');
    const best = m.bestSells.slice(0, 6).map((b) => row('minmax(0,1fr) 140px 120px 90px', `<span class="nowrap" style="padding-left:12px">${esc(b.name)}</span><span class="num" style="text-align:right">${nf(b.sell)} cr</span><span class="num soft" style="text-align:right">${nf(b.demand)} t</span><span class="num" style="text-align:right;padding-right:12px">${vsMean(b.sell, b.mean)}</span>`)).join('');
    market = `
      ${block(`Para tu construcción${m.depotName ? ` · ${esc(siteName(m.depotName))}` : ''}`, '<span class="eb dim">faltan · stock · precio</span>', dep, m.depotName ? 'Aquí no se vende nada de lo que le falta a tu construcción.' : 'No tienes construcciones con material pendiente.')}
      ${block('Vender tu carga', m.sellCargo.length ? `<span class="eb">Total <span class="num cyan" style="font-size:15px;letter-spacing:0">${nf(m.sellTotal)} cr</span></span>` : '', sell, 'Bodega vacía.')}
      ${block('Lo que más paga aquí', '<span class="eb dim">precio · demanda · vs media</span>', best, 'Esta estación no compra nada.')}`;
  }
  const marketCard = `
    <section class="pn card" style="min-height:0;overflow:hidden;gap:16px">
      <div style="display:flex;justify-content:space-between"><span class="ti" style="font-size:16px">Mercado</span>${m ? `<span class="eb dim">Market.json · ${String(m.at || '').slice(0, 10) === new Date().toISOString().slice(0, 10) ? '' : `${String(m.at || '').slice(0, 10)} `}${hhmm(m.at)} UTC</span>` : ''}</div>
      ${market}
    </section>`;

  const cg = st.communityGoals;
  const cgCard = `
    <section class="pn card" style="min-height:0;overflow:hidden">
      <span class="ti" style="font-size:16px">Objetivo comunitario</span>
      ${cg.length ? cg.slice(0, 2).map((g) => `<div class="in" style="padding:10px 12px;display:flex;flex-direction:column;gap:4px">
          <span class="va" style="font-size:16px">${esc(g.title)}</span>
          <span class="eb" style="font-size:10px">${esc(siteName(g.station) || '')} · ${esc(g.system || '')}</span>
          <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:4px">${stat('Nivel', esc(g.tier || '—'))}${stat('Tu aporte', nf(g.contribution))}${stat('Tu posición', g.band != null ? `top ${g.band} %` : '—', 'cyan')}</div>
        </div>`).join('') : '<span class="soft" style="font-size:14px">No participas en ningún objetivo comunitario activo.</span>'}
    </section>`;
  // Ingenieros de naves (Horizons, ID 300xxx, grados 1-5) y de equipo a pie (Odyssey, ID 400xxx, sin grados)
  const ranks = Object.entries(st.engineering.ranks || {}).map(([name, r]) => ({ name, ...r }));
  const isSuit = (r) => String(r.id || '').startsWith('4') || ODYSSEY_ENGINEERS.has(r.name);
  const shipEng = ranks.filter((r) => !isSuit(r));
  const suitEng = ranks.filter(isSuit);
  const shipG5 = shipEng.filter((r) => r.progress === 'Unlocked' && r.rank === 5).length;
  const shipUnl = shipEng.filter((r) => r.progress === 'Unlocked').length;
  const suitUnl = suitEng.filter((r) => r.progress === 'Unlocked' || r.progress === 'Invited').length; // en Odyssey «Invited» ya da acceso
  const last = st.engineering.last;
  const engCard = `
    <section class="pn card" style="min-height:0;overflow:hidden">
      <span class="ti" style="font-size:16px">Ingenieros</span>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px">${stat('Naves · grado 5', shipEng.length ? `${shipG5} / ${shipEng.length}` : '—', shipEng.length && shipG5 === shipEng.length ? 'cyan' : '')}${stat('A pie · desbloqueados', suitEng.length ? `${suitUnl} / ${suitEng.length}` : '—')}</div>
      ${shipEng.length ? `<span class="soft" style="font-size:13px;line-height:1.35">${shipG5 === shipEng.length ? '<span class="cyan">Todos los de naves en grado 5.</span>' : `${shipUnl} de ${shipEng.length} de naves desbloqueados.`} Los de a pie no tienen grados.</span>` : ''}
      ${last ? `<div class="in" style="padding:10px 12px;display:flex;flex-direction:column;gap:2px"><span class="eb" style="font-size:10px">Último trabajo · ${hhmm(last.at)} UTC</span><span class="va" style="font-size:15px">${esc(last.blueprint)} G${esc(last.level)}</span><span class="soft" style="font-size:13px">${esc(last.engineer)}</span></div>` : '<span class="soft" style="font-size:14px">Sin trabajos de ingeniero en esta sesión.</span>'}
      ${st.services.find((x) => x.key === 'engineer' && x.on) ? '<span class="eb cyan">Esta estación tiene ingeniero</span>' : ''}
    </section>`;

  return `
  <div style="display:flex;flex-direction:column;gap:12px;min-height:0">
    ${hero}
    <div style="flex:1;display:grid;grid-template-columns:440px minmax(0,1fr) 420px;gap:12px;min-height:0">
      ${services}
      ${marketCard}
      <div style="display:flex;flex-direction:column;gap:12px;min-height:0">${cgCard}${engCard}</div>
    </div>
  </div>`;
}

/* ---------- Equipo: tu nave, builds y lista de deseos ---------- */
const PAD = { 1: 'S', 2: 'M', 3: 'L' };
const CORE_SLOTS = [['PowerPlant', 'Planta de energía'], ['MainEngines', 'Propulsores'], ['FrameShiftDrive', 'Motor FSD'], ['LifeSupport', 'Soporte vital'], ['PowerDistributor', 'Distribuidor'], ['Radar', 'Sensores'], ['FuelTank', 'Tanque de combustible'], ['Armour', 'Blindaje']];
const HP_SIZE = { Huge: 'enorme', Large: 'grande', Medium: 'mediano', Small: 'pequeño' };
function loadShipData() {
  if (ui.shipData || !window.edbubble || !window.edbubble.shipData) return;
  ui.shipData = 'loading';
  window.edbubble.shipData().then((r) => { ui.shipData = r; render(); }).catch(() => { ui.shipData = null; });
  loadRecipes();
}
const modNameEs = (D, n) => D.es[String(n).toLowerCase().replace(/[^a-z0-9]/g, '')] || n;
function modLabel(D, item) {
  const m = D.modules[item];
  if (!m) return { text: item, sub: '' };
  const mount = m.m ? ` · ${{ Fixed: 'fija', Gimballed: 'cardán', Turreted: 'torreta' }[m.m] || m.m}` : '';
  return { text: `${m.cl}${m.r} ${modNameEs(D, m.n)}`, sub: `${m.n}${mount}` };
}
function engLine(e) {
  if (!e || !e.bp) return '';
  const R = ui.recipes && ui.recipes !== 'loading' ? ui.recipes : null;
  const bp = R && R.blueprints[e.bp] ? R.blueprints[e.bp].name : e.bp.replace(/^[^_]*_/, '').replace(/([a-z])([A-Z])/g, '$1 $2');
  const ex = e.exp ? (R && R.specials[e.exp] ? R.specials[e.exp].name : (e.expName || e.exp)) : '';
  return `<span class="eb cyan" style="font-size:10px">${esc(bp)} G${esc(e.level ?? '?')}${ex ? ` · ${esc(ex)}` : ''}</span>`;
}
function slotName(slot) {
  const core = CORE_SLOTS.find(([k]) => k === slot);
  if (core) return core[1];
  let m = /^(Huge|Large|Medium|Small)(Mining)?Hardpoint(\d+)$/.exec(slot);
  if (m) return `Anclaje ${m[2] ? 'minero ' : ''}${HP_SIZE[m[1]]} ${m[3]}`;
  m = /^TinyHardpoint(\d+)$/.exec(slot);
  if (m) return `Apoyo ${m[1]}`;
  m = /^Slot(\d+)_Size(\d+)$/.exec(slot);
  if (m) return `Interno ${Number(m[1])} · clase ${m[2]}`;
  m = /^Military0?(\d+)$/.exec(slot);
  if (m) return `Militar ${m[1]}`;
  m = /^LimpetController0?(\d+)$/.exec(slot);
  if (m) return 'Control de drones';
  m = /^FighterBay0?(\d+)$/.exec(slot);
  if (m) return 'Hangar';
  if (slot === 'Armour') return 'Blindaje';
  if (slot === 'PlanetaryApproachSuite') return 'Aproximación planetaria';
  m = /^Cargo(\d+)$/.exec(slot);
  if (m) return `Bodega fija ${Number(m[1])}`;
  return slot;
}
const IMPORT_TIP = 'Copia la build y pulsa aquí: se lee del portapapeles.&#10;EDSY: Export › SLEF › copiar el texto.&#10;Coriolis: Export › SLEF › copiar el texto.&#10;Inara: en la ficha de tu nave, exportar en SLEF.&#10;También sirven los enlaces de importación de EDSY («edsy.org/#/I=…») y de Coriolis («coriolis.io/import?data=…»), y un evento Loadout del diario.&#10;Los enlaces cortos de Coriolis («coriolis.io/outfit/…?code=…») no se pueden leer.';
function screenEquipo(s, v) {
  loadShipData(); loadBuilds();
  const D = ui.shipData && ui.shipData !== 'loading' ? ui.shipData : null;
  const tab = ['mine', 'builds', 'wish'].includes(ui.eqTab) ? ui.eqTab : 'mine';
  const nB = (ui.builds || []).length;
  const right = tab === 'mine'
    ? `<span style="margin-left:auto;display:flex;gap:8px;align-items:center"><span class="eb dim">Exportar</span>
        <button type="button" class="tab small" data-shipexp="coriolis" title="Abre tu nave actual, con su ingeniería, en coriolis.io (en tu navegador)">Abrir en Coriolis</button><button type="button" class="tab small" data-shipexp="edsy" title="Abre tu nave actual, con su ingeniería, en edsy.org (en tu navegador)">Abrir en EDSY</button><button type="button" class="tab small" data-shipexp="slef" title="Copia tu nave en formato SLEF al portapapeles, para pegarla en Inara, EDSY o Coriolis">Copiar SLEF</button></span>`
    : `<span style="margin-left:auto;display:flex;gap:8px;align-items:center"><button type="button" class="tab small on" data-bimport="1" title="${IMPORT_TIP}">Importar build</button></span>`;
  const msg = ui.eqMsg ? `<span class="eb ${ui.eqMsg.ok ? 'cyan' : 'red'}" style="font-size:11px">${esc(ui.eqMsg.text)}</span>` : '';
  const tabs = `<section class="pn card" style="gap:8px"><div style="display:flex;gap:8px;align-items:center">${[['mine', 'Tu nave'], ['builds', `Builds${nB ? ` · ${nB}` : ''}`], ['wish', 'Lista de deseos']].map(([k, t]) => `<button type="button" class="tab ${tab === k ? 'on' : ''}" data-eqtab="${k}">${t}</button>`).join('')}${right}</div>${msg}</section>`;
  if (!D) return `<div style="display:flex;flex-direction:column;gap:12px;height:100%">${tabs}<section class="pn card"><div class="empty">Cargando datos de naves…</div></section></div>`;
  const body = tab === 'builds' ? eqBuilds(s, D) : tab === 'wish' ? eqWish(s, D) : eqMine(s, v, D);
  return `<div style="display:flex;flex-direction:column;gap:12px;min-height:0;height:100%">${tabs}${body}</div>`;
}
function loadBuilds() {
  if (ui.builds || ui.buildsLoading || !window.edbubble || !window.edbubble.builds) return;
  ui.buildsLoading = true;
  window.edbubble.builds().then((b) => { ui.builds = b || []; ui.buildsLoading = false; render(); }).catch(() => { ui.builds = []; ui.buildsLoading = false; });
}
function bdPager(key, page, pages) {
  return pages > 1 ? `<span style="display:flex;align-items:center;gap:6px"><button type="button" class="pg" data-bdpg="${key}" data-d="-1" ${page === 0 ? 'disabled' : ''}>‹</button><span class="num soft" style="font-size:13px">${page + 1}/${pages}</span><button type="button" class="pg" data-bdpg="${key}" data-d="1" ${page >= pages - 1 ? 'disabled' : ''}>›</button></span>` : '';
}
function bdPage(key, list, per) {
  const pages = Math.max(1, Math.ceil(list.length / per)); const k = `bd_${key}`;
  ui[k] = Math.min(ui[k] || 0, pages - 1);
  return { items: list.slice(ui[k] * per, ui[k] * per + per), pager: bdPager(key, ui[k], pages) };
}
function modRow(D, slot, m, size) {
  if (!m) return `<div class="in eq-mod" style="opacity:.55"><span class="eb dim" style="font-size:10px">${esc(slotName(slot))}${size != null && !/^Slot/.test(slot) && /Hardpoint|Slot|Military|Cargo/.test(slot) ? '' : ''}</span><span class="nowrap soft" style="font-size:15px;font-style:italic">Vacío</span></div>`;
  const l = modLabel(D, m.item);
  return `<div class="in eq-mod ${m.on === false ? 'off' : ''}"><span class="eb dim" style="font-size:10px">${esc(slotName(slot))}${m.on === false ? ' · apagado' : ''}</span><span class="va nowrap" style="font-size:15px" title="${esc(l.sub)}">${esc(l.text)}</span>${engLine(m.eng)}</div>`;
}
function eqMine(s, v, D) {
  const S = s.ship || {};
  const sh = D.ships[String(S.type || '').toLowerCase()] || null;
  const L = v.shipLayout;
  if (!S.type || !L || !(S.modules || []).length) return '<section class="pn card"><div class="empty" style="flex-direction:column;gap:6px"><span class="va" style="font-size:18px;color:var(--soft)">Sin datos de tu nave</span><span style="font-size:14px">El juego los escribe al empezar la partida y al cambiar de nave o de módulos.</span></div></section>';
  const mods = S.modules || [];
  const engN = mods.filter((m) => m.eng && m.eng.bp).length;
  const free = [...L.core, ...L.hard, ...L.opt].filter((x) => !x.module).length;
  const hero = `<section class="pn card" style="gap:10px">
      <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:16px">
        <span style="display:flex;flex-direction:column;gap:2px;min-width:0"><span class="eb">${esc(sh ? sh.n : S.typeLocalised || S.type)}${S.ident ? ` · ${esc(S.ident)}` : ''}${sh && sh.spec ? ` · ${esc(sh.spec.manufacturer)}` : ''}</span><span class="ti nowrap" style="font-size:30px">${esc(or(S.name, sh ? sh.n : S.type))}</span></span>
        <div style="display:grid;grid-template-columns:repeat(6,auto);gap:8px">${stat('Salto máx.', S.maxJumpRange ? `${nf(S.maxJumpRange, 2)} ly` : '—', 'cyan')}${stat('Carga', S.cargoCapacity != null ? `${nf(S.cargoCapacity)} t` : '—')}${stat('Casco · último dato', S.hull != null ? `${nf(S.hull * 100)} %` : '—')}${stat('Reembolso', S.rebuy != null ? `${nf(S.rebuy)} cr` : '—')}${stat('Ingeniería', `${engN} / ${mods.length}`)}${stat('Ranuras libres', nf(free), free ? 'amber' : '')}</div>
      </div></section>`;
  const PER = 13;
  const col = (title, list, key) => {
    const { items, pager } = bdPage(`mine_${key}`, list, PER);
    return `<section class="pn card" style="min-height:0;overflow:hidden"><div style="display:flex;justify-content:space-between;align-items:center"><span class="ti" style="font-size:16px">${title}</span>${pager}</div><div style="display:flex;flex-direction:column;gap:4px">${items.map((x) => modRow(D, x.slot, x.module, x.size)).join('') || '<div class="empty">—</div>'}</div></section>`;
  };
  return `${hero}<div style="flex:1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;min-height:0">${col('Internos principales', L.core, 'core')}${col('Anclajes y apoyo', L.hard, 'hard')}${col('Internos opcionales', L.opt, 'opt')}</div>`;
}
const fmtDate = (iso) => (iso ? `${String(iso).slice(8, 10)}-${String(iso).slice(5, 7)}-${String(iso).slice(0, 4)}` : '—');
/** Cambios de la build que ya has hecho en tu nave de ese tipo (se mira en vivo). */
function wishDone(s, b, it) {
  const f = (s.fleet || {})[b.ship];
  const h = f && (f.modules || []).find((m) => m.slot && m.slot.toLowerCase() === it.slot.toLowerCase());
  if (it.kind === 'remove') return !!f && (!h || !h.item);
  if (!h || h.item !== it.item) return false;
  if (it.kind === 'eng') return !!(h.eng && h.eng.bp === it.eng.bp && (h.eng.level || 0) >= (it.eng.level || 0) && (!it.eng.exp || h.eng.exp === it.eng.exp));
  return true;
}
function buildSel() { const list = ui.builds || []; return list.find((b) => b.id === ui.buildSel) || list[0] || null; }
function eqBuilds(s, D) {
  const list = ui.builds || [];
  if (!list.length) return `<section class="pn card" style="flex:1"><div class="empty" style="flex-direction:column;gap:10px"><span class="va" style="font-size:20px;color:var(--soft)">Aún no has importado ninguna build</span><span style="font-size:14px;max-width:720px;text-align:center">En EDSY (Export › SLEF) o Coriolis (Export › SLEF) copia el texto, o copia un enlace de importación, y pulsa «Importar build». ED BUBBLE la compara con tu nave del mismo tipo y crea su lista de deseos. Se guarda hasta que la borres.</span><button type="button" class="tab on" data-bimport="1" title="${IMPORT_TIP}">Importar build</button></div></section>`;
  const sel = buildSel();
  const { items, pager } = bdPage('builds', list, 8);
  const rows = items.map((b) => {
    const pend = (b.wish || []).filter((it) => !wishDone(s, b, it)).length;
    return `<button type="button" class="in plan-row ${sel && b.id === sel.id ? 'sel' : ''}" data-buildsel="${esc(b.id)}" style="grid-template-columns:minmax(0,1fr) 120px">
      <span style="display:flex;flex-direction:column;min-width:0;text-align:left"><span class="va nowrap" style="font-size:16px">${esc(or(b.name, b.shipName))}</span><span class="eb dim nowrap" style="font-size:10px">${esc(b.shipName)} · ${esc(or(b.app, 'Importada'))} · ${fmtDate(b.at)}</span></span>
      <span class="num ${pend ? 'amber' : 'cyan'}" style="text-align:right">${pend ? `${nf(pend)} cambios` : 'Hecha'}</span></button>`;
  }).join('');
  let detail = '';
  if (sel) {
    const L = sel.modules || [];
    const grp = { core: [], hard: [], opt: [] };
    for (const m of L) grp[/Hardpoint/.test(m.slot) ? 'hard' : (m.slot === 'Armour' || CORE_SLOTS.some(([k]) => k === m.slot)) ? 'core' : 'opt'].push(m);
    const { items: mods, pager: mp } = bdPage('bmods', [...grp.core, ...grp.hard, ...grp.opt], 24);
    const confirm = ui.buildDel === sel.id;
    detail = `<section class="pn card" style="min-height:0;overflow:hidden">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px"><span style="display:flex;flex-direction:column;min-width:0"><span class="eb">${esc(sel.shipName)} · ${esc(or(sel.app, 'Importada'))}</span><span class="ti nowrap" style="font-size:24px">${esc(or(sel.name, sel.shipName))}</span>
        <span class="soft" style="font-size:13px">${sel.against ? `Comparada con tu ${esc(sel.shipName)}${sel.against.name ? ` «${esc(sel.against.name)}»` : ''}` : `No tienes una ${esc(sel.shipName)}: la lista de deseos es la build entera`}</span></span>
        <span style="display:flex;gap:6px">${confirm ? `<button type="button" class="tab small" data-bdel="${esc(sel.id)}" style="border-color:var(--red,#ff4b4b);color:var(--red,#ff4b4b)">Sí, borrar</button><button type="button" class="tab small" data-bdelno="1">No</button>` : `<button type="button" class="tab small" data-eqtab="wish">Lista de deseos</button><button type="button" class="tab small" data-bdelask="${esc(sel.id)}">Borrar</button>`}</span></div>
      <div style="display:flex;justify-content:space-between;align-items:center"><span class="eb">Módulos de la build · ${nf(L.length)}</span>${mp}</div>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px">${mods.map((m) => modRow(D, m.slot, m, null)).join('')}</div>
    </section>`;
  }
  return `<div style="flex:1;display:grid;grid-template-columns:minmax(0,0.8fr) minmax(0,1.2fr);gap:12px;min-height:0">
    <section class="pn card" style="min-height:0;overflow:hidden"><div style="display:flex;justify-content:space-between;align-items:center"><span class="ti" style="font-size:16px">Builds guardadas</span>${pager}</div><div style="display:flex;flex-direction:column;gap:4px">${rows}</div>
      <span class="note" style="margin-top:auto">Se guardan en tu equipo hasta que las borres. La comparación es con la última vez que el diario vio tu nave de ese tipo.</span></section>
    ${detail}</div>`;
}
const WISH_KIND = { buy: ['Cambiar', 'amber'], add: ['Montar', 'amber'], remove: ['Quitar', 'soft'], eng: ['Ingeniería', 'cyan'] };
function eqWish(s, D) {
  const list = ui.builds || [];
  if (!list.length) return eqBuilds(s, D);
  const sel = buildSel();
  const idx = list.indexOf(sel);
  const nav = `<div style="display:flex;align-items:center;gap:8px"><button type="button" class="pg" data-buildstep="-1" ${idx <= 0 ? 'disabled' : ''}>‹</button><span style="display:flex;flex-direction:column;min-width:0;flex:1"><span class="va nowrap" style="font-size:16px">${esc(or(sel.name, sel.shipName))}</span><span class="eb dim nowrap" style="font-size:10px">${esc(sel.shipName)} · build ${idx + 1} de ${list.length}</span></span><button type="button" class="pg" data-buildstep="1" ${idx >= list.length - 1 ? 'disabled' : ''}>›</button></div>`;
  const wish = (sel.wish || []).map((it, i) => ({ ...it, i, done: wishDone(s, sel, it) }));
  const pend = wish.filter((x) => !x.done);
  const order = [...pend, ...wish.filter((x) => x.done)];
  const { items, pager } = bdPage('wish', order, 11);
  const cur = order.find((x) => x.i === ui.wishSel) || pend[0] || null;
  const total = pend.filter((x) => x.kind === 'buy' || x.kind === 'add').reduce((a, x) => a + ((D.modules[x.item] && D.modules[x.item].s && D.modules[x.item].s.cost) || 0), 0);
  const rows = items.map((x) => {
    const [kt, kc] = WISH_KIND[x.kind] || ['', ''];
    const to = x.item ? modLabel(D, x.item).text : 'Dejar vacía';
    const from = x.from ? modLabel(D, x.from).text : 'Vacía';
    return `<button type="button" class="in plan-row ${cur && x.i === cur.i ? 'sel' : ''}" data-wishsel="${x.i}" style="grid-template-columns:minmax(0,1fr) 92px;${x.done ? 'opacity:.5' : ''}">
      <span style="display:flex;flex-direction:column;min-width:0;text-align:left"><span class="va nowrap" style="font-size:15px">${x.done ? '✓ ' : ''}${esc(x.kind === 'eng' ? to : to)}</span><span class="eb dim nowrap" style="font-size:10px">${esc(slotName(x.slot))} · ${x.kind === 'eng' ? esc(engText(x.eng)) : `ahora: ${esc(from)}`}</span></span>
      <span class="eb ${x.done ? 'cyan' : kc}" style="text-align:right">${x.done ? 'Hecho' : kt}</span></button>`;
  }).join('') || '<span class="soft" style="font-size:14px">Tu nave ya es igual que esta build.</span>';
  const left = `<section class="pn card" style="min-height:0;overflow:hidden">${nav}
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">${stat('Pendientes', nf(pend.length), pend.length ? 'amber' : 'cyan')}${stat('Hechos', nf(wish.length - pend.length))}${stat('Precio normal', total ? fmtCr(total) : '—')}</div>
      <div style="display:flex;justify-content:space-between;align-items:center"><span class="eb">Lo que cambia</span>${pager}</div>
      <div style="display:flex;flex-direction:column;gap:4px">${rows}</div></section>`;
  return `<div style="flex:1;display:grid;grid-template-columns:minmax(0,0.9fr) minmax(0,1.1fr);gap:12px;min-height:0">${left}${wishBuy(s, D, sel, cur)}</div>`;
}
function engText(e) {
  if (!e || !e.bp) return '';
  const R = ui.recipes && ui.recipes !== 'loading' ? ui.recipes : null;
  const bp = R && R.blueprints[e.bp] ? R.blueprints[e.bp].name : String(e.bp).replace(/^[^_]*_/, '').replace(/([a-z])([A-Z])/g, '$1 $2');
  const ex = e.exp ? (R && R.specials[e.exp] ? R.specials[e.exp].name : e.exp) : '';
  return `${bp} G${e.level ?? '?'}${ex ? ` · ${ex}` : ''}`;
}
const BUY_DIST = [[0, 'Todas'], [20, '20 ly'], [50, '50 ly'], [100, '100 ly']];
function wishBuy(s, D, b, it) {
  const box = (inner) => `<section class="pn card" style="min-height:0;overflow:hidden">${inner}</section>`;
  if (!it) return box('<div class="empty">Elige un cambio de la lista.</div>');
  const to = it.item ? modLabel(D, it.item) : null;
  const head = `<span class="eb">${esc(slotName(it.slot))}</span><span class="ti nowrap" style="font-size:22px">${esc(to ? to.text : 'Dejar la ranura vacía')}</span>${to && to.sub ? `<span class="eb dim">${esc(to.sub)}</span>` : ''}`;
  if (it.kind === 'remove') return box(`${head}<span class="soft" style="font-size:15px">La build no lleva nada en esta ranura: puedes venderlo o guardarlo en el almacén de módulos.</span>`);
  const eng = it.eng && it.eng.bp ? `<div class="in" style="display:flex;flex-direction:column;gap:2px;padding:8px 12px"><span class="eb">Ingeniería de la build</span><span class="cyan">${esc(engText(it.eng))}</span>${it.kind === 'eng' && it.fromEng ? `<span class="eb dim" style="font-size:10px">Ahora: ${esc(engText(it.fromEng))}</span>` : ''}</div>` : '';
  if (it.kind === 'eng') return box(`${head}${eng}<span class="note">Ya tienes el módulo: solo falta la ingeniería. En Ingenieros puedes ver quién la hace y qué materiales pide.</span><button type="button" class="tab small" data-goto="ingenieros" style="align-self:flex-start">Ir a Ingenieros</button>`);
  // dónde comprar
  const q = ui.buy || {};
  if (q.item !== it.item && !q.loading) {
    ui.buy = { item: it.item, loading: true };
    if (window.edbubble && window.edbubble.buySearch) window.edbubble.buySearch(it.item).then((r) => { if (ui.buy && ui.buy.item === it.item) { ui.buy = { item: it.item, ...r }; render(); } }).catch((e) => { ui.buy = { item: it.item, ok: false, error: e.message }; render(); });
  }
  const B = ui.buy || {};
  const dist = ui.buyDist ?? 0; const sort = ui.buySort || 'dist'; const large = !!ui.buyLarge;
  const filt = `<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
      ${BUY_DIST.map(([d, t]) => `<button type="button" class="tab small ${dist === d ? 'on' : ''}" data-buydist="${d}">${t}</button>`).join('')}
      <span style="width:8px"></span><button type="button" class="tab small ${sort === 'dist' ? 'on' : ''}" data-buysort="dist">Más cerca</button><button type="button" class="tab small ${sort === 'price' ? 'on' : ''}" data-buysort="price">Más barato</button>
      <span style="width:8px"></span><button type="button" class="tab small ${large ? 'on' : ''}" data-buylarge="1">Plataforma L</button></div>`;
  let list;
  if (B.loading) list = '<div class="empty">Buscando en Spansh…</div>';
  else if (B.ok === false) list = `<div class="empty" style="color:var(--amber)">${esc(B.error || 'No se pudo buscar.')}</div>`;
  else {
    let r = (B.results || []).filter((x) => (!dist || (x.distance ?? 0) <= dist) && (!large || x.pad === 'L'));
    r = r.slice().sort(sort === 'price' ? (a, c) => (a.price ?? 9e15) - (c.price ?? 9e15) || (a.distance ?? 0) - (c.distance ?? 0) : (a, c) => (a.distance ?? 0) - (c.distance ?? 0));
    const { items, pager } = bdPage('buy', r, 7);
    const best = r.reduce((m, x) => Math.max(m, x.discount || 0), 0);
    list = `<div style="display:flex;justify-content:space-between;align-items:center"><span class="eb">${nf(r.length)} estaciones${B.ref ? ` · desde ${esc(B.ref)}` : ''}${best ? ` · <span class="cyan">hasta −${best} %</span>` : ''}</span>${pager}</div>
      <div style="display:flex;flex-direction:column;gap:4px">${items.map((x) => `<div class="in" style="display:grid;grid-template-columns:minmax(0,1fr) 120px 150px;gap:10px;align-items:center;padding:6px 12px">
        <span style="display:flex;flex-direction:column;min-width:0"><span class="va nowrap">${esc(x.station)} <span class="soft" style="font-size:12px">· ${esc(x.pad || '?')}${x.carrier ? ' · carrier' : x.planetary ? ' · superficie' : ''}</span></span><span class="eb dim nowrap" style="font-size:10px">${esc(x.system)}${x.ls != null ? ` · ${nf(x.ls)} ls` : ''}${x.power ? ` · ${esc(x.power)}${x.powerState ? ` (${esc(x.powerState)})` : ''}` : ''}</span></span>
        <span class="num soft" style="text-align:right">${x.distance != null ? `${nf(x.distance, 1)} ly` : '—'}</span>
        <span style="display:flex;flex-direction:column;align-items:flex-end"><span class="num ${x.discount ? 'cyan' : ''}">${x.price != null ? fmtCr(x.price) : '—'}</span>${x.discount ? `<span class="eb cyan" style="font-size:10px">−${x.discount} %${x.power ? ' · Powerplay' : ''}</span>` : ''}</span></div>`).join('') || '<span class="soft" style="font-size:14px">Ninguna estación con estos filtros entre las 100 más cercanas que lo venden.</span>'}</div>`;
  }
  const base = B.results && B.results[0] ? B.results[0].base : (D.modules[it.item] && D.modules[it.item].s ? D.modules[it.item].s.cost : null);
  return box(`${head}<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">${stat('Precio normal', base ? fmtCr(base) : '—')}${stat('Ahora en la ranura', it.from ? modLabel(D, it.from).text : 'Vacía')}</div>${eng}${filt}${list}
    <span class="note" style="margin-top:auto">Datos de Spansh (las 100 estaciones más cercanas que lo venden). El descuento compara con el precio normal; si el sistema tiene potencia, suele ser de Powerplay.</span>`);
}

/* ---------- Ingenieros (naves y a pie) ---------- */
// Retratos recortados de la ficha de ingenieros (los que el usuario tiene a la vista); el resto, iniciales.
// Clase del ingeniero de a pie (estratégico, de fuerza o dinámico), con el color de sus fichas.
const ENG_REP = { mejoras: 'mejoras de módulos', exploracion: 'venta de datos de exploración', mercancias: 'venta de mercancías', recompensas: 'cobro de recompensas', bonos: 'cobro de bonos de combate' };
const ENG_TIPOS = { estrategico: ['Estratégico', '#7ed321'], fuerza: ['De fuerza', '#ff6a1a'], dinamico: ['Dinámico', '#e040d8'] };
function engTipo(e, size) {
  const t = e.tipo && ENG_TIPOS[e.tipo];
  return t ? `<span class="eb" style="font-size:${size}px;color:${t[1]};border-color:${t[1]}">${t[0]}</span>` : '';
}
const PORTRAITS = new Set(['baltanos', 'bill-turner', 'broo-tarquin', 'colonel-bris-dekker', 'didi-vatermann', 'domino-green', 'elvira-martuuk', 'felicity-farseer', 'hera-tani', 'hero-ferrari', 'jude-navarro', 'juri-ishmaak', 'kit-fowler', 'lei-cheung', 'liz-ryder', 'lori-jameson', 'marco-qwent', 'petra-olmanova', 'professor-palin', 'ram-tah', 'rosa-dayette', 'selene-jean', 'the-dweller', 'the-sarge', 'tiana-fortune', 'tod-the-blaster-mcquinn', 'uma-laszlo', 'wellington-beck', 'yarden-bond', 'zacariah-nemo', 'terra-velasquez', 'oden-geiger', 'eleanor-bresa', 'yi-shen', 'mel-brandon', 'chloe-sedesi', 'marsha-hicks', 'etienne-dorn']);
const ENG_CATS = [['H', 'Anclajes'], ['U', 'Apoyo'], ['C', 'Internos principales'], ['O', 'Internos opcionales']];
const ENG_PAGE = 15;
function portrait(e, size) {
  if (PORTRAITS.has(e.slug)) return `<img class="eng-pic" src="engineers/${e.slug}.jpg" alt="" style="width:${size}px;height:${size}px">`;
  const ini = e.name.replace(/'.*?'/g, '').split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('');
  return `<span class="eng-pic eng-ini" style="width:${size}px;height:${size}px;font-size:${Math.round(size / 2.6)}px">${esc(ini)}</span>`;
}
function engStatus(e, kind) {
  if (e.status === 'unlocked') return kind === 'ship' ? ['cyan', e.rank ? `Tu grado ${e.rank}` : 'Desbloqueado'] : ['cyan', 'Con acceso'];
  if (e.status === 'invited') return ['amber', 'Invitado'];
  if (e.status === 'known') return ['amber', 'Conocido'];
  return ['dim', 'Sin datos'];
}
function loadRecipes() {
  if (ui.recipes || !window.edbubble || !window.edbubble.recipes) return;
  ui.recipes = 'loading';
  window.edbubble.recipes().then((r) => { ui.recipes = r; render(); }).catch(() => { ui.recipes = null; });
}
const matHave = (k, n, have, R) => ((R.mats[k] || {}).untracked ? true : ((have && have[k]) || 0) >= n);
const matChip = (k, need, have, R) => { const m = R.mats[k] || {}; if (m.untracked) return `<span class="upm" title="No sale en el diario de materiales: compruébalo en el juego">${esc(m.name || k)} <b>×${need}</b></span>`; const h = (have && have[k]) || 0; return `<span class="upm ${h >= need ? 'ok' : ''}" title="${esc(m.name || k)} · ${esc({ Raw: 'bruto', Manufactured: 'fabricado', Encoded: 'codificado' }[m.type] || '')} G${m.grade || '?'}">${esc(m.name || k)} <b>${h}/${need}</b></span>`; };
/** Recetas de un módulo con el tope de grado del ingeniero y lo que tienes. */
function recipePanel(s, e, module) {
  const R = ui.recipes;
  const back = '<button type="button" class="tab small" data-engrecipe="">‹ Volver</button>';
  if (!R || R === 'loading') return `<div style="display:flex;justify-content:flex-end">${back}</div><div class="empty">Cargando recetas…</div>`;
  const mr = R.modules[module];
  const mod = e.mods.find((m) => m.key === module);
  if (!mr || !mod) return `<div style="display:flex;justify-content:flex-end">${back}</div><div class="empty">Sin recetas para este módulo.</div>`;
  const have = s.materials;
  const bpId = mr.bp.includes(ui.engBp) ? ui.engBp : mr.bp[0];
  const tabs = `<div style="display:flex;gap:6px;flex-wrap:wrap">${mr.bp.map((id) => `<button type="button" class="tab small ${!ui.engExp && id === bpId ? 'on' : ''}" data-engbp="${esc(id)}">${esc(R.blueprints[id].name)}</button>`).join('')}${mr.sp.length ? `<button type="button" class="tab small ${ui.engExp ? 'on' : ''}" data-engexp="1">Experimentales</button>` : ''}</div>`;
  let body;
  if (ui.engExp) {
    body = mr.sp.map((id) => { const sp = R.specials[id]; const ok = sp.m.every(([k, n]) => matHave(k, n, have, R));
      return `<div class="in" style="padding:7px 10px;display:flex;flex-direction:column;gap:4px"><span style="display:flex;justify-content:space-between;gap:8px"><span class="va nowrap">${esc(sp.name)}</span>${have ? `<span class="eb ${ok ? 'cyan' : 'dim'}" style="font-size:10px">${ok ? 'Listo' : ''}</span>` : ''}</span><span style="display:flex;flex-wrap:wrap;gap:4px">${sp.m.map(([k, n]) => matChip(k, n, have, R)).join('')}</span></div>`; }).join('');
  } else {
    const bp = R.blueprints[bpId];
    const rank = e.status === 'unlocked' ? (e.rank || 0) : 0;
    body = Object.keys(bp.g).map(Number).filter((g) => g <= mod.grade).sort((a, b) => a - b).map((g) => { const ok = bp.g[g].every(([k, n]) => matHave(k, n, have, R));
      return `<div class="in" style="padding:7px 10px;display:grid;grid-template-columns:34px minmax(0,1fr);gap:8px;align-items:center;${g > rank ? 'opacity:.6' : ''}"><span class="num ${have && ok ? 'cyan' : ''}" style="font-size:18px">G${g}</span><span style="display:flex;flex-wrap:wrap;gap:4px">${bp.g[g].map(([k, n]) => matChip(k, n, have, R)).join('')}${g > rank ? `<span class="eb amber" style="font-size:9px;align-self:center">${rank ? `Necesitas grado ${g} con ${esc(e.name)}` : 'Aún no lo tienes desbloqueado'}</span>` : ''}</span></div>`; }).join('');
  }
  return `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span style="display:flex;flex-direction:column;min-width:0"><span class="va nowrap" style="font-size:17px">${esc(mod.name)}</span><span class="eb dim" style="font-size:10px">${esc(e.name)} lo hace hasta G${mod.grade}</span></span>${back}</div>
    ${tabs}
    ${have ? '' : '<span class="eb amber">Aún no sé tus materiales: el juego los guarda al empezar la partida</span>'}
    ${!ui.engExp && R.blueprints[bpId].merc ? '<span class="eb amber">Solo para módulos Merc · pide Merc Coin</span>' : ''}
    <div style="display:flex;flex-direction:column;gap:4px">${body}</div>
    <span class="soft" style="font-size:12px;line-height:1.35;margin-top:auto">Cada tirada gasta la receta de su grado. Los materiales son los mismos con cualquier ingeniero; él solo pone el grado máximo.</span>`;
}
function screenIngenieros(s, v) {
  const E = v.engineers || { ship: [], suit: [], modules: {} };
  const kind = ui.engKind === 'suit' ? 'suit' : 'ship';
  if (kind === 'ship') loadRecipes();
  const tabs = `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
    <button type="button" class="tab ${kind === 'ship' ? 'on' : ''}" data-engkind="ship">Naves · ${E.ship.length}</button>
    <button type="button" class="tab ${kind === 'suit' ? 'on' : ''}" data-engkind="suit">A pie · ${E.suit.length}</button>
    ${kind === 'ship' ? `<span style="width:16px"></span><button type="button" class="tab small ${!ui.engCat ? 'on' : ''}" data-engcat="">Todo</button>${ENG_CATS.map(([k, t]) => `<button type="button" class="tab small ${ui.engCat === k ? 'on' : ''}" data-engcat="${k}">${t}</button>`).join('')}` : ''}
  </div>`;
  const chips = kind === 'ship' && ui.engCat ? `<div style="display:flex;gap:6px;flex-wrap:wrap">${(E.modules[ui.engCat] || []).map((m) => `<button type="button" class="tab small ${ui.engModule === m.key ? 'on' : ''}" data-engmodule="${esc(m.key)}">${esc(m.name)}</button>`).join('')}</div>` : '';
  let list = kind === 'ship' ? E.ship.slice() : E.suit.slice();
  const mod = kind === 'ship' && ui.engModule ? ui.engModule : null;
  if (mod) {
    list = list.filter((e) => e.mods.some((m) => m.key === mod)).map((e) => ({ ...e, grade: e.mods.find((m) => m.key === mod).grade }));
    const order = { unlocked: 0, invited: 1, known: 2, none: 3 };
    list.sort((a, b) => b.grade - a.grade || order[a.status] - order[b.status] || !!a.colonia - !!b.colonia);
  } else {
    const order = { unlocked: 0, invited: 1, known: 2, none: 3 };
    list.sort((a, b) => order[a.status] - order[b.status] || !!a.colonia - !!b.colonia || a.name.localeCompare(b.name));
  }
  const pages = Math.max(1, Math.ceil(list.length / ENG_PAGE));
  ui.engPage = Math.min(ui.engPage, pages - 1);
  const modName = mod ? ((Object.values(E.modules).flat().find((m) => m.key === mod) || {}).name || mod) : null;
  const cards = list.slice(ui.engPage * ENG_PAGE, (ui.engPage + 1) * ENG_PAGE).map((e) => {
    const [cls, txt] = engStatus(e, kind);
    const extra = mod ? `<span class="num ${e.grade >= 5 ? 'cyan' : ''}" style="font-size:22px">G${e.grade}</span>`
      : kind === 'ship' ? `<span class="soft" style="font-size:12px">${e.mods.length} módulos</span>` : `<span class="soft" style="font-size:12px">${e.suitMods.length} de traje · ${e.weaponMods.length} de arma</span>`;
    return `<button type="button" class="in eng-card ${ui.engOpen === e.slug ? 'sel' : ''}" data-engopen="${e.slug}">
      ${portrait(e, 64)}
      <span style="display:flex;flex-direction:column;gap:3px;min-width:0;flex:1">
        <span style="display:flex;justify-content:space-between;gap:6px;align-items:baseline"><span class="va nowrap" style="font-size:16px">${esc(e.name)}</span><span class="eb ${cls}" style="font-size:10px">${txt}</span></span>
        <span class="soft nowrap" style="font-size:12px">${esc(e.site)} · ${esc(e.system)}</span>
        <span style="display:flex;justify-content:space-between;align-items:center;gap:6px"><span style="display:flex;gap:4px">${e.permit ? '<span class="eb red" style="font-size:9px">Permiso</span>' : ''}${e.colonia ? '<span class="eb dim" style="font-size:9px">Colonia</span>' : ''}${engTipo(e, 9)}</span>${extra}</span>
      </span>
    </button>`;
  }).join('') || '<div class="empty">Ningún ingeniero mejora ese módulo.</div>';
  const open = list.find((e) => e.slug === ui.engOpen) || list[0];
  let detail = '<div class="empty">Elige un ingeniero.</div>';
  if (open) {
    const [cls, txt] = engStatus(open, kind);
    const status = kind === 'ship'
      ? (open.status === 'unlocked' ? `Desbloqueado${open.rank ? ` · tu grado con él: G${open.rank}` : ''}` : open.status === 'invited' ? 'Invitado: te falta el contrato inicial' : open.status === 'known' ? 'Lo conoces, pero aún no tienes acceso' : 'Aún no sabes de él')
      : (open.status === 'unlocked' ? 'Tienes acceso' : open.status === 'known' ? 'Lo conoces, pero aún no tienes acceso' : 'Aún no sabes de él');
    const groups = kind === 'ship'
      ? ENG_CATS.map(([k, t]) => { const ms = open.mods.filter((m) => m.cat === k); return ms.length ? `<span class="eb dim" style="margin-top:6px">${t}</span>${ms.map((m) => { const has = ui.recipes && ui.recipes !== 'loading' && ui.recipes.modules[m.key]; return `<${has ? 'button type="button"' : 'span'} class="eng-mod ${has ? 'click' : ''} ${m.key === mod ? 'on' : ''}" ${has ? `data-engrecipe="${esc(m.key)}"` : ''}><span>${esc(m.name)}${has ? ' <span class="soft">›</span>' : ''}</span><span class="num ${m.grade >= 5 ? 'cyan' : ''}">G${m.grade}</span></${has ? 'button' : 'span'}>`; }).join('')}` : ''; }).join('')
      : `<span class="eb dim" style="margin-top:6px">Traje</span>${open.suitMods.map((m) => `<span class="eng-mod"><span>${esc(m)}</span></span>`).join('')}<span class="eb dim" style="margin-top:6px">Armas</span>${open.weaponMods.map((m) => `<span class="eng-mod"><span>${esc(m)}</span></span>`).join('')}`;
    detail = `
      <div style="display:flex;gap:14px;align-items:center">${portrait(open, 112)}
        <span style="display:flex;flex-direction:column;gap:4px;min-width:0"><span class="ti" style="font-size:20px">${esc(open.name)}</span>
          <span class="soft" style="font-size:14px">${esc(open.site)}</span>
          <span style="display:flex;gap:8px;align-items:center"><span class="va" style="font-size:15px">${esc(open.system)}</span><button type="button" class="tab small" data-copy="1" data-name="${esc(open.system)}">Copiar</button></span>
        </span></div>
      <span style="display:flex;gap:6px;flex-wrap:wrap"><span class="eb ${cls}">${status}</span>${engTipo(open, 11)}</span>
      ${open.permit ? '<span class="eb red">Su sistema pide permiso</span>' : ''}${open.colonia ? '<span class="eb dim">Está en Colonia, a unos 22.000 ly de la Burbuja</span>' : ''}
      ${open.unlock && open.status !== 'unlocked' ? `<div class="in" style="padding:8px 12px;display:flex;flex-direction:column;gap:4px"><span class="eb amber" style="font-size:10px">Cómo desbloquearlo</span><span style="font-size:13px;line-height:1.35">${esc(open.unlock).replace(/\. (?=(Conocer|Acceso|Desbloqueo):)/g, '.<br>')}</span></div>` : ''}
      ${open.presenta && open.presenta.length ? `<span class="soft" style="font-size:12px">Te presenta a: ${open.presenta.map(esc).join(', ')}</span>` : ''}
      ${open.rep && !(open.status === 'unlocked' && open.rank >= 5) ? `<span class="soft" style="font-size:12px">Sube la reputación con: ${open.rep.map((r) => ENG_REP[r] || r).join(' · ')}</span>` : ''}
      <div style="display:flex;flex-direction:column;gap:2px">${groups}</div>
      ${kind === 'ship' ? '<span class="eb dim" style="font-size:10px;margin-top:auto">Toca un módulo para ver sus recetas y lo que te falta</span>' : ''}`;
    if (kind === 'ship' && ui.engRecipe && open.mods.some((m) => m.key === ui.engRecipe)) detail = recipePanel(s, open, ui.engRecipe);
  }
  const feedback = ui.navFeedback && Date.now() - ui.navFeedback.at < 3000 ? `<span class="eb cyan">${esc(ui.navFeedback.text)}</span>` : '';
  return `<div style="display:flex;flex-direction:column;gap:12px;min-height:0;height:100%">
    <section class="pn card" style="gap:10px">${tabs}${chips}</section>
    <div style="flex:1;display:grid;grid-template-columns:minmax(0,1fr) 420px;gap:12px;min-height:0">
      <section class="pn card" style="min-height:0;overflow:hidden">
        <div style="display:flex;justify-content:space-between;align-items:center"><span class="ti" style="font-size:16px">${mod ? `Quién mejora: ${esc(modName)}` : kind === 'ship' ? 'Ingenieros de naves' : 'Ingenieros de equipo a pie'}</span><span class="eb dim">${list.length} ingenieros</span></div>
        <div class="eng-grid">${cards}</div>
        <span style="display:flex;justify-content:flex-end;margin-top:auto">${pager2('eng', ui.engPage, pages)}</span>
      </section>
      <section class="pn card" style="min-height:0;overflow:hidden">${detail}${feedback}</section>
    </div>
  </div>`;
}

/* ---------- destino final (estación) ---------- */
function finalStrip(s) {
  const f = ui.finalDest;
  if (!f) return '';
  return `<div class="in" style="padding:10px 12px;display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:10px;align-items:center;border-color:#5a4524">
      ${f.icon ? `<img src="icons/${f.icon}.png" alt="" style="width:40px;height:40px;object-fit:contain">` : '<span></span>'}
      <span style="display:flex;flex-direction:column;min-width:0"><span class="eb amber" style="font-size:10px">Destino final</span><span class="va nowrap" style="font-size:16px">${esc(siteName(f.station))} <span class="soft">· ${esc(f.system)}</span></span>${f.commodity ? `<span class="eb" style="font-size:10px">Comprar ${esc(f.commodity)}</span>` : ''}</span>
      <button type="button" class="pg" data-finalclear="1" title="Olvidar destino" style="width:auto;padding:0 8px">✕</button>
    </div>`;
}

function arrivedCard(s) {
  const f = ui.finalDest;
  if (!f || !s.location.system || f.system.toLowerCase() !== s.location.system.toLowerCase()) return '';
  return `
    <section class="pn card" style="border-left:3px solid var(--amber);gap:12px">
      <div style="display:flex;justify-content:space-between;align-items:baseline"><span class="ti" style="font-size:16px">Has llegado · ve a la estación</span><button type="button" class="pg" data-finalclear="1" title="Olvidar destino" style="width:auto;padding:0 8px">✕</button></div>
      <div style="display:flex;align-items:center;gap:14px">
        ${f.icon ? `<img src="icons/${f.icon}.png" alt="" style="width:64px;height:64px;object-fit:contain">` : ''}
        <span style="display:flex;flex-direction:column;min-width:0"><span class="ti nowrap" style="font-size:28px">${esc(siteName(f.station))}</span><span class="eb">${esc(f.label || '')} · ${esc(f.system)}</span></span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">
        ${stat('Distancia', f.ls != null ? `${nf(f.ls, 0)} ls` : '—', 'cyan')}${stat('Plataforma', f.pad || '?', f.pad === 'L' ? 'amber' : '')}${stat('Comprar', esc(f.commodity || '—'))}
      </div>
      ${f.supply != null ? `<span class="eb soft">Stock ${nf(f.supply)} t · ${nf(f.price)} cr/t</span>` : ''}
      <span class="eb dim">Selecciónala en el panel izquierdo › Navegación</span>
    </section>`;
}

/* ---------- esquema de atraque (SVG) ---------- */
function dockingSvg(padNum, width, hour, depth) {
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
    const on = i === hot;
    const [x, y] = pt(on && depth != null ? 112 - depth * 10 : RP, i * 30); const h = on ? 12 : 11;
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
/* Si algo falla al pintar, se avisa en la cabecera y se guarda en ed-bubble.log
   (en lugar de dejar la pantalla congelada sin decir nada). */
const reported = new Set();
function reportError(where, e) {
  const msg = `${where}: ${(e && (e.stack || e.message)) || e}`;
  if (!reported.has(msg) && window.edbubble && window.edbubble.log) { reported.add(msg); window.edbubble.log(msg); }
}
window.addEventListener('error', (ev) => reportError('error', ev.error || ev.message));
window.addEventListener('unhandledrejection', (ev) => reportError('promesa', ev.reason));

// Ingenieros de equipo a pie (Odyssey), por si el Journal no trae EngineerID
const ODYSSEY_ENGINEERS = new Set(['Domino Green', 'Hero Ferrari', 'Jude Navarro', 'Kit Fowler', 'Oden Geiger', 'Terra Velasquez', 'Uma Laszlo', 'Wellington Beck', 'Yarden Bond', 'Baltanos', 'Eleanor Bresa', 'Rosa Dayette', 'Yi Shen']);

/* ---------- Controles: guía e importación de .binds ---------- */
const BINDS_PAGE = 10;
const BINDS_HELP = {
  nofolder: 'El juego aún no ha guardado controles en este PC. Abre Elite Dangerous, entra en Opciones › Controles, cambia cualquier cosa y guarda.',
  nopreset: 'No encuentro qué esquema usas. Abre Opciones › Controles en el juego y guarda tu esquema una vez.',
  builtin: 'Los esquemas que vienen con el juego no se guardan en tu carpeta. En Opciones › Controles cambia cualquier tecla y guarda el esquema con un nombre tuyo: la app lo detectará sola.',
  read: 'No puedo leer el archivo elegido. Importa otro o vuelve a usar el esquema activo del juego.',
  format: 'Ese archivo no es de controles de Elite Dangerous. Elige un archivo .binds.',
};

function screenControles(s, v) {
  const c = ui.controls;
  const step = (n, title, text, state) => `<div class="in" style="display:grid;grid-template-columns:44px minmax(0,1fr);gap:12px;padding:12px 14px;${state === 'now' ? 'border-color:var(--amber)' : ''}">
      <span class="num" style="font-size:26px;color:${state === 'done' ? 'var(--cyan)' : state === 'now' ? 'var(--amber)' : 'var(--eb)'}">${state === 'done' ? '✓' : n}</span>
      <span style="display:flex;flex-direction:column;gap:3px;min-width:0"><span class="va" style="font-size:17px">${title}</span><span class="soft" style="font-size:14px;line-height:1.35">${text}</span></span></div>`;
  const found = c && !c.error;
  const k = found ? c.check : null;
  const allOk = k && k.ready === k.total;
  const guide = `
    <section class="pn card">
      <span class="ti" style="font-size:16px">Cómo preparar tus controles</span>
      <span class="soft" style="font-size:14px">ED BUBBLE pulsa por ti las teclas que tienes asignadas en el juego. Para eso necesita leer tu archivo de controles (.binds).</span>
      ${step(1, 'Guarda tu esquema en el juego', 'Opciones › Controles. Si usas uno de los que trae el juego (teclado y ratón, mando…), cambia cualquier tecla y guárdalo con un nombre tuyo: así se crea tu archivo .binds.', found ? 'done' : 'now')}
      ${step(2, 'Asigna teclas de teclado', 'La app envía teclas de teclado, no botones de HOTAS ni de mando. A cada acción marcada «Solo en mando» o «Sin asignar» ponle una tecla en la columna secundaria; la principal puede seguir en tu HOTAS.', !found ? '' : allOk ? 'done' : 'now')}
      ${step(3, 'Guarda y vuelve aquí', 'La app relee tus controles en cuanto el juego los guarda. Si no los encuentra, pulsa «Importar archivo .binds» y elige el tuyo en la carpeta de controles.', allOk ? 'done' : '')}
      ${step(4, 'Juega con Elite en primer plano', 'Las teclas van a la ventana del juego. Si Elite no tiene el foco, la acción se cancela para no escribir en otra ventana.', '')}
      <div class="in" style="padding:10px 14px;display:flex;flex-direction:column;gap:2px"><span class="eb" style="font-size:10px">Carpeta de controles de Elite Dangerous</span><span class="num soft" style="font-size:13px;word-break:break-all">${esc((c && c.defaultFolder) || '%LOCALAPPDATA%\\Frontier Developments\\Elite Dangerous\\Options\\Bindings')}</span></div>
    </section>`;

  const msg = ui.bindsMsg ? `<span class="eb ${ui.bindsMsg.ok ? 'cyan' : 'red'}" style="white-space:normal">${esc(ui.bindsMsg.text)}</span>` : '';
  const status = !c ? '<div class="empty">Leyendo tus controles…</div>' : `
      <div style="display:grid;grid-template-columns:minmax(0,1fr) 240px;gap:16px;align-items:center">
        <span style="display:flex;flex-direction:column;gap:4px;min-width:0">
          <span class="eb">${c.source === 'file' ? 'Archivo importado' : 'Automático · esquema activo del juego'}</span>
          <span class="ti nowrap" style="font-size:30px">${esc(c.preset || 'Sin controles')}</span>
          <span class="soft nowrap" style="font-size:13px" title="${esc(c.file || c.folder || '')}">${esc(c.file || c.folder || '—')}</span>
        </span>
        <span style="display:flex;flex-direction:column;align-items:flex-end">
          ${c.error ? '<span class="num red" style="font-size:30px">Sin leer</span>' : `<span class="num ${allOk ? 'cyan' : 'amber'}" style="font-size:40px">${k.ready} / ${k.total}</span><span class="eb ${allOk ? 'cyan' : 'amber'}">${allOk ? 'Todo listo' : `${k.total - k.ready} por revisar`}</span>`}
        </span>
      </div>
      ${c.error ? `<div class="in" style="padding:12px 14px;border-color:#5a2020;display:flex;flex-direction:column;gap:4px"><span class="red" style="font-size:16px">${esc(c.error)}</span><span class="soft" style="font-size:14px">${esc(BINDS_HELP[c.code] || '')}</span></div>` : ''}
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button type="button" class="plot-btn" style="width:auto;padding:0 18px" data-binds="import">Importar archivo .binds</button>
        ${c.source === 'file' ? '<button type="button" class="tab" data-binds="auto">Usar el esquema activo del juego</button>' : ''}
        <button type="button" class="tab" data-binds="reload">Volver a leer</button>
        <button type="button" class="tab" data-binds="folder">Abrir carpeta</button>
      </div>
      ${msg}`;
  const statusCard = `<section class="pn card"><span class="ti" style="font-size:16px">Tus controles</span>${status}</section>`;

  let list = '';
  if (k) {
    const items = k.items.slice().sort((a, b) => CTL_ORDER[a.status] - CTL_ORDER[b.status] || a.label.localeCompare(b.label));
    const pages = Math.max(1, Math.ceil(items.length / BINDS_PAGE));
    ui.bindsPage = Math.min(ui.bindsPage || 0, pages - 1);
    const rows = items.slice(ui.bindsPage * BINDS_PAGE, (ui.bindsPage + 1) * BINDS_PAGE).map((it) => {
      const [txt, cls] = CTL_STATUS[it.status] || [it.status, 'yellow'];
      return `<div class="in row" style="grid-template-columns:minmax(0,1fr) 170px 170px 160px;height:46px">
        <span style="display:flex;flex-direction:column;min-width:0;padding-left:12px"><span class="nowrap" style="font-size:16px">${esc(it.label)}</span>${it.status === 'shared' ? `<span class="eb dim nowrap" style="font-size:10px;letter-spacing:.06em">También: ${esc(it.with.join(', '))}</span>` : ''}</span>
        <span class="eb dim nowrap" style="font-size:11px">${esc(it.groups.join(' · '))}</span>
        <span class="num nowrap" style="font-size:15px">${it.key ? esc(it.key) : '<span class="dim">—</span>'}</span>
        <span class="eb ${cls}" style="text-align:right;padding-right:12px;font-size:11px">${txt}</span></div>`;
    }).join('');
    const pager = pages > 1 ? `<span style="display:flex;align-items:center;gap:8px"><button type="button" class="pg" data-pager="binds" data-d="-1" ${ui.bindsPage === 0 ? 'disabled' : ''}>‹</button><span class="num soft" style="font-size:13px">${ui.bindsPage + 1}/${pages}</span><button type="button" class="pg" data-pager="binds" data-d="1" ${ui.bindsPage >= pages - 1 ? 'disabled' : ''}>›</button></span>` : '';
    list = `<section class="pn card" style="min-height:0">
      <div style="display:flex;justify-content:space-between;align-items:center"><span class="ti" style="font-size:16px">Acciones que usa ED BUBBLE</span>${pager}</div>
      <div class="row" style="grid-template-columns:minmax(0,1fr) 170px 170px 160px;height:22px"><span class="eb" style="padding-left:12px;font-size:10px">Acción</span><span class="eb" style="font-size:10px">Se usa en</span><span class="eb" style="font-size:10px">Tecla</span><span class="eb" style="font-size:10px;text-align:right;padding-right:12px">Estado</span></div>
      <div style="display:flex;flex-direction:column;gap:4px">${rows}</div>
    </section>`;
  } else {
    list = `<section class="pn card"><span class="ti" style="font-size:16px">Acciones que usa ED BUBBLE</span><div class="empty">Aparecerán cuando la app lea tus controles.</div></section>`;
  }
  return `<div style="display:grid;grid-template-columns:640px minmax(0,1fr);gap:12px;min-height:0;height:100%">
    ${guide}
    <div style="display:grid;grid-template-rows:auto minmax(0,1fr);gap:12px;min-height:0">${statusCard}${list}</div>
  </div>`;
}

async function bindsAction(a) {
  const api = window.edbubble;
  ui.bindsMsg = null;
  if (a === 'import') {
    const r = await api.bindsImport();
    if (r && r.ok) ui.bindsMsg = { ok: true, text: 'Controles importados. La app usará este archivo y lo vigilará por si cambia.' };
    else if (r && r.error) ui.bindsMsg = { ok: false, text: r.error };
  } else if (a === 'auto') { await api.bindsAuto(); ui.bindsMsg = { ok: true, text: 'Vuelvo a usar el esquema activo del juego.' }; }
  else if (a === 'reload') { await api.bindsReload(); ui.bindsMsg = { ok: true, text: 'Controles leídos de nuevo.' }; }
  else if (a === 'folder') { const e = await api.bindsFolder(); if (e) ui.bindsMsg = { ok: false, text: 'La carpeta de controles no existe todavía: guarda tus controles en el juego una vez.' }; }
  render();
}

/* ---------- Ajustes ---------- */
function setRow(key, label, sub, on, disabled) {
  return `<button type="button" class="set-row${on ? ' on' : ''}" data-set="${key}"${disabled ? ' disabled' : ''}>
    <span style="display:flex;flex-direction:column;gap:2px;min-width:0;text-align:left"><span class="va nowrap" style="font-size:18px">${label}</span>${sub ? `<span class="soft nowrap" style="font-size:13px">${sub}</span>` : ''}</span>
    <span class="sw${on ? ' on' : ''}"></span></button>`;
}

function screenAjustes(s, v) {
  const p = { ...ui.prefs, autoJump: ui.autoJump }; const off = !p.autoJump;
  const jump = `
    <section class="pn card">
      <span class="ti" style="font-size:16px">Salto automático</span>
      <span class="soft" style="font-size:14px">La app cambia sola a la sección que corresponde a lo que haces en el juego. Si tocas otra sección, se queda ahí hasta el siguiente cambio.</span>
      ${setRow('autoJump', 'Salto automático', p.autoJump ? 'Activado' : 'Desactivado: la app solo cambia de sección cuando tú la eliges', p.autoJump)}
      <span class="eb" style="margin-top:4px">Saltar a la sección…</span>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">
      ${setRow('jump.vuelo', 'Vuelo', 'Vuelas, saltas o vas en supercrucero', p.jump.vuelo, off)}
      ${setRow('jump.orbita', 'Órbita planetaria', 'Te acercas a un planeta o aterrizas', p.jump.orbita, off)}
      ${setRow('jump.mineria', 'Minería', 'Minas con el Rhino o con la nave', p.jump.mineria, off)}
      ${setRow('jump.combate', 'Combate', 'Armamento desplegado, zona de combate o te atacan', p.jump.combate !== false, off)}
      ${setRow('jump.approach', 'Vuelo · plataformas', 'Te conceden el atraque', p.jump.approach, off)}
      ${setRow('jump.docked', 'Estación', 'Atracas en una estación', p.jump.docked, off)}
      ${setRow('jump.depot', 'Colonización', 'Atracas en una construcción', p.jump.depot, off)}
      </div>
    </section>`;

  const ds = ui.displays;
  const screens = `
    <section class="pn card">
      <span class="ti" style="font-size:16px">Pantalla</span>
      <span class="soft" style="font-size:14px">Pulsa una pantalla para llevar la ventana allí. La ventana nunca se pone por encima del juego.</span>
      <div style="display:grid;grid-template-columns:repeat(${Math.min(Math.max(ds ? ds.length : 1, 1), 3)},minmax(0,1fr));gap:10px">
        ${ds ? ds.slice(0, 3).map((d) => `<button type="button" class="disp${d.current ? ' on' : ''}" data-display="${d.id}">
          <span class="num" style="font-size:30px;color:${d.current ? 'var(--amber)' : 'var(--eb)'}">${d.n}</span>
          <span class="va" style="font-size:16px">${d.width} × ${d.height}</span>
          <span class="eb" style="font-size:11px">${d.current ? '<span class="amber">Aquí</span>' : 'Mover aquí'}${d.primary ? ' · principal' : ''}</span></button>`).join('') : '<span class="soft">Buscando pantallas…</span>'}
      </div>
      ${ds && ds.length > 3 ? `<span class="soft" style="font-size:13px">Hay ${ds.length} pantallas; se muestran las tres primeras.</span>` : ''}
      ${setRow('fullscreen', 'Pantalla completa', 'Sin bordes ni barra de título', p.fullscreen)}
    </section>`;

  const start = `
    <section class="pn card">
      <span class="ti" style="font-size:16px">Al abrir y avisos</span>
      <span class="eb">Al abrir la app, mostrar</span>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <button type="button" class="tab${p.startSection !== 'ultima' ? ' on' : ''}" data-set="startSection" data-val="puente">Puente de mando</button>
        <button type="button" class="tab${p.startSection === 'ultima' ? ' on' : ''}" data-set="startSection" data-val="ultima">Última sección</button>
      </div>
      <span class="eb" style="margin-top:6px">Avisos en la cabecera</span>
      ${setRow('alerts.dock', 'Atraque concedido', 'Número de plataforma, desde cualquier sección', p.alerts.dock)}
      ${setRow('alerts.fuelRoute', 'Combustible en ruta', 'Naves sin recolector: avisa antes de quedarte sin combustible', p.alerts.fuelRoute)}
      <span class="soft" style="font-size:13px">Los avisos de peligro (casco, calor, interdicción, ataque…) siempre se muestran.</span>
    </section>`;

  const i = ui.info || {}; const c = ui.controls || {};
  const about = `
    <section class="pn card">
      <span class="ti" style="font-size:16px">Idioma e información</span>
      <span class="eb">Idioma</span>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <button type="button" class="tab on">Español</button>
        <button type="button" class="tab" disabled title="Próximamente" style="opacity:.45;cursor:default">English · pronto</button>
      </div>
      <div class="kv" style="font-size:15px;margin-top:6px">
        <span class="eb" style="font-size:10px">Versión</span><span class="num">${esc(i.version || '—')}</span>
        <span class="eb" style="font-size:10px">Journal</span><span title="${esc(i.journalFolder || '')}">${esc(i.journalFolder || '—')}</span>
        <span class="eb" style="font-size:10px">Controles</span><span>${esc(c.preset || c.error || '—')}</span>
        <span class="eb" style="font-size:10px">Registro</span><span title="${esc(i.log || '')}">${esc(i.log || '—')}</span>
      </div>
      <button type="button" class="tab" data-opendata style="align-self:flex-start">Abrir carpeta de datos</button>
    </section>`;

  return `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:auto minmax(0,1fr);gap:12px;min-height:0;height:100%">${jump}${screens}${start}${about}</div>`;
}

function render() {
  try { renderNow(); } catch (e) {
    reportError(`render(${ui.section})`, e);
    const a = $('hdr-alerts');
    if (a) a.innerHTML = `<span class="eb">Alertas</span><span class="alert danger" title="${esc(String(e && e.message))}">Error al pintar ${esc(ui.section)} · ver ed-bubble.log</span>`;
  }
}

function renderNow() {
  const snap = ui.snap; if (!snap) return;
  const { state: s, view: v } = snap;
  const typing = document.activeElement && document.activeElement.tagName === 'INPUT' && !!document.activeElement.id;
  if (ui.autoJump && v.mode.key !== ui.lastModeKey && !typing) {
    if (ui.lastModeKey !== null && BUILT.has(v.mode.section) && v.mode.section !== ui.section && ui.section !== 'ajustes' && jumpAllowed(v.mode.key)) goSection(v.mode.section);
    ui.lastModeKey = v.mode.key;
  }
  // diagnóstico: qué veía la app al conceder un atraque
  if (s.docking.active && !ui.dockLogged) { ui.dockLogged = true; reportError('atraque', `plataforma ${s.docking.pad} · ${s.docking.stationType} · sección ${ui.section} · salto auto ${ui.autoJump ? 'sí' : 'no'} · modo ${v.mode.key}`); }
  if (!s.docking.active) ui.dockLogged = false;
  if (ui.finalDest && s.location.docked && s.location.station && siteName(s.location.station).toLowerCase() === siteName(ui.finalDest.station).toLowerCase()) ui.finalDest = null;
  renderHeader(s, v);
  renderRail(v);
  const typingId = typing ? document.activeElement.id : null;
  const sel = typing ? [document.activeElement.selectionStart, document.activeElement.selectionEnd] : null;
  $('screen').innerHTML = ui.section === 'vuelo' ? screenVuelo(s, v) : ui.section === 'orbita' ? screenOrbita(s, v) : ui.section === 'mineria' ? screenMineria(s, v) : ui.section === 'apie' ? screenApie(s, v) : ui.section === 'navegacion' ? screenNavegacion(s, v) : ui.section === 'colonizacion' ? screenColonizacion(s, v) : ui.section === 'estacion' ? screenEstacion(s, v) : ui.section === 'powerplay' ? screenPowerplay(s, v) : ui.section === 'ajustes' ? screenAjustes(s, v) : ui.section === 'controles' ? screenControles(s, v) : ui.section === 'equipo' ? screenEquipo(s, v) : ui.section === 'ingenieros' ? screenIngenieros(s, v) : ui.section === 'combate' ? screenCombate(s, v) : screenPuente(s, v);
  if (sel) { const el = $(typingId); if (el) { el.focus(); el.setSelectionRange(sel[0], sel[1]); } }
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
  if (b && !b.disabled) { goSection(b.dataset.sec); render(); }
});
document.addEventListener('click', (ev) => {
  if (ev.target.closest('#autojump')) setPref('autoJump', !ui.autoJump);
  if (ev.target.closest('#hdr-settings')) { goSection(ui.section === 'ajustes' ? (ui.prevSection || 'puente') : 'ajustes'); render(); }
});
// Buscador: sugerencias de Spansh mientras se escribe (con pausa de 300 ms)
let searchTimer = null;
document.addEventListener('input', (ev) => {
  if (ev.target.id === 'coord-input') { ui.coordText = ev.target.value; return; }
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
  if (ev.target.id === 'coord-input' && ev.key === 'Enter') { coordAction('set'); return; }
  if (ev.target.id === 'nav-search' && ev.key === 'Enter') {
    const q = ui.search.q.trim();
    const exact = ui.search.results.find((r) => r.name.toLowerCase() === q.toLowerCase());
    if (exact || ui.search.results[0]) selectSystem((exact || ui.search.results[0]).name);
    else if (q.length >= 3) selectSystem(q);
  }
});

async function selectSystem(name) {
  ui.sel = { name, loading: true };
  ui.navTab = 'system'; ui.sysTab = 'stations'; ui.sysPage = 0; ui.sysKinds = []; ui.sysLarge = false;
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
  const kf = ev.target.closest('button[data-kind]');
  if (kf) {
    ev.preventDefault();
    const k = kf.dataset.kind;
    const here = kf.dataset.kscope === 'here';
    const K = here ? 'hereKinds' : 'sysKinds'; const Lk = here ? 'hereLarge' : 'sysLarge';
    if (k === '') { ui[K] = []; ui[Lk] = false; } else if (k === 'L') ui[Lk] = !ui[Lk];
    else ui[K] = ui[K].includes(k) ? ui[K].filter((x) => x !== k) : [...ui[K], k];
    ui[here ? 'herePage' : 'sysPage'] = 0; render(); return;
  }
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
  const pt = ev.target.closest('button[data-pptrack]');
  if (pt) { ev.preventDefault(); window.edbubble.ppTrack(pt.dataset.pptrack || null); return; }
  const hp = ev.target.closest('button[data-pager="here"], button[data-pager="bio"]');
  if (hp && !hp.disabled) { ev.preventDefault(); const k = hp.dataset.pager === 'here' ? 'herePage' : 'bioPage'; ui[k] = Math.max(0, ui[k] + Number(hp.dataset.d)); render(); return; }
  const recBtn = ev.target.closest('[data-engrecipe], [data-engbp], [data-engexp]');
  if (recBtn) {
    ev.preventDefault(); const d = recBtn.dataset;
    if (d.engrecipe != null) { ui.engRecipe = d.engrecipe || null; ui.engBp = null; ui.engExp = false; }
    else if (d.engbp != null) { ui.engBp = d.engbp; ui.engExp = false; }
    else ui.engExp = true;
    render(); return;
  }
  const engBtn = ev.target.closest('[data-engkind], [data-engcat], [data-engmodule], [data-engopen]');
  if (engBtn) {
    ev.preventDefault(); const d = engBtn.dataset;
    if (d.engkind != null) { ui.engKind = d.engkind; ui.engPage = 0; ui.engOpen = null; ui.engModule = null; ui.engRecipe = null; }
    else if (d.engcat != null) { ui.engCat = d.engcat || null; ui.engModule = null; ui.engPage = 0; }
    else if (d.engmodule != null) { ui.engModule = ui.engModule === d.engmodule ? null : d.engmodule; ui.engPage = 0; ui.engOpen = null; ui.engRecipe = ui.engModule; ui.engBp = null; ui.engExp = false; }
    else { ui.engOpen = d.engopen; ui.engRecipe = ui.engModule || null; ui.engBp = null; ui.engExp = false; }
    render(); return;
  }
  const modOpenBtn = ev.target.closest('[data-modopen]');
  if (modOpenBtn) { ev.preventDefault(); ui.modOpen = modOpenBtn.dataset.modopen || null; render(); return; }
  const modTgt = ev.target.closest('[data-modtarget]');
  if (modTgt) { ev.preventDefault(); ui.modTarget = modTgt.dataset.modtarget; ui.lockSrc = 'mods'; ui.modPage = 0; ui.modOpen = null; render(); return; }
  const lockTabBtn = ev.target.closest('button[data-locktab], button[data-locksrc]');
  if (lockTabBtn) { ev.preventDefault(); if (lockTabBtn.dataset.locktab) ui.lockTab = lockTabBtn.dataset.locktab; else ui.lockSrc = lockTabBtn.dataset.locksrc; ui.lockPage = 0; render(); return; }
  const cbBtn = ev.target.closest('button[data-cbtab], button[data-cbpg]');
  if (cbBtn && !cbBtn.disabled) {
    ev.preventDefault();
    if (cbBtn.dataset.cbtab) ui.cbTab = cbBtn.dataset.cbtab;
    else { const k = `cb_${cbBtn.dataset.cbpg}`; ui[k] = Math.max(0, (ui[k] || 0) + Number(cbBtn.dataset.d)); }
    render(); return;
  }
  const minTabBtn = ev.target.closest('button[data-minetab]');
  if (minTabBtn) { ev.preventDefault(); ui.mineTab = minTabBtn.dataset.minetab; render(); return; }
  const minPgBtn = ev.target.closest('button[data-mpager]');
  if (minPgBtn && !minPgBtn.disabled) { ev.preventDefault(); const k = { sites: 'sitesPage', prosp: 'prospPage', lock: 'lockPage', mod: 'modPage', eng: 'engPage', plan: 'planPage', eqship: 'eqShipPage', eqgrp: 'eqGrpPage' }[minPgBtn.dataset.mpager];
    if (!k && /^eq(core|hard|opt)$/.test(minPgBtn.dataset.mpager)) { const kk = minPgBtn.dataset.mpager.slice(2); ui.eqPages[kk] = Math.max(0, (ui.eqPages[kk] || 0) + Number(minPgBtn.dataset.d)); render(); return; } ui[k] = Math.max(0, ui[k] + Number(minPgBtn.dataset.d)); render(); return; }
  const rigBtn = ev.target.closest('button[data-rig]');
  if (rigBtn && !rigBtn.disabled) {
    ev.preventDefault();
    window.edbubble.rig(rigBtn.dataset.rig); return;
  }
  const rigMinBtn = ev.target.closest('button[data-rigmin]');
  if (rigMinBtn) { ev.preventDefault(); setPref('rigMin', Math.max(30, Math.min(200, (ui.prefs.rigMin || 75) + Number(rigMinBtn.dataset.rigmin)))); return; }
  const skullBtn = ev.target.closest('button[data-skull]');
  if (skullBtn) { ev.preventDefault(); skullAction(skullBtn.dataset.skull); return; }
  const spot = ev.target.closest('button[data-spot]');
  if (spot) { ev.preventDefault(); ui.coordText = spot.dataset.spot.replace(',', ', '); coordAction('set'); return; }
  const co = ev.target.closest('button[data-coord]');
  if (co) { ev.preventDefault(); coordAction(co.dataset.coord); return; }
  const go = ev.target.closest('[data-goto]');
  if (go) { ev.preventDefault(); goSection(go.dataset.goto); render(); return; }
  const mt = ev.target.closest('[data-mat]');
  if (mt) { ev.preventDefault(); ui.colSel = mt.dataset.mat; ui.colAside = 'buy'; ui.mk.page = 0; ui.mk.pick = null; render(); return; }
  const bdB = ev.target.closest('button[data-bdpg], button[data-buildsel], button[data-buildstep], button[data-wishsel], button[data-bdelask], button[data-bdelno], button[data-bdel], button[data-buydist], button[data-buysort], button[data-buylarge], button[data-bimport], button[data-shipexp]');
  if (bdB && !bdB.disabled) {
    ev.preventDefault(); const d = bdB.dataset;
    if (d.bdpg) { const k = `bd_${d.bdpg}`; ui[k] = Math.max(0, (ui[k] || 0) + Number(d.d)); }
    else if (d.buildsel) { ui.buildSel = d.buildsel; ui.buildDel = null; ui.wishSel = null; ui.bd_bmods = 0; ui.bd_wish = 0; }
    else if (d.buildstep) { const L = ui.builds || []; const i = Math.max(0, Math.min(L.length - 1, L.indexOf(buildSel()) + Number(d.buildstep))); ui.buildSel = L[i] ? L[i].id : null; ui.wishSel = null; ui.bd_wish = 0; }
    else if (d.wishsel) { ui.wishSel = Number(d.wishsel); ui.bd_buy = 0; }
    else if (d.bdelask) ui.buildDel = d.bdelask;
    else if (d.bdelno) ui.buildDel = null;
    else if (d.bdel) { const id = d.bdel; ui.builds = (ui.builds || []).filter((b) => b.id !== id); ui.buildDel = null; ui.buildSel = null; if (window.edbubble.buildDelete) window.edbubble.buildDelete(id); }
    else if (d.buydist) { ui.buyDist = Number(d.buydist); ui.bd_buy = 0; }
    else if (d.buysort) { ui.buySort = d.buysort; ui.bd_buy = 0; }
    else if (d.buylarge) { ui.buyLarge = !ui.buyLarge; ui.bd_buy = 0; }
    else if (d.bimport) {
      ui.eqMsg = { ok: true, text: 'Leyendo el portapapeles…' };
      window.edbubble.buildImport().then((r) => {
        if (r && r.ok) { ui.builds = [r.build, ...(ui.builds || [])]; ui.buildSel = r.build.id; ui.wishSel = null; ui.bd_builds = 0; ui.eqTab = 'wish'; ui.eqMsg = { ok: true, text: `Build importada: ${r.build.shipName}${r.build.name ? ` «${r.build.name}»` : ''} · ${(r.build.wish || []).length} cambios respecto a tu nave` }; }
        else ui.eqMsg = { ok: false, text: (r && r.error) || 'No se pudo importar.' };
        render();
      });
    } else if (d.shipexp) {
      window.edbubble.shipExport(d.shipexp).then((r) => { ui.eqMsg = r && r.ok ? { ok: true, text: r.copied ? 'SLEF copiado: pégalo en Inara, EDSY o Coriolis.' : `Abierto en ${d.shipexp === 'edsy' ? 'EDSY' : 'Coriolis'}, en tu navegador.` } : { ok: false, text: (r && r.error) || 'No se pudo exportar.' }; render(); });
    }
    render(); return;
  }
  const eqBtn = ev.target.closest('[data-eqtab], [data-eqship], [data-eqcat], [data-eqgrp]');
  if (eqBtn) {
    ev.preventDefault(); const d = eqBtn.dataset;
    if (d.eqtab) { ui.eqTab = d.eqtab; ui.eqMsg = null; }
    else if (d.eqship) ui.eqShip = d.eqship;
    else if (d.eqcat) { ui.eqCat = d.eqcat; ui.eqGrpPage = 0; ui.eqGrp = null; }
    else ui.eqGrp = d.eqgrp;
    render(); return;
  }
  const planBtn = ev.target.closest('[data-colmode], [data-planloc], [data-plansel]');
  if (planBtn) {
    ev.preventDefault(); const d = planBtn.dataset;
    if (d.colmode) ui.colMode = d.colmode;
    else if (d.planloc) { ui.planLoc = d.planloc; ui.planPage = 0; }
    else ui.planSel = d.plansel;
    render(); return;
  }
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
    if (pick) {
      const res = ui.snap.view.col.depots.flatMap((d) => d.resources).find((r) => r.key === ui.colSel);
      ui.finalDest = { station: pick.station, system: pick.system, ls: pick.ls, pad: pick.pad, icon: pick.icon, label: pick.label, commodity: res ? res.name : null, supply: pick.supply, price: pick.price };
      window.edbubble.plot(pick.system, pick.distance || 0);
    }
    return;
  }
  const fc = ev.target.closest('button[data-finalclear]');
  if (fc) { ev.preventDefault(); ui.finalDest = null; render(); return; }
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
  const bd = ev.target.closest('button[data-binds]');
  if (bd) { ev.preventDefault(); bindsAction(bd.dataset.binds); return; }
  const bp = ev.target.closest('button[data-pager="binds"]');
  if (bp && !bp.disabled) { ev.preventDefault(); ui.bindsPage = Math.max(0, (ui.bindsPage || 0) + Number(bp.dataset.d)); render(); return; }
  const sw = ev.target.closest('button[data-set]');
  if (sw && !sw.disabled) {
    ev.preventDefault();
    const key = sw.dataset.set;
    if (sw.dataset.val !== undefined) setPref(key, sw.dataset.val);
    else { const [g, k] = key.split('.'); setPref(key, !(k ? ui.prefs[g][k] : ui.prefs[key])); }
    return;
  }
  const dm = ev.target.closest('button[data-display]');
  if (dm && !dm.disabled) { ev.preventDefault(); window.edbubble.moveToDisplay(Number(dm.dataset.display)).then((d) => { ui.displays = d; render(); }); return; }
  if (ev.target.closest('button[data-opendata]')) { ev.preventDefault(); window.edbubble.openData(); return; }
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
  window.edbubble.onFuelStops((x) => { ui.fuelStops = x || {}; render(); });
  if (window.edbubble.bodies) window.edbubble.bodies().then((b) => { ui.bodyInfo = { ...(b || {}), ...ui.bodyInfo }; render(); });
  if (window.edbubble.skull) window.edbubble.skull().then((k) => { ui.skull = k; render(); });
  if (window.edbubble.onSkull) window.edbubble.onSkull((k) => { ui.skull = k; render(); });
  if (window.edbubble.here) window.edbubble.here().then((h) => { if (h) { ui.here = h; render(); } });
  if (window.edbubble.onHere) window.edbubble.onHere((h) => { ui.here = h; ui.herePage = 0; ui.hereKinds = []; ui.hereLarge = false; render(); });
  if (window.edbubble.onBody) window.edbubble.onBody((b) => { if (b && b.body) { ui.bodyInfo[b.body] = b; render(); } });
  window.edbubble.onPlotStatus((p) => {
    ui.plot = { ...p, at: Date.now() };
    if (!p.running && p.ok) ui.navTab = 'route'; // ver la ruta recién trazada
    render();
    if (!p.running) setTimeout(render, 8100);
  });
  window.edbubble.controls().then((c) => { ui.controls = c; render(); });
  if (window.edbubble.settings) window.edbubble.settings().then((p) => {
    if (!p) return;
    ui.prefs = p; ui.autoJump = p.autoJump;
    if (p.startSection === 'ultima' && BUILT.has(p.lastSection)) { ui.section = p.lastSection; if (p.lastSection === 'ajustes') loadSettingsInfo(); }
    render();
  });
  window.edbubble.snapshot().then((snap) => { if (snap && !ui.snap) { ui.snap = snap; render(); } });
}

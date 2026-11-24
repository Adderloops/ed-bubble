# ED BUBBLE · app de Windows

Ventana para la segunda pantalla con datos en vivo de Elite Dangerous.

**Entrega 1:** Puente de mando y Vuelo con datos del Journal, `Status.json`, `Cargo.json` y `NavRoute.json`.

**Entrega 2:** los interruptores y acciones de Vuelo se pulsan con el ratón. ED BUBBLE lee tu preset de controles activo (`%LOCALAPPDATA%\Frontier Developments\Elite Dangerous\Options\Bindings`), trae el juego al frente y pulsa la tecla de teclado que tengas asignada. Las acciones sin tecla de teclado (solo HOTAS) salen desactivadas. Si cambias los controles en el juego, la app los recarga sola. "Expulsar carga" pide una segunda pulsación en 3 segundos.

El panel **Controles** del Puente de mando revisa las teclas que usa ED BUBBLE (Vuelo y, para la entrega 3, Trazar ruta) y señala las que faltan, las que solo están en el mando y las que comparten tecla.

**Estación:** la estación en la que estás atracado (o la última): tipo, sistema, distancia a la estrella, facción y estado, gobierno, plataformas S/M/L y economías; servicios disponibles; y, si has abierto su mercado en el juego (Market.json), lo que le falta a tu construcción y se vende aquí, lo que pagan por tu carga y lo que más paga la estación. También el objetivo comunitario activo y el resumen de ingenieros.

**Coordenadas en planeta (Vuelo):** en Aproximación a planeta se escriben o pegan unas coordenadas (Pegar lee el portapapeles; acepta "12.345, -67.89", coma decimal o "Lat … Lon …") y se fijan. Una brújula gira con tu rumbo, marca el objetivo y dice cuánto girar, con la distancia sobre la superficie. El destino se guarda entre sesiones; Quitar lo borra.

**Powerplay:** piloto (potencia, rango, méritos para subir, méritos de la sesión) y control del sistema seguido: estado, progreso con barra de 12 segmentos (antes del ciclo, ganado, perdido), puntos de control, refuerzo, undermining y neto, comparación con el ciclo anterior, cuenta atrás al corte del jueves 07:00 UTC e historial de visitas. El sistema seguido se elige en la lista de sistemas con datos o con "Seguir …" y se guarda en `settings.json`.

**Combustible en ruta (naves sin recolector):** el consumo de cada salto se ajusta con tus saltos reales (fuel = k · distancia^p, con p según el tamaño del FSD y un 8 % de margen). Si con el combustible del tanque no llegas al destino, la cabecera avisa ("Combustible: solo N saltos · reposta antes"); Vuelo y Navegación dicen hasta qué sistema llegas, cuánto pide la ruta y la estación con repostaje más lejana a la que llegas (Spansh); la ruta muestra el combustible con el que llegas a cada sistema. "Saltos a alcance máx." en Combustible usa el mismo modelo.

**Historial:** al arrancar, el motor repasa los Journals de las últimas semanas (máx. 25 archivos) para recuperar las construcciones de colonización, la última estación, los ingenieros y el control de Powerplay de los sistemas visitados, aunque hoy no hayas pasado por ellos.

Registro de incidencias: `%APPDATA%\ed-bubble-app\ed-bubble.log` (errores al pintar, fallos de teclas o de Trazar ruta y cada atraque concedido con la sección en la que estaba la app). Si algo falla al pintar, la cabecera lo avisa en rojo.

Variables para desarrollo: `ED_BUBBLE_SIMULATE=1` (no envía teclas), `ED_BINDINGS_FOLDER` (otra carpeta de controles).

**Vuelo y Navegación:** Vuelo es pilotar (estado, interruptores, acciones, combustible, próximo salto, atraque o aproximación a planeta). Navegación es planificar (ficha del sistema actual con Copiar / Inara / Spansh / EDSM, objetivo de salto y ruta completa).

**Entrega 3 (Navegación):** buscador de sistemas con Spansh (sugerencias al escribir, con la distancia desde donde estás) y ficha del sistema: estrella y combustible, población, seguridad, gobierno, economía, Powerplay, y pestañas de estaciones (icono, plataforma L/M/S, distancia y servicios), facciones (influencia y estado) y cuerpos.

**Trazar ruta:** abre el mapa galáctico, pega el nombre (Ctrl+V), selecciona el resultado, mantiene Seleccionar para trazar y comprueba en `NavRoute.json` que la ruta va a ese sistema; después cierra el mapa. Se detiene si el juego pierde el foco y se puede cancelar. Necesita teclas de teclado para: Mapa galáctico, Cámara: acercar, Cámara: alejar, Interfaz: arriba / derecha / seleccionar (el panel Controles del Puente lo comprueba). Los tiempos de espera están en `core/plot.js` (`T`) por si hay que ajustarlos.

**Colonización:** todas las construcciones en las que has atracado (pestañas), con progreso, toneladas que faltan, materiales completos y viajes con la bodega de tu nave; tabla de materiales ordenada por lo que más falta (pedido, entregado, faltan, progreso, a bordo, viajes); lo que llevas a bordo y si la construcción lo necesita; y las entregas de la sesión. Al atracar en una construcción, el salto automático lleva aquí.

**Dónde comprar (Colonización):** al pulsar un material, la pestaña "Dónde comprar" lista las estaciones más cercanas que lo venden según Spansh (datos de mercado de EDDN), con stock (cian si llena tu bodega), precio y antigüedad de los datos (amarillo si tienen más de un mes). Filtros: plataforma L (activado si tu nave la necesita), superficie y carriers. Al elegir una estación, "Trazar ruta" lleva hasta su sistema y la guarda como **destino final**: en Vuelo aparece bajo el Próximo salto y, al llegar al sistema, una tarjeta "Has llegado · ve a la estación" con distancia en ls, plataforma y qué comprar. Se borra al atracar en ella o con la ✕.

Iconos de estación (`renderer/icons/`): dibujados por el autor (Adder); el puesto planetario está redibujado a partir de su boceto.

Desarrollo: `ED_BUBBLE_SPANSH_FIXTURE=carpeta` sirve `search.json` y `suggest.json` en lugar de consultar Spansh; `ED_BUBBLE_SHOT_SYSTEM=nombre` captura el buscador y la ficha.

## Arrancar

Requisito: Node.js (ya instalado si usas el plugin de Touch Portal).

```powershell
cd "D:\Proyectos ELITE\ED BUBBLE\ed-bubble\app"
npm install      # solo la primera vez (descarga Electron, unos 100 MB)
npm start
```

La primera vez se abre en la segunda pantalla si la hay; después recuerda posición y tamaño. Es una ventana normal (no siempre encima) y se abre sin quitar el foco al juego. La pantalla se escala al tamaño de la ventana: nunca hay scroll.

## Cómo funciona

- `../core/engine.js` sigue el Journal más reciente (lo relee entero al arrancar para reconstruir la sesión) y los JSON del juego, y mantiene un único estado (`../core/model.js`). Las alertas, el modo de vuelo y los datos calculados están en `../core/derive.js`.
- `main.js` (Electron) arranca el motor y envía cada actualización a la ventana; `renderer/` dibuja las pantallas.
- Salto automático a la sección: al cambiar el estado del juego (por ejemplo, de atracado a supercrucero) la ventana va sola a la sección que corresponde, si ya está construida. Se activa o desactiva pulsando el texto del pie del menú.

## Pruebas

```powershell
npm test
```

Para desarrollo: `ED_JOURNAL_FOLDER` apunta el motor a otra carpeta de Journals, y `ED_BUBBLE_SHOT=<carpeta>` guarda capturas de las pantallas y cierra la app.

**Filtro de estaciones** (ficha de un sistema en Navegación): un botón con el icono y el número de cada tipo de estación (las construcciones llevan la etiqueta «Construcción»). Se pueden marcar varios a la vez; «Solo L» deja las que tienen plataforma grande y «Todas» quita el filtro.

## A pie

Sección del grupo Viaje (Odyssey):

- Estado: oxígeno, salud, temperatura y gravedad cuando vas a pie (`Status.json`), y la brújula al destino fijado en Órbita planetaria.
- Equipo actual: traje y armas con su grado (G1 a G5) y sus mejoras en español. Se toma de `SuitLoadout` y se actualiza con los cambios de equipo, compras y mejoras (también del historial de los últimos 45 días). Debajo, los otros equipos conocidos.
- Taquilla de la nave (`ShipLocker.json`) y mochila (`Backpack.json`, si llevas algo): bienes, componentes, datos y consumibles, con los objetos de misión marcados.

- Subir de grado: bajo cada traje y arma, los materiales del siguiente grado con lo que tienes en la taquilla (sin contar los de misión) y los créditos. Tabla en `core/odyssey.js`; materiales y cantidades de los 3 trajes y las 11 armas comprobados en Odyssey Materials Helper. Los créditos vienen de la wiki (los de G5 de armas no se conocen).
- Ranuras: cada traje y arma muestra cuántas ranuras de mejora ocupa de las que da su grado (una por grado a partir de G2).
- Mejoras de ingeniero: pestaña «Mejoras» junto a Taquilla y Mochila (o tocando el traje o un arma del equipo). Lista las mejoras que aún no lleva esa pieza, con lo que te falta, y al tocar una muestra sus materiales y los ingenieros que la montan. Las mejoras de arma por tipo (alcance, daño en la cabeza, precisión sin apuntar) usan la variante del arma: cinética (Kinematic), láser (Takada) o plasma (Manticore). El acceso a cada ingeniero sale del evento `EngineerProgress` del diario: en Odyssey «Invited» ya da acceso. Si no tienes acceso, dice qué pide para desbloquearlo. Datos en `core/odymods.js`.

## Combate

Sección del grupo Nave, con tres columnas (datos de `core/combat.js`):

- **Objetivo**: la nave fijada (`ShipTargeted`) con piloto, rango de combate, facción, estado legal (en cian si puedes atacarla sin delito, en ámbar si está limpia), recompensa, escudo, casco y el subsistema apuntado. **Tu nave**: escudos, casco, tu estado legal y si tu caza está fuera.
- **Zona**: al caer en una zona de conflicto (con su intensidad), de extracción o en una baliza, cuenta las bajas y los créditos de esa zona y, con el primer bono, por quién luchas y contra quién. Debajo, los totales de la sesión de juego y las últimas bajas (la nave de un bono sale del último objetivo de esa facción).
- **Por cobrar**: bonos de combate y recompensas pendientes por facción. Se descuentan al cobrar (`RedeemVoucher`; en un Interstellar Factors se cobra todo) y se pierden al morir. Se reconstruyen desde los diarios recientes, así que incluyen lo que hiciste antes de abrir la app.
- **Masacres**: progreso de cada misión de masacre. Cada baja cuenta para la primera misión sin terminar de cada facción emisora, como en el juego, y se marca «entrégala» al completarse. Arriba, las bajas que faltan para la pila más larga.
- **Conflictos**: guerras, guerras civiles y elecciones del sistema, con lo que está en juego y los días ganados de cada bando.

No muestra pips, grupo de fuego ni arma seleccionada. Salto automático a Combate al entrar en una zona de combate o si te atacan, interdictan o derribas a alguien (90 s), salvo en supercrucero, atracado o aterrizado; se desactiva en Ajustes.

## Equipo

Sección del grupo Nave, con tres pestañas:

- Tu nave: la nave actual (del evento `Loadout`) con salto máximo, carga, casco, reembolso y cuántos módulos llevan ingeniería, y sus módulos por grupo (núcleo, armas y utilidades, internos opcionales) con clase, nombre y la receta de ingeniería con grado y experimental.
- Naves: las naves del juego con fabricante, plataforma, precio, velocidad, escudo y blindaje base, masa, masslock y su reparto de ranuras.
- Módulos: por categoría (núcleo, opcionales, armas, utilidades), cada módulo con sus variantes por clase y grado: masa, energía, precio y sus valores clave (masa óptima, combustible por salto, generación, carga, daño, alcance…).

Datos en `core/data/shipdata.json`: lista de naves y módulos de EDCD FDevIDs (shipyard.csv, outfitting.csv) con las características de coriolis-data. Las fichas de la Lynx Highliner y la Anaconda Mk II salen de Inara (el masslock de la Anaconda Mk II no está; Inara da 0) Inara no publica la masa ni la energía de los módulos: de los Mk II recientes (cabinas, hangares, bodega 6D) solo está su precio, sacado de su lista de equipamiento; el resto sale con «—». Ocultos por no estar disponibles en el juego: FSD normal de clase 8 (precio 0 en Inara), escáneres de descubrimiento antiguos y el controlador 1I.

## Colonización · planificar

Botón «Planificar» en Colonización (y pantalla por defecto si aún no tienes construcciones): los 55 tipos de construcción (orbitales y de superficie) con su nivel, el total de toneladas y los viajes con tu bodega, y al elegir uno, la lista de mercancías con sus toneladas. Son cantidades de referencia: el juego puede pedir algo más o algo menos, y el puerto primario cuesta más; en cuanto la construcción existe, la app usa lo que dice el juego. Datos: `core/data/colonization-costs.json`, de SrvSurvey (autor de Raven Colonial), GPLv3.

## Ingenieros

Sección del grupo Comandante, con dos pestañas:

- Naves (25 ingenieros): filtra por categoría (armas, utilidades, núcleo, opcionales) y por módulo para ver quién lo mejora y hasta qué grado, ordenados por grado y por acceso. La ficha de cada uno muestra su retrato, sitio y sistema (con botón para copiarlo), si pide permiso o está en Colonia, tu grado con él y qué le falta para desbloquearlo. El estado sale de `EngineerProgress` (en naves, «Invited» aún pide el contrato inicial).
- A pie (13 ingenieros): lo mismo con las mejoras de traje y arma que montan.

- Recetas de nave: en la ficha de un ingeniero de naves, toca un módulo para ver sus recetas (por ejemplo, FSD «Increased range») con los materiales de cada grado hasta el tope de ese ingeniero, y sus efectos experimentales. Cada material muestra lo que tienes y lo que pide; los grados que aún no puedes pedirle (por tu grado con él) salen atenuados. Tus materiales salen del diario (`Materials` al empezar la partida, y luego recogidas, descartes, intercambios, síntesis, trabajos de ingeniero y recompensas de misión). Recetas en `core/shipblueprints.js`: las de coriolis-data y, para lo que no trae (módulos guardianes, refuerzo de módulos, láser de minería, lanzamisiles de enzimas, desintegrador abrasivo y las recetas nuevas, muchas solo para módulos «Merc»), las de Inara. «Merc Coin» y los materiales thargoid no salen en el diario: se muestran con su cantidad pero sin la tuya.

Datos en `core/shipengineers.js`, `core/odymods.js` y `core/shipblueprints.js`; retratos en `app/renderer/engineers/` (los que faltan salen con iniciales).

## Minería

Sección del grupo Actividades, con dos pestañas. La app salta sola a ella en el Rhino o al minar con la nave (se desactiva en Ajustes).

**Superficie · Rhino** (con el plugin Skull Mining de EDMC):

- Sesión con el Rhino: ED BUBBLE lee `live_session.json` y `zone_state.json` de la carpeta del plugin (la que tenga `skull_tracker.py` en `%LOCALAPPDATA%\EDMarketConnector\plugins`). Muestra cuerpo, zona, terreno, taladros, recogidas, toneladas por mineral y t/hora. El plugin guarda la sesión cada 20 s y sigue siendo quien envía los datos a la web.
- Guía de taladros: «Taladro aquí» marca tu posición; la app dice a qué distancia estás del taladro más cercano (marcados o ya recogidos en la sesión) y si ya puedes colocar el siguiente. Distancia mínima ajustable (75 m por defecto).
- Sitios de la flota: los del cuerpo en la web Skullmining, con distancia y dirección; «Fijar» los pone como destino de la brújula de Órbita planetaria. Para conectarse usa la URL y la clave de Skull Mining, que copia de los ajustes de EDMC al pulsar el botón (se guardan en `settings.json`).

**Nave · asteroides** (desde el Journal, desde el último despegue): última prospección (contenido, lo que queda, núcleo y porcentajes), toneladas refinadas por mineral, t/hora, bodega, drones lanzados, núcleos abiertos e historial de prospecciones.

## Órbita planetaria

Sección del grupo Nave para cuando estás cerca de un planeta (la app salta sola a ella; se desactiva en Ajustes):

- Destino en superficie con brújula (pegar, escribir o fijar desde una especie conocida).
- Cuerpo: tipo, atmósfera, gravedad, temperatura, radio y si se puede aterrizar (Journal o Spansh).
- Exobiología: señales, géneros del DSS, progreso de las muestras y especies conocidas en Spansh.
- Minería: señales geológicas, zonas de minería y puntos calientes de los anillos.

En **Vuelo**, la tarjeta «En este sistema» muestra las estaciones y los portanaves del sistema actual, con el mismo filtro por iconos que Navegación (los bastión de Powerplay tienen su propio botón).

## Controles

Sección **Controles** (menú, grupo Comandante; también el botón «Guía» de la tarjeta de controles de Puente). Pensada para quien instala la app por primera vez:

- Guía en cuatro pasos: guardar el esquema en el juego (los esquemas que trae el juego no tienen archivo propio), asignar teclas de teclado (la app no puede pulsar botones de HOTAS o mando), guardar y jugar con Elite en primer plano.
- Estado: esquema que se usa, archivo y cuántas acciones están listas, con el motivo si no se puede leer.
- **Importar archivo .binds**: elige cualquier archivo de controles; la app lo usa y lo vigila. «Usar el esquema activo del juego» vuelve a la detección automática (StartPreset.4.start).
- Lista de las acciones que usa ED BUBBLE con su tecla y estado (lista, sin asignar, solo en mando, tecla compartida o no enviable).

## Ajustes

Botón **Ajustes** de la cabecera (vuelve a pulsarlo para regresar a la sección anterior). Se guardan en `settings.json`, en la carpeta de datos de la app.

- **Salto automático**: activarlo o no, y a qué secciones salta (vuelo, órbita, minería, combate, atraque concedido, estación, construcción de colonización).
- **Pantalla**: llevar la ventana a otra pantalla y pantalla completa. La ventana nunca se pone por encima del juego.
- **Al abrir**: empezar en Puente de mando o en la última sección vista.
- **Avisos opcionales** en la cabecera: atraque concedido y combustible en ruta. Los de peligro se muestran siempre.
- **Idioma**: de momento solo español.
- **Información**: versión, carpeta del Journal, preset de controles, registro y botón para abrir la carpeta de datos.

## Instalador (beta)

```
cd app
npm install
npm run dist
```

Crea `app/dist/release/ED-BUBBLE-Setup-<versión>.exe`:

1. `scripts/stage.js` copia en `dist/stage` lo que necesita la app (app/, core/, los servicios de src/, definitions/flags.js y las fuentes).
2. `electron-builder --dir` empaqueta la app (`win-unpacked`), con `keysender.ps1` fuera del .asar para que PowerShell lo pueda leer.
3. `scripts/after-pack.js` pone el icono (`build/icon.ico`) y la versión en `ED BUBBLE.exe`.
4. `scripts/make-installer.js` compila `build/installer.nsi` con NSIS. Funciona en Windows y en Linux sin Wine.

El instalador no pide permisos de administrador: instala en `%LOCALAPPDATA%\Programs\ED BUBBLE`, crea accesos directos en el escritorio y el menú Inicio, y aparece en Aplicaciones instaladas para desinstalar. Al actualizar, cierra la app si está abierta. Los ajustes y el registro (`%APPDATA%\ed-bubble-app`) se conservan.

No está firmado: la primera vez Windows SmartScreen avisa («Windows protegió su PC» › Más información › Ejecutar de todas formas).

## Pendiente

- Masa, energía y demás datos de los módulos Mk II recientes (cabinas de pasajeros MkII, Mk II Vessel Hangar, Large Planetary Vehicle Hangar y su Mk II, Mk II Cargo Rack 6D): Inara solo da el precio. Fuentes posibles: la pantalla de Equipamiento del juego o EDSY. Añadirlos a `core/data/shipdata.json`.

- Traducción de la interfaz a inglés, francés, italiano y alemán (ahora solo español; en Ajustes › Idioma sale «English · pronto»).

- Brújula de coordenadas (y quizá el esquema de atraque) en **overlay** sobre la pantalla del juego: ventana transparente, siempre encima y que no capture el ratón, con el juego en ventana sin bordes.

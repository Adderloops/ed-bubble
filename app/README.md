# ED BUBBLE · app de Windows

Ventana para la segunda pantalla con datos en vivo de Elite Dangerous.

**Entrega 1:** Puente de mando y Vuelo con datos del Journal, `Status.json`, `Cargo.json` y `NavRoute.json`.

**Entrega 2:** los interruptores y acciones de Vuelo se pulsan con el ratón. ED BUBBLE lee tu preset de controles activo (`%LOCALAPPDATA%\Frontier Developments\Elite Dangerous\Options\Bindings`), trae el juego al frente y pulsa la tecla de teclado que tengas asignada. Las acciones sin tecla de teclado (solo HOTAS) salen desactivadas. Si cambias los controles en el juego, la app los recarga sola. "Expulsar carga" pide una segunda pulsación en 3 segundos.

El panel **Controles** del Puente de mando revisa las teclas que usa ED BUBBLE (Vuelo y, para la entrega 3, Trazar ruta) y señala las que faltan, las que solo están en el mando y las que comparten tecla.

**Estación:** la estación en la que estás atracado (o la última): tipo, sistema, distancia a la estrella, facción y estado, gobierno, plataformas S/M/L y economías; servicios disponibles; y, si has abierto su mercado en el juego (Market.json), lo que le falta a tu construcción y se vende aquí, lo que pagan por tu carga y lo que más paga la estación. También el objetivo comunitario activo y el resumen de ingenieros.

**Coordenadas en planeta (Vuelo):** en Aproximación a planeta se escriben o pegan unas coordenadas (Pegar lee el portapapeles; acepta "12.345, -67.89", coma decimal o "Lat … Lon …") y se fijan. Una brújula gira con tu rumbo, marca el objetivo y dice cuánto girar, con la distancia sobre la superficie. El destino se guarda entre sesiones; Quitar lo borra.

**Powerplay:** piloto (potencia, rango, méritos para subir, méritos de la sesión) y control del sistema seguido: estado, progreso con barra de 12 segmentos (antes del ciclo, ganado, perdido), puntos de control, refuerzo, undermining y neto, comparación con el ciclo anterior, cuenta atrás al corte del jueves 07:00 UTC e historial de visitas. Emblema y retrato de cada potencia (`app/renderer/powers/`, con su color del mapa): el de la tuya en la tarjeta Piloto y en la cabecera del Puente y de CMDR, y el emblema de la potencia que controla el sistema y de cada potencia en adquisición. El sistema seguido se elige en la lista de sistemas con datos o con "Seguir …" y se guarda en `settings.json`.

En la parte de abajo, pestañas: **Historial** (lo anterior), **Qué da méritos** (actividades que dan méritos en sistemas de refuerzo, socavar y adquisición, con la ética de cada una y el +50 % estimado si es la de tu potencia; por defecto, el tipo del sistema que estás viendo) y **Tus méritos** (méritos ganados en cada sistema desde el corte del jueves, de `PowerplayMerits` de los diarios, con su equivalencia en puntos de control: méritos ÷ 4, o ÷ 6 si vienen de vender datos de exploración). En el Piloto, los puntos de control de la sesión y del ciclo. **Adquisición:** en un sistema sin potencia (o seguido desde la lista), cada potencia con su progreso (`PowerplayConflictProgress`, 1,0 = 120.000 PC para reclamarlo), la marca de 35.000 PC (disputado si dos la pasan), lo que le falta a la tuya y el valor del ciclo anterior. Reglas de la guía de Powerplay 2.0 de Inara (logbook 84502), orientativas. Los topes de control (350.000 · 650.000 · 1.000.000) se mantienen: salen de ajustar datos reales de los diarios y un cambio Fortificado → Stronghold; la guía da cifras aproximadas (~333.333 por tramo).

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
- Fijar una página: mantén pulsado su botón del menú 2 s (una barra cian se llena mientras tanto). La página queda fijada (botón cian con chincheta) y el salto automático espera hasta que pinchas en otra página, vuelves a mantenerla pulsada 2 s o pulsas el texto del pie («Página fijada»). No se guarda al cerrar la app.

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

## Órbita planetaria · Exobiología: posibles especies

Al acercarte a un planeta, la tarjeta Exobiología predice qué especies puede haber (`core/biopredict.js`), con las reglas de SrvSurvey (`core/data/bio-criteria`). Usa los datos del cuerpo de tu diario (escaneo FSS o sondas) y, si no lo has escaneado, los del volcado de Spansh del sistema (`/api/dump`), la estrella que más lo ilumina, la región de la galaxia, la distancia a la nebulosa más cercana y si estás en una burbuja guardiana. Si ya se conocen los géneros (tu DSS o los que otros subieron a Spansh), solo predice especies de esos géneros, y debajo de cada género sin muestras pone la especie posible. «Posible ?» (ámbar) indica que faltó algún dato del cuerpo para comprobar todas las reglas. Comprobado con 63 cuerpos con vida de los diarios de Adder: acierta el 95 % de los géneros que hay de verdad. Si Spansh no tenía la ficha del cuerpo, la gravedad, la temperatura y el radio salen también del volcado.

## SRV

Grupo Nave. La app salta aquí al desplegar un SRV que no es el Rhino (Minería) ni la Nomad o un SRV sobre un cuerpo con señales biológicas (Exobiología); se puede desactivar en Ajustes.

- **Vehículo:** tipo (Scarab, Scorpion, Nomad, Rhino; de `LaunchSRV` / `LaunchVessel`), cuerpo, coordenadas y gravedad, y los interruptores de Status.json (freno de mano, asistencia, torreta, faros, largas, visión nocturna, análisis, recolector). Con el Rhino o la Nomad, botón a Minería o Exobiología.
- **Tu nave:** dónde está aparcada (`Touchdown` con coordenadas; si la despides desde el SRV, `Liftoff` con `PlayerControlled: false`, queda «en órbita» hasta que vuelve a aterrizar) y la distancia.
- **Brújula:** a la nave o al destino fijado, con la misma brújula de Órbita y A pie.
- **Materiales en bruto:** los 28 elementos por categoría y grado, con lo que llevas y el máximo, y lo recogido en esta salida (`MaterialCollected` mientras vas en el SRV).
- **Controles:** freno de mano, asistencia a la conducción, torreta, faros, visión nocturna, recolector, modo análisis, llamar o despedir la nave, fijar objetivo, mapas y expulsar carga (con confirmación). Usan las teclas del SRV de tu preset; en Controles hay un grupo «SRV» para revisarlas.

## CMDR

Grupo Comandante. Datos de los eventos que el juego escribe al cargar la partida y de los cambios posteriores (`core/cmdr.js`):

- **Cabecera:** nombre, créditos, patrimonio (`Statistics`), escuadrón y su rango (`SquadronStartup`), potencia y rango de Powerplay, estado legal.
- **Rangos:** combate, comercio, exploración, mercenario, exobiología, CQC, Imperio y Federación, con el progreso al siguiente (`Rank`, `Progress`, `Promotion`).
- **Reputación** con la Federación, el Imperio, la Alianza y los independientes (−100 a +100; Hostil, Poco amistoso, Neutral, Cordial, Amistoso, Aliado).
- **Estadísticas** (`Statistics`): banco, combate, comercio, exploración, exobiología, minería, delitos, pasaje y rescate, ingeniería y carrier.
- **Tu flota:** todas tus naves y dónde están, de `StoredShips` (al abrir el astillero) más la que pilotas, al día con los cambios de nave (`ShipyardSwap`, compra, venta, traslado, cambio de nombre). Valor total.

Los nombres de los rangos están en español aproximado (no todos se han comprobado con el juego en español).

## Carrier

Grupo Comandante. Tu fleet carrier (`core/carrier.js`): nombre, indicativo, dónde está (`CarrierLocation` al cargar la partida; `CarrierJump` si estás a bordo; si no, pasada la hora de salida de un `CarrierJumpRequest` se da por hecho el salto) y la distancia desde ti (Spansh), acceso de atraque y capitán. **Salto** con cuenta atrás hasta la salida. **Tritio** del depósito (de 1.000 t) y alcance. **Espacio** (tripulación, carga, reservado, paquetes, libre) y **finanzas** (saldo, reserva, disponible, tasas) de `CarrierStats`, que el juego escribe al abrir la gestión del carrier. **Servicios** instalados, activos o en pausa, con su tripulante. **Registro** de saltos, tritio, servicios y dinero. También dónde está el carrier del escuadrón. Lo último conocido se guarda en `carrier.json` (y lo del CMDR en `cmdr.json`), porque esos eventos pueden ser de hace semanas.

## Cámara

Grupo Comandante. Botones que pulsan tus teclas de la cámara: abrir la cámara (de la nave, del SRV o a pie, según dónde estés), anterior, siguiente, salir, las diez cámaras fijas, cámara libre, ocultar la interfaz, fijar a la nave o al mundo, velocidad, acercar, alejar y desenfoque. A la derecha, una ayuda breve y la tecla de tu preset para cada control de la cámara (también los de mover y girar, que no tienen botón). En Controles hay un grupo «Cámara» para revisarlas.

## Utilidades

Grupo Comandante.

- **Accesos directos:** 18 por página (con más páginas si añades más): webs y programas o archivos de tu PC, con la imagen que quieras de icono (o el icono del programa, que Windows da al elegirlo). «Editar» para añadir, cambiar, ordenar (‹ ›) o borrar. Se guardan en `links.json` y los iconos en `linkicons/`, en la carpeta de datos de la app.
- **Calculadoras:** distancia entre dos sistemas (coordenadas de Spansh) con los saltos y el tiempo aproximados con tu nave; alcance de salto vacío, ahora, con la carga que elijas y con la bodega llena (estimación por masa a partir del alcance máximo del juego); tiempo de viaje para distancias típicas.
- **Relojes y ciclos:** hora del juego (UTC, año +1286), hora local, cuenta atrás al corte de Powerplay y al mantenimiento del jueves, y tiempo de la sesión.
- **Enlaces rápidos:** el sistema actual en Inara, Spansh y EDSM; la estación en la que estás atracado en Inara y Spansh; copiar el sistema.

## Comercio

Grupo Actividades. La app salta aquí al abrir el mercado de mercancías en una estación (se queda hasta que despegas; se puede desactivar en Ajustes).

- **Mercado** (Market.json): pestañas Tu bodega · Barato para comprar (al menos un 15 % por debajo de la media de la galaxia) · Mucha demanda (al menos un 10 % por encima) · Para socavar (en sistemas de otra potencia: mercancías de menos de 500 CR/t). En la bodega, cada mercancía con lo que pagaste (precio medio de tus `MarketBuy` de los diarios de los últimos 45 días; lo minado, con el sistema donde lo minaste), lo que pagan aquí, el margen y si da méritos de Powerplay aquí.
- **Dónde vender** (Spansh, búsqueda de estaciones): estaciones cercanas con demanda que pagan al menos lo de aquí, de la más cara a la más barata, con plataforma según tu nave y sin portanaves. «Para méritos»: solo sistemas de refuerzo de tu potencia que paguen al menos un 40 % más de lo que te costó.
- **Dónde comprar** (Spansh, búsqueda de estaciones; pestaña junto a Ruta de comercio): escribes cualquier mercancía (en inglés o con el nombre del juego que la app haya visto en tus diarios y mercados, guardados en `commnames.json`) y salen las estaciones más cercanas que la venden, con precio, existencias y antigüedad del dato. Filtros: plataforma L (por defecto según tu nave), superficie (activado por defecto: muchas mercancías solo se venden en puertos planetarios), carriers y stock mínimo igual a tu bodega. Botón Copiar.
- **Powerplay:** qué es el sistema para tu potencia (refuerzo, socavar, adquisición), la regla de méritos por comercio de ese tipo de sistema y si tu potencia tiene la ética Finanzas ahí (+50 % estimado). Reglas de la guía de Powerplay 2.0 de Inara (logbook 84502), orientativas. En Powerplay hay un resumen («Méritos por comercio») con botón a Comercio.
- **Sesión:** ganancia (venta − precio medio pagado, del propio `MarketSell`), vendido, comprado, toneladas y rango de comercio con su progreso.
- **Ruta de comercio** (planificador de comercio de Spansh): desde la estación en la que estás, con la bodega, el alcance y el tamaño de plataforma de tu nave, todo tu dinero y precios de menos de 3 días; 4 tramos con qué comprar, dónde venderlo y la ganancia, el tramo en el que estás y botón Copiar. Se guarda en `traderoute.json` hasta que la borres. Código en `core/trade.js`.

## Exobiología

Grupo Actividades. La app salta aquí al sacar el escáner genético a pie, mientras tienes una especie a medias o al ir en la Nomad (`LaunchVessel` al sacarla y `DockSRV` al recogerla, tipo `lander01`), o en otro SRV si el cuerpo tiene señales biológicas (se puede desactivar en Ajustes). Las posiciones de las muestras se guardan en `biosamples.json` y se recuperan si reabres la app en el mismo sistema. En Órbita planetaria queda el resumen, con un botón «Abrir».

- **Muestreo:** la especie que estás muestreando, en qué muestra vas, su valor y si el cuerpo no lo ha pisado nadie (el juego paga hasta 5 veces más). Con la posición de cada muestra (`ScanOrganic` + Status.json) calcula la distancia a la más cercana y avisa de cuánto alejarte o de que ya puedes tomar la siguiente. Distancia mínima por género (dato del juego): Bacterium, Fonticulua y Stratum 500 m; Osseus y Tubus 800 m; Electricae 1 km; Cactoida y Fungoida 300 m; Tussock 200 m; Aleoida, Clypeus, Concha, Frutexa y Recepta 150 m; el resto 100 m.
- **Minimapa** (norte arriba, tú en el centro con tu rumbo): las muestras de la especie en curso con su círculo de distancia mínima (rojo si estás dentro, verde fuera), las especies ya analizadas en gris y la dirección del destino fijado en rosa.
- **Este cuerpo:** especies muestreadas y géneros del DSS con las especies posibles (reglas de SrvSurvey) y su valor, de más a menos. **Ubicaciones de otros comandantes** (Spansh): de cada especie conocida, la más cercana a ti, con «Fijar» para llevarla a la brújula y al minimapa; debajo, distancia y giro hasta el destino.
- **Este sistema:** cuerpos con señales biológicas, sus géneros y cuántos has analizado. **Lo que llevas:** muestras sin vender y su valor.
- **Valores:** se piden a Spansh por especie (búsqueda de cuerpos con esa especie) y se guardan en `biovalues.json`, junto con los de tus ventas. Código en `core/exobio.js`.

## Exploración

Grupo Viaje. La app salta aquí al abrir el escáner FSS o lanzar sondas DSS (se puede desactivar en Ajustes).

- **Sistema actual:** los cuerpos que has escaneado (diario: `Scan`, `SAAScanComplete`, `FSSDiscoveryScan`, `FSSBodySignals`) y, de los que aún no, los que conoce Spansh (volcado del sistema). De cada uno: tipo, distancia, si eres el primero en descubrirlo o cartografiarlo, si es terraformable o aterrizable, señales biológicas y geológicas, y su valor estimado ahora y cartografiado. Pestañas Todos · De interés (más de 300.000 CR cartografiado o con señales biológicas) · Sin escanear, con paginador. Si el sistema no está en Spansh, lo avisa (puede que seas el primero).
- **Datos sin vender:** cartografía por sistema y muestras de exobiología analizadas desde la última venta (`SellExplorationData`, `MultiSellExplorationData`, `SellOrganicData`; al morir se pierden). Se calcula con los diarios de los últimos 45 días. El valor de cada especie se aprende de tus ventas y de Spansh y se guarda en `biovalues.json`; si aún no se sabe, sale «¿?».
- **Ruta de neutrones:** el Neutron Plotter de Spansh calcula la ruta desde tu sistema con el alcance de la nave y eficiencia del 60 %. Muestra el siguiente punto (con botón Copiar para pegarlo en el mapa de la galaxia), si es estrella de neutrones, los saltos y años luz que quedan y los puntos siguientes. Avanza sola al llegar a cada punto y se guarda en `neutron.json` hasta que la borres.
- **Valores:** fórmula de la comunidad para el pago de datos de exploración en Odyssey (constante por tipo de cuerpo, masa, primer descubrimiento ×2,6, cartografía y bono de eficiencia). No cuenta los bonos por sistema completo. Código en `core/exploration.js`.

## Combate

Sección del grupo Nave, con tres columnas (datos de `core/combat.js`):

- **Objetivo**: la nave fijada (`ShipTargeted`) con piloto, rango de combate, facción, estado legal (en cian si puedes atacarla sin delito, en ámbar si está limpia), recompensa, escudo, casco y el subsistema apuntado. Debajo, tu estado legal. El escudo y el casco de tu nave no se muestran: el juego los enseña al momento y el diario no los da al día (el casco solo al cargar, atracar o equipar).
- **Zona**: al caer en una zona de conflicto (con su intensidad), de extracción o en una baliza, cuenta las bajas y los créditos de esa zona y, con el primer bono, por quién luchas y contra quién. Debajo, los totales de la sesión de juego y las últimas bajas (la nave de un bono sale del último objetivo de esa facción).
- **Por cobrar**: bonos de combate y recompensas pendientes por facción. Se descuentan al cobrar (`RedeemVoucher`; en un Interstellar Factors se cobra todo) y se pierden al morir. Se reconstruyen desde los diarios recientes, así que incluyen lo que hiciste antes de abrir la app.
- **Masacres**: progreso de cada misión de masacre. Cada baja cuenta para la primera misión sin terminar de cada facción emisora, como en el juego, y se marca «entrégala» al completarse. Arriba, las bajas que faltan para la pila más larga.
- **Conflictos**: guerras, guerras civiles y elecciones del sistema, con lo que está en juego y los días ganados de cada bando.

- **Botones** (pulsan las teclas de tu preset; necesitan tecla de **teclado** asignada en el juego):
  - **Fijar planta de energía** (grande, resaltado): la misma secuencia que el botón de la página Combate de Touch Portal: 6 pulsaciones de «Subsistema anterior» (`CyclePreviousSubsystem`), porque el juego no tiene tecla directa para la planta.
  - **Fijar objetivo de mi compañero**: fija a tu compañero de ala (el primero, `TargetWingman0`) y después su objetivo (`SelectTargetsTarget`).
  - **Caza**: atacar mi objetivo, atacar a discreción, defenderme, alto el fuego, mantener posición, seguirme, volver a la nave y abrir órdenes (`Order…` y `OpenOrders`). El caza se lanza desde el panel de funciones del juego (no hay tecla para eso).

No muestra pips, grupo de fuego ni arma seleccionada. Salto automático a Combate al desplegar el armamento con el HUD en modo combate (no en modo análisis), al entrar en una zona de combate o si te atacan, interdictan o derribas a alguien (90 s), salvo en supercrucero, atracado o aterrizado; se desactiva en Ajustes.

## Equipo

Sección del grupo Nave, con tres pestañas:

- **Tu nave**: la nave actual (del evento `Loadout`) con salto máximo, carga, casco, reembolso, módulos con ingeniería y ranuras libres, y **todas** sus ranuras por grupo (internos principales, anclajes y apoyo, internos opcionales), también las vacías. Las ranuras salen de la plantilla de cada nave (`core/builds.js`, con los nombres que usa el juego: `MediumMiningHardpoint1`, `Slot03_Size6`, `Cargo01`, `LimpetController01`…); si el diario trae una ranura que la plantilla no conoce, ese grupo se muestra solo con lo montado. Botones para **exportar**: abrir la nave en Coriolis o en EDSY (enlace de importación con el `Loadout` comprimido) y copiarla en SLEF (para Inara).
- **Builds**: botón **Importar build** (al pasar el ratón explica cómo): lee del portapapeles una build en SLEF (EDSY y Coriolis: Export › SLEF; Inara), un enlace de importación de EDSY (`#/I=`) o Coriolis (`import?data=`) o un evento `Loadout`. Los enlaces cortos de Coriolis (`outfit/…?code=`) no se pueden leer. Se guardan en `builds.json` (carpeta de datos de la app) hasta que se borran con «Borrar».
- **Lista de deseos**: lo que cambia de tu nave de ese tipo a la build, ranura a ranura (cambiar, montar, quitar o ingeniería), con el precio normal de lo que falta. Lo que ya has hecho se marca como hecho en cuanto el diario lo ve. Al tocar un módulo, **dónde comprarlo**: las 100 estaciones más cercanas que lo venden según Spansh, con distancia, plataforma, precio y descuento (comparado con el precio normal; con la potencia de Powerplay que controla el sistema), filtros por distancia (20/50/100 ly), orden por cercanía o precio y solo plataforma L.

Tu flota (los módulos de cada nave que has usado) se guarda en `fleet.json` para poder comparar builds con naves que no llevas ahora. Los datos de naves y módulos (`core/data/shipdata.json`: EDCD FDevIDs y coriolis-data, más Inara para las naves y módulos recientes) se usan para los nombres, las ranuras y el precio normal; las pestañas de catálogo de naves y módulos se han quitado de momento.

## Colonización · planificar

Botón «Planificar» en Colonización (y pantalla por defecto si aún no tienes construcciones): los 55 tipos de construcción (orbitales y de superficie) con su nivel, el total de toneladas y los viajes con tu bodega, y al elegir uno, la lista de mercancías con sus toneladas. Son cantidades de referencia: el juego puede pedir algo más o algo menos, y el puerto primario cuesta más; en cuanto la construcción existe, la app usa lo que dice el juego. Datos: `core/data/colonization-costs.json`, de SrvSurvey (autor de Raven Colonial), GPLv3.

## Ingenieros

Sección del grupo Comandante, con dos pestañas:

- Naves (25 ingenieros): filtra por categoría (anclajes, apoyo, internos principales, internos opcionales, con los nombres del juego en español) y por módulo para ver quién lo mejora y hasta qué grado, ordenados por grado y por acceso. La ficha de cada uno muestra su retrato, sitio y sistema (con botón para copiarlo), si pide permiso o está en Colonia, tu grado con él y qué le falta para desbloquearlo. El estado sale de `EngineerProgress` (en naves, «Invited» aún pide el contrato inicial).
- A pie (13 ingenieros): lo mismo con las mejoras de traje y arma que montan.

- Recetas de nave: en la ficha de un ingeniero de naves, toca un módulo para ver sus recetas (por ejemplo, FSD «Increased range») con los materiales de cada grado hasta el tope de ese ingeniero, y sus efectos experimentales. Cada material sale con su nombre del juego en español (`core/data/materials.json`; al pasar el ratón, el nombre en inglés, tipo, grado y cuánto cabe) y muestra lo que tienes y lo que pide; «máx.» avisa de que ese material está lleno y «×N» junto a cada grado dice cuántas tiradas puedes hacer con lo que llevas. Los experimentales van de 4 en 4 con paginador; los grados que aún no puedes pedirle (por tu grado con él) salen atenuados. Tus materiales salen del diario (`Materials` al empezar la partida, y luego recogidas, descartes, intercambios, síntesis, trabajos de ingeniero y recompensas de misión). Recetas en `core/shipblueprints.js`: las de coriolis-data y, para lo que no trae (módulos guardianes, refuerzo de módulos, láser de minería, lanzamisiles de enzimas, desintegrador abrasivo y las recetas nuevas, muchas solo para módulos «Merc»), las de Inara. «Merc Coin» y los materiales thargoid no salen en el diario: se muestran con su cantidad pero sin la tuya.

Datos en `core/shipengineers.js`, `core/odymods.js` y `core/shipblueprints.js`; retratos de los 38 en `app/renderer/engineers/`.

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

- **Teclas pendientes de asignar**: las acciones de ED BUBBLE que no se pueden pulsar con tu preset (sin asignar, solo en el mando o con la tecla repetida en el mismo contexto), con su grupo; se asignan en el juego y la app relee los controles sola.
- Al pasar el ratón por un botón desactivado sale un cuadro que explica por qué (por ejemplo, que hay que asignar una tecla del teclado dentro del juego).
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

- **Consejos al abrir (semana del 30-11-2026):** al arrancar la app, un consejo breve sobre una función poco conocida (por ejemplo, fijar una página con una pulsación larga de 2 s, la ayuda de los botones desactivados o los accesos directos de Utilidades). Uno distinto cada vez, con «Siguiente» y la opción de no mostrarlos más en Ajustes. Pedido por Adder el 27-11-2026.
- **Alertas personalizables (semana del 30-11-2026):** en Ajustes, elegir el color de cada alerta de la cabecera (hoy unas salen en rojo y otras en amarillo, fijo) y marcar las más importantes para que parpadeen (animación tipo «tilting») y llamen más la atención. Pedido por Adder el 27-11-2026.

- `core/data/materials.json`: falta el símbolo del diario de 9 materiales thargoides recientes (marcados «verificar»); en las recetas salen ya en español, buscados por su nombre en inglés.

- Masa, energía y demás datos de los módulos Mk II recientes (cabinas de pasajeros MkII, Mk II Vessel Hangar, Large Planetary Vehicle Hangar y su Mk II, Mk II Cargo Rack 6D): Inara solo da el precio. Fuentes posibles: la pantalla de Equipamiento del juego o EDSY. Añadirlos a `core/data/shipdata.json`.

- Traducción de la interfaz a inglés, francés, italiano y alemán (ahora solo español; en Ajustes › Idioma sale «English · pronto»).

- Brújula de coordenadas (y quizá el esquema de atraque) en **overlay** sobre la pantalla del juego: ventana transparente, siempre encima y que no capture el ratón, con el juego en ventana sin bordes.

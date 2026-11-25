# ED BUBBLE · Bugfixes

Errores encontrados en las versiones publicadas y versión en la que se corrigen.

- **Versión actual publicada:** 0.7.0-beta.3 (24-11-2026)
- **Versión anterior:** 0.7.0-beta.2 (24-11-2026)

Estados: **Abierto** (anotado, sin corregir) · **Corregido** (hecho en el repo, pendiente de publicar) · **Publicado** (incluido en una versión publicada).

| # | Error | Informado por | Encontrado en | Corregido en | Estado |
|---|-------|---------------|---------------|--------------|--------|
| 1 | Estación › Ingenieros mezcla los de naves y los de a pie, y parece que no están todos en grado 5 | Specter A.G. | 0.7.0-beta.1 | 0.7.0-beta.2 | Publicado |
| 2 | Vuelo › Aproximación a planeta: el botón «Pegar» no pega las coordenadas | Specter A.G. | 0.7.0-beta.1 | 0.7.0-beta.2 | Publicado |
| 3 | Vuelo › Aproximación a planeta: la gravedad sale «—» en la nave | Specter A.G. | 0.7.0-beta.1 | 0.7.0-beta.2 | Publicado |
| 4 | Vuelo › Aproximación a planeta: el destino fijado se queda en «Cuerpo sin indicar» | Adder (captura de Specter A.G.) | 0.7.0-beta.1 | 0.7.0-beta.2 | Publicado |
| 5 | Colonización › Dónde comprar no encuentra ninguna estación (juego en otro idioma) | Specter A.G. | 0.7.0-beta.1 | 0.7.0-beta.2 | Publicado |
| 6 | Nombre de las construcciones: el prefijo «Orbital Construction Site:» solo se quitaba en inglés | Revisión de idiomas | 0.7.0-beta.1 | 0.7.0-beta.2 | Publicado |
| 7 | A pie › Mejoras: el material propio del traje Maverick era Titanium Plating (es Carbon Fibre Plating) | Adder (Odyssey Materials Helper) | 0.7.0-beta.2 | 0.7.0-beta.3 | Publicado |
| 8 | Estación › Ingenieros: los de a pie con estado «Invited» no contaban como desbloqueados (en Odyssey ya dan acceso) | Adder (captura del juego) | 0.7.0-beta.2 | 0.7.0-beta.3 | Publicado |
| 9 | A pie › Taquilla: los botones Bienes, Componentes, Datos y Consumibles se salen del panel | Adder (captura) | 0.7.0-beta.3 | 0.7.0-beta.4 | Corregido |
| 10 | Equipo › Naves: la lista no deja ver todas las naves (el paginador queda fuera del panel) | Adder (captura) | 0.7.0-beta.3 | 0.7.0-beta.4 | Corregido |

## Detalle

### 1 · Ingenieros: cifras confusas en la tarjeta de Estación

- **Informado por:** Specter A.G. (23-11-2026), atracado en un puesto con taller de ingeniero.
- **Encontrado en:** 0.7.0-beta.1 · **Corregido en:** 0.7.0-beta.2
- **Qué pasaba:** la tarjeta mostraba «Desbloqueados 34 / 38» y «Rango 5: 25». Specter tiene todos los ingenieros de naves en grado 5, incluidos los de Colonia, y parecía que faltaban.
- **Causa:** las cifras eran ciertas, pero contaban juntos dos tipos de ingeniero que el juego lista en el mismo evento `EngineerProgress`:
  - 25 de naves (Horizons, `EngineerID` 300xxx), con grados del 1 al 5: los 25 estaban en grado 5.
  - 13 de equipo a pie (Odyssey, `EngineerID` 400xxx), que no tienen grados: 9 desbloqueados y 4 solo conocidos o invitados.

  Así, 34 / 38 sumaba los dos tipos, y «Rango 5: 25» no decía de cuántos.
- **Corrección:** la tarjeta separa los dos tipos: «Naves · grado 5: 25 / 25» (en cian y con el texto «Todos los de naves en grado 5» cuando están todos) y «A pie · desbloqueados: 9 / 13», con la nota «Los de a pie no tienen grados». El tipo se saca del `EngineerID`, con una lista de nombres de Odyssey por si falta.
- **Archivos:** `core/model.js`, `app/renderer/app.js`.

### 2 · El botón «Pegar» de las coordenadas no hace nada

- **Informado por:** Specter A.G. (23-11-2026). Tenía coordenadas copiadas, el botón no las pegó y tuvo que usar Ctrl+V en el campo.
- **Encontrado en:** 0.7.0-beta.1 · **Corregido en:** 0.7.0-beta.2
- **Causa:** en Electron 45 las funciones del portapapeles son asíncronas: `clipboard.readText()` devuelve una promesa, no el texto. La app hacía `clipboard.readText().slice(…)`, que fallaba («slice is not a function»), y el campo se quedaba vacío sin ningún aviso. Reproducido en una prueba con Electron 45.4.1.
- **Corrección:**
  - Se espera la promesa del portapapeles al leer (botón «Pegar») y al escribir (botón de copiar y «Trazar ruta», que pega el nombre del sistema con Ctrl+V en el mapa galáctico). Trazar ruta funcionaba porque el portapapeles solía escribirse a tiempo, pero no estaba garantizado.
  - Si el portapapeles está vacío o no tiene texto, ahora sale el aviso «El portapapeles está vacío o no tiene texto», y cualquier fallo queda en `ed-bubble.log`.
  - Se quitan los espacios sobrantes del texto pegado.
- **Comprobado:** con coordenadas en el portapapeles, el botón «Pegar» las pone en el campo, tenga o no el foco.
- **Archivos:** `app/main.js`, `core/plot.js`, `app/renderer/app.js`.

### 3 · Gravedad del cuerpo vacía al acercarse a un planeta

- **Informado por:** Specter A.G. (23-11-2026). Iba en la nave, a 137 m del destino, sobre un cuerpo de 0,07 g, y la casilla «Gravedad» mostraba «—».
- **Encontrado en:** 0.7.0-beta.1 · **Corregido en:** 0.7.0-beta.2
- **Causa:** la app solo leía la gravedad de `Status.json`, y el juego únicamente escribe ese dato cuando vas **a pie**. En la nave o en el SRV nunca aparecía.
- **Corrección:** la gravedad se busca en este orden:
  1. `Status.json`, cuando vas a pie.
  2. El evento `Scan` del Journal, si has escaneado el cuerpo (`SurfaceGravity` viene en m/s² y se pasa a g).
  3. Spansh: al llegar el evento `ApproachBody`, la app calcula el id64 del cuerpo (`SystemAddress + BodyID << 55`) y consulta `/api/body/<id64>`. El resultado se guarda para que se vea aunque la ventana se abra después.

  Se muestra con dos decimales por debajo de 1 g (0,07 g) y con uno por encima (2,3 g). Los cuerpos escaneados se olvidan al saltar de sistema.
- **Comprobado:** prueba unitaria (escaneo, aproximación, id64 contra uno real de Spansh y limpieza al saltar) y prueba de la app completa: al acercarse a un cuerpo, la casilla muestra «0,07 g».
- **Archivos:** `core/model.js`, `core/spansh.js`, `app/main.js`, `app/preload.js`, `app/renderer/app.js`, `app/test/run-tests.js`.

### 4 · El destino fijado se queda en «Cuerpo sin indicar»

- **Informado por:** Adder, visto en la captura de Specter A.G. del error 3.
- **Encontrado en:** 0.7.0-beta.1 · **Corregido en:** 0.7.0-beta.2
- **Qué pasaba:** al fijar unas coordenadas antes de entrar en la órbita del planeta, la app aún no sabía en qué cuerpo estabas. El destino se guardaba sin cuerpo y ya no se completaba, así que no se podía avisar de «estás en otro cuerpo».
- **Corrección:** si el destino no tiene cuerpo, se completa solo con el primero al que llegas: el `BodyName` de `Status.json` o el cuerpo de `ApproachBody`. Se guarda en `surface-target.json` y se anota en `ed-bubble.log`. Un destino que ya tiene cuerpo no se cambia.
- **Comprobado:** prueba unitaria y prueba de la app completa: un destino guardado sin cuerpo pasa a tener el cuerpo de la aproximación, también en el archivo.
- **Archivos:** `core/geo.js`, `app/main.js`, `app/test/run-tests.js`.

### 5 · «Dónde comprar» no encuentra estaciones

- **Informado por:** Specter A.G. (23-11-2026). En Colonización, la búsqueda de dónde comprar material no daba ninguna estación; Raven Colonial sí las encontraba.
- **Encontrado en:** 0.7.0-beta.1 · **Corregido en:** 0.7.0-beta.2
- **Causa:** la app buscaba en Spansh con el nombre de la mercancía tal como lo escribe el juego en su idioma (`Name_Localised`), y Spansh solo entiende los nombres en inglés. Con el juego en inglés funcionaba; en español no. Comprobado contra Spansh: «Acero» da 0 estaciones y «Steel» da más de 10.000. No era un problema de Spansh frente a EDSM.
- **Corrección:** la búsqueda usa el símbolo interno de la mercancía (`$steel_name;`), que no depende del idioma, y lo traduce a su nombre en inglés con la tabla de EDCD/FDevIDs (270 mercancías, en `core/commodities.js`). En pantalla se sigue viendo el nombre en el idioma del juego. Si una mercancía no está en la tabla, se usa el nombre de antes.
- **Comprobado:** prueba unitaria (símbolos → «Steel», «CMM Composite», «Liquid oxygen») y nombres comprobados contra Spansh con resultados.
- **Archivos:** `core/commodities.js` (nuevo), `app/main.js`, `app/renderer/app.js`, `app/test/run-tests.js`, `THIRD_PARTY_NOTICES.md`.

### 6 · Prefijo de las construcciones en otros idiomas

- **Origen:** revisión de la app con el juego en otros idiomas (a raíz del error 5).
- **Encontrado en:** 0.7.0-beta.1 · **Corregido en:** 0.7.0-beta.2
- **Qué pasaba:** la app muestra «Sisters' Pride» en vez de «Orbital Construction Site: Sisters' Pride», pero solo reconocía el prefijo en inglés. Si el juego escribe el prefijo en otro idioma, se habría visto entero, y la comparación con el destino final (para saber que ya has llegado) podría fallar.
- **Corrección:** se quita cualquier prefijo de construcción seguido de «:» en inglés, español, francés, alemán, italiano, polaco y ruso. Los nombres normales, incluidos los que llevan «:», no cambian.
- **Archivo:** `app/renderer/app.js`.

### 7 · Mejora del traje Maverick con el material equivocado

- **Informado por:** Adder (24-11-2026), comparando con Odyssey Materials Helper.
- **Encontrado en:** 0.7.0-beta.2 · **Corregido en:** 0.7.0-beta.3
- **Qué pasaba:** para subir de grado el Maverick, la app pedía Titanium Plating.
- **Causa:** la wiki no lo confirmaba y se tomó el material del Dominator. El Maverick pide Carbon Fibre Plating y Graphene (12 de cada material común y 28 de cada propio de G1 a G5). Se comprobaron también los otros dos trajes y las 11 armas: coincidían.

### 8 · Ingenieros de a pie «invitados» contados como bloqueados

- **Informado por:** Adder (24-11-2026), con la ficha de Yarden Bond en el juego («You gained access…»).
- **Encontrado en:** 0.7.0-beta.2 · **Corregido en:** 0.7.0-beta.3
- **Qué pasaba:** la tarjeta de Estación contaba como desbloqueados solo los de estado «Unlocked».
- **Causa:** en los ingenieros de Odyssey, «Invited» en el diario ya significa que tienes acceso; «Unlocked» solo añade que ya los has visitado. Ahora cuentan los dos (en naves, «Invited» sigue pidiendo el contrato inicial).

## Revisión: el juego en otros idiomas (24-11-2026)

Revisado todo lo que la app toma del Journal y de los archivos del juego:

| Dato | Depende del idioma | Situación |
|------|--------------------|-----------|
| Mercancías (Colonización, mercado, bodega) | Sí, el nombre visible | Las comparaciones usan el símbolo interno; la búsqueda en Spansh usa el nombre en inglés (error 5) |
| Prefijo de las construcciones | Posible | Corregido (error 6) |
| Economía, gobierno, seguridad, tipo de nave, destino | Sí | Solo se muestran; se ven en el idioma del juego, que es lo correcto |
| Tipo de estación, servicios, estados de facción y de Powerplay, ingenieros | No (códigos) | Sin cambios |
| Sistemas, estaciones, potencias, cuerpos | No (nombres propios) | Sin cambios |
| Teclas de los controles | No | El juego guarda las teclas por su posición en un teclado estadounidense, sea cual sea la distribución (un jugador francés lo confirma en el foro de Frontier: pulsa Z y el archivo guarda W). La app envía la tecla por esa posición, así que vale para AZERTY, QWERTZ o español. Comprobado en español; sin probar en AZERTY ni QWERTZ |

## Sugerencias de los probadores

| # | Sugerencia | Propuesta por | Fecha | Estado |
|---|------------|---------------|-------|--------|
| S1 | Nueva sección **Órbita planetaria** (grupo Nave): coordenadas y brújula (se sacan de Vuelo), más información exobiológica del cuerpo y cuántos puntos de minería tiene. En el hueco que queda en **Vuelo**: estaciones y portanaves del sistema, incluidos los bastión de Powerplay. | Specter A.G. | 24-11-2026 | Hecha en 0.7.0-beta.2 |

### S1 · Órbita planetaria y estaciones del sistema en Vuelo

- **Nueva sección «Órbita planetaria»** (grupo Nave). La app salta a ella al entrar en la órbita de un cuerpo (con coordenadas en `Status.json`) o al aterrizar; se puede desactivar en Ajustes.
  - Destino en superficie: coordenadas, botones Pegar, Fijar y Quitar, y la brújula (antes en Vuelo), más altitud, rumbo, latitud y longitud.
  - Cuerpo: tipo, atmósfera, gravedad, temperatura, radio y si se puede aterrizar. Datos del escaneo del Journal (`Scan`) o, si no, de Spansh.
  - Exobiología: señales biológicas, géneros del DSS (`SAASignalsFound`) y progreso de cada muestra (`ScanOrganic`, 1 a 3). Si aún no has escaneado, las especies conocidas en Spansh con su valor y un botón «Fijar» que pone su posición como destino de la brújula.
  - Minería: señales geológicas, zonas de minería del planeta (Spansh) y puntos calientes de cada anillo (DSS o Spansh).
- **Vuelo**, en el hueco de la aproximación: tarjeta «En este sistema» con las estaciones y portanaves del sistema actual (Spansh), filtrables por tipo con los mismos botones de iconos que Navegación (varios a la vez, «Solo L» y «Todas»). Los portanaves bastión de Powerplay tienen su propio botón y salen en ámbar con su potencia; Spansh los da como «Planetary Outpost» con el nombre «Stronghold Carrier».
- **Archivos:** `core/model.js`, `core/derive.js`, `core/spansh.js`, `app/main.js`, `app/preload.js`, `app/renderer/app.js`, `app/test/run-tests.js`.

### 9 · Botones de la taquilla desencajados

- **Informado por:** Adder (25-11-2026), con captura.
- **Encontrado en:** 0.7.0-beta.3 · **Corregido en:** 0.7.0-beta.4
- **Qué pasaba:** en A pie › Taquilla, los cuatro botones de categoría no cabían en una fila: «Componentes» y «Consumibles» se cortaban y el último se salía del panel.
- **Causa:** con la ventana más estrecha que la pantalla completa, la columna no da para cuatro botones con esos nombres. Ahora van en dos filas de dos, como las categorías de Equipo.

### 10 · Equipo › Naves: no se ven todas las naves

- **Informado por:** Adder (25-11-2026), con captura.
- **Encontrado en:** 0.7.0-beta.3 · **Corregido en:** 0.7.0-beta.4
- **Qué pasaba:** la lista mostraba 17 naves (de la Adder a la Dolphin) y no había forma de ver el resto.
- **Causa:** cada página tenía 20 naves y no cabían en el panel: las últimas filas y los botones ‹ › para pasar de página quedaban cortados por debajo. Ahora son 14 por página (4 páginas) y los botones se ven. Se ha comprobado con un recorrido automático que ninguna otra lista de la app se sale de su panel.

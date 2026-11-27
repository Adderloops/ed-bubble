# ED BUBBLE · Bugfixes

Errores encontrados en las versiones publicadas y versión en la que se corrigen.

- **Versión actual publicada:** 0.7.0-beta.4 (25-11-2026)
- **Versión anterior:** 0.7.0-beta.3 (24-11-2026)

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
| 9 | A pie › Taquilla: los botones Bienes, Componentes, Datos y Consumibles se salen del panel | Adder (captura) | 0.7.0-beta.3 | 0.7.0-beta.4 | Publicado |
| 10 | Equipo › Naves: la lista no deja ver todas las naves (el paginador queda fuera del panel) | Adder (captura) | 0.7.0-beta.3 | 0.7.0-beta.4 | Publicado |
| 11 | Equipo › Tu nave: no salían las ranuras vacías, y algunas ranuras y recetas salían con el nombre interno («MEDIUMMININGHARDPOINT1», «LIMPETCONTROLLER01», «CARGORACKS6C1 EXTENDED») | Adder (captura) | 0.7.0-beta.3 | 0.7.0-beta.4 | Publicado |
| 12 | Equipo: 22 módulos normales salían con el nombre de su versión Merc («Extended Cargo Rack», «Long Range Detailed Surface Scanner», «Far-Reaching Abrasion Blaster»…) y algunos sin precio | Revisión al hacer la lista de deseos | 0.7.0-beta.3 | 0.7.0-beta.4 | Publicado |
| 13 | Vuelo › Plataformas: en las estaciones Dodec, el esquema de la plataforma de atraque a veces no es correcto | Adder | 0.7.0-beta.3 | — | Abierto |
| 14 | Con el instalador, los paneles se descuadran (botones cortados, como las pestañas de Colonización) | Specter A.G. (captura vía Adder) | 0.7.0-beta.1 | 0.7.0-beta.4 | Publicado |
| 15 | Combate › Tu nave: el casco marcaba 100 % con la nave al 53 % | Adder (captura del juego) | 0.7.0-beta.3 | 0.7.0-beta.4 | Publicado (limitación del juego) |
| 16 | Minería › Sitios de la flota: «Usar la conexión de Skull Mining (EDMC)» no encuentra la URL ni la clave | Adder (captura) | 0.7.0-beta.3 | 0.7.0-beta.4 | Publicado |
| 17 | Órbita planetaria › Cuerpo: sin gravedad, temperatura ni radio | Specter A.G. (captura vía Adder) | 0.7.0-beta.3 | 0.7.0-beta.4 | Publicado |
| 18 | Vuelo › Próximo salto y Navegación: el nombre del sistema de destino salía cortado («Pegasi Sector…») | Adder (captura) | 0.7.0-beta.4 | 0.7.0-beta.5 | Publicado |
| 19 | Exobiología: predecía especies en un cuerpo cuyas señales (FSS o Spansh) no tienen ninguna biológica; nombres repetidos («Roseum Sinuous Tubers Roseum Sinuous Tubers») | Adder (en HIP 109677 A 2, comparando con SrvSurvey) | desarrollo | 0.7.0-beta.5 | Publicado |
| 20 | Minería › Superficie: frente a un planeta con 9 zonas de minería no mostraba nada hasta aterrizar; Órbita › Zonas de minería salía «—» con el cuerpo escaneado | Adder (captura en Pegasi Sector IH-V c2-28 A 1) | 0.7.0-beta.4 | 0.7.0-beta.5 | Publicado |
| 21 | Exobiología: en la Nomad la app no iba a Exobiología (se quedaba en A pie, sin minimapa) | Adder (captura en Pegasi Sector JN-S b4-7 C 5) | desarrollo | 0.7.0-beta.5 | Publicado |
| 22 | Exobiología: la 3.ª muestra se contaba como la 2.ª y el análisis como otra muestra en el mismo sitio | Adder (prueba con la Nomad, Bacterium Tela) | desarrollo | 0.7.0-beta.5 | Publicado |
| 23 | Colonización: la construcción seguía con su nombre antiguo («Watabe Depot») después de ponerle uno nuevo («Sisters' Pride») | Adder | 0.7.0-beta.4 | 0.7.0-beta.5 | Publicado |
| 24 | Colonización › Comprar: con la Anaconda Mk II (y Clipper, Orca, Caspian Explorer) no filtraba por plataforma L | Revisión al añadir «Dónde comprar» en Comercio | 0.7.0-beta.1 | 0.7.0-beta.5 | Publicado |
| 25 | Órbita planetaria y Exobiología: la página fallaba («Error al pintar») en un cuerpo cuya ficha de Spansh no traía anillos | Prueba de todas las secciones antes de la beta 5 | 0.7.0-beta.4 | 0.7.0-beta.5 | Publicado |

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


### 18 · Destino cortado

- **Informado por:** Adder (26-11-2026), con captura en HIP 109677.
- **Encontrado en:** 0.7.0-beta.4 · **Corregido en:** 0.7.0-beta.5
- **Qué pasaba:** en la tarjeta Próximo salto (Vuelo) el destino ocupaba un tercio del ancho y los nombres de sistema largos se cortaban con «…». En Navegación › Ruta trazada pasaba lo mismo.
- **Arreglo:** en Vuelo el destino ocupa ahora toda la fila; en Navegación, el doble de ancho que las otras cifras. En los dos, la letra se reduce si el nombre es muy largo y el nombre completo sale al pasar el ratón.

### 19 · Especies predichas en un cuerpo sin biología

- **Informado por:** Adder (26-11-2026), al aterrizar en HIP 109677 A 2 y ver en SrvSurvey «Bio signals: 5».
- **Encontrado en:** versión de desarrollo (sección Exobiología) · **Corregido en:** 0.7.0-beta.5
- **Qué pasaba:** las 5 señales biológicas de SrvSurvey son de todo el sistema (B 5 y B 6 a), no de A 2. Spansh tiene las señales de A 2 (3 geológicas y 3 humanas, ninguna biológica), pero la app las ignoraba y predecía Sinuous Tubers en A 2. Además, en las especies cuyo nombre ya incluye el género (Sinuous Tubers, Anemone) el nombre salía repetido.
- **Arreglo:** si las señales del cuerpo (tu FSS o Spansh) no incluyen ninguna biológica, no se predice nada y la app dice en qué cuerpos del sistema sí hay. Exobiología › Este sistema muestra el valor posible de cada cuerpo con biología (con HIP 109677 coincide con SrvSurvey: B 6 a hasta 6,9 M, B 5 hasta 1,7 M). Los nombres de especie ya no repiten el género.


### 20 · Zonas de minería antes de bajar

- **Informado por:** Adder (26-11-2026), en supercrucero frente a Pegasi Sector IH-V c2-28 A 1 tras escanearlo con sondas (9 zonas de minería).
- **Encontrado en:** 0.7.0-beta.4 · **Corregido en:** 0.7.0-beta.5
- **Qué pasaba:** Minería › Superficie solo mostraba algo con posición en la superficie, y los sitios de la flota solo se pedían al bajar. Además, la señal `$PlanetaryMiningLocation_Name;` del diario se guardaba con una clave distinta de la de Spansh, así que Órbita › Minería no contaba las zonas de tu propio escaneo.
- **Arreglo:** el cuerpo de minería es ahora el que pisas, al que te acercas o, en supercrucero, el que tienes fijado como destino en el sistema. La tarjeta «Zonas de minería» muestra sus zonas (1 a 9), la que tienes fijada en el juego en ámbar y, debajo de cada una, lo que la flota encontró allí (Skull Mining); al tocar una, Sitios de la flota muestra solo los suyos. Lo que contiene cada zona no sale en el diario: el juego solo lo enseña al bajar a órbita.


### 21 · La Nomad no llevaba a Exobiología

- **Informado por:** Adder (26-11-2026), muestreando Bacterium Tela en Pegasi Sector JN-S b4-7 C 5 con la Nomad.
- **Encontrado en:** versión de desarrollo · **Corregido en:** 0.7.0-beta.5
- **Qué pasaba:** la Nomad es un vehículo nuevo: el diario la anuncia con `LaunchVessel` (tipo `lander01`), no con `LaunchSRV`, la recoge con `DockSRV` (tipo `lander01`) y en Status.json cuenta como SRV. La app solo saltaba a Exobiología a pie con el escáner genético en la mano; en el vehículo iba a la sección SRV (aún sin hacer). Además, si reabrías la app a mitad de una especie, se perdían las posiciones de las muestras (el diario no las guarda).
- **Arreglo:** en la Nomad, en otro SRV sobre un cuerpo con señales biológicas, o a pie con una especie a medias, la app va a Exobiología (minimapa y brújula funcionan igual, con la posición de Status.json). Las posiciones de las muestras se guardan en `biosamples.json` y se recuperan al reabrir en el mismo sistema.


### 22 · La tercera muestra contaba mal

- **Informado por:** Adder (26-11-2026), al completar Bacterium Tela con la Nomad.
- **Encontrado en:** versión de desarrollo · **Corregido en:** 0.7.0-beta.5
- **Qué pasaba:** el juego escribe `Log` en la 1.ª muestra, `Sample` en la 2.ª **y en la 3.ª**, y `Analyse` unos segundos después, sin moverte. La app tomaba `Sample` siempre como la 2.ª y `Analyse` como la 3.ª, así que la 3.ª muestra salía como «2 de 3» y el análisis añadía un punto repetido en el minimapa.
- **Arreglo:** cada `Sample` suma una muestra (hasta 3) con su posición; `Analyse` marca la especie como analizada sin añadir punto.


### 23 · Nombre antiguo de la construcción

- **Informado por:** Adder (26-11-2026), atracado en la construcción de Pegasi Sector IH-V c2-28.
- **Encontrado en:** 0.7.0-beta.4 · **Corregido en:** 0.7.0-beta.5
- **Qué pasaba:** el diario ya la llama «Orbital Construction Site: Sisters' Pride», pero la app guardaba el nombre de la primera vez que la vio («Watabe Depot») y no lo cambiaba nunca.
- **Arreglo:** cada atraque (o evento con nombre y MarketID) actualiza el nombre de la construcción con el más reciente; también se quitan los espacios dobles que trae el diario.

### 24 · Plataforma L sin las naves nuevas

- **Encontrado:** revisión del código (26-11-2026), al añadir «Dónde comprar» en Comercio.
- **Encontrado en:** 0.7.0-beta.1 · **Corregido en:** 0.7.0-beta.5
- **Qué pasaba:** la lista de naves grandes de Colonización › Comprar no tenía la Anaconda Mk II, la Imperial Clipper, la Orca ni la Caspian Explorer, así que con ellas el filtro «Plataforma L» salía apagado y podía mostrar estaciones donde no cabes.
- **Arreglo:** la lista incluye todas las naves de clase 3 de los datos de naves.

### 25 · Órbita y Exobiología sin anillos de Spansh

- **Encontrado:** prueba de todas las secciones con diarios de prueba (27-11-2026), en Pegasi Sector JN-S b4-7 C 5 yendo en SRV.
- **Encontrado en:** 0.7.0-beta.4 · **Corregido en:** 0.7.0-beta.5
- **Qué pasaba:** si la ficha del cuerpo que llega de Spansh no tenía la lista de anillos, la tarjeta del cuerpo daba un error y la página no se pintaba.
- **Arreglo:** sin anillos en la ficha, la tarjeta sigue sin ellos.

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

### 11 · Tu nave: faltan las ranuras vacías y hay nombres internos

- **Informado por:** Adder (25-11-2026), con captura de su Type-11 Prospector.
- **Encontrado en:** 0.7.0-beta.3 · **Corregido en:** 0.7.0-beta.4
- **Qué pasaba:** solo salían las ranuras con módulo, y las ranuras mineras, el control de drones, el hangar y algunas recetas salían con el nombre interno del juego.
- **Causa:** el evento `Loadout` solo trae las ranuras ocupadas. Ahora la app genera todas las ranuras de cada nave (con los nombres del juego) y marca las vacías; las ranuras especiales tienen nombre en español («Anclaje minero mediano 1», «Control de drones», «Hangar», «Militar 1») y las recetas sin traducción se muestran legibles («Extended»).

### 12 · Módulos con el nombre de su versión Merc

- **Encontrado por:** revisión (25-11-2026), al preparar la lista de deseos.
- **Encontrado en:** 0.7.0-beta.3 · **Corregido en:** 0.7.0-beta.4
- **Qué pasaba:** en Tu nave, la bodega normal de clase 6 salía como «Extended Cargo Rack», el escáner de superficie como «Long Range Detailed Surface Scanner», etc.
- **Causa:** en la lista de EDCD FDevIDs, los módulos Merc (preingenierizados) comparten símbolo con el módulo normal, y al montar `shipdata.json` la fila Merc pisó a la normal en 22 módulos (con precio 0 en algunos). Se ha restaurado el nombre, la categoría y el precio normal de esos 22.

### 13 · Esquema de atraque erróneo en las Dodec

- **Informado por:** Adder (25-11-2026).
- **Encontrado en:** 0.7.0-beta.3 · **Corregido en:** pendiente.
- **Qué pasa:** en las estaciones Dodec, el gráfico que muestra dónde está la plataforma asignada a veces la sitúa mal.
- **Por hacer:** revisar la distribución de plataformas de las Dodec con capturas del juego (número de plataforma, tamaño y posición) y corregir el esquema. Anotado para el futuro.

### 14 · Paneles descuadrados en la versión instalada

- **Informado por:** Adder (25-11-2026), comparando su pantalla de Colonización con la de Specter A.G.
- **Encontrado en:** 0.7.0-beta.1 (afecta a todas las betas publicadas) · **Corregido en:** 0.7.0-beta.4
- **Qué pasaba:** a Specter, con la app instalada, las pestañas de Colonización (Comprar, A bordo, Entregas, Planificar) no cabían y «Planificar» salía cortado. A Adder, que la arranca desde el repositorio, se veía bien.
- **Causa:** no era la resolución: la app dibuja siempre una pantalla de 1920×1080 y la escala entera a la ventana. El problema eran los tipos de letra (Rajdhani, Exo 2 y Share Tech Mono): el instalador los copiaba a `node_modules`, pero electron-builder borra de ahí lo que no está en las dependencias, así que la versión instalada usaba las letras de Windows, más anchas, y los textos se salían de sus botones. Ahora el instalador los lleva dentro de `renderer/fontsource` (comprobado: 106 archivos de letra en el paquete y cargados al arrancar), y la preparación del instalador falla si los enlaces a las letras cambian.

### 15 · Casco de tu nave desactualizado en combate

- **Informado por:** Adder (25-11-2026), con captura del panel de la nave (casco al 53 %) y la app marcando 100 %.
- **Encontrado en:** 0.7.0-beta.3 · **Corregido en:** 0.7.0-beta.4 (en lo que se puede)
- **Qué pasaba:** la app mostraba el casco como si fuera el actual.
- **Causa:** el juego no informa del casco de tu nave mientras vuelas: ni `Status.json` lo trae ni el diario escribió ningún `HullDamage` en ese combate (solo `UnderAttack` y `ShieldState`). El dato sale de `Loadout` (al cargar la partida, atracar o equipar). Además, la app tomaba como tuyo el `HullDamage` de tu caza si lo pilotabas tú (`Fighter: true`). Por decisión de Adder, en Combate se han quitado el escudo y el casco de tu nave (el juego ya los enseña al momento); en Equipo el casco sale como «último dato». El casco del caza ya no se mezcla, y las reparaciones del casco (`Repair` / `RepairAll`) lo ponen al 100 %.

### 16 · No encuentra la conexión de Skull Mining en EDMC

- **Informado por:** Adder (25-11-2026), con captura.
- **Encontrado en:** 0.7.0-beta.3 · **Corregido en:** 0.7.0-beta.4
- **Qué pasaba:** al pulsar «Usar la conexión de Skull Mining (EDMC)» salía «No encuentro la URL o la clave en los ajustes de Skull Mining en EDMC», aunque el plugin estaba configurado.
- **Causa:** la app buscaba los ajustes en el registro de Windows, donde los guardaba EDMC 5. EDMC 6 los pasó a `%LOCALAPPDATA%\EDMarketConnector\config.toml` (sección `[settings]`, claves `skullmining_url` y `skullmining_token`). Ahora se lee primero ese archivo y, si no existe, el registro.

### 17 · Ficha del cuerpo vacía

- **Informado por:** Adder (25-11-2026), con captura de Specter A.G. en Col 285 Sector TV-I b11-3 AB 1.
- **Encontrado en:** 0.7.0-beta.3 · **Corregido en:** 0.7.0-beta.4
- **Qué pasaba:** la tarjeta Cuerpo mostraba el nombre pero «—» en gravedad, temperatura y radio.
- **Causas:**
  - Ese cuerpo está en Spansh pero sin datos (nadie lo ha escaneado: ni gravedad, ni temperatura, ni radio, ni BodyID), y en el diario de Specter no había escaneo suyo. Eso no se puede rellenar desde fuera: ahora la tarjeta muestra un aviso destacado («Este cuerpo no está escaneado en Spansh») que pide escanearlo con el FSS o con sondas.
  - La ficha solo se buscaba tras el evento `ApproachBody`; si la app se abría ya en el planeta (o se llegaba de otra forma), no se buscaba. Ahora también vale el cuerpo de `Location`, `SupercruiseExit`, `Touchdown` y `Liftoff`, y el de `Status.json` si el diario tiene su BodyID.
  - El radio sale ahora también de `Status.json` (`PlanetRadius`), que el juego da siempre cerca de un planeta.


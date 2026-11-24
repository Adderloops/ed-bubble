# ED BUBBLE · Bugfixes

Errores encontrados en las versiones publicadas y versión en la que se corrigen.

- **Versión actual publicada:** 0.7.0-beta.1 (23-11-2026)
- **Próxima versión con correcciones:** 0.7.0-beta.2

Estados: **Abierto** (anotado, sin corregir) · **Corregido** (hecho en el repo, pendiente de publicar) · **Publicado** (incluido en una versión publicada).

| # | Error | Informado por | Encontrado en | Corregido en | Estado |
|---|-------|---------------|---------------|--------------|--------|
| 1 | Estación › Ingenieros mezcla los de naves y los de a pie, y parece que no están todos en grado 5 | Specter A.G. | 0.7.0-beta.1 | 0.7.0-beta.2 | Corregido |
| 2 | Vuelo › Aproximación a planeta: el botón «Pegar» no pega las coordenadas | Specter A.G. | 0.7.0-beta.1 | 0.7.0-beta.2 | Corregido |
| 3 | Vuelo › Aproximación a planeta: la gravedad sale «—» en la nave | Specter A.G. | 0.7.0-beta.1 | 0.7.0-beta.2 | Corregido |
| 4 | Vuelo › Aproximación a planeta: el destino fijado se queda en «Cuerpo sin indicar» | Adder (captura de Specter A.G.) | 0.7.0-beta.1 | 0.7.0-beta.2 | Corregido |
| 5 | Colonización › Dónde comprar no encuentra ninguna estación (juego en otro idioma) | Specter A.G. | 0.7.0-beta.1 | 0.7.0-beta.2 | Corregido |
| 6 | Nombre de las construcciones: el prefijo «Orbital Construction Site:» solo se quitaba en inglés | Revisión de idiomas | 0.7.0-beta.1 | 0.7.0-beta.2 | Corregido |

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

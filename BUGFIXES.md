# ED BUBBLE · Bugfixes

Errores encontrados en las versiones publicadas y versión en la que se corrigen.

- **Versión actual publicada:** 0.7.0-beta.1 (23-11-2026)
- **Próxima versión con correcciones:** 0.7.0-beta.2

Estados: **Abierto** (anotado, sin corregir) · **Corregido** (hecho en el repo, pendiente de publicar) · **Publicado** (incluido en una versión publicada).

| # | Error | Informado por | Encontrado en | Corregido en | Estado |
|---|-------|---------------|---------------|--------------|--------|
| 1 | Estación › Ingenieros mezcla los de naves y los de a pie, y parece que no están todos en grado 5 | Specter A.G. | 0.7.0-beta.1 | 0.7.0-beta.2 | Corregido |
| 2 | Vuelo › Aproximación a planeta: el botón «Pegar» no pega las coordenadas | Specter A.G. | 0.7.0-beta.1 | 0.7.0-beta.2 | Corregido |

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

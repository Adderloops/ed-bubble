# ED BUBBLE · app de Windows

Ventana para la segunda pantalla con datos en vivo de Elite Dangerous.

**Entrega 1:** Puente de mando y Vuelo con datos del Journal, `Status.json`, `Cargo.json` y `NavRoute.json`.

**Entrega 2:** los interruptores y acciones de Vuelo se pulsan con el ratón. ED BUBBLE lee tu preset de controles activo (`%LOCALAPPDATA%\Frontier Developments\Elite Dangerous\Options\Bindings`), trae el juego al frente y pulsa la tecla de teclado que tengas asignada. Las acciones sin tecla de teclado (solo HOTAS) salen desactivadas. Si cambias los controles en el juego, la app los recarga sola. "Expulsar carga" pide una segunda pulsación en 3 segundos.

El panel **Controles** del Puente de mando revisa las teclas que usa ED BUBBLE (Vuelo y, para la entrega 3, Trazar ruta) y señala las que faltan, las que solo están en el mando y las que comparten tecla.

Variables para desarrollo: `ED_BUBBLE_SIMULATE=1` (no envía teclas), `ED_BINDINGS_FOLDER` (otra carpeta de controles).

**Vuelo y Navegación:** Vuelo es pilotar (estado, interruptores, acciones, combustible, próximo salto, atraque o aproximación a planeta). Navegación es planificar (ficha del sistema actual con Copiar / Inara / Spansh / EDSM, objetivo de salto y ruta completa).

**Entrega 3 (Navegación):** buscador de sistemas con Spansh (sugerencias al escribir, con la distancia desde donde estás) y ficha del sistema: estrella y combustible, población, seguridad, gobierno, economía, Powerplay, y pestañas de estaciones (icono, plataforma L/M/S, distancia y servicios), facciones (influencia y estado) y cuerpos.

**Trazar ruta:** abre el mapa galáctico, pega el nombre (Ctrl+V), selecciona el resultado, mantiene Seleccionar para trazar y comprueba en `NavRoute.json` que la ruta va a ese sistema; después cierra el mapa. Se detiene si el juego pierde el foco y se puede cancelar. Necesita teclas de teclado para: Mapa galáctico, Cámara: acercar, Cámara: alejar, Interfaz: arriba / derecha / seleccionar (el panel Controles del Puente lo comprueba). Los tiempos de espera están en `core/plot.js` (`T`) por si hay que ajustarlos.

**Colonización:** todas las obras en las que has atracado (pestañas), con progreso, toneladas que faltan, materiales completos y viajes con la bodega de tu nave; tabla de materiales ordenada por lo que más falta (pedido, entregado, faltan, progreso, a bordo, viajes); lo que llevas a bordo y si la obra lo necesita; y las entregas de la sesión. Al atracar en una obra, el salto automático lleva aquí.

**Dónde comprar (Colonización):** al pulsar un material, la pestaña "Dónde comprar" lista las estaciones más cercanas que lo venden según Spansh (datos de mercado de EDDN), con stock (cian si llena tu bodega), precio y antigüedad de los datos (amarillo si tienen más de un mes). Filtros: plataforma L (activado si tu nave la necesita), superficie y carriers. Al elegir una estación, "Trazar ruta" lleva hasta su sistema y la guarda como **destino final**: en Vuelo aparece bajo el Próximo salto y, al llegar al sistema, una tarjeta "Has llegado · ve a la estación" con distancia en ls, plataforma y qué comprar. Se borra al atracar en ella o con la ✕.

Iconos de estación (`renderer/icons/`): aportados por el autor (Adder).

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

# ED BUBBLE · app de Windows

Ventana para la segunda pantalla con datos en vivo de Elite Dangerous.

**Entrega 1:** Puente de mando y Vuelo con datos del Journal, `Status.json`, `Cargo.json` y `NavRoute.json`.

**Entrega 2:** los interruptores y acciones de Vuelo se pulsan con el ratón. ED BUBBLE lee tu preset de controles activo (`%LOCALAPPDATA%\Frontier Developments\Elite Dangerous\Options\Bindings`), trae el juego al frente y pulsa la tecla de teclado que tengas asignada. Las acciones sin tecla de teclado (solo HOTAS) salen desactivadas. Si cambias los controles en el juego, la app los recarga sola. "Expulsar carga" pide una segunda pulsación en 3 segundos.

Variables para desarrollo: `ED_BUBBLE_SIMULATE=1` (no envía teclas), `ED_BINDINGS_FOLDER` (otra carpeta de controles).

El buscador de Spansh y Trazar ruta llegan en la entrega 3.

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

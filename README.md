<div align="center">
  <img src="public/img/APTrack-flow-banner.png" alt="APTrack Flow" width="100%">
</div>

# APTrack Flow

**Tracking Param Audit**

![version](https://img.shields.io/badge/version-0.1.0-blue) ![license](https://img.shields.io/badge/license-AGPL--3.0-green) ![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

Herramienta local y gratuita para auditar si los parámetros de tracking de campañas (`gclid`, `utm_*`, `fbclid`, etc.) sobreviven la navegación y los redirects dentro de un sitio web. Todo corre en tu computadora — sin dependencias npm, sin servicios externos.

---

## ¿Qué hace?

Le pasás la URL de un sitio y el nombre del parámetro a testear, y APTrack-Flow:

- Rastrea el sitio siguiendo links internos (`<a href>`) a partir de la URL inicial, y sigue también `<meta http-equiv="refresh">` cuando el sitio redirige así
- A cada URL encontrada le agrega el parámetro de prueba y sigue los redirects hasta la página final
- Detecta si el parámetro **sobrevivió** o se **perdió**, si hubo un redirect real, y si la página borra el parámetro con JavaScript después de cargar (`history.replaceState`/`pushState`)
- Muestra el progreso en vivo (log de rastreo y testeo, streaming)
- Al finalizar, arma un resumen (retención %, redirects, errores) con tabla filtrable y numerada
- Exporta los resultados a **CSV** con un clic
- Interfaz bilingüe (**español / inglés**) y con **tema claro y oscuro**

---

## Antes de empezar: instalar Node.js

APTrack-Flow necesita **Node.js v18 o superior**. Si ya lo tenés instalado, podés saltar este paso.

### Mac

1. Abrí el navegador y entrá a **https://nodejs.org**
2. Hacé clic en el botón verde **"LTS"** (versión recomendada)
3. Se descarga un archivo `.pkg` — hacé doble clic y seguí el instalador
4. Para verificar, abrí la app **Terminal** (`⌘ + Espacio`, escribí "Terminal") y ejecutá:
   ```bash
   node --version
   ```
   Tiene que aparecer algo como `v20.0.0` o superior.

### Windows

1. Abrí el navegador y entrá a **https://nodejs.org**
2. Hacé clic en el botón verde **"LTS"** (versión recomendada)
3. Se descarga un archivo `.msi` — hacé doble clic y seguí el instalador (dejá todas las opciones por defecto)
4. Para verificar, abrí el **Símbolo del sistema** (buscá "cmd" en el menú Inicio) y ejecutá:
   ```
   node --version
   ```
   Tiene que aparecer algo como `v20.0.0` o superior.

### Linux (Ubuntu / Debian)

Abrí una terminal y ejecutá:

```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Para otras distros (Fedora, Arch, etc.), seguí las instrucciones en **https://nodejs.org/en/download/package-manager**

---

## Descargar APTrack-Flow

### Opción A — ZIP (más fácil, sin instalar nada extra)

1. Entrá a la página del proyecto en GitHub
2. Hacé clic en el botón verde **"Code"**
3. Seleccioná **"Download ZIP"**
4. Descomprimí el archivo en la carpeta que prefieras (ej: `Documentos/aptrack-flow`)

### Opción B — git clone

```bash
git clone https://github.com/mdmarein/aptrack-flow.git
cd aptrack-flow
```

---

## Cómo correr la aplicación

Hay dos formas de iniciar APTrack-Flow: desde la terminal o como una app con ícono en el escritorio.

---

### Opción 1 — Desde la terminal

#### Mac / Linux

Abrí una terminal en la carpeta del proyecto y escribí:

```bash
node server.js
```

#### Windows

Abrí el Símbolo del sistema en la carpeta del proyecto y escribí:

```
node server.js
```

---

### Opción 2 — Instalar como app con ícono (recomendado)

Podés crear un acceso directo con ícono en tu escritorio para abrir APTrack-Flow con doble clic, sin necesidad de usar la terminal.

#### Mac — Crear "APTrack-Flow.app"

1. Abrí una terminal en la carpeta del proyecto
2. Ejecutá:
   ```bash
   bash tools/make-mac-app.sh
   ```
3. Se crea **"APTrack-Flow.app"** en tu escritorio
4. **Primera vez:** clic derecho sobre el ícono → **Abrir** (macOS pide confirmación una sola vez)
5. **Las siguientes veces:** doble clic normal

> El app inicia el servidor automáticamente y abre el navegador en `http://localhost:3300`. Si el servidor ya está corriendo, lo reinicia para asegurarse de cargar siempre la versión actual del código.

#### Windows — Crear acceso directo

1. Abrí la carpeta del proyecto en el Explorador de archivos
2. Entrá a la carpeta `tools`
3. Hacé doble clic en **`make-win-shortcut.bat`**
4. Se crea **"APTrack-Flow"** en tu escritorio
5. Doble clic en el ícono para iniciar la app

> Si aparece un error de permisos, clic derecho → **Ejecutar como administrador**.

---

### Abrir la aplicación en el navegador

Si usás la opción terminal, con el servidor corriendo abrí tu navegador y entrá a:

```
http://localhost:3300
```

Si usás el ícono instalado, el navegador se abre automáticamente.

Para cerrar el servidor desde la terminal: presioná `Ctrl + C`.

**Cambiar puerto (opcional):**
```bash
PORT=8080 node server.js          # Mac / Linux
set PORT=8080 && node server.js   # Windows
```

---

## Guía de uso

1. **URL inicial** — ingresá la URL del sitio que querés auditar (ej: `https://misitiodecampana.com`)
2. **Parámetro** — el nombre del parámetro a testear (ej: `gclid`) y el valor de prueba (ej: `test123`)
3. **Opciones** — ajustá el máximo de URLs a rastrear (default 30, máximo 200), el delay entre requests y el timeout por request
4. **Iniciar auditoría** — el log en vivo muestra cada URL mientras se rastrea y testea
5. **Resultados** — al terminar aparece un resumen con:
   - Porcentaje de retención del parámetro
   - Cantidad de redirects detectados
   - URLs donde el parámetro se perdió
   - URLs con borrado por JavaScript (`history.replaceState`/`pushState`)
   - Errores de red
6. **Tabla** — filtrá por estado (sobrevivió / perdido / error / redirect) con los botones de la tabla
7. **Exportar** — descargá todos los resultados como CSV con el botón de descarga

---

## Idioma y tema

- **Idioma**: botón `EN`/`ES` en el header. Cambiar de idioma recarga la página.
- **Tema**: botón de sol/luna en el header, oscuro por defecto. No recarga la página.

Ambas preferencias se guardan en `localStorage` y persisten entre sesiones.

---

## Exportaciones

| Archivo | Contenido |
|---------|-----------|
| **CSV de resultados** | Una fila por URL auditada: estado (sobrevivió / perdido / error), URL final, tipo de redirect, notas de detección JS |

---

## Limitaciones conocidas

- No ejecuta JavaScript — si un sitio redirige del lado del cliente (`location.replace()`) o borra parámetros de la URL con JS después de cargar, APTrack-Flow solo puede detectarlo por heurística (patrones de código conocidos), no confirmarlo con certeza — necesitaría un navegador headless para eso.
- Sí sigue `<meta http-equiv="refresh">`, que es un mecanismo HTML declarativo (no requiere ejecutar JS).
- Algunos WAFs bloquean clientes HTTP no identificados como navegador; el User-Agent por defecto se declara honestamente como bot de auditoría (evita el patrón de bloqueo más común: "dice ser un browser pero no se comporta como uno"). Como red de contención adicional, si la respuesta da un status típico de bloqueo (403/406/429/451/503), reintenta automáticamente con el `curl` del sistema.

---

## Estructura del proyecto

```
aptrack-flow/
├── server.js                  Servidor HTTP puro (sin Express) — 1 endpoint de auditoría
├── start.sh / start.bat       Scripts de inicio por terminal
├── lib/
│   └── link-auditor.js        Motor: rastreo de links + test de parámetro + streaming NDJSON
├── public/
│   ├── index.html
│   ├── css/styles.css         Design tokens compartidos con DataB Flow
│   ├── img/                   Favicons + logos
│   └── js/
│       ├── main.js            UI: formulario, progreso en vivo, resultados, export CSV
│       └── modules/i18n.js    Internacionalización ES/EN
└── tools/
    ├── make-mac-app.sh        Crea "APTrack-Flow.app" (Mac)
    ├── make-win-shortcut.bat  Crea acceso directo (Windows)
    ├── launch-windows.vbs     Lanzador silencioso (Windows)
    └── icons/                 AppIcon.icns / APTrack-flow.ico
```

---

## Arquitectura

### ¿Qué es?

Una herramienta de auditoría de supervivencia de parámetros de tracking. Corre localmente en el navegador (`localhost:3300`), con backend Node.js y frontend en JavaScript vanilla. Sin dependencias npm. 100% offline salvo el acceso al sitio auditado.

### Tech Stack

| Capa | Tecnología |
|------|-----------|
| **Backend** | Node.js puro (sin Express), CommonJS, 0 dependencias externas, 1 endpoint REST |
| **Frontend** | JavaScript ES6 modules + Vanilla JS, CSS3 con variables para temas claro/oscuro |
| **HTTP** | `fetch` nativo de Node 18+, `AbortController` para timeout manual |
| **Streaming** | NDJSON sobre `POST` — una línea JSON por evento de progreso |
| **Crawling** | Regex sobre `<a href>` + detección de `<meta http-equiv="refresh">` — sin parser DOM |
| **Export** | Generación de CSV en el cliente con descarga vía Blob URL |
| **Storage** | `localStorage` para preferencias de UI (idioma, tema) — sin base de datos |

### Flujo de datos

```
URL + parámetro → POST /api/audit
    → Rastrear links internos (hasta maxUrls)
    → Por cada URL: agregar parámetro + seguir redirects → detectar supervivencia
    → Streaming NDJSON → Frontend renderiza progreso en vivo
    → Resumen final → Tabla filtrable + Export CSV
```

### Decisiones de arquitectura clave

- **Crawling server-side** — el fetch a sitios de terceros corre en `server.js` para evitar bloqueos CORS de landing pages de campañas
- **NDJSON sobre SSE** — se usa `POST` con streaming en lugar de `EventSource` (que solo soporta GET) para poder enviar la config de la auditoría en el body
- **Regex sobre DOMParser** — extrae links con regex sobre el HTML crudo, sin árbol DOM, para mantener cero dependencias
- **Fallback a curl** — si un WAF bloquea con 403/406/429/451/503, reintenta automáticamente con `curl` del sistema
- **Zero deps** — sin `npm install`, fácil de deployar en cualquier entorno con Node.js 18+

---

## Licencia

GNU Affero General Public License v3.0 — ver [LICENSE.md](LICENSE.md).

---

*APTrack-Flow · Tracking Param Audit · © 2026 mdmarein · GNU AGPLv3*

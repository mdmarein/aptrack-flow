# APTrack-Flow

**Tracking Param Audit**

![version](https://img.shields.io/badge/version-0.1.0-blue) ![node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

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

```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

---

## Descargar APTrack-Flow

### Opción A — ZIP

1. Entrá a la página del proyecto en GitHub
2. Hacé clic en el botón verde **"Code"**
3. Seleccioná **"Download ZIP"**
4. Descomprimí el archivo en la carpeta que prefieras

### Opción B — git clone

```bash
git clone https://github.com/mdmarein/aptrack-flow.git
cd aptrack-flow
```

---

## Cómo correr la aplicación

Hay dos formas de iniciar APTrack-Flow: desde la terminal o como una app con ícono en el escritorio.

### Opción 1 — Desde la terminal

```bash
node server.js
```

o, con los scripts de conveniencia:

```bash
bash start.sh      # Mac/Linux
start.bat          # Windows
```

Se abre automáticamente el navegador en `http://localhost:3300`.

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

> El app inicia el servidor automáticamente y abre el navegador en `http://localhost:3300`. Si el servidor ya está corriendo, lo reinicia (para asegurarse de cargar siempre la versión actual del código) y abre el navegador.

#### Windows — Crear acceso directo

1. Abrí la carpeta del proyecto en el Explorador de archivos
2. Entrá a la carpeta `tools`
3. Hacé doble clic en **`make-win-shortcut.bat`**
4. Se crea **"APTrack-Flow"** en tu escritorio
5. Doble clic en el ícono para iniciar la app

> Si aparece un error de permisos, clic derecho → **Ejecutar como administrador**.

---

## Estructura del proyecto

```
aptrack-flow/
├── server.js                  Servidor HTTP puro (sin Express) — ruteo casero
├── start.sh / start.bat       Scripts de inicio por terminal
├── lib/
│   └── link-auditor.js        Motor: rastreo de links + test de parámetro
├── public/
│   ├── index.html
│   ├── css/styles.css         Design tokens compartidos con DataB Flow
│   ├── img/                   Favicons
│   └── js/
│       ├── main.js            UI: formulario, progreso en vivo, resultados, export CSV
│       └── modules/i18n.js    Internacionalización ES/EN
└── tools/
    ├── make-mac-app.sh        Crea "APTrack-Flow.app" (Mac)
    ├── make-win-shortcut.bat  Crea acceso directo (Windows)
    ├── launch-windows.vbs     Lanzador silencioso (Windows)
    └── icons/                 AppIcon.icns / aptrack-flow.ico
```

## Limitaciones conocidas

- No ejecuta JavaScript — si un sitio redirige del lado del cliente (`location.replace()`) o borra parámetros de la URL con JS después de cargar, APTrack-Flow solo puede detectarlo por heurística (patrones de código conocidos), no confirmarlo con certeza — necesitaría un navegador headless para eso.
- Sí sigue `<meta http-equiv="refresh">`, que es un mecanismo HTML declarativo (no requiere ejecutar JS).
- Algunos WAFs bloquean clientes HTTP no identificados como navegador; el User-Agent por defecto se declara honestamente como bot de auditoría (evita el patrón de bloqueo más común: "dice ser un browser pero no se comporta como uno"). Como red de contención adicional, si la respuesta nativa da un status típico de bloqueo (403/406/429/451/503), reintenta automáticamente con el `curl` del sistema.

## Licencia

Uso interno / MultiplAi.

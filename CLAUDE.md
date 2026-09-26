APTrack-Flow# CLAUDE.md — TagTrace (nombre provisorio)

> Reemplazar "TagTrace" en este archivo si se decide otro nombre antes de arrancar.

## Qué es esta app

Herramienta local que audita si los parámetros de tracking de campañas
(gclid, utm_*, fbclid, etc.) sobreviven la navegación y los redirects
dentro de un sitio web. Rastrea el sitio, encuentra URLs internas, y
a cada una le agrega el parámetro de prueba para verificar si llega
intacto hasta la página final.

## Relación con DataB Flow — qué se reusa y qué NO

Este proyecto **reusa la arquitectura técnica y la identidad visual**
de DataB Flow (`[[datab-flow]]`), pero la funcionalidad es 100%
independiente. Nada de la lógica CRM/ERP de DataB Flow aplica acá.

**Se reusa:**
- Arquitectura zero-npm-dependencies
- Patrón backend (Node puro) + frontend (browser tab real)
- Estilo visual / design tokens (paleta, tipografía, espaciados, estilo de componentes)
- Convención de empaquetado (`tools/make-*-app.sh` estilo DataB Flow, si aplica)

**NO se reusa:**
- Ningún modelo de datos ni lógica de negocio CRM/ERP
- Ningún módulo específico de limpieza de datos de DataB Flow

Si en algún momento hace falta mirar cómo DataB Flow resuelve algo
puntual (ej. un componente de tabla, un patrón de estado de carga),
señalar el archivo exacto del repo de DataB Flow antes de copiarlo —
no asumir ni traer código "por las dudas".

## Arquitectura técnica

- **Backend**: `server.js`, Node HTTP puro (sin Express, sin frameworks). Sin DOM disponible acá — nada de `document`/`DOMParser` en este lado.
- **Frontend**: `public/js/`, corre en un tab de browser real (el server abre el navegador default del sistema). DOM completo disponible acá.
- **Cero dependencias npm**. Todo lo que se necesite (parseo HTML, requests HTTP, etc.) se resuelve con lo nativo de Node 18+ (`fetch` global, `AbortController`) o con código propio.
- **Empaquetado**: mismo enfoque que DataB Flow (`tools/make-mac-app.sh` o equivalente) — arranca el server local y abre el navegador, no embebe Chromium.

### Por qué el crawling corre en el backend y no en el frontend

El fetch a sitios de terceros (el sitio que el usuario quiere auditar)
**tiene que hacerse desde `server.js`**, no desde el browser. Un tab
no puede hacer `fetch` a un dominio arbitrario ajeno por CORS, salvo
que ese sitio exponga headers permisivos — la mayoría de landing
pages de campañas no los tiene. El frontend solo dispara el pedido
al backend local (`/api/audit` o similar) y muestra resultados.

## Estructura de carpetas propuesta

```
/
├── server.js                  # entry point, HTTP server + rutas
├── lib/
│   └── link-auditor.js        # motor: crawler + test de parámetro (ya armado)
├── public/
│   ├── index.html
│   ├── css/
│   │   └── (design tokens extraídos de DataB Flow)
│   └── js/
│       └── modules/
│           └── (UI: formulario de auditoría, tabla de resultados, progreso en vivo)
├── tools/
│   └── make-*-app.sh          # empaquetado, mismo patrón que DataB Flow
└── CLAUDE.md
```

## Funcionalidad core (ya prototipada)

El motor de auditoría ya está armado en una versión standalone
(`link-auditor.js`, adjunto en la conversación) — llevarlo a `lib/`
tal cual o adaptado. Resumen de sus decisiones técnicas:

- **Extracción de links**: regex sobre `<a href="...">`, no un parser DOM completo — no hace falta el árbol DOM entero, solo los atributos `href`. Mantiene cero dependencias.
- **Requests + redirects**: `fetch` global de Node (18+), que sigue redirects solo y expone `response.url` con la URL final — sin `axios` ni libs de HTTP.
- **Timeout manual**: vía `AbortController`, porque `fetch` nativo no trae timeout propio.
- **Throttle entre requests**: delay configurable entre cada fetch, para scraping ético (no golpear el server del sitio auditado sin pausas).
- **Filtros**: excluye redes sociales, extensiones de archivo pesado, y todo lo que no sea mismo dominio.
- **`onProgress` callback**: pensado para colgar un SSE o WebSocket casero y mostrar progreso en vivo en el frontend, en vez de esperar en silencio a que termine toda la auditoría.

## Convenciones de código

- (Completar con las convenciones específicas de DataB Flow: naming, estilo de módulos, manejo de errores, etc. — revisar el repo de DataB Flow y documentarlas acá antes de escribir código nuevo.)

## Pendiente antes de arrancar a codear

- [ ] Confirmar nombre definitivo de la app
- [ ] Extraer design tokens reales de DataB Flow (colores, tipografía, espaciados) — no inventar valores, sacarlos del CSS existente
- [ ] Revisar cómo rutea `server.js` en DataB Flow (router casero vs. `if (req.url === ...)`) para mantener el mismo estilo acá
- [ ] Decidir el mecanismo de progreso en vivo (SSE vs. polling vs. WebSocket casero)
- [ ] Definir estrategia de comercialización (¿freemium como DataB Flow, o herramienta interna de MultiplAi?)

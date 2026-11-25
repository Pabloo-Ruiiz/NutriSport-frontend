# NutriSport AI · Guía del frontend (Angular) paso a paso con GitHub

**Proyecto:** NutriSport AI · **Autor:** Pablo Ruiz Gandia · **Stack:** Angular 22 · TypeScript estricto · SCSS · signals · Angular CDK · ECharts · Lucide
**Terminal:** Git Bash · **IDE:** Visual Studio Code · **API:** Spring Boot (`/api/v1`, repositorio `NutriSport-backend`) · **Repositorio:** `NutriSport-frontend` (el proyecto Angular va en su **raíz**) · **Tests:** Vitest

> **Versión 1.0** · alineada con `NutriSport_API.md` v1.0 (OpenAPI del backend: 119 operaciones, 128 esquemas), `DESIGN.md` v1.2 y `PROJECT_PROPOSAL.md` v1.2. Los pasos 1–25 son el **MVP** y su cierre; los pasos 26–36, la **Ampliación** (productos de Open Food Facts y escáner, recetas, planificador, lista de la compra, estadísticas, insights, asistente y exportación), en el mismo orden que en el backend.

Esta guía es la hermana de `Guia_Github_Backend_NutriSport.md` y sigue su mismo método: los prompts van en **orden real de ejecución** y el trabajo está partido en **36 pasos pequeños**. Cada paso es una unidad que subes a GitHub por separado, con:

- una **issue** (título y descripción),
- una **rama**,
- un **commit**,
- una **pull request** (título y descripción, con `Closes #N` para cerrar su issue),
- los **prompts** para Copilot (modo *Agent*), en orden, y la **comprobación**.

Todo lo que hace peticiones está construido sobre la API **real** del backend ya terminado. La referencia es **`docs/NutriSport_API.md`** (tipos, endpoints, errores, flujos y validaciones), generada a partir del OpenAPI del backend (**`docs/NutriSport-API.json`**). Si los dos no coinciden, **manda el JSON**, salvo las discrepancias comprobadas que lista el §11 de la referencia. Para no gastar tokens, los prompts **no** cargan esos documentos enteros: citan sin `#file:` el fichero del módulo que toca en **`docs/api/`** (de 4 a 13 KB cada uno, frente a los ~120 KB de la referencia completa; índice en `docs/api/README.md`) y la sección de `DESIGN.md` que hace falta. El JSON solo se consulta para comprobar un nombre concreto.

Diferencias con el frontend de MotorLab, que vienen del backend de NutriSport:

- **Sesión con dos tokens:** el *access token* (15 min) vive **solo en memoria** y el *refresh token* va en una cookie `HttpOnly`. Al arrancar, la aplicación intenta `POST /auth/refresh`; ante un 401, el interceptor refresca **una sola vez** y repite la petición (paso 7).
- **Errores Problem Details (RFC 9457):** `{ type, title, status, detail, instance, codigo, errors[] }`, no `{ error: {…} }`.
- **Identificadores UUID** (texto) y **enumerados en MAYÚSCULAS** (`PERDER_GRASA`, `MEDIA_MANANA`). La paginación es la de Spring (`page` desde **0**, `content`, `totalElements`, `totalPages`).
- **Cuerpos estrictos:** el backend rechaza con 400 cualquier propiedad que no exista en el DTO. Los formularios envían exactamente los campos del `…Request`.
- **Requisitos de la cuenta:** email verificado (funciones de IA y exportación), consentimiento de datos de salud vigente y perfil creado (`PERFIL_REQUERIDO`). El frontend los previene con *guards* y avisos.
- **IA asíncrona:** la foto se sube con `multipart/form-data` y el resultado se consulta por *polling*. Con el backend sin clave de IA, todo funciona en **modo simulado**.
- **Sistema de diseño propio** (`DESIGN.md`): *tokens* CSS `--ns-*`, Manrope + Inter autoalojadas, iconos Lucide, Angular CDK para diálogos y *overlays*, ECharts para los gráficos. Sin Angular Material ni frameworks de utilidades.
- **Las APIs externas solo las llama el backend:** el frontend nunca habla con Open Food Facts, TheMealDB ni USDA, pero sí **muestra su atribución**.

## Qué necesitas tener a mano

| Fichero | De dónde sale | Dónde va |
|---|---|---|
| `NutriSport_API.md` | ya está en este repositorio | `docs/` |
| `NutriSport-API.json` | OpenAPI descargado del backend (ya está) | `docs/` |
| `api/` (la referencia partida por módulos: `auth.md`, `comidas.md`…, y `README.md`) | ya está en este repositorio | `docs/api/` |
| `DESIGN.md` | `NutriSport-backend/docs/` | `docs/` |
| `PROJECT_PROPOSAL.md` | `NutriSport-backend/docs/` | `docs/` |
| `design/assets/` (logotipos SVG) y `design/mockups/` (HTML + `png/`) | `NutriSport-backend/docs/design/` | `docs/design/` |
| `crear_issues_frontend_nutrisport.sh` (opcional, Annex C) | ya está en este repositorio | `docs/` |
| esta guía | ya está en este repositorio | `docs/` |

Las maquetas `docs/design/mockups/png/01-dashboard.png` … `13-planificador-recetas.png` son las pantallas con 🖼 de `DESIGN.md` §7. En los prompts que las citan, **adjunta la imagen** al chat de Copilot.

## Regla de oro: una issue = una rama = un commit = una PR

Los pasos dependen unos de otros: **fusiona cada PR antes de empezar el paso siguiente**.

### Flujo de cada paso

```bash
# 1) Parte siempre de main actualizada
git checkout main
git pull

# 2) Crea la rama del paso (el nombre está en la guía)
git checkout -b feature/NN-nombre-del-paso

# 3) Ejecuta los prompts en orden, compila y haz la comprobación

# 4) Commit y push (el mensaje está en la guía)
git add .
git commit -m "mensaje del commit"
git push -u origin feature/NN-nombre-del-paso

# 5) En GitHub: Compare & pull request → pega el título y la descripción de la guía
#    Revisa los cambios, haz «Squash and merge» y borra la rama

# 6) Vuelve a main y limpia
git checkout main
git pull
git branch -d feature/NN-nombre-del-paso
```

## Cómo funcionan los números de las issues y de las PR

El frontend tiene un repositorio propio, así que sus issues y PR tienen **numeración propia** (empieza en #1). GitHub **comparte la numeración** entre issues y pull requests. Por eso:

1. **Crea todas las issues antes** de empezar (así la issue del paso *N* es la **#N**). Si el repositorio no tiene issues ni PR y las creas en orden, el `Closes #N` de cada PR cierra la issue correcta.
2. Si tu repositorio ya tiene issues o PR, los números se desplazan: mira el número real (el script del Annex C los guarda en `issues_frontend.txt`) y cambia el `Closes #N` de la PR.
3. `Closes #N` solo cierra la issue cuando la PR se **fusiona en `main`**.

Tienes dos formas de crear las issues: copiar el título y la descripción de cada paso en GitHub (*Issues → New issue*) o ejecutar el **Annex C** (un script con GitHub CLI que las crea todas en orden).

## Paso 0 · Requisitos (una sola vez, sin issue)

- Repositorio `NutriSport-frontend` creado en GitHub y **clonado**, con un commit inicial en `main` (ya lo tienes: `README.md` y `LICENSE`).
- **Node.js 22 LTS o superior**, npm, Git y VS Code (con la extensión *Angular Language Service*).
- El **backend** `NutriSport-backend` funcionando en local con el perfil `local` (Docker Desktop en marcha). Cada paso dice qué necesita de él; como el backend ya está terminado, todos los endpoints existen desde el primer día.
- Opcional: GitHub CLI (`winget install --id GitHub.cli`) y `gh auth login`, para el Annex C.

```bash
node -v
npm -v
git --version
```

Para arrancar el backend (desde la carpeta `NutriSport-backend`, en otra terminal):

```bash
docker compose up -d
set -a; source .env; set +a
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

Comprueba que responde: <http://localhost:8080/swagger-ui/index.html>. Los correos de verificación y recuperación llegan a Mailpit: <http://localhost:8025>.

## Cómo usar los prompts

1. Abre VS Code en la raíz del repositorio del frontend y el chat de Copilot en modo **Agent** (selector junto al campo de texto; en modo *Ask* solo muestra código). Cuando termine, revisa los ficheros cambiados (`Ctrl+Shift+G`) y pulsa **Keep**.
2. El **Prompt 0** se guarda en el paso 1 en `.github/copilot-instructions.md` y Copilot lo aplica solo a todas las conversaciones. No lo pegues además (se cargaría dos veces); pégalo solo si ves que no lo tiene en cuenta.
3. Ejecuta los prompts **en orden y de uno en uno**. Se numeran por paso: el *Prompt 15.2* es el segundo prompt del paso 15.
4. Cuando un prompt cite una maqueta (`docs/design/mockups/png/…`), adjunta la imagen al chat.
5. **Revisa el código** antes de aceptarlo: tiene que cumplir las reglas del Prompt 0. Entenderlo es parte de la defensa.
6. **Ahorra tokens:** no añadas `#file:` a los documentos grandes (`NutriSport_API.md`, `NutriSport-API.json`, `DESIGN.md`, `PROJECT_PROPOSAL.md`). Los prompts ya citan el fichero de `docs/api/` y la sección que hacen falta; el asistente los abre solo si los necesita. Las maquetas PNG sí se adjuntan. Empieza una conversación nueva en cada paso.
7. Después de cada prompt, compila: `npm run build`. Si falla, usa el **Prompt de corrección**. Al final de cada paso, `npm test`.

### Prompt 0 · Contexto del frontend (empieza cada conversación con él)

```text
Estoy desarrollando el frontend de NutriSport AI: una SPA en Angular para que deportistas planifiquen, registren y analicen su alimentación (perfil y objetivos, registro de comidas manual y por foto con IA, entrenamientos, dashboard diario y peso y, en la Ampliación, productos de Open Food Facts, recetas, planificador de menús, lista de la compra, estadísticas y un asistente con IA). También tiene una zona de administración (usuarios y catálogo).

El frontend tiene su propio repositorio, separado del backend Spring Boot; el proyecto Angular está en la raíz del repositorio. Consume la API REST descrita en docs/NutriSport_API.md (convenciones, sesión, errores, tipos, endpoints, flujos y validaciones), generada a partir del OpenAPI del backend docs/NutriSport-API.json. Si los dos no coinciden, manda el JSON, salvo las discrepancias del §11 de NutriSport_API.md. La identidad visual y las pantallas están en docs/DESIGN.md. Son documentos grandes: no los cargues enteros; busca y lee solo la sección que necesites (por su número, p. ej. §6 Comidas, o con una búsqueda de texto). El JSON solo se consulta para comprobar un nombre o un tipo concreto. Para cada módulo hay un fichero pequeño en docs/api/ (auth, perfil, alimentos, comidas, analisis, actividad, seguimiento, recetas, menus, compra, asistente, admin, más general, sesion-errores, tipos-comunes y rutas-etiquetas; índice en docs/api/README.md): lee ese fichero en lugar del documento completo.

Stack: Angular 22 con componentes standalone, TypeScript en modo estricto, SCSS, signals (signal, computed, effect, input, output, model), el control flow nuevo (@if, @for, @switch), formularios reactivos tipados, HttpClient con interceptores funcionales, rutas con carga perezosa (loadComponent y loadChildren), Angular CDK (dialog, overlay, a11y, drag-drop), @lucide/angular para los iconos (provideLucideIcons y <svg lucideIcon="…">) y ngx-echarts para los gráficos. Sin NgModules, sin Angular Material y sin librerías de estado: el estado compartido va en servicios con signals. Los tests usan Vitest (el runner que trae el proyecto).

Estructura de src/app: core (models, services, interceptors, guards, layout, util), shared (ui, pipes, design) y features/<dominio> (auth, onboarding, dashboard, perfil, configuracion, alimentos, comidas, analisis, actividad, admin y, en la Ampliación, productos, recetas, planificador, compra, estadisticas, asistente). Estilos globales en src/styles (tokens, abstracts, base, utilities, vendors). Alias: @core/*, @shared/*, @features/*, @env/*.

Reglas que debes cumplir SIEMPRE:
1. Código, nombres, comentarios y textos de la interfaz en castellano, con el tono de DESIGN.md §11 (tú, frases cortas, verbos de acción en los botones). Clases con sufijo (...Component, ...Service, ...Guard, ...Pipe, ...Directive) y ficheros *.component.ts, *.service.ts, etc. Los componentes reutilizables de shared/ui llevan el prefijo Ns (NsButtonComponent) y el selector ns-* (o un atributo nsButton).
2. Componentes standalone con ChangeDetectionStrategy.OnPush, inject() en lugar del constructor, input()/output() en lugar de decoradores y plantilla (.html) y estilos (.scss) en ficheros separados.
3. Las interfaces de core/models reflejan EXACTAMENTE el JSON (NutriSport_API.md §5): camelCase, ids UUID como string, enumerados en MAYÚSCULAS, fechas como string ISO ("AAAA-MM-DD"). No se renombran ni se transforman. Las peticiones envían SOLO los campos del ...Request (el backend rechaza propiedades desconocidas) y siempre los booleanos obligatorios del §11.
4. Ningún componente usa HttpClient: todas las peticiones van en servicios de core/services, con la URL base environment.apiUrl ("/api/v1"). Las fechas se envían en hora local (utilidad de core/util/fechas.ts), nunca con toISOString().
5. Sesión: el access token SOLO en memoria (signals de AuthService), nunca en localStorage ni sessionStorage; el refresh token es una cookie HttpOnly que gestiona el navegador. El interceptor añade el token y, ante un 401, refresca una sola vez y repite la petición.
6. Errores: Problem Details con codigo y errors[] (NutriSport_API.md §3). Se convierten en ApiError (core/util/api-error.ts); los errores de campo se asignan al control del formulario con el mismo nombre y el resto se muestra con ns-alert o un toast. Nunca se muestra un error técnico al usuario.
7. Diseño: solo los tokens --ns-* y los componentes de shared/ui; nunca colores HEX sueltos en los componentes. Responsive desde 360 px (DESIGN.md §6.3), barra inferior en móvil y sidebar en escritorio. Accesibilidad WCAG 2.2 AA: etiqueta en todos los campos, foco visible, contraste, objetivos táctiles de 44 px, nada por debajo de 12 px, aria-live para los resultados asíncronos.
8. Formato es-ES: decimales con coma, miles con punto, fechas "sáb. 21 nov", unidades con espacio ("112 g"). En pantalla los carbohidratos se llaman "Hidratos".
9. Los valores nutricionales los calcula SIEMPRE el backend: el frontend no recalcula kcal ni macros, salvo vistas previas marcadas como estimación. Los resultados de IA se presentan como estimaciones orientativas (ns-disclaimer) y los datos de Open Food Facts, TheMealDB y USDA llevan su atribución.
10. Antes de generar nada, lee SOLO el fichero de docs/api/ y la sección de docs/DESIGN.md que cite el prompt (no los documentos enteros) y el código existente que vayas a usar. Si algo no está claro, pregúntame en lugar de inventarlo. No inventes endpoints, campos ni versiones de dependencias.
11. Nunca subas contraseñas, tokens ni ficheros .env al repositorio.

Cuando termines, dime qué archivos has creado o modificado.
```

### Prompt de corrección (cuando algo no compila o falla)

```text
Al ejecutar `npm run build` (o `npm test`, o en la consola del navegador) me sale este error:

<pega aquí el error completo>

Explícame la causa en dos líneas y corrige solo los archivos afectados, respetando las reglas del proyecto.
```

## Arquitectura del frontend

```text
NutriSport-frontend/
├── docs/                         ← NutriSport_API.md, api/ (la API por módulos), NutriSport-API.json, DESIGN.md, PROJECT_PROPOSAL.md, design/, esta guía
├── proxy.conf.json               ← /api → http://localhost:8080 (desarrollo)
├── nginx/default.conf            ← producción: sirve la SPA y hace de proxy de /api (paso 24)
├── Dockerfile
└── src/
    ├── environments/             ← environment.ts y environment.development.ts (apiUrl = "/api/v1")
    ├── styles/                   ← tokens/, abstracts/, base/, utilities/, vendors/, styles.scss
    └── app/
        ├── app.config.ts · app.routes.ts · app.component.*
        ├── core/
        │   ├── models/           ← interfaces del JSON por módulo + etiquetas.ts
        │   ├── services/         ← un servicio por recurso de la API + estado con signals
        │   ├── interceptors/     ← auth.interceptor.ts (token y refresh) · error.interceptor.ts
        │   ├── guards/           ← autenticado, invitado, admin, perfil
        │   ├── layout/           ← shell, sidebar, topbar, bottom-nav, auth-layout, admin-layout
        │   └── util/             ← api-error.ts, fechas.ts, formularios.ts, imagen.ts, descarga.ts
        ├── shared/
        │   ├── ui/               ← ns-button, ns-form-field, ns-card, ns-ring, ns-dialog… (DESIGN.md §9.5)
        │   ├── pipes/            ← kcal, gramos, fecha, etiqueta
        │   └── design/           ← tokens.ts, echarts-theme.ts
        └── features/             ← auth, onboarding, dashboard, perfil, configuracion, alimentos, comidas,
                                     analisis, actividad, admin (MVP) · productos, recetas, planificador,
                                     compra, estadisticas, asistente (Ampliación)
```

Mapa completo de rutas, pantallas y endpoints: `docs/NutriSport_API.md` §9.

## Resumen de los 36 pasos

| Paso | Issue | Rama | Commit |
|---|---|---|---|
| 1 | [Frontend] Crear el proyecto Angular en la raíz del repositorio y subir la documentación a docs/ | `feature/01-proyecto-angular` | `chore(frontend): crea el proyecto Angular con SCSS y añade la documentación` |
| 2 | [Frontend] Configuración base: proxy a la API, entornos, HttpClient, estructura de carpetas, alias y locale es-ES | `feature/02-configuracion-base` | `chore(frontend): proxy, entornos, estructura de carpetas, alias y locale es-ES` |
| 3 | [Frontend] Sistema de diseño: tokens CSS, fuentes autoalojadas, iconos Lucide, estilos base y utilidades | `feature/03-sistema-diseno` | `feat(ui): tokens del sistema de diseño, tipografía, iconos y estilos base` |
| 4 | [Frontend] Modelos TypeScript de la API, etiquetas de los enumerados y pipes de formato es-ES | `feature/04-modelos-api` | `feat(core): modelos de la API, etiquetas y pipes de formato` |
| 5 | [Frontend] Componentes base (I): botón, campos de formulario, selectores, tarjetas, badges, alertas y estados vacíos | `feature/05-componentes-base` | `feat(ui): componentes base de acciones, formularios, tarjetas, badges y alertas` |
| 6 | [Frontend] Componentes base (II): diálogos, toasts, confirmación, anillo, barras, métricas, cantidad, tira de fechas, pestañas, stepper y drawer | `feature/06-componentes-feedback` | `feat(ui): diálogos, toasts, componentes de datos y de navegación` |
| 7 | [Frontend] AuthService con el token en memoria, restauración de la sesión, ApiError e interceptores de autenticación, refresh y errores | `feature/07-sesion-interceptores` | `feat(auth): sesión en memoria con refresh automático, ApiError e interceptores` |
| 8 | [Frontend] Guards de sesión, rol y perfil, layouts (público, aplicación con sidebar y barra inferior, administración) y rutas con carga diferida | `feature/08-layout-rutas` | `feat(core): guards, layouts responsive y rutas con carga diferida` |
| 9 | [Frontend] Pantallas de login y registro (consentimiento de datos de salud, medidor de contraseña, límite de intentos y "Revisa tu email") | `feature/09-login-registro` | `feat(auth): pantallas de login y registro con consentimiento` |
| 10 | [Frontend] Verificar el email desde el enlace del correo, recuperar y restablecer la contraseña y aviso de email sin verificar | `feature/10-verificacion-recuperacion` | `feat(auth): verificación de email, recuperación de contraseña y aviso de verificación` |
| 11 | [Frontend] Configuración inicial del perfil en 4 pasos (datos, deporte, objetivo y alimentación) y resumen de objetivos calculados | `feature/11-onboarding-perfil` | `feat(perfil): asistente de configuración inicial y resumen de objetivos` |
| 12 | [Frontend] Pantalla Mi perfil con pestañas (datos físicos, deporte, objetivo y macros, alimentación), objetivos manuales y registro de pesajes | `feature/12-mi-perfil` | `feat(perfil): pantalla Mi perfil con objetivos y registro de peso` |
| 13 | [Frontend] Configuración de la cuenta: datos y preferencias, contraseña, email, cerrar sesiones, consentimiento de datos de salud y eliminación de la cuenta | `feature/13-configuracion-cuenta` | `feat(cuenta): configuración de cuenta, seguridad, consentimiento y eliminación` |
| 14 | [Frontend] Servicio del catálogo, combobox de búsqueda de alimentos, recientes y frecuentes, ficha de alimento y gestión de mis alimentos | `feature/14-catalogo-alimentos` | `feat(alimentos): buscador del catálogo, ficha de alimento y mis alimentos` |
| 15 | [Frontend] Registro manual de comidas: buscador, comida en construcción con cantidades y unidades caseras, totales, avisos de restricciones y edición | `feature/15-registro-comidas` | `feat(comidas): registro manual de comidas con unidades caseras y avisos` |
| 16 | [Frontend] Historial de comidas agrupado por días con totales frente al objetivo, filtros, detalle, duplicar y eliminar con deshacer | `feature/16-historial-comidas` | `feat(comidas): historial por días con detalle, duplicado y eliminación` |
| 17 | [Frontend] Actividad: entrenamientos realizados y planificados con gasto estimado, KPIs y carga de la semana, filtros y formulario de alta y edición | `feature/17-actividad` | `feat(actividad): entrenamientos con KPIs semanales y formulario` |
| 18 | [Frontend] Dashboard: energía y macros del día frente al objetivo, comidas de hoy, entrenamiento, gráfico semanal de kcal y peso con media móvil (ECharts) | `feature/18-dashboard` | `feat(dashboard): resumen diario con anillos, comidas, entrenamiento y gráficos` |
| 19 | [Frontend] Registro por foto: captura o subida, compresión a JPEG en el cliente, subida multipart, polling del análisis y estados de error | `feature/19-foto-subida` | `feat(analisis): captura y subida de fotos con polling del análisis` |
| 20 | [Frontend] Resultado del análisis: foto con marcadores, candidatos con confianza, corrección de gramos y alimento, añadir y quitar, confirmar como comida o descartar | `feature/20-foto-revision` | `feat(analisis): revisión, corrección y confirmación del análisis de la foto` |
| 21 | [Frontend] Administración de usuarios: búsqueda y filtros, detalle, bloqueo y desbloqueo y cambio de roles | `feature/21-admin-usuarios` | `feat(admin): gestión de usuarios con búsqueda, bloqueo y roles` |
| 22 | [Frontend] Administración del catálogo: alimentos con filtros, alta y edición en drawer, revisión de alérgenos, importación CSV y categorías | `feature/22-admin-catalogo` | `feat(admin): catálogo de alimentos, revisión de alérgenos, importación CSV y categorías` |
| 23 | [Frontend] Revisión de accesibilidad (WCAG 2.2 AA), responsive desde 360 px, estados de carga, vacío y error y rendimiento del dashboard | `feature/23-accesibilidad-responsive` | `fix(ui): accesibilidad, responsive y estados de carga, vacío y error` |
| 24 | [Frontend] Imagen Docker multi-etapa con nginx: SPA, proxy de /api al backend, cabeceras de seguridad y caché | `feature/24-docker-nginx` | `chore(infra): imagen Docker del frontend con nginx y proxy de la API` |
| 25 | [Frontend] Pruebas manuales del flujo completo del MVP, pruebas de los flujos críticos y README del frontend | `feature/25-cierre-mvp` | `docs(frontend): pruebas manuales del MVP y README del proyecto` |
| 26 | [Frontend] A1 · Buscador de productos comerciales (Open Food Facts), ficha del producto y registro por código de barras | `feature/26-productos-off` | `feat(productos): buscador de productos de Open Food Facts y ficha con atribución` |
| 27 | [Frontend] Escáner de código de barras con la cámara (BarcodeDetector o ZXing), introducción manual y añadir el producto a una comida | `feature/27-escaner-codigo` | `feat(productos): escáner de código de barras con cámara e introducción manual` |
| 28 | [Frontend] A2 · Catálogo de recetas propias y de TheMealDB con filtros, categorías, favoritas y atribución | `feature/28-catalogo-recetas` | `feat(recetas): catálogo de recetas con filtros, TheMealDB y favoritas` |
| 29 | [Frontend] A3 · Detalle de receta con raciones, ingredientes y conversión, nutrición calculada con su desglose, alérgenos, relacionadas y registrar como comida | `feature/29-detalle-receta` | `feat(recetas): detalle de receta con nutrición calculada y registro como comida` |
| 30 | [Frontend] A4 · Planificador: mis menús, generar menú diario o semanal, vista semanal con objetivos por día, vista por día en móvil y gestión del menú | `feature/30-planificador-vista` | `feat(menus): planificador con generación de menús y vista semanal` |
| 31 | [Frontend] A4 · Edición del menú: añadir receta a una franja, sustituir con alternativas, mover con arrastrar y soltar, bloquear, quitar, regenerar, registrar como consumida y sugerencia IA | `feature/31-planificador-edicion` | `feat(menus): edición del menú con alternativas, arrastrar y soltar y sugerencia IA` |
| 32 | [Frontend] A5 · Lista de la compra: generar desde un menú, secciones del supermercado, marcar comprado, productos libres, ingredientes de una receta y progreso | `feature/32-lista-compra` | `feat(compra): lista de la compra por secciones con progreso y productos libres` |
| 33 | [Frontend] Administración de recetas públicas (alta, edición, publicación) y cola de emparejamientos de ingredientes con el catálogo | `feature/33-admin-recetas` | `feat(admin): recetas públicas, publicación y emparejamiento de ingredientes` |
| 34 | [Frontend] Estadísticas: energía frente al objetivo, macros, reparto, adherencia, peso, comparativa con el periodo anterior, entreno frente a descanso, alimentos más consumidos e insights | `feature/34-estadisticas-insights` | `feat(estadisticas): estadísticas, comparativas, relación con la actividad e insights` |
| 35 | [Frontend] Asistente IA: conversaciones, mensajes con herramientas consultadas, sugerencias, valoración, renombrar, archivar y eliminar | `feature/35-asistente-ia` | `feat(asistente): chat con el asistente nutricional y gestión de conversaciones` |
| 36 | [Frontend] Exportación de los datos de la cuenta (RGPD), revisión final de la Ampliación, pruebas manuales y README | `feature/36-exportacion-cierre` | `feat(cuenta): exportación de datos y cierre de la Ampliación` |

**Hitos** (fases de `docs/PROJECT_PROPOSAL.md` §11):

| Pasos | Bloque | Fase de la propuesta |
|---|---|---|
| 1–8 | Fundamentos: proyecto, configuración, sistema de diseño, modelos, componentes, sesión, layout y rutas | Fase 0 |
| 9–13 | Autenticación, verificación, onboarding, perfil y configuración de la cuenta | Fases 1–2 |
| 14–18 | Catálogo, registro manual, historial, actividad y dashboard | Fases 3, 4, 6 y 7 |
| 19–20 | Registro por foto con IA (subida, *polling*, revisión y confirmación) | Fase 5 (**MVP completo**) |
| 21–22 | Administración de usuarios y del catálogo | Fase 8 |
| 23–25 | Accesibilidad y responsive, Docker con nginx y cierre del MVP | Fase 9 · cierre del MVP |
| 26–27 | A1 · Productos de Open Food Facts y escáner de código de barras | Ampliación A1 (y escáner de A5) |
| 28–29 | A2 y A3 · Catálogo y detalle de recetas con cálculo nutricional | Ampliación A2–A3 |
| 30–31 | A4 · Planificador de menús | Ampliación A4 |
| 32 | A5 · Lista de la compra | Ampliación A5 |
| 33 | Administración de recetas y emparejamientos de ingredientes | Ampliación A2–A3 (admin) |
| 34–36 | Estadísticas e insights, asistente IA y exportación de datos | Resto de la Ampliación |

Quedan fuera las funcionalidades de **Visión** (PWA, *streaming* del asistente, modo oscuro, OCR de etiquetas, incidencias, multi-idioma, panel de métricas del administrador…).

---

## Paso 1 · Crear el proyecto Angular y subir la documentación

### GitHub: issue y rama

| Campo | Valor |
|---|---|
| **Título de la issue** | `[Frontend] Crear el proyecto Angular en la raíz del repositorio y subir la documentación a docs/` |
| **Rama** | `feature/01-proyecto-angular` |

**Descripción de la issue** (cópiala en el campo *Description*):

```markdown
## Objetivo
Tener el proyecto Angular creado en la raíz del repositorio `NutriSport-frontend`, con las instrucciones para Copilot (Prompt 0) y toda la documentación que usarán los pasos: la referencia de la API, el OpenAPI, el manual de diseño con sus maquetas y esta guía.

## Tareas
- [ ] Generar el proyecto Angular (SCSS, sin SSR) en la raíz del repositorio, conservando `README.md` y `LICENSE`
- [ ] Instalar Prettier y añadir `.prettierrc` y `.editorconfig` comunes
- [ ] Crear `.github/copilot-instructions.md` con el Prompt 0 de esta guía
- [ ] Copiar `DESIGN.md`, `PROJECT_PROPOSAL.md` y `design/` desde `NutriSport-backend/docs/` a `docs/`
- [ ] Comprobar que la aplicación arranca y compila

## Criterios de aceptación
- [ ] `npm start` muestra la aplicación en `http://localhost:4200`
- [ ] `npm run build` termina sin errores
- [ ] Hay un único `.git` (en la raíz) y `node_modules/`, `dist/` y `.angular/` no aparecen en `git status`
- [ ] `docs/` contiene `NutriSport_API.md`, `NutriSport-API.json`, `DESIGN.md`, `PROJECT_PROPOSAL.md`, `design/mockups/png/` y esta guía

## Archivos
- raíz: `package.json`, `angular.json`, `tsconfig*.json`, `.prettierrc`, `.editorconfig`, `src/`
- `.github/copilot-instructions.md`
- `docs/`: `DESIGN.md`, `PROJECT_PROPOSAL.md`, `design/` (assets y mockups)

## Requiere del backend
Nada (todavía no hace peticiones).

## Depende de
Ninguna (es la primera issue).

## Guía
Paso 1 de `docs/Guia_Github_Frontend_NutriSport.md`.
```

```bash
git checkout main
git pull
git checkout -b feature/01-proyecto-angular
```

### Qué se crea

- raíz: `package.json`, `angular.json`, `tsconfig*.json`, `.prettierrc`, `.editorconfig`, `src/`
- `.github/copilot-instructions.md`
- `docs/`: `DESIGN.md`, `PROJECT_PROPOSAL.md`, `design/` (assets y mockups)

### Ejecución (en orden)

#### Genera el proyecto Angular en la raíz del repositorio

El repositorio ya existe y está clonado (tiene `README.md`, `LICENSE` y esta carpeta `docs/`). `ng new` crea una carpeta nueva, así que lo generamos en una carpeta temporal y subimos su contenido un nivel. El nombre del proyecto será `nutrisport` (sale en `angular.json` y en la ruta `dist/nutrisport/browser` que usa el paso 24):

```bash
npm i -g @angular/cli@latest
ng version
ng new nutrisport --style=scss --ssr=false --skip-git
cp -rn nutrisport/. .
rm -rf nutrisport
npm install
```

- **`--skip-git`**: el Git es el del repositorio clonado; sin esto Angular crearía un segundo `.git`.
- Si el CLI hace preguntas opcionales (*zoneless*, herramientas de IA, analítica), deja los valores por defecto y responde **que no** a la analítica.
- `cp -n` no sobrescribe el `README.md` ni el `.gitignore` que ya tuvieras: comprueba que `.gitignore` contiene `node_modules/`, `/dist/` y `/.angular/` y añade las líneas que falten.
- Comprueba en `package.json` qué runner de tests ha instalado el CLI (en Angular 22 es **Vitest**); la guía lo da por hecho.

#### Prettier y `.editorconfig`

```bash
npm i -D prettier
```

`.prettierrc` (a mano, en la raíz):

```json
{
  "printWidth": 120,
  "singleQuote": true,
  "overrides": [{ "files": "*.html", "options": { "parser": "angular" } }]
}
```

Añade a `package.json` el script `"format": "prettier --write \"src/**/*.{ts,html,scss}\""`. Deja el `.editorconfig` que genera Angular (2 espacios, UTF-8).

#### Instrucciones para el asistente

Crea `.github/copilot-instructions.md` con **el texto completo del Prompt 0** (apartado «Prompt 0» de esta guía). Copilot lo añade a todas las conversaciones del repositorio. Aun así, empieza cada conversación nueva pegando el Prompt 0 si ves que no lo tiene en cuenta.

#### Documentación

Copia desde el repositorio del backend (ajusta la ruta si tus carpetas están en otro sitio):

```bash
cp ../NutriSport-backend/docs/DESIGN.md docs/
cp ../NutriSport-backend/docs/PROJECT_PROPOSAL.md docs/
cp -r ../NutriSport-backend/docs/design docs/
```

La carpeta debe quedar así:

```text
docs/
├── NutriSport_API.md                     ← referencia completa de la API para el frontend
├── api/                                  ← la misma referencia partida por módulos (la que leen los prompts)
├── NutriSport-API.json                   ← OpenAPI del backend
├── DESIGN.md                             ← identidad visual, componentes y pantallas
├── PROJECT_PROPOSAL.md                   ← producto, requisitos e historias de usuario
├── Guia_Github_Frontend_NutriSport.md    ← esta guía
├── crear_issues_frontend_nutrisport.sh   ← Annex C
└── design/
    ├── assets/                           ← logo.svg y logo-mark.svg
    └── mockups/                          ← HTML + png/ (01-dashboard.png … 13-planificador-recetas.png)
```

> Si todavía no has creado las issues, hazlo **ahora**, antes de este primer commit (Annex C o a mano). Así la issue del paso *N* será la **#N**.

### Comprobación

```bash
npm start            # abre http://localhost:4200 y para con Ctrl+C
npm run build
ls -d .git           # un único .git, el de la raíz
git status           # sin node_modules/, dist/ ni .angular/
```

### Commit, push y pull request

```bash
git add .
git commit -m "chore(frontend): crea el proyecto Angular con SCSS y añade la documentación"
git push -u origin feature/01-proyecto-angular
```

| Campo | Valor |
|---|---|
| **Título de la PR** | `Proyecto Angular base y documentación` |
| **Rama base** | `main` |

**Descripción de la PR** (pégala al crearla; la última línea cierra la issue):

```markdown
## Qué incluye
- [x] Generar el proyecto Angular (SCSS, sin SSR) en la raíz del repositorio, conservando `README.md` y `LICENSE`
- [x] Instalar Prettier y añadir `.prettierrc` y `.editorconfig` comunes
- [x] Crear `.github/copilot-instructions.md` con el Prompt 0 de esta guía
- [x] Copiar `DESIGN.md`, `PROJECT_PROPOSAL.md` y `design/` desde `NutriSport-backend/docs/` a `docs/`
- [x] Comprobar que la aplicación arranca y compila

## Cómo probarlo
- `npm start` muestra la aplicación en `http://localhost:4200`
- `npm run build` termina sin errores
- Hay un único `.git` (en la raíz) y `node_modules/`, `dist/` y `.angular/` no aparecen en `git status`
- `docs/` contiene `NutriSport_API.md`, `NutriSport-API.json`, `DESIGN.md`, `PROJECT_PROPOSAL.md`, `design/mockups/png/` y esta guía

## Checklist
- [ ] `npm run build` termina sin errores
- [ ] El Prompt 0 está completo en `.github/copilot-instructions.md`
- [ ] No se sube ninguna contraseña, token ni `.env`

Closes #1
```

Después de fusionar: `git checkout main && git pull && git branch -d feature/01-proyecto-angular`

---

## Paso 2 · Proxy, entornos, HttpClient, estructura de carpetas y español

### GitHub: issue y rama

| Campo | Valor |
|---|---|
| **Título de la issue** | `[Frontend] Configuración base: proxy a la API, entornos, HttpClient, estructura de carpetas, alias y locale es-ES` |
| **Rama** | `feature/02-configuracion-base` |

**Descripción de la issue** (cópiala en el campo *Description*):

```markdown
## Objetivo
Dejar el proyecto preparado para hablar con la API real a través del proxy de desarrollo (un único origen para el navegador), con la estructura de carpetas de la guía, los alias de importación y el idioma español para fechas y números.

## Tareas
- [ ] Crear `proxy.conf.json` (`/api` → `http://localhost:8080`) y registrarlo en `angular.json`
- [ ] Crear los entornos con `apiUrl = '/api/v1'`
- [ ] Configurar `provideHttpClient(withInterceptors([]))`, el router con `withComponentInputBinding()` y el locale `es-ES`
- [ ] Crear la estructura de carpetas de `src/app` y `src/styles` y los alias `@core`, `@shared`, `@features` y `@env`
- [ ] Crear `core/util/fechas.ts` con sus pruebas

## Criterios de aceptación
- [ ] `curl -i http://localhost:4200/api/v1/cuenta` (con `npm start`) devuelve 401 con `"codigo":"NO_AUTENTICADO"`
- [ ] Una fecha formateada con el `DatePipe` sale en español (`sáb. 21 nov`)
- [ ] `hoyLocal()` y `aFechaApi()` devuelven `AAAA-MM-DD` en hora local y sus pruebas pasan

## Archivos
- raíz: `proxy.conf.json`, `angular.json` (proxy), `tsconfig.json` (alias)
- `src/environments`: `environment.ts`, `environment.development.ts`
- `src/app`: `app.config.ts`
- `core/util`: `fechas.ts` (+ `fechas.spec.ts`)
- carpetas `core/*`, `shared/*`, `features/*`, `src/styles/*` con `.gitkeep`

## Requiere del backend
Arrancado con el perfil `local` para la comprobación con `curl`.

## Depende de
#1

## Guía
Paso 2 de `docs/Guia_Github_Frontend_NutriSport.md`.
```

```bash
git checkout main
git pull
git checkout -b feature/02-configuracion-base
```

### Qué se crea

- raíz: `proxy.conf.json`, `angular.json` (proxy), `tsconfig.json` (alias)
- `src/environments`: `environment.ts`, `environment.development.ts`
- `src/app`: `app.config.ts`
- `core/util`: `fechas.ts` (+ `fechas.spec.ts`)
- carpetas `core/*`, `shared/*`, `features/*`, `src/styles/*` con `.gitkeep`

### Ejecución (en orden)

#### Prompt 2.1 · Proxy, entornos y proveedores

```text
En la raíz del proyecto (donde está angular.json) configura lo siguiente, sin cambiar nada más:
1. Crea proxy.conf.json que redirija "/api" a "http://localhost:8080" (secure: false, changeOrigin: true, logLevel: "warn") y regístralo en angular.json (architect.serve.options.proxyConfig), para que `npm start` ya lo use. Explica en un comentario del PR por qué así el navegador solo ve el origen http://localhost:4200 (cookie del refresh y cabecera Origin, NutriSport_API.md §2.1).
2. Crea los entornos (ng generate environments) con environment.ts (production: true) y environment.development.ts (production: false), ambos con apiUrl: '/api/v1'.
3. En src/app/app.config.ts: provideHttpClient(withInterceptors([])) (los interceptores llegan en el paso 7), provideRouter(routes, withComponentInputBinding(), withInMemoryScrolling({ scrollPositionRestoration: 'top' })), { provide: LOCALE_ID, useValue: 'es-ES' } y registerLocaleData(localeEs, 'es-ES'). Mantén lo que el CLI haya puesto (detección de cambios).
4. Añade a package.json el script "build:prod": "ng build --configuration production".
Explícame qué has cambiado en cada archivo.
```

#### Prompt 2.2 · Estructura de carpetas, alias y fechas

```text
1. Crea la estructura de carpetas de la sección «Arquitectura del frontend» de la guía, con un .gitkeep en cada carpeta vacía:
   src/app/core/{models,services,interceptors,guards,layout,util}, src/app/shared/{ui,pipes,design},
   src/app/features/{auth,onboarding,dashboard,perfil,configuracion,alimentos,comidas,analisis,actividad,admin},
   src/styles/{tokens,abstracts,base,utilities,vendors}.
2. En tsconfig.json (compilerOptions.paths) añade los alias @core/*, @shared/*, @features/* y @env/* que apunten a src/app/core/*, src/app/shared/*, src/app/features/* y src/environments/*. Comprueba que "strict": true y "strictTemplates": true siguen activos.
3. Crea src/app/core/util/fechas.ts con funciones puras, sin librerías:
   - aFechaApi(d: Date): string → "AAAA-MM-DD" con los componentes LOCALES (getFullYear, getMonth, getDate), nunca toISOString().
   - hoyLocal(): string, sumarDias(fecha: string, dias: number): string, lunesDeLaSemana(fecha: string): string, diasEntre(desde: string, hasta: string): number y rangoDias(desde, hasta): string[].
   - desdeFechaApi(f: string): Date (mediodía local, para evitar saltos de horario de verano).
   - aHoraApi(d: Date): string → "HH:mm".
4. Crea fechas.spec.ts con pruebas de esas funciones, incluido un cambio de mes, un año bisiesto y el cambio de hora de finales de octubre.
```

#### Instrucciones para la defensa

Lee `docs/NutriSport_API.md` §1 y §2. Debes saber explicar por qué con el proxy no hace falta CORS y por qué las fechas no se envían con `toISOString()` (en España, la medianoche local es el día anterior en UTC).

### Comprobación

Con el backend arrancado y `npm start` en otra terminal:

```bash
curl -i http://localhost:4200/api/v1/cuenta
npm run build
npm test
```

La primera petición debe responder `401` con `Content-Type: application/problem+json` y `"codigo":"NO_AUTENTICADO"`: el proxy funciona y el formato de error es el de la referencia (§3).

### Commit, push y pull request

```bash
git add .
git commit -m "chore(frontend): proxy, entornos, estructura de carpetas, alias y locale es-ES"
git push -u origin feature/02-configuracion-base
```

| Campo | Valor |
|---|---|
| **Título de la PR** | `Configuración base del frontend` |
| **Rama base** | `main` |

**Descripción de la PR** (pégala al crearla; la última línea cierra la issue):

```markdown
## Qué incluye
- [x] Crear `proxy.conf.json` (`/api` → `http://localhost:8080`) y registrarlo en `angular.json`
- [x] Crear los entornos con `apiUrl = '/api/v1'`
- [x] Configurar `provideHttpClient(withInterceptors([]))`, el router con `withComponentInputBinding()` y el locale `es-ES`
- [x] Crear la estructura de carpetas de `src/app` y `src/styles` y los alias `@core`, `@shared`, `@features` y `@env`
- [x] Crear `core/util/fechas.ts` con sus pruebas

## Cómo probarlo
- `curl -i http://localhost:4200/api/v1/cuenta` (con `npm start`) devuelve 401 con `"codigo":"NO_AUTENTICADO"`
- Una fecha formateada con el `DatePipe` sale en español (`sáb. 21 nov`)
- `hoyLocal()` y `aFechaApi()` devuelven `AAAA-MM-DD` en hora local y sus pruebas pasan

## Checklist
- [ ] `npm run build` termina sin errores
- [ ] `npm test` pasa
- [ ] No se sube ninguna contraseña, token ni `.env`

Closes #2
```

Después de fusionar: `git checkout main && git pull && git branch -d feature/02-configuracion-base`

---

## Paso 3 · Sistema de diseño: tokens, tipografía, iconos y estilos base

### GitHub: issue y rama

| Campo | Valor |
|---|---|
| **Título de la issue** | `[Frontend] Sistema de diseño: tokens CSS, fuentes autoalojadas, iconos Lucide, estilos base y utilidades` |
| **Rama** | `feature/03-sistema-diseno` |

**Descripción de la issue** (cópiala en el campo *Description*):

```markdown
## Objetivo
Trasladar a SCSS la identidad visual de `DESIGN.md` (§2, §3, §6 y §9): *tokens* primitivos y semánticos, Manrope e Inter autoalojadas, escala tipográfica, *breakpoints*, utilidades mínimas y los mismos valores en TypeScript para los gráficos.

## Tareas
- [ ] Instalar `@fontsource-variable/manrope`, `@fontsource-variable/inter`, `@lucide/angular` y `@angular/cdk`
- [ ] Crear `src/styles` con `tokens/`, `abstracts/`, `base/`, `utilities/` y `vendors/` según `DESIGN.md` §9.1–9.4
- [ ] Crear `shared/design/tokens.ts` con los valores que necesitan ECharts y la lógica
- [ ] Crear el `LayoutService` con signals (`esMovil`, `esTablet`) a partir de `BreakpointObserver`
- [ ] Crear una página de muestra solo de desarrollo (`/dev/estilos`) con la paleta y la escala tipográfica

## Criterios de aceptación
- [ ] La página `/dev/estilos` muestra los colores primarios, de IA, de macros y de estado y toda la escala tipográfica con Manrope e Inter
- [ ] En la pestaña *Network* las fuentes se sirven desde `localhost` (no desde Google Fonts)
- [ ] Ningún fichero de `src/app` contiene colores HEX (`grep -rE "#[0-9a-fA-F]{3,6}\b" src/app --include=*.scss` no devuelve nada)

## Archivos
- `src/styles/tokens`: `_primitives.scss`, `_semantic.scss`
- `src/styles/abstracts`: `_breakpoints.scss`, `_mixins.scss`
- `src/styles/base`: `_reset.scss`, `_fonts.scss`, `_typography.scss`
- `src/styles/utilities`: `_layout.scss`, `_text.scss`
- `src/styles/vendors`: `_cdk-overlay.scss`
- `src/styles/styles.scss` (y `angular.json`: `styles` y `stylePreprocessorOptions.includePaths`)
- `shared/design`: `tokens.ts`
- `core/layout`: `layout.service.ts`
- `features/dev`: `estilos.component.*` (ruta `/dev/estilos`, solo en desarrollo)

## Requiere del backend
Nada.

## Depende de
#2

## Guía
Paso 3 de `docs/Guia_Github_Frontend_NutriSport.md`.
```

```bash
git checkout main
git pull
git checkout -b feature/03-sistema-diseno
```

### Qué se crea

- `src/styles/tokens`: `_primitives.scss`, `_semantic.scss`
- `src/styles/abstracts`: `_breakpoints.scss`, `_mixins.scss`
- `src/styles/base`: `_reset.scss`, `_fonts.scss`, `_typography.scss`
- `src/styles/utilities`: `_layout.scss`, `_text.scss`
- `src/styles/vendors`: `_cdk-overlay.scss`
- `src/styles/styles.scss` (y `angular.json`: `styles` y `stylePreprocessorOptions.includePaths`)
- `shared/design`: `tokens.ts`
- `core/layout`: `layout.service.ts`
- `features/dev`: `estilos.component.*` (ruta `/dev/estilos`, solo en desarrollo)

### Ejecución (en orden)

```bash
npm i @angular/cdk @lucide/angular @fontsource-variable/manrope @fontsource-variable/inter
```

> **Iconos:** se usa `@lucide/angular`, el paquete oficial actual de Lucide (standalone y con signals). El antiguo `lucide-angular` solo declara compatibilidad hasta Angular 21 y `npm i` falla con Angular 22. Los iconos se registran con `provideLucideIcons(...)` y se pintan con `<svg lucideIcon="nombre">`.

#### Prompt 3.1 · Tokens y estilos globales

```text
Lee solo docs/DESIGN.md §2 (paleta), §3 (tipografía), §6.5–6.9 (espaciado, rejilla, radios, sombras, capas) y §9.1–9.4 (tokens, breakpoints, organización y convenciones). Crea los estilos globales EXACTAMENTE con esa organización:
- src/styles/tokens/_primitives.scss y _semantic.scss: copia los tokens de §9.1 (prefijo --ns-) sin inventar valores.
- src/styles/abstracts/_breakpoints.scss: el mapa $ns-breakpoints y los mixins up() y down() de §9.2. _mixins.scss: focus-ring, truncate, sr-only y reduced-motion.
- src/styles/base/_fonts.scss: importa @fontsource-variable/manrope y @fontsource-variable/inter y define --ns-font-display y --ns-font-body con esas familias ("Manrope Variable", "Inter Variable") y el fallback de §3.1. _reset.scss: reset moderno mínimo (box-sizing, márgenes, imágenes responsive, prefers-reduced-motion). _typography.scss: clases .ns-text-display, -h1, -h2, -h3, -card-title, -h4, -metric-xl, -metric-lg, -body-lg, -body, -body-strong, -body-sm, -caption, -overline, -label con la escala de §3.2; html con font-size 100 %, body con la tipografía `body` (14/20) y color --ns-text sobre --ns-bg; números tabulares en .ns-tnum.
- src/styles/utilities/_layout.scss: .ns-stack, .ns-cluster, .ns-grid (12 columnas con los gutters de §6.6 por breakpoint), .ns-sr-only y .ns-skip-link ("Saltar al contenido"). _text.scss: colores de texto semánticos.
- src/styles/vendors/_cdk-overlay.scss: @use '@angular/cdk/overlay-prebuilt.css' y el backdrop oscuro con --ns-z-overlay.
- src/styles/styles.scss: @use en orden tokens → abstracts → base → utilities → vendors.
En angular.json, apunta "styles" a src/styles/styles.scss y añade stylePreprocessorOptions.includePaths: ["src/styles"] para que los componentes puedan hacer @use 'abstracts/breakpoints'. Borra el src/styles.scss que generó el CLI.
```

#### Prompt 3.2 · Tokens en TypeScript, LayoutService y página de muestra

```text
1. Crea src/app/shared/design/tokens.ts con export const TOKENS = { ... } as const: los colores de datos (kcal, proteína, hidratos, grasa, actividad, peso), ink950, border, textSecondary, textTertiary, success, warning, error, info, fontBody y fontDisplay, con los mismos valores HEX que los tokens SCSS (es el único sitio de src/app donde se permiten HEX, porque ECharts no lee variables CSS).
2. Crea src/app/core/layout/layout.service.ts (providedIn root) con BreakpointObserver del CDK y los breakpoints de DESIGN.md §9.2: signals de solo lectura esMovil (< 768 px), esTablet (768–1023 px) y esEscritorio (≥ 1024 px), con toSignal.
3. Crea features/dev/estilos.component (standalone, OnPush) que muestre: las paletas primaria, tinta, IA, datos y estados como muestras con su nombre de token; la escala tipográfica completa; ejemplos de radios y sombras. Regístralo en app.routes.ts como ruta 'dev/estilos' solo si !environment.production (usa un array de rutas condicional).
4. Registra los iconos con @lucide/angular (NO uses lucide-angular): en app.config.ts, provideLucideIcons(LucideCoffee, LucideUtensils, LucideMoon, LucideApple, LucideZap, LucideDumbbell, LucideCamera, LucideSparkles, LucideScanBarcode, LucideShoppingBasket, LucideScale, LucideActivity, LucideShieldCheck, LucideMailCheck, LucidePlus, LucideX, LucideCheck, LucideChevronLeft, LucideChevronRight, LucideMenu, LucideLogOut, LucideUser, LucideSettings, LucideHouse, LucideChartColumn, LucideBot, LucideCalendar, LucideTrash2, LucidePencil, LucideCopy, LucideSearch, LucideInfo, LucideTriangleAlert, LucideCircleAlert, LucideCircleCheck, LucideEye, LucideEyeOff, LucideLock, LucideStar) con los iconos de DESIGN.md §4 y los de uso general. Comprueba en node_modules/@lucide/angular que esos nombres existen. En las plantillas se pintan importando LucideDynamicIcon: <svg lucideIcon="coffee" aria-hidden="true"></svg> (los iconos nuevos que se usen más adelante se añaden a provideLucideIcons).
```

### Comprobación

```bash
npm start
```

Abre `http://localhost:4200/dev/estilos` y compáralo con `DESIGN.md` §2 y §3 (los nombres de los tokens deben coincidir). En *DevTools → Network → Font*, las fuentes salen de `localhost:4200`.

```bash
grep -rnE "#[0-9a-fA-F]{3,6}\b" src/app --include=*.scss
npm run build
```

### Commit, push y pull request

```bash
git add .
git commit -m "feat(ui): tokens del sistema de diseño, tipografía, iconos y estilos base"
git push -u origin feature/03-sistema-diseno
```

| Campo | Valor |
|---|---|
| **Título de la PR** | `Sistema de diseño base` |
| **Rama base** | `main` |

**Descripción de la PR** (pégala al crearla; la última línea cierra la issue):

```markdown
## Qué incluye
- [x] Instalar `@fontsource-variable/manrope`, `@fontsource-variable/inter`, `@lucide/angular` y `@angular/cdk`
- [x] Crear `src/styles` con `tokens/`, `abstracts/`, `base/`, `utilities/` y `vendors/` según `DESIGN.md` §9.1–9.4
- [x] Crear `shared/design/tokens.ts` con los valores que necesitan ECharts y la lógica
- [x] Crear el `LayoutService` con signals (`esMovil`, `esTablet`) a partir de `BreakpointObserver`
- [x] Crear una página de muestra solo de desarrollo (`/dev/estilos`) con la paleta y la escala tipográfica

## Cómo probarlo
- La página `/dev/estilos` muestra los colores primarios, de IA, de macros y de estado y toda la escala tipográfica con Manrope e Inter
- En la pestaña *Network* las fuentes se sirven desde `localhost` (no desde Google Fonts)
- Ningún fichero de `src/app` contiene colores HEX (`grep -rE "#[0-9a-fA-F]{3,6}\b" src/app --include=*.scss` no devuelve nada)

## Checklist
- [ ] `npm run build` termina sin errores
- [ ] Los componentes solo usan variables `--ns-*`
- [ ] No se sube ninguna contraseña, token ni `.env`

Closes #3
```

Después de fusionar: `git checkout main && git pull && git branch -d feature/03-sistema-diseno`

---

## Paso 4 · Modelos de la API, etiquetas y pipes de formato

### GitHub: issue y rama

| Campo | Valor |
|---|---|
| **Título de la issue** | `[Frontend] Modelos TypeScript de la API, etiquetas de los enumerados y pipes de formato es-ES` |
| **Rama** | `feature/04-modelos-api` |

**Descripción de la issue** (cópiala en el campo *Description*):

```markdown
## Objetivo
Tener en `core/models` las interfaces que reflejan exactamente el JSON de la API, los mapas de etiquetas de los enumerados y los pipes que formatean cifras, unidades y fechas como pide `DESIGN.md` §11.

## Tareas
- [ ] Crear las interfaces de `NutriSport_API.md` §5 repartidas por módulo en `core/models/`
- [ ] Crear `etiquetas.ts` con los mapas de §10 y los iconos por tipo de comida (`DESIGN.md` §4)
- [ ] Crear los pipes `kcal`, `gramos`, `numero`, `fechaCorta` y `etiqueta`
- [ ] Probar los pipes y las etiquetas

## Criterios de aceptación
- [ ] Las interfaces compilan y sus nombres y propiedades coinciden con el OpenAPI
- [ ] `1234.5 | kcal` muestra `1.235 kcal`, `112.4 | gramos` muestra `112 g` y `'2026-11-21' | fechaCorta` muestra `sáb. 21 nov`
- [ ] Las pruebas de los pipes pasan

## Archivos
- `core/models`: `comun.ts`, `auth.ts`, `perfil.ts`, `alimentos.ts`, `comidas.ts`, `analisis.ts`, `actividad.ts`, `seguimiento.ts`, `recetas.ts`, `menus.ts`, `compra.ts`, `asistente.ts`, `admin.ts`, `etiquetas.ts`, `index.ts`
- `shared/pipes`: `kcal.pipe.ts`, `gramos.pipe.ts`, `numero.pipe.ts`, `fecha-corta.pipe.ts`, `etiqueta.pipe.ts` (+ pruebas)

## Requiere del backend
Nada (los tipos salen de `docs/NutriSport_API.md` §5).

## Depende de
#3

## Guía
Paso 4 de `docs/Guia_Github_Frontend_NutriSport.md`.
```

```bash
git checkout main
git pull
git checkout -b feature/04-modelos-api
```

### Qué se crea

- `core/models`: `comun.ts`, `auth.ts`, `perfil.ts`, `alimentos.ts`, `comidas.ts`, `analisis.ts`, `actividad.ts`, `seguimiento.ts`, `recetas.ts`, `menus.ts`, `compra.ts`, `asistente.ts`, `admin.ts`, `etiquetas.ts`, `index.ts`
- `shared/pipes`: `kcal.pipe.ts`, `gramos.pipe.ts`, `numero.pipe.ts`, `fecha-corta.pipe.ts`, `etiqueta.pipe.ts` (+ pruebas)

### Ejecución (en orden)

#### Prompt 4.1 · Modelos de la API

```text
Lee solo docs/api/tipos-comunes.md, la sección §5 (tipos) de cada fichero de módulo de docs/api/ (índice en docs/api/README.md) y el §11 (discrepancias) de docs/api/general.md; si dudas de un nombre, búscalo en docs/NutriSport-API.json (sin leerlo entero). Crea en src/app/core/models los tipos repartidos por módulo, copiándolos tal cual (mismos nombres de interfaces y propiedades, mismos | null y ?):
- comun.ts: los enumerados que se usan en varios módulos (TipoComida, Alergeno, Preparacion, UnidadBase, FuenteAlimento…), Pagina<T>, ProblemDetail, ErrorCampo, Nutrientes, NutricionRacion, Porcentajes, FuenteResponse, ObjetivoDiarioResponse.
- auth.ts (auth y cuenta), perfil.ts, alimentos.ts (catálogo, categorías y productos de Open Food Facts), comidas.ts, analisis.ts, actividad.ts, seguimiento.ts, recetas.ts, menus.ts, compra.ts, asistente.ts (incluida MensajeAsistente del §11) y admin.ts.
- index.ts que lo reexporte todo.
No añadas propiedades, no las renombres y no conviertas fechas a Date. Si un tipo aparece en dos módulos, defínelo una vez e impórtalo.
```

#### Prompt 4.2 · Etiquetas y pipes

```text
1. Crea src/app/core/models/etiquetas.ts con un Record<Enum, string> por cada enumerado de la tabla del §10 de docs/api/rutas-etiquetas.md (ETIQUETAS_TIPO_COMIDA, ETIQUETAS_OBJETIVO, ETIQUETAS_ALERGENO…), ORDEN_TIPOS_COMIDA (el orden del día) e ICONOS_TIPO_COMIDA (nombres de Lucide de DESIGN.md §4: DESAYUNO coffee, MEDIA_MANANA apple, COMIDA utensils, MERIENDA apple, CENA moon, PRE_ENTRENO zap, POST_ENTRENO dumbbell, OTRO utensils).
2. Crea en src/app/shared/pipes (standalone, pure) con Intl.NumberFormat('es-ES') y Intl.DateTimeFormat('es-ES'):
   - KcalPipe (kcal): entero con separador de miles y " kcal" → "2.450 kcal"; null → "—".
   - GramosPipe (gramos): por defecto sin decimales; parámetro opcional de decimales → "112 g", "1,5 g".
   - NumeroPipe (numero): decimales configurables (0 por defecto), coma decimal → "72,4".
   - FechaCortaPipe (fechaCorta): recibe "AAAA-MM-DD" o un ISO con hora; formatos 'corta' ("sáb. 21 nov"), 'larga' ("sábado, 21 de noviembre"), 'diaMes' ("21 nov") y 'hora' ("08:30"). Interpreta "AAAA-MM-DD" como fecha local (usa desdeFechaApi de core/util/fechas.ts).
   - EtiquetaPipe (etiqueta): valor | etiqueta:'tipoComida' → busca en el mapa de etiquetas.ts; si no existe, devuelve el valor tal cual.
3. Pruebas de cada pipe con los ejemplos de DESIGN.md §11 y de etiquetas (todos los valores de cada enumerado tienen etiqueta).
```

### Comprobación

```bash
npm run build
npm test
```

Abre `docs/NutriSport-API.json`, busca `"RegistroComidaResponse"` y compara sus propiedades con `core/models/comidas.ts`. Haz lo mismo con dos esquemas más que elijas.

### Commit, push y pull request

```bash
git add .
git commit -m "feat(core): modelos de la API, etiquetas y pipes de formato"
git push -u origin feature/04-modelos-api
```

| Campo | Valor |
|---|---|
| **Título de la PR** | `Modelos de la API y formato` |
| **Rama base** | `main` |

**Descripción de la PR** (pégala al crearla; la última línea cierra la issue):

```markdown
## Qué incluye
- [x] Crear las interfaces de `NutriSport_API.md` §5 repartidas por módulo en `core/models/`
- [x] Crear `etiquetas.ts` con los mapas de §10 y los iconos por tipo de comida (`DESIGN.md` §4)
- [x] Crear los pipes `kcal`, `gramos`, `numero`, `fechaCorta` y `etiqueta`
- [x] Probar los pipes y las etiquetas

## Cómo probarlo
- Las interfaces compilan y sus nombres y propiedades coinciden con el OpenAPI
- `1234.5 | kcal` muestra `1.235 kcal`, `112.4 | gramos` muestra `112 g` y `'2026-11-21' | fechaCorta` muestra `sáb. 21 nov`
- Las pruebas de los pipes pasan

## Checklist
- [ ] `npm run build` termina sin errores
- [ ] `npm test` pasa
- [ ] No se sube ninguna contraseña, token ni `.env`

Closes #4
```

Después de fusionar: `git checkout main && git pull && git branch -d feature/04-modelos-api`

---

## Paso 5 · Componentes base del sistema de diseño (I): acciones, formularios y contenedores

### GitHub: issue y rama

| Campo | Valor |
|---|---|
| **Título de la issue** | `[Frontend] Componentes base (I): botón, campos de formulario, selectores, tarjetas, badges, alertas y estados vacíos` |
| **Rama** | `feature/05-componentes-base` |

**Descripción de la issue** (cópiala en el campo *Description*):

```markdown
## Objetivo
Construir la primera tanda de componentes reutilizables de `DESIGN.md` §5 y §9.5, los que usan todos los formularios y tarjetas, con sus estados (hover, foco, deshabilitado, error, carga) y accesibles con teclado.

## Tareas
- [ ] Crear `ns-button` (atributo `nsButton`) con variantes, tamaños, icono y estado de carga
- [ ] Crear `ns-form-field` + directiva `nsInput`, `ns-select`, `ns-checkbox`, `ns-switch`, `ns-segmented` y `ns-chip-group`
- [ ] Crear `ns-card`, `ns-badge`, `ns-alert`, `ns-spinner`, `ns-skeleton` y `ns-empty-state`
- [ ] Crear la directiva `nsErrorCampo` que muestra el error de un control (validadores y servidor)
- [ ] Añadir los componentes a la página `/dev/componentes`

## Criterios de aceptación
- [ ] La página `/dev/componentes` muestra cada componente con todas sus variantes y estados
- [ ] Todo se puede usar con el teclado y el foco es visible (anillo `--ns-focus-ring`)
- [ ] Los campos con error muestran el mensaje debajo, en `--ns-error`, enlazado con `aria-describedby`
- [ ] Las pruebas de `NsButtonComponent` y de `nsErrorCampo` pasan

## Archivos
- `shared/ui/button`: `button.component.*`
- `shared/ui/form`: `form-field.component.*`, `input.directive.ts`, `select.component.*`, `checkbox.component.*`, `switch.component.*`, `segmented.component.*`, `chip-group.component.*`, `error-campo.directive.ts`
- `shared/ui/card`: `card.component.*`
- `shared/ui/feedback`: `badge.component.*`, `alert.component.*`, `spinner.component.*`, `skeleton.component.*`, `empty-state.component.*`
- `features/dev`: `componentes.component.*` (ruta `/dev/componentes`)
- `shared/ui/index.ts`

## Requiere del backend
Nada.

## Depende de
#4

## Guía
Paso 5 de `docs/Guia_Github_Frontend_NutriSport.md`.
```

```bash
git checkout main
git pull
git checkout -b feature/05-componentes-base
```

### Qué se crea

- `shared/ui/button`: `button.component.*`
- `shared/ui/form`: `form-field.component.*`, `input.directive.ts`, `select.component.*`, `checkbox.component.*`, `switch.component.*`, `segmented.component.*`, `chip-group.component.*`, `error-campo.directive.ts`
- `shared/ui/card`: `card.component.*`
- `shared/ui/feedback`: `badge.component.*`, `alert.component.*`, `spinner.component.*`, `skeleton.component.*`, `empty-state.component.*`
- `features/dev`: `componentes.component.*` (ruta `/dev/componentes`)
- `shared/ui/index.ts`

### Ejecución (en orden)

#### Prompt 5.1 · Botón, campos y selectores

```text
Lee solo docs/DESIGN.md §5.1–5.5, §9.4, §9.5 y el ejemplo de ns-button de §9.6. Crea en src/app/shared/ui (standalone, OnPush, input()/output(), estilos en .scss con solo tokens --ns-*):
- button/NsButtonComponent con selector 'button[nsButton], a[nsButton]': variant 'primary'|'ai'|'secondary'|'ghost'|'danger' (por defecto primary), size 'sm'|'md'|'lg', icon (nombre de Lucide), iconPosition, loading (muestra ns-spinner y aria-busy, y deshabilita), fullWidth. Altura mínima 44 px en móvil. Usa el ejemplo de §9.6 como base (con el sufijo Component del Prompt 0).
- form/NsFormFieldComponent (ns-form-field): label, hint, obligatorio (asterisco con texto accesible), sufijo (unidad, p. ej. "kg") y proyección del control; muestra el error del control proyectado. form/NsInputDirective (input[nsInput], textarea[nsInput]): aplica la clase y los estados (error cuando el control es inválido y está tocado).
- form/NsSelectComponent (select nativo con estilo y ControlValueAccessor), NsCheckboxComponent, NsSwitchComponent (role="switch"), NsSegmentedComponent (radiogroup con flechas del teclado) y NsChipGroupComponent (selección simple o múltiple): todos implementan ControlValueAccessor para usarse con formControlName.
- form/ErrorCampoDirective (selector [nsErrorCampo], recibe el AbstractControl): muestra el primer error con mensajes en castellano para required, email, minlength, maxlength, min, max, pattern y el error 'servidor' (texto que venga del backend). Enlaza el id del mensaje con aria-describedby del control.
```

#### Prompt 5.2 · Tarjetas, badges, alertas y estados

```text
Lee solo docs/DESIGN.md §5.5, §5.10, §5.11 y §5.15. Crea en src/app/shared/ui:
- card/NsCardComponent (ns-card): variant 'default'|'metric'|'ai'|'interactive' (la ai con el borde/acento índigo de §2.3), padding 'sm'|'md'|'lg', y ranuras de cabecera (título, acciones) y contenido.
- feedback/NsBadgeComponent: variant 'neutral'|'success'|'warning'|'error'|'info'|'ai'|'activity'|'kcal'|'protein'|'carbs'|'fat', icono opcional.
- feedback/NsAlertComponent: type 'info'|'success'|'warning'|'error'|'ai', título, texto proyectado, dismissible (output cerrar); role="alert" solo para error.
- feedback/NsSpinnerComponent (size), NsSkeletonComponent (shape 'line'|'circle'|'rect', width, height; sin animación con prefers-reduced-motion) y NsEmptyStateComponent (icono en círculo de 48 px, título, descripción y ranura de acciones).
- shared/ui/index.ts que lo exporte todo.
Después crea features/dev/componentes.component con una sección por componente (todas las variantes, tamaños y estados: normal, hover, foco, deshabilitado, error, cargando) y regístralo como 'dev/componentes' solo en desarrollo.
Pruebas: NsButtonComponent (loading deshabilita y pone aria-busy; la variante se refleja en la clase) y ErrorCampoDirective (muestra el mensaje de required y el de 'servidor').
```

### Comprobación

```bash
npm start
```

Abre `/dev/componentes`, recorre la página **solo con el teclado** (Tab, Mayús+Tab, flechas en el segmentado, Espacio en checkbox y switch) y comprueba el foco visible. Reduce la ventana a 360 px.

```bash
npm run build
npm test
```

### Commit, push y pull request

```bash
git add .
git commit -m "feat(ui): componentes base de acciones, formularios, tarjetas, badges y alertas"
git push -u origin feature/05-componentes-base
```

| Campo | Valor |
|---|---|
| **Título de la PR** | `Componentes base del sistema de diseño (I)` |
| **Rama base** | `main` |

**Descripción de la PR** (pégala al crearla; la última línea cierra la issue):

```markdown
## Qué incluye
- [x] Crear `ns-button` (atributo `nsButton`) con variantes, tamaños, icono y estado de carga
- [x] Crear `ns-form-field` + directiva `nsInput`, `ns-select`, `ns-checkbox`, `ns-switch`, `ns-segmented` y `ns-chip-group`
- [x] Crear `ns-card`, `ns-badge`, `ns-alert`, `ns-spinner`, `ns-skeleton` y `ns-empty-state`
- [x] Crear la directiva `nsErrorCampo` que muestra el error de un control (validadores y servidor)
- [x] Añadir los componentes a la página `/dev/componentes`

## Cómo probarlo
- La página `/dev/componentes` muestra cada componente con todas sus variantes y estados
- Todo se puede usar con el teclado y el foco es visible (anillo `--ns-focus-ring`)
- Los campos con error muestran el mensaje debajo, en `--ns-error`, enlazado con `aria-describedby`
- Las pruebas de `NsButtonComponent` y de `nsErrorCampo` pasan

## Checklist
- [ ] `npm run build` termina sin errores
- [ ] `npm test` pasa
- [ ] No se sube ninguna contraseña, token ni `.env`

Closes #5
```

Después de fusionar: `git checkout main && git pull && git branch -d feature/05-componentes-base`

---

## Paso 6 · Componentes base del sistema de diseño (II): diálogos, avisos, datos y navegación

### GitHub: issue y rama

| Campo | Valor |
|---|---|
| **Título de la issue** | `[Frontend] Componentes base (II): diálogos, toasts, confirmación, anillo, barras, métricas, cantidad, tira de fechas, pestañas, stepper y drawer` |
| **Rama** | `feature/06-componentes-feedback` |

**Descripción de la issue** (cópiala en el campo *Description*):

```markdown
## Objetivo
Completar los componentes que necesitan las pantallas: superposiciones con Angular CDK (diálogo, confirmación, *drawer* y *bottom sheet*), avisos (*toast*, aviso orientativo), visualización de progreso (anillo, barra, métrica) y navegación (pestañas, *stepper*, tira de fechas, paginador).

## Tareas
- [ ] Crear `NsDialogService` (CDK Dialog) con tamaños y modo *bottom sheet* en móvil, y `NsConfirmService`
- [ ] Crear `NsToastService` y el contenedor de toasts (con acción "Deshacer")
- [ ] Crear `ns-ring`, `ns-progress-bar`, `ns-metric`, `ns-quantity-input` y `ns-disclaimer`
- [ ] Crear `ns-tabs`, `ns-stepper`, `ns-date-strip`, `ns-paginator` y `ns-drawer`
- [ ] Probar los servicios de diálogo, confirmación y toast

## Criterios de aceptación
- [ ] Los diálogos atrapan el foco, se cierran con Escape y devuelven el foco al botón que los abrió
- [ ] Los toasts se anuncian con `aria-live` y desaparecen solos (5 s) salvo los de error
- [ ] `ns-ring` y `ns-progress-bar` tienen `role="progressbar"` con `aria-valuenow`, `aria-valuemax` y una etiqueta
- [ ] `ns-quantity-input` respeta `min`, `max` y `step` y funciona con las flechas
- [ ] Las pruebas pasan

## Archivos
- `shared/ui/overlay`: `dialog.service.ts`, `dialog-shell.component.*`, `confirm.service.ts`, `confirm-dialog.component.*`, `drawer.component.*`
- `shared/ui/feedback`: `toast.service.ts`, `toast-container.component.*`, `disclaimer.component.*`
- `shared/ui/data`: `ring.component.*`, `progress-bar.component.*`, `metric.component.*`
- `shared/ui/form`: `quantity-input.component.*`
- `shared/ui/nav`: `tabs.component.*`, `stepper.component.*`, `date-strip.component.*`, `paginator.component.*`

## Requiere del backend
Nada.

## Depende de
#5

## Guía
Paso 6 de `docs/Guia_Github_Frontend_NutriSport.md`.
```

```bash
git checkout main
git pull
git checkout -b feature/06-componentes-feedback
```

### Qué se crea

- `shared/ui/overlay`: `dialog.service.ts`, `dialog-shell.component.*`, `confirm.service.ts`, `confirm-dialog.component.*`, `drawer.component.*`
- `shared/ui/feedback`: `toast.service.ts`, `toast-container.component.*`, `disclaimer.component.*`
- `shared/ui/data`: `ring.component.*`, `progress-bar.component.*`, `metric.component.*`
- `shared/ui/form`: `quantity-input.component.*`
- `shared/ui/nav`: `tabs.component.*`, `stepper.component.*`, `date-strip.component.*`, `paginator.component.*`

### Ejecución (en orden)

#### Prompt 6.1 · Superposiciones y avisos

```text
Lee solo docs/DESIGN.md §5.6, §5.11, §5.15 y §10 (accesibilidad y movimiento). Con @angular/cdk/dialog y @angular/cdk/overlay crea en src/app/shared/ui:
- overlay/NsDialogService.open<T, R>(componente, { data, size: 'sm'|'md'|'lg', titulo }) que envuelve CDK Dialog: en móvil (LayoutService.esMovil) se abre como bottom sheet a ancho completo con safe-area; en escritorio, centrado con el ancho del tamaño. DialogShellComponent da la cabecera (título h4 y botón cerrar con aria-label) y el pie de acciones.
- overlay/NsConfirmService.confirmar({ titulo, mensaje, textoConfirmar, peligro, pedirPassword }): Promise<boolean | string> con ConfirmDialogComponent. Con pedirPassword muestra un campo de contraseña y devuelve su valor (se usará para eliminar la cuenta).
- overlay/NsDrawerComponent: panel lateral (derecha, ancho configurable, 560 px por defecto) con CDK Overlay, foco atrapado y cierre con Escape.
- feedback/NsToastService con signals: mostrar({ tipo, titulo, mensaje, accion?: { texto, ejecutar } , duracion }), exito(), error(), info(); ToastContainerComponent (se añadirá al AppComponent) con aria-live="polite" (assertive para errores), z-index --ns-z-toast, máximo 3 visibles.
- feedback/NsDisclaimerComponent (ns-disclaimer): context 'analisis'|'menu'|'asistente'|'receta' con el texto orientativo de cada contexto ("Estimación orientativa: no sustituye el consejo de un profesional sanitario…").
Añade ToastContainerComponent a app.component.html y estos componentes a /dev/componentes.
```

#### Prompt 6.2 · Datos y navegación

```text
Lee solo docs/DESIGN.md §5.12–5.14, §7.4 y §9.5. Crea en src/app/shared/ui:
- data/NsRingComponent (ns-ring): SVG con value, max, size (px), grosor, color ('kcal'|'protein'|'carbs'|'fat'|'activity'), etiqueta central (ranura), segundo anillo interior opcional (valueInterior/maxInterior, para el gasto del entreno del dashboard); si value > max muestra el exceso con --ns-warning. role="progressbar" con aria-valuenow/aria-valuemax/aria-label.
- data/NsProgressBarComponent: value, max, color, showLabel, alto; mismo patrón de accesibilidad.
- data/NsMetricComponent: label, value, unit, delta (número con signo), trend 'up'|'down'|'flat' y si el aumento es bueno o malo.
- form/NsQuantityInputComponent (ControlValueAccessor): value, min, max, step, unit, decimales; botones − y + de 44 px, entrada numérica con coma decimal.
- nav/NsTabsComponent (patrón ARIA tablist con flechas), nav/NsStepperComponent (pasos con estado; en móvil "Paso 2 de 4" con barra), nav/NsDateStripComponent (7 días alrededor de la fecha seleccionada, flechas de semana, model() selected en "AAAA-MM-DD", markedDates para marcar días con datos) y nav/NsPaginatorComponent (page desde 0, totalPages, emite el cambio; textos "Anterior"/"Siguiente" y "Página 2 de 7").
Pruebas: NsToastService (añade y retira), NsConfirmService (resuelve true/false), NsRingComponent (aria-valuenow y exceso) y NsDateStripComponent (avanzar una semana).
```

### Comprobación

```bash
npm start
```

En `/dev/componentes`: abre un diálogo y ciérralo con Escape (el foco vuelve al botón), lanza un toast con "Deshacer", prueba el anillo con un valor mayor que el máximo y el `ns-quantity-input` con el teclado. Repite en 360 px: el diálogo sale como *bottom sheet*.

```bash
npm run build
npm test
```

### Commit, push y pull request

```bash
git add .
git commit -m "feat(ui): diálogos, toasts, componentes de datos y de navegación"
git push -u origin feature/06-componentes-feedback
```

| Campo | Valor |
|---|---|
| **Título de la PR** | `Componentes base del sistema de diseño (II)` |
| **Rama base** | `main` |

**Descripción de la PR** (pégala al crearla; la última línea cierra la issue):

```markdown
## Qué incluye
- [x] Crear `NsDialogService` (CDK Dialog) con tamaños y modo *bottom sheet* en móvil, y `NsConfirmService`
- [x] Crear `NsToastService` y el contenedor de toasts (con acción "Deshacer")
- [x] Crear `ns-ring`, `ns-progress-bar`, `ns-metric`, `ns-quantity-input` y `ns-disclaimer`
- [x] Crear `ns-tabs`, `ns-stepper`, `ns-date-strip`, `ns-paginator` y `ns-drawer`
- [x] Probar los servicios de diálogo, confirmación y toast

## Cómo probarlo
- Los diálogos atrapan el foco, se cierran con Escape y devuelven el foco al botón que los abrió
- Los toasts se anuncian con `aria-live` y desaparecen solos (5 s) salvo los de error
- `ns-ring` y `ns-progress-bar` tienen `role="progressbar"` con `aria-valuenow`, `aria-valuemax` y una etiqueta
- `ns-quantity-input` respeta `min`, `max` y `step` y funciona con las flechas
- Las pruebas pasan

## Checklist
- [ ] `npm run build` termina sin errores
- [ ] `npm test` pasa
- [ ] No se sube ninguna contraseña, token ni `.env`

Closes #6
```

Después de fusionar: `git checkout main && git pull && git branch -d feature/06-componentes-feedback`

---

## Paso 7 · Sesión, errores de la API e interceptores

### GitHub: issue y rama

| Campo | Valor |
|---|---|
| **Título de la issue** | `[Frontend] AuthService con el token en memoria, restauración de la sesión, ApiError e interceptores de autenticación, refresh y errores` |
| **Rama** | `feature/07-sesion-interceptores` |

**Descripción de la issue** (cópiala en el campo *Description*):

```markdown
## Objetivo
Implementar la gestión de la sesión de `NutriSport_API.md` §2: *access token* solo en memoria, restauración con el refresh al arrancar, un único refresh compartido ante los 401, cierre de sesión y conversión de cualquier error HTTP en un `ApiError` con el código y los errores por campo.

## Tareas
- [ ] Crear `ApiError` y `aApiError()` a partir de Problem Details (incluidos `status = 0` y `Retry-After`)
- [ ] Crear `AuthService` con signals (`cuenta`, `autenticado`, `esAdmin`, `emailVerificado`, `consentimientoVigente`) y los métodos de `/auth`
- [ ] Restaurar la sesión al arrancar con `provideAppInitializer` y `POST /auth/refresh`
- [ ] Crear `authInterceptor` (token, un único refresh compartido y reintento) y `errorInterceptor` (convierte a `ApiError`)
- [ ] Crear `core/util/formularios.ts` (`aplicarErroresServidor`) y probarlo todo

## Criterios de aceptación
- [ ] Tras iniciar sesión (desde la consola o Swagger) y recargar la página, la sesión se restaura con la cookie
- [ ] Dos peticiones que reciben 401 a la vez provocan **un solo** `POST /auth/refresh`
- [ ] Si el refresh falla, la sesión se limpia y se navega a `/login?volver=…`
- [ ] Ningún token aparece en `localStorage`, `sessionStorage` ni en las cookies legibles por JavaScript
- [ ] Las pruebas del servicio y de los interceptores pasan

## Archivos
- `core/util`: `api-error.ts`, `formularios.ts` (+ pruebas)
- `core/services`: `auth.service.ts` (+ `auth.service.spec.ts`)
- `core/interceptors`: `auth.interceptor.ts`, `error.interceptor.ts` (+ pruebas)
- `app.config.ts` (interceptores y `provideAppInitializer`)

## Requiere del backend
Arrancado (perfil `local`) para la comprobación: `/auth/login`, `/auth/refresh`, `/auth/logout` y `/cuenta`.

## Depende de
#6

## Guía
Paso 7 de `docs/Guia_Github_Frontend_NutriSport.md`.
```

```bash
git checkout main
git pull
git checkout -b feature/07-sesion-interceptores
```

### Qué se crea

- `core/util`: `api-error.ts`, `formularios.ts` (+ pruebas)
- `core/services`: `auth.service.ts` (+ `auth.service.spec.ts`)
- `core/interceptors`: `auth.interceptor.ts`, `error.interceptor.ts` (+ pruebas)
- `app.config.ts` (interceptores y `provideAppInitializer`)

### Ejecución (en orden)

#### Prompt 7.1 · ApiError y utilidades de formularios

```text
Lee solo docs/api/sesion-errores.md y docs/api/auth.md §3 (errores) y §2.3 (límites). Crea:
1. src/app/core/util/api-error.ts: class ApiError extends Error con status, codigo, titulo, detalle (detail), errores (ErrorCampo[]), retryAfterSegundos (number | null) y url. Función aApiError(e: unknown): ApiError que convierte un HttpErrorResponse:
   - con cuerpo Problem Details (tiene codigo) → sus campos; Retry-After de las cabeceras;
   - status 0 → codigo 'SIN_CONEXION', detalle "No hay conexión con el servidor. Comprueba tu conexión e inténtalo de nuevo.";
   - cualquier otro → codigo 'ERROR_INTERNO' con un detalle genérico en castellano.
   Métodos: esCodigo(...codigos), erroresDe(campo) y mensajeEspera() ("Inténtalo de nuevo en 12 minutos" a partir de Retry-After).
2. src/app/core/util/formularios.ts: aplicarErroresServidor(form: FormGroup | FormArray, error: ApiError): boolean asigna cada errors[].campo al control con ese nombre (admite rutas con punto e índice, como "alimentos[0].cantidad") con setErrors({ servidor: mensaje }) y markAsTouched(); devuelve true si asignó alguno. Y marcarTodoTocado(form).
3. Pruebas de ambos con ejemplos reales del §3 (el registro incompleto, un 401, un 429 con Retry-After, status 0).
```

#### Prompt 7.2 · AuthService y restauración de la sesión

```text
Lee solo docs/api/sesion-errores.md y docs/api/auth.md §2 completo, los endpoints de Auth y Cuenta del §6 y los tipos TokenResponse y CuentaResponse. Crea src/app/core/services/auth.service.ts (providedIn root):
- Estado privado con signals: token (string | null), expiraEn y cuenta (CuentaResponse | null). Signals públicos de solo lectura: cuenta, autenticado, esAdmin (roles incluye ADMIN), emailVerificado y consentimientoVigente. El token NUNCA se guarda en localStorage ni sessionStorage.
- tokenActual(): string | null (lo usa el interceptor).
- login(req: LoginRequest) (envía SIEMPRE mantenerSesion), registrar(req), verificarEmail(token), reenviarVerificacion(email), recuperarPassword(email), restablecerPassword(token, nuevaPassword): Observables con los endpoints exactos de /auth.
- refrescar(): Observable<TokenResponse> que hace POST /auth/refresh y guarda la sesión; si ya hay un refresh en curso devuelve el mismo Observable (shareReplay(1) y se limpia al terminar), para que nunca haya dos a la vez.
- restaurarSesion(): Promise<void> para el arranque: intenta refrescar y, si responde 401, deja la sesión vacía sin error.
- logout(): POST /auth/logout (ignora errores), limpia el estado y navega a /login. logoutTodas(): POST /auth/logout-todas y lo mismo. cerrarSesionLocal() limpia sin llamar al backend.
- actualizarCuenta(cuenta: CuentaResponse) para cuando otras pantallas cambien la cuenta (GET/PATCH /cuenta).
En app.config.ts registra provideAppInitializer(() => inject(AuthService).restaurarSesion()).
Pruebas con provideHttpClientTesting: login guarda el token; refrescar() llamado dos veces seguidas hace una sola petición; restaurarSesion() con 401 deja autenticado() en false.
```

#### Prompt 7.3 · Interceptores

```text
Crea en src/app/core/interceptors (HttpInterceptorFn) y regístralos en app.config.ts con withInterceptors([authInterceptor, errorInterceptor]):
- authInterceptor: solo para las URL que empiezan por environment.apiUrl. Añade Authorization: Bearer <token> si hay token, excepto en las rutas públicas de /auth (lista de NutriSport_API.md §2.1). Si la respuesta es 401 en una ruta protegida y la petición no es /auth/refresh: llama a AuthService.refrescar() (compartido) y repite la petición original UNA vez con el token nuevo; si el refresh falla, AuthService.cerrarSesionLocal() y router.navigate(['/login'], { queryParams: { volver: router.url } }) y propaga el error.
- errorInterceptor: catchError que transforma cualquier HttpErrorResponse en ApiError con aApiError() (después del authInterceptor, para que el reintento ya se haya hecho). No muestra nada: cada pantalla decide. Excepción: un 403 CONSENTIMIENTO_REVOCADO actualiza la cuenta local (consentimientoSaludVigente = false) para que el layout muestre el aviso del paso 13.
Pruebas con HttpTestingController: añade la cabecera; no la añade a /auth/login; ante dos 401 simultáneos hace un solo refresh y repite las dos peticiones; si el refresh da 401, navega a /login; un 400 llega como ApiError con errores[].
```

### Comprobación

Con el backend arrancado, `npm start` y un usuario cualquiera (puedes crearlo desde Swagger con `POST /auth/registro`; para entrar no hace falta verificar el email), abre la consola del navegador en `http://localhost:4200` y ejecuta:

```js
await fetch('/api/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'tu-email-de-prueba', password: prompt('Contraseña'), mantenerSesion: true }) }).then(r => r.status)
```

Recarga la página: en *Network* debe aparecer `POST /api/v1/auth/refresh` con 200 (la sesión se restaura desde la cookie). En *Application → Cookies* la cookie `ns_refresh` aparece como **HttpOnly** y en *Local/Session Storage* no hay ningún token.

```bash
npm run build
npm test
```

### Commit, push y pull request

```bash
git add .
git commit -m "feat(auth): sesión en memoria con refresh automático, ApiError e interceptores"
git push -u origin feature/07-sesion-interceptores
```

| Campo | Valor |
|---|---|
| **Título de la PR** | `Sesión e interceptores` |
| **Rama base** | `main` |

**Descripción de la PR** (pégala al crearla; la última línea cierra la issue):

```markdown
## Qué incluye
- [x] Crear `ApiError` y `aApiError()` a partir de Problem Details (incluidos `status = 0` y `Retry-After`)
- [x] Crear `AuthService` con signals (`cuenta`, `autenticado`, `esAdmin`, `emailVerificado`, `consentimientoVigente`) y los métodos de `/auth`
- [x] Restaurar la sesión al arrancar con `provideAppInitializer` y `POST /auth/refresh`
- [x] Crear `authInterceptor` (token, un único refresh compartido y reintento) y `errorInterceptor` (convierte a `ApiError`)
- [x] Crear `core/util/formularios.ts` (`aplicarErroresServidor`) y probarlo todo

## Cómo probarlo
- Tras iniciar sesión (desde la consola o Swagger) y recargar la página, la sesión se restaura con la cookie
- Dos peticiones que reciben 401 a la vez provocan **un solo** `POST /auth/refresh`
- Si el refresh falla, la sesión se limpia y se navega a `/login?volver=…`
- Ningún token aparece en `localStorage`, `sessionStorage` ni en las cookies legibles por JavaScript
- Las pruebas del servicio y de los interceptores pasan

## Checklist
- [ ] `npm run build` termina sin errores
- [ ] `npm test` pasa
- [ ] No se sube ninguna contraseña, token ni `.env`

Closes #7
```

Después de fusionar: `git checkout main && git pull && git branch -d feature/07-sesion-interceptores`

---

## Paso 8 · Guards, layouts y rutas con carga diferida

### GitHub: issue y rama

| Campo | Valor |
|---|---|
| **Título de la issue** | `[Frontend] Guards de sesión, rol y perfil, layouts (público, aplicación con sidebar y barra inferior, administración) y rutas con carga diferida` |
| **Rama** | `feature/08-layout-rutas` |

**Descripción de la issue** (cópiala en el campo *Description*):

```markdown
## Objetivo
Tener la navegación completa de la aplicación: rutas públicas y protegidas con carga diferida, *guards* que llevan a cada usuario a su sitio (sin sesión → login, sin perfil → onboarding, sin rol → aviso) y el *shell* responsive de `DESIGN.md` §6 con sidebar, barra superior, barra inferior en móvil y *drawer*.

## Tareas
- [ ] Crear los guards `autenticadoGuard`, `invitadoGuard`, `adminGuard` y `perfilGuard` (con `PerfilService.existe()` en caché)
- [ ] Crear `AuthLayoutComponent` (split de marca de login y registro), `ShellComponent` (sidebar, topbar, bottom-nav, drawer) y `AdminLayoutComponent`
- [ ] Definir `app.routes.ts` con todas las rutas del MVP (las pantallas aún vacías, con un `PaginaPendienteComponent`)
- [ ] Crear las páginas de error 404 y "Sin permiso"
- [ ] Probar los guards

## Criterios de aceptación
- [ ] Sin sesión, `/inicio` lleva a `/login?volver=/inicio`; con sesión, `/login` lleva a `/inicio`
- [ ] Con sesión y sin perfil, cualquier ruta de la aplicación lleva a `/bienvenida`
- [ ] Un deportista que abre `/admin/usuarios` ve "No tienes permiso"
- [ ] En escritorio se ve la sidebar (expandida ≥ 1024 px, colapsada en tablet) y en móvil la barra inferior con el botón central de registrar
- [ ] Hay enlace "Saltar al contenido" y el título de la pestaña cambia con cada ruta

## Archivos
- `core/guards`: `autenticado.guard.ts`, `invitado.guard.ts`, `admin.guard.ts`, `perfil.guard.ts` (+ pruebas)
- `core/services`: `perfil.service.ts` (solo `existe()` por ahora)
- `core/layout`: `auth-layout.component.*`, `shell.component.*`, `sidebar.component.*`, `topbar.component.*`, `bottom-nav.component.*`, `nav-drawer.component.*`, `admin-layout.component.*`, `navegacion.ts`
- `features/errores`: `no-encontrado.component.*`, `sin-permiso.component.*`, `pagina-pendiente.component.*`
- `app.routes.ts`, `app.config.ts` (`TitleStrategy` con " · NutriSport")

## Requiere del backend
Arrancado para comprobar las redirecciones (`GET /perfil`).

## Depende de
#7

## Guía
Paso 8 de `docs/Guia_Github_Frontend_NutriSport.md`.
```

```bash
git checkout main
git pull
git checkout -b feature/08-layout-rutas
```

### Qué se crea

- `core/guards`: `autenticado.guard.ts`, `invitado.guard.ts`, `admin.guard.ts`, `perfil.guard.ts` (+ pruebas)
- `core/services`: `perfil.service.ts` (solo `existe()` por ahora)
- `core/layout`: `auth-layout.component.*`, `shell.component.*`, `sidebar.component.*`, `topbar.component.*`, `bottom-nav.component.*`, `nav-drawer.component.*`, `admin-layout.component.*`, `navegacion.ts`
- `features/errores`: `no-encontrado.component.*`, `sin-permiso.component.*`, `pagina-pendiente.component.*`
- `app.routes.ts`, `app.config.ts` (`TitleStrategy` con " · NutriSport")

### Ejecución (en orden)

#### Prompt 8.1 · Guards

```text
Lee solo docs/api/general.md §4 (requisitos de la cuenta). Crea en src/app/core:
- services/perfil.service.ts con existe(): Promise<boolean> que hace GET /perfil y cachea el resultado en un signal (404 → false; otro error → se propaga); marcarCreado() y limpiar() (se llama al cerrar sesión). El resto de métodos llega en el paso 11.
- guards (CanActivateFn funcionales):
  * autenticadoGuard: si !AuthService.autenticado() → UrlTree a /login con queryParams volver = state.url.
  * invitadoGuard: si autenticado → /inicio (o /admin/usuarios si solo tiene el rol ADMIN).
  * adminGuard: si !esAdmin() → /sin-permiso.
  * perfilGuard: para la zona del deportista; si !consentimientoVigente() deja pasar (el layout muestra el aviso); si no hay perfil → /bienvenida.
Pruebas de cada guard con TestBed y AuthService/PerfilService simulados.
```

#### Prompt 8.2 · Layouts

```text
Lee solo docs/DESIGN.md §5.7, §5.8, §6.1–6.4, §6.9, §7.1 (estructura del split) y §7.17 (identificación de la zona de administración); mira #file:docs/design/mockups/png/01-dashboard.png y 07-movil.png. Crea en src/app/core/layout:
- navegacion.ts: grupos y elementos de la sidebar de §6.2 con ruta e icono Lucide. Para el MVP: Principal (Inicio /inicio, Comidas /comidas), Rendimiento (Actividad /actividad), Cuenta (Mi perfil /perfil, Configuración /configuracion) y Administración solo ADMIN (Usuarios /admin/usuarios, Catálogo /admin/catalogo). Deja comentados los de la Ampliación (Planificador, Lista de la compra, Recetas, Estadísticas, Asistente IA) para activarlos en sus pasos.
- AuthLayoutComponent: split 50/50 con el panel de marca ink-950 (logo de docs/design/assets copiado a public/, eslogan "Tu nutrición deportiva, impulsada por inteligencia artificial" y tres beneficios) y router-outlet a la derecha; < 1024 px el panel se reduce a una cabecera de 120 px.
- ShellComponent (DESIGN.md §9.6 «Layout responsive del shell»): sidebar de 248 px (colapsada a 72 px en tablet) con el logo, los grupos y el usuario abajo; topbar de 64 px sticky con el título de la página, el botón "Registrar comida" (primario) y el menú del usuario (Mi perfil, Configuración, Cerrar sesión); en móvil, NsBottomNav con Inicio · Comidas · [Registrar] · Actividad · Perfil, el botón central de 56 px abre un bottom sheet con "Foto del plato", "Buscar alimento" (y en la Ampliación "Escanear código" y "Desde mi plan"); "Más" abre el drawer de 300 px con el resto. Enlace "Saltar al contenido" (#contenido), safe-area y la marca de enlace activo (routerLinkActive) con color y borde, no solo color.
- AdminLayoutComponent: el mismo shell con la franja superior de 3 px ai-600 y el badge "Admin" en la topbar.
Los enlaces de la sidebar se filtran con AuthService.esAdmin().
```

#### Prompt 8.3 · Rutas

```text
Crea src/app/app.routes.ts con loadComponent/loadChildren y un title en cada ruta (y una TitleStrategy que añada " · NutriSport"):
- '' → redirectTo 'inicio'.
- Bajo AuthLayoutComponent con invitadoGuard: login, registro, registro/revisa-tu-email, recuperar-password. Sin guard (válidas con o sin sesión): verificar-email y restablecer-password.
- bienvenida (autenticadoGuard, pantalla completa sin sidebar).
- Bajo ShellComponent con autenticadoGuard y perfilGuard: inicio, comidas, comidas/nueva, comidas/:id/editar, comidas/foto, comidas/foto/:id, mis-alimentos, actividad, perfil; configuracion (con autenticadoGuard pero SIN perfilGuard, para poder gestionar la cuenta aunque no haya perfil o se haya revocado el consentimiento).
- admin bajo AdminLayoutComponent con autenticadoGuard y adminGuard: admin/usuarios, admin/catalogo.
- sin-permiso y '**' (NoEncontradoComponent).
- dev/estilos y dev/componentes solo si !environment.production.
Las pantallas que aún no existen cargan PaginaPendienteComponent (features/errores) con el texto "Pantalla en construcción (paso N)". Al cerrar sesión, limpia PerfilService.
```

### Comprobación

Con el backend arrancado y `npm start`:

1. Sin sesión, abre `/inicio` → acabas en `/login?volver=%2Finicio`.
2. Inicia sesión desde la consola (como en el paso 7) con un usuario **sin perfil** y abre `/inicio` → `/bienvenida`.
3. Abre `/admin/usuarios` con ese usuario → "No tienes permiso".
4. Cambia el ancho de la ventana: 1280 px (sidebar), 900 px (sidebar de iconos) y 375 px (barra inferior y botón central).

```bash
npm run build
npm test
```

### Commit, push y pull request

```bash
git add .
git commit -m "feat(core): guards, layouts responsive y rutas con carga diferida"
git push -u origin feature/08-layout-rutas
```

| Campo | Valor |
|---|---|
| **Título de la PR** | `Guards, layouts y rutas` |
| **Rama base** | `main` |

**Descripción de la PR** (pégala al crearla; la última línea cierra la issue):

```markdown
## Qué incluye
- [x] Crear los guards `autenticadoGuard`, `invitadoGuard`, `adminGuard` y `perfilGuard` (con `PerfilService.existe()` en caché)
- [x] Crear `AuthLayoutComponent` (split de marca de login y registro), `ShellComponent` (sidebar, topbar, bottom-nav, drawer) y `AdminLayoutComponent`
- [x] Definir `app.routes.ts` con todas las rutas del MVP (las pantallas aún vacías, con un `PaginaPendienteComponent`)
- [x] Crear las páginas de error 404 y "Sin permiso"
- [x] Probar los guards

## Cómo probarlo
- Sin sesión, `/inicio` lleva a `/login?volver=/inicio`; con sesión, `/login` lleva a `/inicio`
- Con sesión y sin perfil, cualquier ruta de la aplicación lleva a `/bienvenida`
- Un deportista que abre `/admin/usuarios` ve "No tienes permiso"
- En escritorio se ve la sidebar (expandida ≥ 1024 px, colapsada en tablet) y en móvil la barra inferior con el botón central de registrar
- Hay enlace "Saltar al contenido" y el título de la pestaña cambia con cada ruta

## Checklist
- [ ] `npm run build` termina sin errores
- [ ] `npm test` pasa
- [ ] No se sube ninguna contraseña, token ni `.env`

Closes #8
```

Después de fusionar: `git checkout main && git pull && git branch -d feature/08-layout-rutas`

---

## Paso 9 · Login y registro con consentimiento

### GitHub: issue y rama

| Campo | Valor |
|---|---|
| **Título de la issue** | `[Frontend] Pantallas de login y registro (consentimiento de datos de salud, medidor de contraseña, límite de intentos y "Revisa tu email")` |
| **Rama** | `feature/09-login-registro` |

**Descripción de la issue** (cópiala en el campo *Description*):

```markdown
## Objetivo
Permitir que un deportista cree su cuenta con consentimiento informado (mayoría de edad, términos y datos de salud por separado) y que inicie sesión, con los mensajes genéricos que exige el backend, el aviso de espera tras varios intentos y la vuelta a la página que quería abrir.

## Tareas
- [ ] Crear `LoginComponent` (`DESIGN.md` §7.1) con "Mantener la sesión iniciada" y vuelta a `volver`
- [ ] Crear `RegistroComponent` (§7.2) con medidor de robustez, confirmación de contraseña y los tres checkboxes obligatorios
- [ ] Crear `RevisaTuEmailComponent` con "Reenviar" (y espera por `Retry-After`)
- [ ] Crear los validadores `contrasenaSegura` y `coincideCon` y probarlos
- [ ] Probar los dos formularios

## Criterios de aceptación
- [ ] Un registro correcto lleva a "Revisa tu email" y el correo aparece en Mailpit (<http://localhost:8025>)
- [ ] Un registro con datos no válidos muestra el error del servidor debajo de cada campo
- [ ] Un login con credenciales incorrectas muestra "Email o contraseña incorrectos"; tras 5 intentos, el tiempo de espera y el botón desactivado
- [ ] Un login correcto navega a `volver` o a `/inicio` (y a `/bienvenida` si no hay perfil)

## Archivos
- `features/auth/login`: `login.component.*`
- `features/auth/registro`: `registro.component.*`, `revisa-tu-email.component.*`
- `features/auth/componentes`: `password-strength.component.*`, `campo-password.component.*` (con mostrar/ocultar)
- `core/util`: `validadores.ts` (+ pruebas)
- pruebas: `login.component.spec.ts`, `registro.component.spec.ts`

## Requiere del backend
`POST /auth/login`, `POST /auth/registro`, `POST /auth/reenviar-verificacion` y Mailpit.

## Depende de
#8

## Guía
Paso 9 de `docs/Guia_Github_Frontend_NutriSport.md`.
```

```bash
git checkout main
git pull
git checkout -b feature/09-login-registro
```

### Qué se crea

- `features/auth/login`: `login.component.*`
- `features/auth/registro`: `registro.component.*`, `revisa-tu-email.component.*`
- `features/auth/componentes`: `password-strength.component.*`, `campo-password.component.*` (con mostrar/ocultar)
- `core/util`: `validadores.ts` (+ pruebas)
- pruebas: `login.component.spec.ts`, `registro.component.spec.ts`

### Ejecución (en orden)

#### Prompt 9.1 · Validadores y componentes de contraseña

```text
Lee solo docs/api/auth.md y docs/api/sesion-errores.md §8 (validaciones de RegistroRequest) y docs/DESIGN.md §7.2. Crea:
- core/util/validadores.ts: contrasenaSegura() (10–72 caracteres, al menos una letra y un número; error { contrasenaSegura: { motivo } }), coincideCon(otroControl) para confirmar contraseña y noSoloEspacios(). Añade sus mensajes en castellano a ErrorCampoDirective.
- features/auth/componentes/CampoPasswordComponent: input de contraseña con botón mostrar/ocultar (icono eye/eye-off, aria-pressed, aria-label) e implementado como ControlValueAccessor.
- features/auth/componentes/PasswordStrengthComponent (ns-password-strength): 4 segmentos según longitud, variedad de caracteres y que no sea una secuencia obvia; texto "Débil / Aceptable / Buena / Fuerte" (no solo color). Aclara en un texto pequeño que el servidor también rechaza contraseñas comunes.
Pruebas de los validadores.
```

#### Prompt 9.2 · Login y registro

```text
Lee solo docs/api/auth.md y docs/api/sesion-errores.md §2 (sesión, mensajes genéricos y límites) y §3, y docs/DESIGN.md §7.1 y §7.2. Crea las pantallas dentro de AuthLayoutComponent:
- LoginComponent (/login): título "Bienvenido de nuevo", email, contraseña (CampoPasswordComponent), checkbox "Mantener la sesión iniciada" con su explicación (si no se marca, la sesión termina al cerrar el navegador), botón primario lg a ancho completo con loading, enlaces "¿Olvidaste tu contraseña?" y "Crear cuenta". Al enviar: AuthService.login con mantenerSesion siempre presente. 401 → ns-alert con el detail del servidor; 429 → ns-alert de advertencia con ApiError.mensajeEspera() y botón desactivado hasta que pase el tiempo; 400 → errores en los campos. Si va bien: navega a queryParam volver (solo si es una ruta interna que empieza por "/") o a /inicio.
- RegistroComponent (/registro): nombre, email, contraseña con PasswordStrengthComponent, confirmar contraseña, y tres checkboxes separados: "Declaro ser mayor de 18 años", "Acepto los términos de uso" y "Consiento el tratamiento de mis datos de salud" con un enlace "Qué datos tratamos y por qué" que abre un diálogo con el texto (datos de perfil, comidas, fotos y entrenamientos; qué se envía al proveedor de IA: fotos sin metadatos y datos nutricionales, nunca nombre ni email; se puede revocar en Configuración). Envía RegistroRequest con los tres booleanos siempre (sin confirmarPassword). 202 → navega a /registro/revisa-tu-email con el email en el estado de navegación. 400 → aplicarErroresServidor. 429 → mensaje de espera.
- RevisaTuEmailComponent: estado vacío con icono mail-check, "Revisa tu email" y el texto genérico ("Si los datos son correctos, te hemos enviado un enlace para verificar tu cuenta. Caduca en 24 horas."), botón "Reenviar" (POST /auth/reenviar-verificacion) que muestra un toast y respeta el 429, y enlace "Ir a iniciar sesión".
Pruebas: el login envía mantenerSesion=false por defecto y navega a volver; el registro no envía confirmarPassword y asigna errores del servidor a los campos.
```

### Comprobación

Con el backend y `npm start`:

1. Regístrate con un email nuevo → "Revisa tu email". Abre Mailpit y comprueba el correo (el enlace lo usa el paso 10).
2. Regístrate con contraseña `password123` → error del servidor en el campo (contraseña común).
3. Inicia sesión con una contraseña errónea 5 veces → aviso con el tiempo de espera.
4. Inicia sesión bien → `/bienvenida` (todavía no hay perfil).

```bash
npm run build
npm test
```

### Commit, push y pull request

```bash
git add .
git commit -m "feat(auth): pantallas de login y registro con consentimiento"
git push -u origin feature/09-login-registro
```

| Campo | Valor |
|---|---|
| **Título de la PR** | `Login y registro` |
| **Rama base** | `main` |

**Descripción de la PR** (pégala al crearla; la última línea cierra la issue):

```markdown
## Qué incluye
- [x] Crear `LoginComponent` (`DESIGN.md` §7.1) con "Mantener la sesión iniciada" y vuelta a `volver`
- [x] Crear `RegistroComponent` (§7.2) con medidor de robustez, confirmación de contraseña y los tres checkboxes obligatorios
- [x] Crear `RevisaTuEmailComponent` con "Reenviar" (y espera por `Retry-After`)
- [x] Crear los validadores `contrasenaSegura` y `coincideCon` y probarlos
- [x] Probar los dos formularios

## Cómo probarlo
- Un registro correcto lleva a "Revisa tu email" y el correo aparece en Mailpit (<http://localhost:8025>)
- Un registro con datos no válidos muestra el error del servidor debajo de cada campo
- Un login con credenciales incorrectas muestra "Email o contraseña incorrectos"; tras 5 intentos, el tiempo de espera y el botón desactivado
- Un login correcto navega a `volver` o a `/inicio` (y a `/bienvenida` si no hay perfil)

## Checklist
- [ ] `npm run build` termina sin errores
- [ ] `npm test` pasa
- [ ] No se sube ninguna contraseña, token ni `.env`

Closes #9
```

Después de fusionar: `git checkout main && git pull && git branch -d feature/09-login-registro`

---

## Paso 10 · Verificación del email y recuperación de la contraseña

### GitHub: issue y rama

| Campo | Valor |
|---|---|
| **Título de la issue** | `[Frontend] Verificar el email desde el enlace del correo, recuperar y restablecer la contraseña y aviso de email sin verificar` |
| **Rama** | `feature/10-verificacion-recuperacion` |

**Descripción de la issue** (cópiala en el campo *Description*):

```markdown
## Objetivo
Completar los flujos de los enlaces de los correos: verificar el email (también la confirmación de un cambio de email), pedir el correo de recuperación y elegir una contraseña nueva, leyendo el token del fragmento de la URL. Y avisar en la aplicación cuando el email no está verificado.

## Tareas
- [ ] Crear `VerificarEmailComponent` (comprobando → éxito o error con "Reenviar")
- [ ] Crear `RecuperarPasswordComponent` y `RestablecerPasswordComponent`
- [ ] Crear `leerTokenDelFragmento()` que lee `#token=…` y lo borra de la barra de direcciones
- [ ] Crear el aviso global "Verifica tu email" en el shell (con "Reenviar")
- [ ] Probar la lectura del token y las pantallas

## Criterios de aceptación
- [ ] El enlace del correo de verificación abre `/verificar-email`, verifica y muestra "Email verificado" (y el aviso del shell desaparece)
- [ ] Un enlace ya usado muestra "El enlace ha caducado o ya se ha usado" con "Reenviar"
- [ ] Recuperar contraseña muestra siempre el mismo mensaje y el enlace del correo permite elegir una nueva (después hay que iniciar sesión)
- [ ] El token no queda en la barra de direcciones ni en el historial

## Archivos
- `features/auth/verificar-email`: `verificar-email.component.*`
- `features/auth/recuperar`: `recuperar-password.component.*`, `restablecer-password.component.*`
- `core/util`: `token-fragmento.ts` (+ pruebas)
- `core/layout`: `aviso-cuenta.component.*` (aviso de email sin verificar en el shell)
- `core/services`: `cuenta.service.ts` (`obtener()` por ahora)

## Requiere del backend
`POST /auth/verificar-email`, `/auth/recuperar-password`, `/auth/restablecer-password`, `/auth/reenviar-verificacion`, `GET /cuenta` y Mailpit.

## Depende de
#9

## Guía
Paso 10 de `docs/Guia_Github_Frontend_NutriSport.md`.
```

```bash
git checkout main
git pull
git checkout -b feature/10-verificacion-recuperacion
```

### Qué se crea

- `features/auth/verificar-email`: `verificar-email.component.*`
- `features/auth/recuperar`: `recuperar-password.component.*`, `restablecer-password.component.*`
- `core/util`: `token-fragmento.ts` (+ pruebas)
- `core/layout`: `aviso-cuenta.component.*` (aviso de email sin verificar en el shell)
- `core/services`: `cuenta.service.ts` (`obtener()` por ahora)

### Ejecución (en orden)

#### Prompt 10.1 · Enlaces con token

```text
Lee solo docs/api/sesion-errores.md y docs/api/auth.md §2.2 (enlaces de los correos) y docs/DESIGN.md §7.18. Crea:
- core/util/token-fragmento.ts: leerTokenDelFragmento(route: ActivatedRoute): string | null lee "token=…" de route.snapshot.fragment (decodeURIComponent) y llama a history.replaceState para quitar el fragmento de la URL. Pruebas.
- core/services/cuenta.service.ts con obtener(): Observable<CuentaResponse> (GET /cuenta) que además llama a AuthService.actualizarCuenta. El resto de métodos llega en el paso 13.
- VerificarEmailComponent (/verificar-email, sin guard): al iniciar lee el token y llama a AuthService.verificarEmail; estados con signals: 'comprobando' (spinner), 'ok' (icono circle-check, "Email verificado", botón "Ir a mi panel" si hay sesión o "Iniciar sesión" si no; si hay sesión, refresca la cuenta con CuentaService.obtener()), 'error' (TOKEN_NO_VALIDO → "El enlace ha caducado o ya se ha usado" con un formulario de email para reenviar; EMAIL_EN_USO → "Ese email ya está en uso por otra cuenta"), 'sin-token' (enlace incompleto).
- RecuperarPasswordComponent (/recuperar-password): email → POST /auth/recuperar-password → siempre el mismo mensaje genérico ("Si existe una cuenta con ese email, te hemos enviado un enlace. Caduca en 30 minutos."); 429 con espera.
- RestablecerPasswordComponent (/restablecer-password): lee el token; nueva contraseña + confirmar (mismos validadores y medidor del registro) → POST /auth/restablecer-password → AuthService.cerrarSesionLocal(), toast "Contraseña cambiada. Inicia sesión con la nueva." y navega a /login. TOKEN_NO_VALIDO → mensaje y enlace a /recuperar-password.
```

#### Prompt 10.2 · Aviso de email sin verificar

```text
Crea core/layout/AvisoCuentaComponent y colócalo bajo la topbar del ShellComponent. Si AuthService.emailVerificado() es false muestra un ns-alert info compacto: "Verifica tu email para usar el análisis de fotos y el asistente" con el botón "Reenviar correo" (POST /auth/reenviar-verificacion con el email de la cuenta, toast y respeto del 429) y se puede cerrar durante la sesión (signal, sin persistir). En el paso 13 añadirás aquí el aviso de consentimiento revocado.
```

### Comprobación

1. Con el usuario del paso 9, abre el enlace del correo de Mailpit → "Email verificado". Vuelve a abrirlo → "El enlace ha caducado o ya se ha usado".
2. `/recuperar-password` con tu email → mensaje genérico → enlace del correo → contraseña nueva → login con la nueva.
3. Con un usuario sin verificar, el shell muestra el aviso; tras verificar y recargar, desaparece.

```bash
npm run build
npm test
```

### Commit, push y pull request

```bash
git add .
git commit -m "feat(auth): verificación de email, recuperación de contraseña y aviso de verificación"
git push -u origin feature/10-verificacion-recuperacion
```

| Campo | Valor |
|---|---|
| **Título de la PR** | `Verificación de email y recuperación de contraseña` |
| **Rama base** | `main` |

**Descripción de la PR** (pégala al crearla; la última línea cierra la issue):

```markdown
## Qué incluye
- [x] Crear `VerificarEmailComponent` (comprobando → éxito o error con "Reenviar")
- [x] Crear `RecuperarPasswordComponent` y `RestablecerPasswordComponent`
- [x] Crear `leerTokenDelFragmento()` que lee `#token=…` y lo borra de la barra de direcciones
- [x] Crear el aviso global "Verifica tu email" en el shell (con "Reenviar")
- [x] Probar la lectura del token y las pantallas

## Cómo probarlo
- El enlace del correo de verificación abre `/verificar-email`, verifica y muestra "Email verificado" (y el aviso del shell desaparece)
- Un enlace ya usado muestra "El enlace ha caducado o ya se ha usado" con "Reenviar"
- Recuperar contraseña muestra siempre el mismo mensaje y el enlace del correo permite elegir una nueva (después hay que iniciar sesión)
- El token no queda en la barra de direcciones ni en el historial

## Checklist
- [ ] `npm run build` termina sin errores
- [ ] `npm test` pasa
- [ ] No se sube ninguna contraseña, token ni `.env`

Closes #10
```

Después de fusionar: `git checkout main && git pull && git branch -d feature/10-verificacion-recuperacion`

---

## Paso 11 · Configuración inicial del perfil (onboarding)

### GitHub: issue y rama

| Campo | Valor |
|---|---|
| **Título de la issue** | `[Frontend] Configuración inicial del perfil en 4 pasos (datos, deporte, objetivo y alimentación) y resumen de objetivos calculados` |
| **Rama** | `feature/11-onboarding-perfil` |

**Descripción de la issue** (cópiala en el campo *Description*):

```markdown
## Objetivo
Obtener en menos de dos minutos los datos que el backend necesita para calcular los objetivos diarios y presentar el resultado (kcal y macros) con la explicación del cálculo y la opción de ajustarlo a mano. Sin perfil, el resto de la aplicación no funciona (`PERFIL_REQUERIDO`).

## Tareas
- [ ] Completar `PerfilService` (perfil, preferencias y objetivos) y crear `ActividadCatalogoService` (`/entrenamientos/tipos`) y `CategoriasService`
- [ ] Crear `OnboardingComponent` con `ns-stepper` de 4 pasos y un formulario tipado por paso
- [ ] Crear `SelectorPreferenciasComponent` (alérgenos, intolerancia, dietas, rechazados) reutilizable en Mi perfil
- [ ] Crear `ResumenObjetivosComponent` con anillo, barras de macros, "Cómo lo calculamos" y "Ajustar manualmente"
- [ ] Probar la conversión del formulario a `PerfilRequest` y `PreferenciasRequest`

## Criterios de aceptación
- [ ] Un usuario nuevo completa los 4 pasos, ve sus objetivos calculados y llega a `/inicio`
- [ ] La fecha de competición solo se pide (y es obligatoria) con el objetivo `COMPETICION`
- [ ] Los errores del servidor (p. ej. menor de 18 años) se muestran en su campo y llevan al paso donde está el campo
- [ ] Los avisos de `ObjetivosResponse.avisos` se muestran sin bloquear

## Archivos
- `core/services`: `perfil.service.ts` (completo), `tipos-actividad.service.ts`, `categorias.service.ts`, `alimentos.service.ts` (`buscar()` por ahora)
- `features/onboarding`: `onboarding.component.*`, `paso-sobre-ti.component.*`, `paso-deporte.component.*`, `paso-objetivo.component.*`, `paso-alimentacion.component.*`
- `features/perfil/componentes`: `selector-preferencias.component.*`, `resumen-objetivos.component.*`, `objetivos-manuales-dialog.component.*`
- `features/onboarding`: `perfil-form.ts` (formulario tipado y conversión, + pruebas)

## Requiere del backend
`GET /entrenamientos/tipos`, `GET /categorias?tipo=ALIMENTO`, `GET /alimentos`, `PUT /perfil`, `PUT /perfil/preferencias`, `GET/PUT /perfil/objetivos`.

## Depende de
#10

## Guía
Paso 11 de `docs/Guia_Github_Frontend_NutriSport.md`.
```

```bash
git checkout main
git pull
git checkout -b feature/11-onboarding-perfil
```

### Qué se crea

- `core/services`: `perfil.service.ts` (completo), `tipos-actividad.service.ts`, `categorias.service.ts`, `alimentos.service.ts` (`buscar()` por ahora)
- `features/onboarding`: `onboarding.component.*`, `paso-sobre-ti.component.*`, `paso-deporte.component.*`, `paso-objetivo.component.*`, `paso-alimentacion.component.*`
- `features/perfil/componentes`: `selector-preferencias.component.*`, `resumen-objetivos.component.*`, `objetivos-manuales-dialog.component.*`
- `features/onboarding`: `perfil-form.ts` (formulario tipado y conversión, + pruebas)

### Ejecución (en orden)

#### Prompt 11.1 · Servicios

```text
Lee solo en docs/api/perfil.md, docs/api/actividad.md y docs/api/alimentos.md §6 los endpoints de Perfil, Actividad (tipos) y Catálogo (categorías y búsqueda), y los tipos PerfilRequest/Response, PreferenciaDto, ObjetivosResponse y TipoActividadResponse. Crea o completa en src/app/core/services:
- PerfilService: obtener(), guardar(req: PerfilRequest) (marca creado), preferencias(), guardarPreferencias(lista: PreferenciaDto[]) (envía { preferencias }), objetivos(), fijarObjetivosManuales(req), volverAlCalculo() (DELETE /perfil/objetivos/manuales).
- TiposActividadService.listar(): Observable<TipoActividadResponse[]> con shareReplay (catálogo estático).
- CategoriasService.listar(tipo: TipoCategoria) con caché por tipo.
- AlimentosService.buscar(q, opciones { categoria?, page?, size? }): Observable<Pagina<AlimentoResumenResponse>> (no llama si q tiene menos de 2 caracteres; size máximo 50).
```

#### Prompt 11.2 · Asistente de 4 pasos

```text
Lee solo docs/DESIGN.md §7.3 y docs/api/perfil.md, docs/api/actividad.md y docs/api/alimentos.md §8 (validaciones de PerfilRequest, PreferenciaDto y ObjetivosManualesRequest). Crea en features/onboarding:
- perfil-form.ts: crearFormularioPerfil() con FormGroup tipados para cada paso y aPerfilRequest(valor) / aPreferencias(valor) que construyen EXACTAMENTE los DTO (sin campos extra; números como number; fechaCompeticion solo si el objetivo es COMPETICION). Pruebas de la conversión.
- OnboardingComponent (/bienvenida, pantalla completa con logo, ns-stepper y tarjeta central de 640 px, pie con "Atrás" / "Continuar" fijo abajo en móvil):
  1. Sobre ti (PasoSobreTiComponent): fecha de nacimiento (mayor de 18 años), sexo (ns-segmented), altura (120–230 cm), peso (30–250 kg) y % de grasa opcional (3–60).
  2. Tu deporte: deporte principal como rejilla de tarjetas seleccionables con los tipos de GET /entrenamientos/tipos agrupados por categoria (el valor es el codigo), días de entrenamiento por semana (ns-segmented 0–7), duración media en minutos y nivel de actividad FUERA del entrenamiento (con una frase que lo explique).
  3. Tu objetivo: 5 tarjetas grandes (ETIQUETAS_OBJETIVO con una línea de descripción); si es COMPETICION, fecha de competición obligatoria.
  4. Alimentación: SelectorPreferenciasComponent, comidas por día (3–6) y tiempo máximo de cocina opcional.
  Cada paso valida antes de avanzar. Al terminar: PUT /perfil, después PUT /perfil/preferencias y GET /perfil/objetivos, y muestra el ResumenObjetivosComponent. Si el servidor devuelve 400, aplica los errores y vuelve al primer paso con un campo erróneo.
- features/perfil/componentes/SelectorPreferenciasComponent (ControlValueAccessor de PreferenciaDto[]): chips de los 14 alérgenos (cada uno ALERGIA con severidad ESTRICTA por defecto y un conmutador a PREFERENCIA), intolerancia a la lactosa, dietas (VEGETARIANA, VEGANA, PESCETARIANA, HALAL, KOSHER con la nota de que las dos últimas no se filtran automáticamente) y alimentos rechazados con un combobox que busca con AlimentosService.buscar (debounce 250 ms) → RECHAZO con alimentoId. Respeta que cada tipo exige su campo (NutriSport_API.md, PUT /perfil/preferencias).
- features/perfil/componentes/ResumenObjetivosComponent: ns-ring de kcal, tres ns-progress-bar de proteína, hidratos y grasa en gramos, avisos (ns-alert warning), un desplegable "Cómo lo calculamos" con el desglose (edad, metabolismo basal, factor de actividad, gasto sin entreno, ajuste %) y el ns-disclaimer; botones "Ajustar manualmente" (ObjetivosManualesDialogComponent con kcal, proteína, hidratos y grasa → PUT /perfil/objetivos, muestra los avisos de la respuesta) e "Ir a mi panel" (/inicio).
```

### Comprobación

Con un usuario sin perfil: completa los 4 pasos, revisa el resumen y "Cómo lo calculamos", ajusta los objetivos a mano (prueba kcal = 900 → error de validación) y entra en el panel. Prueba también una fecha de nacimiento de hace 16 años → error en el campo y vuelta al paso 1.

```bash
npm run build
npm test
```

### Commit, push y pull request

```bash
git add .
git commit -m "feat(perfil): asistente de configuración inicial y resumen de objetivos"
git push -u origin feature/11-onboarding-perfil
```

| Campo | Valor |
|---|---|
| **Título de la PR** | `Configuración inicial del perfil` |
| **Rama base** | `main` |

**Descripción de la PR** (pégala al crearla; la última línea cierra la issue):

```markdown
## Qué incluye
- [x] Completar `PerfilService` (perfil, preferencias y objetivos) y crear `ActividadCatalogoService` (`/entrenamientos/tipos`) y `CategoriasService`
- [x] Crear `OnboardingComponent` con `ns-stepper` de 4 pasos y un formulario tipado por paso
- [x] Crear `SelectorPreferenciasComponent` (alérgenos, intolerancia, dietas, rechazados) reutilizable en Mi perfil
- [x] Crear `ResumenObjetivosComponent` con anillo, barras de macros, "Cómo lo calculamos" y "Ajustar manualmente"
- [x] Probar la conversión del formulario a `PerfilRequest` y `PreferenciasRequest`

## Cómo probarlo
- Un usuario nuevo completa los 4 pasos, ve sus objetivos calculados y llega a `/inicio`
- La fecha de competición solo se pide (y es obligatoria) con el objetivo `COMPETICION`
- Los errores del servidor (p. ej. menor de 18 años) se muestran en su campo y llevan al paso donde está el campo
- Los avisos de `ObjetivosResponse.avisos` se muestran sin bloquear

## Checklist
- [ ] `npm run build` termina sin errores
- [ ] `npm test` pasa
- [ ] No se sube ninguna contraseña, token ni `.env`

Closes #11
```

Después de fusionar: `git checkout main && git pull && git branch -d feature/11-onboarding-perfil`

---

## Paso 12 · Mi perfil, objetivos y registro de peso

### GitHub: issue y rama

| Campo | Valor |
|---|---|
| **Título de la issue** | `[Frontend] Pantalla Mi perfil con pestañas (datos físicos, deporte, objetivo y macros, alimentación), objetivos manuales y registro de pesajes` |
| **Rama** | `feature/12-mi-perfil` |

**Descripción de la issue** (cópiala en el campo *Description*):

```markdown
## Objetivo
Que el deportista revise y edite los datos que alimentan los cálculos, vea el efecto en sus objetivos, pueda fijarlos a mano o volver al cálculo automático y registre su peso.

## Tareas
- [ ] Crear `PerfilComponent` con cabecera y pestañas que reutilizan los pasos del onboarding
- [ ] Crear la tarjeta lateral de objetivos con "Objetivos manuales" (switch) y "Volver al cálculo automático"
- [ ] Crear `SeguimientoService` (pesajes) y `RegistrarPesoDialogComponent`
- [ ] Guardar por pestaña con aviso de recálculo

## Criterios de aceptación
- [ ] Cambiar el peso o el objetivo y guardar actualiza los objetivos de la tarjeta lateral (si no son manuales)
- [ ] Con objetivos manuales, la tarjeta lo indica y "Volver al cálculo automático" los recalcula
- [ ] Registrar un pesaje muestra un toast y, si es el más reciente, actualiza el peso del perfil

## Archivos
- `features/perfil`: `perfil.component.*`, `tarjeta-objetivos.component.*`
- `features/perfil/componentes`: `registrar-peso-dialog.component.*`
- `core/services`: `seguimiento.service.ts` (`registrarPeso`, `eliminarPeso`, `seriePeso`)
- `features/onboarding`: los pasos del onboarding adaptados para reutilizarse como pestañas

## Requiere del backend
`/perfil`, `/perfil/preferencias`, `/perfil/objetivos`, `DELETE /perfil/objetivos/manuales`, `POST /seguimiento/peso`.

## Depende de
#11

## Guía
Paso 12 de `docs/Guia_Github_Frontend_NutriSport.md`.
```

```bash
git checkout main
git pull
git checkout -b feature/12-mi-perfil
```

### Qué se crea

- `features/perfil`: `perfil.component.*`, `tarjeta-objetivos.component.*`
- `features/perfil/componentes`: `registrar-peso-dialog.component.*`
- `core/services`: `seguimiento.service.ts` (`registrarPeso`, `eliminarPeso`, `seriePeso`)
- `features/onboarding`: los pasos del onboarding adaptados para reutilizarse como pestañas

### Ejecución (en orden)

#### Prompt 12.1 · Servicio de seguimiento y diálogo de peso

```text
Lee solo en docs/api/seguimiento.md §6 los endpoints de Seguimiento (peso) y docs/DESIGN.md §7.18 («Registrar pesaje»). Crea:
- core/services/seguimiento.service.ts: registrarPeso(req: PesoRequest), eliminarPeso(id), seriePeso(desde, hasta) (máx. 366 días). El resumen, los insights y las estadísticas llegarán en sus pasos.
- features/perfil/componentes/RegistrarPesoDialogComponent (NsDialogService, tamaño sm): fecha (hoy por defecto, no futura) y peso en kg con un decimal (30–250). Al guardar: toast "Peso guardado" y devuelve el PesoResponse.
```

#### Prompt 12.2 · Pantalla Mi perfil

```text
Lee solo docs/DESIGN.md §7.5. Crea features/perfil/PerfilComponent (/perfil):
- Cabecera con avatar (iniciales del nombre de la cuenta), nombre, deporte principal (nombre del tipo de actividad) y objetivo (etiqueta).
- ns-tabs: Datos físicos · Deporte · Objetivo y macros · Alimentación. Reutiliza los componentes de los pasos del onboarding (ajústalos para que funcionen con un FormGroup recibido por input()). Cada pestaña tiene su botón "Guardar": las tres primeras hacen PUT /perfil con el perfil completo (aPerfilRequest) y la de alimentación PUT /perfil/preferencias junto con comidasPorDia y tiempoMaxCocinaMin (que van en el perfil). Tras guardar, recarga los objetivos y muestra un ns-alert info "Tus objetivos se han recalculado" si no son manuales. Avisa al salir con cambios sin guardar (CanDeactivate).
- TarjetaObjetivosComponent (lateral en escritorio, debajo en móvil): ns-ring pequeño de kcal, macros, badge "Manuales" si objetivosManuales, switch "Fijar objetivos manualmente" (abre ObjetivosManualesDialogComponent) y "Volver al cálculo automático" (DELETE /perfil/objetivos/manuales con confirmación), y el botón "Registrar peso".
```

### Comprobación

En `/perfil`: cambia el peso de 70 a 80 kg y guarda → las kcal de la tarjeta suben. Fija objetivos manuales y vuelve al cálculo. Registra un pesaje de hoy y comprueba que el peso de "Datos físicos" se actualiza al recargar.

```bash
npm run build
npm test
```

### Commit, push y pull request

```bash
git add .
git commit -m "feat(perfil): pantalla Mi perfil con objetivos y registro de peso"
git push -u origin feature/12-mi-perfil
```

| Campo | Valor |
|---|---|
| **Título de la PR** | `Mi perfil` |
| **Rama base** | `main` |

**Descripción de la PR** (pégala al crearla; la última línea cierra la issue):

```markdown
## Qué incluye
- [x] Crear `PerfilComponent` con cabecera y pestañas que reutilizan los pasos del onboarding
- [x] Crear la tarjeta lateral de objetivos con "Objetivos manuales" (switch) y "Volver al cálculo automático"
- [x] Crear `SeguimientoService` (pesajes) y `RegistrarPesoDialogComponent`
- [x] Guardar por pestaña con aviso de recálculo

## Cómo probarlo
- Cambiar el peso o el objetivo y guardar actualiza los objetivos de la tarjeta lateral (si no son manuales)
- Con objetivos manuales, la tarjeta lo indica y "Volver al cálculo automático" los recalcula
- Registrar un pesaje muestra un toast y, si es el más reciente, actualiza el peso del perfil

## Checklist
- [ ] `npm run build` termina sin errores
- [ ] `npm test` pasa
- [ ] No se sube ninguna contraseña, token ni `.env`

Closes #12
```

Después de fusionar: `git checkout main && git pull && git branch -d feature/12-mi-perfil`

---

## Paso 13 · Configuración: cuenta, seguridad y privacidad

### GitHub: issue y rama

| Campo | Valor |
|---|---|
| **Título de la issue** | `[Frontend] Configuración de la cuenta: datos y preferencias, contraseña, email, cerrar sesiones, consentimiento de datos de salud y eliminación de la cuenta` |
| **Rama** | `feature/13-configuracion-cuenta` |

**Descripción de la issue** (cópiala en el campo *Description*):

```markdown
## Objetivo
Dar al usuario el control de su cuenta y de su privacidad (RGPD): cambiar sus datos, su contraseña y su email, cerrar todas las sesiones, revocar o volver a dar el consentimiento de datos de salud y eliminar la cuenta, con las confirmaciones adecuadas.

## Tareas
- [ ] Completar `CuentaService` (actualizar, contraseña, email, consentimiento y eliminar)
- [ ] Crear `ConfiguracionComponent` con navegación secundaria: Cuenta · Seguridad · Privacidad y datos · Uso de IA
- [ ] Crear el aviso global de consentimiento revocado en el shell
- [ ] Confirmaciones destructivas con contraseña (eliminar cuenta)
- [ ] Probar el servicio

## Criterios de aceptación
- [ ] Cambiar la contraseña cierra la sesión y pide iniciarla con la nueva
- [ ] Cambiar el email muestra el mensaje genérico; el enlace del correo nuevo confirma el cambio (pantalla del paso 10)
- [ ] Revocar el consentimiento muestra el aviso global y las pantallas de datos de salud quedan bloqueadas; "Volver a dar el consentimiento" lo restablece
- [ ] Eliminar la cuenta (con contraseña) cierra la sesión y lleva a `/login` con un mensaje

## Archivos
- `core/services`: `cuenta.service.ts` (completo, + pruebas)
- `features/configuracion`: `configuracion.component.*`, `cuenta-datos.component.*`, `seguridad.component.*`, `privacidad.component.*`, `uso-ia.component.*`
- `core/layout`: `aviso-cuenta.component.*` (aviso de consentimiento revocado)

## Requiere del backend
`/cuenta`, `/cuenta/password`, `/cuenta/email`, `/cuenta/consentimiento-salud`, `DELETE /cuenta`, `POST /auth/logout-todas`.

## Depende de
#12

## Guía
Paso 13 de `docs/Guia_Github_Frontend_NutriSport.md`.
```

```bash
git checkout main
git pull
git checkout -b feature/13-configuracion-cuenta
```

### Qué se crea

- `core/services`: `cuenta.service.ts` (completo, + pruebas)
- `features/configuracion`: `configuracion.component.*`, `cuenta-datos.component.*`, `seguridad.component.*`, `privacidad.component.*`, `uso-ia.component.*`
- `core/layout`: `aviso-cuenta.component.*` (aviso de consentimiento revocado)

### Ejecución (en orden)

#### Prompt 13.1 · Servicio de cuenta

```text
Lee solo en docs/api/auth.md y docs/api/general.md §6 los endpoints de Cuenta y §4. Completa core/services/cuenta.service.ts: obtener(), actualizar(req: ActualizarCuentaRequest) (solo los campos cambiados), cambiarPassword(req), cambiarEmail(req), darConsentimiento(), revocarConsentimiento(), eliminar(req: EliminarCuentaRequest) (envía siempre inmediata). Cada operación que cambie la cuenta actualiza AuthService (vuelve a pedir GET /cuenta después del consentimiento). Pruebas con HttpTestingController (eliminar envía el cuerpo en un DELETE con { body }).
```

#### Prompt 13.2 · Pantalla de configuración

```text
Lee solo docs/DESIGN.md §7.16. Crea features/configuracion con rutas hijas (/configuracion/cuenta por defecto, /seguridad, /privacidad, /uso-ia) y una navegación secundaria lateral (en móvil, lista que abre cada sección):
- CuentaDatosComponent: nombre, unidades (solo "Métrico", deshabilitado con una nota) y switch "Recibir patrones detectados (insights)" (insightsActivos) → PATCH /cuenta.
- SeguridadComponent: cambiar contraseña (actual, nueva con medidor, confirmar) → PUT /cuenta/password → AuthService.cerrarSesionLocal(), toast y /login; cambiar email (nuevo email y contraseña) → mensaje genérico de la respuesta en un ns-alert; "Cerrar sesión en todos los dispositivos" con NsConfirmService → AuthService.logoutTodas(). Un error de contraseña incorrecta llega como VALIDACION en el campo passwordActual o password: aplícalo al control.
- PrivacidadComponent: estado del consentimiento de datos de salud (vigente o revocado), explicación de qué datos se tratan y qué se envía al proveedor de IA; "Revocar consentimiento" con NsConfirmService (peligro) que explica que se bloquean perfil, comidas, análisis, entrenamientos y seguimiento sin borrar datos; "Volver a dar el consentimiento" si está revocado. Zona de peligro (borde --ns-error-border): "Eliminar mi cuenta" con NsConfirmService pedirPassword y una casilla "Borrar todo inmediatamente (si no, se borra a los 30 días)" → DELETE /cuenta → cerrarSesionLocal, toast y /login. Deja un hueco "Exportar mis datos" que se activará en el paso 36.
- UsoIaComponent: los límites diarios (20 análisis de fotos y 50 mensajes al asistente), si el email está verificado y el ns-disclaimer de la IA (no hay endpoint de uso: Annex B de la guía).
En AvisoCuentaComponent añade, con prioridad sobre el de email, el aviso de consentimiento revocado (ns-alert warning, "Has revocado el consentimiento de datos de salud: tus datos están bloqueados" con el enlace a /configuracion/privacidad). Las pantallas que reciban 403 CONSENTIMIENTO_REVOCADO muestran un estado vacío con ese mismo enlace.
```

### Comprobación

1. Cambia el nombre → se ve en la sidebar.
2. Revoca el consentimiento → aviso global; abre `/perfil` → estado bloqueado. Vuelve a darlo → todo funciona.
3. Cambia la contraseña → te pide iniciar sesión.
4. Con un usuario de prueba desechable: elimina la cuenta con borrado inmediato → `/login`; ese email ya no puede iniciar sesión.

```bash
npm run build
npm test
```

### Commit, push y pull request

```bash
git add .
git commit -m "feat(cuenta): configuración de cuenta, seguridad, consentimiento y eliminación"
git push -u origin feature/13-configuracion-cuenta
```

| Campo | Valor |
|---|---|
| **Título de la PR** | `Configuración de la cuenta` |
| **Rama base** | `main` |

**Descripción de la PR** (pégala al crearla; la última línea cierra la issue):

```markdown
## Qué incluye
- [x] Completar `CuentaService` (actualizar, contraseña, email, consentimiento y eliminar)
- [x] Crear `ConfiguracionComponent` con navegación secundaria: Cuenta · Seguridad · Privacidad y datos · Uso de IA
- [x] Crear el aviso global de consentimiento revocado en el shell
- [x] Confirmaciones destructivas con contraseña (eliminar cuenta)
- [x] Probar el servicio

## Cómo probarlo
- Cambiar la contraseña cierra la sesión y pide iniciarla con la nueva
- Cambiar el email muestra el mensaje genérico; el enlace del correo nuevo confirma el cambio (pantalla del paso 10)
- Revocar el consentimiento muestra el aviso global y las pantallas de datos de salud quedan bloqueadas; "Volver a dar el consentimiento" lo restablece
- Eliminar la cuenta (con contraseña) cierra la sesión y lleva a `/login` con un mensaje

## Checklist
- [ ] `npm run build` termina sin errores
- [ ] `npm test` pasa
- [ ] No se sube ninguna contraseña, token ni `.env`

Closes #13
```

Después de fusionar: `git checkout main && git pull && git branch -d feature/13-configuracion-cuenta`

---

## Paso 14 · Buscador de alimentos y alimentos propios

### GitHub: issue y rama

| Campo | Valor |
|---|---|
| **Título de la issue** | `[Frontend] Servicio del catálogo, combobox de búsqueda de alimentos, recientes y frecuentes, ficha de alimento y gestión de mis alimentos` |
| **Rama** | `feature/14-catalogo-alimentos` |

**Descripción de la issue** (cópiala en el campo *Description*):

```markdown
## Objetivo
Tener las piezas de catálogo que usan el registro de comidas y el resto de pantallas: un buscador rápido y tolerante a errores, la ficha de un alimento con sus valores por 100 g, porciones y alérgenos, y la gestión de los alimentos privados del usuario.

## Tareas
- [ ] Completar `AlimentosService` (detalle, recientes, frecuentes, crear, editar y eliminar)
- [ ] Crear `ns-combobox` genérico (patrón ARIA combobox) y `BuscadorAlimentosComponent`
- [ ] Crear `FichaAlimentoComponent` (`ns-nutrition-facts`, porciones, alérgenos, fuente)
- [ ] Crear `MisAlimentosComponent` y `AlimentoFormComponent` (drawer)
- [ ] Probar el combobox y el formulario de alimento

## Criterios de aceptación
- [ ] Escribir "pollo" muestra resultados en menos de un segundo; "polo" también encuentra pollo
- [ ] No se lanza ninguna búsqueda con menos de 2 caracteres y se cancela la anterior al seguir escribiendo
- [ ] Un alimento propio nuevo aparece en la búsqueda del usuario (y no en la de otros usuarios)
- [ ] Eliminar un alimento ya usado solo lo desactiva (el historial lo conserva)

## Archivos
- `core/services`: `alimentos.service.ts` (completo, + pruebas)
- `shared/ui/form`: `combobox.component.*`
- `shared/ui/data`: `nutrition-facts.component.*`, `source-badge.component.*`, `allergen-list.component.*`
- `features/alimentos`: `buscador-alimentos.component.*`, `ficha-alimento.component.*`, `mis-alimentos.component.*`, `alimento-form.component.*`

## Requiere del backend
`GET /alimentos`, `/alimentos/recientes`, `/alimentos/frecuentes`, `GET/POST/PUT/DELETE /alimentos/{id}`, `GET /categorias`.

## Depende de
#13

## Guía
Paso 14 de `docs/Guia_Github_Frontend_NutriSport.md`.
```

```bash
git checkout main
git pull
git checkout -b feature/14-catalogo-alimentos
```

### Qué se crea

- `core/services`: `alimentos.service.ts` (completo, + pruebas)
- `shared/ui/form`: `combobox.component.*`
- `shared/ui/data`: `nutrition-facts.component.*`, `source-badge.component.*`, `allergen-list.component.*`
- `features/alimentos`: `buscador-alimentos.component.*`, `ficha-alimento.component.*`, `mis-alimentos.component.*`, `alimento-form.component.*`

### Ejecución (en orden)

#### Prompt 14.1 · Servicio y componentes de catálogo

```text
Lee solo en docs/api/alimentos.md y docs/api/comidas.md §6 los endpoints de Catálogo, §7.2 y los tipos AlimentoResumenResponse, AlimentoResponse, AlimentoRequest y PorcionCasera; y docs/DESIGN.md §5.4, §5.16 y §7.6. Crea:
- AlimentosService completo: buscar (ya existe), detalle(id) con caché en memoria, recientes(), frecuentes(), crear(req), editar(id, req), eliminar(id).
- shared/ui/form/NsComboboxComponent<T> (patrón ARIA combobox con listbox): input() buscar: (texto) => Observable<T[]>, plantilla de opción (ng-template), debounce 250 ms, distinctUntilChanged, switchMap (cancela la anterior), mínimo de caracteres, estados cargando / sin resultados / error, flechas, Enter y Escape; output() seleccionado.
- shared/ui/data/NsNutritionFactsComponent (tabla "por 100 g/ml" con kcal, proteínas, hidratos, de los cuales azúcares, grasas, de las cuales saturadas, fibra y sal; las nulas como "—"), NsSourceBadgeComponent (fuente: BEDCA, USDA, Open Food Facts, NutriSport, Propio) y NsAllergenListComponent (contiene, trazas y "Alérgenos sin revisar" si alergenosRevisados = false).
- features/alimentos/BuscadorAlimentosComponent: el combobox de alimentos con resultados que muestran nombre, marca, kcal/100 g y el source-badge; pestañas Resultados · Recientes · Frecuentes · Mis alimentos (input() modo 'lista' o 'combobox'); output() elegido(AlimentoResumenResponse).
- features/alimentos/FichaAlimentoComponent: detalle con NsNutritionFacts, porciones caseras, alérgenos, aptitudes (vegano, vegetariano, pescetariano, sin lactosa) y fuente.
Pruebas del combobox (no busca con 1 carácter, cancela la búsqueda anterior).
```

#### Prompt 14.2 · Mis alimentos

```text
Crea features/alimentos/MisAlimentosComponent (/mis-alimentos). La API no tiene un listado de "mis alimentos": GET /alimentos exige q (2–60 caracteres) y devuelve los públicos y los privados propios, y los privados se reconocen por fuente = USUARIO. Muestra un buscador que filtra los resultados con fuente = USUARIO y, sin texto, los de GET /alimentos/recientes y /frecuentes con esa fuente (explícalo en un texto de ayuda). Botón "Crear alimento" que abre AlimentoFormComponent en un NsDrawerComponent:
- AlimentoFormComponent: nombre, marca, categoría (GET /categorias?tipo=ALIMENTO, con jerarquía), preparación, unidad base (G o ML), valores por 100 (kcal 0–900 y el resto 0–100; azúcares ≤ hidratos y saturadas ≤ grasas como avisos), porciones caseras (FormArray, hasta 20, nombre y gramos), alérgenos que contiene y trazas (chips), contiene lactosa y aptitudes (vegano marca vegetariano y pescetariano automáticamente). Envía AlimentoRequest con todos los booleanos.
- Editar y eliminar (NsConfirmService: "Si ya lo has usado en alguna comida, se desactivará y el historial lo conservará").
Añade "Mis alimentos" al grupo Principal de la sidebar.
```

### Comprobación

En `/mis-alimentos` crea "Batido de proteína casero" con una porción "vaso" de 300 g. Búscalo con una falta de ortografía. Edítalo y elimínalo. Con otro usuario, comprueba que no lo ve.

```bash
npm run build
npm test
```

### Commit, push y pull request

```bash
git add .
git commit -m "feat(alimentos): buscador del catálogo, ficha de alimento y mis alimentos"
git push -u origin feature/14-catalogo-alimentos
```

| Campo | Valor |
|---|---|
| **Título de la PR** | `Buscador de alimentos y alimentos propios` |
| **Rama base** | `main` |

**Descripción de la PR** (pégala al crearla; la última línea cierra la issue):

```markdown
## Qué incluye
- [x] Completar `AlimentosService` (detalle, recientes, frecuentes, crear, editar y eliminar)
- [x] Crear `ns-combobox` genérico (patrón ARIA combobox) y `BuscadorAlimentosComponent`
- [x] Crear `FichaAlimentoComponent` (`ns-nutrition-facts`, porciones, alérgenos, fuente)
- [x] Crear `MisAlimentosComponent` y `AlimentoFormComponent` (drawer)
- [x] Probar el combobox y el formulario de alimento

## Cómo probarlo
- Escribir "pollo" muestra resultados en menos de un segundo; "polo" también encuentra pollo
- No se lanza ninguna búsqueda con menos de 2 caracteres y se cancela la anterior al seguir escribiendo
- Un alimento propio nuevo aparece en la búsqueda del usuario (y no en la de otros usuarios)
- Eliminar un alimento ya usado solo lo desactiva (el historial lo conserva)

## Checklist
- [ ] `npm run build` termina sin errores
- [ ] `npm test` pasa
- [ ] No se sube ninguna contraseña, token ni `.env`

Closes #14
```

Después de fusionar: `git checkout main && git pull && git branch -d feature/14-catalogo-alimentos`

---

## Paso 15 · Registro manual de comidas

### GitHub: issue y rama

| Campo | Valor |
|---|---|
| **Título de la issue** | `[Frontend] Registro manual de comidas: buscador, comida en construcción con cantidades y unidades caseras, totales, avisos de restricciones y edición` |
| **Rama** | `feature/15-registro-comidas` |

**Descripción de la issue** (cópiala en el campo *Description*):

```markdown
## Objetivo
Añadir alimentos a una comida de la forma más rápida posible (`DESIGN.md` §7.6): buscar, ajustar cantidad y unidad (gramos o porciones caseras), ver la estimación de totales y guardar, con los avisos de restricciones del backend y la opción de editar una comida existente.

## Tareas
- [ ] Crear `ComidasService` (registrar, detalle, editar, eliminar, duplicar, historial y día)
- [ ] Crear `ComidaEditorStore` (signals) con la comida en construcción
- [ ] Crear `RegistroComidaComponent` (5 + 7 columnas; resumen fijo y *bottom sheet* en móvil)
- [ ] Crear "Copiar comida anterior" y el modo edición (`/comidas/:id/editar`)
- [ ] Probar el store y la conversión a `RegistroComidaRequest`

## Criterios de aceptación
- [ ] Se puede registrar una comida con tres alimentos, uno de ellos en una porción casera ("plato")
- [ ] Tras guardar aparece el toast "Comida guardada · 642 kcal · Deshacer" (deshacer la elimina)
- [ ] Si un alimento choca con una restricción estricta, la respuesta muestra el aviso (sin bloquear)
- [ ] `/comidas/:id/editar` carga la comida y `PUT` la sustituye entera
- [ ] La fecha no puede ser posterior a mañana

## Archivos
- `core/services`: `comidas.service.ts` (+ pruebas)
- `features/comidas/registro`: `registro-comida.component.*`, `comida-editor.store.ts` (+ pruebas), `linea-alimento.component.*`, `totales-comida.component.*`, `copiar-comida-dialog.component.*`

## Requiere del backend
`POST /comidas`, `GET/PUT /comidas/{id}`, `GET /alimentos/{id}`, `POST /comidas/{id}/duplicar`, `GET /comidas?desde=&hasta=`.

## Depende de
#14

## Guía
Paso 15 de `docs/Guia_Github_Frontend_NutriSport.md`.
```

```bash
git checkout main
git pull
git checkout -b feature/15-registro-comidas
```

### Qué se crea

- `core/services`: `comidas.service.ts` (+ pruebas)
- `features/comidas/registro`: `registro-comida.component.*`, `comida-editor.store.ts` (+ pruebas), `linea-alimento.component.*`, `totales-comida.component.*`, `copiar-comida-dialog.component.*`

### Ejecución (en orden)

#### Prompt 15.1 · Servicio y store

```text
Lee solo en docs/api/comidas.md y docs/api/alimentos.md §6 los endpoints de Comidas, §7.2 y §8 (RegistroComidaRequest y AlimentoRegistradoRequest). Crea:
- core/services/comidas.service.ts: registrar(req), detalle(id), editar(id, req), eliminar(id), duplicar(id, req), historial(desde, hasta, tipo?) (máx. 92 días), dia(fecha).
- features/comidas/registro/comida-editor.store.ts (servicio con signals, provisto en el componente): fecha (hoy), hora (ahora, "HH:mm"), tipoComida (sugerido por la hora: antes de 11 DESAYUNO, 11–13 MEDIA_MANANA, 13–16 COMIDA, 16–19 MERIENDA, después CENA), notas y lineas[] con { alimento: AlimentoResponse, cantidad, unidad }. Acciones: anadir(alimento) (si ya está, suma 100 g), quitar(i), cambiarCantidad, cambiarUnidad, cargarDesde(RegistroComidaResponse), vaciar(). computed: estimacion (suma con kcal100 y la cantidad en gramos según la unidad: g, kg, ml, l o los gramos de la porción), marcada como estimación hasta que responda el servidor; aRequest(): RegistroComidaRequest (solo alimentoId, cantidad, unidad; hasta 40 líneas).
Pruebas del store: estimación con porciones, sugerencia de tipo por hora y request sin propiedades extra.
```

#### Prompt 15.2 · Pantalla de registro

```text
Lee solo docs/DESIGN.md §7.6. Crea features/comidas/registro/RegistroComidaComponent (/comidas/nueva y /comidas/:id/editar; lee queryParams tipoComida y fecha para venir desde el dashboard):
- Izquierda (5 col): fecha (máximo mañana), hora, tipo de comida (ns-select con los 8 tipos), accesos "Foto del plato" (variante ai, va a /comidas/foto con el tipo) y "Copiar comida anterior" (CopiarComidaDialogComponent: comidas de los últimos 7 días con historial() → al elegir, carga sus alimentos en el store); y BuscadorAlimentosComponent en modo lista. Al elegir un alimento, pide su detalle (para las porciones) y lo añade.
- Derecha (7 col): "Tu comida" con LineaAlimentoComponent por alimento (nombre, ns-quantity-input, selector de unidad con g/ml y las porciones del alimento, kcal estimadas y quitar) y TotalesComidaComponent (kcal y mini barras de macros, con el texto "Estimación" hasta guardar), notas (máx. 500) y botón "Guardar comida".
- Al guardar: POST (o PUT en edición). Si la respuesta trae avisos, muéstralos en un diálogo o ns-alert antes de salir. Toast "Comida guardada · {totales.kcal} kcal" con acción "Deshacer" (DELETE /comidas/{id}) y navega a /inicio (o a donde indique volver). 400 → errores en la línea correspondiente (alimentos[i].cantidad).
- Móvil: buscador arriba y resumen fijo inferior ("3 alimentos · 642 kcal · Ver comida") que abre un bottom sheet con la comida.
- Aviso de salida con cambios sin guardar. Estado vacío de la comida: "Busca un alimento para empezar".
```

### Comprobación

Registra un desayuno con avena (40 g), leche (1 vaso si existe la porción, o 250 ml) y plátano. Comprueba el aviso si en tu perfil marcaste alergia estricta a algún alimento que añadas. Usa "Deshacer". Edita una comida y cámbiale una cantidad.

```bash
npm run build
npm test
```

### Commit, push y pull request

```bash
git add .
git commit -m "feat(comidas): registro manual de comidas con unidades caseras y avisos"
git push -u origin feature/15-registro-comidas
```

| Campo | Valor |
|---|---|
| **Título de la PR** | `Registro manual de comidas` |
| **Rama base** | `main` |

**Descripción de la PR** (pégala al crearla; la última línea cierra la issue):

```markdown
## Qué incluye
- [x] Crear `ComidasService` (registrar, detalle, editar, eliminar, duplicar, historial y día)
- [x] Crear `ComidaEditorStore` (signals) con la comida en construcción
- [x] Crear `RegistroComidaComponent` (5 + 7 columnas; resumen fijo y *bottom sheet* en móvil)
- [x] Crear "Copiar comida anterior" y el modo edición (`/comidas/:id/editar`)
- [x] Probar el store y la conversión a `RegistroComidaRequest`

## Cómo probarlo
- Se puede registrar una comida con tres alimentos, uno de ellos en una porción casera ("plato")
- Tras guardar aparece el toast "Comida guardada · 642 kcal · Deshacer" (deshacer la elimina)
- Si un alimento choca con una restricción estricta, la respuesta muestra el aviso (sin bloquear)
- `/comidas/:id/editar` carga la comida y `PUT` la sustituye entera
- La fecha no puede ser posterior a mañana

## Checklist
- [ ] `npm run build` termina sin errores
- [ ] `npm test` pasa
- [ ] No se sube ninguna contraseña, token ni `.env`

Closes #15
```

Después de fusionar: `git checkout main && git pull && git branch -d feature/15-registro-comidas`

---

## Paso 16 · Historial de comidas

### GitHub: issue y rama

| Campo | Valor |
|---|---|
| **Título de la issue** | `[Frontend] Historial de comidas agrupado por días con totales frente al objetivo, filtros, detalle, duplicar y eliminar con deshacer` |
| **Rama** | `feature/16-historial-comidas` |

**Descripción de la issue** (cópiala en el campo *Description*):

```markdown
## Objetivo
Consultar y gestionar las comidas pasadas (`DESIGN.md` §7.9): lista por días con su total, filtros por fechas, tipo y origen, detalle de una comida y las acciones de editar, duplicar en otra fecha y eliminar con "Deshacer".

## Tareas
- [ ] Crear `HistorialComidasComponent` con rango de fechas (máx. 92 días) y "Cargar 30 días más"
- [ ] Crear `MealCardComponent` reutilizable (lo usa también el dashboard)
- [ ] Crear `DetalleComidaComponent` (diálogo o drawer) y `DuplicarComidaDialogComponent`
- [ ] Eliminar con deshacer (vuelve a crear la comida con sus alimentos)

## Criterios de aceptación
- [ ] El historial muestra los días con comidas, cada uno con su total de kcal
- [ ] Filtrar por tipo usa el parámetro `tipo` del servidor y por origen se filtra en el cliente
- [ ] Duplicar en otra fecha crea una comida con origen `COPIA`
- [ ] Eliminar muestra "Comida eliminada · Deshacer" y deshacer la recupera

## Archivos
- `features/comidas/historial`: `historial-comidas.component.*`, `filtros-historial.component.*`
- `features/comidas/componentes`: `meal-card.component.*`, `detalle-comida.component.*`, `duplicar-comida-dialog.component.*`

## Requiere del backend
`GET /comidas`, `GET /comidas/{id}`, `POST /comidas/{id}/duplicar`, `DELETE /comidas/{id}`, `POST /comidas`.

## Depende de
#15

## Guía
Paso 16 de `docs/Guia_Github_Frontend_NutriSport.md`.
```

```bash
git checkout main
git pull
git checkout -b feature/16-historial-comidas
```

### Qué se crea

- `features/comidas/historial`: `historial-comidas.component.*`, `filtros-historial.component.*`
- `features/comidas/componentes`: `meal-card.component.*`, `detalle-comida.component.*`, `duplicar-comida-dialog.component.*`

### Ejecución (en orden)

#### Prompt 16.1 · Tarjeta de comida y detalle

```text
Lee solo docs/DESIGN.md §5.5 (tarjeta meal) y §7.9. Crea en features/comidas/componentes:
- MealCardComponent (input comida: RegistroComidaResponse): icono del tipo de comida, tipo y hora, nombres de los alimentos (resumidos: "Avena, leche y plátano"), kcal y P/HC/G, badge "Foto" si origen = FOTO (y "Plan", "Receta", "Copia" para los demás), menú contextual (Ver, Editar, Duplicar, Eliminar) con outputs.
- DetalleComidaComponent (NsDialogService): alimentos con cantidad, unidad, gramos y nutrientes, totales, notas, avisos y, en las de foto, "Estimación IA" con la confianza de cada alimento.
- DuplicarComidaDialogComponent: fecha (hoy por defecto, máximo mañana) y tipo de comida opcional → POST /comidas/{id}/duplicar.
```

#### Prompt 16.2 · Historial

```text
Crea features/comidas/historial/HistorialComidasComponent (/comidas):
- Filtros: rango de fechas (por defecto los últimos 30 días, como mucho 92), tipo de comida (parámetro tipo del servidor) y origen (chips: manual, foto, plan… filtrado en el cliente). En móvil, los filtros en un bottom sheet.
- Resumen del periodo: media de kcal por día con comidas y número de días registrados.
- Lista agrupada por día (ComidasDiaResponse) con cabecera (fecha larga y total kcal) y las MealCardComponent; "Cargar 30 días más" amplía el rango hacia atrás.
- Acciones: Ver (detalle), Editar (/comidas/:id/editar), Duplicar, Eliminar: quita la tarjeta al momento, hace DELETE y muestra el toast "Comida eliminada" con "Deshacer", que vuelve a registrarla con POST /comidas construyendo el RegistroComidaRequest a partir de la respuesta (alimentoId, cantidad, unidad, fecha, hora, tipo y notas).
- Estados: cargando (skeleton), vacío ("Aún no hay comidas en estas fechas" con "Registrar comida") y error.
```

### Comprobación

Registra comidas en tres días distintos (pasados), filtra por "Cena", duplica una en mañana y elimina otra con "Deshacer".

```bash
npm run build
npm test
```

### Commit, push y pull request

```bash
git add .
git commit -m "feat(comidas): historial por días con detalle, duplicado y eliminación"
git push -u origin feature/16-historial-comidas
```

| Campo | Valor |
|---|---|
| **Título de la PR** | `Historial de comidas` |
| **Rama base** | `main` |

**Descripción de la PR** (pégala al crearla; la última línea cierra la issue):

```markdown
## Qué incluye
- [x] Crear `HistorialComidasComponent` con rango de fechas (máx. 92 días) y "Cargar 30 días más"
- [x] Crear `MealCardComponent` reutilizable (lo usa también el dashboard)
- [x] Crear `DetalleComidaComponent` (diálogo o drawer) y `DuplicarComidaDialogComponent`
- [x] Eliminar con deshacer (vuelve a crear la comida con sus alimentos)

## Cómo probarlo
- El historial muestra los días con comidas, cada uno con su total de kcal
- Filtrar por tipo usa el parámetro `tipo` del servidor y por origen se filtra en el cliente
- Duplicar en otra fecha crea una comida con origen `COPIA`
- Eliminar muestra "Comida eliminada · Deshacer" y deshacer la recupera

## Checklist
- [ ] `npm run build` termina sin errores
- [ ] `npm test` pasa
- [ ] No se sube ninguna contraseña, token ni `.env`

Closes #16
```

Después de fusionar: `git checkout main && git pull && git branch -d feature/16-historial-comidas`

---

## Paso 17 · Actividad deportiva

### GitHub: issue y rama

| Campo | Valor |
|---|---|
| **Título de la issue** | `[Frontend] Actividad: entrenamientos realizados y planificados con gasto estimado, KPIs y carga de la semana, filtros y formulario de alta y edición` |
| **Rama** | `feature/17-actividad` |

**Descripción de la issue** (cópiala en el campo *Description*):

```markdown
## Objetivo
Registrar entrenamientos realizados y planificados (`DESIGN.md` §7.13) y ver la semana de un vistazo, sabiendo que cada cambio recalcula el objetivo diario en el backend.

## Tareas
- [ ] Crear `EntrenamientosService`
- [ ] Crear `ActividadComponent` con KPIs de la semana, carga por día y lista de próximos y realizados
- [ ] Crear `EntrenamientoFormComponent` (diálogo) con tipo, estado, fecha y hora, duración, intensidad, RPE, distancia y notas
- [ ] Marcar como realizado u omitido, editar y eliminar
- [ ] Probar la conversión del formulario

## Criterios de aceptación
- [ ] Un entrenamiento futuro se guarda como `PLANIFICADO` y no se puede marcar como realizado hasta su fecha
- [ ] La lista muestra las kcal estimadas que calcula el backend
- [ ] Marcar un planificado de hoy como realizado actualiza la lista y los KPIs
- [ ] Sin perfil, el backend responde 422 y la pantalla lleva al onboarding

## Archivos
- `core/services`: `entrenamientos.service.ts` (+ pruebas)
- `features/actividad`: `actividad.component.*`, `kpis-semana.component.*`, `carga-semana.component.*`, `entrenamiento-item.component.*`, `entrenamiento-form.component.*`

## Requiere del backend
`GET/POST /entrenamientos`, `PUT/DELETE /entrenamientos/{id}`, `GET /entrenamientos/tipos`.

## Depende de
#16

## Guía
Paso 17 de `docs/Guia_Github_Frontend_NutriSport.md`.
```

```bash
git checkout main
git pull
git checkout -b feature/17-actividad
```

### Qué se crea

- `core/services`: `entrenamientos.service.ts` (+ pruebas)
- `features/actividad`: `actividad.component.*`, `kpis-semana.component.*`, `carga-semana.component.*`, `entrenamiento-item.component.*`, `entrenamiento-form.component.*`

### Ejecución (en orden)

#### Prompt 17.1 · Servicio y formulario

```text
Lee solo en docs/api/actividad.md §6 los endpoints de Actividad y §8 (EntrenamientoRequest). Crea:
- core/services/entrenamientos.service.ts: listar(desde, hasta, estado?) (máx. 92 días), crear(req), editar(id, req) (PUT sustituye todo), eliminar(id), marcarEstado(e: EntrenamientoResponse, estado) que reenvía el entrenamiento completo con el estado nuevo (construye el EntrenamientoRequest a partir de la respuesta).
- features/actividad/EntrenamientoFormComponent (NsDialogService md, bottom sheet en móvil): tipo de actividad (NsCombobox o select agrupado por categoría de GET /entrenamientos/tipos, valor = codigo), estado (ns-segmented Planificado / Realizado; Realizado deshabilitado si la fecha es futura), fecha y hora (datetime-local convertido a ISO con la zona local, p. ej. "2026-11-25T18:30:00+01:00"), duración (1–600 min), intensidad (ns-segmented Baja / Media / Alta), RPE 1–10 (input range con su valor visible) solo si es Realizado, distancia en km opcional y notas (máx. 500). Pruebas de la conversión a EntrenamientoRequest (zona horaria incluida).
```

#### Prompt 17.2 · Pantalla de actividad

```text
Lee solo docs/DESIGN.md §7.13. Crea features/actividad/ActividadComponent (/actividad):
- Navegación por semanas (lunes a domingo; ‹ 23–29 nov ›).
- KpisSemanaComponent: sesiones realizadas, minutos, kcal estimadas y carga (suma de duración × RPE) con ns-metric (carrusel horizontal en móvil).
- CargaSemanaComponent: barras por día (CSS, sin ECharts) con el color por intensidad y patrón o texto para no depender solo del color.
- Lista "Próximos" (PLANIFICADO) y "Realizados" con EntrenamientoItemComponent: icono activity, tipo, fecha y hora, duración, intensidad, kcal estimadas y estado; acciones Marcar como realizado (solo si la fecha ya ha llegado), Omitir, Editar y Eliminar (confirmación).
- Filtro por tipo de actividad (en el cliente).
- Botón "Registrar entrenamiento". Tras crear, editar o borrar, toast "Tu objetivo de hoy se ha actualizado" si afecta a hoy.
- 422 PERFIL_REQUERIDO → navega a /bienvenida.
```

### Comprobación

Planifica un entrenamiento para mañana y registra uno realizado hoy. Comprueba las kcal estimadas, márcalo como omitido y vuelve a realizado. Cambia de semana.

```bash
npm run build
npm test
```

### Commit, push y pull request

```bash
git add .
git commit -m "feat(actividad): entrenamientos con KPIs semanales y formulario"
git push -u origin feature/17-actividad
```

| Campo | Valor |
|---|---|
| **Título de la PR** | `Actividad deportiva` |
| **Rama base** | `main` |

**Descripción de la PR** (pégala al crearla; la última línea cierra la issue):

```markdown
## Qué incluye
- [x] Crear `EntrenamientosService`
- [x] Crear `ActividadComponent` con KPIs de la semana, carga por día y lista de próximos y realizados
- [x] Crear `EntrenamientoFormComponent` (diálogo) con tipo, estado, fecha y hora, duración, intensidad, RPE, distancia y notas
- [x] Marcar como realizado u omitido, editar y eliminar
- [x] Probar la conversión del formulario

## Cómo probarlo
- Un entrenamiento futuro se guarda como `PLANIFICADO` y no se puede marcar como realizado hasta su fecha
- La lista muestra las kcal estimadas que calcula el backend
- Marcar un planificado de hoy como realizado actualiza la lista y los KPIs
- Sin perfil, el backend responde 422 y la pantalla lleva al onboarding

## Checklist
- [ ] `npm run build` termina sin errores
- [ ] `npm test` pasa
- [ ] No se sube ninguna contraseña, token ni `.env`

Closes #17
```

Después de fusionar: `git checkout main && git pull && git branch -d feature/17-actividad`

---

## Paso 18 · Dashboard diario con gráficos

### GitHub: issue y rama

| Campo | Valor |
|---|---|
| **Título de la issue** | `[Frontend] Dashboard: energía y macros del día frente al objetivo, comidas de hoy, entrenamiento, gráfico semanal de kcal y peso con media móvil (ECharts)` |
| **Rama** | `feature/18-dashboard` |

**Descripción de la issue** (cópiala en el campo *Description*):

```markdown
## Objetivo
Responder en cinco segundos "¿cómo voy hoy y qué hago ahora?" (`DESIGN.md` §7.4): energía consumida frente al objetivo (con el gasto del entrenamiento), macros, comidas por franja, entrenamiento del día, la semana en un gráfico y la evolución del peso.

## Tareas
- [ ] Instalar `echarts` y `ngx-echarts` y crear `ns-chart` con el tema de `DESIGN.md` §9.6
- [ ] Completar `SeguimientoService.resumen(fecha?)`
- [ ] Crear `DashboardComponent` con la tira de fechas y sus tarjetas: energía, macros, comidas de hoy, entrenamiento, semana y peso
- [ ] Estados vacío, de carga y de error, y alternativa textual de los gráficos

## Criterios de aceptación
- [ ] Con comidas registradas, el anillo muestra lo consumido, lo restante y el anillo interior del entreno, y las barras de macros sus gramos
- [ ] Sin comidas hoy, el anillo muestra todo el objetivo como restante y aparece "Aún no has registrado comidas hoy"
- [ ] La tira de fechas cambia de día y recarga el resumen
- [ ] El gráfico semanal marca el objetivo de cada día y los días de entreno; el del peso muestra la media móvil de 7 días
- [ ] Cada gráfico tiene una descripción accesible (tabla oculta o `aria-label` con los datos)

## Archivos
- `shared/design`: `echarts-theme.ts`
- `shared/ui/data`: `chart.component.*` (envoltorio de `ngx-echarts`)
- `features/dashboard`: `dashboard.component.*`, `tarjeta-energia.component.*`, `tarjeta-macro.component.*`, `comidas-hoy.component.*`, `entrenamiento-hoy.component.*`, `grafico-semana.component.*`, `tarjeta-peso.component.*`

## Requiere del backend
`GET /seguimiento/resumen`, `GET /seguimiento/peso`, `GET /comidas?desde=&hasta=`, `PUT /entrenamientos/{id}`.

## Depende de
#17

## Guía
Paso 18 de `docs/Guia_Github_Frontend_NutriSport.md`.
```

```bash
git checkout main
git pull
git checkout -b feature/18-dashboard
```

### Qué se crea

- `shared/design`: `echarts-theme.ts`
- `shared/ui/data`: `chart.component.*` (envoltorio de `ngx-echarts`)
- `features/dashboard`: `dashboard.component.*`, `tarjeta-energia.component.*`, `tarjeta-macro.component.*`, `comidas-hoy.component.*`, `entrenamiento-hoy.component.*`, `grafico-semana.component.*`, `tarjeta-peso.component.*`

### Ejecución (en orden)

```bash
npm i echarts ngx-echarts
```

#### Prompt 18.1 · Gráficos

```text
Lee solo docs/DESIGN.md §5.12 y el tema ECharts de §9.6. Crea:
- shared/design/echarts-theme.ts con nutrisportTheme a partir de TOKENS (copia el de §9.6) y regístralo: provideEchartsCore({ echarts: () => import('echarts') }) en app.config.ts y echarts.registerTheme('nutrisport', …) al cargar.
- shared/ui/data/NsChartComponent (ns-chart): inputs options (EChartsOption), ariaLabel (obligatorio), altura y loading (skeleton); usa la directiva de ngx-echarts con theme 'nutrisport', role="img" y aria-label, y una ranura para una tabla alternativa con la clase ns-sr-only. Ningún texto por debajo de 12 px.
```

#### Prompt 18.2 · Dashboard

```text
Lee solo docs/DESIGN.md §7.4 y mira #file:docs/design/mockups/png/01-dashboard.png y 07-movil.png; lee solo en docs/api/seguimiento.md el tipo ResumenDiarioResponse y los endpoints de Seguimiento. Completa SeguimientoService con resumen(fecha?) y crea features/dashboard/DashboardComponent (/inicio):
- Cabecera: "Buenos días, {nombre}" según la hora, fecha larga y ns-date-strip (máximo mañana).
- TarjetaEnergiaComponent: ns-ring de 180 px con las kcal restantes en el centro (o "+X kcal" si excesoKcal > 0, sin tono de culpa) y anillo interior del gasto del entreno (kcalEntreno); desglose consumido / objetivo / entreno / base (objetivo − kcalEntreno).
- 3 × TarjetaMacroComponent (proteína, hidratos, grasa): barra de progreso con sus colores, gramos consumidos de objetivo y restantes, y las 2 comidas que más aportan del día.
- ComidasHoyComponent: timeline por franja en el orden del día con MealCardComponent; las franjas sin comida muestran "Añadir" (a /comidas/nueva?tipoComida=…&fecha=…); botones "Registrar con foto" (ai) y "Buscar alimento" (secondary). Estado vacío "Aún no has registrado comidas hoy". (Las comidasPlanificadasPendientes se mostrarán en el paso 31.)
- EntrenamientoHoyComponent: entrenamientos del día (color activity) con "Marcar como realizado" (EntrenamientosService.marcarEstado) que recarga el resumen; si no hay, "Día de descanso" y "Registrar entrenamiento".
- GraficoSemanaComponent: barras de kcal consumidas de los 7 días de la semana de la fecha (GET /comidas?desde=&hasta= para los totales y el resumen de cada día para el objetivo, o solo el objetivo del día actual si quieres ahorrar peticiones: explica la elección) con una línea de marca del objetivo; días de entreno señalados en el eje.
- TarjetaPesoComponent: GET /seguimiento/peso de los últimos 30 días, línea de pesajes y media móvil (mediaMovil7), variación y botón "Registrar peso" (RegistrarPesoDialogComponent).
- Layout 8 + 4 columnas en escritorio, 2 columnas en md y una columna en xs en el orden de §7.4 (macros en carrusel). Al volver de registrar una comida, recarga el resumen. 422 PERFIL_REQUERIDO → /bienvenida.
```

### Comprobación

Con un día con comidas y un entrenamiento: compara las cifras del dashboard con `GET /seguimiento/resumen` en Swagger (deben ser idénticas: el frontend no recalcula). Cambia de día con la tira de fechas, marca el entrenamiento como realizado y registra un peso. Revisa el dashboard a 375 px.

```bash
npm run build
npm test
```

### Commit, push y pull request

```bash
git add .
git commit -m "feat(dashboard): resumen diario con anillos, comidas, entrenamiento y gráficos"
git push -u origin feature/18-dashboard
```

| Campo | Valor |
|---|---|
| **Título de la PR** | `Dashboard diario` |
| **Rama base** | `main` |

**Descripción de la PR** (pégala al crearla; la última línea cierra la issue):

```markdown
## Qué incluye
- [x] Instalar `echarts` y `ngx-echarts` y crear `ns-chart` con el tema de `DESIGN.md` §9.6
- [x] Completar `SeguimientoService.resumen(fecha?)`
- [x] Crear `DashboardComponent` con la tira de fechas y sus tarjetas: energía, macros, comidas de hoy, entrenamiento, semana y peso
- [x] Estados vacío, de carga y de error, y alternativa textual de los gráficos

## Cómo probarlo
- Con comidas registradas, el anillo muestra lo consumido, lo restante y el anillo interior del entreno, y las barras de macros sus gramos
- Sin comidas hoy, el anillo muestra todo el objetivo como restante y aparece "Aún no has registrado comidas hoy"
- La tira de fechas cambia de día y recarga el resumen
- El gráfico semanal marca el objetivo de cada día y los días de entreno; el del peso muestra la media móvil de 7 días
- Cada gráfico tiene una descripción accesible (tabla oculta o `aria-label` con los datos)

## Checklist
- [ ] `npm run build` termina sin errores
- [ ] `npm test` pasa
- [ ] No se sube ninguna contraseña, token ni `.env`

Closes #18
```

Después de fusionar: `git checkout main && git pull && git branch -d feature/18-dashboard`

---

## Paso 19 · Registro por foto (I): captura, compresión, subida y análisis

### GitHub: issue y rama

| Campo | Valor |
|---|---|
| **Título de la issue** | `[Frontend] Registro por foto: captura o subida, compresión a JPEG en el cliente, subida multipart, polling del análisis y estados de error` |
| **Rama** | `feature/19-foto-subida` |

**Descripción de la issue** (cópiala en el campo *Description*):

```markdown
## Objetivo
Capturar o elegir la foto de un plato, prepararla en el navegador (JPEG, tamaño razonable, sin depender del formato del móvil) y lanzar el análisis asíncrono mostrando su progreso con honestidad y siempre con la salida "Continuar manualmente" (`DESIGN.md` §7.7).

## Tareas
- [ ] Crear `core/util/imagen.ts` (`comprimirAJpeg`) con sus pruebas
- [ ] Crear `AnalisisService` (subir, consultar con polling, imagen, confirmar y descartar)
- [ ] Crear `ns-dropzone`
- [ ] Crear `FotoComidaComponent` con los pasos Foto → Análisis y los estados de error
- [ ] Bloquear la función sin email verificado (con "Reenviar") y tratar 413, 415, 429 y 503

## Criterios de aceptación
- [ ] Una foto PNG o HEIC (en el móvil) se sube como JPEG de menos de 2 MB
- [ ] La pantalla pasa por "Analizando" y, al completarse, navega a la revisión (`/comidas/foto/:id`)
- [ ] Un análisis fallido muestra el motivo con "Reintentar" y "Continuar manualmente"
- [ ] Sin email verificado se explica por qué y no se sube nada
- [ ] Salir de la pantalla cancela el polling

## Archivos
- `core/util`: `imagen.ts` (+ pruebas)
- `core/services`: `analisis.service.ts` (+ pruebas)
- `shared/ui/form`: `dropzone.component.*`
- `features/analisis`: `foto-comida.component.*`, `progreso-analisis.component.*`

## Requiere del backend
`POST /analisis/imagenes`, `GET /analisis/{id}` (modo simulado de la IA si no hay clave). Email verificado.

## Depende de
#18

## Guía
Paso 19 de `docs/Guia_Github_Frontend_NutriSport.md`.
```

```bash
git checkout main
git pull
git checkout -b feature/19-foto-subida
```

### Qué se crea

- `core/util`: `imagen.ts` (+ pruebas)
- `core/services`: `analisis.service.ts` (+ pruebas)
- `shared/ui/form`: `dropzone.component.*`
- `features/analisis`: `foto-comida.component.*`, `progreso-analisis.component.*`

### Ejecución (en orden)

#### Prompt 19.1 · Imagen y servicio

```text
Lee solo docs/api/analisis.md §7.1 (flujo de la foto) y los endpoints de Análisis del §6. Crea:
- core/util/imagen.ts: comprimirAJpeg(archivo: File, { ladoMax = 2048, calidad = 0.85 }): Promise<Blob> con createImageBitmap (respetando la orientación EXIF: imageOrientation 'from-image') y un canvas (OffscreenCanvas si existe); rechaza si no es una imagen. validarArchivo(archivo) comprueba tipo image/* y tamaño ≤ 10 MB antes de procesar. Pruebas con un canvas simulado.
- core/services/analisis.service.ts: subir(foto: Blob, tipoComida, descripcion?) → POST /analisis/imagenes con FormData (campo "imagen", nombre "foto.jpg") y tipoComida y descripcion como HttpParams (no en el FormData); consultar(id); seguir(id): Observable<AnalisisResponse> con timer(0, 1500) + switchMap + takeWhile(estado PENDIENTE o PROCESANDO, inclusive) + timeout(60000); urlImagen(id); confirmar(id, req); descartar(id).
Pruebas: subir pone los parámetros en la query; seguir() emite hasta COMPLETADO y se detiene.
```

#### Prompt 19.2 · Pantalla de la foto

```text
Lee solo docs/DESIGN.md §7.7 y mira #file:docs/design/mockups/png/02-registro-foto.png y 07-movil.png. Crea:
- shared/ui/form/NsDropzoneComponent: zona de arrastrar y soltar con borde discontinuo, icono camera en círculo ai-50, "Arrastra una foto o haz clic" y "JPEG o PNG hasta 10 MB"; botones "Hacer foto" (input file accept="image/*" capture="environment") y "Subir archivo"; output() archivo. Accesible con teclado.
- features/analisis/FotoComidaComponent (/comidas/foto; queryParam tipoComida opcional) con ns-stepper "Foto → Análisis → Revisión":
  1. Foto: NsDropzone o la previsualización (URL.createObjectURL, revocada al destruir) con "Cambiar foto"; panel lateral con tipo de comida (sugerido por la hora), hora y "Describe tu plato (opcional, mejora la precisión)" (máx. 500); consejos para una buena foto; botón "Analizar" (variante ai). Si !AuthService.emailVerificado(): ns-alert explicando que hace falta verificar el email, botón "Reenviar correo" y el análisis desactivado; el enlace "Registrar manualmente" siempre visible.
  2. Análisis: ProgresoAnalisisComponent sobre la foto con el efecto de escaneo índigo (sin animación con prefers-reduced-motion) y las fases "Imagen optimizada y sin metadatos" (al terminar la subida), "Detectando alimentos" (PROCESANDO) y "Calculando nutrientes"; los datos del paso 1 en solo lectura; "Continuar manualmente" siempre visible. aria-live con el estado.
  3. Al COMPLETADO → navega a /comidas/foto/{id} (paso 20). FALLIDO → estado de error con errorMensaje, "Reintentar" (vuelve al paso 1 conservando la foto) y "Continuar manualmente" (/comidas/nueva con el tipo y la fecha).
- Errores: 413/415 → mensaje en el paso 1; 429 → "Has llegado al límite de 20 análisis de hoy" con mensajeEspera(); 503 → "No hemos podido analizar la foto. Puedes reintentarlo o registrar la comida manualmente."; timeout → lo mismo con "Seguir esperando".
Añade ns-disclaimer context 'analisis'. Activa "Foto del plato" en el bottom sheet del botón central y en el dashboard.
```

### Comprobación

Con el email verificado: sube una foto de un plato (en el modo simulado del backend el resultado es de ejemplo). En *Network* comprueba que `POST /api/v1/analisis/imagenes?tipoComida=…` lleva un `multipart/form-data` con `imagen` de tipo `image/jpeg`, y que el polling se detiene al completar. Prueba con un usuario sin verificar.

```bash
npm run build
npm test
```

### Commit, push y pull request

```bash
git add .
git commit -m "feat(analisis): captura y subida de fotos con polling del análisis"
git push -u origin feature/19-foto-subida
```

| Campo | Valor |
|---|---|
| **Título de la PR** | `Registro por foto: subida y análisis` |
| **Rama base** | `main` |

**Descripción de la PR** (pégala al crearla; la última línea cierra la issue):

```markdown
## Qué incluye
- [x] Crear `core/util/imagen.ts` (`comprimirAJpeg`) con sus pruebas
- [x] Crear `AnalisisService` (subir, consultar con polling, imagen, confirmar y descartar)
- [x] Crear `ns-dropzone`
- [x] Crear `FotoComidaComponent` con los pasos Foto → Análisis y los estados de error
- [x] Bloquear la función sin email verificado (con "Reenviar") y tratar 413, 415, 429 y 503

## Cómo probarlo
- Una foto PNG o HEIC (en el móvil) se sube como JPEG de menos de 2 MB
- La pantalla pasa por "Analizando" y, al completarse, navega a la revisión (`/comidas/foto/:id`)
- Un análisis fallido muestra el motivo con "Reintentar" y "Continuar manualmente"
- Sin email verificado se explica por qué y no se sube nada
- Salir de la pantalla cancela el polling

## Checklist
- [ ] `npm run build` termina sin errores
- [ ] `npm test` pasa
- [ ] No se sube ninguna contraseña, token ni `.env`

Closes #19
```

Después de fusionar: `git checkout main && git pull && git branch -d feature/19-foto-subida`

---

## Paso 20 · Registro por foto (II): revisión y confirmación del análisis

### GitHub: issue y rama

| Campo | Valor |
|---|---|
| **Título de la issue** | `[Frontend] Resultado del análisis: foto con marcadores, candidatos con confianza, corrección de gramos y alimento, añadir y quitar, confirmar como comida o descartar` |
| **Rama** | `feature/20-foto-revision` |

**Descripción de la issue** (cópiala en el campo *Description*):

```markdown
## Objetivo
Que el usuario revise la propuesta de la IA antes de guardarla (`DESIGN.md` §7.8): cada alimento detectado con su confianza, el alimento del catálogo emparejado y los gramos estimados, con la posibilidad de corregirlo todo, y que la comida se guarde con los valores del catálogo.

## Tareas
- [ ] Crear `RevisionAnalisisStore` (signals) con los alimentos revisados
- [ ] Crear `ResultadoAnalisisComponent` (foto con marcadores numerados, totales y lista de candidatos)
- [ ] Crear `ns-confidence-badge` y `CambiarAlimentoComponent` (coincidencias y búsqueda en el catálogo)
- [ ] Confirmar (`ConfirmarAnalisisRequest`), descartar y "Añadir alimento no detectado"
- [ ] Probar la construcción del `ConfirmarAnalisisRequest`

## Criterios de aceptación
- [ ] Se ven la foto (URL prefirmada), los candidatos con su confianza (texto y color) y el total estimado con el badge "Estimación IA"
- [ ] Cambiar los gramos o el alimento actualiza la estimación de totales
- [ ] Confirmar registra la comida con origen `FOTO`, vuelve al dashboard y muestra "Cena guardada · 718 kcal · Deshacer"
- [ ] Descartar pide confirmación y vuelve al dashboard
- [ ] Un análisis ya confirmado o descartado muestra su estado en lugar del formulario

## Archivos
- `features/analisis`: `resultado-analisis.component.*`, `revision-analisis.store.ts` (+ pruebas), `candidato-item.component.*`, `cambiar-alimento.component.*`, `foto-marcadores.component.*`
- `shared/ui/feedback`: `confidence-badge.component.*`

## Requiere del backend
`GET /analisis/{id}`, `GET /analisis/{id}/imagen`, `POST /analisis/{id}/confirmar`, `POST /analisis/{id}/descartar`.

## Depende de
#19

## Guía
Paso 20 de `docs/Guia_Github_Frontend_NutriSport.md`.
```

```bash
git checkout main
git pull
git checkout -b feature/20-foto-revision
```

### Qué se crea

- `features/analisis`: `resultado-analisis.component.*`, `revision-analisis.store.ts` (+ pruebas), `candidato-item.component.*`, `cambiar-alimento.component.*`, `foto-marcadores.component.*`
- `shared/ui/feedback`: `confidence-badge.component.*`

### Ejecución (en orden)

#### Prompt 20.1 · Store de la revisión

```text
Lee solo docs/api/analisis.md §7.1 y los tipos AnalisisResponse, CandidatoAnalisis, CoincidenciaCatalogo y ConfirmarAnalisisRequest. Crea features/analisis/revision-analisis.store.ts (provisto en el componente) con signals:
- lineas[]: { indiceCandidato: number | null, nombreDetectado, alimentoId, nombreAlimento, gramos, confianza, nivelConfianza, preparacion, por100 (Nutrientes de la coincidencia elegida, que vienen en coincidencias[].estimados para los gramos estimados: guárdalos normalizados a 100 g) }, iniciadas desde los candidatos con su primera coincidencia (un candidato sin coincidencias queda "Sin emparejar" y hay que elegir alimento).
- fecha, hora y tipoComida (del análisis).
- acciones: cambiarGramos, cambiarAlimento(i, alimento: AlimentoResponse o CoincidenciaCatalogo), quitar(i), anadirManual(alimento, gramos) (indiceCandidato null).
- computed totales (estimación con los valores por 100 g) y valido (todas las líneas con alimentoId y gramos > 0, al menos una).
- aRequest(): ConfirmarAnalisisRequest (alimentoId, gramos e indiceCandidato solo si no es null; máx. 20 alimentos).
Pruebas: request con un candidato quitado, uno cambiado y uno añadido a mano.
```

#### Prompt 20.2 · Pantalla de resultado

```text
Lee solo docs/DESIGN.md §7.8 y mira #file:docs/design/mockups/png/03-resultado-analisis.png. Crea features/analisis/ResultadoAnalisisComponent (/comidas/foto/:id):
- Carga el análisis (si está PENDIENTE o PROCESANDO, sigue el polling) y la URL prefirmada de la foto (si da 404, un hueco con "La foto ya no está disponible").
- Izquierda (5 col): FotoMarcadoresComponent (la foto con etiquetas numeradas 1, 2, 3… sobre la foto; como el backend no da coordenadas, colócalas en una columna sobre el borde izquierdo de la imagen, enlazadas con la fila de la lista) y la tarjeta de totales (kcal grandes, anillo de reparto de macros, badge "Estimación IA" y la fuente "Valores: catálogo NutriSport").
- Derecha (7 col): CandidatoItemComponent por línea: número, nombre del alimento emparejado y, en caption, lo detectado ("Detectado: arroz blanco · cocido"), NsConfidenceBadge (alta ≥ 0,8, media ≥ 0,5, baja < 0,5, con texto; las de confianza baja resaltan la fila), ns-quantity-input en gramos, macros de la línea, botón "Cambiar alimento" (CambiarAlimentoComponent: las coincidencias del candidato con su similitud y un BuscadorAlimentosComponent para elegir otro) y "Quitar". Debajo: "Añadir alimento no detectado" y el ns-alert ai "Revisa las cantidades: las estimaciones a partir de una foto pueden variar".
- Pie fijo: "Descartar" (NsConfirmService → POST descartar → /inicio) y "Confirmar y guardar" (deshabilitado si !valido) → POST confirmar → toast "{Tipo de comida} guardada · {kcal} kcal" con "Deshacer" (DELETE /comidas/{id}) → /inicio.
- Estados CONFIRMADO, DESCARTADO o FALLIDO: tarjeta con el estado y el enlace adecuado. 409 → recarga el análisis.
- Móvil: foto de 240 px arriba, lista debajo y totales en la barra inferior junto a "Confirmar". ns-disclaimer context 'analisis'.
```

### Comprobación

Sube una foto, cambia los gramos del primer alimento, cambia el segundo por otro del catálogo, quita el tercero, añade uno a mano y confirma. En el historial, la comida aparece con el badge "Foto" y los alimentos que elegiste. Repite y descarta.

```bash
npm run build
npm test
```

### Commit, push y pull request

```bash
git add .
git commit -m "feat(analisis): revisión, corrección y confirmación del análisis de la foto"
git push -u origin feature/20-foto-revision
```

| Campo | Valor |
|---|---|
| **Título de la PR** | `Registro por foto: revisión y confirmación` |
| **Rama base** | `main` |

**Descripción de la PR** (pégala al crearla; la última línea cierra la issue):

```markdown
## Qué incluye
- [x] Crear `RevisionAnalisisStore` (signals) con los alimentos revisados
- [x] Crear `ResultadoAnalisisComponent` (foto con marcadores numerados, totales y lista de candidatos)
- [x] Crear `ns-confidence-badge` y `CambiarAlimentoComponent` (coincidencias y búsqueda en el catálogo)
- [x] Confirmar (`ConfirmarAnalisisRequest`), descartar y "Añadir alimento no detectado"
- [x] Probar la construcción del `ConfirmarAnalisisRequest`

## Cómo probarlo
- Se ven la foto (URL prefirmada), los candidatos con su confianza (texto y color) y el total estimado con el badge "Estimación IA"
- Cambiar los gramos o el alimento actualiza la estimación de totales
- Confirmar registra la comida con origen `FOTO`, vuelve al dashboard y muestra "Cena guardada · 718 kcal · Deshacer"
- Descartar pide confirmación y vuelve al dashboard
- Un análisis ya confirmado o descartado muestra su estado en lugar del formulario

## Checklist
- [ ] `npm run build` termina sin errores
- [ ] `npm test` pasa
- [ ] No se sube ninguna contraseña, token ni `.env`

Closes #20
```

Después de fusionar: `git checkout main && git pull && git branch -d feature/20-foto-revision`

---

## Paso 21 · Administración (I): usuarios

### GitHub: issue y rama

| Campo | Valor |
|---|---|
| **Título de la issue** | `[Frontend] Administración de usuarios: búsqueda y filtros, detalle, bloqueo y desbloqueo y cambio de roles` |
| **Rama** | `feature/21-admin-usuarios` |

**Descripción de la issue** (cópiala en el campo *Description*):

```markdown
## Objetivo
Que el administrador encuentre usuarios y gestione su estado y sus roles, sin acceso a datos de salud, con una tabla reutilizable para el resto de la administración.

## Tareas
- [ ] Crear `AdminUsuariosService`
- [ ] Crear `ns-table` (columnas, ordenación, vista apilada en móvil)
- [ ] Crear `UsuariosAdminComponent` con búsqueda (debounce), filtro de estado y paginación del servidor
- [ ] Crear el drawer de detalle con bloquear o desbloquear y cambiar roles
- [ ] Probar el servicio y la tabla

## Criterios de aceptación
- [ ] La tabla busca por nombre o email y pagina en el servidor (`page` desde 0)
- [ ] Bloquear un usuario pide confirmación y cambia su estado; ese usuario no puede volver a entrar
- [ ] Un administrador no puede quitarse el rol `ADMIN` ni bloquearse (el 422 se muestra como mensaje)
- [ ] Un deportista no ve el enlace de administración y `/admin/usuarios` le muestra "Sin permiso"

## Archivos
- `core/services/admin`: `admin-usuarios.service.ts` (+ pruebas)
- `shared/ui/data`: `table.component.*`
- `features/admin/usuarios`: `usuarios-admin.component.*`, `usuario-detalle.component.*`

## Requiere del backend
`GET /admin/usuarios`, `GET/PATCH /admin/usuarios/{id}`. Inicia sesión con el administrador de `ADMIN_EMAIL`.

## Depende de
#20

## Guía
Paso 21 de `docs/Guia_Github_Frontend_NutriSport.md`.
```

```bash
git checkout main
git pull
git checkout -b feature/21-admin-usuarios
```

### Qué se crea

- `core/services/admin`: `admin-usuarios.service.ts` (+ pruebas)
- `shared/ui/data`: `table.component.*`
- `features/admin/usuarios`: `usuarios-admin.component.*`, `usuario-detalle.component.*`

### Ejecución (en orden)

#### Prompt 21.1 · Tabla reutilizable y servicio

```text
Lee solo docs/DESIGN.md §5.9 y §7.17 y en docs/api/admin.md §6 los endpoints de Admin (usuarios). Crea:
- shared/ui/data/NsTableComponent<T>: input columns ({ clave, titulo, ordenable?, ancho?, alinear? }), data, sort (model "campo,asc|desc"), stackOnMobile; las celdas usan ng-template por columna (directiva nsCelda="clave"); cabeceras con aria-sort; estado vacío y de carga (skeleton de filas); en móvil, cada fila se apila como tarjeta con "Título: valor".
- core/services/admin/admin-usuarios.service.ts: buscar({ q?, estado?, page, size (máx. 100), sort? }), detalle(id), actualizar(id, req: ActualizarUsuarioAdminRequest).
```

#### Prompt 21.2 · Pantalla de usuarios

```text
Crea features/admin/usuarios/UsuariosAdminComponent (/admin/usuarios, dentro de AdminLayoutComponent): búsqueda por nombre o email (debounce 300 ms, en la URL como queryParam), filtro de estado (Activos, Bloqueados, Eliminados), NsTable con nombre, email, roles (badges), estado (badge), email verificado (icono y texto), último acceso y alta (fechas cortas), y NsPaginatorComponent conectado a page/size del servidor. Al pulsar una fila, UsuarioDetalleComponent en un NsDrawer: datos de la cuenta (nunca datos de salud), "Bloquear" / "Desbloquear" (NsConfirmService peligro, explica que bloquear cierra todas sus sesiones) y roles con dos checkboxes (DEPORTISTA, ADMIN; al menos uno) → PATCH. Una cuenta ELIMINADA se muestra en solo lectura. 422 REGLA_NEGOCIO → ns-alert con el detail.
```

### Comprobación

Entra con el administrador de `ADMIN_EMAIL` (contraseña en el `.env` del backend: no la copies en el frontend). Busca el usuario de prueba, bloquéalo (intenta entrar con él en otra ventana privada → error de credenciales) y desbloquéalo. Intenta quitarte el rol `ADMIN` a ti mismo.

```bash
npm run build
npm test
```

### Commit, push y pull request

```bash
git add .
git commit -m "feat(admin): gestión de usuarios con búsqueda, bloqueo y roles"
git push -u origin feature/21-admin-usuarios
```

| Campo | Valor |
|---|---|
| **Título de la PR** | `Administración de usuarios` |
| **Rama base** | `main` |

**Descripción de la PR** (pégala al crearla; la última línea cierra la issue):

```markdown
## Qué incluye
- [x] Crear `AdminUsuariosService`
- [x] Crear `ns-table` (columnas, ordenación, vista apilada en móvil)
- [x] Crear `UsuariosAdminComponent` con búsqueda (debounce), filtro de estado y paginación del servidor
- [x] Crear el drawer de detalle con bloquear o desbloquear y cambiar roles
- [x] Probar el servicio y la tabla

## Cómo probarlo
- La tabla busca por nombre o email y pagina en el servidor (`page` desde 0)
- Bloquear un usuario pide confirmación y cambia su estado; ese usuario no puede volver a entrar
- Un administrador no puede quitarse el rol `ADMIN` ni bloquearse (el 422 se muestra como mensaje)
- Un deportista no ve el enlace de administración y `/admin/usuarios` le muestra "Sin permiso"

## Checklist
- [ ] `npm run build` termina sin errores
- [ ] `npm test` pasa
- [ ] No se sube ninguna contraseña, token ni `.env`

Closes #21
```

Después de fusionar: `git checkout main && git pull && git branch -d feature/21-admin-usuarios`

---

## Paso 22 · Administración (II): catálogo de alimentos y categorías

### GitHub: issue y rama

| Campo | Valor |
|---|---|
| **Título de la issue** | `[Frontend] Administración del catálogo: alimentos con filtros, alta y edición en drawer, revisión de alérgenos, importación CSV y categorías` |
| **Rama** | `feature/22-admin-catalogo` |

**Descripción de la issue** (cópiala en el campo *Description*):

```markdown
## Objetivo
Mantener el catálogo de alimentos que usa toda la aplicación: buscarlo y filtrarlo (fuente, alérgenos revisados, visibilidad, activos), dar de alta y editar alimentos públicos, revisar sus alérgenos (que es lo que permite usarlos con usuarios con alergias estrictas), importar CSV y gestionar las categorías.

## Tareas
- [ ] Crear `AdminCatalogoService` (alimentos, alérgenos, importación y categorías)
- [ ] Crear `CatalogoAdminComponent` con pestañas Alimentos · Categorías (Recetas llega en el paso 33)
- [ ] Reutilizar `AlimentoFormComponent` para el alta y la edición del administrador (con la fuente)
- [ ] Crear la cola "Alérgenos pendientes de revisar" y el diálogo de revisión
- [ ] Crear `ImportarCsvComponent` con previsualización de las primeras filas y resultado

## Criterios de aceptación
- [ ] El filtro "Alérgenos sin revisar" muestra la cola y revisar un alimento lo saca de ella
- [ ] Un alimento creado por el administrador es público y queda validado
- [ ] Importar un CSV muestra cuántos se crearon y actualizaron y la lista de errores por fila
- [ ] Una categoría con alimentos no se puede borrar (409 con el mensaje)

## Archivos
- `core/services/admin`: `admin-catalogo.service.ts` (+ pruebas)
- `features/admin/catalogo`: `catalogo-admin.component.*`, `alimentos-admin.component.*`, `revision-alergenos-dialog.component.*`, `importar-csv.component.*`, `categorias-admin.component.*`, `categoria-form.component.*`
- `features/alimentos`: `alimento-form.component.*` (modo administrador)

## Requiere del backend
`/admin/alimentos`, `/admin/alimentos/{id}/alergenos`, `/admin/alimentos/importar`, `/admin/categorias`, `GET /categorias`.

## Depende de
#21

## Guía
Paso 22 de `docs/Guia_Github_Frontend_NutriSport.md`.
```

```bash
git checkout main
git pull
git checkout -b feature/22-admin-catalogo
```

### Qué se crea

- `core/services/admin`: `admin-catalogo.service.ts` (+ pruebas)
- `features/admin/catalogo`: `catalogo-admin.component.*`, `alimentos-admin.component.*`, `revision-alergenos-dialog.component.*`, `importar-csv.component.*`, `categorias-admin.component.*`, `categoria-form.component.*`
- `features/alimentos`: `alimento-form.component.*` (modo administrador)

### Ejecución (en orden)

#### Prompt 22.1 · Servicio y alimentos

```text
Lee solo en docs/api/admin.md §6 los endpoints de Admin (alimentos, categorías e importación) y §7.7, y docs/DESIGN.md §7.17. Crea:
- core/services/admin/admin-catalogo.service.ts: alimentos(filtros { q?, fuente?, revisados?, visibilidad?, activo?, page, size }), crearAlimento(req, fuente, referenciaExterna?) (fuente y referenciaExterna van en la query), editarAlimento(id, req), eliminarAlimento(id), revisarAlergenos(id, req), importar(archivo: File, fuente, referencia?) (multipart "archivo"), categorias(tipo), crearCategoria, editarCategoria, eliminarCategoria.
- features/admin/catalogo/CatalogoAdminComponent (/admin/catalogo) con ns-tabs Alimentos · Categorías y rutas hijas.
- AlimentosAdminComponent: NsTable (nombre, marca, categoría, fuente, visibilidad, alérgenos revisados, activo) con filtros (texto, fuente, revisados, visibilidad, activo) en la URL y paginación del servidor; botón "Pendientes de revisar" (revisados=false). "Nuevo alimento" y "Editar" abren AlimentoFormComponent en el drawer de 560 px con un input modo 'admin' que añade los campos fuente y referencia externa solo al crear. Desactivar/eliminar con confirmación.
- RevisionAlergenosDialogComponent: contiene, trazas (chips de los 14 alérgenos) y lactosa → PUT /admin/alimentos/{id}/alergenos.
```

#### Prompt 22.2 · Importación y categorías

```text
- ImportarCsvComponent (diálogo): elegir fichero .csv (máx. 10 MB), fuente (select de FuenteAlimento) y referencia; previsualiza las 5 primeras filas leyendo el fichero con FileReader (solo para mostrarlas; el que valida es el servidor); al importar muestra ResultadoImportacion (creados, actualizados y una tabla de errores con la fila y el mensaje).
- CategoriasAdminComponent: árbol de categorías de ALIMENTO y de RECETA (padreId) con su orden y la sección de la compra (solo alimentos); CategoriaFormComponent (nombre, tipo, padre del mismo tipo, sección de la compra, orden 0–999) para crear y editar; eliminar con confirmación (409 → mensaje).
Pruebas del servicio (crearAlimento pone fuente en la query; importar envía el campo "archivo").
```

### Comprobación

Como administrador: filtra los alimentos con alérgenos sin revisar y revisa uno. Crea un alimento público y compruébalo desde la búsqueda de un deportista. Importa un CSV pequeño con una fila errónea (usa las columnas del importador del backend: mira `src/main/resources/datos/alimentos_desarrollo.csv` en el repositorio del backend). Crea una subcategoría y trata de borrar una con alimentos.

```bash
npm run build
npm test
```

### Commit, push y pull request

```bash
git add .
git commit -m "feat(admin): catálogo de alimentos, revisión de alérgenos, importación CSV y categorías"
git push -u origin feature/22-admin-catalogo
```

| Campo | Valor |
|---|---|
| **Título de la PR** | `Administración del catálogo` |
| **Rama base** | `main` |

**Descripción de la PR** (pégala al crearla; la última línea cierra la issue):

```markdown
## Qué incluye
- [x] Crear `AdminCatalogoService` (alimentos, alérgenos, importación y categorías)
- [x] Crear `CatalogoAdminComponent` con pestañas Alimentos · Categorías (Recetas llega en el paso 33)
- [x] Reutilizar `AlimentoFormComponent` para el alta y la edición del administrador (con la fuente)
- [x] Crear la cola "Alérgenos pendientes de revisar" y el diálogo de revisión
- [x] Crear `ImportarCsvComponent` con previsualización de las primeras filas y resultado

## Cómo probarlo
- El filtro "Alérgenos sin revisar" muestra la cola y revisar un alimento lo saca de ella
- Un alimento creado por el administrador es público y queda validado
- Importar un CSV muestra cuántos se crearon y actualizaron y la lista de errores por fila
- Una categoría con alimentos no se puede borrar (409 con el mensaje)

## Checklist
- [ ] `npm run build` termina sin errores
- [ ] `npm test` pasa
- [ ] No se sube ninguna contraseña, token ni `.env`

Closes #22
```

Después de fusionar: `git checkout main && git pull && git branch -d feature/22-admin-catalogo`

---

## Paso 23 · Revisión de accesibilidad, responsive y estados

### GitHub: issue y rama

| Campo | Valor |
|---|---|
| **Título de la issue** | `[Frontend] Revisión de accesibilidad (WCAG 2.2 AA), responsive desde 360 px, estados de carga, vacío y error y rendimiento del dashboard` |
| **Rama** | `feature/23-accesibilidad-responsive` |

**Descripción de la issue** (cópiala en el campo *Description*):

```markdown
## Objetivo
Revisar las pantallas del MVP con los criterios de `DESIGN.md` §10 y los requisitos RNF-04, RNF-11 y RNF-12 de la propuesta, y corregir lo que falle antes de cerrar el MVP.

## Tareas
- [ ] Pasar axe DevTools (o Lighthouse › Accesibilidad) a las 5 pantallas principales y corregir los errores
- [ ] Recorrer todo el MVP solo con teclado y con zoom al 200 %
- [ ] Revisar cada pantalla en 360, 768 y 1280 px
- [ ] Revisar que todas las pantallas tienen estados de carga, vacío y error
- [ ] Medir el LCP del dashboard con "Fast 4G" y aplicar las mejoras necesarias

## Criterios de aceptación
- [ ] axe no muestra errores en login, dashboard, registro de comidas, resultado del análisis y actividad
- [ ] Todo se puede hacer con el teclado, con el foco visible y en un orden lógico
- [ ] Nada se corta ni hace *scroll* horizontal a 360 px (salvo las tablas y carruseles previstos)
- [ ] El LCP del dashboard es menor de 2,5 s con "Fast 4G" en el build de producción

## Archivos
- correcciones en `features/**` y `shared/ui/**`
- `docs/revision_accesibilidad.md` (resultados de la revisión)

## Requiere del backend
Arrancado, con datos de prueba en todas las pantallas del MVP.

## Depende de
#22

## Guía
Paso 23 de `docs/Guia_Github_Frontend_NutriSport.md`.
```

```bash
git checkout main
git pull
git checkout -b feature/23-accesibilidad-responsive
```

### Qué se crea

- correcciones en `features/**` y `shared/ui/**`
- `docs/revision_accesibilidad.md` (resultados de la revisión)

### Ejecución (en orden)

#### Prompt 23.1 · Auditoría guiada

```text
Lee solo docs/DESIGN.md §10 y §7 (Responsive de cada pantalla). Revisa los componentes de features/ y shared/ui/ y dame una lista priorizada de problemas de accesibilidad y responsive con el archivo y la corrección: imágenes sin alt, iconos sin aria-hidden o aria-label, campos sin etiqueta, errores no enlazados con aria-describedby, contraste de textos sobre fondos de color, objetivos táctiles < 44 px en móvil, textos < 12 px (también en ECharts), información solo por color, resultados asíncronos sin aria-live, foco que se pierde al cerrar diálogos o al navegar, títulos de página, orden de encabezados y animaciones sin prefers-reduced-motion. No cambies nada todavía.
```

#### Prompt 23.2 · Correcciones

```text
Corrige los problemas de la lista anterior (de uno en uno si son muchos; dime qué has cambiado en cada archivo). Además:
- Tras cada navegación, mueve el foco al h1 de la página (o al #contenido) y anúncialo.
- Comprueba que cada pantalla con datos tiene skeleton de carga, estado vacío con acción y estado de error con "Reintentar".
- Revisa el rendimiento del dashboard: carga diferida de ECharts (solo los módulos usados con echarts/core), @defer (on viewport) para los gráficos de debajo del pliegue, peticiones en paralelo y sin duplicados, y fuentes con font-display: swap.
Crea docs/revision_accesibilidad.md con una tabla: pantalla, herramienta, problema, corrección y estado.
```

### Comprobación

```bash
npm run build:prod
```

> El LCP se mide sobre el build de producción servido por nginx (paso 24). Mientras tanto, usa `npm start` y Lighthouse en modo *Navigation* con *Throttling: Fast 4G* para orientarte (el servidor de desarrollo es más lento).

Pasa axe en las 5 pantallas, recorre el MVP con el teclado y revisa 360, 768 y 1280 px con el modo dispositivo de DevTools.

### Commit, push y pull request

```bash
git add .
git commit -m "fix(ui): accesibilidad, responsive y estados de carga, vacío y error"
git push -u origin feature/23-accesibilidad-responsive
```

| Campo | Valor |
|---|---|
| **Título de la PR** | `Revisión de accesibilidad y responsive` |
| **Rama base** | `main` |

**Descripción de la PR** (pégala al crearla; la última línea cierra la issue):

```markdown
## Qué incluye
- [x] Pasar axe DevTools (o Lighthouse › Accesibilidad) a las 5 pantallas principales y corregir los errores
- [x] Recorrer todo el MVP solo con teclado y con zoom al 200 %
- [x] Revisar cada pantalla en 360, 768 y 1280 px
- [x] Revisar que todas las pantallas tienen estados de carga, vacío y error
- [x] Medir el LCP del dashboard con "Fast 4G" y aplicar las mejoras necesarias

## Cómo probarlo
- axe no muestra errores en login, dashboard, registro de comidas, resultado del análisis y actividad
- Todo se puede hacer con el teclado, con el foco visible y en un orden lógico
- Nada se corta ni hace *scroll* horizontal a 360 px (salvo las tablas y carruseles previstos)
- El LCP del dashboard es menor de 2,5 s con "Fast 4G" en el build de producción

## Checklist
- [ ] `npm run build` termina sin errores
- [ ] `docs/revision_accesibilidad.md` recoge lo revisado y lo corregido
- [ ] No se sube ninguna contraseña, token ni `.env`

Closes #23
```

Después de fusionar: `git checkout main && git pull && git branch -d feature/23-accesibilidad-responsive`

---

## Paso 24 · Imagen Docker con nginx

### GitHub: issue y rama

| Campo | Valor |
|---|---|
| **Título de la issue** | `[Frontend] Imagen Docker multi-etapa con nginx: SPA, proxy de /api al backend, cabeceras de seguridad y caché` |
| **Rama** | `feature/24-docker-nginx` |

**Descripción de la issue** (cópiala en el campo *Description*):

```markdown
## Objetivo
Empaquetar el frontend para producción: compilación en una etapa de Node y una imagen final de nginx que sirve la SPA (con *fallback* a `index.html`), hace de proxy inverso de `/api` hacia el backend sustituyendo las cabeceras `X-Forwarded-*` y añade las cabeceras de seguridad.

## Tareas
- [ ] Crear `Dockerfile` multi-etapa (`node:22-alpine` → `nginx:alpine`) y `.dockerignore`
- [ ] Crear `nginx/default.conf.template` con la SPA, el proxy de `/api`, la caché y las cabeceras de seguridad
- [ ] Crear `docker-compose.yml` del frontend unido a la red del Docker Compose del backend
- [ ] Documentar el arranque en el README

## Criterios de aceptación
- [ ] `docker compose up -d --build` sirve la aplicación en `http://localhost:4200` y el login funciona contra el backend en contenedor
- [ ] Recargar una ruta interna (`/comidas`) no da 404
- [ ] Las respuestas llevan `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy` y `X-Frame-Options`
- [ ] Los ficheros con *hash* se cachean un año e `index.html` no se cachea

## Archivos
- raíz: `Dockerfile`, `.dockerignore`, `docker-compose.yml`
- `nginx`: `default.conf.template`
- `README.md` (sección Docker)

## Requiere del backend
El servicio `backend` del Docker Compose del backend (`docker compose --profile app up -d --build`) o el backend en el ordenador.

## Depende de
#23

## Guía
Paso 24 de `docs/Guia_Github_Frontend_NutriSport.md`.
```

```bash
git checkout main
git pull
git checkout -b feature/24-docker-nginx
```

### Qué se crea

- raíz: `Dockerfile`, `.dockerignore`, `docker-compose.yml`
- `nginx`: `default.conf.template`
- `README.md` (sección Docker)

### Ejecución (en orden)

#### Prompt 24.1 · Dockerfile y nginx

```text
Crea, en la raíz del proyecto:
1. Dockerfile multi-etapa: etapa "build" con node:22-alpine (npm ci y npm run build:prod) y etapa final con nginx:alpine que copia dist/nutrisport/browser a /usr/share/nginx/html y nginx/default.conf.template a /etc/nginx/templates/ (la imagen oficial hace envsubst al arrancar). ENV BACKEND_URL=http://nutrisport-backend:8080 por defecto. EXPOSE 80. Sin node_modules en la imagen final.
2. .dockerignore: node_modules, dist, .angular, .git, docs, *.md salvo README, coverage.
3. nginx/default.conf.template:
   - location /api/ → proxy_pass ${BACKEND_URL}; con proxy_set_header Host $host; X-Forwarded-For $remote_addr (SUSTITUYE, no añade: lo exige el backend); X-Forwarded-Proto $scheme; X-Real-IP $remote_addr; client_max_body_size 11m (fotos y CSV de 10 MB); proxy_read_timeout 60s (análisis y asistente).
   - location / → try_files $uri $uri/ /index.html; index.html con Cache-Control no-cache; ficheros con hash (*.js, *.css, fuentes, imágenes) con Cache-Control "public, max-age=31536000, immutable".
   - gzip para text/html, css, js, json y svg.
   - Cabeceras: X-Content-Type-Options nosniff, Referrer-Policy no-referrer, X-Frame-Options DENY, Permissions-Policy (camera=(self), resto denegado) y Content-Security-Policy: default-src 'self'; img-src 'self' data: blob: http://localhost:9000 https://www.themealdb.com https://images.openfoodfacts.org https://images.openfoodfacts.net; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'. Explica cada dominio de img-src (fotos prefirmadas de MinIO, imágenes de recetas y de productos).
4. docker-compose.yml con el servicio frontend (build ., container_name nutrisport-frontend, ports "4200:80" para que siga siendo el origen http://localhost:4200 que espera el backend en app.frontend-url) en la red externa del backend: networks.default.name = nutrisport-backend_default, external: true. Variable BACKEND_URL configurable (para usar el backend del ordenador: http://host.docker.internal:8080 con extra_hosts "host.docker.internal:host-gateway").
Añade al README una sección "Docker" con los comandos.
```

### Comprobación

Desde la carpeta del backend levanta todo, incluido el backend en contenedor; después, desde la del frontend, su imagen:

```bash
# en NutriSport-backend
docker compose --profile app up -d --build
# en NutriSport-frontend (para antes el `npm start` si lo tenías)
docker compose up -d --build
curl -sI http://localhost:4200/comidas | head -n 1
curl -sI http://localhost:4200/ | grep -iE "content-security|x-frame|referrer"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4200/api/v1/cuenta    # 401
```

Abre `http://localhost:4200`, inicia sesión, sube una foto (la URL prefirmada de MinIO debe cargarse sin errores de CSP en la consola) y mide el LCP del dashboard con Lighthouse (pendiente del paso 23).

### Commit, push y pull request

```bash
git add .
git commit -m "chore(infra): imagen Docker del frontend con nginx y proxy de la API"
git push -u origin feature/24-docker-nginx
```

| Campo | Valor |
|---|---|
| **Título de la PR** | `Docker y nginx del frontend` |
| **Rama base** | `main` |

**Descripción de la PR** (pégala al crearla; la última línea cierra la issue):

```markdown
## Qué incluye
- [x] Crear `Dockerfile` multi-etapa (`node:22-alpine` → `nginx:alpine`) y `.dockerignore`
- [x] Crear `nginx/default.conf.template` con la SPA, el proxy de `/api`, la caché y las cabeceras de seguridad
- [x] Crear `docker-compose.yml` del frontend unido a la red del Docker Compose del backend
- [x] Documentar el arranque en el README

## Cómo probarlo
- `docker compose up -d --build` sirve la aplicación en `http://localhost:4200` y el login funciona contra el backend en contenedor
- Recargar una ruta interna (`/comidas`) no da 404
- Las respuestas llevan `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy` y `X-Frame-Options`
- Los ficheros con *hash* se cachean un año e `index.html` no se cachea

## Checklist
- [ ] `npm run build` termina sin errores
- [ ] La imagen no contiene `node_modules` ni el código fuente
- [ ] No se sube ninguna contraseña, token ni `.env`

Closes #24
```

Después de fusionar: `git checkout main && git pull && git branch -d feature/24-docker-nginx`

---

## Paso 25 · Pruebas del flujo completo y cierre del MVP

### GitHub: issue y rama

| Campo | Valor |
|---|---|
| **Título de la issue** | `[Frontend] Pruebas manuales del flujo completo del MVP, pruebas de los flujos críticos y README del frontend` |
| **Rama** | `feature/25-cierre-mvp` |

**Descripción de la issue** (cópiala en el campo *Description*):

```markdown
## Objetivo
Comprobar de principio a fin el criterio de salida del MVP (`PROJECT_PROPOSAL.md` §11.2): un usuario nuevo se registra, verifica el email, configura su perfil, registra comidas manualmente y por foto, registra entrenamientos y ve su dashboard; el administrador gestiona usuarios y catálogo. Dejar el README listo para la defensa.

## Tareas
- [ ] Crear `docs/pruebas_manuales_frontend.md` con los casos del MVP y su resultado
- [ ] Añadir pruebas de integración de los flujos críticos (sesión con refresh, registro de comida, confirmación de análisis)
- [ ] Escribir el README del frontend (stack, requisitos, arranque, estructura, scripts, Docker, decisiones)
- [ ] Corregir los fallos encontrados

## Criterios de aceptación
- [ ] Todos los casos de `docs/pruebas_manuales_frontend.md` están en "OK" (o tienen su incidencia abierta)
- [ ] `npm test` pasa con las pruebas nuevas
- [ ] El README permite arrancar el frontend desde cero siguiendo sus pasos

## Archivos
- `docs/pruebas_manuales_frontend.md`
- `README.md`
- pruebas: `src/app/flujos/*.spec.ts`

## Requiere del backend
Completo con el perfil `local` (o en Docker), con Mailpit.

## Depende de
#24

## Guía
Paso 25 de `docs/Guia_Github_Frontend_NutriSport.md`.
```

```bash
git checkout main
git pull
git checkout -b feature/25-cierre-mvp
```

### Qué se crea

- `docs/pruebas_manuales_frontend.md`
- `README.md`
- pruebas: `src/app/flujos/*.spec.ts`

### Ejecución (en orden)

#### Prompt 25.1 · Plan de pruebas manuales

```text
Lee solo docs/PROJECT_PROPOSAL.md §10 (historias de usuario del MVP) y §11.2 (criterio de salida) y las rutas de docs/api/rutas-etiquetas.md §9. Crea docs/pruebas_manuales_frontend.md con una tabla por bloque (Autenticación, Onboarding y perfil, Configuración, Comidas, Foto, Actividad, Dashboard, Administración, Accesibilidad): id (PM-01…), historia de usuario, pasos, resultado esperado, resultado (OK/KO) y observaciones. Incluye los casos de error: credenciales incorrectas, límite de intentos, enlace caducado, email sin verificar en la foto, consentimiento revocado, sin perfil, 503 de la IA (detén el backend un momento o usa un modo de error si existe) y sesión caducada (espera 15 minutos o borra el token en memoria recargando sin cookie).
```

#### Prompt 25.2 · Pruebas de los flujos y README

```text
1. Crea src/app/flujos/ con pruebas de integración (TestBed con los componentes reales, HttpTestingController y Router de pruebas):
   - sesion.spec.ts: arranque con refresh correcto → /inicio; una petición con 401 → refresh → reintento → datos.
   - registro-comida.spec.ts: buscar un alimento, añadirlo, cambiar la cantidad y guardar → POST /comidas con el cuerpo exacto → toast.
   - analisis.spec.ts: confirmar un análisis COMPLETADO con un candidato corregido → POST /analisis/{id}/confirmar con el cuerpo exacto.
2. Reescribe README.md: descripción y aviso orientativo (no sustituye a un profesional sanitario), stack, requisitos, arranque paso a paso (backend, npm install, npm start, usuarios de prueba y Mailpit), scripts, estructura de carpetas, cómo se conecta con la API (proxy, sesión, errores; enlace a docs/NutriSport_API.md), Docker (paso 24), pruebas, accesibilidad, decisiones (Annex B de la guía) y licencias y atribuciones (fuentes, Lucide, ECharts y los proveedores de datos que se mostrarán en la Ampliación).
```

### Comprobación

Ejecuta todos los casos de `docs/pruebas_manuales_frontend.md` con un usuario nuevo y con el administrador, sobre el frontend en Docker. Anota los resultados.

```bash
npm run build
npm test
```

> **Hito: MVP del frontend completo.** A partir de aquí, la Ampliación en el mismo orden que el backend (A1 → A5 y después el resto).

### Commit, push y pull request

```bash
git add .
git commit -m "docs(frontend): pruebas manuales del MVP y README del proyecto"
git push -u origin feature/25-cierre-mvp
```

| Campo | Valor |
|---|---|
| **Título de la PR** | `Cierre del MVP del frontend` |
| **Rama base** | `main` |

**Descripción de la PR** (pégala al crearla; la última línea cierra la issue):

```markdown
## Qué incluye
- [x] Crear `docs/pruebas_manuales_frontend.md` con los casos del MVP y su resultado
- [x] Añadir pruebas de integración de los flujos críticos (sesión con refresh, registro de comida, confirmación de análisis)
- [x] Escribir el README del frontend (stack, requisitos, arranque, estructura, scripts, Docker, decisiones)
- [x] Corregir los fallos encontrados

## Cómo probarlo
- Todos los casos de `docs/pruebas_manuales_frontend.md` están en "OK" (o tienen su incidencia abierta)
- `npm test` pasa con las pruebas nuevas
- El README permite arrancar el frontend desde cero siguiendo sus pasos

## Checklist
- [ ] `npm run build` termina sin errores
- [ ] `npm test` pasa
- [ ] Las capturas o el vídeo de la demostración están fuera del repositorio
- [ ] No se sube ninguna contraseña, token ni `.env`

Closes #25
```

Después de fusionar: `git checkout main && git pull && git branch -d feature/25-cierre-mvp`

---

## Paso 26 · A1 · Productos comerciales de Open Food Facts

> **Ampliación A1**

### GitHub: issue y rama

| Campo | Valor |
|---|---|
| **Título de la issue** | `[Frontend] A1 · Buscador de productos comerciales (Open Food Facts), ficha del producto y registro por código de barras` |
| **Rama** | `feature/26-productos-off` |

**Descripción de la issue** (cópiala en el campo *Description*):

```markdown
## Objetivo
Encontrar un producto envasado concreto y añadirlo a una comida (`DESIGN.md` §7.19): primero en el catálogo propio y, solo cuando el usuario lo pide, en Open Food Facts, con su ficha nutricional, alérgenos y atribución, respetando que un producto con información incompleta no se puede registrar.

## Tareas
- [ ] Crear `ProductosService` (buscar y por código de barras, con la cabecera `X-Proveedor-No-Disponible`)
- [ ] Crear `BuscadorProductosComponent` con los bloques "En tu catálogo" y "Productos comerciales"
- [ ] Crear `FichaProductoComponent` con `ns-nutrition-facts`, ingredientes, alérgenos, ración y `ns-attribution`
- [ ] Crear `AnadirAComidaComponent` (cantidad, tipo de comida y fecha) que registra con `alimentoId` o `codigoBarras`
- [ ] Integrar "Productos comerciales" en el registro manual de comidas

## Criterios de aceptación
- [ ] Open Food Facts solo se consulta al pulsar "Buscar en productos comerciales" (nunca al escribir)
- [ ] Un producto con `nutricionCompleta = false` no tiene botón de añadir y ofrece "Crear alimento propio"
- [ ] Si el proveedor no está disponible, se muestra el aviso y siguen los resultados locales
- [ ] Cada producto muestra la atribución de Open Food Facts con su enlace

## Archivos
- `core/services`: `productos.service.ts` (+ pruebas)
- `shared/ui/data`: `attribution.component.*`
- `features/productos`: `buscador-productos.component.*`, `producto-item.component.*`, `ficha-producto.component.*`, `anadir-a-comida.component.*`
- `features/comidas/registro`: pestaña "Productos" en `registro-comida.component.*`
- `core/layout/navegacion.ts` (entrada "Productos")

## Requiere del backend
`GET /productos?q=`, `GET /productos/{codigoBarras}`, `GET /alimentos`, `POST /comidas` (paso 27 del backend).

## Depende de
#25

## Guía
Paso 26 de `docs/Guia_Github_Frontend_NutriSport.md`.
```

```bash
git checkout main
git pull
git checkout -b feature/26-productos-off
```

### Qué se crea

- `core/services`: `productos.service.ts` (+ pruebas)
- `shared/ui/data`: `attribution.component.*`
- `features/productos`: `buscador-productos.component.*`, `producto-item.component.*`, `ficha-producto.component.*`, `anadir-a-comida.component.*`
- `features/comidas/registro`: pestaña "Productos" en `registro-comida.component.*`
- `core/layout/navegacion.ts` (entrada "Productos")

### Ejecución (en orden)

#### Prompt 26.1 · Servicio y componentes

```text
Lee solo docs/api/productos.md y docs/api/sesion-errores.md §6 (Productos), §3.2 y §7.3, y docs/DESIGN.md §5.16 y §7.19 (mira #file:docs/design/mockups/png/09-buscador-productos.png). Crea:
- core/services/productos.service.ts: buscar(q, page = 0): Observable<{ productos: ProductoResumenResponse[], proveedorDisponible: boolean }> (lee la cabecera X-Proveedor-No-Disponible con observe: 'response'); porCodigo(codigo) (8–14 dígitos; valida antes de llamar).
- shared/ui/data/NsAttributionComponent (ns-attribution): recibe FuenteResponse y muestra "Datos de {proveedor} ({licencia})" con enlace a url (target _blank, rel noopener) y el texto de atribucion.
- features/productos/BuscadorProductosComponent (/productos): campo de búsqueda; bloque "En tu catálogo" con AlimentosService.buscar (al escribir, debounce); botón "Buscar en productos comerciales" que llama a ProductosService.buscar SOLO al pulsarlo (y "Más resultados" para la página siguiente, hasta la 49); ProductoItemComponent con imagen 48 px (o icono), nombre, marca, kcal/100 g, source-badge y aviso "Información nutricional incompleta"; estados sin resultados y proveedor no disponible (ns-alert info).
- FichaProductoComponent (panel derecho en escritorio, bottom sheet en móvil): imagen, nombre, marca, código de barras, NsNutritionFacts con por100, ración, ingredientes, alérgenos (sin revisar), NsAttribution y AnadirAComidaComponent; si nutricionCompleta = false, sin botón de añadir y con "Crear alimento propio" (abre AlimentoFormComponent precargado con nombre y marca).
- AnadirAComidaComponent: cantidad en g/ml o "1 ración" (racion.gramos), tipo de comida (sugerido), fecha → POST /comidas con un AlimentoRegistradoRequest con alimentoId si el producto tiene id o con codigoBarras si no → toast y vuelta.
```

#### Prompt 26.2 · Integración

```text
- En RegistroComidaComponent añade la pestaña "Productos" junto a Resultados · Recientes · Frecuentes · Mis alimentos: reutiliza el bloque de productos comerciales (con su botón) y, al elegir uno completo, lo añade a la comida en construcción (si no tiene id, guarda el codigoBarras en la línea; adapta el store y aRequest para enviar codigoBarras en lugar de alimentoId).
- Activa en navegacion.ts la entrada "Productos" en el grupo Principal.
Pruebas del servicio (cabecera de proveedor no disponible) y del store (línea con codigoBarras).
```

### Comprobación

Busca "yogur griego": primero salen los del catálogo; pulsa "Buscar en productos comerciales" y abre uno. Añádelo a la merienda. Busca un código de barras conocido en `/productos` (por ejemplo, el de un producto que tengas en casa). Comprueba en *Network* que al escribir **no** se llama a `/productos`.

```bash
npm run build
npm test
```

### Commit, push y pull request

```bash
git add .
git commit -m "feat(productos): buscador de productos de Open Food Facts y ficha con atribución"
git push -u origin feature/26-productos-off
```

| Campo | Valor |
|---|---|
| **Título de la PR** | `A1 · Productos comerciales` |
| **Rama base** | `main` |

**Descripción de la PR** (pégala al crearla; la última línea cierra la issue):

```markdown
## Qué incluye
- [x] Crear `ProductosService` (buscar y por código de barras, con la cabecera `X-Proveedor-No-Disponible`)
- [x] Crear `BuscadorProductosComponent` con los bloques "En tu catálogo" y "Productos comerciales"
- [x] Crear `FichaProductoComponent` con `ns-nutrition-facts`, ingredientes, alérgenos, ración y `ns-attribution`
- [x] Crear `AnadirAComidaComponent` (cantidad, tipo de comida y fecha) que registra con `alimentoId` o `codigoBarras`
- [x] Integrar "Productos comerciales" en el registro manual de comidas

## Cómo probarlo
- Open Food Facts solo se consulta al pulsar "Buscar en productos comerciales" (nunca al escribir)
- Un producto con `nutricionCompleta = false` no tiene botón de añadir y ofrece "Crear alimento propio"
- Si el proveedor no está disponible, se muestra el aviso y siguen los resultados locales
- Cada producto muestra la atribución de Open Food Facts con su enlace

## Checklist
- [ ] `npm run build` termina sin errores
- [ ] `npm test` pasa
- [ ] No se sube ninguna contraseña, token ni `.env`

Closes #26
```

Después de fusionar: `git checkout main && git pull && git branch -d feature/26-productos-off`

---

## Paso 27 · A5 · Escáner de código de barras con la cámara

> **Ampliación (escáner de A5)**

### GitHub: issue y rama

| Campo | Valor |
|---|---|
| **Título de la issue** | `[Frontend] Escáner de código de barras con la cámara (BarcodeDetector o ZXing), introducción manual y añadir el producto a una comida` |
| **Rama** | `feature/27-escaner-codigo` |

**Descripción de la issue** (cópiala en el campo *Description*):

```markdown
## Objetivo
Añadir un producto envasado en segundos (`DESIGN.md` §7.20) leyendo su código de barras con la cámara del móvil, con la introducción manual siempre disponible y todos los estados (no encontrado, información incompleta, proveedor no disponible y permiso de cámara denegado).

## Tareas
- [ ] Instalar `@zxing/browser` y crear `ns-barcode-scanner` (`BarcodeDetector` si existe, ZXing si no)
- [ ] Crear `EscanerComponent` con el flujo detectar → buscando → resultado
- [ ] Crear la introducción manual del código (8–14 dígitos)
- [ ] Activar "Escanear código" en el botón central y en el registro de comidas

## Criterios de aceptación
- [ ] En un móvil con HTTPS o en `localhost`, la cámara trasera lee un EAN-13 y muestra el producto
- [ ] Con el permiso de cámara denegado, la pantalla ofrece "Introducir código"
- [ ] El resultado se anuncia con `aria-live` y se puede añadir a una comida
- [ ] La cámara se apaga al salir de la pantalla

## Archivos
- `shared/ui/form`: `barcode-scanner.component.*`
- `features/productos`: `escaner.component.*`, `codigo-manual.component.*`
- `core/layout`: `bottom-nav.component.*` (acción "Escanear código")

## Requiere del backend
`GET /productos/{codigoBarras}`, `POST /comidas`.

## Depende de
#26

## Guía
Paso 27 de `docs/Guia_Github_Frontend_NutriSport.md`.
```

```bash
git checkout main
git pull
git checkout -b feature/27-escaner-codigo
```

### Qué se crea

- `shared/ui/form`: `barcode-scanner.component.*`
- `features/productos`: `escaner.component.*`, `codigo-manual.component.*`
- `core/layout`: `bottom-nav.component.*` (acción "Escanear código")

### Ejecución (en orden)

```bash
npm i @zxing/browser
```

#### Prompt 27.1 · Escáner

```text
Lee solo docs/DESIGN.md §7.20 (mira #file:docs/design/mockups/png/10-escaner.png) y docs/api/productos.md §7.3. Crea:
- shared/ui/form/NsBarcodeScannerComponent: getUserMedia({ video: { facingMode: 'environment' } }) en un <video> con un marco guía; si 'BarcodeDetector' in window y admite ean_13, ean_8, upc_a y upc_e, detecta cada 300 ms; si no, usa BrowserMultiFormatReader de @zxing/browser (importado de forma diferida con import()). Emite output() detectado(codigo) una vez (y vibra si está disponible); outputs error('permiso-denegado' | 'sin-camara' | 'no-soportado'). Para la cámara en ngOnDestroy (stop de todas las pistas). Botón para encender la linterna si la pista lo admite.
- features/productos/CodigoManualComponent: campo numérico de 8–14 dígitos con su validación.
- features/productos/EscanerComponent (/escaner): escáner + "Introducir código" siempre visible; al detectar: estado "Buscando producto…" → ProductosService.porCodigo → FichaProductoComponent compacta con AnadirAComidaComponent ("Añadir a {comida}"). Estados: 404 "No encontramos este producto" (Escanear otro, Buscar por nombre → /productos, Crear alimento); nutrición incompleta; 503 o proveedor no disponible; permiso denegado → muestra solo la introducción manual con la explicación. Resultado con aria-live.
Activa "Escanear código" en el bottom sheet del botón central y un acceso "Código de barras" en el registro de comidas.
```

### Comprobación

Desde el móvil en la misma red no tendrás HTTPS (la cámara exige un contexto seguro): prueba en el ordenador con una webcam en `http://localhost:4200/escaner` enseñando un código de barras, o usa la introducción manual. Deniega el permiso de cámara y comprueba la alternativa.

```bash
npm run build
npm test
```

### Commit, push y pull request

```bash
git add .
git commit -m "feat(productos): escáner de código de barras con cámara e introducción manual"
git push -u origin feature/27-escaner-codigo
```

| Campo | Valor |
|---|---|
| **Título de la PR** | `Escáner de código de barras` |
| **Rama base** | `main` |

**Descripción de la PR** (pégala al crearla; la última línea cierra la issue):

```markdown
## Qué incluye
- [x] Instalar `@zxing/browser` y crear `ns-barcode-scanner` (`BarcodeDetector` si existe, ZXing si no)
- [x] Crear `EscanerComponent` con el flujo detectar → buscando → resultado
- [x] Crear la introducción manual del código (8–14 dígitos)
- [x] Activar "Escanear código" en el botón central y en el registro de comidas

## Cómo probarlo
- En un móvil con HTTPS o en `localhost`, la cámara trasera lee un EAN-13 y muestra el producto
- Con el permiso de cámara denegado, la pantalla ofrece "Introducir código"
- El resultado se anuncia con `aria-live` y se puede añadir a una comida
- La cámara se apaga al salir de la pantalla

## Checklist
- [ ] `npm run build` termina sin errores
- [ ] `npm test` pasa
- [ ] No se sube ninguna contraseña, token ni `.env`

Closes #27
```

Después de fusionar: `git checkout main && git pull && git branch -d feature/27-escaner-codigo`

---

## Paso 28 · A2 · Catálogo de recetas y favoritas

> **Ampliación A2**

### GitHub: issue y rama

| Campo | Valor |
|---|---|
| **Título de la issue** | `[Frontend] A2 · Catálogo de recetas propias y de TheMealDB con filtros, categorías, favoritas y atribución` |
| **Rama** | `feature/28-catalogo-recetas` |

**Descripción de la issue** (cópiala en el campo *Description*):

```markdown
## Objetivo
Descubrir recetas para el plan (`DESIGN.md` §7.21): buscador, categorías, filtros (ingrediente, cocina, origen, franja y nutricionales), las recetas del catálogo y las de TheMealDB aún no importadas, y las favoritas.

## Tareas
- [ ] Crear `RecetasService` (búsqueda, categorías, detalle, nutrición, relacionadas, favoritas e importación de TheMealDB)
- [ ] Crear `RecetasComponent` con pestañas Explorar · Favoritas, filtros en la URL y paginación
- [ ] Crear `ns-recipe-card` y `ns-calc-status`
- [ ] Mostrar el aviso cuando TheMealDB no está disponible y la atribución al pie
- [ ] Probar el servicio y la conversión de los filtros a parámetros

## Criterios de aceptación
- [ ] Buscar "chicken" muestra recetas del catálogo y, en la primera página, las de TheMealDB con "Cálculo pendiente"
- [ ] Los filtros de kcal y proteína solo devuelven recetas con cálculo (y se explica en la interfaz)
- [ ] Marcar y desmarcar favorita es inmediato (con reversión si falla) y aparece en la pestaña Favoritas
- [ ] Abrir una receta de TheMealDB no importada la importa y navega a su detalle con su id

## Archivos
- `core/services`: `recetas.service.ts` (+ pruebas)
- `shared/ui/data`: `recipe-card.component.*`, `calc-status.component.*`
- `features/recetas`: `recetas.component.*`, `filtros-recetas.component.*`, `favoritas.component.*`
- `core/layout/navegacion.ts` (entrada "Recetas")

## Requiere del backend
`GET /recetas`, `GET /recetas/categorias`, `GET /recetas/favoritas`, `PUT/DELETE /recetas/{id}/favorita`, `GET /recetas/externas/themealdb/{idMeal}` (pasos 28–29 del backend).

## Depende de
#27

## Guía
Paso 28 de `docs/Guia_Github_Frontend_NutriSport.md`.
```

```bash
git checkout main
git pull
git checkout -b feature/28-catalogo-recetas
```

### Qué se crea

- `core/services`: `recetas.service.ts` (+ pruebas)
- `shared/ui/data`: `recipe-card.component.*`, `calc-status.component.*`
- `features/recetas`: `recetas.component.*`, `filtros-recetas.component.*`, `favoritas.component.*`
- `core/layout/navegacion.ts` (entrada "Recetas")

### Ejecución (en orden)

#### Prompt 28.1 · Servicio y tarjetas

```text
Lee solo docs/api/recetas.md y docs/api/sesion-errores.md §6 (Recetas), §3.2 y §7.4 y los tipos BusquedaRecetasResponse, RecetaResumenResponse, RecetaResponse y NutricionRecetaResponse; lee solo docs/DESIGN.md §5.16 y §7.21 (mira #file:docs/design/mockups/png/11-recetas.png). Crea:
- core/services/recetas.service.ts: buscar(filtros { q?, ingrediente?, categoria?, area?, origen?: 'todas'|'propia'|'themealdb', franja?, maxKcal?, minProteina?, page, size }) que solo envía los parámetros con valor; categorias() con caché; detalle(id, raciones?); nutricion(id, raciones?); relacionadas(id); favoritas(); marcarFavorita(id) y quitarFavorita(id); importarTheMealDb(idMeal); abrir(resumen): Observable<string> que devuelve el id (si no tiene, importa con referenciaExterna).
- shared/ui/data/NsCalcStatusComponent: estado COMPLETO / APROXIMADO / INCOMPLETO / pendiente con icono y texto (y completitud si llega).
- shared/ui/data/NsRecipeCardComponent: imagen 16:9 con loading="lazy" y alt, nombre, categoría y cocina, kcal y proteína por ración (con "≈" si APROXIMADO; "Cálculo pendiente" si no hay nutrición), NsCalcStatus, badges "Compatible" o "No compatible con tus restricciones" (shield-check), origen (source-badge "TheMealDB" o "NutriSport") y botón de favorita (aria-pressed) con output.
```

#### Prompt 28.2 · Pantalla de recetas

```text
Crea features/recetas/RecetasComponent (/recetas) con ns-tabs Explorar · Favoritas:
- Explorar: buscador (máx. 60 caracteres, debounce 400 ms), fila de categorías con scroll horizontal (ns-chip-group con GET /recetas/categorias), FiltrosRecetasComponent (ingrediente, cocina, origen, franja, "≤ X kcal/ración" y "≥ X g de proteína" con la nota "solo recetas con cálculo nutricional"; en móvil en un bottom sheet), todos sincronizados con los queryParams de la URL. Rejilla de NsRecipeCard (3–4 columnas, 2 en tablet, 1 en móvil) con catalogo.content y, en la primera página, un bloque "De TheMealDB" con themealdb[]; NsPaginatorComponent para catalogo. Si themealdbDisponible = false, ns-alert info "TheMealDB no está disponible ahora: mostramos solo nuestras recetas". Atribución "Recetas e imágenes de TheMealDB" al pie.
- Favoritas: GET /recetas/favoritas con las mismas tarjetas.
- Favorita optimista: cambia el estado al momento y lo revierte con un toast si la petición falla.
- Al abrir una tarjeta: RecetasService.abrir → /recetas/{id} (spinner en la tarjeta mientras importa; 503 → toast).
Activa "Recetas" en navegacion.ts (grupo Principal).
```

### Comprobación

Busca "chicken", filtra por la categoría "Pollo" y por "≤ 600 kcal", abre una receta de TheMealDB (se importa) y márcala como favorita. Recarga con los filtros en la URL.

```bash
npm run build
npm test
```

### Commit, push y pull request

```bash
git add .
git commit -m "feat(recetas): catálogo de recetas con filtros, TheMealDB y favoritas"
git push -u origin feature/28-catalogo-recetas
```

| Campo | Valor |
|---|---|
| **Título de la PR** | `A2 · Catálogo de recetas` |
| **Rama base** | `main` |

**Descripción de la PR** (pégala al crearla; la última línea cierra la issue):

```markdown
## Qué incluye
- [x] Crear `RecetasService` (búsqueda, categorías, detalle, nutrición, relacionadas, favoritas e importación de TheMealDB)
- [x] Crear `RecetasComponent` con pestañas Explorar · Favoritas, filtros en la URL y paginación
- [x] Crear `ns-recipe-card` y `ns-calc-status`
- [x] Mostrar el aviso cuando TheMealDB no está disponible y la atribución al pie
- [x] Probar el servicio y la conversión de los filtros a parámetros

## Cómo probarlo
- Buscar "chicken" muestra recetas del catálogo y, en la primera página, las de TheMealDB con "Cálculo pendiente"
- Los filtros de kcal y proteína solo devuelven recetas con cálculo (y se explica en la interfaz)
- Marcar y desmarcar favorita es inmediato (con reversión si falla) y aparece en la pestaña Favoritas
- Abrir una receta de TheMealDB no importada la importa y navega a su detalle con su id

## Checklist
- [ ] `npm run build` termina sin errores
- [ ] `npm test` pasa
- [ ] No se sube ninguna contraseña, token ni `.env`

Closes #28
```

Después de fusionar: `git checkout main && git pull && git branch -d feature/28-catalogo-recetas`

---

## Paso 29 · A3 · Detalle de receta y nutrición calculada

> **Ampliación A3**

### GitHub: issue y rama

| Campo | Valor |
|---|---|
| **Título de la issue** | `[Frontend] A3 · Detalle de receta con raciones, ingredientes y conversión, nutrición calculada con su desglose, alérgenos, relacionadas y registrar como comida` |
| **Rama** | `feature/29-detalle-receta` |

**Descripción de la issue** (cópiala en el campo *Description*):

```markdown
## Objetivo
Cocinar la receta y entender de dónde salen sus números (`DESIGN.md` §7.22): ingredientes escalados a las raciones elegidas con la medida original y su conversión a gramos, nutrición por ración con su estado y desglose, alérgenos, pasos, relacionadas y la opción de registrarla como comida.

## Tareas
- [ ] Crear `DetalleRecetaComponent` con cabecera, selector de raciones, ingredientes, nutrición, pasos y relacionadas
- [ ] Crear `DesgloseNutricionComponent` ("Ver cómo se calcula")
- [ ] Crear `RegistrarRecetaDialogComponent` (`POST /comidas/desde-receta`)
- [ ] Desactivar las acciones con motivo si el cálculo es incompleto o la receta es incompatible

## Criterios de aceptación
- [ ] Cambiar las raciones recarga las cantidades y la nutrición desde el servidor
- [ ] Una receta `INCOMPLETO` no muestra totales por ración y "Registrar" y "Añadir al plan" están desactivados con el motivo
- [ ] Una receta de TheMealDB muestra "Receta original en inglés", "raciones supuestas" y la atribución
- [ ] Registrar la receta como comida crea una comida con origen `RECETA`

## Archivos
- `features/recetas/detalle`: `detalle-receta.component.*`, `ingredientes-receta.component.*`, `nutricion-receta.component.*`, `desglose-nutricion.component.*`, `registrar-receta-dialog.component.*`

## Requiere del backend
`GET /recetas/{id}`, `/recetas/{id}/nutricion`, `/recetas/{id}/relacionadas`, `POST /comidas/desde-receta`.

## Depende de
#28

## Guía
Paso 29 de `docs/Guia_Github_Frontend_NutriSport.md`.
```

```bash
git checkout main
git pull
git checkout -b feature/29-detalle-receta
```

### Qué se crea

- `features/recetas/detalle`: `detalle-receta.component.*`, `ingredientes-receta.component.*`, `nutricion-receta.component.*`, `desglose-nutricion.component.*`, `registrar-receta-dialog.component.*`

### Ejecución (en orden)

#### Prompt 29.1 · Detalle de la receta

```text
Lee solo docs/DESIGN.md §7.11 y §7.22 (mira #file:docs/design/mockups/png/12-receta-detalle.png) y en docs/api/recetas.md los tipos RecetaResponse, IngredienteRecetaResponse, NutricionRecetaResponse y §7.4. Crea features/recetas/detalle/DetalleRecetaComponent (/recetas/:id; queryParam raciones):
- Cabecera: imagen 16:9 (radio xl), nombre, categoría y cocina, NsSourceBadge, aviso "Receta original en inglés" si idioma = 'en', tiempo y dificultad, etiquetas, botón de favorita, "Registrar como comida" (primary) y "Añadir al plan" (secondary, se conecta en el paso 31: de momento navega a /planificador?receta=id).
- IngredientesRecetaComponent: selector de raciones (ns-quantity-input 1–20, con la marca "supuestas" si racionesSupuestas) que recarga GET /recetas/{id}?raciones=; tabla con nombre (traducido si está emparejado; original en caption), medida original, gramos calculados y estado de la conversión (exacta, estimada, despreciable, sin datos), y checkbox para ir tachando.
- NutricionRecetaComponent: kcal, proteínas, hidratos y grasas por ración con "≈" si APROXIMADO, NsCalcStatus con la completitud ("97 % de la masa"), alérgenos derivados (o "Alérgenos sin verificar" si alergenosVerificados = false), badge de compatibilidad y ns-disclaimer context 'receta' ("Valores estimados a partir de los ingredientes, no medidos"). Enlace "Ver cómo se calcula" → DesgloseNutricionComponent (diálogo con GET /recetas/{id}/nutricion: cada ingrediente con sus gramos, la conversión y la fuente de sus nutrientes).
- Instrucciones numeradas, relacionadas (3 NsRecipeCard) y atribución si es de TheMealDB.
- Reglas: con estadoNutricional INCOMPLETO o compatible = false, "Registrar como comida" y "Añadir al plan" se desactivan con el motivo visible (no solo un tooltip).
- Responsive: una columna con ns-tabs Ingredientes · Pasos · Nutrición.
```

#### Prompt 29.2 · Registrar la receta como comida

```text
Crea RegistrarRecetaDialogComponent: raciones (decimales permitidos, > 0 y ≤ 10), fecha (máximo mañana) y tipo de comida (sugerido) → POST /comidas/desde-receta (RegistrarRecetaRequest) → toast "Comida guardada · {kcal} kcal" con "Deshacer" y muestra los avisos si los hay. 422 NUTRICION_INCOMPLETA → mensaje en el diálogo. Añade también una pestaña "Recetas" en el registro manual de comidas que abra este mismo diálogo desde una receta buscada.
```

### Comprobación

Abre una receta con cálculo completo, cambia a 2 raciones, mira "Ver cómo se calcula" y regístrala como comida (aparece en el historial con origen Receta). Abre una con cálculo incompleto y comprueba los botones desactivados con su motivo.

```bash
npm run build
npm test
```

### Commit, push y pull request

```bash
git add .
git commit -m "feat(recetas): detalle de receta con nutrición calculada y registro como comida"
git push -u origin feature/29-detalle-receta
```

| Campo | Valor |
|---|---|
| **Título de la PR** | `A3 · Detalle de receta` |
| **Rama base** | `main` |

**Descripción de la PR** (pégala al crearla; la última línea cierra la issue):

```markdown
## Qué incluye
- [x] Crear `DetalleRecetaComponent` con cabecera, selector de raciones, ingredientes, nutrición, pasos y relacionadas
- [x] Crear `DesgloseNutricionComponent` ("Ver cómo se calcula")
- [x] Crear `RegistrarRecetaDialogComponent` (`POST /comidas/desde-receta`)
- [x] Desactivar las acciones con motivo si el cálculo es incompleto o la receta es incompatible

## Cómo probarlo
- Cambiar las raciones recarga las cantidades y la nutrición desde el servidor
- Una receta `INCOMPLETO` no muestra totales por ración y "Registrar" y "Añadir al plan" están desactivados con el motivo
- Una receta de TheMealDB muestra "Receta original en inglés", "raciones supuestas" y la atribución
- Registrar la receta como comida crea una comida con origen `RECETA`

## Checklist
- [ ] `npm run build` termina sin errores
- [ ] `npm test` pasa
- [ ] No se sube ninguna contraseña, token ni `.env`

Closes #29
```

Después de fusionar: `git checkout main && git pull && git branch -d feature/29-detalle-receta`

---

## Paso 30 · A4 · Planificador (I): menús, generación y vista semanal

> **Ampliación A4**

### GitHub: issue y rama

| Campo | Valor |
|---|---|
| **Título de la issue** | `[Frontend] A4 · Planificador: mis menús, generar menú diario o semanal, vista semanal con objetivos por día, vista por día en móvil y gestión del menú` |
| **Rama** | `feature/30-planificador-vista` |

**Descripción de la issue** (cópiala en el campo *Description*):

```markdown
## Objetivo
Ver y generar el menú de la semana (`DESIGN.md` §7.10): selector de menús, generación por reglas (no IA) con su explicación, rejilla de 7 días × franjas con lo planificado frente al objetivo de cada día (incluidos los entrenamientos) y la gestión del menú (nombre, favorito, estado, duplicar y eliminar).

## Tareas
- [ ] Crear `MenusService` (listar, generar, detalle, actualizar, eliminar y duplicar)
- [ ] Crear `PlanificadorComponent` con navegación de semana, selector de menú y acciones
- [ ] Crear `ns-week-planner` y `meal-slot` (escritorio) y la vista por día con `ns-date-strip` (móvil)
- [ ] Crear `GenerarMenuDialogComponent` y `DuplicarMenuDialogComponent`
- [ ] Probar el servicio y el cálculo de la semana visible

## Criterios de aceptación
- [ ] "Generar menú" crea un menú semanal desde el lunes indicado y lo muestra con la explicación
- [ ] Cada día muestra kcal planificadas frente al objetivo, los hidratos y si es día de entreno (icono y tinte)
- [ ] `SIN_RECETAS_COMPATIBLES` o `PERFIL_REQUERIDO` se explican con una salida
- [ ] Marcar favorito, renombrar, archivar, duplicar y eliminar funcionan desde el menú de acciones

## Archivos
- `core/services`: `menus.service.ts` (+ pruebas)
- `features/planificador`: `planificador.component.*`, `planificador.store.ts`, `generar-menu-dialog.component.*`, `duplicar-menu-dialog.component.*`, `resumen-semana.component.*`
- `features/planificador/componentes`: `week-planner.component.*`, `meal-slot.component.*`, `dia-planificador.component.*`
- `core/layout/navegacion.ts` (entrada "Planificador")

## Requiere del backend
`GET /menus`, `POST /menus/generar`, `GET/PATCH/DELETE /menus/{id}`, `POST /menus/{id}/duplicar` (pasos 30–31 del backend).

## Depende de
#29

## Guía
Paso 30 de `docs/Guia_Github_Frontend_NutriSport.md`.
```

```bash
git checkout main
git pull
git checkout -b feature/30-planificador-vista
```

### Qué se crea

- `core/services`: `menus.service.ts` (+ pruebas)
- `features/planificador`: `planificador.component.*`, `planificador.store.ts`, `generar-menu-dialog.component.*`, `duplicar-menu-dialog.component.*`, `resumen-semana.component.*`
- `features/planificador/componentes`: `week-planner.component.*`, `meal-slot.component.*`, `dia-planificador.component.*`
- `core/layout/navegacion.ts` (entrada "Planificador")

### Ejecución (en orden)

#### Prompt 30.1 · Servicio y store

```text
Lee solo docs/api/menus.md §6 (Menús) y §7.5, y los tipos MenuResumenResponse, MenuResponse, DiaMenuResponse y ComidaPlanificadaResponse. Crea:
- core/services/menus.service.ts con TODOS los endpoints de /menus (listar({ favorito?, desde?, page, size }), generar, detalle, actualizar (PATCH), eliminar, duplicar, recetasDisponibles(fecha, tipoComida, q?), alternativas(id, comidaId), anadirComida, cambiarComida (PUT), quitarComida, regenerar, registrarComida(id, comidaId, hora?), sugerenciaIa, aplicarSugerencia). Los de edición se usarán en el paso 31.
- features/planificador/planificador.store.ts (signals, provisto en el componente): menús disponibles, menú seleccionado (MenuResponse), semana visible (lunes), cargando y error; reemplazarMenu(menu) para aplicar las respuestas del servidor sin recalcular nada en el cliente.
Pruebas del servicio y de la selección del menú de una semana.
```

#### Prompt 30.2 · Planificador

```text
Lee solo docs/DESIGN.md §7.10 (mira #file:docs/design/mockups/png/04-planificador.png). Crea features/planificador/PlanificadorComponent (/planificador):
- Cabecera: navegación de semana (‹ 23–29 nov 2026 ›), selector de menú (menús que se solapan con la semana; GET /menus?desde=), acciones "Generar menú" (primary; si hay menú, "Regenerar" llega en el paso 31), "Lista de la compra" (secondary, se conecta en el paso 32) y menú de acciones (Guardar como favorito, Renombrar, Archivar, Duplicar en otra semana, Eliminar con confirmación).
- ResumenSemanaComponent: media de kcal (resumen.mediaKcal), % de ajuste (resumen.ajustePorcentaje), proteína media y días de entreno; la explicación del menú (explicacion) en una tarjeta plegable con ns-disclaimer context 'menu' (es un algoritmo de reglas: sin tratamiento IA salvo la explicación).
- WeekPlannerComponent (≥ 768 px): rejilla de 7 columnas × franjas (Desayuno, Comida, Merienda, Cena y Pre/Post-entreno solo si hay comidas de ese tipo). Cabecera de cada día: día y fecha, kcal planificadas / objetivo con porcentajeObjetivo, hidratos del día e icono activity con tinte si diaEntreno. MealSlotComponent: nombre de la receta (13 px), kcal y proteína (12 px), badges "Bloqueada" y "Consumida"; las acciones se añaden en el paso 31. En md, scroll horizontal con 3,5 días visibles.
- DiaPlanificadorComponent (< 768 px): ns-date-strip de la semana y la lista vertical de comidas del día.
- GenerarMenuDialogComponent: tipo (Diario / Semanal), fecha de inicio (no anterior a hoy; para semanal sugiere el próximo lunes), nombre opcional y "Pedir una explicación breve" (conExplicacion) → POST /menus/generar → selecciona el menú nuevo. 422 SIN_RECETAS_COMPATIBLES → "No hay recetas que encajen con tus restricciones: revisa tus preferencias o publica más recetas"; PERFIL_REQUERIDO → /bienvenida.
- DuplicarMenuDialogComponent: fecha de inicio y nombre → POST duplicar.
- Estado vacío de la semana: "No tienes menú para esta semana" con "Generar menú".
Activa "Planificador" en navegacion.ts y "Plan" en la barra inferior móvil (DESIGN.md §6.4, configuración con la Ampliación).
```

### Comprobación

Genera un menú semanal desde el próximo lunes: compara un día con `GET /menus/{id}` en Swagger (las cifras deben coincidir). Planifica un entrenamiento en uno de esos días y regenera desde Swagger: el día aparece como día de entreno. Mira la vista por día a 375 px.

```bash
npm run build
npm test
```

### Commit, push y pull request

```bash
git add .
git commit -m "feat(menus): planificador con generación de menús y vista semanal"
git push -u origin feature/30-planificador-vista
```

| Campo | Valor |
|---|---|
| **Título de la PR** | `A4 · Planificador: generación y vista semanal` |
| **Rama base** | `main` |

**Descripción de la PR** (pégala al crearla; la última línea cierra la issue):

```markdown
## Qué incluye
- [x] Crear `MenusService` (listar, generar, detalle, actualizar, eliminar y duplicar)
- [x] Crear `PlanificadorComponent` con navegación de semana, selector de menú y acciones
- [x] Crear `ns-week-planner` y `meal-slot` (escritorio) y la vista por día con `ns-date-strip` (móvil)
- [x] Crear `GenerarMenuDialogComponent` y `DuplicarMenuDialogComponent`
- [x] Probar el servicio y el cálculo de la semana visible

## Cómo probarlo
- "Generar menú" crea un menú semanal desde el lunes indicado y lo muestra con la explicación
- Cada día muestra kcal planificadas frente al objetivo, los hidratos y si es día de entreno (icono y tinte)
- `SIN_RECETAS_COMPATIBLES` o `PERFIL_REQUERIDO` se explican con una salida
- Marcar favorito, renombrar, archivar, duplicar y eliminar funcionan desde el menú de acciones

## Checklist
- [ ] `npm run build` termina sin errores
- [ ] `npm test` pasa
- [ ] No se sube ninguna contraseña, token ni `.env`

Closes #30
```

Después de fusionar: `git checkout main && git pull && git branch -d feature/30-planificador-vista`

---

## Paso 31 · A4 · Planificador (II): edición del menú, alternativas y sugerencia IA

> **Ampliación A4**

### GitHub: issue y rama

| Campo | Valor |
|---|---|
| **Título de la issue** | `[Frontend] A4 · Edición del menú: añadir receta a una franja, sustituir con alternativas, mover con arrastrar y soltar, bloquear, quitar, regenerar, registrar como consumida y sugerencia IA` |
| **Rama** | `feature/31-planificador-edicion` |

**Descripción de la issue** (cópiala en el campo *Description*):

```markdown
## Objetivo
Ajustar el menú generado (`DESIGN.md` §7.10 y §7.23): añadir recetas a una franja con el hueco del día, sustituir por alternativas que encajan, mover y bloquear comidas, regenerar respetando las bloqueadas, registrar una comida planificada como consumida y, opcionalmente, pedir a la IA un ajuste que el backend valida y recalcula.

## Tareas
- [ ] Crear el panel "Añadir receta" (drawer de 420 px) con `recetas-disponibles` y raciones
- [ ] Crear el panel de alternativas anclado a la comida (bottom sheet en móvil)
- [ ] Añadir las acciones de `meal-slot` (sustituir, bloquear, quitar, ver receta, registrar, añadir a la lista) y arrastrar y soltar con CDK
- [ ] Crear `SugerenciaIaComponent` (pedir, ver, aplicar o descartar)
- [ ] Mostrar en el dashboard las comidas del plan pendientes con "Marcar comida"

## Criterios de aceptación
- [ ] Desde una franja vacía se añade una receta con las raciones propuestas y el menú se actualiza con la respuesta del servidor
- [ ] Arrastrar una comida a otro día o franja la mueve; una comida consumida no se puede mover
- [ ] "Regenerar" conserva las bloqueadas y las consumidas
- [ ] "Registrar como consumida" crea la comida (origen `PLAN`) y el dashboard la muestra
- [ ] La sugerencia IA muestra los cambios por ración calculados por el backend y "Aplicar" crea la receta derivada

## Archivos
- `features/planificador/edicion`: `anadir-receta-drawer.component.*`, `alternativas-panel.component.*`, `sugerencia-ia.component.*`, `registrar-planificada-dialog.component.*`
- `features/planificador/componentes`: `meal-slot.component.*` y `week-planner.component.*` (acciones y drag & drop)
- `features/dashboard`: `comidas-hoy.component.*` (comidas del plan pendientes)

## Requiere del backend
`GET /menus/recetas-disponibles`, `/menus/{id}/comidas/**`, `POST /menus/{id}/regenerar`, `GET /seguimiento/resumen` (comidas planificadas pendientes).

## Depende de
#30

## Guía
Paso 31 de `docs/Guia_Github_Frontend_NutriSport.md`.
```

```bash
git checkout main
git pull
git checkout -b feature/31-planificador-edicion
```

### Qué se crea

- `features/planificador/edicion`: `anadir-receta-drawer.component.*`, `alternativas-panel.component.*`, `sugerencia-ia.component.*`, `registrar-planificada-dialog.component.*`
- `features/planificador/componentes`: `meal-slot.component.*` y `week-planner.component.*` (acciones y drag & drop)
- `features/dashboard`: `comidas-hoy.component.*` (comidas del plan pendientes)

### Ejecución (en orden)

#### Prompt 31.1 · Añadir, sustituir, mover y bloquear

```text
Lee solo docs/DESIGN.md §7.10 y §7.23 (mira #file:docs/design/mockups/png/13-planificador-recetas.png) y docs/api/menus.md §7.5 y las reglas de los endpoints de Menús. Todas las operaciones sustituyen el menú del store con la respuesta (PlanificadorStore.reemplazarMenu); no recalcules nada en el cliente.
- AnadirRecetaDrawerComponent (drawer de 420 px, desde una franja vacía o desde "Sustituir"): cabecera con la franja y el hueco del día ("Cena · sáb 21 · faltan ≈ 560 kcal", a partir del objetivo y lo planificado del DiaMenuResponse), buscador (q, debounce), lista de GET /menus/recetas-disponibles?fecha=&tipoComida=&q= con kcal y proteína para las raciones propuestas, diferenciaKcalPct, NsSourceBadge y NsCalcStatus; selector de raciones (> 0 y ≤ 10) y "Añadir" → POST /menus/{id}/comidas (o PUT con recetaId y raciones si es una sustitución).
- AlternativasPanelComponent (CDK Overlay anclado a la comida sin tapar la columna del día; bottom sheet en móvil): GET alternativas (hasta 3) con el delta de kcal y proteína frente a la actual → PUT con recetaId y raciones; "Ver más recetas" abre el drawer.
- MealSlotComponent: menú de acciones (al hover y con teclado): Sustituir, Bloquear/Desbloquear (PUT { bloqueada }), Quitar (DELETE), Ver receta (/recetas/{id}), Registrar como consumida, Añadir ingredientes a la lista (paso 32). Una comida consumida solo permite Ver receta.
- WeekPlannerComponent: CDK drag & drop entre celdas (cdkDropListGroup); al soltar → PUT { fecha, tipoComida }; si falla, revierte. Alternativa accesible: "Mover a…" en el menú de acciones con un diálogo de día y franja.
- Botón "Regenerar" en la cabecera (NsConfirmService: "Se mantendrán las comidas bloqueadas y las ya consumidas") → POST regenerar.
- 409 COMIDA_CONSUMIDA o 422 de reglas → toast con el detail y recarga del menú.
```

#### Prompt 31.2 · Registrar, sugerencia IA y dashboard

```text
- RegistrarPlanificadaDialogComponent: hora opcional → POST /menus/{id}/comidas/{comidaId}/registrar?hora=HH:mm → toast "Comida registrada" y recarga del menú (consumida = true).
- SugerenciaIaComponent (tarjeta variante ai con el badge "Sugerencia IA", desde la acción "Pedir sugerencia IA" de la comida): campo opcional "¿Qué prefieres?" (máx. 300) → POST sugerencia-ia; muestra texto, deltaKcalRacion y deltaProteinaRacion ("≈ +5,6 g de proteína y +30 kcal por ración", indicando que las cifras las calcula NutriSport) y, si valida, "Aplicar" (POST aplicar { sugerenciaId } → reemplaza el menú) y "Descartar"; si no es válida, el texto con el motivo. Requiere email verificado (403 → aviso con "Reenviar"), 503 → "La IA no está disponible ahora". ns-disclaimer context 'menu'.
- En features/dashboard/ComidasHoyComponent, muestra resumen.comidasPlanificadasPendientes en su franja como "Del plan: {receta} · {kcal} kcal" con "Marcar comida" (POST registrar del menú y comida correspondientes) que recarga el resumen. Activa "Desde mi plan" en el bottom sheet del botón central (lleva al día de hoy del planificador).
```

### Comprobación

En un menú: añade una receta a una franja vacía, sustituye otra por una alternativa, arrastra una comida a otro día, bloquea dos y regenera (siguen ahí). Pide una sugerencia IA y aplícala. Registra una comida de hoy desde el planificador y desde el dashboard.

```bash
npm run build
npm test
```

### Commit, push y pull request

```bash
git add .
git commit -m "feat(menus): edición del menú con alternativas, arrastrar y soltar y sugerencia IA"
git push -u origin feature/31-planificador-edicion
```

| Campo | Valor |
|---|---|
| **Título de la PR** | `A4 · Planificador: edición y sugerencia IA` |
| **Rama base** | `main` |

**Descripción de la PR** (pégala al crearla; la última línea cierra la issue):

```markdown
## Qué incluye
- [x] Crear el panel "Añadir receta" (drawer de 420 px) con `recetas-disponibles` y raciones
- [x] Crear el panel de alternativas anclado a la comida (bottom sheet en móvil)
- [x] Añadir las acciones de `meal-slot` (sustituir, bloquear, quitar, ver receta, registrar, añadir a la lista) y arrastrar y soltar con CDK
- [x] Crear `SugerenciaIaComponent` (pedir, ver, aplicar o descartar)
- [x] Mostrar en el dashboard las comidas del plan pendientes con "Marcar comida"

## Cómo probarlo
- Desde una franja vacía se añade una receta con las raciones propuestas y el menú se actualiza con la respuesta del servidor
- Arrastrar una comida a otro día o franja la mueve; una comida consumida no se puede mover
- "Regenerar" conserva las bloqueadas y las consumidas
- "Registrar como consumida" crea la comida (origen `PLAN`) y el dashboard la muestra
- La sugerencia IA muestra los cambios por ración calculados por el backend y "Aplicar" crea la receta derivada

## Checklist
- [ ] `npm run build` termina sin errores
- [ ] `npm test` pasa
- [ ] No se sube ninguna contraseña, token ni `.env`

Closes #31
```

Después de fusionar: `git checkout main && git pull && git branch -d feature/31-planificador-edicion`

---

## Paso 32 · A5 · Lista de la compra

> **Ampliación A5**

### GitHub: issue y rama

| Campo | Valor |
|---|---|
| **Título de la issue** | `[Frontend] A5 · Lista de la compra: generar desde un menú, secciones del supermercado, marcar comprado, productos libres, ingredientes de una receta y progreso` |
| **Rama** | `feature/32-lista-compra` |

**Descripción de la issue** (cópiala en el campo *Description*):

```markdown
## Objetivo
Comprar lo necesario para el menú de forma ordenada (`DESIGN.md` §7.12), pensado para el móvil en el supermercado: lista generada desde el menú con cantidades sumadas y su desglose por día, agrupada por secciones, con productos libres y el progreso de la compra.

## Tareas
- [ ] Crear `ListasCompraService`
- [ ] Crear `ListasCompraComponent` (mis listas con su progreso) y `ListaCompraComponent` (detalle)
- [ ] Crear `GenerarListaDialogComponent` desde el planificador (rango dentro del menú)
- [ ] Crear "Añadir producto" y "Añadir ingredientes de una receta"
- [ ] Marcar comprado con actualización optimista y "Ocultar comprados"

## Criterios de aceptación
- [ ] "Lista de la compra" en el planificador genera la lista del menú (o de los días elegidos) y la abre
- [ ] Los productos salen agrupados por sección con su cantidad total y el desglose por día al expandir
- [ ] Marcar un producto lo tacha y lo mueve al final de su sección al momento
- [ ] Se pueden añadir productos libres y los ingredientes de una receta (desde su detalle o desde el planificador)

## Archivos
- `core/services`: `listas-compra.service.ts` (+ pruebas)
- `features/compra`: `listas-compra.component.*`, `lista-compra.component.*`, `seccion-compra.component.*`, `producto-compra-item.component.*`, `anadir-producto-dialog.component.*`, `generar-lista-dialog.component.*`, `anadir-receta-lista-dialog.component.*`
- `core/layout/navegacion.ts` (entrada "Lista de la compra")

## Requiere del backend
`/listas-compra/**` (paso 33 del backend).

## Depende de
#31

## Guía
Paso 32 de `docs/Guia_Github_Frontend_NutriSport.md`.
```

```bash
git checkout main
git pull
git checkout -b feature/32-lista-compra
```

### Qué se crea

- `core/services`: `listas-compra.service.ts` (+ pruebas)
- `features/compra`: `listas-compra.component.*`, `lista-compra.component.*`, `seccion-compra.component.*`, `producto-compra-item.component.*`, `anadir-producto-dialog.component.*`, `generar-lista-dialog.component.*`, `anadir-receta-lista-dialog.component.*`
- `core/layout/navegacion.ts` (entrada "Lista de la compra")

### Ejecución (en orden)

#### Prompt 32.1 · Servicio y listas

```text
Lee solo docs/api/compra.md §6 (Compra) y docs/DESIGN.md §7.12. Crea:
- core/services/listas-compra.service.ts: listar(page, size), detalle(id), generarDesdeMenu(menuId, { desde?, hasta? }), actualizar(id, req) (PATCH), eliminar(id), anadirProducto(id, req), anadirDesdeReceta(id, req), actualizarProducto(id, productoId, req), quitarProducto(id, productoId). Todas las que modifican devuelven la lista completa.
- features/compra/ListasCompraComponent (/compra): tarjetas con nombre, rango de fechas, ns-progress-bar "12 / 34 comprados", estado (badge Completada) y acciones (abrir, renombrar, eliminar).
- GenerarListaDialogComponent (desde el botón "Lista de la compra" del planificador): todo el menú o un rango dentro de él → POST /listas-compra/desde-menu/{menuId} → abre la lista.
```

#### Prompt 32.2 · Detalle de la lista

```text
Crea features/compra/ListaCompraComponent (/compra/:id), mobile-first (elementos de 56 px):
- Cabecera: nombre (editable), menú y rango de origen, progreso (comprados / total) y acciones "Añadir producto", "Ocultar comprados" (switch), "Completar lista" (PATCH estado COMPLETADA) y "Compartir" (navigator.share con el texto de la lista si existe; si no, copiar al portapapeles).
- SeccionCompraComponent por sección (colapsable, con contador de pendientes) y ProductoCompraItemComponent: checkbox de 24 px, nombre, cantidad total con unidad (etiquetas de UnidadCompra), badge "Manual", desglose al expandir ("lun. 23 · 200 g · mié. 25 · 150 g"), editar cantidad y unidad en línea y quitar. Marcar comprado es optimista: tacha y mueve al final de la sección al momento, hace PATCH { comprado } y revierte si falla.
- AnadirProductoDialogComponent: nombre, cantidad, unidad y sección (opcional, por defecto "Otros").
- AnadirRecetaListaDialogComponent: elegir lista (o crear desde el planificador) y raciones → POST productos/desde-receta. Conéctalo a "Añadir ingredientes a la lista" del detalle de receta (paso 29) y de la comida planificada (paso 31).
- Botón flotante "Añadir" en móvil y estado vacío.
Activa "Lista de la compra" en navegacion.ts.
```

### Comprobación

Genera la lista del menú de la semana, expande un producto con desglose, marca tres como comprados (se van al final), añade "Servilletas" a mano y los ingredientes de una receta. Usa la lista en 375 px.

```bash
npm run build
npm test
```

### Commit, push y pull request

```bash
git add .
git commit -m "feat(compra): lista de la compra por secciones con progreso y productos libres"
git push -u origin feature/32-lista-compra
```

| Campo | Valor |
|---|---|
| **Título de la PR** | `A5 · Lista de la compra` |
| **Rama base** | `main` |

**Descripción de la PR** (pégala al crearla; la última línea cierra la issue):

```markdown
## Qué incluye
- [x] Crear `ListasCompraService`
- [x] Crear `ListasCompraComponent` (mis listas con su progreso) y `ListaCompraComponent` (detalle)
- [x] Crear `GenerarListaDialogComponent` desde el planificador (rango dentro del menú)
- [x] Crear "Añadir producto" y "Añadir ingredientes de una receta"
- [x] Marcar comprado con actualización optimista y "Ocultar comprados"

## Cómo probarlo
- "Lista de la compra" en el planificador genera la lista del menú (o de los días elegidos) y la abre
- Los productos salen agrupados por sección con su cantidad total y el desglose por día al expandir
- Marcar un producto lo tacha y lo mueve al final de su sección al momento
- Se pueden añadir productos libres y los ingredientes de una receta (desde su detalle o desde el planificador)

## Checklist
- [ ] `npm run build` termina sin errores
- [ ] `npm test` pasa
- [ ] No se sube ninguna contraseña, token ni `.env`

Closes #32
```

Después de fusionar: `git checkout main && git pull && git branch -d feature/32-lista-compra`

---

## Paso 33 · Administración (III): recetas y emparejamientos de ingredientes

> **Ampliación A2–A3**

### GitHub: issue y rama

| Campo | Valor |
|---|---|
| **Título de la issue** | `[Frontend] Administración de recetas públicas (alta, edición, publicación) y cola de emparejamientos de ingredientes con el catálogo` |
| **Rama** | `feature/33-admin-recetas` |

**Descripción de la issue** (cópiala en el campo *Description*):

```markdown
## Objetivo
Que el administrador mantenga las recetas que puede usar el planificador: crear y editar recetas propias con ingredientes del catálogo, publicar (o fijar raciones y franjas de las de TheMealDB) y revisar la cola de emparejamientos de ingredientes, que es lo que completa el cálculo nutricional.

## Tareas
- [ ] Crear `AdminRecetasService` (recetas, publicación y emparejamientos)
- [ ] Añadir la pestaña "Recetas" al catálogo de administración con búsqueda y estado de publicación
- [ ] Crear `RecetaAdminFormComponent` (ingredientes del catálogo, pasos, franjas y etiquetas)
- [ ] Crear `PublicacionRecetaDialogComponent` (publicada, raciones y franjas)
- [ ] Crear `MapeosIngredientesComponent` con la cola de pendientes

## Criterios de aceptación
- [ ] Una receta nueva se crea sin publicar, con sus nutrientes calculados, y al publicarla (justo después de crearla) aparece en el catálogo y en el planificador
- [ ] Fijar las raciones de una receta de TheMealDB deja de marcarlas como supuestas
- [ ] Emparejar un ingrediente pendiente lo saca de la cola y muestra cuántas recetas se han recalculado
- [ ] Borrar una receta que está en algún menú muestra el 409 con la sugerencia de despublicarla

## Archivos
- `core/services/admin`: `admin-recetas.service.ts` (+ pruebas)
- `features/admin/catalogo`: `recetas-admin.component.*`, `receta-admin-form.component.*`, `publicacion-receta-dialog.component.*`
- `features/admin/ingredientes`: `mapeos-ingredientes.component.*`, `emparejar-ingrediente-dialog.component.*`
- `core/layout/navegacion.ts` (entrada "Ingredientes" en Administración)

## Requiere del backend
`/admin/recetas`, `/admin/recetas/{id}/publicacion`, `/admin/mapeos-ingredientes`.

## Depende de
#32

## Guía
Paso 33 de `docs/Guia_Github_Frontend_NutriSport.md`.
```

```bash
git checkout main
git pull
git checkout -b feature/33-admin-recetas
```

### Qué se crea

- `core/services/admin`: `admin-recetas.service.ts` (+ pruebas)
- `features/admin/catalogo`: `recetas-admin.component.*`, `receta-admin-form.component.*`, `publicacion-receta-dialog.component.*`
- `features/admin/ingredientes`: `mapeos-ingredientes.component.*`, `emparejar-ingrediente-dialog.component.*`
- `core/layout/navegacion.ts` (entrada "Ingredientes" en Administración)

### Ejecución (en orden)

#### Prompt 33.1 · Recetas

```text
Lee solo docs/api/admin.md §6 (Admin: recetas y mapeos) y los tipos RecetaAdminRequest, IngredienteRecetaAdminRequest, PublicarRecetaRequest y MapeoIngredienteResponse. Crea:
- core/services/admin/admin-recetas.service.ts: crear(req), editar(id, req), eliminar(id), publicacion(id, req) (PATCH), mapeos({ revisado?, page, size }), emparejar(id, alimentoId | null).
- features/admin/catalogo/RecetasAdminComponent (pestaña "Recetas" de /admin/catalogo). Limitación de la API (Annex B): no hay un listado de administración de recetas ni el campo publicada en las respuestas; GET /recetas devuelve las públicas publicadas, las propias y las de TheMealDB (importadas o no) que coinciden con la búsqueda, pero no las propias públicas sin publicar. Por eso: búsqueda con RecetasService.buscar (origen todas) en una NsTable con nombre, origen, estado nutricional y acciones Editar (solo PROPIA), "Publicar o despublicar" (diálogo con la elección explícita) y Eliminar (solo PROPIA, confirmación; 409 RECETA_PLANIFICADA → "Está en algún menú: despublícala"); y una lista "Creadas en esta sesión" (signal) con las recetas que acaba de crear o editar el administrador, para poder publicarlas justo después. Al crear una receta, abre directamente el diálogo de publicación.
- RecetaAdminFormComponent (drawer de 560 px): nombre, descripción, categoría de receta, raciones 1–20, tiempo, dificultad, franjas aptas (chips), etiquetas (hasta 10), pasos (FormArray de textos, hasta 30, reordenables) e ingredientes (FormArray de 1 a 40: alimento del catálogo con NsCombobox de alimentos públicos, y gramos o una medida de texto). Envía exactamente RecetaAdminRequest.
- PublicacionRecetaDialogComponent: publicada (switch), raciones reales (fija las supuestas) y franjas aptas → PATCH publicacion.
```

#### Prompt 33.2 · Emparejamientos de ingredientes

```text
Crea features/admin/ingredientes/MapeosIngredientesComponent (/admin/ingredientes): filtro Pendientes (revisado=false, por defecto) · Revisados · Todos; tabla con el nombre normalizado del ingrediente, alimento emparejado, método (Automático/Manual), confianza (con aviso si < 0,6: no se usa en los cálculos) y revisado. EmparejarIngredienteDialogComponent: NsCombobox de alimentos del catálogo o "Sin equivalente" (alimentoId null) → PUT /admin/mapeos-ingredientes/{id} → toast "Emparejado · {recetasRecalculadas} recetas recalculadas". Añade "Ingredientes" al grupo Administración y la ruta.
```

### Comprobación

Crea una receta propia con tres ingredientes, publícala y búscala desde el panel "Añadir receta" del planificador. En la cola de ingredientes, empareja uno pendiente y comprueba que la receta de TheMealDB que lo usa cambia su estado nutricional.

```bash
npm run build
npm test
```

### Commit, push y pull request

```bash
git add .
git commit -m "feat(admin): recetas públicas, publicación y emparejamiento de ingredientes"
git push -u origin feature/33-admin-recetas
```

| Campo | Valor |
|---|---|
| **Título de la PR** | `Administración de recetas e ingredientes` |
| **Rama base** | `main` |

**Descripción de la PR** (pégala al crearla; la última línea cierra la issue):

```markdown
## Qué incluye
- [x] Crear `AdminRecetasService` (recetas, publicación y emparejamientos)
- [x] Añadir la pestaña "Recetas" al catálogo de administración con búsqueda y estado de publicación
- [x] Crear `RecetaAdminFormComponent` (ingredientes del catálogo, pasos, franjas y etiquetas)
- [x] Crear `PublicacionRecetaDialogComponent` (publicada, raciones y franjas)
- [x] Crear `MapeosIngredientesComponent` con la cola de pendientes

## Cómo probarlo
- Una receta nueva se crea sin publicar, con sus nutrientes calculados, y al publicarla (justo después de crearla) aparece en el catálogo y en el planificador
- Fijar las raciones de una receta de TheMealDB deja de marcarlas como supuestas
- Emparejar un ingrediente pendiente lo saca de la cola y muestra cuántas recetas se han recalculado
- Borrar una receta que está en algún menú muestra el 409 con la sugerencia de despublicarla

## Checklist
- [ ] `npm run build` termina sin errores
- [ ] `npm test` pasa
- [ ] No se sube ninguna contraseña, token ni `.env`

Closes #33
```

Después de fusionar: `git checkout main && git pull && git branch -d feature/33-admin-recetas`

---

## Paso 34 · Estadísticas, comparativas e insights

> **Ampliación (resto)**

### GitHub: issue y rama

| Campo | Valor |
|---|---|
| **Título de la issue** | `[Frontend] Estadísticas: energía frente al objetivo, macros, reparto, adherencia, peso, comparativa con el periodo anterior, entreno frente a descanso, alimentos más consumidos e insights` |
| **Rama** | `feature/34-estadisticas-insights` |

**Descripción de la issue** (cópiala en el campo *Description*):

```markdown
## Objetivo
Entender la evolución y detectar oportunidades de mejora (`DESIGN.md` §7.14): series de energía y macros frente al objetivo por día, semana o mes, adherencia, reparto de macros, peso, comparativa con el periodo anterior, alimentación en días de entreno frente a descanso, alimentos más consumidos y los patrones detectados (insights), también en el dashboard.

## Tareas
- [ ] Completar `SeguimientoService` (estadísticas, comparativa e insights) y `EntrenamientosService.relacionNutricion`
- [ ] Crear `EstadisticasComponent` con filtros de periodo, comparación y KPIs con delta
- [ ] Crear los gráficos: energía frente al objetivo, macros apiladas, reparto (anillo), peso, mapa de adherencia y reparto por comidas
- [ ] Crear las tarjetas "Entreno frente a descanso", "Alimentos más consumidos" e `InsightCardComponent`
- [ ] Mostrar el insight más reciente en el dashboard

## Criterios de aceptación
- [ ] Cambiar el periodo (7 días, 4 semanas, 3 meses, personalizado ≤ 366 días) recarga todo y la URL lo conserva
- [ ] Con "Comparar" activo, el gráfico de energía muestra la media del periodo anterior y los KPI su variación
- [ ] Cada gráfico tiene su alternativa textual y ningún texto baja de 12 px
- [ ] Los insights aparecen con su severidad (texto e icono) y desaparecen si se desactivan en Configuración

## Archivos
- `core/services`: `seguimiento.service.ts`, `entrenamientos.service.ts` (completos)
- `features/estadisticas`: `estadisticas.component.*`, `filtros-periodo.component.*`, `kpis-periodo.component.*`, `grafico-energia.component.*`, `grafico-macros.component.*`, `reparto-macros.component.*`, `grafico-peso.component.*`, `mapa-adherencia.component.*`, `reparto-comidas.component.*`, `entreno-descanso.component.*`, `top-alimentos.component.*`, `opciones-graficos.ts` (+ pruebas)
- `shared/ui/data`: `insight-card.component.*`
- `features/dashboard`: tarjeta "Patrón detectado"
- `core/layout/navegacion.ts` (entrada "Estadísticas")

## Requiere del backend
`GET /seguimiento/estadisticas`, `/seguimiento/comparativa`, `/seguimiento/peso`, `/seguimiento/insights`, `/entrenamientos/relacion-nutricion`.

## Depende de
#33

## Guía
Paso 34 de `docs/Guia_Github_Frontend_NutriSport.md`.
```

```bash
git checkout main
git pull
git checkout -b feature/34-estadisticas-insights
```

### Qué se crea

- `core/services`: `seguimiento.service.ts`, `entrenamientos.service.ts` (completos)
- `features/estadisticas`: `estadisticas.component.*`, `filtros-periodo.component.*`, `kpis-periodo.component.*`, `grafico-energia.component.*`, `grafico-macros.component.*`, `reparto-macros.component.*`, `grafico-peso.component.*`, `mapa-adherencia.component.*`, `reparto-comidas.component.*`, `entreno-descanso.component.*`, `top-alimentos.component.*`, `opciones-graficos.ts` (+ pruebas)
- `shared/ui/data`: `insight-card.component.*`
- `features/dashboard`: tarjeta "Patrón detectado"
- `core/layout/navegacion.ts` (entrada "Estadísticas")

### Ejecución (en orden)

#### Prompt 34.1 · Servicios y opciones de los gráficos

```text
Lee solo docs/api/seguimiento.md y docs/api/actividad.md §6 (Seguimiento y relacion-nutricion) y los tipos EstadisticasResponse, PuntoSerieResponse, ComparativaResponse, InsightResponse y RelacionNutricionResponse. Completa SeguimientoService (estadisticas(desde, hasta, agrupacion), comparativa(periodo), insights()) y EntrenamientosService.relacionNutricion(desde, hasta). Crea features/estadisticas/opciones-graficos.ts con funciones puras que convierten las respuestas en EChartsOption (energía consumida frente al objetivo con línea discontinua gris de la media anterior opcional; macros apiladas por periodo; anillo de repartoMacrosPct; línea de peso con media móvil; heatmap de calendario de adherencia: día en objetivo / fuera / sin registro; barras horizontales de kcalPorTipoComida con etiquetas de TipoComida) usando los colores de TOKENS, y una función que genere la tabla alternativa de cada gráfico. Pruebas de las funciones.
```

#### Prompt 34.2 · Pantalla de estadísticas e insights

```text
Lee solo docs/DESIGN.md §7.14 (mira #file:docs/design/mockups/png/05-estadisticas.png). Crea features/estadisticas/EstadisticasComponent (/estadisticas):
- FiltrosPeriodoComponent: ns-segmented 7 días · 4 semanas · 3 meses · Personalizado (rango ≤ 366 días), agrupación Día / Semana / Mes y el interruptor "Comparar con el periodo anterior" (usa /seguimiento/comparativa con SEMANA o MES, o una segunda petición de estadísticas del rango anterior para el personalizado). Todo en queryParams.
- KpisPeriodoComponent: media kcal, proteína media, adherencia (% de días en objetivo) y variación de peso, con ns-metric y delta.
- Gráficos con NsChartComponent (y @defer on viewport): energía frente al objetivo, macros apiladas + reparto medio (anillo), peso, mapa de adherencia (scroll horizontal en móvil), reparto por comidas.
- EntrenoDescansoComponent: media consumida y objetivo medio en días de entreno frente a descanso y "sesiones con ≥ 25 g de proteína en las 2 h siguientes" (sesionesConProteinaPost de sesiones).
- TopAlimentosComponent: tabla de los 10 más consumidos (veces y % de la energía).
- Insights: shared/ui/data/InsightCardComponent (tarjeta ai con icono y texto por severidad, periodo y botón "Preguntar al asistente" que se conecta en el paso 35); lista de insights; si el usuario los tiene desactivados, un enlace a Configuración.
- Estado vacío con menos de 2 días registrados.
En el dashboard, añade la tarjeta "Patrón detectado" (4 columnas, junto al entrenamiento) con el insight más reciente, solo si existe. Activa "Estadísticas" en navegacion.ts (grupo Rendimiento) y la tarjeta "Alimentación y actividad" de /actividad con relacion-nutricion de las últimas 4 semanas.
```

### Comprobación

Con al menos dos semanas de comidas (puedes registrar días pasados): recorre los periodos, activa la comparación y revisa que las cifras coinciden con las de Swagger. Desactiva los insights en Configuración y comprueba que desaparecen.

```bash
npm run build
npm test
```

### Commit, push y pull request

```bash
git add .
git commit -m "feat(estadisticas): estadísticas, comparativas, relación con la actividad e insights"
git push -u origin feature/34-estadisticas-insights
```

| Campo | Valor |
|---|---|
| **Título de la PR** | `Estadísticas e insights` |
| **Rama base** | `main` |

**Descripción de la PR** (pégala al crearla; la última línea cierra la issue):

```markdown
## Qué incluye
- [x] Completar `SeguimientoService` (estadísticas, comparativa e insights) y `EntrenamientosService.relacionNutricion`
- [x] Crear `EstadisticasComponent` con filtros de periodo, comparación y KPIs con delta
- [x] Crear los gráficos: energía frente al objetivo, macros apiladas, reparto (anillo), peso, mapa de adherencia y reparto por comidas
- [x] Crear las tarjetas "Entreno frente a descanso", "Alimentos más consumidos" e `InsightCardComponent`
- [x] Mostrar el insight más reciente en el dashboard

## Cómo probarlo
- Cambiar el periodo (7 días, 4 semanas, 3 meses, personalizado ≤ 366 días) recarga todo y la URL lo conserva
- Con "Comparar" activo, el gráfico de energía muestra la media del periodo anterior y los KPI su variación
- Cada gráfico tiene su alternativa textual y ningún texto baja de 12 px
- Los insights aparecen con su severidad (texto e icono) y desaparecen si se desactivan en Configuración

## Checklist
- [ ] `npm run build` termina sin errores
- [ ] `npm test` pasa
- [ ] No se sube ninguna contraseña, token ni `.env`

Closes #34
```

Después de fusionar: `git checkout main && git pull && git branch -d feature/34-estadisticas-insights`

---

## Paso 35 · Asistente nutricional con IA

> **Ampliación (resto)**

### GitHub: issue y rama

| Campo | Valor |
|---|---|
| **Título de la issue** | `[Frontend] Asistente IA: conversaciones, mensajes con herramientas consultadas, sugerencias, valoración, renombrar, archivar y eliminar` |
| **Rama** | `feature/35-asistente-ia` |

**Descripción de la issue** (cópiala en el campo *Description*):

```markdown
## Objetivo
Conversar con un asistente que consulta los datos reales del usuario (`DESIGN.md` §7.15): lista de conversaciones, chat con indicador de escritura, chips con los datos consultados, sugerencias para empezar, valoración de las respuestas y gestión de las conversaciones, con los límites y avisos de seguridad.

## Tareas
- [ ] Crear `AsistenteService` y un store de la conversación activa (signals)
- [ ] Crear `AsistenteComponent` con las tres zonas: conversaciones, chat y contexto del día
- [ ] Crear `ns-chat-message` y `ns-chat-composer` (sugerencias, multilínea, Enter para enviar)
- [ ] Valorar respuestas, renombrar, archivar, eliminar y buscar conversaciones
- [ ] Conectar "Preguntar al asistente" desde los insights

## Criterios de aceptación
- [ ] Enviar un mensaje muestra "Escribiendo…" y después la respuesta con los chips de "Datos consultados"
- [ ] La respuesta se anuncia con `aria-live="polite"` al completarse (no por fragmentos)
- [ ] 👍/👎 se pueden cambiar y se guardan
- [ ] Sin email verificado, 429 (50 mensajes al día) o 503, el compositor explica el motivo y el mensaje enviado no se pierde

## Archivos
- `core/services`: `asistente.service.ts` (+ pruebas)
- `features/asistente`: `asistente.component.*`, `asistente.store.ts` (+ pruebas), `lista-conversaciones.component.*`, `chat.component.*`, `panel-contexto.component.*`
- `shared/ui/chat`: `chat-message.component.*`, `chat-composer.component.*`
- `core/layout/navegacion.ts` (entrada "Asistente IA" y barra inferior)

## Requiere del backend
`/asistente/**` (paso 36 del backend; modo simulado sin clave). Email verificado.

## Depende de
#34

## Guía
Paso 35 de `docs/Guia_Github_Frontend_NutriSport.md`.
```

```bash
git checkout main
git pull
git checkout -b feature/35-asistente-ia
```

### Qué se crea

- `core/services`: `asistente.service.ts` (+ pruebas)
- `features/asistente`: `asistente.component.*`, `asistente.store.ts` (+ pruebas), `lista-conversaciones.component.*`, `chat.component.*`, `panel-contexto.component.*`
- `shared/ui/chat`: `chat-message.component.*`, `chat-composer.component.*`
- `core/layout/navegacion.ts` (entrada "Asistente IA" y barra inferior)

### Ejecución (en orden)

#### Prompt 35.1 · Servicio y store

```text
Lee solo docs/api/asistente.md y docs/api/general.md §6 (Asistente) y §11.1 (MensajeAsistente). Crea:
- core/services/asistente.service.ts: conversaciones({ archivada?, page, size ≤ 50 }), crear(), detalle(id), actualizar(id, req) (PATCH), eliminar(id), enviar(id, contenido): Observable<MensajeAsistente>, valorar(mensajeId, valor: 1 | -1), sugerencias().
- features/asistente/asistente.store.ts (signals): conversación activa, mensajes, enviando y error. enviar(texto): si no hay conversación, la crea primero; añade al momento el mensaje del usuario como "pendiente" (id temporal), llama a enviar y añade la respuesta; si falla, marca el mensaje con el error y permite "Reintentar" (el backend guarda el mensaje aunque la IA falle con 503: al reintentar, recarga la conversación). Tras el primer mensaje, recarga la lista (el backend pone el título).
Pruebas del store: mensaje optimista, respuesta y error 503.
```

#### Prompt 35.2 · Pantalla del asistente

```text
Lee solo docs/DESIGN.md §7.15 y §10 (aria-live) y mira #file:docs/design/mockups/png/06-asistente-ia.png. Crea features/asistente/AsistenteComponent (/asistente y /asistente/:id):
- ListaConversacionesComponent (280 px; drawer en md y xs): buscador (en el cliente sobre titulo y vistaPrevia), "Nueva conversación", pestañas Activas · Archivadas, cada una con título, vista previa y fecha; menú Renombrar (diálogo), Archivar/Desarchivar y Eliminar (confirmación).
- ChatComponent: cabecera (avatar con el degradado IA, "Asistente NutriSport", estado), mensajes con NsChatMessageComponent (usuario a la derecha en ink-950 con texto blanco; asistente a la izquierda en surface con borde y radio 2xl; texto con saltos de línea y listas simples SIN innerHTML de HTML del modelo; chips "Datos consultados: …" con herramientasUsadas traducidas a texto legible; botones Copiar, 👍 y 👎 con aria-pressed), indicador "Escribiendo…" mientras enviando, región aria-live="polite" que anuncia la respuesta completa y scroll al último mensaje.
- NsChatComposerComponent: chips de GET /asistente/sugerencias en una conversación vacía, textarea que crece (máx. 2000 caracteres con contador), Enter envía y Mayús+Enter salta de línea, botón enviar con aria-label; fijo abajo con safe-area en móvil; ns-disclaimer context 'asistente' debajo.
- PanelContextoComponent (300 px, desde xl; botón info para abrirlo en pantallas menores): objetivos de hoy, consumido, entrenamiento y restricciones activas (GET /seguimiento/resumen y /perfil/preferencias).
- Errores: 403 EMAIL_NO_VERIFICADO → compositor desactivado con "Verifica tu email" y "Reenviar"; 429 → "Has llegado al límite de 50 mensajes de hoy" con la espera; 503 → mensaje con "Reintentar".
Conecta "Preguntar al asistente" de InsightCardComponent: abre /asistente con una conversación nueva y el texto del insight como borrador. Activa "Asistente IA" en navegacion.ts (grupo Inteligencia) y en la barra inferior (Inicio · Comidas · [Registrar] · Plan · Asistente; Actividad y Perfil pasan al drawer).
```

### Comprobación

Pregunta "¿Cuánta proteína llevo hoy?" y "¿Qué ceno si mañana entreno?": comprueba los chips de datos consultados (en modo simulado las respuestas son de ejemplo). Valora una respuesta, renombra y archiva la conversación. Prueba una pregunta sobre dosis de un suplemento: el backend devuelve una respuesta segura.

```bash
npm run build
npm test
```

### Commit, push y pull request

```bash
git add .
git commit -m "feat(asistente): chat con el asistente nutricional y gestión de conversaciones"
git push -u origin feature/35-asistente-ia
```

| Campo | Valor |
|---|---|
| **Título de la PR** | `Asistente nutricional con IA` |
| **Rama base** | `main` |

**Descripción de la PR** (pégala al crearla; la última línea cierra la issue):

```markdown
## Qué incluye
- [x] Crear `AsistenteService` y un store de la conversación activa (signals)
- [x] Crear `AsistenteComponent` con las tres zonas: conversaciones, chat y contexto del día
- [x] Crear `ns-chat-message` y `ns-chat-composer` (sugerencias, multilínea, Enter para enviar)
- [x] Valorar respuestas, renombrar, archivar, eliminar y buscar conversaciones
- [x] Conectar "Preguntar al asistente" desde los insights

## Cómo probarlo
- Enviar un mensaje muestra "Escribiendo…" y después la respuesta con los chips de "Datos consultados"
- La respuesta se anuncia con `aria-live="polite"` al completarse (no por fragmentos)
- 👍/👎 se pueden cambiar y se guardan
- Sin email verificado, 429 (50 mensajes al día) o 503, el compositor explica el motivo y el mensaje enviado no se pierde

## Checklist
- [ ] `npm run build` termina sin errores
- [ ] `npm test` pasa
- [ ] No se sube ninguna contraseña, token ni `.env`

Closes #35
```

Después de fusionar: `git checkout main && git pull && git branch -d feature/35-asistente-ia`

---

## Paso 36 · Exportación de datos y cierre de la Ampliación

> **Ampliación (resto)**

### GitHub: issue y rama

| Campo | Valor |
|---|---|
| **Título de la issue** | `[Frontend] Exportación de los datos de la cuenta (RGPD), revisión final de la Ampliación, pruebas manuales y README` |
| **Rama** | `feature/36-exportacion-cierre` |

**Descripción de la issue** (cópiala en el campo *Description*):

```markdown
## Objetivo
Permitir que el usuario descargue todos sus datos (derecho de acceso y portabilidad) y cerrar la Ampliación: pruebas manuales de los módulos nuevos, revisión de accesibilidad de sus pantallas, atribuciones de los proveedores de datos y README final.

## Tareas
- [ ] Crear `core/util/descarga.ts` y `CuentaService.exportar()`
- [ ] Activar "Exportar mis datos" en Configuración › Privacidad
- [ ] Ampliar `docs/pruebas_manuales_frontend.md` con los casos de la Ampliación y ejecutarlos
- [ ] Revisar la accesibilidad y el responsive de las pantallas de la Ampliación
- [ ] Actualizar el README (funcionalidades, atribuciones y capturas fuera del repositorio)

## Criterios de aceptación
- [ ] "Exportar mis datos" descarga `nutrisport-datos-AAAAMMDD.json` con los datos de la cuenta
- [ ] Sin el email verificado, la exportación explica por qué no está disponible
- [ ] Todos los casos de la Ampliación de `docs/pruebas_manuales_frontend.md` están en OK
- [ ] Las atribuciones de Open Food Facts, TheMealDB y USDA son visibles donde se muestran sus datos (RNF-20)

## Archivos
- `core/util`: `descarga.ts` (+ pruebas)
- `core/services`: `cuenta.service.ts` (`exportar`)
- `features/configuracion`: `privacidad.component.*`
- `docs/pruebas_manuales_frontend.md`, `docs/revision_accesibilidad.md`, `README.md`

## Requiere del backend
`GET /cuenta/exportacion` y el backend completo.

## Depende de
#35

## Guía
Paso 36 de `docs/Guia_Github_Frontend_NutriSport.md`.
```

```bash
git checkout main
git pull
git checkout -b feature/36-exportacion-cierre
```

### Qué se crea

- `core/util`: `descarga.ts` (+ pruebas)
- `core/services`: `cuenta.service.ts` (`exportar`)
- `features/configuracion`: `privacidad.component.*`
- `docs/pruebas_manuales_frontend.md`, `docs/revision_accesibilidad.md`, `README.md`

### Ejecución (en orden)

#### Prompt 36.1 · Exportación

```text
Lee solo docs/api/auth.md §7.6. Crea core/util/descarga.ts con nombreDeContentDisposition(cabecera) y descargarBlob(blob, nombre) (enlace temporal con URL.createObjectURL, click y revokeObjectURL), con pruebas. Añade CuentaService.exportar(): Observable<{ blob: Blob, nombre: string }> (responseType 'blob', observe 'response'; si falta la cabecera, "nutrisport-datos.json"). En PrivacidadComponent activa "Exportar mis datos": explica qué incluye (cuenta y consentimientos, perfil, preferencias, objetivos, comidas, entrenamientos, pesos, menús, listas, favoritas, conversaciones, análisis sin imágenes e insights; nunca la contraseña ni los tokens), botón con loading y, sin email verificado, el aviso con "Reenviar". Funciona aunque el consentimiento esté revocado.
Nota: un error con responseType 'blob' llega como Blob: adapta aApiError para leer el JSON del Blob en ese caso.
```

#### Prompt 36.2 · Cierre de la Ampliación

```text
1. Amplía docs/pruebas_manuales_frontend.md con los bloques Productos y escáner, Recetas, Planificador, Lista de la compra, Administración de recetas, Estadísticas, Asistente y Exportación (mismo formato, ids PM-xx correlativos), incluidos los casos de proveedor no disponible (X-Proveedor-No-Disponible y themealdbDisponible = false), límites (429) y email sin verificar.
2. Revisa las pantallas de la Ampliación con los criterios del paso 23 y añade los resultados a docs/revision_accesibilidad.md.
3. Comprueba que todas las pantallas que muestran datos de Open Food Facts, TheMealDB o USDA tienen su atribución (ns-attribution o el texto equivalente) y lista dónde en el README.
4. Actualiza README.md: funcionalidades del MVP y de la Ampliación, capturas (enlazadas, guardadas fuera del repositorio o en docs/capturas si lo prefieres), atribuciones y licencias, y lo que queda como Visión.
```

### Comprobación

Exporta tus datos y abre el JSON. Ejecuta los casos nuevos de `docs/pruebas_manuales_frontend.md` sobre el frontend en Docker (paso 24) con un usuario nuevo y con el administrador.

```bash
npm run build:prod
npm test
docker compose up -d --build
```

> **Hito: frontend completo (MVP y Ampliación).** Prepara la defensa con `docs/pruebas_manuales_frontend.md` como guion de la demostración.

### Commit, push y pull request

```bash
git add .
git commit -m "feat(cuenta): exportación de datos y cierre de la Ampliación"
git push -u origin feature/36-exportacion-cierre
```

| Campo | Valor |
|---|---|
| **Título de la PR** | `Exportación de datos y cierre de la Ampliación` |
| **Rama base** | `main` |

**Descripción de la PR** (pégala al crearla; la última línea cierra la issue):

```markdown
## Qué incluye
- [x] Crear `core/util/descarga.ts` y `CuentaService.exportar()`
- [x] Activar "Exportar mis datos" en Configuración › Privacidad
- [x] Ampliar `docs/pruebas_manuales_frontend.md` con los casos de la Ampliación y ejecutarlos
- [x] Revisar la accesibilidad y el responsive de las pantallas de la Ampliación
- [x] Actualizar el README (funcionalidades, atribuciones y capturas fuera del repositorio)

## Cómo probarlo
- "Exportar mis datos" descarga `nutrisport-datos-AAAAMMDD.json` con los datos de la cuenta
- Sin el email verificado, la exportación explica por qué no está disponible
- Todos los casos de la Ampliación de `docs/pruebas_manuales_frontend.md` están en OK
- Las atribuciones de Open Food Facts, TheMealDB y USDA son visibles donde se muestran sus datos (RNF-20)

## Checklist
- [ ] `npm run build` termina sin errores
- [ ] `npm test` pasa
- [ ] No se sube ninguna contraseña, token ni `.env`

Closes #36
```

Después de fusionar: `git checkout main && git pull && git branch -d feature/36-exportacion-cierre`

---

## Annex A · Ficheros por paso

Lista de control de lo que crea cada paso (además de las pruebas `*.spec.ts` que indique cada prompt). Márcala a medida que avances.

**Paso 1 · Crear el proyecto Angular y subir la documentación**

- [ ] raíz: `package.json`, `angular.json`, `tsconfig*.json`, `.prettierrc`, `.editorconfig`, `src/`
- [ ] `.github/copilot-instructions.md`
- [ ] `docs/`: `DESIGN.md`, `PROJECT_PROPOSAL.md`, `design/` (assets y mockups)

**Paso 2 · Proxy, entornos, HttpClient, estructura de carpetas y español**

- [ ] raíz: `proxy.conf.json`, `angular.json` (proxy), `tsconfig.json` (alias)
- [ ] `src/environments`: `environment.ts`, `environment.development.ts`
- [ ] `src/app`: `app.config.ts`
- [ ] `core/util`: `fechas.ts` (+ `fechas.spec.ts`)
- [ ] carpetas `core/*`, `shared/*`, `features/*`, `src/styles/*` con `.gitkeep`

**Paso 3 · Sistema de diseño: tokens, tipografía, iconos y estilos base**

- [ ] `src/styles/tokens`: `_primitives.scss`, `_semantic.scss`
- [ ] `src/styles/abstracts`: `_breakpoints.scss`, `_mixins.scss`
- [ ] `src/styles/base`: `_reset.scss`, `_fonts.scss`, `_typography.scss`
- [ ] `src/styles/utilities`: `_layout.scss`, `_text.scss`
- [ ] `src/styles/vendors`: `_cdk-overlay.scss`
- [ ] `src/styles/styles.scss` (y `angular.json`: `styles` y `stylePreprocessorOptions.includePaths`)
- [ ] `shared/design`: `tokens.ts`
- [ ] `core/layout`: `layout.service.ts`
- [ ] `features/dev`: `estilos.component.*` (ruta `/dev/estilos`, solo en desarrollo)

**Paso 4 · Modelos de la API, etiquetas y pipes de formato**

- [ ] `core/models`: `comun.ts`, `auth.ts`, `perfil.ts`, `alimentos.ts`, `comidas.ts`, `analisis.ts`, `actividad.ts`, `seguimiento.ts`, `recetas.ts`, `menus.ts`, `compra.ts`, `asistente.ts`, `admin.ts`, `etiquetas.ts`, `index.ts`
- [ ] `shared/pipes`: `kcal.pipe.ts`, `gramos.pipe.ts`, `numero.pipe.ts`, `fecha-corta.pipe.ts`, `etiqueta.pipe.ts` (+ pruebas)

**Paso 5 · Componentes base del sistema de diseño (I): acciones, formularios y contenedores**

- [ ] `shared/ui/button`: `button.component.*`
- [ ] `shared/ui/form`: `form-field.component.*`, `input.directive.ts`, `select.component.*`, `checkbox.component.*`, `switch.component.*`, `segmented.component.*`, `chip-group.component.*`, `error-campo.directive.ts`
- [ ] `shared/ui/card`: `card.component.*`
- [ ] `shared/ui/feedback`: `badge.component.*`, `alert.component.*`, `spinner.component.*`, `skeleton.component.*`, `empty-state.component.*`
- [ ] `features/dev`: `componentes.component.*` (ruta `/dev/componentes`)
- [ ] `shared/ui/index.ts`

**Paso 6 · Componentes base del sistema de diseño (II): diálogos, avisos, datos y navegación**

- [ ] `shared/ui/overlay`: `dialog.service.ts`, `dialog-shell.component.*`, `confirm.service.ts`, `confirm-dialog.component.*`, `drawer.component.*`
- [ ] `shared/ui/feedback`: `toast.service.ts`, `toast-container.component.*`, `disclaimer.component.*`
- [ ] `shared/ui/data`: `ring.component.*`, `progress-bar.component.*`, `metric.component.*`
- [ ] `shared/ui/form`: `quantity-input.component.*`
- [ ] `shared/ui/nav`: `tabs.component.*`, `stepper.component.*`, `date-strip.component.*`, `paginator.component.*`

**Paso 7 · Sesión, errores de la API e interceptores**

- [ ] `core/util`: `api-error.ts`, `formularios.ts` (+ pruebas)
- [ ] `core/services`: `auth.service.ts` (+ `auth.service.spec.ts`)
- [ ] `core/interceptors`: `auth.interceptor.ts`, `error.interceptor.ts` (+ pruebas)
- [ ] `app.config.ts` (interceptores y `provideAppInitializer`)

**Paso 8 · Guards, layouts y rutas con carga diferida**

- [ ] `core/guards`: `autenticado.guard.ts`, `invitado.guard.ts`, `admin.guard.ts`, `perfil.guard.ts` (+ pruebas)
- [ ] `core/services`: `perfil.service.ts` (solo `existe()` por ahora)
- [ ] `core/layout`: `auth-layout.component.*`, `shell.component.*`, `sidebar.component.*`, `topbar.component.*`, `bottom-nav.component.*`, `nav-drawer.component.*`, `admin-layout.component.*`, `navegacion.ts`
- [ ] `features/errores`: `no-encontrado.component.*`, `sin-permiso.component.*`, `pagina-pendiente.component.*`
- [ ] `app.routes.ts`, `app.config.ts` (`TitleStrategy` con " · NutriSport")

**Paso 9 · Login y registro con consentimiento**

- [ ] `features/auth/login`: `login.component.*`
- [ ] `features/auth/registro`: `registro.component.*`, `revisa-tu-email.component.*`
- [ ] `features/auth/componentes`: `password-strength.component.*`, `campo-password.component.*` (con mostrar/ocultar)
- [ ] `core/util`: `validadores.ts` (+ pruebas)
- [ ] pruebas: `login.component.spec.ts`, `registro.component.spec.ts`

**Paso 10 · Verificación del email y recuperación de la contraseña**

- [ ] `features/auth/verificar-email`: `verificar-email.component.*`
- [ ] `features/auth/recuperar`: `recuperar-password.component.*`, `restablecer-password.component.*`
- [ ] `core/util`: `token-fragmento.ts` (+ pruebas)
- [ ] `core/layout`: `aviso-cuenta.component.*` (aviso de email sin verificar en el shell)
- [ ] `core/services`: `cuenta.service.ts` (`obtener()` por ahora)

**Paso 11 · Configuración inicial del perfil (onboarding)**

- [ ] `core/services`: `perfil.service.ts` (completo), `tipos-actividad.service.ts`, `categorias.service.ts`, `alimentos.service.ts` (`buscar()` por ahora)
- [ ] `features/onboarding`: `onboarding.component.*`, `paso-sobre-ti.component.*`, `paso-deporte.component.*`, `paso-objetivo.component.*`, `paso-alimentacion.component.*`
- [ ] `features/perfil/componentes`: `selector-preferencias.component.*`, `resumen-objetivos.component.*`, `objetivos-manuales-dialog.component.*`
- [ ] `features/onboarding`: `perfil-form.ts` (formulario tipado y conversión, + pruebas)

**Paso 12 · Mi perfil, objetivos y registro de peso**

- [ ] `features/perfil`: `perfil.component.*`, `tarjeta-objetivos.component.*`
- [ ] `features/perfil/componentes`: `registrar-peso-dialog.component.*`
- [ ] `core/services`: `seguimiento.service.ts` (`registrarPeso`, `eliminarPeso`, `seriePeso`)
- [ ] `features/onboarding`: los pasos del onboarding adaptados para reutilizarse como pestañas

**Paso 13 · Configuración: cuenta, seguridad y privacidad**

- [ ] `core/services`: `cuenta.service.ts` (completo, + pruebas)
- [ ] `features/configuracion`: `configuracion.component.*`, `cuenta-datos.component.*`, `seguridad.component.*`, `privacidad.component.*`, `uso-ia.component.*`
- [ ] `core/layout`: `aviso-cuenta.component.*` (aviso de consentimiento revocado)

**Paso 14 · Buscador de alimentos y alimentos propios**

- [ ] `core/services`: `alimentos.service.ts` (completo, + pruebas)
- [ ] `shared/ui/form`: `combobox.component.*`
- [ ] `shared/ui/data`: `nutrition-facts.component.*`, `source-badge.component.*`, `allergen-list.component.*`
- [ ] `features/alimentos`: `buscador-alimentos.component.*`, `ficha-alimento.component.*`, `mis-alimentos.component.*`, `alimento-form.component.*`

**Paso 15 · Registro manual de comidas**

- [ ] `core/services`: `comidas.service.ts` (+ pruebas)
- [ ] `features/comidas/registro`: `registro-comida.component.*`, `comida-editor.store.ts` (+ pruebas), `linea-alimento.component.*`, `totales-comida.component.*`, `copiar-comida-dialog.component.*`

**Paso 16 · Historial de comidas**

- [ ] `features/comidas/historial`: `historial-comidas.component.*`, `filtros-historial.component.*`
- [ ] `features/comidas/componentes`: `meal-card.component.*`, `detalle-comida.component.*`, `duplicar-comida-dialog.component.*`

**Paso 17 · Actividad deportiva**

- [ ] `core/services`: `entrenamientos.service.ts` (+ pruebas)
- [ ] `features/actividad`: `actividad.component.*`, `kpis-semana.component.*`, `carga-semana.component.*`, `entrenamiento-item.component.*`, `entrenamiento-form.component.*`

**Paso 18 · Dashboard diario con gráficos**

- [ ] `shared/design`: `echarts-theme.ts`
- [ ] `shared/ui/data`: `chart.component.*` (envoltorio de `ngx-echarts`)
- [ ] `features/dashboard`: `dashboard.component.*`, `tarjeta-energia.component.*`, `tarjeta-macro.component.*`, `comidas-hoy.component.*`, `entrenamiento-hoy.component.*`, `grafico-semana.component.*`, `tarjeta-peso.component.*`

**Paso 19 · Registro por foto (I): captura, compresión, subida y análisis**

- [ ] `core/util`: `imagen.ts` (+ pruebas)
- [ ] `core/services`: `analisis.service.ts` (+ pruebas)
- [ ] `shared/ui/form`: `dropzone.component.*`
- [ ] `features/analisis`: `foto-comida.component.*`, `progreso-analisis.component.*`

**Paso 20 · Registro por foto (II): revisión y confirmación del análisis**

- [ ] `features/analisis`: `resultado-analisis.component.*`, `revision-analisis.store.ts` (+ pruebas), `candidato-item.component.*`, `cambiar-alimento.component.*`, `foto-marcadores.component.*`
- [ ] `shared/ui/feedback`: `confidence-badge.component.*`

**Paso 21 · Administración (I): usuarios**

- [ ] `core/services/admin`: `admin-usuarios.service.ts` (+ pruebas)
- [ ] `shared/ui/data`: `table.component.*`
- [ ] `features/admin/usuarios`: `usuarios-admin.component.*`, `usuario-detalle.component.*`

**Paso 22 · Administración (II): catálogo de alimentos y categorías**

- [ ] `core/services/admin`: `admin-catalogo.service.ts` (+ pruebas)
- [ ] `features/admin/catalogo`: `catalogo-admin.component.*`, `alimentos-admin.component.*`, `revision-alergenos-dialog.component.*`, `importar-csv.component.*`, `categorias-admin.component.*`, `categoria-form.component.*`
- [ ] `features/alimentos`: `alimento-form.component.*` (modo administrador)

**Paso 23 · Revisión de accesibilidad, responsive y estados**

- [ ] correcciones en `features/**` y `shared/ui/**`
- [ ] `docs/revision_accesibilidad.md` (resultados de la revisión)

**Paso 24 · Imagen Docker con nginx**

- [ ] raíz: `Dockerfile`, `.dockerignore`, `docker-compose.yml`
- [ ] `nginx`: `default.conf.template`
- [ ] `README.md` (sección Docker)

**Paso 25 · Pruebas del flujo completo y cierre del MVP**

- [ ] `docs/pruebas_manuales_frontend.md`
- [ ] `README.md`
- [ ] pruebas: `src/app/flujos/*.spec.ts`

**Paso 26 · A1 · Productos comerciales de Open Food Facts**

- [ ] `core/services`: `productos.service.ts` (+ pruebas)
- [ ] `shared/ui/data`: `attribution.component.*`
- [ ] `features/productos`: `buscador-productos.component.*`, `producto-item.component.*`, `ficha-producto.component.*`, `anadir-a-comida.component.*`
- [ ] `features/comidas/registro`: pestaña "Productos" en `registro-comida.component.*`
- [ ] `core/layout/navegacion.ts` (entrada "Productos")

**Paso 27 · A5 · Escáner de código de barras con la cámara**

- [ ] `shared/ui/form`: `barcode-scanner.component.*`
- [ ] `features/productos`: `escaner.component.*`, `codigo-manual.component.*`
- [ ] `core/layout`: `bottom-nav.component.*` (acción "Escanear código")

**Paso 28 · A2 · Catálogo de recetas y favoritas**

- [ ] `core/services`: `recetas.service.ts` (+ pruebas)
- [ ] `shared/ui/data`: `recipe-card.component.*`, `calc-status.component.*`
- [ ] `features/recetas`: `recetas.component.*`, `filtros-recetas.component.*`, `favoritas.component.*`
- [ ] `core/layout/navegacion.ts` (entrada "Recetas")

**Paso 29 · A3 · Detalle de receta y nutrición calculada**

- [ ] `features/recetas/detalle`: `detalle-receta.component.*`, `ingredientes-receta.component.*`, `nutricion-receta.component.*`, `desglose-nutricion.component.*`, `registrar-receta-dialog.component.*`

**Paso 30 · A4 · Planificador (I): menús, generación y vista semanal**

- [ ] `core/services`: `menus.service.ts` (+ pruebas)
- [ ] `features/planificador`: `planificador.component.*`, `planificador.store.ts`, `generar-menu-dialog.component.*`, `duplicar-menu-dialog.component.*`, `resumen-semana.component.*`
- [ ] `features/planificador/componentes`: `week-planner.component.*`, `meal-slot.component.*`, `dia-planificador.component.*`
- [ ] `core/layout/navegacion.ts` (entrada "Planificador")

**Paso 31 · A4 · Planificador (II): edición del menú, alternativas y sugerencia IA**

- [ ] `features/planificador/edicion`: `anadir-receta-drawer.component.*`, `alternativas-panel.component.*`, `sugerencia-ia.component.*`, `registrar-planificada-dialog.component.*`
- [ ] `features/planificador/componentes`: `meal-slot.component.*` y `week-planner.component.*` (acciones y drag & drop)
- [ ] `features/dashboard`: `comidas-hoy.component.*` (comidas del plan pendientes)

**Paso 32 · A5 · Lista de la compra**

- [ ] `core/services`: `listas-compra.service.ts` (+ pruebas)
- [ ] `features/compra`: `listas-compra.component.*`, `lista-compra.component.*`, `seccion-compra.component.*`, `producto-compra-item.component.*`, `anadir-producto-dialog.component.*`, `generar-lista-dialog.component.*`, `anadir-receta-lista-dialog.component.*`
- [ ] `core/layout/navegacion.ts` (entrada "Lista de la compra")

**Paso 33 · Administración (III): recetas y emparejamientos de ingredientes**

- [ ] `core/services/admin`: `admin-recetas.service.ts` (+ pruebas)
- [ ] `features/admin/catalogo`: `recetas-admin.component.*`, `receta-admin-form.component.*`, `publicacion-receta-dialog.component.*`
- [ ] `features/admin/ingredientes`: `mapeos-ingredientes.component.*`, `emparejar-ingrediente-dialog.component.*`
- [ ] `core/layout/navegacion.ts` (entrada "Ingredientes" en Administración)

**Paso 34 · Estadísticas, comparativas e insights**

- [ ] `core/services`: `seguimiento.service.ts`, `entrenamientos.service.ts` (completos)
- [ ] `features/estadisticas`: `estadisticas.component.*`, `filtros-periodo.component.*`, `kpis-periodo.component.*`, `grafico-energia.component.*`, `grafico-macros.component.*`, `reparto-macros.component.*`, `grafico-peso.component.*`, `mapa-adherencia.component.*`, `reparto-comidas.component.*`, `entreno-descanso.component.*`, `top-alimentos.component.*`, `opciones-graficos.ts` (+ pruebas)
- [ ] `shared/ui/data`: `insight-card.component.*`
- [ ] `features/dashboard`: tarjeta "Patrón detectado"
- [ ] `core/layout/navegacion.ts` (entrada "Estadísticas")

**Paso 35 · Asistente nutricional con IA**

- [ ] `core/services`: `asistente.service.ts` (+ pruebas)
- [ ] `features/asistente`: `asistente.component.*`, `asistente.store.ts` (+ pruebas), `lista-conversaciones.component.*`, `chat.component.*`, `panel-contexto.component.*`
- [ ] `shared/ui/chat`: `chat-message.component.*`, `chat-composer.component.*`
- [ ] `core/layout/navegacion.ts` (entrada "Asistente IA" y barra inferior)

**Paso 36 · Exportación de datos y cierre de la Ampliación**

- [ ] `core/util`: `descarga.ts` (+ pruebas)
- [ ] `core/services`: `cuenta.service.ts` (`exportar`)
- [ ] `features/configuracion`: `privacidad.component.*`
- [ ] `docs/pruebas_manuales_frontend.md`, `docs/revision_accesibilidad.md`, `README.md`


---

## Annex B · Decisiones que concretan o difieren de `DESIGN.md` y `PROJECT_PROPOSAL.md`

1. **Access token solo en memoria** y restauración de la sesión con `POST /auth/refresh` al arrancar (`provideAppInitializer`). Recargar la página no cierra la sesión mientras la cookie `ns_refresh` siga viva (cookie de sesión, o 7 días con "Mantener la sesión iniciada").
2. **Un único refresh en vuelo:** el interceptor comparte la misma petición de refresh entre todas las que fallan con 401 a la vez (el backend rota el refresh token y reutilizar uno ya usado cierra toda la familia de sesiones).
3. **Proxy en desarrollo y nginx en producción:** el navegador solo habla con un origen (`localhost:4200` o el del nginx), así que no hace falta CORS ni `withCredentials`, y la cookie con `Path=/api/v1/auth` y `SameSite=Strict` funciona sin cambios. nginx **sustituye** `X-Forwarded-For` y `X-Forwarded-Proto`, como exige el backend.
4. **Clases con sufijo** (`NsButtonComponent`) en lugar del `NsButton` de los ejemplos de `DESIGN.md` §9.6, para seguir la convención del Prompt 0. Los selectores (`ns-button`, `button[nsButton]`) son los de `DESIGN.md`.
5. **Sin Storybook ni Style Dictionary** (recomendados en `DESIGN.md` §9.1 y §9.4): los *tokens* se escriben a mano en SCSS y en `tokens.ts`, y la página `/dev/componentes` (solo en desarrollo) hace de catálogo visual.
6. **Iconos con `@lucide/angular`** (no `lucide-angular`, que nombra `DESIGN.md` §4 y §9.4): el paquete antiguo solo declara compatibilidad hasta Angular 21. El nuevo es el oficial de Lucide; los iconos se registran con `provideLucideIcons(...)` y se usan con `<svg lucideIcon="nombre">`.
7. **Fuentes:** `@fontsource-variable/manrope` y `@fontsource-variable/inter` autoalojadas (sin Google Fonts).
8. **Sin pantalla "Uso de IA" con contadores:** el backend no expone los análisis y mensajes usados en el día. Configuración muestra los límites (20 análisis y 50 mensajes al día) como texto y el 429 informa del límite al alcanzarlo.
9. **Sin "Panel" de administración con KPIs** (`DESIGN.md` §7.17): no hay endpoints de métricas. La zona de administración empieza en Usuarios. Incidencias y validación de alimentos de usuario son Visión.
10. **Historial de comidas por rangos de 92 días** (máximo del backend) con "Cargar 30 días más" en lugar de paginación infinita, y sin filtro por origen en el servidor (se filtra en el cliente sobre lo cargado).
11. **Fotos siempre convertidas a JPEG en el cliente** (lado mayor ≤ 2048 px, calidad 0,85) con `<canvas>`; así se evitan HEIC y WebP, que el backend no acepta.
12. **Escáner:** `BarcodeDetector` cuando el navegador lo tenga y `@zxing/browser` como alternativa; la introducción manual del código está siempre visible.
13. **Estado de la Ampliación por *polling*** también en el asistente: el backend devuelve la respuesta completa (sin *streaming*), así que se muestra "Escribiendo…" mientras dura la petición.
14. **Modo oscuro, PWA y multi-idioma** son Visión; los textos se escriben directamente en castellano en las plantillas (sin `@angular/localize`).
15. **Fecha de "hoy"** calculada en el navegador con la zona del usuario; el backend usa Europe/Madrid. Para un usuario en España coinciden; el resumen sin `fecha` usa siempre la del servidor.
16. **Recetas sin publicar en la administración:** la API no tiene un listado de administración de recetas ni devuelve el campo `publicada`. La pestaña Recetas busca con `GET /recetas`, publica justo después de crear y guarda en la sesión las recetas recién creadas. Si hace falta más, se puede añadir un `GET /admin/recetas` al backend.
17. **Mis alimentos sin listado propio:** `GET /alimentos` exige texto de búsqueda; los alimentos propios se reconocen por `fuente = USUARIO` y, sin texto, se muestran los de recientes y frecuentes.

---

## Annex C · Crear todas las issues con GitHub CLI (opcional)

Si tienes GitHub CLI instalado y has hecho `gh auth login`, el script `docs/crear_issues_frontend_nutrisport.sh` crea las 36 issues **en orden** (de la #1 a la #36 en un repositorio sin issues ni PR) y guarda los números reales en `issues_frontend.txt`. Ejecútalo desde la raíz del repositorio, en Git Bash, **antes del primer commit del paso 1**:

```bash
bash docs/crear_issues_frontend_nutrisport.sh
echo "issues_frontend.txt" >> .gitignore
```

Para consultar el número de la issue de un paso: `grep '^P07 ' issues_frontend.txt`. Si no tienes GitHub CLI, copia a mano el título y la descripción de cada paso. Después, en cada PR, cambia el `Closes #N` solo si los números reales no coinciden.

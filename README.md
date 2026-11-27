# NutriSport AI · Frontend

NutriSport AI es una aplicación web para que deportistas planifiquen, registren y analicen su alimentación según su perfil, sus objetivos y su actividad física. Este repositorio contiene el frontend Angular del **MVP** y de la **Ampliación**. Lo que queda fuera está en [Visión de producto](#visión-de-producto).

> **Aviso de salud:** la información y las estimaciones de la aplicación son orientativas. No sustituyen el consejo, diagnóstico ni tratamiento de un profesional sanitario.

## Funcionalidades

### MVP

- **Cuenta y acceso:** registro con mayoría de edad y consentimiento de datos de salud, verificación del email, inicio de sesión con renovación transparente, recuperación de contraseña, cambio de email y de contraseña, revocación del consentimiento y eliminación de la cuenta (inmediata o a los 30 días).
- **Perfil y objetivos:** configuración inicial en 4 pasos, cálculo de energía y macros con explicación, objetivos manuales, restricciones (14 alérgenos, intolerancias y dietas) y registro del peso.
- **Comidas:** buscador del catálogo tolerante a erratas, porciones caseras, alimentos propios, avisos de alérgenos, historial filtrable, edición y duplicado.
- **Registro por foto:** análisis con IA, revisión y corrección de cada alimento antes de confirmar y alternativa manual si falla.
- **Actividad:** entrenamientos realizados y planificados, con gasto neto que se suma al objetivo del día, y carga semanal.
- **Dashboard diario:** energía y macros frente al objetivo, comidas del día, próximo entrenamiento, semana y peso.
- **Administración:** usuarios (bloqueo y roles) y catálogo de alimentos y categorías, con revisión de alérgenos e importación CSV.

### Ampliación

| Bloque | Qué incluye | Ruta |
| --- | --- | --- |
| A1 · Productos | Búsqueda en Open Food Facts solo cuando se pide, ficha con nutrientes, ingredientes y alérgenos, y añadir a una comida | `/productos` |
| A1 · Escáner | Código de barras con la cámara (ZXing) o tecleado; si el producto no existe, buscarlo por nombre o crear un alimento propio | `/escaner` |
| A2–A3 · Recetas | Catálogo propio y de TheMealDB con filtros en la URL, favoritas, relacionadas, raciones, cálculo nutricional (completo, aproximado o incompleto) con desglose por ingrediente y registro como comida | `/recetas` |
| A4 · Planificador | Menú semanal por reglas: añadir, sustituir, mover (arrastre o «Mover a…»), bloquear, regenerar, registrar y sugerencia IA opcional | `/planificador` |
| A5 · Lista de la compra | Generada desde el menú, agrupada por sección y sumada; marcar comprados, añadir productos, completar y compartir | `/compra` |
| Admin · Recetas | Alta y edición de recetas propias, publicación con raciones y franjas, y emparejamiento de ingredientes de TheMealDB con el catálogo | `/admin/catalogo/recetas`, `/admin/ingredientes` |
| Estadísticas | Periodos y comparación, KPIs, energía, macros, peso, adherencia, entreno frente a descanso, alimentos más consumidos e insights | `/estadisticas` |
| Asistente IA | Conversaciones de solo lectura sobre tus datos, sugerencias, respuestas seguras, límite diario y aviso orientativo | `/asistente` |
| Exportación | Descarga en JSON de todos los datos de la cuenta (RGPD), también con el consentimiento revocado | Configuración › Privacidad |

Si Open Food Facts o TheMealDB no responden, la aplicación sigue funcionando con los datos locales y lo avisa en pantalla (`X-Proveedor-No-Disponible` y `themealdbDisponible = false`). Los límites (429) muestran el tiempo de espera, y las funciones de IA y la exportación piden el email verificado, con un botón para reenviar el correo.

## Capturas

Las capturas de la aplicación en funcionamiento **todavía no están** en el repositorio: se harán al ejecutar las pruebas manuales de la Ampliación (PM-38 a PM-73) y se guardarán en `docs/capturas/`, con los mismos nombres que las maquetas. Mientras tanto, estas son las **maquetas de diseño** de referencia (no capturas de la aplicación real):

| Pantalla | Maqueta |
| --- | --- |
| Dashboard | [01-dashboard.png](./docs/design/mockups/png/01-dashboard.png) |
| Registro por foto y resultado | [02-registro-foto.png](./docs/design/mockups/png/02-registro-foto.png) · [03-resultado-analisis.png](./docs/design/mockups/png/03-resultado-analisis.png) |
| Registro manual | [08-registro-manual.png](./docs/design/mockups/png/08-registro-manual.png) |
| Buscador de productos y escáner | [09-buscador-productos.png](./docs/design/mockups/png/09-buscador-productos.png) · [10-escaner.png](./docs/design/mockups/png/10-escaner.png) |
| Recetas y detalle | [11-recetas.png](./docs/design/mockups/png/11-recetas.png) · [12-receta-detalle.png](./docs/design/mockups/png/12-receta-detalle.png) |
| Planificador | [04-planificador.png](./docs/design/mockups/png/04-planificador.png) · [13-planificador-recetas.png](./docs/design/mockups/png/13-planificador-recetas.png) |
| Estadísticas | [05-estadisticas.png](./docs/design/mockups/png/05-estadisticas.png) |
| Asistente IA | [06-asistente-ia.png](./docs/design/mockups/png/06-asistente-ia.png) |
| Móvil | [07-movil.png](./docs/design/mockups/png/07-movil.png) |

## Stack

- Angular 22 con componentes standalone, rutas perezosas y TypeScript 6 en modo estricto.
- SCSS, tokens `--ns-*`, signals y formularios reactivos.
- Vitest mediante el ejecutor de pruebas de Angular.
- Angular CDK, `@lucide/angular` y ngx-echarts con ECharts.
- `@zxing/browser` para leer códigos de barras con la cámara.
- API REST Spring Boot independiente; este repositorio contiene solo el frontend.

## Requisitos

- Node.js 22 LTS o superior y npm. El proyecto declara `npm@11.19.0` en `package.json`.
- Git y un navegador moderno.
- Para el backend local: Docker en ejecución y el repositorio `NutriSport-backend`.
- Para probar el frontend empaquetado: Docker y la red que crea el Compose del backend.

## Arranque local

### 1. Arranca el backend y sus servicios

En una terminal Bash o Git Bash, desde el repositorio `NutriSport-backend`:

```bash
docker compose up -d
set -a
source .env
set +a
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

Comprueba que la API responde en <http://localhost:8080/swagger-ui/index.html>. Mailpit captura los correos de prueba en <http://localhost:8025>.

### 2. Instala y arranca el frontend

Desde la raíz de este repositorio:

```bash
npm install
npm start
```

Abre <http://localhost:4200>. El servidor de desarrollo reenvía `/api` a `http://localhost:8080` usando [proxy.conf.json](./proxy.conf.json).

### 3. Usa cuentas de prueba

- **Deportista:** regístrate desde la aplicación y verifica el email abriendo el mensaje en Mailpit.
- **Administrador:** en el perfil `local`, la cuenta se crea con `ADMIN_EMAIL` y `ADMIN_PASS` del `.env` del backend. El email predeterminado es `admin@nutrisport.local`; consulta la contraseña solo en el entorno local y no la copies al frontend.
- Usa cuentas de prueba y datos sintéticos. El registro tiene un límite de intentos por IP.

## Scripts disponibles

| Comando                                              | Descripción                                                                                     |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `npm start`                                          | Arranca el servidor Angular de desarrollo.                                                      |
| `npm test`                                           | Ejecuta las pruebas con Vitest. Para una ejecución sin modo watch: `npm test -- --watch=false`. |
| `npm test -- --watch=false --include=src/app/flujos` | Ejecuta los tres flujos de integración del frontend.                                            |
| `npm run build`                                      | Compila para desarrollo.                                                                        |
| `npm run build:prod`                                 | Compila para producción.                                                                        |
| `npm run watch`                                      | Recompila al cambiar archivos.                                                                  |
| `npm run format`                                     | Aplica Prettier a TypeScript, HTML y SCSS de `src/`.                                            |

## Estructura

```text
src/
  app/
    core/       modelos, servicios, interceptores, guards y layout
    features/   auth, onboarding, dashboard, perfil, comidas, análisis, actividad, configuración y admin (MVP);
                productos, recetas, planificador, compra, estadísticas y asistente (Ampliación)
    flujos/     pruebas de integración de sesión, comidas y análisis
    shared/     componentes UI, pipes y diseño
  environments/ URL base de la API
  styles/      tokens y estilos globales
docs/           contrato API, diseño, guía y pruebas manuales
nginx/          configuración de SPA y proxy para Docker
```

## Conexión con la API

La URL base de la aplicación es `/api/v1`. En desarrollo, Angular usa el proxy de [proxy.conf.json](./proxy.conf.json); en Docker, nginx reenvía `/api/` al backend y sirve la SPA con fallback a `index.html`. El navegador conserva un único origen.

El access token vive solo en memoria. Al arrancar, la aplicación intenta restaurar la sesión mediante `/auth/refresh`; el refresh token lo gestiona la cookie HttpOnly. El interceptor añade el token, comparte un único refresh ante errores 401 y reintenta la petición una sola vez. Los errores Problem Details se convierten en `ApiError`: los errores de campo se asignan al formulario y los demás se muestran mediante alertas o toasts.

Consulta el contrato completo, los tipos, endpoints, errores y flujos en [docs/NutriSport_API.md](./docs/NutriSport_API.md). Los resúmenes por módulo están en [docs/api/](./docs/api/).

## Docker

La imagen del **paso 24** compila Angular con Node 22 y sirve los archivos estáticos con nginx. nginx aplica el fallback de rutas de la SPA, cabeceras de seguridad y proxy inverso de `/api/`. El Compose del frontend se conecta a la red externa `nutrisport-backend_default`, creada por el Compose del backend.

Con el backend en Docker, desde la raíz del frontend:

```bash
docker compose up -d --build
docker compose logs -f frontend
docker compose down
```

La aplicación queda en <http://localhost:4200>. Para usar un backend que se ejecuta en el ordenador, configura `BACKEND_URL` antes de levantar el frontend:

```powershell
$env:BACKEND_URL="http://host.docker.internal:8080"; docker compose up -d --build
```

La red `nutrisport-backend_default` debe existir también en ese caso. Si no la ha creado el Compose del backend, créala una vez con `docker network create nutrisport-backend_default`. Consulta [docker-compose.yml](./docker-compose.yml), [Dockerfile](./Dockerfile) y la configuración de [nginx](./nginx/default.conf.template).

## Pruebas

Las pruebas usan Vitest. Las de [src/app/flujos/](./src/app/flujos/) montan los componentes reales con TestBed y RouterTestingHarness, y controlan la API mediante `HttpTestingController`. Cubren restauración de sesión y reintento tras 401, registro manual con cuerpo exacto y confirmación de análisis corregido.

Para ejecutar toda la suite:

```bash
npm test -- --watch=false
```

El plan de comprobación manual está en [docs/pruebas_manuales_frontend.md](./docs/pruebas_manuales_frontend.md): de PM-01 a PM-37 para el MVP y de PM-38 a PM-73 para la Ampliación, que incluye los casos de proveedor no disponible, límites (429) y email sin verificar.

Estado al 27/11/2026, tras el paso 36:

- `ng build` compila con avisos: el bundle inicial mide 536,65 kB (presupuesto de 500 kB) y `buscador-productos.component.scss`, 5,01 kB (presupuesto de 4 kB).
- `ng test --watch=false`: 933 tests aprobados en 107 archivos.
- Pruebas manuales: el MVP tiene incidencias y casos pendientes registrados en el plan, y su hito sigue sin aceptar. Los 36 casos de la Ampliación están **pendientes de ejecución** en el navegador: los tests con API simulada no sustituyen esa comprobación.

## Accesibilidad

El objetivo es WCAG 2.2 AA: etiquetas para los campos, foco visible, navegación por teclado, anuncios accesibles para resultados asíncronos, contraste suficiente y objetivos táctiles de al menos 44 px. La interfaz se adapta desde 360 px; usa barra inferior en móvil y sidebar en escritorio. Los gráficos incluyen una alternativa tabular. La revisión del MVP (paso 23) y la de la Ampliación (paso 36), con lo corregido y lo pendiente, están en [docs/revision_accesibilidad.md](./docs/revision_accesibilidad.md).

## Decisiones de arquitectura

Las decisiones que concretan o difieren de los documentos de diseño están desarrolladas en el [Annex B de la guía](./docs/Guia_Github_Frontend_NutriSport.md). Entre ellas:

- El access token solo se conserva en memoria y la sesión se restaura con la cookie HttpOnly.
- Solo hay un refresh en vuelo para evitar reutilizar cookies rotadas.
- Se mantiene un mismo origen con proxy Angular en desarrollo y nginx en producción.
- Los tokens SCSS se mantienen en el proyecto; no se usan NgModules, Angular Material ni una librería global de estado.
- Los iconos se importan de `@lucide/angular`; ECharts se carga bajo demanda.
- Las decisiones de la Ampliación y las diferencias respecto a las propuestas se documentan en dicho anexo.

## Licencias y atribuciones

El código de este repositorio se distribuye bajo la licencia MIT, incluida en [LICENSE](./LICENSE). Las licencias de las dependencias se aplican por separado:

| Recurso                                  | Licencia o atribución                                                                                             |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Inter y Manrope (`@fontsource-variable`) | SIL Open Font License 1.1.                                                                                        |
| Iconos Lucide (`@lucide/angular`)        | ISC.                                                                                                              |
| Apache ECharts                           | Apache License 2.0.                                                                                               |
| ngx-echarts                              | MIT.                                                                                                              |
| ZXing (`@zxing/browser`, `@zxing/library`) | MIT y Apache License 2.0.                                                                                       |
| BEDCA                                    | Se conserva la fuente asociada a los datos nutricionales; consulta las condiciones de BEDCA.                      |
| USDA FoodData Central (Ampliación)       | Datos de dominio público (CC0 1.0). Se cita la fuente donde se usan.                                              |
| Open Food Facts (Ampliación)             | Base de datos bajo ODbL; imágenes bajo CC BY-SA. Se muestra la atribución y el enlace que devuelve la API.         |
| TheMealDB (Ampliación)                   | API pública de recetas. Se muestran la atribución y el enlace junto a las recetas y sus imágenes.                 |

Fuentes de datos: [BEDCA](https://www.bedca.net/), [USDA FoodData Central](https://fdc.nal.usda.gov/), [Open Food Facts](https://world.openfoodfacts.org/) y [TheMealDB](https://www.themealdb.com/). No elimines la información de fuente que devuelve la API.

### Dónde se muestran las atribuciones

Cada alimento y cada receta lleva además el badge de su fuente (`ns-source-badge`). La atribución con enlace aparece así:

| Pantalla | Fuente | Atribución |
| --- | --- | --- |
| Buscar productos (`/productos`) · «Productos comerciales» | Open Food Facts | `ns-attribution` al pie de la lista |
| Ficha de producto (`/productos`, `/escaner` y la línea del producto en Registrar comida) | Open Food Facts | `ns-attribution` con proveedor, licencia y enlace de la API |
| Registrar comida · pestaña «Productos» | Open Food Facts | `ns-attribution` (mismo componente que en `/productos`) |
| Recetas (`/recetas`) | TheMealDB | «Recetas e imágenes de TheMealDB» al pie |
| Detalle de receta (`/recetas/:id`) | TheMealDB | «Receta e imagen: TheMealDB», con el enlace de la receta |
| Detalle de receta · «Ver cómo se calcula» | USDA FoodData Central | Nota bajo el desglose por ingrediente |
| Registrar comida · pestaña «Recetas» | TheMealDB | `ns-sources-note` bajo los resultados y las favoritas |
| Planificador · drawer «Añadir receta» | TheMealDB | `ns-sources-note` bajo las recetas disponibles |
| Buscador de alimentos (Registrar comida: resultados, recientes y frecuentes) y ficha de alimento | USDA, Open Food Facts | `ns-sources-note` si alguno de los alimentos viene de ellos |
| Estadísticas · «Alimentos más consumidos» | USDA, Open Food Facts | `ns-sources-note` bajo la tabla |
| Admin · Alimentos (`/admin/catalogo/alimentos`) | USDA, Open Food Facts | `ns-sources-note` bajo la tabla |
| Admin · Recetas (`/admin/catalogo/recetas`) | TheMealDB | `ns-sources-note` bajo la tabla |
| Admin · Ingredientes (`/admin/ingredientes`) | TheMealDB | `ns-sources-note` (los ingredientes vienen de sus recetas) |

El planificador semanal y las listas de la compra solo muestran nombres de recetas y cantidades de ingredientes; la atribución va donde se eligen y se consultan las recetas.

## Visión de producto

No se implementa en este proyecto ([PROJECT_PROPOSAL.md §11.1](./docs/PROJECT_PROPOSAL.md)):

- OCR de etiquetas nutricionales para crear alimentos a partir de una foto.
- Validación por el administrador de los alimentos creados por usuarios u OCR, e incidencias (reportar errores en alimentos, recetas o análisis).
- Panel de métricas de administración (no hay endpoints) y coste de la IA.
- *Streaming* de las respuestas del asistente y acciones de escritura desde el chat («cámbiame la cena del jueves»).
- Variantes de recetas con LLM, tendencias con ML, recomendación colaborativa y `pgvector`.
- Integraciones con Strava, Garmin o Google Fit, y modelo de visión propio.
- 2FA, PWA, varios idiomas, modo oscuro, rol de nutricionista y aplicación móvil nativa.
- Exportar la lista de la compra en PDF (hoy se comparte como texto) y filtro estricto halal o kosher (hoy son preferencias).

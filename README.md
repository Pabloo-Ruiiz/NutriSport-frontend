# NutriSport AI · Frontend

NutriSport AI es una aplicación web para que deportistas planifiquen, registren y analicen su alimentación según su perfil, objetivos y actividad física. El MVP incluye perfil y objetivos, comidas manuales y por foto, entrenamientos, dashboard y administración del catálogo y de usuarios. La Ampliación contempla productos comerciales, recetas, menús, lista de la compra, estadísticas y un asistente con IA.

> **Aviso de salud:** la información y las estimaciones de la aplicación son orientativas. No sustituyen el consejo, diagnóstico ni tratamiento de un profesional sanitario.

## Stack

- Angular 22 con componentes standalone, rutas perezosas y TypeScript 6 en modo estricto.
- SCSS, tokens `--ns-*`, signals y formularios reactivos.
- Vitest mediante el ejecutor de pruebas de Angular.
- Angular CDK, `@lucide/angular` y ngx-echarts con ECharts.
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
    features/   auth, onboarding, dashboard, perfil, comidas, análisis, actividad y admin
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

El plan de comprobación manual del MVP está en [docs/pruebas_manuales_frontend.md](./docs/pruebas_manuales_frontend.md).

Comprobación del 27/11/2026: build e imagen Docker correctos (aviso de presupuesto inicial
de 518,11 kB); 607 tests aprobados en 77 archivos. La ejecución manual con usuario nuevo y
administrador tiene incidencias y casos pendientes registrados en el plan: el hito **MVP del
frontend completo** sigue pendiente de aceptación. Tras cerrarlo, la Ampliación seguirá el
orden del backend: **A1 → A2 → A3 → A4 → A5 y después el resto**.

## Accesibilidad

El objetivo es WCAG 2.2 AA: etiquetas para los campos, foco visible, navegación por teclado, anuncios accesibles para resultados asíncronos, contraste suficiente y objetivos táctiles de al menos 44 px. La interfaz se adapta desde 360 px; usa barra inferior en móvil y sidebar en escritorio. Los gráficos incluyen una alternativa tabular.

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
| BEDCA y USDA FoodData Central            | Se conserva la fuente asociada a los datos nutricionales; consulta las condiciones del proveedor correspondiente. |
| Open Food Facts (Ampliación)             | Datos bajo ODbL. Se muestra la atribución y el enlace de fuente que proporciona la API junto al producto.         |
| TheMealDB (Ampliación)                   | Se muestra la atribución «Receta e imagen: TheMealDB» junto a la receta.                                          |

Fuentes de datos: [BEDCA](https://www.bedca.net/), [USDA FoodData Central](https://fdc.nal.usda.gov/), [Open Food Facts](https://world.openfoodfacts.org/) y [TheMealDB](https://www.themealdb.com/). La atribución visible depende del origen de cada resultado; no elimines la información de fuente que devuelve la API.

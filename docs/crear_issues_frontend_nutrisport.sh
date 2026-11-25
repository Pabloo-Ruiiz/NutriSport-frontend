#!/usr/bin/env bash
# Crea las 36 issues del frontend de NutriSport AI en orden (de la #1 a la #36 en un repositorio sin issues ni PR).
# Requisitos: GitHub CLI (gh) y "gh auth login". Ejecútalo desde la raíz del repositorio del frontend, en Git Bash:
#   bash docs/crear_issues_frontend_nutrisport.sh
# Guarda el número real de cada issue en issues_frontend.txt (añádelo al .gitignore).
set -euo pipefail

if ! command -v gh >/dev/null 2>&1; then
  echo "Instala GitHub CLI: winget install --id GitHub.cli" >&2
  exit 1
fi
gh auth status >/dev/null

: > issues_frontend.txt

crear() {
  local codigo="$1" titulo="$2" cuerpo="$3"
  local url
  url=$(gh issue create --title "$titulo" --body "$cuerpo")
  echo "$codigo ${url##*/} $titulo" | tee -a issues_frontend.txt
}

crear 'P01' '[Frontend] Crear el proyecto Angular en la raíz del repositorio y subir la documentación a docs/' '## Objetivo
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
Paso 1 de `docs/Guia_Github_Frontend_NutriSport.md`.'

crear 'P02' '[Frontend] Configuración base: proxy a la API, entornos, HttpClient, estructura de carpetas, alias y locale es-ES' '## Objetivo
Dejar el proyecto preparado para hablar con la API real a través del proxy de desarrollo (un único origen para el navegador), con la estructura de carpetas de la guía, los alias de importación y el idioma español para fechas y números.

## Tareas
- [ ] Crear `proxy.conf.json` (`/api` → `http://localhost:8080`) y registrarlo en `angular.json`
- [ ] Crear los entornos con `apiUrl = '"'"'/api/v1'"'"'`
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
Paso 2 de `docs/Guia_Github_Frontend_NutriSport.md`.'

crear 'P03' '[Frontend] Sistema de diseño: tokens CSS, fuentes autoalojadas, iconos Lucide, estilos base y utilidades' '## Objetivo
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
Paso 3 de `docs/Guia_Github_Frontend_NutriSport.md`.'

crear 'P04' '[Frontend] Modelos TypeScript de la API, etiquetas de los enumerados y pipes de formato es-ES' '## Objetivo
Tener en `core/models` las interfaces que reflejan exactamente el JSON de la API, los mapas de etiquetas de los enumerados y los pipes que formatean cifras, unidades y fechas como pide `DESIGN.md` §11.

## Tareas
- [ ] Crear las interfaces de `NutriSport_API.md` §5 repartidas por módulo en `core/models/`
- [ ] Crear `etiquetas.ts` con los mapas de §10 y los iconos por tipo de comida (`DESIGN.md` §4)
- [ ] Crear los pipes `kcal`, `gramos`, `numero`, `fechaCorta` y `etiqueta`
- [ ] Probar los pipes y las etiquetas

## Criterios de aceptación
- [ ] Las interfaces compilan y sus nombres y propiedades coinciden con el OpenAPI
- [ ] `1234.5 | kcal` muestra `1.235 kcal`, `112.4 | gramos` muestra `112 g` y `'"'"'2026-11-21'"'"' | fechaCorta` muestra `sáb. 21 nov`
- [ ] Las pruebas de los pipes pasan

## Archivos
- `core/models`: `comun.ts`, `auth.ts`, `perfil.ts`, `alimentos.ts`, `comidas.ts`, `analisis.ts`, `actividad.ts`, `seguimiento.ts`, `recetas.ts`, `menus.ts`, `compra.ts`, `asistente.ts`, `admin.ts`, `etiquetas.ts`, `index.ts`
- `shared/pipes`: `kcal.pipe.ts`, `gramos.pipe.ts`, `numero.pipe.ts`, `fecha-corta.pipe.ts`, `etiqueta.pipe.ts` (+ pruebas)

## Requiere del backend
Nada (los tipos salen de `docs/NutriSport_API.md` §5).

## Depende de
#3

## Guía
Paso 4 de `docs/Guia_Github_Frontend_NutriSport.md`.'

crear 'P05' '[Frontend] Componentes base (I): botón, campos de formulario, selectores, tarjetas, badges, alertas y estados vacíos' '## Objetivo
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
Paso 5 de `docs/Guia_Github_Frontend_NutriSport.md`.'

crear 'P06' '[Frontend] Componentes base (II): diálogos, toasts, confirmación, anillo, barras, métricas, cantidad, tira de fechas, pestañas, stepper y drawer' '## Objetivo
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
Paso 6 de `docs/Guia_Github_Frontend_NutriSport.md`.'

crear 'P07' '[Frontend] AuthService con el token en memoria, restauración de la sesión, ApiError e interceptores de autenticación, refresh y errores' '## Objetivo
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
Paso 7 de `docs/Guia_Github_Frontend_NutriSport.md`.'

crear 'P08' '[Frontend] Guards de sesión, rol y perfil, layouts (público, aplicación con sidebar y barra inferior, administración) y rutas con carga diferida' '## Objetivo
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
Paso 8 de `docs/Guia_Github_Frontend_NutriSport.md`.'

crear 'P09' '[Frontend] Pantallas de login y registro (consentimiento de datos de salud, medidor de contraseña, límite de intentos y "Revisa tu email")' '## Objetivo
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
Paso 9 de `docs/Guia_Github_Frontend_NutriSport.md`.'

crear 'P10' '[Frontend] Verificar el email desde el enlace del correo, recuperar y restablecer la contraseña y aviso de email sin verificar' '## Objetivo
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
Paso 10 de `docs/Guia_Github_Frontend_NutriSport.md`.'

crear 'P11' '[Frontend] Configuración inicial del perfil en 4 pasos (datos, deporte, objetivo y alimentación) y resumen de objetivos calculados' '## Objetivo
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
Paso 11 de `docs/Guia_Github_Frontend_NutriSport.md`.'

crear 'P12' '[Frontend] Pantalla Mi perfil con pestañas (datos físicos, deporte, objetivo y macros, alimentación), objetivos manuales y registro de pesajes' '## Objetivo
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
Paso 12 de `docs/Guia_Github_Frontend_NutriSport.md`.'

crear 'P13' '[Frontend] Configuración de la cuenta: datos y preferencias, contraseña, email, cerrar sesiones, consentimiento de datos de salud y eliminación de la cuenta' '## Objetivo
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
Paso 13 de `docs/Guia_Github_Frontend_NutriSport.md`.'

crear 'P14' '[Frontend] Servicio del catálogo, combobox de búsqueda de alimentos, recientes y frecuentes, ficha de alimento y gestión de mis alimentos' '## Objetivo
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
Paso 14 de `docs/Guia_Github_Frontend_NutriSport.md`.'

crear 'P15' '[Frontend] Registro manual de comidas: buscador, comida en construcción con cantidades y unidades caseras, totales, avisos de restricciones y edición' '## Objetivo
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
Paso 15 de `docs/Guia_Github_Frontend_NutriSport.md`.'

crear 'P16' '[Frontend] Historial de comidas agrupado por días con totales frente al objetivo, filtros, detalle, duplicar y eliminar con deshacer' '## Objetivo
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
Paso 16 de `docs/Guia_Github_Frontend_NutriSport.md`.'

crear 'P17' '[Frontend] Actividad: entrenamientos realizados y planificados con gasto estimado, KPIs y carga de la semana, filtros y formulario de alta y edición' '## Objetivo
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
Paso 17 de `docs/Guia_Github_Frontend_NutriSport.md`.'

crear 'P18' '[Frontend] Dashboard: energía y macros del día frente al objetivo, comidas de hoy, entrenamiento, gráfico semanal de kcal y peso con media móvil (ECharts)' '## Objetivo
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
Paso 18 de `docs/Guia_Github_Frontend_NutriSport.md`.'

crear 'P19' '[Frontend] Registro por foto: captura o subida, compresión a JPEG en el cliente, subida multipart, polling del análisis y estados de error' '## Objetivo
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
Paso 19 de `docs/Guia_Github_Frontend_NutriSport.md`.'

crear 'P20' '[Frontend] Resultado del análisis: foto con marcadores, candidatos con confianza, corrección de gramos y alimento, añadir y quitar, confirmar como comida o descartar' '## Objetivo
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
Paso 20 de `docs/Guia_Github_Frontend_NutriSport.md`.'

crear 'P21' '[Frontend] Administración de usuarios: búsqueda y filtros, detalle, bloqueo y desbloqueo y cambio de roles' '## Objetivo
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
Paso 21 de `docs/Guia_Github_Frontend_NutriSport.md`.'

crear 'P22' '[Frontend] Administración del catálogo: alimentos con filtros, alta y edición en drawer, revisión de alérgenos, importación CSV y categorías' '## Objetivo
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
Paso 22 de `docs/Guia_Github_Frontend_NutriSport.md`.'

crear 'P23' '[Frontend] Revisión de accesibilidad (WCAG 2.2 AA), responsive desde 360 px, estados de carga, vacío y error y rendimiento del dashboard' '## Objetivo
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
Paso 23 de `docs/Guia_Github_Frontend_NutriSport.md`.'

crear 'P24' '[Frontend] Imagen Docker multi-etapa con nginx: SPA, proxy de /api al backend, cabeceras de seguridad y caché' '## Objetivo
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
Paso 24 de `docs/Guia_Github_Frontend_NutriSport.md`.'

crear 'P25' '[Frontend] Pruebas manuales del flujo completo del MVP, pruebas de los flujos críticos y README del frontend' '## Objetivo
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
Paso 25 de `docs/Guia_Github_Frontend_NutriSport.md`.'

crear 'P26' '[Frontend] A1 · Buscador de productos comerciales (Open Food Facts), ficha del producto y registro por código de barras' '## Objetivo
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
Paso 26 de `docs/Guia_Github_Frontend_NutriSport.md`.'

crear 'P27' '[Frontend] Escáner de código de barras con la cámara (BarcodeDetector o ZXing), introducción manual y añadir el producto a una comida' '## Objetivo
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
Paso 27 de `docs/Guia_Github_Frontend_NutriSport.md`.'

crear 'P28' '[Frontend] A2 · Catálogo de recetas propias y de TheMealDB con filtros, categorías, favoritas y atribución' '## Objetivo
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
Paso 28 de `docs/Guia_Github_Frontend_NutriSport.md`.'

crear 'P29' '[Frontend] A3 · Detalle de receta con raciones, ingredientes y conversión, nutrición calculada con su desglose, alérgenos, relacionadas y registrar como comida' '## Objetivo
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
Paso 29 de `docs/Guia_Github_Frontend_NutriSport.md`.'

crear 'P30' '[Frontend] A4 · Planificador: mis menús, generar menú diario o semanal, vista semanal con objetivos por día, vista por día en móvil y gestión del menú' '## Objetivo
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
Paso 30 de `docs/Guia_Github_Frontend_NutriSport.md`.'

crear 'P31' '[Frontend] A4 · Edición del menú: añadir receta a una franja, sustituir con alternativas, mover con arrastrar y soltar, bloquear, quitar, regenerar, registrar como consumida y sugerencia IA' '## Objetivo
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
Paso 31 de `docs/Guia_Github_Frontend_NutriSport.md`.'

crear 'P32' '[Frontend] A5 · Lista de la compra: generar desde un menú, secciones del supermercado, marcar comprado, productos libres, ingredientes de una receta y progreso' '## Objetivo
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
Paso 32 de `docs/Guia_Github_Frontend_NutriSport.md`.'

crear 'P33' '[Frontend] Administración de recetas públicas (alta, edición, publicación) y cola de emparejamientos de ingredientes con el catálogo' '## Objetivo
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
Paso 33 de `docs/Guia_Github_Frontend_NutriSport.md`.'

crear 'P34' '[Frontend] Estadísticas: energía frente al objetivo, macros, reparto, adherencia, peso, comparativa con el periodo anterior, entreno frente a descanso, alimentos más consumidos e insights' '## Objetivo
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
Paso 34 de `docs/Guia_Github_Frontend_NutriSport.md`.'

crear 'P35' '[Frontend] Asistente IA: conversaciones, mensajes con herramientas consultadas, sugerencias, valoración, renombrar, archivar y eliminar' '## Objetivo
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
Paso 35 de `docs/Guia_Github_Frontend_NutriSport.md`.'

crear 'P36' '[Frontend] Exportación de los datos de la cuenta (RGPD), revisión final de la Ampliación, pruebas manuales y README' '## Objetivo
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
Paso 36 de `docs/Guia_Github_Frontend_NutriSport.md`.'

echo "Hecho: 36 issues. Números reales en issues_frontend.txt"

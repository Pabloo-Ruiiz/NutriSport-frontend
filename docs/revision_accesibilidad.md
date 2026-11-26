# Revisión de accesibilidad, responsive y rendimiento

Revisión de `src/app/features/` y `src/app/shared/ui/` frente a DESIGN.md §10 (accesibilidad y
movimiento) y los apartados *Responsive* de §7. Fecha: 27/11/2026.

**Herramientas usadas**

- **Revisión de código:** lectura de plantillas y estilos, con búsquedas por patrón (iconos sin
  `aria-hidden`, botones sin nombre, campos sin etiqueta, tamaños, encabezados, `aria-live`…).
- **Cálculo de contraste:** fórmula de luminancia de WCAG 2.2 aplicada a los valores reales de los
  tokens (`styles/tokens`).
- **Tests unitarios:** Vitest con jsdom (`ng test`). Cada corrección de comportamiento tiene su test.
- **Build de Angular:** `ng build`, para los tamaños de los chunks y los presupuestos.

No se ha probado con lector de pantalla ni con axe/Lighthouse en un navegador real (ver
«Pendiente» al final).

## Problemas y correcciones

| Pantalla | Herramienta | Problema | Corrección | Estado |
|---|---|---|---|---|
| Registro de comida, Duplicar comida, Historial (filtros de fecha) | Revisión de código · test | `nsInput` pinta `aria-describedby` y `aria-invalid` como *host bindings* y pisaba los que se ponían a mano: el error de fecha no quedaba enlazado y el campo no se anunciaba como inválido. | Nuevos inputs `descritoPor` (ids que se suman a los del campo) e `invalido` en `NsInputDirective`; los tres campos los usan en vez de los atributos manuales. Test: `input.directive.spec.ts`. | Corregido |
| Todas (shell y pantallas de acceso) | Revisión de código · test | Al navegar, el foco se quedaba en el enlace pulsado y el lector de pantalla no anunciaba la página nueva. | `core/layout/foco-navegacion.ts`: tras cada navegación a otra ruta, foco al `<h1>` (o a `#contenido`) y anuncio «Página: …» en una región `aria-live`. No actúa en la primera carga, si solo cambian los query params, si el foco estaba en unas pestañas ni con un diálogo abierto. Test: `foco-navegacion.spec.ts`. | Corregido |
| Admin · Alimentos, Admin · Categorías, Mis alimentos | Revisión de código · test | Tras eliminar (o revisar en la cola de pendientes) se recargaba la lista con skeleton y el botón que tenía el foco desaparecía: el foco caía en el `<body>`. | `ns-table` tiene `actualizando` (mantiene las filas con `aria-busy`) y `enfocar()`. Tras eliminar, el foco va a la tabla, al árbol de categorías o al buscador. El árbol ya no se sustituye por el skeleton al recargar. | Corregido |
| Admin · Usuarios | Revisión de código · test | La fila pulsable (`<tr tabindex="0">`) recibía el foco, pero no se anunciaba como pulsable. | El nombre es un botón («Ana López: ver detalle») que abre el drawer; el clic en la fila queda solo como atajo de ratón, sin `tabindex`. | Corregido |
| Dashboard (gráficos) | Revisión de código · test | ECharts anima por JavaScript e ignoraba `prefers-reduced-motion` (la regla global solo afecta al CSS). | `ns-chart` añade `animation: false` si el sistema pide reducir el movimiento, y sigue el ajuste si cambia. | Corregido |
| Registro de comida (quitar alimento), tarjetas de comida, Actividad (menú ⋯ y flechas de semana), control segmentado | Revisión de código | Objetivos táctiles de 32–40 px en móvil (DESIGN.md §10 pide 44 px). | 44 × 44 px por debajo de 768 px; en el botón de quitar, área táctil ampliada con `::after` sin cambiar el tamaño visible. | Corregido |
| Historial, Dashboard (cambio de día), Admin · Categorías | Revisión de código | Al cambiar filtros o día, la lista cambiaba sin anunciarse. | Región `role="status"` siempre presente con el resultado («5 comidas en 3 días…», «Resumen del…», «12 categorías de alimentos»). | Corregido |
| Verificar email | Revisión de código | «Comprobando el enlace…» se sustituía por el resultado sin aviso. | El foco va al título del resultado. | Corregido |
| Actividad (formulario), Registro de comida (línea de alimento), Admin · Usuarios (roles) | Revisión de código | Mensajes de error con `role="alert"` pero sin enlazar con su control. | `aria-describedby` hacia el mensaje: fecha del entrenamiento, cantidad del alimento y `fieldset` de roles. | Corregido |
| Logo (todas) | Revisión de código | El distintivo «IA» estaba a 11 px (mínimo 12 px). | 12 px (`0.75rem`). | Corregido |
| Dashboard (macros), Actividad (KPIs), tablas anchas (p. ej. vista previa del CSV) | Revisión de código | Zonas con scroll horizontal sin nada enfocable dentro: no se podían desplazar con el teclado. | En móvil, los carruseles son enfocables (`tabindex="0"`) con nombre. `ns-table` detecta si desborda y entonces su marco pasa a ser una región enfocable con nombre. | Corregido |
| Dashboard, Mis alimentos, Admin · Categorías, Página en construcción | Revisión de código | Orden de encabezados: estados vacíos en nivel 2 dentro de secciones h3, y un segundo `h1` dentro del shell. | `nivelTitulo` 3 o 4 según la sección; la página en construcción usa nivel 2. | Corregido |
| Buscador de alimentos | Revisión de código | La búsqueda mostraba solo «Buscando…», sin skeleton. | Filas skeleton con `aria-busy` y el texto para lectores de pantalla. | Corregido |
| Todas las pantallas con datos | Revisión de código | Comprobar skeleton de carga, estado vacío con acción y error con «Reintentar». | Revisadas 19 pantallas y tarjetas: todas los tienen salvo el buscador (fila anterior). Perfil, Configuración y Registro no tienen listas que puedan quedar vacías. | Verificado |
| Dashboard (rendimiento) | Build | ECharts se importaba entero (`import('echarts')`): chunk de 1.137 kB. | `echarts-modulos.ts` sobre `echarts/core` con solo lo que se usa (barras, líneas, dispersión, rejilla, tooltip, leyenda, markLine, aria y canvas): 593 kB (170 kB comprimido). Sigue cargándose bajo demanda. | Corregido |
| Dashboard (rendimiento) | Build · test | El gráfico semanal y la tarjeta de peso, debajo del pliegue, se cargaban y pedían sus datos al entrar. | `@defer (on viewport; prefetch on idle)` con placeholder del mismo alto. El chunk del dashboard baja de 40 a 33 kB y la serie de peso no se pide hasta que se ve. **Coste:** el runtime de `@defer` entra en el bundle inicial (+10,5 kB sin comprimir). | Corregido (con coste) |
| Dashboard (peticiones) | Revisión de código · test | La semana se pedía después del día (en cascada), y al elegir otro día de la misma semana se repetía su petición y se cancelaban las de la semana en curso. | Primero el día y, sin esperar, el resto de la semana, en paralelo. Cada fecha se pide una sola vez (`enVuelo` con `shareReplay`) y las peticiones de la semana ya no se cancelan. | Corregido |
| Fuentes | Revisión de código | Comprobar `font-display: swap`. | Fontsource (autoalojado) ya declara `font-display: swap` en todas sus `@font-face`. | Sin cambios (correcto) |

## Comprobado sin problemas

- **Imágenes:** todas con `alt`; el isotipo del logo usa `alt=""` porque lleva el texto al lado.
- **Iconos:** todos con `aria-hidden`, en el `<svg>` o en su contenedor. Todos los botones de solo icono tienen `aria-label`.
- **Campos:** todos con etiqueta (`ns-form-field`, `<label>` que los envuelve o `aria-label`).
- **Gráficos:** ningún texto por debajo de 12 px (`ns-chart` lo corrige). Llevan `role="img"` con resumen y una tabla para lectores de pantalla.
- **Información por color:** la carga semanal usa rayas y puntos además del color; la confianza, los estados y la verificación del email llevan texto o icono.
- **Movimiento CSS:** regla global con `prefers-reduced-motion` en `_reset.scss`.
- **Navegación:** todas las rutas tienen `title`, hay enlace «Saltar al contenido», y diálogos y drawers devuelven el foco al botón que los abrió (CDK).
- **Responsive (§7):** cumplido en acceso, onboarding, dashboard, pestañas, registro, actividad, resultado del análisis y administración.

**Contrastes calculados** (WCAG AA pide 4,5:1 para texto normal):

| Texto / fondo | Ratio |
|---|---|
| Texto terciario / superficie atenuada | 4,90 |
| Texto terciario / fondo info (filas marcadas) | 5,02 |
| Blanco / verde 700 (botón primario) | 5,37 |
| Aviso / fondo de aviso | 5,20 |
| Éxito / fondo de éxito | 5,40 |
| Info / fondo info | 5,57 |
| Error / fondo de error | 6,05 |
| Hidratos / fondo de hidratos | 5,56 |
| Grasas / fondo de grasas | 6,08 |
| Proteínas / fondo de proteínas | 6,52 |
| Actividad / fondo de actividad | 5,15 |
| Blanco / gradiente IA (extremo violeta) | 4,52 |

El verde de la barra de fortaleza de contraseña (3,62:1) no es texto, y supera el 3:1 que se pide
para elementos gráficos.

## Pendiente

| Pantalla | Herramienta | Problema | Corrección | Estado |
|---|---|---|---|---|
| Todas | NVDA / VoiceOver | Las correcciones de foco y anuncios están probadas en jsdom, no con un lector de pantalla real. | Recorrer los flujos principales con NVDA (Windows) y VoiceOver (iOS). | Pendiente |
| Todas | axe DevTools / Lighthouse | No se ha pasado un análisis automático en navegador. | Pasarlo en las pantallas principales y en móvil. | Pendiente |
| Todas | Navegador (zoom) | DESIGN.md §10 pide texto al 200 % y reflujo a una columna al 400 %; revisado solo en el código. | Probarlo en escritorio. | Pendiente |
| Bundle inicial | Build | 518 kB sin comprimir (101,9 kB comprimido), por encima del presupuesto de 500 kB. Ya lo superaba antes de esta revisión (506 kB, 98,1 kB comprimido); casi todo el aumento es el runtime de `@defer`. | Revisar qué entra en `main`, o ajustar el presupuesto. | Pendiente |

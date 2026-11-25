# NutriSport AI — Manual de Identidad Visual y Sistema de Diseño

> Fuente de verdad visual del proyecto. Cualquier pantalla o componente de Angular debe poder construirse con los *tokens*, componentes y patrones definidos aquí. Si algo no está definido, se propone un cambio a este documento antes de implementarlo.

| Campo | Valor |
|---|---|
| Versión | 1.2 (pantallas de APIs externas; v1.1 revisada tras la auditoría) |
| Fecha | 21/11/2026 |
| Alcance | Aplicación web responsive (Angular) — tema claro |
| Documentos relacionados | [`PROJECT_PROPOSAL.md`](PROJECT_PROPOSAL.md) (qué es el producto y cómo funciona) |
| Mockups | [`docs/design/mockups/`](design/mockups/index.html) |
| Recursos | [`docs/design/assets/`](design/assets/) (logotipo SVG) |

---

## Índice

1. [Identidad visual](#1-identidad-visual)
2. [Paleta de colores](#2-paleta-de-colores)
3. [Tipografía](#3-tipografía)
4. [Iconografía e ilustración](#4-iconografía-e-ilustración)
5. [Sistema de componentes](#5-sistema-de-componentes)
6. [Layout y navegación](#6-layout-y-navegación)
7. [Pantallas de la aplicación](#7-pantallas-de-la-aplicación)
8. [Mockups visuales](#8-mockups-visuales)
9. [Guía de implementación Angular](#9-guía-de-implementación-angular)
10. [Accesibilidad y movimiento](#10-accesibilidad-y-movimiento)
11. [Tono de voz y microcopy](#11-tono-de-voz-y-microcopy)

---

## 1. Identidad visual

### 1.1. Personalidad de marca

NutriSport AI es **un preparador sereno y preciso**: sabe de datos, habla claro y no exagera. Se comporta como el analista de rendimiento de un equipo profesional, no como una app de dietas.

| Es | No es |
|---|---|
| Precisa, analítica | Fría o clínica |
| Motivadora con datos | Eufórica ni infantil |
| Tecnológica | Futurista recargada (neones, *glow* excesivo) |
| Honesta sobre la incertidumbre | Infalible |
| Premium y sobria | Genérica o "de plantilla" |

### 1.2. Concepto visual: **"Rendimiento medido"**

La interfaz se inspira en los paneles de telemetría deportiva: fondo claro y limpio, una barra lateral oscura tipo "cabina", métricas grandes con cifras tabulares, y el color reservado para **datos y acciones**, nunca como decoración. El verde transmite salud y progreso; el índigo identifica todo lo que hace la inteligencia artificial, de modo que el usuario sabe siempre qué es estimado por la IA y qué es dato confirmado.

### 1.3. Valores que transmite

- **Salud:** verde vital, superficies limpias, mucho aire.
- **Rendimiento:** métricas protagonistas, anillos de progreso, ritmo visual de "dashboard".
- **Tecnología e IA:** índigo con degradado sutil, iconografía precisa de trazo fino.
- **Confianza:** contraste AA, fuentes legibles, indicación explícita de confianza y fuente de los datos.
- **Modernidad:** radios suaves, sombras ligeras, tipografía geométrica.

### 1.4. Estilo gráfico

- **Superficies planas** con borde de 1 px y sombra muy ligera; sin texturas ni *glassmorphism*.
- **Color con función:** como máximo un color de acento por componente, además de los colores de macronutrientes en datos.
- **Datos primero:** las cifras usan tipografía de display con números tabulares.
- **Degradado IA** (`#4F46E5 → #7A5AF8`) solo en elementos de IA: badge "IA", avatar del asistente, borde del área de análisis.
- **Fotografía real** de comida en recetas y análisis, con radio `lg` y sin filtros.
- **Rasgos propios de la marca** (lo que evita el aspecto de plantilla):
  1. La **línea de pulso** del isotipo como motivo gráfico: aparece en el progreso del análisis IA, en los estados vacíos y en las *sparklines*.
  2. El **doble anillo energía/entrenamiento** como componente firma del dashboard.
  3. **Cifras protagonistas** en Manrope 800 con números tabulares.
  4. La **sidebar "cabina"** oscura frente a un contenido claro.

### 1.5. Logotipo conceptual

Archivo: [`docs/design/assets/logo.svg`](design/assets/logo.svg) (isotipo + logotipo) y [`logo-mark.svg`](design/assets/logo-mark.svg) (solo isotipo).

- **Isotipo:** cuadrado de radio 10/40 en `ink-950` que contiene una **hoja** estilizada cuyo nervio central se convierte en una **línea de pulso** (latido/ritmo). Une alimentación (hoja), deporte (pulso) y medición (línea de datos). El pulso termina en un punto índigo: el "nodo" de la IA.
- **Logotipo:** "NutriSport" en Manrope ExtraBold (800), *tracking* −0,02 em, seguido de una píldora "AI" en índigo.
- **Versiones:** positiva (fondo claro), negativa (sobre `ink-950`), monocroma y solo isotipo (favicon, app icon, avatar).
- **Área de seguridad:** igual a la altura de la "N" alrededor del conjunto. **Tamaño mínimo:** isotipo 20 px; logotipo completo 112 px de ancho.
- **Usos incorrectos:** deformar, rotar, cambiar colores fuera de la paleta, añadir sombras o efectos, colocar sobre fotografías sin capa de contraste.

### 1.6. Eslogan

> **"Tu nutrición deportiva, impulsada por inteligencia artificial."**

Uso en login, registro, landing y metadatos. Versión corta para espacios reducidos: **"Nutrición deportiva inteligente."**

---

## 2. Paleta de colores

Todos los ratios de contraste se han calculado con la fórmula de luminancia relativa de WCAG 2.x. Umbrales: **4,5:1** texto normal (AA), **3:1** texto grande (≥ 18,66 px *bold* o ≥ 24 px) y elementos gráficos/bordes de componentes.

### 2.1. Primario — Verde Vital

| Token | HEX | Uso |
|---|---|---|
| `--ns-green-50` | `#ECFDF3` | Fondo de estado éxito, fila seleccionada, chip activo |
| `--ns-green-100` | `#D1FADF` | Fondo de badge, hover suave |
| `--ns-green-200` | `#A6F4C5` | Pista de barra de progreso sobre fondo oscuro |
| `--ns-green-300` | `#6CE9A6` | Ilustración |
| `--ns-green-400` | `#32D583` | Indicador activo en sidebar oscura (9,79:1 sobre `ink-950`) |
| `--ns-green-500` | `#12B76A` | **Color de marca**: isotipo, anillos de progreso, rellenos grandes. No usar para texto sobre blanco (2,62:1) |
| `--ns-green-600` | `#0B9A5D` | Series de gráfico "kcal" (3,62:1) |
| `--ns-green-700` | `#087A50` | **Acción primaria**: fondo de botón primario (texto blanco 5,37:1), enlaces, foco |
| `--ns-green-800` | `#066B46` | *Hover* de botón primario (6,56:1) |
| `--ns-green-900` | `#054F31` | *Active / pressed* |

### 2.2. Secundario — Tinta (navegación y superficies oscuras)

| Token | HEX | Uso |
|---|---|---|
| `--ns-ink-950` | `#0B1220` | Fondo de sidebar, isotipo, tooltips |
| `--ns-ink-900` | `#101828` | **Texto principal** (17,75:1 sobre blanco) |
| `--ns-ink-800` | `#1A2436` | Item *hover* en sidebar |
| `--ns-ink-700` | `#344054` | Iconos activos, texto en botones secundarios |
| `--ns-ink-400` | `#94A3B8` | Texto de items inactivos en sidebar (7,30:1 sobre `ink-950`) |

### 2.3. Acento IA — Índigo Neural

| Token | HEX | Uso |
|---|---|---|
| `--ns-ai-50` | `#EEF0FF` | Fondo de mensajes del asistente, badge IA (texto `ai-600` 5,55:1) |
| `--ns-ai-100` | `#E0E3FF` | Borde de tarjetas IA |
| `--ns-ai-500` | `#6366F1` | Iconos IA, inicio de degradado |
| `--ns-ai-600` | `#4F46E5` | **Botón/acción IA**, texto IA (6,29:1 sobre blanco) |
| `--ns-ai-700` | `#4338CA` | *Hover* de botón IA (7,90:1) |
| `--ns-ai-violet` | `#7A5AF8` | Final del degradado IA |
| `--ns-gradient-ai` | `linear-gradient(135deg, #4F46E5 0%, #7A5AF8 100%)` | Avatar del asistente, badge "IA", borde animado del análisis |

> **La familia índigo/violeta es exclusiva de la IA.** Ningún dato confirmado por el usuario (entrenamientos, comidas, peso) usa estos tonos.

### 2.4. Colores de datos (macronutrientes)

Se usan **siempre acompañados de etiqueta textual**; el color nunca es la única forma de distinguir una serie. Todos cumplen ≥ 3:1 sobre blanco como elemento gráfico. Cuando el color de un dato se usa para **texto** (badges de macros), se usa su variante `-text`, que cumple 4,5:1 sobre su tinte.

| Dato | Token | HEX | Contraste s/ blanco | Tinte de fondo | Texto sobre el tinte |
|---|---|---|---|---|---|
| Energía (kcal) | `--ns-data-kcal` | `#0B9A5D` | 3,62:1 | `#ECFDF3` | `#067647` |
| Proteínas | `--ns-data-protein` | `#2F6FEB` | 4,57:1 | `#EFF4FF` | `#1D4FBF` |
| Carbohidratos | `--ns-data-carbs` | `#C47F00` | 3,29:1 | `#FFF7E6` | `#8A5A00` |
| Grasas | `--ns-data-fat` | `#D9467A` | 4,11:1 | `#FDF0F5` | `#A8285A` |
| Actividad / entrenamiento | `--ns-data-activity` | `#0E7490` | 5,36:1 | `#ECFEFF` | `#0E7490` (5,15:1) |
| Peso | `--ns-data-weight` | `#344054` | 10,46:1 | `#F2F4F7` | `#344054` |

### 2.5. Neutros — fondos, superficies, textos y bordes

| Token | HEX | Uso | Contraste |
|---|---|---|---|
| `--ns-bg` | `#F7F9FB` | Fondo de la aplicación | — |
| `--ns-surface` | `#FFFFFF` | Tarjetas, modales, topbar | — |
| `--ns-surface-muted` | `#F2F4F7` | Áreas secundarias, cabecera de tabla, *skeleton* | — |
| `--ns-surface-sunken` | `#EAECF0` | Pistas de progreso, *dropzones* | — |
| `--ns-text` | `#101828` | Texto principal, títulos | 17,75:1 |
| `--ns-text-secondary` | `#475467` | Texto de apoyo, descripciones | 7,69:1 |
| `--ns-text-tertiary` | `#5D6B82` | Metadatos, *placeholders*, etiquetas de eje | 5,40:1 (5,11 s/ `bg`) |
| `--ns-text-inverse` | `#FFFFFF` | Texto sobre `ink-950`, `green-700`, `ai-600` | — |
| `--ns-border` | `#EAECF0` | Bordes decorativos de tarjetas y separadores | decorativo |
| `--ns-border-strong` | `#D0D5DD` | Separadores de tabla, borde de *chips* | decorativo |
| `--ns-border-input` | `#7D8798` | **Borde de inputs y controles** | 3,63:1 ✔ (WCAG 1.4.11) |

### 2.6. Estados

| Estado | Texto / icono | Fondo | Borde | Contraste texto/fondo |
|---|---|---|---|---|
| Éxito | `#067647` | `#ECFDF3` | `#ABEFC6` | 5,40:1 |
| Advertencia | `#B54708` | `#FFFAEB` | `#FEDF89` | 5,20:1 |
| Error | `#B42318` | `#FEF3F2` | `#FECDCA` | 6,05:1 |
| Información | `#175CD3` | `#EFF8FF` | `#B2DDFF` | 5,57:1 |
| IA / estimación | `#4F46E5` | `#EEF0FF` | `#E0E3FF` | 5,55:1 |

Botón destructivo: fondo `#B42318`, texto blanco (6,57:1).

### 2.7. Reglas de uso

- **Proporción aproximada:** 70 % neutros claros · 15 % tinta (sidebar y texto) · 10 % verde · 5 % índigo y colores de datos.
- **Un solo botón primario** verde por vista o sección. El CTA global "Registrar comida" de la barra superior no cuenta para esta regla; las acciones contextuales que compiten con él (por ejemplo, en una tarjeta del asistente) usan `secondary`.
- Los colores de **macros** no se usan para estados (p. ej. el rosa de grasas nunca indica error).
- Los elementos generados por IA y aún **no confirmados** llevan siempre el tratamiento índigo + badge "Estimación IA". El índigo/violeta no se usa para nada más.
- Las **restricciones alimentarias** (alergias, intolerancias, dietas) se muestran siempre con el mismo badge neutro con icono `shield-check` (§5.10), nunca en rojo de error ni en verde de éxito.
- **Foco visible:** contorno `2px solid #087A50` con `outline-offset: 2px` (sobre `ink-950`: `#32D583`).
- Modo oscuro: fuera del alcance de la v1; los *tokens* semánticos (§9.1) permiten añadirlo sin tocar componentes.

---

## 3. Tipografía

### 3.1. Familias

| Rol | Familia | Pesos | Motivo |
|---|---|---|---|
| Display / títulos / métricas | **Manrope** | 600, 700, 800 | Geométrica y técnica, con personalidad deportiva sin perder sobriedad; excelente en cifras grandes |
| Interfaz / texto | **Inter** | 400, 500, 600 | Máxima legibilidad en tamaños pequeños, soporte completo de español, números tabulares (`tnum`) |
| Datos tabulares | Inter con `font-feature-settings: "tnum" 1, "cv11" 1` | 500, 600 | Cifras alineadas en tablas y contadores |

Ambas fuentes tienen licencia SIL Open Font License. Se **autoalojan** con `@fontsource` (sin dependencia de Google Fonts en producción, mejor privacidad). *Fallback:* `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.

### 3.2. Escala tipográfica (base 16 px, densidad de aplicación 14 px)

| Token | Familia | Tamaño / interlineado | Peso | Tracking | Uso |
|---|---|---|---|---|---|
| `display` | Manrope | 36 / 44 | 800 | −0,02 em | Login, cifras héroe |
| `h1` | Manrope | 28 / 36 | 700 | −0,02 em | Título de página |
| `h2` | Manrope | 22 / 30 | 700 | −0,01 em | Sección |
| `h3` | Manrope | 18 / 26 | 700 | −0,01 em | Título de sección dentro de una página |
| `card-title` | Manrope | 16 / 24 | 700 | −0,01 em | Título de tarjeta |
| `h4` | Inter | 16 / 24 | 600 | 0 | Subtítulo, cabecera de modal |
| `metric-xl` | Manrope | 32 / 40 | 800 | −0,02 em | KPI principal (kcal) |
| `metric-lg` | Manrope | 24 / 32 | 700 | −0,01 em | KPI de tarjeta |
| `body-lg` | Inter | 16 / 24 | 400 | 0 | Texto de lectura, chat |
| `body` | Inter | 14 / 20 | 400 | 0 | **Texto por defecto** de la interfaz |
| `body-strong` | Inter | 14 / 20 | 600 | 0 | Énfasis, nombres en listas |
| `body-sm` | Inter | 13 / 18 | 400 | 0 | Descripciones secundarias |
| `caption` | Inter | 12 / 16 | 500 | 0 | Metadatos, ejes de gráfico, ayudas |
| `overline` | Inter | 12 / 16 | 600 | +0,06 em, mayúsculas | Etiquetas de sección, grupos del sidebar |
| `label` | Inter | 13 / 18 | 500 | 0 | Etiquetas de formulario |
| `button` | Inter | 14 / 20 | 600 | 0 | Botones (16/24 en tamaño `lg`) |

**Reglas:** longitud de línea de lectura 60–75 caracteres; **ningún texto por debajo de 12 px**, tampoco en los ejes y leyendas de los gráficos ni en las celdas del planificador (en SVG, el tamaño se mide en píxeles reales una vez escalado); no usar mayúsculas completas salvo `overline`; unidades (g, kcal) en peso 500 y color `text-tertiary` junto a la cifra.

---

## 4. Iconografía e ilustración

- **Librería:** [Lucide](https://lucide.dev) (`lucide-angular`), trazo 1,75 px, esquinas redondeadas, licencia ISC.
- **Tamaños:** 16 px (en línea con texto `body` y en botones `sm`), 18 px (botones `md` y `lg`), 20 px (sidebar), 24 px (cabeceras, estados vacíos en círculo de 48 px).
- **Icono de restricción:** `shield-check`. **Icono de entrenamiento:** `activity`.
- **Color:** hereda `currentColor`; iconos decorativos con `aria-hidden="true"`; iconos de solo acción con `aria-label`.
- **Iconos de dominio:** desayuno `coffee`, comida `utensils`, cena `moon`, snack `apple`, pre-entreno `zap`, post-entreno `dumbbell`, foto `camera`, IA `sparkles`, código de barras `scan-barcode`, lista `shopping-basket`, peso `scale`, entrenamiento `activity`.
- **Ilustración:** estados vacíos con composiciones geométricas simples (círculo `surface-muted` + icono 24 px), sin personajes ni estilo infantil.

---

## 5. Sistema de componentes

Prefijo de componentes Angular: `ns-`. Todos los componentes interactivos tienen estados **default, hover, focus-visible, active, disabled** y, cuando aplica, **loading** y **error**.

### 5.1. Botones — `<ns-button>`

| Variante | Fondo | Texto | Borde | Hover | Uso |
|---|---|---|---|---|---|
| `primary` | `green-700` | blanco | — | `green-800` | Acción principal (Guardar, Confirmar) |
| `ai` | `ai-600` | blanco | — | `ai-700` | Acciones que invocan IA (Analizar foto, preguntar al asistente) con icono `sparkles`. La generación de menús **no** es IA: usa `primary` |
| `secondary` | `surface` | `ink-700` | `border-strong` | `surface-muted` | Acciones alternativas |
| `ghost` | transparente | `text-secondary` | — | `surface-muted` | Acciones terciarias, barras de herramientas |
| `danger` | `#B42318` | blanco | — | `#912018` | Eliminar (siempre con confirmación) |
| `link` | — | `green-700` subrayado al hover | — | — | Navegación en línea |

| Tamaño | Alto | Padding horizontal | Radio | Texto | Icono |
|---|---|---|---|---|---|
| `sm` | 32 px | 12 px | `md` 8 px | 13 px | 16 px |
| `md` (por defecto) | 40 px | 16 px | `md` 8 px | 14 px | 18 px |
| `lg` | 48 px | 20 px | `lg` 12 px | 16 px | 18 px |
| `icon` | 40 × 40 | — | `md` | — | 20 px |

- *Disabled:* opacidad 0,5, `cursor: not-allowed`, sin hover.
- *Loading:* *spinner* 16 px sustituye al icono, texto se mantiene, `aria-busy="true"`, ancho fijo.
- *Focus:* anillo de foco global (§2.7).
- Objetivo táctil mínimo 44 × 44 px en móvil (los botones `sm` amplían el área con *padding* invisible).

### 5.2. Inputs — `<ns-input>` / `nsInput`

- Alto 40 px (44 px en móvil), padding 12 px, radio `md`, borde 1 px `border-input`, fondo `surface`, texto `body`.
- *Placeholder* `text-tertiary`. *Hover:* borde `ink-700`. *Focus:* borde `green-700` + `box-shadow: 0 0 0 3px rgba(8,122,80,.16)`.
- *Error:* borde `#B42318`, icono `alert-circle` y mensaje `caption` en rojo debajo, `aria-invalid="true"` y `aria-describedby`.
- *Disabled:* fondo `surface-muted`, texto `text-tertiary`.
- **Sufijos de unidad** (`g`, `kg`, `cm`, `min`) dentro del input, alineados a la derecha en `text-tertiary`.
- **Input numérico de cantidad** (`ns-quantity-input`): alto compacto de 36 px (va dentro de listas), botones −/+ de 32 px, paso configurable (5 g, 0,5 raciones).
- **Buscador** (`ns-search`): icono `search` a la izquierda, atajo `/` visible en escritorio, botón limpiar.

### 5.3. Formularios

- Etiqueta (`label`) encima del campo, 6 px de separación; campos obligatorios sin asterisco, opcionales marcados "(opcional)".
- Texto de ayuda `caption` `text-tertiary` bajo el campo.
- Separación vertical entre campos 20 px; entre grupos 32 px con título `h4`.
- Formularios largos divididos en secciones o pasos (*stepper*); ancho máximo de formulario 640 px.
- Validación al perder el foco y al enviar; resumen de errores al inicio del formulario si hay más de 2 errores.
- Acciones alineadas a la derecha (escritorio) o a ancho completo y fijas abajo (móvil): primaria a la derecha, secundaria a su izquierda.

### 5.4. Selectores

| Componente | Uso | Estilo |
|---|---|---|
| `ns-select` | Listas de 5–15 opciones | Igual que input + `chevron-down`; panel con CDK Overlay, radio `lg`, sombra `lg`, opción 36 px, seleccionada con `green-50` + check |
| `ns-combobox` | Búsqueda de alimentos/recetas | Input con resultados agrupados, resaltado de coincidencia en negrita, navegación por teclado |
| `ns-segmented` | 2–4 opciones excluyentes (Día/Semana/Mes) | Contenedor `surface-muted` radio `md`; opción activa `surface` con **borde 1 px `border-input`** (3,63:1), texto `text` 600 y sombra `xs`; inactivas en `text-secondary` 500. El estado no depende solo del fondo |
| `ns-chip-group` | Multiselección (restricciones, deportes) | *Chips* de 32 px radio `full`, borde `border-strong`; seleccionado `green-50`, borde `green-700`, texto `green-800` + check |
| `ns-checkbox` / `ns-radio` / `ns-switch` | Booleanos | 18 px, marcado `green-700`; switch 36 × 20 |
| `ns-slider` | Intensidad, RPE | Pista `surface-sunken`, relleno `green-500`, *thumb* 20 px blanco con borde |

### 5.5. Tarjetas — `<ns-card>`

- Fondo `surface`, borde 1 px `border`, radio `xl` (16 px), sombra `xs`, padding 20 px (24 px en `lg`).
- Cabecera: título `card-title` (16/24) + subtítulo `body-sm` + acciones a la derecha (botón `ghost` o menú `more-horizontal`).
- **Variantes:**
  - `metric`: overline + `metric-lg` + delta (`▲ 4 %` en éxito / `▼` en error) + *sparkline* opcional.
  - `macro`: anillo o barra de un macronutriente con su color de datos.
  - `meal`: miniatura 56 px radio `lg` + nombre + hora + kcal + chips de macros.
  - `recipe`: imagen 16:10 arriba, título, tiempo, kcal/ración, etiquetas.
  - `ai`: borde `ai-100`, fondo blanco, icono `sparkles` en `ai-600` y badge "IA".
  - `interactive`: hover con borde `border-strong` y sombra `sm`; toda la tarjeta es clicable (`<a>` o `button`).

### 5.6. Modales — `<ns-dialog>` (CDK Dialog)

- *Overlay* `rgba(11,18,32,.48)`; panel `surface`, radio `2xl` (20 px), sombra `xl`, ancho `sm` 400 / `md` 560 / `lg` 720 px.
- Estructura: cabecera (título `h4` + botón cerrar) · cuerpo con *scroll* · pie con acciones.
- En móvil (< 768 px) se presenta como **bottom sheet** con asa, radio superior 20 px, altura máxima 90 vh.
- Foco atrapado, `Esc` cierra, foco devuelto al disparador. Diálogos destructivos con botón `danger` y texto explícito de la consecuencia.

### 5.7. Sidebar — `<ns-sidebar>`

- Ancho 248 px (expandida) / 72 px (colapsada, solo iconos con *tooltip*). Fondo `ink-950`.
- Logotipo negativo arriba (altura 64 px). Grupos con `overline` en `ink-400` (7,30:1).
- Item: alto 40 px, radio `md`, icono 20 px + texto `body` 500 en `ink-400`; *hover* fondo `ink-800` y texto blanco; **activo**: fondo `rgba(255,255,255,.06)`, texto blanco e indicador vertical de 3 px `green-400` a la izquierda.
- Bloque inferior: tarjeta de uso de IA (análisis restantes) y usuario (avatar 32 px, nombre, menú).

### 5.8. Navbar / barra superior — `<ns-topbar>`

- Alto 64 px, fondo `surface` con borde inferior `border`; *sticky*.
- Izquierda: título de página `h1` reducido a 20 px o *breadcrumb*; selector de fecha en vistas diarias.
- Derecha: buscador global (`Ctrl/⌘ K`, borde `border-input`), botón `primary` "Registrar comida" (icono `plus`) y notificaciones (`bell` con punto). El avatar y el menú de usuario están al pie de la sidebar (en móvil, en la barra superior).
- En móvil: alto 56 px, logotipo isotipo + título centrado + avatar; el buscador pasa a icono.

### 5.9. Tablas — `<ns-table>`

- Cabecera `surface-muted`, texto `caption` 600 `text-secondary`; filas 52 px, separador `border`; *hover* `#F9FAFB`.
- Cifras alineadas a la derecha con `tnum`; unidades en `text-tertiary`.
- Ordenación con icono `arrow-up-down`; paginación inferior con selector de tamaño.
- Selección con checkbox y barra de acciones contextual.
- En móvil (< 768 px) cada fila se transforma en **tarjeta apilada** (`ns-table--stack`).

### 5.10. Badges y chips — `<ns-badge>`

- Alto 22 px, padding 0 8 px, radio `full`, texto `caption` 600.
- Variantes: `neutral`, `success`, `warning`, `error`, `info`, `ai` (degradado IA con texto blanco o `ai-50` con texto `ai-600`; solo para IA), `activity` (tinte `#ECFEFF`, texto `#0E7490`; p. ej. "Pre-entreno"), `restriction` (neutro con icono `shield-check`; alergias, intolerancias y dietas) y de macro (`protein`, `carbs`, `fat`) con tinte de fondo y su texto `-text` (§2.4).
- **Badge de confianza IA:** `Alta` (≥ 0,80, éxito), `Media` (0,50–0,79, advertencia), `Baja` (< 0,50, error) — siempre con el porcentaje en texto.

### 5.11. Notificaciones

| Tipo | Componente | Comportamiento |
|---|---|---|
| *Toast* | `ns-toast` | Esquina inferior derecha (superior en móvil), ancho 360 px, icono de estado + título + texto + acción opcional ("Deshacer"); se cierra en 5 s (errores: manual); `role="status"` o `alert` |
| Banner | `ns-alert` | Dentro del contenido, ancho completo, fondo del estado, borde izquierdo 3 px; para avisos persistentes (perfil incompleto, IA no disponible) |
| Aviso orientativo | `ns-disclaimer` | Texto `caption` con icono `info` en `text-tertiary`; obligatorio en análisis, menús y asistente |
| Centro de notificaciones | Panel desde `bell` | Lista con no leídas resaltadas en `green-50` |

### 5.12. Gráficos (Apache ECharts)

- **Tema `nutrisport`** registrado con `echarts.registerTheme` a partir de los *tokens* (§9.4).
- Tipografía Inter 12 px, ejes `text-tertiary`, líneas de rejilla `border` discontinuas, sin bordes de área.
- Series con colores de datos (§2.4); línea 2,5 px, puntos solo al hover; áreas con degradado del color al 12 % → 0 %.
- **Línea objetivo** discontinua `ink-700` con etiqueta "Objetivo".
- *Tooltip* oscuro (`ink-950`, texto blanco, radio `md`) con todas las series del punto.
- Leyenda arriba a la izquierda con marcadores circulares; siempre con etiquetas textuales.
- Tipos estandarizados: líneas (evolución), barras apiladas (macros por día), anillo (reparto de macros), barras horizontales (comparativa), mapa de calor (adherencia calendario).
- Accesibilidad: `aria.enabled: true` y resumen textual del gráfico en un `<p class="sr-only">` o tabla alternativa.

### 5.13. Calendarios

- `ns-date-strip`: tira horizontal de 7 días (día de la semana `caption` + número `h4`), día actual con fondo `ink-950` y texto blanco, días con registro con punto `green-500`.
- `ns-week-planner`: rejilla de 7 columnas × franjas de comida; cada celda es una `meal-slot` de radio `lg` con la receta; totales del día en la cabecera de columna con mini barra de progreso; arrastrar y soltar con CDK.
- `ns-month-calendar`: mapa de adherencia con celdas cuadradas. Escala: < 85 % del objetivo `surface-sunken` con patrón rayado · 85–92 % `green-100` · 92–97 % `green-300` · 97–104 % `green-500` · 104–110 % `green-600` · > 110 % `#FEDF89` con patrón punteado. **Número del día siempre en `ink-900`** (≥ 4,9:1 en todas las celdas; 4,90:1 sobre `green-600`). El porcentaje de cada día se muestra en *tooltip* y en una tabla alternativa para lectores de pantalla.
- `ns-week-planner`: las columnas de los días con entrenamiento llevan un tinte `activity` muy suave en la cabecera.
- `ns-datepicker`: panel CDK Overlay; primer día de la semana: **lunes**; formato `dd/MM/yyyy`; locale `es`.

### 5.14. Componentes de progreso

| Componente | Descripción |
|---|---|
| `ns-ring` | Anillo SVG (tamaños 64 / 120 / 180 px, trazo 10–14 px), pista `surface-sunken`, relleno del color del dato, cifra central `metric`. Si supera el 100 %: el exceso se muestra con patrón y texto "+120 kcal" |
| `ns-progress-bar` | Barra 8 px radio `full`; variante con etiqueta "112 / 160 g"; color por dato o estado |
| `ns-stepper` | Pasos numerados para asistente de configuración: completado `green-700` con check, actual borde `green-700`, pendiente `border-strong` |
| `ns-spinner` | 16 / 24 / 40 px, trazo `green-700` (IA: `ai-600`) |
| Progreso IA | Barra indeterminada con degradado IA + texto de fase ("Detectando alimentos…", "Calculando nutrientes…") |

### 5.15. Estados vacíos, carga y error

| Estado | Patrón |
|---|---|
| **Vacío** | Icono 24 px en círculo 48 px `surface-muted`, título `h4`, texto `body-sm` (máx. 2 líneas), acción primaria. Ej.: "Aún no has registrado comidas hoy" → "Registrar comida" |
| **Carga** | *Skeletons* con la forma final (bloques `surface-muted` con brillo animado 1,4 s); nunca *spinner* a pantalla completa salvo en arranque |
| **Carga IA** | Previsualización de la imagen con efecto de escaneo índigo y fases textuales; botón "Continuar manualmente" **siempre visible**; si a los 30 s no hay resultado, se pasa al estado de error |
| **Error recuperable** | `ns-alert` de error con mensaje humano + "Reintentar" (y, en el análisis de foto, "Continuar manualmente" conservando la foto) |
| **Sin resultados de IA** | "No hemos detectado alimentos en la foto" + "Probar con otra foto" / "Registrar manualmente" |
| **Confirmación** | *Toast* de éxito con el resultado y "Deshacer" durante 5 s (p. ej. "Cena guardada · 718 kcal") |
| **Error de página** | Icono `cloud-off`, título, explicación, "Reintentar" y "Volver al inicio"; código de error en `caption` para soporte |
| **Sin permisos / 404** | Misma estructura, sin revelar si el recurso existe |
| **Proveedor externo no disponible** | `ns-alert` informativo no bloqueante: "Los productos comerciales no están disponibles ahora; te mostramos los del catálogo". Los datos locales se siguen mostrando |

### 5.16. Componentes de datos externos (Ampliación)

Muestran **de dónde viene cada dato**, para separar lo verificado, lo calculado y lo generado por IA (`API_INTEGRATIONS.md` §6.1).

| Componente | Uso | Estilo |
|---|---|---|
| `ns-source-badge` | Procedencia de un alimento, producto o receta | Badge `neutral` con icono y texto: "Catálogo" (`database`), "Open Food Facts" (`barcode`), "TheMealDB" (`utensils`), "USDA" (`database`). Nunca índigo (no es IA) |
| `ns-calc-status` | Estado del cálculo nutricional de una receta | `info` "Calculado" (`COMPLETO`), `warning` "Aproximado · 9 de 10 ingredientes" (`APROXIMADO`), `neutral` "Cálculo incompleto" (`INCOMPLETO`) o "Cálculo pendiente" (no importada). Siempre con texto; las cifras de un cálculo aproximado llevan el prefijo "≈" |
| `ns-nutrition-facts` | Ficha nutricional de un producto (formato de etiqueta) | Tabla con columnas "por 100 g" y "por ración" (si existe); filas energía, grasas (saturadas), hidratos (azúcares), fibra, proteínas, sal; los datos que faltan se muestran como "—" con la nota "dato no disponible", **nunca como 0** |
| `ns-allergen-list` | Alérgenos y trazas | Dos grupos: "Contiene" (`warning` si choca con una restricción del usuario) y "Puede contener" (trazas, `neutral`). Si `alergenosRevisados = false`: nota "Datos de alérgenos de la fuente, sin revisar por NutriSport" |
| `ns-attribution` | Atribución de la fuente | Línea `caption` con icono `info` y enlace: "Datos de Open Food Facts (ODbL)", "Receta e imagen: TheMealDB", "Valores nutricionales: USDA FoodData Central". Obligatoria donde se muestran esos datos |
| `ns-barcode-scanner` | Vista de cámara | Fondo de vídeo a pantalla completa, marco de lectura de 280 × 160 px con esquinas blancas y línea de escaneo `green-400` (sin animación con `prefers-reduced-motion`), texto de ayuda y botón "Introducir código" |
| `ns-recipe-card` | Tarjeta de receta | Variante de `ns-card` con imagen 16:10 (radio `lg`), nombre (`card-title`), categoría y cocina, `ns-source-badge`, kcal y proteína por ración o `ns-calc-status`, y botón corazón (favorita) con `aria-pressed` |

---
---

## 6. Layout y navegación

### 6.1. Estructura principal

```
┌──────────────┬──────────────────────────────────────────────────────┐
│              │  Topbar (64 px, sticky)                              │
│   Sidebar    ├──────────────────────────────────────────────────────┤
│   248 px     │                                                      │
│   ink-950    │  Área de contenido                                   │
│   (fija)     │  padding 32 px · max-width 1440 px · rejilla 12 col  │
│              │                                                      │
│              │                                                      │
└──────────────┴──────────────────────────────────────────────────────┘
```

### 6.2. Navegación (sidebar)

| Grupo | Items |
|---|---|
| **Principal** | Inicio (dashboard) · Comidas · Planificador · Lista de la compra |
| **Rendimiento** | Actividad · Estadísticas |
| **Inteligencia** | Asistente IA |
| **Cuenta** | Mi perfil · Configuración |
| **Administración** *(solo ADMIN)* | Panel · Usuarios · Catálogo · Incidencias |

### 6.3. Navegación responsive

| Breakpoint | Ancho | Sidebar | Navegación | Contenido |
|---|---|---|---|---|
| `xs` | < 480 px | Oculta (drawer) | **Barra inferior** 64 px + botón central de cámara | padding 16 px, 4 columnas, gutter 16 |
| `sm` | 480–767 px | Oculta (drawer) | Barra inferior | padding 16 px, 4 columnas |
| `md` | 768–1023 px | **Colapsada** 72 px | Sidebar de iconos | padding 24 px, 8 columnas, gutter 20 |
| `lg` | 1024–1279 px | Expandida 248 px (colapsable) | Sidebar | padding 32 px, 12 columnas, gutter 24 |
| `xl` | 1280–1535 px | Expandida | Sidebar | padding 32 px, 12 columnas |
| `2xl` | ≥ 1536 px | Expandida | Sidebar | max-width 1440 px centrado |

### 6.4. Menú móvil

- **Barra inferior** (`ns-bottom-nav`). **MVP:** Inicio · Comidas · **[Registrar]** · Actividad · Perfil. **Con la Ampliación:** Inicio · Comidas · **[Registrar]** · Plan · Asistente (Actividad y Perfil pasan al *drawer*). El botón central es un círculo de 56 px `green-700` con icono `camera` que abre un *bottom sheet*: "Foto del plato", "Buscar alimento", "Escanear código", "Desde mi plan".
- **Drawer** (desde el avatar o "Más"): resto de secciones, mismo estilo que la sidebar, ancho 300 px, *overlay* oscuro.
- Respeta `env(safe-area-inset-bottom)`.

### 6.5. Espaciado

Escala base 4 px.

| Token | Valor | Uso típico |
|---|---|---|
| `--ns-space-0` | 0 | — |
| `--ns-space-1` | 4 px | Icono–texto en badges |
| `--ns-space-2` | 8 px | Icono–texto en botones, gap de chips |
| `--ns-space-3` | 12 px | Padding de inputs, gap en listas compactas |
| `--ns-space-4` | 16 px | Padding móvil, gap entre elementos de tarjeta |
| `--ns-space-5` | 20 px | Padding de tarjeta, separación de campos |
| `--ns-space-6` | 24 px | Gutter de rejilla, padding de tarjeta `lg` |
| `--ns-space-8` | 32 px | Padding de página, separación de secciones |
| `--ns-space-10` | 40 px | Separación de bloques grandes |
| `--ns-space-12` | 48 px | Márgenes de pantallas de autenticación |
| `--ns-space-16` | 64 px | Héroes, estados vacíos de página |

### 6.6. Rejilla

- 12 columnas en escritorio, *gutter* 24 px; las tarjetas del dashboard ocupan 3 (KPI), 4, 6, 8 o 12 columnas.
- Layouts tipo: **Dashboard** (8 + 4), **Lista-detalle** (5 + 7), **Formulario centrado** (máx. 640 px), **Chat** (280 px lista + flexible), **Planificador** (ancho completo, *scroll* horizontal en tablet).

### 6.7. Radios

| Token | Valor | Uso |
|---|---|---|
| `--ns-radius-xs` | 4 px | Checkbox, marcas pequeñas |
| `--ns-radius-sm` | 6 px | *Tooltips*, celdas del calendario de adherencia |
| `--ns-radius-md` | 8 px | Botones, inputs, items de menú |
| `--ns-radius-lg` | 12 px | Miniaturas, *meal-slots*, paneles desplegables |
| `--ns-radius-xl` | 16 px | Tarjetas |
| `--ns-radius-2xl` | 20 px | Modales, *bottom sheets*, burbujas de chat |
| `--ns-radius-full` | 9999 px | Badges, chips, avatares, anillos |

### 6.8. Sombras

| Token | Valor | Uso |
|---|---|---|
| `--ns-shadow-xs` | `0 1px 2px rgba(16,24,40,.05)` | Tarjetas en reposo |
| `--ns-shadow-sm` | `0 1px 3px rgba(16,24,40,.08), 0 1px 2px rgba(16,24,40,.04)` | Tarjetas *hover*, segmentado activo |
| `--ns-shadow-md` | `0 4px 8px -2px rgba(16,24,40,.08), 0 2px 4px -2px rgba(16,24,40,.04)` | Elementos flotantes, botón FAB |
| `--ns-shadow-lg` | `0 12px 16px -4px rgba(16,24,40,.08), 0 4px 6px -2px rgba(16,24,40,.03)` | Desplegables, *popovers* |
| `--ns-shadow-xl` | `0 20px 24px -4px rgba(16,24,40,.10), 0 8px 8px -4px rgba(16,24,40,.04)` | Modales |
| `--ns-shadow-focus` | `0 0 0 3px rgba(8,122,80,.16)` | Halo de foco en inputs |

### 6.9. Capas (z-index)

`base 0` · `sticky 10` (topbar) · `sidebar 20` · `dropdown 30` · `overlay 40` · `modal 50` · `toast 60` · `tooltip 70`.

---

## 7. Pantallas de la aplicación

Para cada pantalla: **objetivo · estructura · componentes · información · acciones · responsive**. Las pantallas marcadas con 🖼 tienen mockup en §8. El alcance (MVP, Ampliación o Visión) es el de `PROJECT_PROPOSAL.md` §1.7 y §11.1.

| Pantalla | Alcance |
|---|---|
| 7.1 Login · 7.2 Registro · 7.3 Configuración inicial · 7.4 Dashboard · 7.5 Mi perfil · 7.6 Registro de comidas · 7.7 Foto · 7.8 Resultado del análisis · 7.9 Historial · 7.13 Actividad · 7.16 Configuración · 7.17 Administración (usuarios y catálogo) | MVP |
| 7.10 Planificador · 7.11 Detalle de receta (uso en menús) · 7.12 Lista de la compra · 7.14 Estadísticas · 7.15 Asistente IA · 7.19–7.23 Buscador de productos, escáner, catálogo y detalle de recetas, recetas en el planificador | Ampliación |
| Incidencias y validación de alimentos (en 7.17), lectura de etiquetas (7.18) | Visión |

### 7.1. Login

- **Objetivo:** acceso rápido y confiable.
- **Estructura:** *split* 50/50 — izquierda panel de marca `ink-950` con logotipo negativo, eslogan en `display` blanco, tres beneficios con iconos y una tarjeta métrica decorativa; derecha formulario centrado (máx. 400 px).
- **Componentes:** `ns-input` (email, contraseña con mostrar/ocultar), `ns-checkbox` "Mantener la sesión iniciada" (si no se marca, la sesión termina al cerrar el navegador), `ns-button primary lg` ancho completo, enlace "¿Olvidaste tu contraseña?", `ns-alert` de error y aviso de espera tras varios intentos fallidos.
- **Información:** título "Bienvenido de nuevo", subtítulo, enlace a registro.
- **Acciones:** iniciar sesión, recuperar contraseña, ir a registro.
- **Responsive:** < 1024 px el panel de marca se reduce a una cabecera de 120 px con logotipo; formulario a ancho completo con padding 24 px.

### 7.2. Registro

- **Objetivo:** crear la cuenta con consentimiento informado.
- **Estructura:** mismo *split* que login; formulario: nombre, email, contraseña (con medidor de robustez), confirmar contraseña, checkbox "Declaro ser mayor de 18 años", checkbox de términos y **checkbox separado de consentimiento de datos de salud** con enlace "Qué datos tratamos y por qué" (incluye qué datos se envían al proveedor de IA).
- **Componentes:** inputs, `ns-password-strength` (4 segmentos), checkboxes, botón primario, `ns-alert`.
- **Acciones:** crear cuenta → pantalla "Revisa tu email" (estado vacío con icono `mail-check` y botón "Reenviar").
- **Responsive:** igual que login.

### 7.3. Configuración inicial del perfil

- **Objetivo:** obtener los datos para calcular objetivos en < 2 minutos.
- **Estructura:** pantalla completa sin sidebar; cabecera con logotipo y `ns-stepper` de 4 pasos; tarjeta central de 640 px; pie con "Atrás" / "Continuar".
  1. **Sobre ti:** fecha de nacimiento, sexo, altura, peso.
  2. **Tu deporte:** deporte principal (rejilla de tarjetas seleccionables con icono), días/semana (`ns-segmented` 0–7), duración media, nivel de actividad.
  3. **Tu objetivo:** 5 tarjetas grandes seleccionables; fecha de competición condicional.
  4. **Alimentación:** chips de alérgenos, dietas, alimentos rechazados (combobox), comidas por día.
- **Final:** resumen con `ns-ring` de kcal y barras de macros, explicación desplegable del cálculo ("Cómo lo calculamos"), opción "Ajustar manualmente", botón "Ir a mi panel".
- **Responsive:** tarjeta a ancho completo; stepper compacto ("Paso 2 de 4" + barra); botones fijos abajo.

### 7.4. Dashboard principal 🖼

- **Objetivo:** responder en 5 segundos "¿cómo voy hoy y qué hago ahora?".
- **Estructura (escritorio, 8 + 4 columnas):**
  - Cabecera: saludo + fecha + `ns-date-strip` a la derecha. La acción global "Registrar comida" está en la barra superior y las acciones "Registrar con foto" (`ai`) y "Buscar alimento" (`secondary`), en la tarjeta de comidas.
  - Fila 1 (5 + 7 col): tarjeta héroe de energía (anillo 180 px con restantes en el centro y anillo interior del gasto del entrenamiento; desglose consumido / objetivo / entreno / base) + 3 tarjetas de macros (barra de progreso, gramos restantes y principales fuentes del día).
  - Fila 2 (8 col): **Comidas de hoy** (timeline por franja con `meal` cards, badge "Foto" si se registró con IA, franjas vacías "Añadir" y, con la Ampliación, comidas del plan pendientes con "Marcar comida"); (4 col): **Entrenamiento de hoy** (planificado o realizado, en color `activity`) + **Patrón detectado** (tarjeta `ai`, solo si existen *insights*, Ampliación).
  - Fila 3 (8 col): gráfico semanal de kcal (barras) con marcador de objetivo por día y días de entreno señalados; (4 col): **Peso** con media móvil de 7 días.
- **Componentes:** `ns-ring`, `ns-progress-bar`, `ns-card` (metric, meal, ai), gráfico ECharts, `ns-badge`.
- **Acciones:** registrar comida (foto/búsqueda), abrir comida, marcar el entrenamiento como realizado; con la Ampliación, marcar comida del plan como consumida, ver estadísticas y abrir el asistente desde el *insight*.
- **Etiquetas:** en las pantallas se usa "Hidratos" para los carbohidratos; la abreviatura "HC" solo en espacios compactos (chips, celdas), junto a P y G.
- **Estado vacío (HU-10):** sin comidas hoy, el anillo muestra el objetivo completo como restante y la tarjeta de comidas presenta el estado vacío "Aún no has registrado comidas hoy" con "Registrar con foto" y "Buscar alimento".
- **Responsive:** `md` → 2 columnas; `xs` → una columna en orden: energía, macros (carrusel horizontal), comidas, entrenamiento, insight, gráfico.

### 7.5. Mi perfil

- **Objetivo:** revisar y editar los datos que alimentan los cálculos.
- **Estructura:** cabecera con avatar, nombre, deporte y objetivo; pestañas: **Datos físicos · Deporte · Objetivo y macros · Alimentación**. Tarjeta lateral con objetivos actuales y "Recalcular".
- **Componentes:** `ns-tabs`, formularios, `ns-chip-group`, `ns-ring` pequeño, `ns-alert` informativo cuando un cambio recalcula objetivos.
- **Acciones:** editar, guardar por pestaña, fijar objetivos manuales (switch), registrar nuevo peso.
- **Responsive:** pestañas con *scroll* horizontal; tarjeta lateral bajo el formulario.

### 7.6. Registro de comidas

- **Objetivo:** añadir alimentos a una comida de la forma más rápida posible.
- **Estructura (5 + 7):** izquierda panel de búsqueda (fecha, hora, tipo de comida con `ns-select` —son 8 valores, demasiados para un segmentado—, buscador, pestañas Resultados · Recientes · Frecuentes · Mis alimentos, y Recetas en la Ampliación, resultados en lista); derecha **comida en construcción** (lista editable de alimentos con `ns-quantity-input` y selector de unidad, totales con mini barras de macros, notas) y botón "Guardar comida".
- **Accesos alternativos** sobre el buscador: "Foto del plato" (`ai`) y "Copiar comida anterior" (MVP); "Código de barras" (Ampliación) y "Etiqueta nutricional" (Visión) solo aparecen cuando existan.
- **Componentes:** `ns-search`, `ns-combobox`, lista de resultados (nombre, marca, kcal/100 g, badge de fuente), `ns-quantity-input`, `ns-select` de unidad.
- **Acciones:** añadir/quitar alimento, cambiar cantidad y unidad, guardar (toast "Comida guardada · Deshacer"), crear alimento propio.
- **Avisos:** si un alimento contiene un alérgeno restringido o tiene los alérgenos sin revisar, la línea muestra un `ns-alert` de advertencia en línea (no bloquea).
- **Responsive:** pantalla única con buscador arriba y **resumen fijo inferior** ("3 alimentos · 642 kcal · Ver comida") que abre un *bottom sheet*.

### 7.7. Reconocimiento de alimentos mediante fotografía 🖼

- **Objetivo:** capturar o subir una foto y lanzar el análisis con confianza.
- **Estructura:** stepper horizontal "Foto → Análisis → Revisión" y tres estados de pantalla:
  1. **Foto (paso 1):** *dropzone* grande (borde discontinuo `border-input`, icono `camera` en círculo `ai-50`, "Arrastra una foto o haz clic", JPEG/PNG hasta 10 MB), botones "Hacer foto" y "Subir archivo", y panel lateral con tipo de comida, hora y "Describe tu plato (opcional, mejora la precisión)". Estos datos se rellenan **antes** de pulsar "Analizar" (`ai`).
  2. **Análisis (paso 2):** previsualización con efecto de escaneo índigo, alimentos detectados que aparecen sobre la foto, fases ("Imagen optimizada y sin metadatos", "Detectando alimentos", "Calculando nutrientes") y botón "Continuar manualmente" siempre visible. Los detalles del paso 1 se muestran en **solo lectura** con "Editar y reanalizar".
  3. **Error:** "No hemos podido analizar la foto" o "No hemos detectado alimentos", con "Reintentar" y "Continuar manualmente" conservando la foto.
- **Componentes:** `ns-dropzone`, `ns-stepper`, `ns-segmented`, `ns-input`, progreso IA, `ns-alert`, `ns-disclaimer`, contador de análisis restantes y consejos para una buena foto.
- **Acciones:** capturar, subir, cambiar foto, analizar, reintentar, continuar manualmente.
- **Responsive:** en móvil abre directamente la cámara (`capture="environment"`); la previsualización ocupa el ancho completo y los campos van debajo (mockup 07).

### 7.8. Resultado del análisis de una comida 🖼

- **Objetivo:** revisar y corregir la propuesta de la IA antes de guardarla.
- **Estructura (5 + 7):** izquierda foto con **etiquetas numeradas** superpuestas sobre cada alimento detectado + tarjeta de totales (kcal grande, anillo de reparto de macros); derecha lista de alimentos detectados, cada uno con número, nombre emparejado del catálogo, badge de confianza, `ns-quantity-input` en gramos, macros calculados, menú "Cambiar alimento" (con alternativas sugeridas) y eliminar; botón "Añadir alimento no detectado"; `ns-alert` IA: "Revisa las cantidades: las estimaciones a partir de una foto pueden variar". Pie fijo con "Descartar" y "Confirmar y guardar".
- **Componentes:** imagen con marcadores, `ns-badge` de confianza (los de confianza **baja** resaltan la fila), preparación detectada ("a la plancha", "cocido"), `ns-quantity-input`, `ns-ring`, `ns-combobox`, `ns-alert`, `ns-disclaimer`, badge "Estimación IA" en el total y badge de fuente de datos ("Valores: BEDCA").
- **Tras confirmar:** vuelta al dashboard con el anillo actualizado y un *toast* "Cena guardada · 718 kcal · Deshacer".
- **Acciones:** editar gramos, cambiar alimento, eliminar, añadir, confirmar, descartar; reportar error de reconocimiento (Visión).
- **Responsive:** foto arriba (altura 240 px) con marcadores, lista debajo, totales en barra inferior fija junto a "Confirmar".

### 7.9. Historial de comidas

- **Objetivo:** consultar y gestionar comidas pasadas.
- **Estructura:** filtros (rango de fechas, tipo de comida, origen: manual/foto/plan) + resumen del periodo (media kcal, días registrados); lista agrupada por día con cabecera (fecha, total kcal, barra vs. objetivo) y `meal` cards.
- **Componentes:** `ns-datepicker` de rango, `ns-chip-group`, `ns-card meal`, menú contextual (editar, duplicar, eliminar), paginación infinita.
- **Acciones:** abrir, editar, duplicar en otra fecha, eliminar (con "Deshacer" en toast).
- **Responsive:** filtros en *bottom sheet*; tarjetas a ancho completo.

### 7.10. Planificador semanal 🖼

- **Objetivo:** ver, generar y ajustar el menú de la semana.
- **Estructura:** cabecera con navegación de semana (‹ 16–22 nov 2026 ›), selector de menú, acciones "Regenerar semana" (`primary`, o "Generar menú" si la semana está vacía; es un algoritmo de reglas, **no** lleva tratamiento IA), "Lista de la compra" (`secondary`) y menú con "Guardar como favorito"; fila de resumen semanal (media kcal, % de ajuste al objetivo, días de entreno); **rejilla 7 columnas** (L–D) × franjas (Desayuno, Comida, Merienda, Cena, + pre/post-entreno si aplica); cada cabecera de día muestra kcal planificadas vs. objetivo, **los carbohidratos del día** y, si hay entrenamiento, un icono y un tinte `activity`; cada `meal-slot` muestra nombre (13 px), kcal y proteína (12 px), con acciones al hover (sustituir, bloquear, eliminar). Sin miniaturas en la rejilla semanal.
- **Componentes:** `ns-week-planner`, `meal-slot`, `ns-badge` (bloqueada, `activity` para pre-entreno), panel flotante de **alternativas** anclado a la comida (no tapa la columna de ese día; en móvil, *bottom sheet*) con el delta de kcal y proteína frente a la comida actual, CDK drag & drop.
- **Acciones:** generar/regenerar (respetando bloqueadas), sustituir, mover, bloquear, ver receta, registrar como consumida, generar lista de la compra.
- **Responsive:** `md` → *scroll* horizontal con 3,5 días visibles; `xs` → vista **por día** con `ns-date-strip` y lista vertical de comidas.

### 7.11. Detalle de receta

> Con la integración de TheMealDB, esta pantalla se define en §7.22 (vale para recetas propias e importadas).

- **Objetivo:** cocinar la receta y entender su aporte.
- **Estructura:** imagen héroe 16:6 con título, tiempo, dificultad y etiquetas; columna izquierda (4 col): selector de raciones, **tabla nutricional por ración** con barras de macros, alérgenos (badges), ingredientes con cantidades escaladas y checkbox; columna derecha (8 col): pasos numerados con tiempo por paso; pie de acciones.
- **Componentes:** `ns-quantity-input` (raciones), `ns-table` compacta, `ns-badge` de alérgeno (advertencia si choca con preferencias), `ns-checkbox`.
- **Acciones:** registrar como comida y añadir al plan (Ampliación, como toda la pantalla); reportar error (Visión).
- **Responsive:** una columna; pestañas "Ingredientes · Pasos · Nutrición".

### 7.12. Lista de la compra

- **Objetivo:** comprar lo necesario para el menú de forma ordenada.
- **Estructura:** cabecera con nombre de la lista, menú/rango de origen y **progreso** (12 / 34 comprados); acciones "Añadir producto", "Ocultar comprados", "Compartir"; lista agrupada por **categoría de supermercado** (secciones colapsables con contador); cada producto: checkbox grande, nombre, cantidad total sumada, desglose al expandir ("Lunes 200 g · Miércoles 150 g"), editar/eliminar.
- **Componentes:** `ns-progress-bar`, secciones colapsables, `ns-checkbox` 24 px, `ns-input` en línea, `ns-badge` "Manual".
- **Acciones:** marcar comprado (tachado + mover al final), editar cantidad, añadir manual, eliminar, completar lista.
- **Responsive:** pensada *mobile-first* (uso en el supermercado): elementos de 56 px, botón "Añadir" flotante.

### 7.13. Actividad deportiva

- **Objetivo:** registrar entrenamientos y ver su relación con la alimentación.
- **Estructura:** KPIs de la semana (sesiones, minutos, kcal estimadas, carga); calendario semanal de carga (barras por día con color por intensidad); lista de entrenamientos (realizados y próximos); tarjeta **"Alimentación y actividad"** (Ampliación: kcal y carbohidratos medios en días de entreno vs. descanso). Formulario de alta en modal: tipo (combobox con iconos), **estado (Planificado / Realizado)**, fecha/hora, duración, intensidad (`ns-segmented` + RPE `ns-slider`), distancia opcional, notas; vista previa del gasto estimado y del nuevo objetivo diario.
- **Componentes:** `ns-card metric`, gráfico de barras, `ns-dialog`, `ns-slider`, `ns-table`.
- **Acciones:** registrar, editar, eliminar, filtrar por tipo.
- **Responsive:** KPIs en carrusel; lista en tarjetas; modal como *bottom sheet*.

### 7.14. Estadísticas y progreso 🖼

- **Objetivo:** entender la evolución y detectar oportunidades de mejora.
- **Estructura:** filtros de periodo (`ns-segmented` 7 días · 4 semanas · 3 meses · personalizado) y comparación con periodo anterior; fila de KPIs (media kcal, proteína media, adherencia, variación de peso) con delta; gráfico principal de **energía consumida vs. objetivo**; macros por día (barras apiladas) + reparto medio (anillo); evolución del peso (línea + media móvil); **mapa de adherencia** mensual; comparativa entreno vs. descanso; tarjeta de **insights IA**; tabla de alimentos más consumidos.
- **Componentes:** ECharts (línea, barras apiladas, anillo, heatmap), `ns-card metric`, `ns-segmented`, `ns-table`, tarjeta `ai`.
- **Comparar:** con el interruptor activo, el gráfico de energía muestra la media del periodo anterior como línea gris discontinua y los KPI muestran el delta.
- **Vista diaria o semanal** del gráfico de energía (`ns-segmented`) y tarjeta pequeña **"Reparto por comidas"** (barras horizontales por tipo de comida).
- **Acciones:** cambiar periodo, alternar series, preguntar al asistente sobre un insight; exportar CSV (Visión).
- **Responsive:** gráficos a ancho completo apilados; heatmap con *scroll* horizontal; leyendas debajo del gráfico.

### 7.15. Asistente IA 🖼

- **Objetivo:** conversar con un asistente que conoce y consulta los datos del usuario.
- **Estructura (3 zonas):** izquierda (280 px) lista de conversaciones con buscador y "Nueva conversación"; centro: cabecera (avatar degradado IA, nombre "Asistente NutriSport", estado), mensajes (usuario a la derecha en `ink-950` texto blanco; asistente a la izquierda en `surface` con borde, radio `2xl`), **tarjetas enriquecidas** en las respuestas (resumen de macros, receta, chips de "Datos consultados: Comidas 20 nov"), indicador de escritura, compositor con sugerencias rápidas (chips), campo multilínea y botón enviar; derecha (300 px, desde `xl`) **contexto**: objetivos de hoy, consumido, entrenamiento, restricciones activas. `ns-disclaimer` bajo el compositor.
- **Componentes:** `ns-chat-message`, `ns-chat-composer`, `ns-chip`, tarjetas enriquecidas, `ns-progress-bar`, `ns-badge ai`.
- **Acciones:** enviar mensaje, usar sugerencia, registrar una receta propuesta con un botón `secondary` (lo hace el usuario, no el modelo), copiar, valorar respuesta (👍/👎), nueva conversación, renombrar, eliminar.
- **Streaming opcional:** si no se implementa, se muestra un indicador "Escribiendo…" y la respuesta completa.
- **Responsive:** por debajo de 1280 px se oculta el panel de contexto (accesible desde el botón `info`); `md`/`xs`, lista de conversaciones en drawer; compositor fijo abajo con `safe-area`.

### 7.16. Configuración

- **Objetivo:** gestionar cuenta, privacidad y preferencias.
- **Estructura:** navegación lateral secundaria (Cuenta · Seguridad · Unidades · Privacidad y datos · Uso de IA) + panel de contenido con tarjetas por bloque.
  - *Seguridad:* cambiar contraseña y "Cerrar sesión en todos los dispositivos".
  - *Uso de IA:* análisis y mensajes usados hoy frente al límite diario.
  - *Privacidad y datos:* consentimiento de datos de salud (versión aceptada y botón "Revocar", con explicación de las consecuencias), qué datos se envían al proveedor de IA, exportar datos (Ampliación), **zona de peligro** (eliminar cuenta, borde `#FECDCA`).
- **Componentes:** `ns-switch`, `ns-select`, `ns-card`, `ns-dialog` de confirmación destructiva (requiere contraseña).
- **Responsive:** navegación secundaria como lista que abre cada sección en pantalla propia.

### 7.17. Panel de administración

- **Objetivo:** supervisar la plataforma y mantener el catálogo.
- **Estructura:** sidebar con grupo "Administración" visible; **Panel** (Ampliación): KPIs (usuarios activos 7/30 días, registros/día, análisis IA, tasa de corrección IA) y gráficos de uso. **Usuarios:** tabla con búsqueda, filtros de estado/rol, acciones (bloquear, cambiar rol). **Catálogo (MVP):** pestañas Alimentos · Recetas · Categorías con tabla, filtros (fuente, alérgenos revisados, visibilidad), cola "Alérgenos pendientes de revisar", formulario de edición en panel lateral (*drawer* 560 px), importación CSV con previsualización. **Incidencias y validación de alimentos de usuario (Visión):** vista tipo bandeja (lista + detalle) con estado, asignación y enlace al recurso.
- **Componentes:** `ns-table` con selección y acciones masivas, `ns-drawer`, `ns-badge` de estado, ECharts, `ns-dialog`.
- **Identificación visual:** badge "Admin" en la topbar y franja superior de 3 px `ai-600` para diferenciar el contexto administrativo.
- **Responsive:** optimizado para escritorio (≥ 1024 px); en móvil solo consulta (tablas apiladas) y acciones básicas.

---

### 7.18. Pantallas y patrones complementarios

Flujos sin pantalla propia en §7.1–7.17. Usan los componentes y estados ya definidos.

| Flujo | Alcance | Patrón |
|---|---|---|
| Recuperar y restablecer contraseña | MVP | Mismo *split* que login: email → mensaje genérico "Si existe una cuenta, te hemos enviado un enlace"; enlace → nueva contraseña + confirmar → *toast* e inicio de sesión |
| Verificar email | MVP | Pantalla de estado: comprobando → éxito ("Email verificado", ir al panel) o error ("Enlace caducado", "Reenviar") |
| Registrar pesaje | MVP | Modal `sm` (*bottom sheet* en móvil): fecha (hoy por defecto) y peso en kg con un decimal; tras guardar, *toast* y gráfico actualizado |
| Catálogo de recetas | Ampliación | Definido en §7.21 |
| Escáner de código de barras | Ampliación | Definido en §7.20 |
| Lectura de etiqueta nutricional | Visión | Igual que el flujo de foto; la revisión muestra los valores por 100 g editables y los avisos de coherencia (`ns-alert` de advertencia) |

### 7.19. Buscador de alimentos y productos 🖼 · Ampliación

- **Objetivo:** encontrar un alimento genérico o un producto comercial concreto y añadirlo a una comida.
- **Estructura (7 + 5):** a la izquierda, buscador con dos bloques de resultados:
  1. **"En tu catálogo"**: alimentos y productos ya guardados, con resultados inmediatos.
  2. **"Productos comerciales"**: Open Food Facts, que solo se consulta al pulsar "Buscar en productos comerciales"; nunca al teclear, por el límite de peticiones.

  Cada resultado muestra la imagen (48 px) o un icono, nombre, marca, kcal/100 g, `ns-source-badge` y un aviso si la información nutricional está incompleta. A la derecha, la **ficha del producto** seleccionado: imagen, nombre y marca, código de barras, `ns-nutrition-facts`, ingredientes, `ns-allergen-list`, selector de cantidad o porción, total calculado, botón "Añadir a la comida" y `ns-attribution`.
- **Estados:**
  - producto con información incompleta (sin botón de añadir y con "Crear alimento propio");
  - proveedor no disponible (aviso informativo y solo resultados locales);
  - sin resultados.
- **Responsive:** la ficha se abre como *bottom sheet* a pantalla completa.

### 7.20. Escáner de código de barras 🖼 · Ampliación

- **Objetivo:** añadir un producto envasado en segundos.
- **Flujo:**
  1. Abrir el escáner desde el botón central (*bottom sheet* "Escanear código") o desde el registro de comidas.
  2. `ns-barcode-scanner` detecta el código (o el usuario pulsa "Introducir código" y lo teclea: 8–14 dígitos).
  3. Estado "Buscando producto…".
  4. **Resultado:** ficha compacta (imagen, nombre, marca, kcal y macros por 100 g y por ración, alérgenos), selector de cantidad (ración, unidades o gramos), tipo de comida y "Añadir a {comida}".
- **Estados:**
  - "No encontramos este producto" → "Escanear otro", "Buscar por nombre", "Crear alimento";
  - "Información nutricional incompleta";
  - "Productos comerciales no disponibles" (si el código ya está guardado, se muestra igual);
  - permiso de cámara denegado → "Introducir código".
- **Accesibilidad:** la introducción manual es siempre visible; el resultado se anuncia con `aria-live`.

### 7.21. Catálogo de recetas 🖼 · Ampliación

- **Objetivo:** descubrir recetas para el plan.
- **Estructura:**
  - buscador por nombre;
  - fila de categorías con *scroll* horizontal (`ns-chip-group`; categorías de TheMealDB traducidas);
  - filtros: ingrediente principal, cocina, origen (todas, propias, TheMealDB), franja, "solo compatibles con mis restricciones" y "solo con cálculo nutricional", más los nutricionales "≤ X kcal/ración" y "≥ X g de proteína", que solo se aplican a recetas calculadas;
  - pestañas "Explorar" y "Favoritas";
  - rejilla de `ns-recipe-card` (3–4 columnas).
- **Datos:** las recetas no importadas muestran "Cálculo pendiente" (sus nutrientes se calculan al abrirlas); las importadas muestran kcal y proteína por ración con `ns-calc-status`. Atribución a TheMealDB al pie.
- **Responsive:** 2 columnas en tablet y 1 en móvil; filtros en *bottom sheet*.

### 7.22. Detalle de receta, ingredientes y nutrición calculada 🖼 · Ampliación

- **Objetivo:** cocinar la receta, entender de dónde salen sus números y usarla en el plan.
- **Estructura:**
  - **Cabecera:** imagen 16:9 (radio `xl`), nombre, categoría y cocina, `ns-source-badge`, aviso "Receta original en inglés" si `idioma = en`, botones "Añadir al plan" (`primary`), "Añadir ingredientes a la lista" (`secondary`) y favorita.
  - **Ingredientes y cantidades:** tabla con el nombre (traducido si está emparejado, con el original en `caption`), la medida original ("1 tbsp"), los gramos calculados y el estado de la conversión ("exacta", "estimada", "despreciable", "sin datos"). Selector de raciones con la marca "supuestas" si no están fijadas.
  - **Nutrición calculada:** kcal, proteínas, hidratos y grasas **por ración**, con prefijo "≈" si el cálculo es aproximado; `ns-calc-status` con la completitud ("9 de 10 ingredientes · 97 % de la masa"); enlace "Ver cómo se calcula" (desglose por ingrediente y fuente USDA o catálogo); y `ns-disclaimer` "Valores estimados a partir de los ingredientes, no medidos".
  - **Instrucciones** numeradas.
  - **Alérgenos derivados**, o "Alérgenos sin verificar" si falta algún ingrediente.
  - **Relacionadas:** 3 `ns-recipe-card`.
- **Reglas:** una receta con cálculo incompleto **no** muestra totales por ración y no se puede añadir al plan (botón desactivado con el motivo). Si es incompatible con las restricciones, aviso `warning` y botón desactivado.
- **Responsive:** una columna; pestañas "Ingredientes · Pasos · Nutrición".

### 7.23. Recetas en el planificador 🖼 · Ampliación

- **Objetivo:** añadir recetas reales a la semana y ajustar el día.
- **Estructura:** el planificador (§7.10) con un **panel lateral "Añadir receta"** (*drawer* de 420 px) que se abre desde una franja vacía o desde "Sustituir". Contiene:
  - la franja y el hueco energético ("Cena · sáb 21 · faltan ≈ 560 kcal");
  - un buscador;
  - una lista de recetas disponibles (`GET /menus/recetas-disponibles`), ordenadas por ajuste, con kcal y proteína para las raciones propuestas, `ns-source-badge` y `ns-calc-status`;
  - un selector de raciones y "Añadir".
- **Sugerencia IA (opcional):** tarjeta `ai` con el *badge* "Sugerencia IA" que propone un ajuste de la receta ("Aumenta la pechuga de pollo a 300 g: ≈ +5,6 g de proteína y +30 kcal por ración") o una sustitución de ingrediente. Las cifras las **recalcula el backend** y se muestran como calculadas; acciones "Aplicar" y "Descartar".
- **Lista de la compra:** "Añadir ingredientes a la lista" en el menú de cada comida planificada.

## 8. Mockups visuales

Se han creado **mockups de alta fidelidad en HTML/CSS** (gráficos en SVG inline e ilustración de comida en SVG), visualizables en cualquier navegador moderno, y sus **capturas PNG** (generadas con Chrome en modo *headless*). Comparten una única hoja de estilos con los *tokens* de este documento, de modo que la paleta, la tipografía, la sidebar y los componentes son idénticos en todas las pantallas. Los iconos son un *sprite* SVG con trazos de estilo Lucide inyectado por `assets/app.js`, que también genera la sidebar común.

| # | Pantalla | HTML | Captura |
|---|---|---|---|
| — | Índice de mockups | [`index.html`](design/mockups/index.html) | — |
| 1 | Dashboard principal | [`01-dashboard.html`](design/mockups/01-dashboard.html) | [`png/01-dashboard.png`](design/mockups/png/01-dashboard.png) |
| 2 | Registro de comida mediante fotografía (análisis en curso) | [`02-registro-foto.html`](design/mockups/02-registro-foto.html) | [`png/02-registro-foto.png`](design/mockups/png/02-registro-foto.png) |
| 3 | Resultado del reconocimiento | [`03-resultado-analisis.html`](design/mockups/03-resultado-analisis.html) | [`png/03-resultado-analisis.png`](design/mockups/png/03-resultado-analisis.png) |
| 4 | Planificador semanal | [`04-planificador.html`](design/mockups/04-planificador.html) | [`png/04-planificador.png`](design/mockups/png/04-planificador.png) |
| 5 | Estadísticas nutricionales | [`05-estadisticas.html`](design/mockups/05-estadisticas.html) | [`png/05-estadisticas.png`](design/mockups/png/05-estadisticas.png) |
| 6 | Asistente nutricional con IA | [`06-asistente-ia.html`](design/mockups/06-asistente-ia.html) | [`png/06-asistente-ia.png`](design/mockups/png/06-asistente-ia.png) |
| 7 | Móvil (390 px): dashboard con barra inferior, elegir foto, error del análisis y planificador por día | [`07-movil.html`](design/mockups/07-movil.html) | [`png/07-movil.png`](design/mockups/png/07-movil.png) |
| 8 | Registro manual de comidas | [`08-registro-manual.html`](design/mockups/08-registro-manual.html) | [`png/08-registro-manual.png`](design/mockups/png/08-registro-manual.png) |
| 9 | Buscador de alimentos y productos: resultados y ficha nutricional (Open Food Facts) | [`09-buscador-productos.html`](design/mockups/09-buscador-productos.html) | [`png/09-buscador-productos.png`](design/mockups/png/09-buscador-productos.png) |
| 10 | Escáner de código de barras (móvil): cámara, resultado del escaneo y producto no encontrado | [`10-escaner.html`](design/mockups/10-escaner.html) | [`png/10-escaner.png`](design/mockups/png/10-escaner.png) |
| 11 | Catálogo de recetas saludables (TheMealDB + propias) | [`11-recetas.html`](design/mockups/11-recetas.html) | [`png/11-recetas.png`](design/mockups/png/11-recetas.png) |
| 12 | Detalle de receta: ingredientes y cantidades, nutrición calculada | [`12-receta-detalle.html`](design/mockups/12-receta-detalle.html) | [`png/12-receta-detalle.png`](design/mockups/png/12-receta-detalle.png) |
| 13 | Recetas en el planificador semanal, con sugerencia IA | [`13-planificador-recetas.html`](design/mockups/13-planificador-recetas.html) | [`png/13-planificador-recetas.png`](design/mockups/png/13-planificador-recetas.png) |

**Notas:**
- Los datos (usuario "Álex Romero", cifras, recetas) son ficticios y coherentes entre pantallas. El usuario tiene una intolerancia a la lactosa: por eso los lácteos de los menús son "sin lactosa".
- Las fotografías de comida se representan con una ilustración SVG ([`assets/plato-salmon.svg`](design/mockups/assets/plato-salmon.svg)) y las miniaturas de recetas con composiciones CSS; en la aplicación real serán fotografías del usuario o del catálogo.
- Las fuentes se cargan desde Google Fonts en los mockups por comodidad; la aplicación las autoalojará (§3.1).
- Los mockups 01–06 y 08 son la vista de escritorio (≥ 1280 px); `mockups.css` incluye además una adaptación básica por debajo de 768 px (oculta la sidebar y apila la rejilla). El 07 muestra el diseño móvil de referencia.
- Los mockups necesitan JavaScript activado (iconos y sidebar); las capturas PNG no.
- **Muestran el producto completo**, incluidos elementos de la Ampliación (comidas del plan en el dashboard, barra inferior con "Plan" y "Asistente", código de barras). En el MVP esos elementos no aparecen (§6.4, tabla de alcance de §7).
- **Mockups 09–13:** los productos son ficticios ("Marca Ejemplo"; no se muestran marcas reales). Las recetas de TheMealDB usan nombres reales comprobados en su API (p. ej. *Chicken Couscous*, id 52850, con sus ingredientes y medidas reales); sus cifras nutricionales son **ilustrativas** del cálculo de `API_INTEGRATIONS.md` §7.2. Las imágenes se representan con ilustraciones.
- El 08 es un **escenario alternativo** al de 01/03/07 (la merienda se registra a mano en lugar de desde el plan), por eso sus totales del día difieren.
- La adaptación a 1024 px de las pantallas densas (planificador, asistente) se resuelve en Angular según §6.3; los mockups de escritorio se validaron a ≥ 1280 px.
- **Sin mockup** (definidas solo en §7 y §7.18): login, registro, configuración inicial, mi perfil, historial, detalle de receta, lista de la compra, actividad, configuración y administración. Usan los mismos componentes y estados que las pantallas dibujadas.

## 9. Guía de implementación Angular

### 9.1. Design tokens (variables CSS)

Se definen en dos niveles: **primitivos** (la paleta) y **semánticos** (el significado). Los componentes **solo usan tokens semánticos**.

```scss
// src/styles/tokens/_primitives.scss
:root {
  /* Verde Vital */
  --ns-green-50: #ECFDF3;  --ns-green-100: #D1FADF; --ns-green-200: #A6F4C5;
  --ns-green-300: #6CE9A6; --ns-green-400: #32D583; --ns-green-500: #12B76A;
  --ns-green-600: #0B9A5D; --ns-green-700: #087A50; --ns-green-800: #066B46;
  --ns-green-900: #054F31;
  /* Tinta */
  --ns-ink-950: #0B1220; --ns-ink-900: #101828; --ns-ink-800: #1A2436;
  --ns-ink-700: #344054; --ns-ink-400: #94A3B8;
  /* Índigo IA */
  --ns-ai-50: #EEF0FF; --ns-ai-100: #E0E3FF; --ns-ai-500: #6366F1;
  --ns-ai-600: #4F46E5; --ns-ai-700: #4338CA; --ns-ai-violet: #7A5AF8;
  /* Neutros */
  --ns-gray-0: #FFFFFF;  --ns-gray-25: #F7F9FB; --ns-gray-50: #F2F4F7;
  --ns-gray-100: #EAECF0; --ns-gray-200: #D0D5DD; --ns-gray-500: #5D6B82;
  --ns-gray-550: #7D8798; --ns-gray-600: #475467;
}
```

```scss
// src/styles/tokens/_semantic.scss
:root {
  /* Superficies */
  --ns-bg: var(--ns-gray-25);
  --ns-surface: var(--ns-gray-0);
  --ns-surface-muted: var(--ns-gray-50);
  --ns-surface-sunken: var(--ns-gray-100);
  --ns-surface-inverse: var(--ns-ink-950);
  /* Texto */
  --ns-text: var(--ns-ink-900);
  --ns-text-secondary: var(--ns-gray-600);
  --ns-text-tertiary: var(--ns-gray-500);
  --ns-text-inverse: var(--ns-gray-0);
  --ns-text-link: var(--ns-green-700);
  /* Bordes */
  --ns-border: var(--ns-gray-100);
  --ns-border-strong: var(--ns-gray-200);
  --ns-border-input: var(--ns-gray-550);
  /* Acciones */
  --ns-action-primary: var(--ns-green-700);
  --ns-action-primary-hover: var(--ns-green-800);
  --ns-action-primary-active: var(--ns-green-900);
  --ns-action-ai: var(--ns-ai-600);
  --ns-action-ai-hover: var(--ns-ai-700);
  --ns-gradient-ai: linear-gradient(135deg, var(--ns-ai-600) 0%, var(--ns-ai-violet) 100%);
  --ns-focus-ring: var(--ns-green-700);
  /* Estados */
  --ns-success: #067647; --ns-success-bg: #ECFDF3; --ns-success-border: #ABEFC6;
  --ns-warning: #B54708; --ns-warning-bg: #FFFAEB; --ns-warning-border: #FEDF89;
  --ns-error:   #B42318; --ns-error-bg:   #FEF3F2; --ns-error-border:   #FECDCA;
  --ns-info:    #175CD3; --ns-info-bg:    #EFF8FF; --ns-info-border:    #B2DDFF;
  /* Datos */
  --ns-data-kcal: var(--ns-green-600);    --ns-data-kcal-bg: #ECFDF3;
  --ns-data-protein: #2F6FEB;             --ns-data-protein-bg: #EFF4FF;
  --ns-data-carbs: #C47F00;               --ns-data-carbs-bg: #FFF7E6;
  --ns-data-fat: #D9467A;                 --ns-data-fat-bg: #FDF0F5;
  --ns-data-activity: #0E7490;            --ns-data-activity-bg: #ECFEFF;
  --ns-data-kcal-text: #067647; --ns-data-protein-text: #1D4FBF;
  --ns-data-carbs-text: #8A5A00; --ns-data-fat-text: #A8285A;
  --ns-data-weight: var(--ns-ink-700);
  /* Tipografía */
  --ns-font-display: 'Manrope', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --ns-font-body: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  /* Espaciado, radios, sombras, capas */
  --ns-space-1: 4px;  --ns-space-2: 8px;  --ns-space-3: 12px; --ns-space-4: 16px;
  --ns-space-5: 20px; --ns-space-6: 24px; --ns-space-8: 32px; --ns-space-10: 40px;
  --ns-space-12: 48px; --ns-space-16: 64px;
  --ns-radius-xs: 4px; --ns-radius-sm: 6px; --ns-radius-md: 8px; --ns-radius-lg: 12px;
  --ns-radius-xl: 16px; --ns-radius-2xl: 20px; --ns-radius-full: 9999px;
  --ns-shadow-xs: 0 1px 2px rgba(16,24,40,.05);
  --ns-shadow-sm: 0 1px 3px rgba(16,24,40,.08), 0 1px 2px rgba(16,24,40,.04);
  --ns-shadow-md: 0 4px 8px -2px rgba(16,24,40,.08), 0 2px 4px -2px rgba(16,24,40,.04);
  --ns-shadow-lg: 0 12px 16px -4px rgba(16,24,40,.08), 0 4px 6px -2px rgba(16,24,40,.03);
  --ns-shadow-xl: 0 20px 24px -4px rgba(16,24,40,.10), 0 8px 8px -4px rgba(16,24,40,.04);
  --ns-shadow-focus: 0 0 0 3px rgba(8,122,80,.16);
  --ns-z-sticky: 10; --ns-z-sidebar: 20; --ns-z-dropdown: 30; --ns-z-overlay: 40;
  --ns-z-modal: 50; --ns-z-toast: 60; --ns-z-tooltip: 70;
  /* Layout */
  --ns-sidebar-width: 248px; --ns-sidebar-collapsed: 72px;
  --ns-topbar-height: 64px;  --ns-content-max: 1440px;
  /* Movimiento */
  --ns-ease-out: cubic-bezier(.2, .8, .2, 1);
  --ns-duration-fast: 120ms; --ns-duration-base: 200ms; --ns-duration-slow: 320ms;
}
```

Los mismos valores se exportan como constantes TypeScript (`src/app/shared/design/tokens.ts`) para ECharts y lógica que los necesite. Se recomienda generarlos ambos desde un único `tokens.json` con **Style Dictionary** cuando el sistema crezca.

### 9.2. Responsive breakpoints

```scss
// src/styles/abstracts/_breakpoints.scss
$ns-breakpoints: (sm: 480px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1536px);

@mixin up($bp) {
  @media (min-width: map-get($ns-breakpoints, $bp)) { @content; }
}
@mixin down($bp) {
  @media (max-width: calc(map-get($ns-breakpoints, $bp) - 0.02px)) { @content; }
}
```

En TypeScript se usa `BreakpointObserver` del CDK con las mismas cifras expuestas por un servicio `LayoutService` (`isMobile = signal<boolean>`), que decide sidebar/drawer/bottom-nav.

### 9.3. Organización de estilos

```
src/
├── styles/
│   ├── tokens/        _primitives.scss · _semantic.scss
│   ├── abstracts/     _breakpoints.scss · _mixins.scss (focus-ring, truncate, sr-only)
│   ├── base/          _reset.scss · _typography.scss · _fonts.scss
│   ├── utilities/     _layout.scss (stack, cluster, grid) · _text.scss (ns-text-*)
│   ├── vendors/       _cdk-overlay.scss · _echarts.scss
│   └── styles.scss    (@use en orden: tokens → abstracts → base → utilities → vendors)
└── app/
    ├── core/layout/   shell · sidebar · topbar · bottom-nav
    ├── shared/ui/     button · input · select · card · badge · dialog · table · ring …
    ├── shared/design/ tokens.ts · echarts-theme.ts
    └── features/      dashboard · comidas · planificador · compra · actividad
                       estadisticas · asistente · perfil · configuracion · admin
```

### 9.4. Convenciones de estilos

- **Estilos por componente** (`styleUrl` con `ViewEncapsulation.Emulated`); solo *tokens*, nunca valores HEX sueltos (regla de **Stylelint** `color-no-hex` en `app/**`).
- Nomenclatura de clases **BEM** con prefijo: `.ns-card`, `.ns-card__header`, `.ns-card--ai`.
- Variantes y tamaños como `@Input()` tipados (`variant = input<'primary'|'ai'|'secondary'|'ghost'|'danger'>('primary')`) que se reflejan en clases del *host* (`host: { '[class]': 'classes()' }`).
- Utilidades globales mínimas (`ns-stack`, `ns-cluster`, `ns-grid`, `ns-sr-only`, `ns-text-*`); no se adopta un *framework* de utilidades completo.
- **Angular Material no se usa** para la capa visual; se usa **Angular CDK** (overlay, a11y, drag-drop, dialog, table) y componentes propios para mantener la identidad.
- Unidades: `rem` para tipografía, `px` para bordes y sombras, *tokens* para espaciado.
- Iconos: `lucide-angular` registrado con *tree-shaking* (solo los iconos usados).
- Catálogo visual de componentes en **Storybook** para Angular (recomendado a partir de la fase 1), con *stories* de cada variante y estado.

### 9.5. Componentes reutilizables (inventario)

| Componente | Selector | Inputs principales |
|---|---|---|
| Botón | `ns-button` / `button[nsButton]` | `variant`, `size`, `loading`, `icon`, `iconPosition` |
| Input | `input[nsInput]` + `ns-form-field` | `label`, `hint`, `error`, `suffix` |
| Cantidad | `ns-quantity-input` | `value`, `step`, `min`, `max`, `unit` |
| Select | `ns-select` | `options`, `placeholder`, `multiple` |
| Combobox | `ns-combobox` | `search` (fn), `itemTemplate` |
| Segmentado | `ns-segmented` | `options`, `value` |
| Chips | `ns-chip-group` | `options`, `multiple` |
| Tarjeta | `ns-card` | `variant` (`default`/`metric`/`ai`/`interactive`), `padding` |
| Métrica | `ns-metric` | `label`, `value`, `unit`, `delta`, `trend` |
| Anillo | `ns-ring` | `value`, `max`, `size`, `color`, `label` |
| Barra de progreso | `ns-progress-bar` | `value`, `max`, `color`, `showLabel` |
| Badge | `ns-badge` | `variant`, `icon` |
| Confianza IA | `ns-confidence-badge` | `confidence` (0–1) |
| Diálogo | `NsDialogService.open()` | `size`, `data` |
| Tabla | `ns-table` | `columns`, `data`, `sort`, `stackOnMobile` |
| Toast | `NsToastService.show()` | `type`, `title`, `message`, `action` |
| Alerta | `ns-alert` | `type`, `title`, `dismissible` |
| Aviso orientativo | `ns-disclaimer` | `context` (`analisis`/`menu`/`asistente`) |
| Estado vacío | `ns-empty-state` | `icon`, `title`, `description`, `actionLabel` |
| Skeleton | `ns-skeleton` | `shape`, `width`, `height` |
| Gráfico | `ns-chart` (envoltorio de `ngx-echarts`) | `options`, `ariaLabel`, `loading` |
| Tira de fechas | `ns-date-strip` | `selected`, `markedDates` |
| Planificador | `ns-week-planner` | `menu`, `editable` |
| Mensaje de chat | `ns-chat-message` | `role`, `content`, `attachments` |
| Dropzone | `ns-dropzone` | `accept`, `maxSizeMb` |

### 9.6. Ejemplos de uso

**Botón y tarjeta métrica**

```html
<ns-card variant="metric">
  <ns-metric label="Proteínas" [value]="112" unit="g" [delta]="+8" trend="up" />
  <ns-progress-bar [value]="112" [max]="160" color="protein" showLabel />
</ns-card>

<button nsButton variant="ai" icon="sparkles" [loading]="analizando()">
  Analizar foto
</button>
```

**Implementación de `ns-button` (extracto)**

```ts
@Component({
  selector: 'button[nsButton], a[nsButton]',
  standalone: true,
  imports: [LucideAngularModule, NsSpinner],
  template: `
    @if (loading()) { <ns-spinner size="16" /> }
    @else if (icon()) { <lucide-icon [name]="icon()!" [size]="iconSize()" aria-hidden="true" /> }
    <span class="ns-button__label"><ng-content /></span>
  `,
  styleUrl: './button.component.scss',
  host: {
    '[class]': '"ns-button ns-button--" + variant() + " ns-button--" + size()',
    '[attr.aria-busy]': 'loading() || null',
    '[disabled]': 'loading() || disabled()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NsButton {
  variant = input<'primary' | 'ai' | 'secondary' | 'ghost' | 'danger'>('primary');
  size = input<'sm' | 'md' | 'lg'>('md');
  icon = input<string>();
  loading = input(false);
  disabled = input(false);
  iconSize = computed(() => (this.size() === 'sm' ? 16 : 18));
}
```

```scss
// button.component.scss
:host {
  display: inline-flex; align-items: center; justify-content: center;
  gap: var(--ns-space-2); height: 40px; padding: 0 var(--ns-space-4);
  border-radius: var(--ns-radius-md); border: 1px solid transparent;
  font: 600 0.875rem/1.25rem var(--ns-font-body); cursor: pointer;
  transition: background-color var(--ns-duration-fast) var(--ns-ease-out);
  &:focus-visible { outline: 2px solid var(--ns-focus-ring); outline-offset: 2px; }
  &:disabled { opacity: .5; cursor: not-allowed; }
}
:host(.ns-button--primary) { background: var(--ns-action-primary); color: var(--ns-text-inverse);
  &:hover:not(:disabled) { background: var(--ns-action-primary-hover); } }
:host(.ns-button--ai) { background: var(--ns-action-ai); color: var(--ns-text-inverse);
  &:hover:not(:disabled) { background: var(--ns-action-ai-hover); } }
:host(.ns-button--secondary) { background: var(--ns-surface); color: var(--ns-ink-700);
  border-color: var(--ns-border-strong);
  &:hover:not(:disabled) { background: var(--ns-surface-muted); } }
:host(.ns-button--sm) { height: 32px; padding: 0 var(--ns-space-3); font-size: .8125rem; }
:host(.ns-button--lg) { height: 48px; padding: 0 var(--ns-space-5); font-size: 1rem;
  border-radius: var(--ns-radius-lg); }
```

**Tema ECharts a partir de tokens**

```ts
// shared/design/echarts-theme.ts
import { TOKENS as t } from './tokens';

export const nutrisportTheme = {
  color: [t.dataKcal, t.dataProtein, t.dataCarbs, t.dataFat, t.dataActivity],
  textStyle: { fontFamily: t.fontBody, color: t.textSecondary, fontSize: 12 },
  categoryAxis: { axisLine: { show: false }, axisTick: { show: false },
                  axisLabel: { color: t.textTertiary } },
  valueAxis: { splitLine: { lineStyle: { color: t.border, type: 'dashed' } },
               axisLabel: { color: t.textTertiary } },
  tooltip: { backgroundColor: t.ink950, borderWidth: 0, textStyle: { color: '#fff' } },
  line: { smooth: true, symbol: 'circle', symbolSize: 6, lineStyle: { width: 2.5 } },
  bar: { itemStyle: { borderRadius: [6, 6, 0, 0] } },
};
// app.config.ts → provideEchartsCore({ echarts }) y echarts.registerTheme('nutrisport', nutrisportTheme)
```

**Layout responsive del shell**

```html
<!-- core/layout/shell.component.html -->
<div class="ns-shell" [class.ns-shell--collapsed]="layout.isTablet()">
  @if (!layout.isMobile()) { <ns-sidebar [collapsed]="layout.isTablet()" /> }
  <div class="ns-shell__main">
    <ns-topbar />
    <main class="ns-shell__content" id="contenido"><router-outlet /></main>
  </div>
  @if (layout.isMobile()) { <ns-bottom-nav /> }
</div>
```

---

## 10. Accesibilidad y movimiento

- Objetivo **WCAG 2.2 AA** (RNF-13 de la propuesta).
- Contrastes validados en §2; nunca transmitir información solo con color (macros con etiqueta, confianza con texto).
- Navegación completa por teclado; enlace "Saltar al contenido" (`#contenido`); orden de foco lógico; foco visible siempre.
- Roles y nombres accesibles en componentes propios (usar los patrones ARIA del CDK).
- Objetivos táctiles ≥ 44 × 44 px en móvil (WCAG 2.5.8 recomienda ≥ 24 px; se adopta 44 px).
- Ningún texto por debajo de 12 px reales (§3.2), incluidos ejes de gráficos y celdas del planificador.
- Los indicadores de estado (opción seleccionada, día de entreno, adherencia) combinan color con borde, icono, patrón o texto.
- Gráficos con descripción textual o tabla alternativa.
- Mensajes del asistente anunciados con `aria-live="polite"` al completarse (no por cada *token*).
- **Movimiento:** transiciones de 120–320 ms con `--ns-ease-out`; solo `opacity` y `transform`; animaciones de progreso IA y *skeleton* desactivadas con `prefers-reduced-motion: reduce`.
- Texto redimensionable al 200 % sin pérdida de contenido; *zoom* a 400 % con reflujo a una columna.

---

## 11. Tono de voz y microcopy

- **Tú**, cercano y profesional; frases cortas; verbos de acción en botones ("Guardar comida", no "Aceptar").
- Honestidad sobre la IA: "Hemos detectado 4 alimentos. Revisa las cantidades antes de guardar."
- Sin culpa ni juicios: "Hoy vas 320 kcal por debajo de tu objetivo" (no "No has comido suficiente").
- Errores que explican y ofrecen salida: "No hemos podido analizar la foto. Puedes reintentarlo o registrar la comida manualmente."
- Formatos: decimales con coma (`1,5 kg`), miles con punto (`2.450 kcal`), fechas `sáb. 21 nov`, horas 24 h.
- Unidades siempre visibles y con espacio: `112 g`, `2.450 kcal`, `45 min`.

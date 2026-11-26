# NutriSport API por módulos

Fragmentos de `docs/NutriSport_API.md` para que el asistente lea solo lo que necesita (cada fichero ocupa unos pocos KB en lugar de los ~120 KB del documento completo). Se generan a partir de ese documento: si cambia, se regeneran todos.

| Fichero | Contenido | Tamaño |
|---|---|---|
| [`general.md`](general.md) | Convenciones (§1), requisitos de la cuenta (§4), discrepancias del OpenAPI (§11) y entorno (§12) | 7.7 KB |
| [`sesion-errores.md`](sesion-errores.md) | Sesión y refresh (§2), errores y códigos (§3) | 10.7 KB |
| [`tipos-comunes.md`](tipos-comunes.md) | Enumerados, `Pagina<T>`, `ProblemDetail` y tipos de nutrición (§5) | 4.1 KB |
| [`rutas-etiquetas.md`](rutas-etiquetas.md) | Rutas y pantallas (§9) y etiquetas de los enumerados (§10) | 7.2 KB |
| [`auth.md`](auth.md) | Autenticación y cuenta: tipos (§5), endpoints (§6), flujos (§7.6) y validaciones (§8) | 11.4 KB |
| [`perfil.md`](perfil.md) | Perfil, preferencias y objetivos: tipos (§5), endpoints (§6) y validaciones (§8) | 6.6 KB |
| [`alimentos.md`](alimentos.md) | Catálogo de alimentos y categorías: tipos (§5), endpoints (§6) y validaciones (§8) | 6.9 KB |
| [`productos.md`](productos.md) | Productos comerciales (Open Food Facts): tipos (§5), endpoints (§6), flujos (§7.3) y validaciones (§8) | 3.9 KB |
| [`comidas.md`](comidas.md) | Comidas: tipos (§5), endpoints (§6), flujos (§7.2) y validaciones (§8) | 6.8 KB |
| [`analisis.md`](analisis.md) | Análisis de fotos con IA: tipos (§5), endpoints (§6), flujos (§7.1) y validaciones (§8) | 7.2 KB |
| [`actividad.md`](actividad.md) | Actividad: tipos (§5), endpoints (§6) y validaciones (§8) | 5.1 KB |
| [`seguimiento.md`](seguimiento.md) | Seguimiento: tipos (§5), endpoints (§6) y validaciones (§8) | 6.2 KB |
| [`recetas.md`](recetas.md) | Recetas: tipos (§5), endpoints (§6), flujos (§7.4) y validaciones (§8) | 6.8 KB |
| [`menus.md`](menus.md) | Menús (planificador): tipos (§5), endpoints (§6), flujos (§7.5) y validaciones (§8) | 13.0 KB |
| [`compra.md`](compra.md) | Lista de la compra: tipos (§5), endpoints (§6) y validaciones (§8) | 6.4 KB |
| [`asistente.md`](asistente.md) | Asistente IA: tipos (§5), endpoints (§6) y validaciones (§8) | 5.3 KB |
| [`admin.md`](admin.md) | Administración: tipos (§5), endpoints (§6), flujos (§7.7) y validaciones (§8) | 10.7 KB |

**Cómo usarlos en los prompts:** cita el fichero del módulo y, si hace falta, el común (`sesion-errores.md` para errores y sesión, `tipos-comunes.md` para enumerados). Sin `#file:`: así el asistente los abre solo cuando los necesita. El OpenAPI completo (`docs/NutriSport-API.json`) solo se consulta para comprobar un nombre concreto.

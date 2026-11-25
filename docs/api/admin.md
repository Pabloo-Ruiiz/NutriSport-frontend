# NutriSport API · Administración

> Fragmento de `docs/NutriSport_API.md` (la referencia completa). Los números de sección (§) son los de ese documento. Lo común a todos los módulos está en `docs/api/general.md`, `docs/api/sesion-errores.md` y `docs/api/tipos-comunes.md`. Rutas relativas a `/api/v1`; 🔓 = público.

Solo rol ADMIN: usuarios, catálogo de alimentos (alérgenos e importación CSV), categorías, recetas públicas y emparejamientos de ingredientes.

## §5 · Tipos

Los enumerados y los tipos comunes (`Pagina<T>`, `Nutrientes`, `TipoComida`…) están en `tipos-comunes.md`.

```ts
// ---- Administración
export interface UsuarioAdminResponse {
  id: string; // UUID
  nombre: string;
  email: string;
  roles: Rol[];
  estado: EstadoUsuario;
  emailVerificado: boolean;
  ultimoAcceso: string | null; // ISO con zona, p. ej. "2026-11-25T08:30:00+01:00"
  creadoEn: string; // ISO con zona, p. ej. "2026-11-25T08:30:00+01:00"
}
export interface ActualizarUsuarioAdminRequest {
  estado?: EstadoUsuario;
  roles?: Rol[]; // 1–n elementos
}
export interface RevisionAlergenosRequest {
  alergenosContiene: Alergeno[];
  alergenosTrazas: Alergeno[];
  contieneLactosa: boolean;
}
export interface ResultadoImportacion {
  creados: number;
  actualizados: number;
  errores: ErrorCampo[];
}
export interface RecetaAdminRequest {
  nombre: string; // máx. 150 car.
  descripcion?: string; // máx. 2000 car.
  categoriaId: string; // UUID
  raciones: number; // 1–20
  tiempoPreparacionMin?: number; // 1–600
  dificultad?: Dificultad;
  franjasAptas?: TipoComida[]; // 0–7 elementos
  etiquetas?: string[]; // 0–10 elementos
  pasos?: string[]; // 0–30 elementos
  ingredientes: IngredienteRecetaAdminRequest[]; // 1–40 elementos
}
export interface IngredienteRecetaAdminRequest {
  alimentoId: string; // UUID
  gramos?: number; // >0 y ≤5000
  medida?: string; // máx. 60 car.
}
export interface PublicarRecetaRequest {
  publicada?: boolean;
  raciones?: number; // 1–20
  franjasAptas?: TipoComida[]; // 0–7 elementos
}
export interface MapeoIngredienteResponse {
  id: string; // UUID
  nombreNormalizado: string;
  alimentoId: string | null; // UUID
  alimentoNombre: string | null;
  metodo: MetodoMapeo;
  confianza: number | null;
  revisado: boolean;
  recetasRecalculadas: number;
}
export interface ActualizarMapeoRequest {
  alimentoId?: string; // UUID
}
```

## §6 · Endpoints

### §6 · Admin

Solo para administradores: catálogo de alimentos (alta, edición, revisión de alérgenos e importación CSV), categorías, recetas públicas y su publicación, emparejamientos de ingredientes y usuarios (búsqueda, bloqueo y roles). Cada acción queda auditada. Nunca da acceso a datos de salud.

| Método | Ruta | Qué hace | Consulta | Cuerpo | Respuesta | Errores |
|---|---|---|---|---|---|---|
| GET | `/admin/alimentos` | Todo el catálogo | `q?` (string), `fuente?` (FuenteAlimento), `revisados?` (boolean), `visibilidad?` (Visibilidad), `activo?` (boolean), `page?=0` (integer), `size?=20` (integer), `sort?` (string[]) | — | `200` `Pagina<AlimentoResponse>` | 400, 401, 403 |
| POST | `/admin/alimentos` | Crear un alimento público | `fuente` (FuenteAlimento), `referenciaExterna?` (string) | `AlimentoRequest` | `201` `AlimentoResponse` | 400, 401, 403 |
| PUT | `/admin/alimentos/{id}` | Editar cualquier alimento | — | `AlimentoRequest` | `200` `AlimentoResponse` | 400, 401, 403, 404 |
| DELETE | `/admin/alimentos/{id}` | Eliminar un alimento | — | — | `204` sin cuerpo | 401, 403, 404 |
| PUT | `/admin/alimentos/{id}/alergenos` | Revisar los alérgenos de un alimento | — | `RevisionAlergenosRequest` | `200` `AlimentoResponse` | 400, 401, 403, 404 |
| POST | `/admin/alimentos/importar` | Importar alimentos desde CSV | `fuente` (FuenteAlimento), `referencia?` (string) | `multipart/form-data` con el campo `archivo` (fichero) | `200` `ResultadoImportacion` | 400, 401, 403, 413 |
| POST | `/admin/categorias` | Crear una categoría | — | `CategoriaRequest` | `201` `CategoriaResponse` | 400, 401, 403, 409 |
| PUT | `/admin/categorias/{id}` | Editar una categoría | — | `CategoriaRequest` | `200` `CategoriaResponse` | 400, 401, 403, 404, 409 |
| DELETE | `/admin/categorias/{id}` | Eliminar una categoría | — | — | `204` sin cuerpo | 401, 403, 404, 409 |
| GET | `/admin/mapeos-ingredientes` | Emparejamientos de ingredientes | `revisado?` (boolean), `page?=0` (integer), `size?=20` (integer), `sort?` (string[]) | — | `200` `Pagina<MapeoIngredienteResponse>` | 400, 401, 403 |
| PUT | `/admin/mapeos-ingredientes/{id}` | Fijar el alimento equivalente de un ingrediente | — | `ActualizarMapeoRequest` | `200` `MapeoIngredienteResponse` | 400, 401, 403, 404 |
| POST | `/admin/recetas` | Crear una receta propia pública | — | `RecetaAdminRequest` | `201` `RecetaResponse` | 400, 401, 403 |
| PUT | `/admin/recetas/{id}` | Editar una receta propia pública | — | `RecetaAdminRequest` | `200` `RecetaResponse` | 400, 401, 403, 404 |
| DELETE | `/admin/recetas/{id}` | Eliminar una receta propia pública | — | — | `204` sin cuerpo | 401, 403, 404, 409 |
| PATCH | `/admin/recetas/{id}/publicacion` | Publicar o despublicar una receta pública | — | `PublicarRecetaRequest` | `200` `RecetaResponse` | 400, 401, 403, 404 |
| GET | `/admin/usuarios` | Buscar usuarios | `q?` (string), `estado?` (EstadoUsuario), `page?=0` (integer), `size?=20` (integer), `sort?` (string[]) | — | `200` `Pagina<UsuarioAdminResponse>` | 400, 401, 403 |
| GET | `/admin/usuarios/{id}` | Datos de cuenta de un usuario | — | — | `200` `UsuarioAdminResponse` | 401, 403, 404 |
| PATCH | `/admin/usuarios/{id}` | Bloquear o desbloquear y cambiar roles | — | `ActualizarUsuarioAdminRequest` | `200` `UsuarioAdminResponse` | 400, 401, 403, 404, 422 |

**Reglas de cada endpoint** (resumen de la descripción del OpenAPI):

- `GET /admin/alimentos`: Incluye los alimentos privados de usuarios y los desactivados, ordenados por nombre. Todos los filtros son opcionales y se combinan. Máximo 100 por página.
- `POST /admin/alimentos`: Queda validado y con los alérgenos sin revisar (se revisan con PUT /{id}/alergenos).
- `PUT /admin/alimentos/{id}`: También los privados de usuarios. Si cambian los alérgenos o la lactosa, vuelven a quedar sin revisar.
- `DELETE /admin/alimentos/{id}`: Si ya se ha usado en comidas, solo se desactiva (el historial lo conserva).
- `PUT /admin/alimentos/{id}/alergenos`: Sustituye los alérgenos que contiene, las trazas y la lactosa, y lo marca como revisado (deja de excluirse para los usuarios con alergias estrictas).
- `POST /admin/alimentos/importar`: Alta o actualización por nombre, marca y preparación, con los alérgenos sin revisar. Máximo 5000 filas y 10 MB. Las filas con errores no se importan y se devuelven en el resultado; un fichero sin cabecera o sin alguna columna responde 400.
- `POST /admin/categorias`: El padre, si se indica, debe existir y ser del mismo tipo. Solo las categorías de alimentos tienen sección de la compra. 409 si ya existe otra del mismo tipo con ese nombre.
- `PUT /admin/categorias/{id}`: Mismas reglas que al crearla; una categoría no puede quedar dentro de sí misma. 409 si el nombre ya existe en ese tipo o si se cambia el tipo de una categoría con elementos.
- `DELETE /admin/categorias/{id}`: 409 si tiene alimentos o subcategorías.
- `GET /admin/mapeos-ingredientes`: Con revisado=false, la cola de pendientes: emparejamientos automáticos sin revisar, incluidos los de confianza menor de 0,6 que no se usan en los cálculos. Por nombre; máximo 100 por página.
- `PUT /admin/mapeos-ingredientes/{id}`: El emparejamiento queda MANUAL y revisado (alimentoId nulo: sin equivalente). Recalcula las recetas de TheMealDB que usan ese ingrediente y devuelve cuántas.
- `POST /admin/recetas`: Con ingredientes del catálogo (alimentos públicos activos) en gramos o con una medida. Se crea sin publicar y con las raciones reales, y se calculan sus nutrientes.
- `PUT /admin/recetas/{id}`: Sustituye sus datos y sus ingredientes y recalcula los nutrientes. 404 si no es una receta propia pública (las de TheMealDB y las privadas no se editan aquí).
- `DELETE /admin/recetas/{id}`: La borra con sus ingredientes y favoritas. 404 si no es una receta propia pública; 409 RECETA_PLANIFICADA si está en algún menú (despublícala en su lugar).
- `PATCH /admin/recetas/{id}/publicacion`: Para recetas propias y de TheMealDB. Los campos nulos no cambian. Al fijar las raciones dejan de ser supuestas y se recalculan los nutrientes por ración. Solo las publicadas entran en el planificador.
- `GET /admin/usuarios`: Los más recientes primero. Máximo 100 por página.
- `GET /admin/usuarios/{id}`: Nombre, email, roles, estado, verificación del email, último acceso y alta.
- `PATCH /admin/usuarios/{id}`: Los campos nulos no cambian. El estado solo puede ser ACTIVO o BLOQUEADO; bloquear cierra todas sus sesiones. Una cuenta eliminada no se puede modificar, y un administrador no puede bloquearse ni quitarse el rol ADMIN (422).

## §7 · Flujos

### §7.7. Importación CSV (administración)

`POST /admin/alimentos/importar?fuente=BEDCA&referencia=2024` con `multipart/form-data` y el campo `archivo` (CSV en UTF-8, máx. 5000 filas y 10 MB) → `ResultadoImportacion {creados, actualizados, errores[]}`; cada error trae `campo` (fila) y `mensaje`. Un fichero sin cabecera o sin alguna columna responde 400.

## §8 · Validaciones que el formulario debe replicar

Replica estas reglas en el formulario, pero trata siempre los errores 400 del servidor (`errors[]`).

| Petición | Campo | Regla |
|---|---|---|
| `ActualizarUsuarioAdminRequest` | `estado` | solo `ACTIVO` o `BLOQUEADO` |
| `ActualizarUsuarioAdminRequest` | `roles` | 1–2147483647 elementos |
| `IngredienteRecetaAdminRequest` | `alimentoId` | obligatorio |
| `IngredienteRecetaAdminRequest` | `gramos` | mayor que 0 y como mucho 5000 |
| `IngredienteRecetaAdminRequest` | `medida` | máx. 60 caracteres |
| `PublicarRecetaRequest` | `raciones` | entre 1 y 20 |
| `PublicarRecetaRequest` | `franjasAptas` | 0–7 elementos |
| `RecetaAdminRequest` | `nombre` | obligatorio; máx. 150 caracteres |
| `RecetaAdminRequest` | `descripcion` | máx. 2000 caracteres |
| `RecetaAdminRequest` | `categoriaId` | obligatorio |
| `RecetaAdminRequest` | `raciones` | obligatorio; entre 1 y 20 |
| `RecetaAdminRequest` | `tiempoPreparacionMin` | entre 1 y 600 |
| `RecetaAdminRequest` | `franjasAptas` | 0–7 elementos |
| `RecetaAdminRequest` | `etiquetas` | 0–10 elementos |
| `RecetaAdminRequest` | `pasos` | 0–30 elementos |
| `RecetaAdminRequest` | `ingredientes` | obligatorio; 1–40 elementos |
| `RevisionAlergenosRequest` | `alergenosContiene` | obligatorio |
| `RevisionAlergenosRequest` | `alergenosTrazas` | obligatorio |
| `RevisionAlergenosRequest` | `contieneLactosa` | obligatorio |

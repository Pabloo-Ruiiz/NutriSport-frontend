# NutriSport API · Comidas

> Fragmento de `docs/NutriSport_API.md` (la referencia completa). Los números de sección (§) son los de ese documento. Lo común a todos los módulos está en `docs/api/general.md`, `docs/api/sesion-errores.md` y `docs/api/tipos-comunes.md`. Rutas relativas a `/api/v1`; 🔓 = público.

Registro manual, historial por días, edición, duplicado y registro desde receta.

## §5 · Tipos

Los enumerados y los tipos comunes (`Pagina<T>`, `Nutrientes`, `TipoComida`…) están en `tipos-comunes.md`.

```ts
// ---- Comidas
export interface RegistroComidaRequest {
  fecha: string; // "AAAA-MM-DD"
  hora?: string; // "HH:mm:ss"
  tipoComida: TipoComida;
  notas?: string; // máx. 500 car.
  alimentos: AlimentoRegistradoRequest[]; // 1–40 elementos
}
export interface AlimentoRegistradoRequest {
  alimentoId?: string; // UUID
  codigoBarras?: string; // 8–14 dígitos
  cantidad: number; // >0 y ≤5000
  unidad: string; // máx. 40 car.
}
export interface RegistroComidaResponse {
  id: string; // UUID
  fecha: string; // "AAAA-MM-DD"
  hora: string | null; // "HH:mm:ss"
  tipoComida: TipoComida | null;
  origen: OrigenComida;
  notas: string | null;
  alimentos: AlimentoRegistradoResponse[];
  totales: Nutrientes;
  avisos: string[];
}
export interface AlimentoRegistradoResponse {
  id: string; // UUID
  alimentoId: string | null; // UUID
  nombre: string;
  cantidad: number;
  unidad: string;
  gramos: number | null;
  kcal: number;
  proteina: number;
  carbohidratos: number;
  grasa: number;
  origenIa: boolean;
  confianzaIa: number | null;
}
export interface ComidasDiaResponse {
  fecha: string; // "AAAA-MM-DD"
  comidas: RegistroComidaResponse[];
  totales: Nutrientes;
}
export interface DuplicarComidaRequest {
  fecha: string; // "AAAA-MM-DD"
  tipoComida?: TipoComida;
}
export interface RegistrarRecetaRequest {
  recetaId: string; // UUID
  raciones: number; // >0 y ≤10
  fecha: string; // "AAAA-MM-DD"
  tipoComida: TipoComida;
}
```

## §6 · Endpoints

### §6 · Comidas

Registro manual de comidas, historial por días, edición y duplicado. Las cantidades se convierten a gramos y los nutrientes se guardan como instantánea del catálogo.

| Método | Ruta | Qué hace | Consulta | Cuerpo | Respuesta | Errores |
|---|---|---|---|---|---|---|
| GET | `/comidas` | Historial de comidas por días | `desde` (AAAA-MM-DD), `hasta` (AAAA-MM-DD), `tipo?` (TipoComida) | — | `200` `ComidasDiaResponse[]` | 400, 401, 403 |
| POST | `/comidas` | Registrar una comida | — | `RegistroComidaRequest` | `201` `RegistroComidaResponse` | 400, 401, 403 |
| GET | `/comidas/{id}` | Detalle de una comida | — | — | `200` `RegistroComidaResponse` | 401, 403, 404 |
| PUT | `/comidas/{id}` | Editar una comida | — | `RegistroComidaRequest` | `200` `RegistroComidaResponse` | 400, 401, 403, 404 |
| DELETE | `/comidas/{id}` | Eliminar una comida | — | — | `204` sin cuerpo | 401, 403, 404 |
| POST | `/comidas/{id}/duplicar` | Duplicar una comida en otra fecha o tipo | — | `DuplicarComidaRequest` | `201` `RegistroComidaResponse` | 400, 401, 403, 404 |
| POST | `/comidas/desde-receta` | Registrar una receta como comida | — | `RegistrarRecetaRequest` | `201` `RegistroComidaResponse` | 400, 401, 403, 404, 422 |
| GET | `/comidas/dia/{fecha}` | Comidas y totales de un día | — | — | `200` `ComidasDiaResponse` | 400, 401, 403 |

**Reglas de cada endpoint** (resumen de la descripción del OpenAPI):

- `GET /comidas`: Días con comidas entre desde y hasta (ambos incluidos, máximo 92 días), opcionalmente de un tipo de comida, con los totales de cada día. Los días sin comidas no aparecen.
- `POST /comidas`: Hasta 40 alimentos. Cantidades en g, kg, ml, l o en una porción casera del alimento (p. ej. "plato"), hasta 5 kg por alimento. Se admiten fechas pasadas y hasta mañana. Devuelve avisos si algún alimento choca con las restricciones del usuario, sin impedir el registro.
- `GET /comidas/{id}`: Con sus alimentos, totales y avisos.
- `PUT /comidas/{id}`: Sustituye sus datos y todos sus alimentos (mismas reglas que al registrarla).
- `DELETE /comidas/{id}`: Borra la comida y sus alimentos.
- `POST /comidas/{id}/duplicar`: Crea una comida nueva con origen COPIA y los nutrientes actuales del catálogo. Sin tipoComida se conserva el de la original.
- `POST /comidas/desde-receta`: Crea una comida con origen RECETA con los ingredientes de la receta emparejados con el catálogo, con los gramos escalados a raciones / raciones de la receta. Se admiten fechas pasadas y hasta mañana. 404 si la receta no existe o es privada de otro usuario; 422 NUTRICION_INCOMPLETA si su cálculo es INCOMPLETO o no tiene ingredientes emparejados.
- `GET /comidas/dia/{fecha}`: Comidas del día en orden cronológico con sus avisos y la suma de sus nutrientes.

## §7 · Flujos

### §7.2. Registro manual de comidas

- `POST /comidas` con hasta 40 `alimentos`; cada uno con `alimentoId` **o** `codigoBarras` (producto de Open Food Facts que aún no está en el catálogo), `cantidad` y `unidad`.
- `unidad`: `g`, `kg`, `ml`, `l` o el `nombre` exacto de una de las `porciones` del alimento (`AlimentoResponse.porciones`, p. ej. `"plato"`). Para ofrecer las porciones necesitas el detalle (`GET /alimentos/{id}`); el resumen de la búsqueda no las trae.
- La respuesta trae los nutrientes calculados (`totales`, y por alimento) y `avisos` de restricciones (no bloquean).
- Accesos rápidos: `GET /alimentos/recientes`, `/alimentos/frecuentes`, `POST /comidas/{id}/duplicar` ("Copiar comida anterior").
- La búsqueda (`GET /alimentos?q=`) exige 2–60 caracteres en `q`: lánzala con `debounceTime(250)` y `distinctUntilChanged`, y no la lances con menos de 2.

## §8 · Validaciones que el formulario debe replicar

Replica estas reglas en el formulario, pero trata siempre los errores 400 del servidor (`errors[]`).

| Petición | Campo | Regla |
|---|---|---|
| `AlimentoRegistradoRequest` | `alimentoId` | uno de los dos: `alimentoId` o `codigoBarras` |
| `AlimentoRegistradoRequest` | `codigoBarras` | 8–14 dígitos |
| `AlimentoRegistradoRequest` | `cantidad` | obligatorio; mayor que 0 y como mucho 5000 |
| `AlimentoRegistradoRequest` | `unidad` | obligatorio; máx. 40 caracteres; `g`, `kg`, `ml`, `l` o el `nombre` de una porción casera del alimento (p. ej. "plato") |
| `DuplicarComidaRequest` | `fecha` | obligatorio |
| `RegistrarRecetaRequest` | `recetaId` | obligatorio |
| `RegistrarRecetaRequest` | `raciones` | obligatorio; mayor que 0 y como mucho 10 |
| `RegistrarRecetaRequest` | `fecha` | obligatorio |
| `RegistrarRecetaRequest` | `tipoComida` | obligatorio |
| `RegistroComidaRequest` | `fecha` | obligatorio; como mucho mañana |
| `RegistroComidaRequest` | `tipoComida` | obligatorio |
| `RegistroComidaRequest` | `notas` | máx. 500 caracteres |
| `RegistroComidaRequest` | `alimentos` | obligatorio; 1–40 elementos |

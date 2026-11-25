# NutriSport API · Perfil, preferencias y objetivos

> Fragmento de `docs/NutriSport_API.md` (la referencia completa). Los números de sección (§) son los de ese documento. Lo común a todos los módulos está en `docs/api/general.md`, `docs/api/sesion-errores.md` y `docs/api/tipos-comunes.md`. Rutas relativas a `/api/v1`; 🔓 = público.

Perfil deportivo, preferencias y restricciones alimentarias y objetivos (calculados o manuales).

## §5 · Tipos

Los enumerados y los tipos comunes (`Pagina<T>`, `Nutrientes`, `TipoComida`…) están en `tipos-comunes.md`.

```ts
// ---- Perfil y objetivos
export interface PerfilRequest {
  fechaNacimiento: string; // "AAAA-MM-DD"
  sexo: Sexo;
  alturaCm: number; // 120–230
  pesoKg: number; // 30–250
  porcentajeGrasa?: number; // 3–60
  objetivo: ObjetivoDeportivo;
  fechaCompeticion?: string; // "AAAA-MM-DD"
  deportePrincipal: string; // máx. 40 car.
  nivelActividad: NivelActividad;
  diasEntrenamientoSemana: number; // 0–7
  duracionMediaMin: number; // 0–600
  comidasPorDia: number; // 3–6
  tiempoMaxCocinaMin?: number; // 0–600
}
export interface PerfilResponse {
  fechaNacimiento: string; // "AAAA-MM-DD"
  sexo: Sexo;
  alturaCm: number;
  pesoKg: number;
  porcentajeGrasa: number | null;
  objetivo: ObjetivoDeportivo;
  fechaCompeticion: string | null; // "AAAA-MM-DD"
  deportePrincipal: string;
  nivelActividad: NivelActividad;
  diasEntrenamientoSemana: number;
  duracionMediaMin: number;
  comidasPorDia: number;
  tiempoMaxCocinaMin: number | null;
  objetivoKcal: number;
  objetivoProteinaG: number;
  objetivoCarbohidratosG: number;
  objetivoGrasaG: number;
  objetivosManuales: boolean;
}
export interface PreferenciaDto {
  tipo: TipoPreferencia;
  alergeno?: Alergeno;
  intolerancia?: Intolerancia;
  dieta?: Dieta;
  alimentoId?: string; // UUID
  categoriaId?: string; // UUID
  severidad: Severidad;
}
export interface PreferenciasRequest {
  preferencias: PreferenciaDto[]; // 0–100 elementos
}
export interface ObjetivosResponse {
  kcal: number;
  proteinaG: number;
  carbohidratosG: number;
  grasaG: number;
  manuales: boolean;
  desglose: ObjetivosCalculados | null;
  avisos: string[];
}
export interface ObjetivosCalculados {
  edad: number;
  metabolismoBasal: number;
  factorActividad: number;
  gastoSinEntreno: number;
  ajustePorcentaje: number;
  kcal: number;
  proteinaG: number;
  carbohidratosG: number;
  grasaG: number;
  avisos: string[];
}
export interface ObjetivosManualesRequest {
  kcal: number; // 1000–6000
  proteinaG: number; // 30–400
  carbohidratosG: number; // 0–900
  grasaG: number; // 20–300
}
```

## §6 · Endpoints

### §6 · Perfil

Perfil deportivo, objetivos nutricionales (calculados o manuales) y preferencias y restricciones alimentarias. Son datos de salud: requieren el consentimiento vigente.

| Método | Ruta | Qué hace | Consulta | Cuerpo | Respuesta | Errores |
|---|---|---|---|---|---|---|
| GET | `/perfil` | Obtener el perfil deportivo | — | — | `200` `PerfilResponse` | 401, 403, 404 |
| PUT | `/perfil` | Crear o actualizar el perfil deportivo | — | `PerfilRequest` | `200` `PerfilResponse` | 400, 401, 403 |
| GET | `/perfil/objetivos` | Objetivos base y desglose del cálculo | — | — | `200` `ObjetivosResponse` | 401, 403, 404 |
| PUT | `/perfil/objetivos` | Fijar objetivos manuales | — | `ObjetivosManualesRequest` | `200` `ObjetivosResponse` | 400, 401, 403, 404 |
| DELETE | `/perfil/objetivos/manuales` | Volver al cálculo automático | — | — | `200` `ObjetivosResponse` | 401, 403, 404 |
| GET | `/perfil/preferencias` | Listar preferencias y restricciones alimentarias | — | — | `200` `PreferenciaDto[]` | 401, 403 |
| PUT | `/perfil/preferencias` | Reemplazar preferencias y restricciones | — | `PreferenciasRequest` | `200` `PreferenciaDto[]` | 400, 401, 403 |

**Reglas de cada endpoint** (resumen de la descripción del OpenAPI):

- `GET /perfil`: 404 PERFIL_NO_ENCONTRADO si aún no se ha creado.
- `PUT /perfil`: Edad mínima de 18 años, altura 120–230 cm y peso 30–250 kg. deportePrincipal es un código de GET /entrenamientos/tipos. fechaCompeticion es obligatoria si el objetivo es COMPETICION. Si los objetivos no son manuales, se recalculan.
- `GET /perfil/objetivos`: Objetivos vigentes sin contar el entrenamiento, si son manuales, desglose del cálculo automático (metabolismo basal, factor de actividad y ajuste por objetivo) y avisos de seguridad.
- `PUT /perfil/objetivos`: Dejan de recalcularse al cambiar el perfil. Devuelve avisos (no bloquea) si la energía de los macros se aleja más de un 10 % de kcal o si kcal está bajo el mínimo de seguridad. Recalcula los objetivos diarios desde hoy.
- `DELETE /perfil/objetivos/manuales`: Recalcula los objetivos con el perfil actual y los objetivos diarios desde hoy.
- `GET /perfil/preferencias`: Alergias, intolerancias, dietas y alimentos o categorías rechazados, con su severidad.
- `PUT /perfil/preferencias`: Sustituye la lista completa (máximo 100). Una lista vacía las borra todas. Cada tipo exige su campo: alergeno (ALERGIA), intolerancia (INTOLERANCIA), dieta (DIETA) o alimentoId o categoriaId (RECHAZO y FAVORITO). ESTRICTA genera avisos al registrar comidas.

## §8 · Validaciones que el formulario debe replicar

Replica estas reglas en el formulario, pero trata siempre los errores 400 del servidor (`errors[]`).

| Petición | Campo | Regla |
|---|---|---|
| `ObjetivosManualesRequest` | `kcal` | obligatorio; entre 1000 y 6000 |
| `ObjetivosManualesRequest` | `proteinaG` | obligatorio; entre 30 y 400 |
| `ObjetivosManualesRequest` | `carbohidratosG` | obligatorio; entre 0 y 900 |
| `ObjetivosManualesRequest` | `grasaG` | obligatorio; entre 20 y 300 |
| `PerfilRequest` | `fechaNacimiento` | obligatorio; edad mínima 18 años |
| `PerfilRequest` | `sexo` | obligatorio |
| `PerfilRequest` | `alturaCm` | obligatorio; entre 120 y 230 |
| `PerfilRequest` | `pesoKg` | obligatorio; entre 30 y 250 |
| `PerfilRequest` | `porcentajeGrasa` | entre 3 y 60 |
| `PerfilRequest` | `objetivo` | obligatorio |
| `PerfilRequest` | `fechaCompeticion` | obligatoria si `objetivo = COMPETICION` |
| `PerfilRequest` | `deportePrincipal` | obligatorio; máx. 40 caracteres; un `codigo` de `GET /entrenamientos/tipos` |
| `PerfilRequest` | `nivelActividad` | obligatorio |
| `PerfilRequest` | `diasEntrenamientoSemana` | obligatorio; entre 0 y 7 |
| `PerfilRequest` | `duracionMediaMin` | obligatorio; entre 0 y 600 |
| `PerfilRequest` | `comidasPorDia` | obligatorio; entre 3 y 6 |
| `PerfilRequest` | `tiempoMaxCocinaMin` | entre 0 y 600 |
| `PreferenciaDto` | `tipo` | obligatorio |
| `PreferenciaDto` | `severidad` | obligatorio |
| `PreferenciasRequest` | `preferencias` | obligatorio; 0–100 elementos |

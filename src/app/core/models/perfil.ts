// Perfil, preferencias y objetivos (NutriSport_API.md §5).
import type { Alergeno, TipoComida } from './comun';

export type Sexo = 'HOMBRE' | 'MUJER';
export type ObjetivoDeportivo = 'PERDER_GRASA' | 'MANTENER' | 'GANAR_MUSCULO' | 'RENDIMIENTO' | 'COMPETICION';
export type NivelActividad = 'SEDENTARIO' | 'LIGERO' | 'MODERADO' | 'ALTO';
export type TipoPreferencia = 'ALERGIA' | 'INTOLERANCIA' | 'DIETA' | 'RECHAZO' | 'FAVORITO';
export type Intolerancia = 'LACTOSA' | 'GLUTEN' | 'FRUCTOSA' | 'SORBITOL' | 'HISTAMINA';
export type Dieta =
  | 'VEGETARIANA'
  | 'VEGANA'
  | 'PESCETARIANA'
  | 'HALAL'
  | 'KOSHER'
  | 'MEDITERRANEA'
  | 'OMNIVORA'
  | 'FLEXITARIANA'
  | 'ALTA_PROTEINA'
  | 'PALEO'
  | 'PERSONALIZADA';
export type Severidad = 'ESTRICTA' | 'PREFERENCIA';

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
  /** Franjas elegidas: exactamente comidasPorDia distintas (sin OTRO). Si falta, el backend usa las de por defecto. */
  tiposComida?: TipoComida[];
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
  /** Franjas del usuario en el orden del día (las de por defecto si no las ha elegido). */
  tiposComida: TipoComida[];
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
  /** Alergia o intolerancia que no está en la lista (sin código), o descripción de la dieta PERSONALIZADA. Máx. 80. */
  detalle?: string;
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

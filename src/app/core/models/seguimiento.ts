// Seguimiento: resumen diario, peso, estadísticas e insights (NutriSport_API.md §5).
import type { EntrenamientoResponse } from './actividad';
import type { RegistroComidaResponse } from './comidas';
import type { Nutrientes, Porcentajes, TipoComida } from './comun';
import type { RecetaResumenResponse } from './recetas';

export type TipoInsight =
  'PROTEINA_BAJA' | 'CARBOHIDRATOS_ENTRENO_BAJOS' | 'REPARTO_PROTEINA_BUENO' | 'DIAS_SIN_REGISTRO' | 'TENDENCIA_PESO';
export type SeveridadInsight = 'INFO' | 'POSITIVO' | 'ADVERTENCIA';
export type Agrupacion = 'DIA' | 'SEMANA' | 'MES';

export interface ResumenDiarioResponse {
  fecha: string; // "AAAA-MM-DD"
  objetivo: Nutrientes;
  kcalEntreno: number;
  consumido: Nutrientes;
  restante: Nutrientes;
  excesoKcal: number;
  porcentajes: Porcentajes;
  comidas: RegistroComidaResponse[];
  entrenamientos: EntrenamientoResponse[];
  comidasPlanificadasPendientes: ComidaPendienteResponse[];
}
export interface ComidaPendienteResponse {
  menuId: string | null; // UUID
  menuNombre: string;
  id: string; // UUID
  fecha: string; // "AAAA-MM-DD"
  tipoComida: TipoComida | null;
  receta: RecetaResumenResponse;
  raciones: number;
  nutrientes: Nutrientes;
}
export interface PesoRequest {
  fecha: string; // "AAAA-MM-DD"
  pesoKg: number; // 30–250
}
export interface PesoResponse {
  id: string; // UUID
  fecha: string; // "AAAA-MM-DD"
  pesoKg: number;
}
export interface SeriePesoResponse {
  puntos: PuntoPeso[];
  variacion: number | null;
}
export interface PuntoPeso {
  fecha: string; // "AAAA-MM-DD"
  pesoKg: number;
  mediaMovil7: number | null;
}
export interface EstadisticasResponse {
  desde: string; // "AAAA-MM-DD"
  hasta: string; // "AAAA-MM-DD"
  agrupacion: Agrupacion;
  serie: PuntoSerieResponse[];
  mediaDiaria: Nutrientes;
  objetivoMedio: Nutrientes;
  diasConRegistro: number;
  diasEnObjetivo: number;
  porcentajeAdherencia: number;
  repartoMacrosPct: Record<string, number>;
  kcalPorTipoComida: Record<string, number>;
  top: AlimentoFrecuenteResponse[];
}
export interface PuntoSerieResponse {
  periodo: string;
  desde: string; // "AAAA-MM-DD"
  consumido: Nutrientes;
  objetivo: Nutrientes;
  diasConRegistro: number;
  diasEnObjetivo: number;
}
export interface AlimentoFrecuenteResponse {
  alimentoId: string; // UUID
  nombre: string;
  veces: number;
  porcentajeEnergia: number;
  fuente: string;
}
export interface ComparativaResponse {
  actual: EstadisticasResponse;
  anterior: EstadisticasResponse;
  variacionPct: Record<string, number>;
}
export interface InsightResponse {
  id: string; // UUID
  tipo: TipoInsight;
  severidad: SeveridadInsight;
  titulo: string | null;
  texto: string;
  periodoDesde: string | null; // "AAAA-MM-DD"
  periodoHasta: string | null; // "AAAA-MM-DD"
  creadoEn: string; // ISO con zona, p. ej. "2026-11-25T08:30:00+01:00"
}

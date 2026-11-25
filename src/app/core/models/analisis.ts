// Análisis de fotos con IA (NutriSport_API.md §5).
import type { Nutrientes, Preparacion, TipoComida } from './comun';

export type TipoAnalisis = 'COMIDA' | 'ETIQUETA';
export type EstadoAnalisis = 'PENDIENTE' | 'PROCESANDO' | 'COMPLETADO' | 'FALLIDO' | 'CONFIRMADO' | 'DESCARTADO';

export interface AnalisisResponse {
  id: string; // UUID
  tipo: TipoAnalisis;
  estado: EstadoAnalisis;
  tipoComida: TipoComida | null;
  candidatos: CandidatoAnalisis[];
  totalEstimado: Nutrientes | null;
  errorMensaje: string | null;
  creadoEn: string; // ISO con zona, p. ej. "2026-11-25T08:30:00+01:00"
  completadoEn: string | null; // ISO con zona, p. ej. "2026-11-25T08:30:00+01:00"
}
export interface CandidatoAnalisis {
  nombreDetectado: string;
  preparacion: Preparacion | null;
  gramosEstimados: number | null;
  confianza: number | null;
  nivelConfianza: string;
  estimado: boolean;
  coincidencias: CoincidenciaCatalogo[];
}
export interface CoincidenciaCatalogo {
  alimentoId: string | null; // UUID
  nombre: string;
  similitud: number;
  estimados: Nutrientes | null;
  fuente: string;
}
export interface ConfirmarAnalisisRequest {
  fecha: string; // "AAAA-MM-DD"
  hora?: string; // "HH:mm:ss"
  tipoComida: TipoComida;
  alimentos: AlimentoConfirmadoRequest[]; // 1–20 elementos
}
export interface AlimentoConfirmadoRequest {
  alimentoId: string; // UUID
  gramos: number; // >0 y ≤5000
  indiceCandidato?: number; // ≥0
}
export interface UrlImagenResponse {
  url: string;
  expiraEn: string; // ISO con zona, p. ej. "2026-11-25T08:30:00+01:00"
}

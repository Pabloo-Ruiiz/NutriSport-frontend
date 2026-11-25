// Actividad y entrenamientos (NutriSport_API.md §5).
import type { Nutrientes } from './comun';

export type Intensidad = 'BAJA' | 'MEDIA' | 'ALTA';
export type EstadoEntrenamiento = 'PLANIFICADO' | 'REALIZADO' | 'OMITIDO';

export interface TipoActividadResponse {
  codigo: string;
  nombre: string;
  met: number;
  categoria: string | null;
}
export interface EntrenamientoRequest {
  tipoActividadCodigo: string; // máx. 40 car.
  fechaHora: string; // ISO con zona, p. ej. "2026-11-25T08:30:00+01:00"
  duracionMin: number; // 1–600
  intensidad: Intensidad;
  rpe?: number; // 1–10
  estado?: EstadoEntrenamiento;
  distanciaKm?: number; // 0–9999.99
  notas?: string; // máx. 500 car.
}
export interface EntrenamientoResponse {
  id: string; // UUID
  tipoActividadCodigo: string;
  tipoActividadNombre: string;
  fechaHora: string; // ISO con zona, p. ej. "2026-11-25T08:30:00+01:00"
  duracionMin: number;
  intensidad: Intensidad;
  rpe: number | null;
  estado: EstadoEntrenamiento;
  kcalEstimadas: number;
  distanciaKm: number | null;
  notas: string | null;
}
export interface RelacionNutricionResponse {
  desde: string; // "AAAA-MM-DD"
  hasta: string; // "AAAA-MM-DD"
  mediaEntreno: Nutrientes;
  objetivoEntreno: Nutrientes;
  mediaDescanso: Nutrientes;
  objetivoDescanso: Nutrientes;
  diasEntreno: number;
  diasDescanso: number;
  sesionesConProteinaPost: number;
  sesiones: number;
}

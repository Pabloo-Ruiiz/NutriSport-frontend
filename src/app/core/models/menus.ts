// Menús y planificador · Ampliación (NutriSport_API.md §5).
import type { Nutrientes, ObjetivoDiarioResponse, TipoComida } from './comun';
import type { RecetaResumenResponse } from './recetas';

export type TipoMenu = 'DIARIO' | 'SEMANAL';
export type EstadoMenu = 'BORRADOR' | 'ACTIVO' | 'ARCHIVADO';

export interface MenuResumenResponse {
  id: string; // UUID
  nombre: string;
  tipo: TipoMenu;
  fechaInicio: string; // "AAAA-MM-DD"
  fechaFin: string; // "AAAA-MM-DD"
  favorito: boolean;
  estado: EstadoMenu;
  generadoAutomaticamente: boolean;
  numeroComidas: number;
}
export interface MenuResponse {
  id: string; // UUID
  nombre: string;
  tipo: TipoMenu;
  fechaInicio: string; // "AAAA-MM-DD"
  fechaFin: string; // "AAAA-MM-DD"
  favorito: boolean;
  estado: EstadoMenu;
  generadoAutomaticamente: boolean;
  explicacion: string | null;
  dias: DiaMenuResponse[];
  resumen: Resumen;
}
export interface DiaMenuResponse {
  fecha: string; // "AAAA-MM-DD"
  objetivo: ObjetivoDiarioResponse | null;
  planificado: Nutrientes;
  porcentajeObjetivo: number;
  diaEntreno: boolean;
  comidas: ComidaPlanificadaResponse[];
}
export interface ComidaPlanificadaResponse {
  id: string; // UUID
  fecha: string; // "AAAA-MM-DD"
  tipoComida: TipoComida | null;
  receta: RecetaResumenResponse;
  raciones: number;
  nutrientes: Nutrientes;
  bloqueada: boolean;
  consumida: boolean;
}
export interface Resumen {
  mediaKcal: number;
  ajustePorcentaje: number;
  proteinaMedia: number;
}
export interface GenerarMenuRequest {
  tipo: TipoMenu;
  fechaInicio: string; // "AAAA-MM-DD"
  nombre?: string; // máx. 100 car.
  conExplicacion?: boolean; // por defecto true
}
export interface ActualizarMenuRequest {
  nombre?: string; // máx. 100 car.
  favorito?: boolean;
  estado?: EstadoMenu;
}
export interface DuplicarMenuRequest {
  fechaInicio: string; // "AAAA-MM-DD"
  nombre?: string; // máx. 100 car.
}
export interface AnadirComidaRequest {
  recetaId: string; // UUID
  fecha: string; // "AAAA-MM-DD"
  tipoComida: TipoComida;
  raciones: number; // >0 y ≤10
}
export interface ActualizarComidaPlanificadaRequest {
  recetaId?: string; // UUID
  raciones?: number; // >0 y ≤10
  fecha?: string; // "AAAA-MM-DD"
  tipoComida?: TipoComida;
  bloqueada?: boolean;
}
export interface AlternativaResponse {
  receta: RecetaResumenResponse;
  raciones: number;
  nutrientes: Nutrientes;
  diferenciaKcalPct: number | null;
}
export interface SugerenciaIaRequest {
  preferencia?: string; // máx. 300 car.
}
export interface SugerenciaIaResponse {
  id: string; // UUID
  texto: string;
  deltaKcalRacion: number | null;
  deltaProteinaRacion: number | null;
  valida: boolean;
}
export interface AplicarSugerenciaRequest {
  sugerenciaId: string; // UUID
}

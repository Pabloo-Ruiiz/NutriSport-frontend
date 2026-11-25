// Recetas propias y de TheMealDB · Ampliación (NutriSport_API.md §5).
import type { Dificultad, FuenteResponse, NutricionRacion, Nutrientes, Pagina } from './comun';

export type OrigenReceta = 'PROPIA' | 'THEMEALDB';
export type EstadoConversion = 'EXACTA' | 'ESTIMADA' | 'DESPRECIABLE' | 'SIN_DATOS';
export type EstadoNutricional = 'COMPLETO' | 'APROXIMADO' | 'INCOMPLETO';

/** Esquema PaginaResponseRecetaResumenResponse del OpenAPI (misma forma que Pagina<T>). */
export type PaginaResponseRecetaResumenResponse = Pagina<RecetaResumenResponse>;

export interface RecetaResumenResponse {
  id: string | null; // UUID
  referenciaExterna: string | null;
  origen: OrigenReceta;
  nombre: string;
  categoria: string | null;
  area: string | null;
  imagenUrl: string | null;
  nutricionRacion: NutricionRacion | null;
  estadoNutricional: string | null;
  alergenosVerificados: boolean;
  compatible: boolean;
  favorita: boolean;
  fuente: FuenteResponse | null;
}
export interface RecetaResponse {
  id: string; // UUID
  origen: OrigenReceta;
  nombre: string;
  descripcion: string | null;
  idioma: string;
  categoria: string | null;
  area: string | null;
  imagenUrl: string | null;
  raciones: number;
  racionesSupuestas: boolean;
  tiempoPreparacionMin: number | null;
  dificultad: Dificultad | null;
  franjasAptas: string[];
  etiquetas: string[];
  ingredientes: IngredienteRecetaResponse[];
  instrucciones: PasoReceta[];
  nutricionRacion: NutricionRacion | null;
  estadoNutricional: EstadoNutricional;
  completitudPct: number | null;
  alergenos: string[];
  alergenosVerificados: boolean;
  compatible: boolean;
  favorita: boolean;
  fuente: FuenteResponse | null;
}
export interface IngredienteRecetaResponse {
  nombre: string;
  nombreOriginal: string | null;
  medidaOriginal: string | null;
  gramos: number | null;
  estadoConversion: EstadoConversion;
  alimentoId: string | null; // UUID
}
export interface PasoReceta {
  orden: number;
  texto: string;
}
export interface BusquedaRecetasResponse {
  catalogo: PaginaResponseRecetaResumenResponse;
  themealdb: RecetaResumenResponse[];
  themealdbDisponible: boolean;
}
export interface NutricionRecetaResponse {
  raciones: number;
  racionesSupuestas: boolean;
  porRacion: Nutrientes | null;
  estado: EstadoNutricional;
  completitudPct: number;
  ingredientes: IngredienteCalculoResponse[];
}
export interface IngredienteCalculoResponse {
  nombre: string;
  nombreOriginal: string | null;
  medidaOriginal: string | null;
  gramos: number | null;
  estadoConversion: EstadoConversion;
  fuente: string;
}

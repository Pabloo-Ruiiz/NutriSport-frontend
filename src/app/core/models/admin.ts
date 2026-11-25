// Administración: usuarios, catálogo, recetas y mapeos (NutriSport_API.md §5).
import type { Alergeno, Dificultad, ErrorCampo, EstadoUsuario, Rol, TipoComida } from './comun';

export type MetodoMapeo = 'AUTOMATICO' | 'MANUAL';

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

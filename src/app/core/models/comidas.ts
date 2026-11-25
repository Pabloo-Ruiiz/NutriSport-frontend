// Registro de comidas (NutriSport_API.md §5).
import type { Nutrientes, TipoComida } from './comun';

export type OrigenComida = 'MANUAL' | 'FOTO' | 'PLAN' | 'RECETA' | 'COPIA' | 'CODIGO_BARRAS';

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

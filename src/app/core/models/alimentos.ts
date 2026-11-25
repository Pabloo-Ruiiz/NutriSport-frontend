// Catálogo de alimentos, categorías y productos de Open Food Facts (NutriSport_API.md §5).
import type { Alergeno, FuenteAlimento, FuenteResponse, Preparacion, UnidadBase } from './comun';

export type Visibilidad = 'PUBLICO' | 'PRIVADO';
export type TipoCategoria = 'ALIMENTO' | 'RECETA';

// ---- Catálogo de alimentos y categorías
export interface AlimentoResumenResponse {
  id: string; // UUID
  nombre: string;
  marca: string | null;
  kcal100: number;
  proteinas100: number;
  carbohidratos100: number;
  grasas100: number;
  fuente: FuenteAlimento;
}
export interface AlimentoResponse {
  id: string; // UUID
  nombre: string;
  marca: string | null;
  categoriaId: string | null; // UUID
  categoriaNombre: string | null;
  preparacion: Preparacion | null;
  kcal100: number;
  proteinas100: number;
  carbohidratos100: number;
  grasas100: number;
  azucares100: number | null;
  saturadas100: number | null;
  fibra100: number | null;
  sal100: number | null;
  unidadBase: UnidadBase;
  porciones: PorcionCasera[];
  alergenosContiene: Alergeno[];
  alergenosTrazas: Alergeno[];
  alergenosRevisados: boolean;
  contieneLactosa: boolean;
  aptoVegano: boolean;
  aptoVegetariano: boolean;
  aptoPescetariano: boolean;
  fuente: FuenteAlimento;
  referenciaExterna: string | null;
  visibilidad: Visibilidad;
  validado: boolean;
  activo: boolean;
  propio: boolean;
}
export interface AlimentoRequest {
  nombre: string; // máx. 150 car.
  marca?: string; // máx. 80 car.
  categoriaId: string; // UUID
  preparacion?: Preparacion;
  kcal100: number; // 0–900
  proteinas100: number; // 0–100
  carbohidratos100: number; // 0–100
  grasas100: number; // 0–100
  azucares100?: number; // 0–100
  saturadas100?: number; // 0–100
  fibra100?: number; // 0–100
  sal100?: number; // 0–100
  unidadBase: UnidadBase;
  porciones?: PorcionCasera[]; // 0–20 elementos
  alergenosContiene?: Alergeno[];
  alergenosTrazas?: Alergeno[];
  contieneLactosa: boolean;
  aptoVegano: boolean;
  aptoVegetariano: boolean;
  aptoPescetariano: boolean;
}
export interface PorcionCasera {
  nombre: string; // máx. 40 car.
  gramos: number; // >0 y ≤5000
}
export interface CategoriaResponse {
  id: string; // UUID
  nombre: string;
  tipo: TipoCategoria;
  padreId: string | null; // UUID
  seccionCompra: string | null;
  codigoExterno: string | null;
  orden: number;
}
export interface CategoriaRequest {
  nombre: string; // máx. 80 car.
  tipo: TipoCategoria;
  padreId?: string; // UUID
  seccionCompra?: string; // máx. 40 car.
  orden: number; // 0–999
}

// ---- Productos (Open Food Facts) · Ampliación
export interface ProductoResumenResponse {
  id: string | null; // UUID
  codigoBarras: string;
  nombre: string;
  marca: string | null;
  imagenUrl: string | null;
  kcal100: number;
  nutricionCompleta: boolean;
  fuente: FuenteResponse;
}
export interface ProductoResponse {
  id: string | null; // UUID
  codigoBarras: string;
  nombre: string;
  marca: string | null;
  imagenUrl: string | null;
  unidadBase: UnidadBase;
  por100: Por100;
  racion: Racion | null;
  ingredientesTexto: string | null;
  alergenosContiene: string[];
  alergenosTrazas: string[];
  alergenosRevisados: boolean;
  nutricionCompleta: boolean;
  fuente: FuenteResponse;
}
export interface Por100 {
  kcal: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
  azucares: number | null;
  saturadas: number | null;
  fibra: number | null;
  sal: number | null;
}
export interface Racion {
  gramos: number | null;
  descripcion: string | null;
}

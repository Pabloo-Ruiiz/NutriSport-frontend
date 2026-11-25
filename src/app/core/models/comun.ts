// Tipos comunes a varios módulos (NutriSport_API.md §5). Espejo exacto del JSON:
// no se renombran ni se transforman propiedades; las fechas son string ISO.

// ---- Enumerados compartidos (valores en MAYÚSCULAS, idénticos a los del backend)
export type TipoComida =
  'DESAYUNO' | 'MEDIA_MANANA' | 'COMIDA' | 'MERIENDA' | 'CENA' | 'PRE_ENTRENO' | 'POST_ENTRENO' | 'OTRO';
export type Alergeno =
  | 'GLUTEN'
  | 'CRUSTACEOS'
  | 'HUEVOS'
  | 'PESCADO'
  | 'CACAHUETES'
  | 'SOJA'
  | 'LACTEOS'
  | 'FRUTOS_DE_CASCARA'
  | 'APIO'
  | 'MOSTAZA'
  | 'SESAMO'
  | 'SULFITOS'
  | 'ALTRAMUCES'
  | 'MOLUSCOS';
export type Preparacion = 'CRUDO' | 'COCIDO' | 'PLANCHA' | 'FRITO' | 'HORNO' | 'ENVASADO' | 'OTRA';
export type UnidadBase = 'G' | 'ML';
export type FuenteAlimento = 'BEDCA' | 'USDA' | 'OPEN_FOOD_FACTS' | 'ADMIN' | 'USUARIO' | 'OCR';
export type Dificultad = 'FACIL' | 'MEDIA' | 'DIFICIL';
export type Rol = 'DEPORTISTA' | 'ADMIN';
export type EstadoUsuario = 'ACTIVO' | 'BLOQUEADO' | 'ELIMINADO';

// ---- Página (Spring Data): page empieza en 0
// Sustituye a los esquemas PaginaResponse… del OpenAPI, que tienen esta misma forma.
export interface Pagina<T> {
  content: T[];
  page: number; // 0, 1, 2…
  size: number;
  totalElements: number;
  totalPages: number;
}

// ---- Errores
export interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  codigo: string;
  errors: ErrorCampo[];
}
export interface ErrorCampo {
  campo: string;
  mensaje: string;
}

// ---- Comunes de nutrición
export interface Nutrientes {
  kcal: number;
  proteina: number;
  carbohidratos: number;
  grasa: number;
}
export interface NutricionRacion {
  kcal: number;
  proteinas: number;
  carbohidratos: number;
  grasas: number;
}
export interface Porcentajes {
  kcal: number;
  proteina: number;
  carbohidratos: number;
  grasa: number;
}
export interface FuenteResponse {
  proveedor: string;
  url: string;
  licencia: string;
  atribucion: string;
}
export interface ObjetivoDiarioResponse {
  fecha: string; // "AAAA-MM-DD"
  base: Nutrientes;
  kcalEntreno: number;
  total: Nutrientes;
}

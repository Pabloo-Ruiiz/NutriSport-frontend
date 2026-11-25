# NutriSport API · Tipos comunes

> Fragmento de `docs/NutriSport_API.md` (la referencia completa). Los números de sección (§) son los de ese documento. Lo común a todos los módulos está en `docs/api/general.md`, `docs/api/sesion-errores.md` y `docs/api/tipos-comunes.md`. Rutas relativas a `/api/v1`; 🔓 = público.

Enumerados, paginación, errores y tipos de nutrición que usan varios módulos. Los de cada módulo están en su fichero.

## §5 · Tipos comunes

```ts
// ---- Enumerados (valores en MAYÚSCULAS, idénticos a los del backend)
export type TipoComida = 'DESAYUNO' | 'MEDIA_MANANA' | 'COMIDA' | 'MERIENDA' | 'CENA' | 'PRE_ENTRENO' | 'POST_ENTRENO' | 'OTRO';
export type Alergeno = 'GLUTEN' | 'CRUSTACEOS' | 'HUEVOS' | 'PESCADO' | 'CACAHUETES' | 'SOJA' | 'LACTEOS' | 'FRUTOS_DE_CASCARA' | 'APIO' | 'MOSTAZA' | 'SESAMO' | 'SULFITOS' | 'ALTRAMUCES' | 'MOLUSCOS';
export type Preparacion = 'CRUDO' | 'COCIDO' | 'PLANCHA' | 'FRITO' | 'HORNO' | 'ENVASADO' | 'OTRA';
export type Sexo = 'HOMBRE' | 'MUJER';
export type ObjetivoDeportivo = 'PERDER_GRASA' | 'MANTENER' | 'GANAR_MUSCULO' | 'RENDIMIENTO' | 'COMPETICION';
export type NivelActividad = 'SEDENTARIO' | 'LIGERO' | 'MODERADO' | 'ALTO';
export type TipoPreferencia = 'ALERGIA' | 'INTOLERANCIA' | 'DIETA' | 'RECHAZO' | 'FAVORITO';
export type Intolerancia = 'LACTOSA';
export type Dieta = 'VEGETARIANA' | 'VEGANA' | 'PESCETARIANA' | 'HALAL' | 'KOSHER';
export type Severidad = 'ESTRICTA' | 'PREFERENCIA';
export type TipoMenu = 'DIARIO' | 'SEMANAL';
export type EstadoMenu = 'BORRADOR' | 'ACTIVO' | 'ARCHIVADO';
export type OrigenReceta = 'PROPIA' | 'THEMEALDB';
export type Intensidad = 'BAJA' | 'MEDIA' | 'ALTA';
export type EstadoEntrenamiento = 'PLANIFICADO' | 'REALIZADO' | 'OMITIDO';
export type OrigenComida = 'MANUAL' | 'FOTO' | 'PLAN' | 'RECETA' | 'COPIA' | 'CODIGO_BARRAS';
export type UnidadBase = 'G' | 'ML';
export type FuenteAlimento = 'BEDCA' | 'USDA' | 'OPEN_FOOD_FACTS' | 'ADMIN' | 'USUARIO' | 'OCR';
export type Visibilidad = 'PUBLICO' | 'PRIVADO';
export type Dificultad = 'FACIL' | 'MEDIA' | 'DIFICIL';
export type EstadoConversion = 'EXACTA' | 'ESTIMADA' | 'DESPRECIABLE' | 'SIN_DATOS';
export type EstadoNutricional = 'COMPLETO' | 'APROXIMADO' | 'INCOMPLETO';
export type MetodoMapeo = 'AUTOMATICO' | 'MANUAL';
export type TipoCategoria = 'ALIMENTO' | 'RECETA';
export type UnidadCompra = 'G' | 'KG' | 'ML' | 'L' | 'UD';
export type EstadoLista = 'ACTIVA' | 'COMPLETADA';
export type Rol = 'DEPORTISTA' | 'ADMIN';
export type EstadoUsuario = 'ACTIVO' | 'BLOQUEADO' | 'ELIMINADO';
export type Unidades = 'METRICO';
export type TipoAnalisis = 'COMIDA' | 'ETIQUETA';
export type EstadoAnalisis = 'PENDIENTE' | 'PROCESANDO' | 'COMPLETADO' | 'FALLIDO' | 'CONFIRMADO' | 'DESCARTADO';
export type TipoInsight = 'PROTEINA_BAJA' | 'CARBOHIDRATOS_ENTRENO_BAJOS' | 'REPARTO_PROTEINA_BUENO' | 'DIAS_SIN_REGISTRO' | 'TENDENCIA_PESO';
export type SeveridadInsight = 'INFO' | 'POSITIVO' | 'ADVERTENCIA';
export type Agrupacion = 'DIA' | 'SEMANA' | 'MES';
export type RolMensaje = 'USUARIO' | 'ASISTENTE' | 'HERRAMIENTA';

// ---- Página (Spring Data): page empieza en 0
export interface Pagina<T> {
  content: T[];
  page: number;          // 0, 1, 2…
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
```

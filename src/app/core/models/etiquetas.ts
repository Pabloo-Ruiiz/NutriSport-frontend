// Textos que muestra la interfaz para cada valor de los enumerados (NutriSport_API.md §10).
// Los valores viajan en MAYÚSCULAS; aquí solo se traducen para pantalla.
import type { EstadoEntrenamiento, Intensidad } from './actividad';
import type { EstadoAnalisis } from './analisis';
import type { OrigenComida } from './comidas';
import type { UnidadCompra } from './compra';
import type { Alergeno, EstadoUsuario, FuenteAlimento, Preparacion, Rol, TipoComida } from './comun';
import type { Visibilidad } from './alimentos';
import type { EstadoMenu } from './menus';
import type { Dieta, NivelActividad, ObjetivoDeportivo, Severidad, Sexo, TipoPreferencia } from './perfil';
import type { EstadoConversion, EstadoNutricional } from './recetas';
import type { SeveridadInsight } from './seguimiento';

export const ETIQUETAS_TIPO_COMIDA: Record<TipoComida, string> = {
  DESAYUNO: 'Desayuno',
  MEDIA_MANANA: 'Media mañana',
  COMIDA: 'Comida',
  MERIENDA: 'Merienda',
  CENA: 'Cena',
  PRE_ENTRENO: 'Pre-entreno',
  POST_ENTRENO: 'Post-entreno',
  OTRO: 'Otro',
};

export const ETIQUETAS_OBJETIVO: Record<ObjetivoDeportivo, string> = {
  PERDER_GRASA: 'Perder grasa',
  MANTENER: 'Mantener',
  GANAR_MUSCULO: 'Ganar músculo',
  RENDIMIENTO: 'Rendimiento',
  COMPETICION: 'Preparar una competición',
};

/** Nivel de actividad fuera del entreno. */
export const ETIQUETAS_NIVEL_ACTIVIDAD: Record<NivelActividad, string> = {
  SEDENTARIO: 'Sedentario',
  LIGERO: 'Ligero',
  MODERADO: 'Moderado',
  ALTO: 'Alto',
};

export const ETIQUETAS_SEXO: Record<Sexo, string> = {
  HOMBRE: 'Hombre',
  MUJER: 'Mujer',
};

export const ETIQUETAS_INTENSIDAD: Record<Intensidad, string> = {
  BAJA: 'Baja',
  MEDIA: 'Media',
  ALTA: 'Alta',
};

export const ETIQUETAS_ESTADO_ENTRENAMIENTO: Record<EstadoEntrenamiento, string> = {
  PLANIFICADO: 'Planificado',
  REALIZADO: 'Realizado',
  OMITIDO: 'Omitido',
};

export const ETIQUETAS_ORIGEN_COMIDA: Record<OrigenComida, string> = {
  MANUAL: 'Manual',
  FOTO: 'Foto',
  PLAN: 'Plan',
  RECETA: 'Receta',
  COPIA: 'Copia',
  CODIGO_BARRAS: 'Código de barras',
};

/** Los 14 alérgenos de declaración obligatoria. */
export const ETIQUETAS_ALERGENO: Record<Alergeno, string> = {
  GLUTEN: 'Gluten',
  CRUSTACEOS: 'Crustáceos',
  HUEVOS: 'Huevos',
  PESCADO: 'Pescado',
  CACAHUETES: 'Cacahuetes',
  SOJA: 'Soja',
  LACTEOS: 'Lácteos',
  FRUTOS_DE_CASCARA: 'Frutos de cáscara',
  APIO: 'Apio',
  MOSTAZA: 'Mostaza',
  SESAMO: 'Sésamo',
  SULFITOS: 'Sulfitos',
  ALTRAMUCES: 'Altramuces',
  MOLUSCOS: 'Moluscos',
};

/** HALAL y KOSHER no se filtran automáticamente (§10). */
export const ETIQUETAS_DIETA: Record<Dieta, string> = {
  VEGETARIANA: 'Vegetariana',
  VEGANA: 'Vegana',
  PESCETARIANA: 'Pescetariana',
  HALAL: 'Halal',
  KOSHER: 'Kosher',
};

export const ETIQUETAS_TIPO_PREFERENCIA: Record<TipoPreferencia, string> = {
  ALERGIA: 'Alergia',
  INTOLERANCIA: 'Intolerancia',
  DIETA: 'Dieta',
  RECHAZO: 'No me gusta',
  FAVORITO: 'Favorito',
};

/** ESTRICTA avisa y excluye; PREFERENCIA solo avisa. */
export const ETIQUETAS_SEVERIDAD: Record<Severidad, string> = {
  ESTRICTA: 'Estricta',
  PREFERENCIA: 'Preferencia',
};

export const ETIQUETAS_PREPARACION: Record<Preparacion, string> = {
  CRUDO: 'Crudo',
  COCIDO: 'Cocido',
  PLANCHA: 'A la plancha',
  FRITO: 'Frito',
  HORNO: 'Al horno',
  ENVASADO: 'Envasado',
  OTRA: 'Otra',
};

export const ETIQUETAS_FUENTE_ALIMENTO: Record<FuenteAlimento, string> = {
  BEDCA: 'BEDCA',
  USDA: 'USDA',
  OPEN_FOOD_FACTS: 'Open Food Facts',
  ADMIN: 'NutriSport',
  USUARIO: 'Propio',
  OCR: 'Etiqueta',
};

export const ETIQUETAS_VISIBILIDAD: Record<Visibilidad, string> = {
  PUBLICO: 'Público',
  PRIVADO: 'Privado',
};

export const ETIQUETAS_ESTADO_ANALISIS: Record<EstadoAnalisis, string> = {
  PENDIENTE: 'En cola',
  PROCESANDO: 'Analizando',
  COMPLETADO: 'Listo para revisar',
  FALLIDO: 'No se pudo analizar',
  CONFIRMADO: 'Guardado',
  DESCARTADO: 'Descartado',
};

export const ETIQUETAS_ESTADO_NUTRICIONAL: Record<EstadoNutricional, string> = {
  COMPLETO: 'Cálculo completo',
  APROXIMADO: 'Cálculo aproximado',
  INCOMPLETO: 'Cálculo incompleto',
};

/** En minúscula: se usan dentro de una frase ("conversión estimada"). */
export const ETIQUETAS_ESTADO_CONVERSION: Record<EstadoConversion, string> = {
  EXACTA: 'exacta',
  ESTIMADA: 'estimada',
  DESPRECIABLE: 'despreciable',
  SIN_DATOS: 'sin datos',
};

export const ETIQUETAS_ESTADO_MENU: Record<EstadoMenu, string> = {
  BORRADOR: 'Borrador',
  ACTIVO: 'Activo',
  ARCHIVADO: 'Archivado',
};

export const ETIQUETAS_UNIDAD_COMPRA: Record<UnidadCompra, string> = {
  G: 'g',
  KG: 'kg',
  ML: 'ml',
  L: 'l',
  UD: 'ud.',
};

export const ETIQUETAS_ROL: Record<Rol, string> = {
  DEPORTISTA: 'Deportista',
  ADMIN: 'Administrador',
};

export const ETIQUETAS_ESTADO_USUARIO: Record<EstadoUsuario, string> = {
  ACTIVO: 'Activo',
  BLOQUEADO: 'Bloqueado',
  ELIMINADO: 'Eliminado',
};

export const ETIQUETAS_SEVERIDAD_INSIGHT: Record<SeveridadInsight, string> = {
  INFO: 'Información',
  POSITIVO: 'Bien hecho',
  ADVERTENCIA: 'A revisar',
};

/** Tipos de comida en el orden en que ocurren en el día (el mismo de la API y de §10). */
export const ORDEN_TIPOS_COMIDA: readonly TipoComida[] = [
  'DESAYUNO',
  'MEDIA_MANANA',
  'COMIDA',
  'MERIENDA',
  'CENA',
  'PRE_ENTRENO',
  'POST_ENTRENO',
  'OTRO',
];

/** Nombre del icono de Lucide de cada tipo de comida (DESIGN.md §4), para <svg [lucideIcon]>. */
export const ICONOS_TIPO_COMIDA: Record<TipoComida, string> = {
  DESAYUNO: 'coffee',
  MEDIA_MANANA: 'apple',
  COMIDA: 'utensils',
  MERIENDA: 'apple',
  CENA: 'moon',
  PRE_ENTRENO: 'zap',
  POST_ENTRENO: 'dumbbell',
  OTRO: 'utensils',
};

/** Todos los mapas por nombre, para el pipe `etiqueta` ({{ valor | etiqueta: 'tipoComida' }}). */
export const ETIQUETAS = {
  tipoComida: ETIQUETAS_TIPO_COMIDA,
  objetivo: ETIQUETAS_OBJETIVO,
  nivelActividad: ETIQUETAS_NIVEL_ACTIVIDAD,
  sexo: ETIQUETAS_SEXO,
  intensidad: ETIQUETAS_INTENSIDAD,
  estadoEntrenamiento: ETIQUETAS_ESTADO_ENTRENAMIENTO,
  origenComida: ETIQUETAS_ORIGEN_COMIDA,
  alergeno: ETIQUETAS_ALERGENO,
  dieta: ETIQUETAS_DIETA,
  tipoPreferencia: ETIQUETAS_TIPO_PREFERENCIA,
  severidad: ETIQUETAS_SEVERIDAD,
  preparacion: ETIQUETAS_PREPARACION,
  fuenteAlimento: ETIQUETAS_FUENTE_ALIMENTO,
  visibilidad: ETIQUETAS_VISIBILIDAD,
  estadoAnalisis: ETIQUETAS_ESTADO_ANALISIS,
  estadoNutricional: ETIQUETAS_ESTADO_NUTRICIONAL,
  estadoConversion: ETIQUETAS_ESTADO_CONVERSION,
  estadoMenu: ETIQUETAS_ESTADO_MENU,
  unidadCompra: ETIQUETAS_UNIDAD_COMPRA,
  rol: ETIQUETAS_ROL,
  estadoUsuario: ETIQUETAS_ESTADO_USUARIO,
  severidadInsight: ETIQUETAS_SEVERIDAD_INSIGHT,
} as const satisfies Record<string, Record<string, string>>;

export type TipoEtiqueta = keyof typeof ETIQUETAS;

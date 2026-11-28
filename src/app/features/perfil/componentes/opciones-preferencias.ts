import type { Alergeno, Dieta, Intolerancia } from '@core/models';

/**
 * Opciones del selector de preferencias (paso «Tu alimentación» y Mi perfil) y cómo se guardan.
 * Las alergias se apoyan en los 14 alérgenos de declaración obligatoria (UE 1169/2011), que son los
 * que el catálogo y las recetas tienen anotados y, por tanto, los que se pueden filtrar.
 */

/** Alergia de la lista: sus alérgenos del catálogo o, si no tiene (frutas), un detalle fijo. */
export interface OpcionAlergia {
  id: string;
  nombre: string;
  ejemplos: string;
  /** Alérgenos que marca (Marisco = crustáceos + moluscos; Trigo = gluten). */
  alergenos: readonly Alergeno[];
  /** Sin alérgeno del catálogo: se guarda como ALERGIA con este detalle y no se filtra. */
  detalle?: string;
}

export const OPCIONES_ALERGIA: readonly OpcionAlergia[] = [
  {
    id: 'leche',
    nombre: 'Leche y proteínas lácteas',
    ejemplos: 'Leche, caseína, suero de leche',
    alergenos: ['LACTEOS'],
  },
  { id: 'huevos', nombre: 'Huevos', ejemplos: 'Clara y yema', alergenos: ['HUEVOS'] },
  {
    id: 'frutos-secos',
    nombre: 'Frutos secos',
    ejemplos: 'Almendras, nueces, avellanas',
    alergenos: ['FRUTOS_DE_CASCARA'],
  },
  { id: 'cacahuetes', nombre: 'Cacahuetes', ejemplos: 'Cacahuetes y crema de cacahuete', alergenos: ['CACAHUETES'] },
  { id: 'pescado', nombre: 'Pescado', ejemplos: 'Atún, salmón, merluza', alergenos: ['PESCADO'] },
  {
    id: 'marisco',
    nombre: 'Marisco',
    ejemplos: 'Gambas, cangrejos, mejillones',
    alergenos: ['CRUSTACEOS', 'MOLUSCOS'],
  },
  { id: 'trigo', nombre: 'Trigo', ejemplos: 'Trigo y derivados (evitamos el gluten)', alergenos: ['GLUTEN'] },
  { id: 'soja', nombre: 'Soja', ejemplos: 'Tofu, soja y derivados', alergenos: ['SOJA'] },
  { id: 'sesamo', nombre: 'Sésamo', ejemplos: 'Semillas de sésamo, tahini', alergenos: ['SESAMO'] },
  { id: 'frutas', nombre: 'Frutas', ejemplos: 'Melocotón, kiwi, fresa', alergenos: [], detalle: 'Frutas' },
];

export interface OpcionIntolerancia {
  valor: Intolerancia;
  nombre: string;
  descripcion: string;
}

export const OPCIONES_INTOLERANCIA: readonly OpcionIntolerancia[] = [
  { valor: 'LACTOSA', nombre: 'Lactosa', descripcion: 'Intolerancia al azúcar de la leche' },
  { valor: 'GLUTEN', nombre: 'Gluten / Celiaquía', descripcion: 'Necesitas evitar el gluten' },
  { valor: 'FRUCTOSA', nombre: 'Fructosa', descripcion: 'Problemas para absorber la fructosa' },
  { valor: 'SORBITOL', nombre: 'Sorbitol', descripcion: 'Intolerancia al sorbitol' },
  { valor: 'HISTAMINA', nombre: 'Histamina', descripcion: 'Sensibilidad a alimentos ricos en histamina' },
];

/** Las únicas intolerancias que se pueden filtrar (y, por tanto, ser ESTRICTAS). */
export const INTOLERANCIAS_FILTRABLES: readonly Intolerancia[] = ['LACTOSA', 'GLUTEN'];

export interface OpcionDieta {
  /** null = «Sin restricciones»: ninguna dieta guardada. */
  valor: Dieta | null;
  nombre: string;
  descripcion: string;
}

export const OPCIONES_DIETA: readonly OpcionDieta[] = [
  { valor: null, nombre: 'Sin restricciones', descripcion: 'Alimentación variada sin restricciones específicas' },
  {
    valor: 'MEDITERRANEA',
    nombre: 'Mediterránea',
    descripcion: 'Fruta, verdura, legumbres, pescado y aceite de oliva',
  },
  { valor: 'OMNIVORA', nombre: 'Omnívora', descripcion: 'Alimentos de origen animal y vegetal' },
  { valor: 'VEGETARIANA', nombre: 'Vegetariana', descripcion: 'Sin carne ni pescado' },
  { valor: 'VEGANA', nombre: 'Vegana', descripcion: 'Sin ningún alimento de origen animal' },
  { valor: 'PESCETARIANA', nombre: 'Pescetariana', descripcion: 'Incluye pescado, pero no otras carnes' },
  { valor: 'FLEXITARIANA', nombre: 'Flexitariana', descripcion: 'Sobre todo vegetal, con carne o pescado ocasional' },
  { valor: 'ALTA_PROTEINA', nombre: 'Alta en proteínas', descripcion: 'Prioriza el consumo de proteínas' },
  { valor: 'PALEO', nombre: 'Paleo', descripcion: 'Poco procesada, sin cereales ni legumbres' },
  { valor: 'HALAL', nombre: 'Halal', descripcion: 'Sigue las normas alimentarias islámicas' },
  { valor: 'KOSHER', nombre: 'Kosher', descripcion: 'Sigue las normas alimentarias judías' },
  { valor: 'PERSONALIZADA', nombre: 'Personalizada', descripcion: 'Describe tus propias pautas' },
];

/** Las únicas dietas que se filtran con los datos de alimentos y recetas (el resto, PREFERENCIA). */
export const DIETAS_FILTRABLES: readonly Dieta[] = ['VEGETARIANA', 'VEGANA', 'PESCETARIANA'];

/** Longitud máxima de un texto personalizado (detalle). */
export const MAX_DETALLE = 80;

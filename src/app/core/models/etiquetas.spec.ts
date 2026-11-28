import type {
  Alergeno,
  Dieta,
  Dificultad,
  EstadoAnalisis,
  EstadoConversion,
  EstadoEntrenamiento,
  EstadoMenu,
  EstadoNutricional,
  EstadoUsuario,
  FuenteAlimento,
  Intensidad,
  NivelActividad,
  ObjetivoDeportivo,
  OrigenComida,
  OrigenReceta,
  Preparacion,
  Rol,
  Severidad,
  SeveridadInsight,
  Sexo,
  TipoComida,
  TipoPreferencia,
  UnidadCompra,
  Visibilidad,
} from './index';
import { ETIQUETAS, ICONOS_TIPO_COMIDA, ORDEN_TIPOS_COMIDA, TipoEtiqueta } from './etiquetas';

// Todos los valores de cada enumerado (NutriSport_API.md §5). Cada lista está tipada con su
// enumerado, así que un valor mal escrito no compila.
const VALORES: Record<TipoEtiqueta, readonly string[]> = {
  tipoComida: [
    'DESAYUNO',
    'MEDIA_MANANA',
    'COMIDA',
    'MERIENDA',
    'CENA',
    'PRE_ENTRENO',
    'POST_ENTRENO',
    'OTRO',
  ] satisfies TipoComida[],
  objetivo: ['PERDER_GRASA', 'MANTENER', 'GANAR_MUSCULO', 'RENDIMIENTO', 'COMPETICION'] satisfies ObjetivoDeportivo[],
  nivelActividad: ['SEDENTARIO', 'LIGERO', 'MODERADO', 'ALTO'] satisfies NivelActividad[],
  sexo: ['HOMBRE', 'MUJER'] satisfies Sexo[],
  intensidad: ['BAJA', 'MEDIA', 'ALTA'] satisfies Intensidad[],
  estadoEntrenamiento: ['PLANIFICADO', 'REALIZADO', 'OMITIDO'] satisfies EstadoEntrenamiento[],
  origenComida: ['MANUAL', 'FOTO', 'PLAN', 'RECETA', 'COPIA', 'CODIGO_BARRAS'] satisfies OrigenComida[],
  alergeno: [
    'GLUTEN',
    'CRUSTACEOS',
    'HUEVOS',
    'PESCADO',
    'CACAHUETES',
    'SOJA',
    'LACTEOS',
    'FRUTOS_DE_CASCARA',
    'APIO',
    'MOSTAZA',
    'SESAMO',
    'SULFITOS',
    'ALTRAMUCES',
    'MOLUSCOS',
  ] satisfies Alergeno[],
  dieta: [
    'VEGETARIANA',
    'VEGANA',
    'PESCETARIANA',
    'HALAL',
    'KOSHER',
    'MEDITERRANEA',
    'OMNIVORA',
    'FLEXITARIANA',
    'ALTA_PROTEINA',
    'PALEO',
    'PERSONALIZADA',
  ] satisfies Dieta[],
  tipoPreferencia: ['ALERGIA', 'INTOLERANCIA', 'DIETA', 'RECHAZO', 'FAVORITO'] satisfies TipoPreferencia[],
  severidad: ['ESTRICTA', 'PREFERENCIA'] satisfies Severidad[],
  preparacion: ['CRUDO', 'COCIDO', 'PLANCHA', 'FRITO', 'HORNO', 'ENVASADO', 'OTRA'] satisfies Preparacion[],
  fuenteAlimento: ['BEDCA', 'USDA', 'OPEN_FOOD_FACTS', 'ADMIN', 'USUARIO', 'OCR'] satisfies FuenteAlimento[],
  visibilidad: ['PUBLICO', 'PRIVADO'] satisfies Visibilidad[],
  estadoAnalisis: [
    'PENDIENTE',
    'PROCESANDO',
    'COMPLETADO',
    'FALLIDO',
    'CONFIRMADO',
    'DESCARTADO',
  ] satisfies EstadoAnalisis[],
  dificultad: ['FACIL', 'MEDIA', 'DIFICIL'] satisfies Dificultad[],
  origenReceta: ['PROPIA', 'THEMEALDB'] satisfies OrigenReceta[],
  estadoNutricional: ['COMPLETO', 'APROXIMADO', 'INCOMPLETO'] satisfies EstadoNutricional[],
  estadoConversion: ['EXACTA', 'ESTIMADA', 'DESPRECIABLE', 'SIN_DATOS'] satisfies EstadoConversion[],
  estadoMenu: ['BORRADOR', 'ACTIVO', 'ARCHIVADO'] satisfies EstadoMenu[],
  unidadCompra: ['G', 'KG', 'ML', 'L', 'UD'] satisfies UnidadCompra[],
  rol: ['DEPORTISTA', 'ADMIN'] satisfies Rol[],
  estadoUsuario: ['ACTIVO', 'BLOQUEADO', 'ELIMINADO'] satisfies EstadoUsuario[],
  severidadInsight: ['INFO', 'POSITIVO', 'ADVERTENCIA'] satisfies SeveridadInsight[],
};

describe('etiquetas', () => {
  for (const tipo of Object.keys(VALORES) as TipoEtiqueta[]) {
    it(`${tipo}: todos los valores tienen etiqueta y no sobra ninguna`, () => {
      const mapa: Readonly<Record<string, string>> = ETIQUETAS[tipo];
      expect(Object.keys(mapa).sort()).toEqual([...VALORES[tipo]].sort());
      for (const valor of VALORES[tipo]) {
        expect(mapa[valor]?.trim()).toBeTruthy();
      }
    });
  }

  it('usa los textos de NutriSport_API.md §10', () => {
    expect(ETIQUETAS.tipoComida.PRE_ENTRENO).toBe('Pre-entreno');
    expect(ETIQUETAS.tipoPreferencia.RECHAZO).toBe('No me gusta');
    expect(ETIQUETAS.preparacion.PLANCHA).toBe('A la plancha');
    expect(ETIQUETAS.estadoAnalisis.COMPLETADO).toBe('Listo para revisar');
    expect(ETIQUETAS.estadoConversion.SIN_DATOS).toBe('sin datos');
    expect(ETIQUETAS.severidadInsight.POSITIVO).toBe('Bien hecho');
  });

  it('ORDEN_TIPOS_COMIDA contiene cada tipo de comida una vez, empezando por el desayuno', () => {
    expect([...ORDEN_TIPOS_COMIDA].sort()).toEqual([...VALORES.tipoComida].sort());
    expect(ORDEN_TIPOS_COMIDA[0]).toBe('DESAYUNO');
    expect(ORDEN_TIPOS_COMIDA.indexOf('COMIDA')).toBeLessThan(ORDEN_TIPOS_COMIDA.indexOf('CENA'));
  });

  it('ICONOS_TIPO_COMIDA usa los iconos de DESIGN.md §4', () => {
    expect(ICONOS_TIPO_COMIDA).toEqual({
      DESAYUNO: 'coffee',
      MEDIA_MANANA: 'apple',
      COMIDA: 'utensils',
      MERIENDA: 'apple',
      CENA: 'moon',
      PRE_ENTRENO: 'zap',
      POST_ENTRENO: 'dumbbell',
      OTRO: 'utensils',
    });
  });
});

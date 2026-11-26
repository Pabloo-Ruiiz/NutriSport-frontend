import { TestBed } from '@angular/core/testing';

import type { AlimentoResponse, AnalisisResponse, CandidatoAnalisis, CoincidenciaCatalogo } from '@core/models';
import { AnalisisStore, MAX_ALIMENTOS_ANALISIS, normalizar } from './analisis.store';

const coincidencia = (
  alimentoId: string | null,
  nombre: string,
  estimados: CoincidenciaCatalogo['estimados'],
): CoincidenciaCatalogo => ({ alimentoId, nombre, similitud: 0.9, estimados, fuente: 'BEDCA' });

const candidato = (cambios: Partial<CandidatoAnalisis>): CandidatoAnalisis => ({
  nombreDetectado: 'x',
  preparacion: null,
  gramosEstimados: 100,
  confianza: 0.9,
  nivelConfianza: 'Alta',
  estimado: true,
  coincidencias: [],
  ...cambios,
});

// Salmón: 150 g estimados → los estimados son para 150 g.
const SALMON = candidato({
  nombreDetectado: 'Salmón',
  preparacion: 'PLANCHA',
  gramosEstimados: 150,
  confianza: 0.94,
  coincidencias: [
    coincidencia('salmon-plancha', 'Salmón a la plancha', { kcal: 300, proteina: 30, carbohidratos: 0, grasa: 19.5 }),
    coincidencia('salmon-ahumado', 'Salmón ahumado', { kcal: 270, proteina: 37.5, carbohidratos: 0, grasa: 13.5 }),
  ],
});
const ARROZ = candidato({
  nombreDetectado: 'Arroz blanco',
  preparacion: 'COCIDO',
  gramosEstimados: 200,
  coincidencias: [
    coincidencia('arroz', 'Arroz blanco cocido', { kcal: 260, proteina: 5.4, carbohidratos: 56, grasa: 0.6 }),
  ],
});
const SALSA = candidato({
  nombreDetectado: 'Salsa',
  gramosEstimados: 30,
  confianza: 0.3,
  nivelConfianza: 'Baja',
  // Solo una coincidencia sin alimentoId: no se puede confirmar.
  coincidencias: [coincidencia(null, 'Salsa (Open Food Facts)', { kcal: 60, proteina: 0, carbohidratos: 6, grasa: 4 })],
});

const ANALISIS: AnalisisResponse = {
  id: 'a-1',
  tipo: 'COMIDA',
  estado: 'COMPLETADO',
  tipoComida: 'CENA',
  candidatos: [SALMON, ARROZ, SALSA],
  totalEstimado: null,
  errorMensaje: null,
  creadoEn: '2026-11-25T21:05:00+01:00',
  completadoEn: '2026-11-25T21:05:08+01:00',
};

const BROCOLI = {
  id: 'brocoli',
  nombre: 'Brócoli cocido',
  preparacion: 'COCIDO',
  kcal100: 35,
  proteinas100: 2.4,
  carbohidratos100: 7,
  grasas100: 0.4,
} as AlimentoResponse;

let store: AnalisisStore;

beforeEach(() => {
  TestBed.configureTestingModule({ providers: [AnalisisStore] });
  store = TestBed.inject(AnalisisStore);
  store.iniciar(ANALISIS);
});

describe('AnalisisStore', () => {
  it('crea una línea por candidato con su primera coincidencia y los valores por 100 g', () => {
    const [salmon, arroz, salsa] = store.lineas();
    expect(salmon).toMatchObject({
      indiceCandidato: 0,
      nombreDetectado: 'Salmón',
      alimentoId: 'salmon-plancha',
      nombreAlimento: 'Salmón a la plancha',
      gramos: 150,
      confianza: 0.94,
      nivelConfianza: 'Alta',
      preparacion: 'PLANCHA',
      por100: { kcal: 200, proteina: 20, carbohidratos: 0, grasa: 13 },
    });
    expect(arroz.por100).toEqual({ kcal: 130, proteina: 2.7, carbohidratos: 28, grasa: 0.3 });
    // Sin coincidencia con alimentoId: "Sin emparejar".
    expect(salsa).toMatchObject({ indiceCandidato: 2, alimentoId: null, nombreAlimento: null, por100: null });
    expect(store.sinEmparejar()).toEqual([2]);
  });

  it('toma fecha, hora y tipo del análisis, o la fecha y la hora elegidas antes de analizar', () => {
    expect([store.fecha(), store.hora(), store.tipoComida()]).toEqual(['2026-11-25', '21:05', 'CENA']);
    store.iniciar(ANALISIS, { fecha: '2026-11-24', hora: '14:30' });
    expect([store.fecha(), store.hora()]).toEqual(['2026-11-24', '14:30']);
    store.iniciar({ ...ANALISIS, tipoComida: null }, { hora: '08:00' });
    expect(store.tipoComida()).toBe('DESAYUNO');
  });

  it('totales: estimación con los valores por 100 g y los gramos actuales', () => {
    // Salmón 150 g (300 kcal) + arroz 200 g (260 kcal); la salsa sin emparejar no cuenta.
    expect(store.totales()).toEqual({ kcal: 560, proteina: 35.4, carbohidratos: 56, grasa: 20.1 });
    store.cambiarGramos(0, 100);
    expect(store.totales().kcal).toBe(460);
  });

  it('valido: todas las líneas con alimento y gramos > 0, y al menos una', () => {
    expect(store.valido()).toBe(false); // la salsa no tiene alimento
    store.quitar(2);
    expect(store.valido()).toBe(true);
    store.cambiarGramos(0, 0);
    expect(store.valido()).toBe(false);
    store.cambiarGramos(0, 5001);
    expect(store.valido()).toBe(false);
    store.cambiarGramos(0, 120);
    store.quitar(0);
    store.quitar(0);
    expect(store.lineas()).toEqual([]);
    expect(store.valido()).toBe(false);
  });

  it('cambiarAlimento con otra coincidencia (estimados normalizados) o con un alimento del catálogo', () => {
    store.cambiarAlimento(0, SALMON.coincidencias[1]);
    expect(store.lineas()[0]).toMatchObject({
      alimentoId: 'salmon-ahumado',
      nombreAlimento: 'Salmón ahumado',
      por100: { kcal: 180, proteina: 25, carbohidratos: 0, grasa: 9 },
      indiceCandidato: 0,
      gramos: 150,
    });

    store.cambiarAlimento(2, BROCOLI);
    expect(store.lineas()[2]).toMatchObject({
      alimentoId: 'brocoli',
      nombreAlimento: 'Brócoli cocido',
      // La preparación es la detectada: no cambia con el alimento.
      preparacion: null,
      por100: { kcal: 35, proteina: 2.4, carbohidratos: 7, grasa: 0.4 },
      indiceCandidato: 2,
    });

    // Una coincidencia sin alimentoId no se puede elegir.
    store.cambiarAlimento(1, SALSA.coincidencias[0]);
    expect(store.lineas()[1].alimentoId).toBe('arroz');
  });

  it('aRequest con un candidato quitado, uno cambiado y uno añadido a mano', () => {
    store.quitar(2); // la salsa
    store.cambiarAlimento(0, SALMON.coincidencias[1]); // salmón → ahumado
    store.cambiarGramos(0, 120);
    expect(store.anadirManual(BROCOLI, 80)).toBe(true);

    expect(store.valido()).toBe(true);
    expect(store.aRequest()).toStrictEqual({
      fecha: '2026-11-25',
      hora: '21:05:00',
      tipoComida: 'CENA',
      alimentos: [
        { alimentoId: 'salmon-ahumado', gramos: 120, indiceCandidato: 0 },
        { alimentoId: 'arroz', gramos: 200, indiceCandidato: 1 },
        { alimentoId: 'brocoli', gramos: 80 },
      ],
    });
  });

  it('aRequest sin hora no la envía', () => {
    store.cambiarHora('');
    expect(store.aRequest()).not.toHaveProperty('hora');
  });

  it('anadirManual rechaza gramos no válidos y más de 20 alimentos', () => {
    expect(store.anadirManual(BROCOLI, 0)).toBe(false);
    while (store.lineas().length < MAX_ALIMENTOS_ANALISIS) store.anadirManual(BROCOLI, 50);
    expect(store.anadirManual(BROCOLI, 50)).toBe(false);
    expect(store.lineas()).toHaveLength(MAX_ALIMENTOS_ANALISIS);
  });

  it('normalizar devuelve null sin estimados o sin gramos', () => {
    expect(normalizar(null, 100)).toBeNull();
    expect(normalizar({ kcal: 1, proteina: 0, carbohidratos: 0, grasa: 0 }, null)).toBeNull();
    expect(normalizar({ kcal: 50, proteina: 1, carbohidratos: 2, grasa: 3 }, 50)).toEqual({
      kcal: 100,
      proteina: 2,
      carbohidratos: 4,
      grasa: 6,
    });
  });
});

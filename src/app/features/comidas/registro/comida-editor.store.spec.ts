import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { AlimentoResponse, ProductoResponse, RegistroComidaResponse } from '@core/models';
import { hoyLocal } from '@core/util/fechas';
import { ComidaEditorStore, MAX_LINEAS, gramosDe, tipoPorHora, unidadesDe } from './comida-editor.store';

function alimento(id: string, cambios: Partial<AlimentoResponse> = {}): AlimentoResponse {
  return {
    id,
    nombre: id,
    marca: null,
    categoriaId: null,
    categoriaNombre: null,
    preparacion: null,
    kcal100: 100,
    proteinas100: 10,
    carbohidratos100: 20,
    grasas100: 5,
    azucares100: null,
    saturadas100: null,
    fibra100: null,
    sal100: null,
    unidadBase: 'G',
    porciones: [],
    alergenosContiene: [],
    alergenosTrazas: [],
    alergenosRevisados: true,
    contieneLactosa: false,
    aptoVegano: false,
    aptoVegetariano: false,
    aptoPescetariano: false,
    fuente: 'BEDCA',
    referenciaExterna: null,
    visibilidad: 'PUBLICO',
    validado: true,
    activo: true,
    propio: false,
    ...cambios,
  } as AlimentoResponse;
}

const ARROZ = alimento('arroz', {
  kcal100: 130,
  proteinas100: 2.7,
  carbohidratos100: 28,
  grasas100: 0.3,
  porciones: [{ nombre: 'plato', gramos: 250 }],
});
const ACEITE = alimento('aceite', {
  kcal100: 900,
  proteinas100: 0,
  carbohidratos100: 0,
  grasas100: 100,
  porciones: [{ nombre: 'cucharada', gramos: 10 }],
});
const LECHE = alimento('leche', { kcal100: 47, unidadBase: 'ML', porciones: [{ nombre: 'vaso', gramos: 250 }] });

let store: ComidaEditorStore;
let http: HttpTestingController;

beforeEach(() => {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), ComidaEditorStore] });
  store = TestBed.inject(ComidaEditorStore);
  http = TestBed.inject(HttpTestingController);
});

afterEach(() => http.verify());

describe('tipoPorHora', () => {
  it.each([
    ['00:00', 'DESAYUNO'],
    ['10:59', 'DESAYUNO'],
    ['11:00', 'MEDIA_MANANA'],
    ['12:59', 'MEDIA_MANANA'],
    ['13:00', 'COMIDA'],
    ['15:59', 'COMIDA'],
    ['16:00', 'MERIENDA'],
    ['18:59', 'MERIENDA'],
    ['19:00', 'CENA'],
    ['23:30', 'CENA'],
  ])('%s → %s', (hora, tipo) => {
    expect(tipoPorHora(hora)).toBe(tipo);
  });

  it('el store sugiere el tipo al cambiar la hora hasta que el usuario lo elige', () => {
    store.cambiarHora('08:15');
    expect(store.tipoComida()).toBe('DESAYUNO');
    store.cambiarHora('14:00');
    expect(store.tipoComida()).toBe('COMIDA');

    store.cambiarTipo('PRE_ENTRENO');
    store.cambiarHora('20:00');
    expect(store.tipoComida()).toBe('PRE_ENTRENO');
  });

  it('empieza hoy, a la hora actual y con el tipo de esa hora', () => {
    expect(store.fecha()).toBe(hoyLocal());
    expect(store.hora()).toMatch(/^\d{2}:\d{2}$/);
    expect(store.tipoComida()).toBe(tipoPorHora(store.hora()));
  });
});

describe('estimación', () => {
  it('convierte g, kg, ml, l y porciones a gramos', () => {
    expect(gramosDe(ARROZ, 150, 'g')).toBe(150);
    expect(gramosDe(ARROZ, 0.2, 'kg')).toBe(200);
    expect(gramosDe(ARROZ, 2, 'plato')).toBe(500);
    expect(gramosDe(LECHE, 1, 'l')).toBe(1000);
    expect(gramosDe(LECHE, 1, 'vaso')).toBe(250);
    expect(gramosDe(ARROZ, 1, 'taza')).toBeNull();
    expect(unidadesDe(ARROZ)).toEqual(['g', 'kg', 'plato']);
    expect(unidadesDe(LECHE)).toEqual(['ml', 'l', 'vaso']);
  });

  it('suma kcal y macros con los valores por 100 g y las porciones', () => {
    store.anadir(ARROZ);
    store.cambiarUnidad(0, 'plato'); // 100 g → 0,4 platos
    store.cambiarCantidad(0, 1); // 1 plato = 250 g
    store.anadir(ACEITE);
    store.cambiarUnidad(1, 'cucharada'); // 100 g → 10 cucharadas
    store.cambiarCantidad(1, 2); // 20 g

    expect(store.estimacion()).toEqual({
      kcal: 505, // 130 × 2,5 + 900 × 0,2 = 325 + 180
      proteina: 6.8, // 2,7 × 2,5 = 6,75
      carbohidratos: 70,
      grasa: 20.8, // 0,3 × 2,5 + 100 × 0,2 = 0,75 + 20
      gramos: 270,
      esEstimacion: true,
    });
  });

  it('cambiar de unidad conserva los gramos', () => {
    store.anadir(ARROZ);
    store.cambiarUnidad(0, 'kg');
    expect(store.lineas()[0]).toMatchObject({ cantidad: 0.1, unidad: 'kg' });
    store.cambiarUnidad(0, 'plato');
    expect(store.lineas()[0]).toMatchObject({ cantidad: 0.4, unidad: 'plato' });
    store.cambiarUnidad(0, 'taza'); // no es una unidad del arroz
    expect(store.lineas()[0].unidad).toBe('plato');
  });

  it('usa los totales del servidor hasta que se cambia una línea', () => {
    store.anadir(ARROZ);
    store.aplicarRespuesta({
      totales: { kcal: 131, proteina: 2.7, carbohidratos: 28.2, grasa: 0.3 },
      avisos: ['Aviso'],
    });
    expect(store.estimacion()).toMatchObject({ kcal: 131, esEstimacion: false });
    expect(store.avisos()).toEqual(['Aviso']);

    store.cambiarCantidad(0, 200);
    expect(store.estimacion()).toMatchObject({ kcal: 260, esEstimacion: true });
  });
});

describe('líneas', () => {
  it('añadir un alimento que ya está le suma 100 g', () => {
    store.anadir(ARROZ);
    store.anadir(ARROZ);
    expect(store.lineas()).toHaveLength(1);
    expect(store.lineas()[0]).toMatchObject({ cantidad: 200, unidad: 'g' });

    // En porciones: pasa a gramos con el total (1 plato = 250 g → 350 g).
    store.cambiarUnidad(0, 'plato');
    store.cambiarCantidad(0, 1);
    store.anadir(ARROZ);
    expect(store.lineas()[0]).toMatchObject({ cantidad: 350, unidad: 'g' });
  });

  it('los líquidos empiezan en ml', () => {
    store.anadir(LECHE);
    expect(store.lineas()[0]).toMatchObject({ cantidad: 100, unidad: 'ml' });
  });

  it('no pasa de 40 líneas ni de 5000 por alimento', () => {
    for (let i = 0; i < MAX_LINEAS; i++) expect(store.anadir(alimento(`a-${i}`))).toBe(true);
    expect(store.anadir(alimento('sobra'))).toBe(false);
    expect(store.llena()).toBe(true);

    store.cambiarCantidad(0, 9000);
    expect(store.lineas()[0].cantidad).toBe(5000);
  });

  it('quitar y vaciar', () => {
    store.anadir(ARROZ);
    store.anadir(ACEITE);
    store.quitar(0);
    expect(store.lineas().map((l) => l.alimento.id)).toEqual(['aceite']);
    store.cambiarNotas('con limón');
    store.vaciar();
    expect(store.vacia()).toBe(true);
    expect(store.notas()).toBe('');
  });
});

describe('aRequest', () => {
  it('envía solo alimentoId, cantidad y unidad por alimento, y hora con segundos', () => {
    store.cambiarFecha('2026-11-26');
    store.cambiarHora('14:05');
    store.cambiarNotas('  sin sal  ');
    store.anadir(ARROZ);
    store.cambiarUnidad(0, 'plato');
    store.cambiarCantidad(0, 1);
    store.anadir(LECHE);

    expect(store.aRequest()).toStrictEqual({
      fecha: '2026-11-26',
      hora: '14:05:00',
      tipoComida: 'COMIDA',
      notas: 'sin sal',
      alimentos: [
        { alimentoId: 'arroz', cantidad: 1, unidad: 'plato' },
        { alimentoId: 'leche', cantidad: 100, unidad: 'ml' },
      ],
    });
  });

  it('sin notas no las envía y omite las líneas con cantidad 0', () => {
    store.anadir(ARROZ);
    store.anadir(ACEITE);
    store.cambiarCantidad(1, 0);
    const req = store.aRequest();
    expect(req).not.toHaveProperty('notas');
    expect(req.alimentos).toStrictEqual([{ alimentoId: 'arroz', cantidad: 100, unidad: 'g' }]);
  });
});

describe('cargarDesde', () => {
  it('carga la comida con el detalle de cada alimento y sus totales', async () => {
    const comida: RegistroComidaResponse = {
      id: 'c-1',
      fecha: '2026-11-25',
      hora: '21:10:00',
      tipoComida: 'CENA',
      origen: 'MANUAL',
      notas: 'ligera',
      alimentos: [
        {
          id: 'l-1',
          alimentoId: 'arroz',
          nombre: 'Arroz',
          cantidad: 1,
          unidad: 'plato',
          gramos: 250,
          kcal: 325,
          proteina: 6.8,
          carbohidratos: 70,
          grasa: 0.8,
          origenIa: false,
          confianzaIa: null,
        },
        {
          id: 'l-2',
          alimentoId: null,
          nombre: 'Galletas X',
          cantidad: 30,
          unidad: 'g',
          gramos: 30,
          kcal: 140,
          proteina: 2,
          carbohidratos: 20,
          grasa: 6,
          origenIa: false,
          confianzaIa: null,
        },
      ],
      totales: { kcal: 465, proteina: 8.8, carbohidratos: 90, grasa: 6.8 },
      avisos: [],
    };
    const carga = store.cargarDesde(comida);
    http.expectOne('/api/v1/alimentos/arroz').flush(ARROZ);
    await carga;

    expect([store.fecha(), store.hora(), store.tipoComida(), store.notas()]).toEqual([
      '2026-11-25',
      '21:10',
      'CENA',
      'ligera',
    ]);
    expect(store.tipoElegido()).toBe(true);
    expect(store.lineas()).toEqual([{ alimento: ARROZ, cantidad: 1, unidad: 'plato' }]);
    expect(store.noEditables()).toEqual(['Galletas X']);
    expect(store.estimacion()).toMatchObject({ kcal: 465, esEstimacion: false });
  });
});

function producto(codigoBarras = '12345678', cambios: Partial<ProductoResponse> = {}): ProductoResponse {
  return {
    id: null,
    codigoBarras,
    nombre: 'Yogur',
    marca: 'Marca',
    imagenUrl: null,
    unidadBase: 'G',
    por100: {
      kcal: 60,
      proteinas: 4,
      carbohidratos: 5,
      grasas: 3,
      azucares: null,
      saturadas: null,
      fibra: null,
      sal: null,
    },
    racion: { gramos: 125, descripcion: 'Un envase' },
    ingredientesTexto: null,
    alergenosContiene: [],
    alergenosTrazas: [],
    alergenosRevisados: false,
    nutricionCompleta: true,
    fuente: {
      proveedor: 'Open Food Facts',
      licencia: 'ODbL',
      url: 'https://world.openfoodfacts.org',
      atribucion: 'Datos de la comunidad',
    },
    ...cambios,
  };
}
describe('productos en la comida en construcción', () => {
  it('conserva el código en la línea y lo envía sin alimentoId', () => {
    expect(store.anadirProducto(producto())).toBe(true);
    expect(store.lineas()[0].codigoBarras).toBe('12345678');
    expect(store.aRequest().alimentos).toEqual([{ codigoBarras: '12345678', cantidad: 100, unidad: 'g' }]);
    expect(store.estimacion()).toMatchObject({ kcal: 60, esEstimacion: true });
    store.cambiarUnidad(0, 'ración');
    expect(store.aRequest().alimentos[0]).toEqual({ codigoBarras: '12345678', cantidad: 100, unidad: 'g' });
  });
  it('prefiere el id del catálogo cuando existe', () => {
    store.anadirProducto(producto('12345678', { id: 'yogur' }));
    expect(store.aRequest().alimentos).toEqual([{ alimentoId: 'yogur', cantidad: 100, unidad: 'g' }]);
  });
  it('agrupa el mismo código y mantiene separados dos productos sin id', () => {
    store.anadirProducto(producto());
    store.anadirProducto(producto());
    store.anadirProducto(producto('87654321'));
    expect(store.aRequest().alimentos).toEqual([
      { codigoBarras: '12345678', cantidad: 200, unidad: 'g' },
      { codigoBarras: '87654321', cantidad: 100, unidad: 'g' },
    ]);
  });
  it('no añade productos incompletos ni supera las 40 líneas', () => {
    expect(store.anadirProducto(producto('12345678', { nutricionCompleta: false }))).toBe(false);
    expect(store.vacia()).toBe(true);
    for (let i = 0; i < MAX_LINEAS; i++) store.anadir(alimento(`a-${i}`));
    expect(store.anadirProducto(producto())).toBe(false);
    expect(store.lineas()).toHaveLength(MAX_LINEAS);
  });
});

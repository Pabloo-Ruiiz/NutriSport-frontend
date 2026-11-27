import type { EstadisticasResponse, Nutrientes, PuntoSerieResponse, SeriePesoResponse } from '@core/models';
import { TOKENS } from '@shared/design/tokens';
import {
  SERIE_MEDIA_ANTERIOR,
  diasAdherencia,
  etiquetaPeriodo,
  opcionesAdherencia,
  opcionesComidas,
  opcionesEnergia,
  opcionesMacros,
  opcionesPeso,
  opcionesReparto,
  tablaAdherencia,
  tablaComidas,
  tablaEnergia,
  tablaMacros,
  tablaPeso,
  tablaReparto,
} from './opciones-graficos';

const n = (kcal: number, proteina = 0, carbohidratos = 0, grasa = 0): Nutrientes => ({
  kcal,
  proteina,
  carbohidratos,
  grasa,
});

function punto(desde: string, consumido: Nutrientes, opciones: Partial<PuntoSerieResponse> = {}): PuntoSerieResponse {
  return {
    periodo: desde,
    desde,
    consumido,
    objetivo: n(2000),
    diasConRegistro: 1,
    diasEnObjetivo: 1,
    ...opciones,
  };
}

function estadisticas(opciones: Partial<EstadisticasResponse> = {}): EstadisticasResponse {
  return {
    desde: '2026-11-23',
    hasta: '2026-11-25',
    agrupacion: 'DIA',
    serie: [
      punto('2026-11-23', n(1950.4, 120, 210, 60)),
      punto('2026-11-24', n(0), { diasConRegistro: 0, diasEnObjetivo: 0 }),
      // El backend manda objetivo nulo si ningún día del periodo lo tiene guardado.
      punto('2026-11-25', n(2500, 140, 280, 90), { diasEnObjetivo: 0, objetivo: null as unknown as Nutrientes }),
    ],
    mediaDiaria: n(2225, 130, 245, 75),
    objetivoMedio: n(2000),
    diasConRegistro: 2,
    diasEnObjetivo: 1,
    porcentajeAdherencia: 50,
    repartoMacrosPct: { proteina: 24, carbohidratos: 45, grasa: 31 },
    kcalPorTipoComida: { CENA: 700, DESAYUNO: 450.6, COMIDA: 900, MERIENDA: 0 },
    top: [],
    ...opciones,
  };
}

// Las opciones de ECharts son uniones muy amplias: en las pruebas se leen como objetos sueltos.
interface Serie {
  name: string;
  type: string;
  data: unknown[];
  stack?: string;
  itemStyle?: { color?: string };
  lineStyle?: { type?: string; color?: string };
}
const series = (o: object) => (o as { series: Serie[] }).series;
const ejeX = (o: object) => (o as { xAxis: { data: string[] } }).xAxis.data;

describe('etiquetaPeriodo', () => {
  it('da el día, la semana por su primer día o el mes con su año', () => {
    expect(etiquetaPeriodo({ desde: '2026-11-24' }, 'DIA')).toBe('24 nov');
    expect(etiquetaPeriodo({ desde: '2026-11-23' }, 'SEMANA')).toBe('Sem. 23 nov');
    expect(etiquetaPeriodo({ desde: '2026-11-01' }, 'MES')).toBe('Noviembre 2026');
  });
});

describe('energía consumida frente al objetivo', () => {
  it('barras de kcal (sin barra en los periodos sin registro) y la línea del objetivo', () => {
    const o = opcionesEnergia(estadisticas());
    const [consumido, objetivo, ...resto] = series(o);
    expect(ejeX(o)).toEqual(['23 nov', '24 nov', '25 nov']);
    expect(consumido).toMatchObject({ name: 'Consumido', type: 'bar', data: [1950, null, 2500] });
    expect(consumido.itemStyle?.color).toBe(TOKENS.kcal);
    expect(objetivo).toMatchObject({ name: 'Objetivo', type: 'line', data: [2000, 2000, null] });
    expect(resto).toEqual([]);
  });

  it('con la media anterior añade una línea discontinua gris constante', () => {
    const o = opcionesEnergia(estadisticas(), 2100.2);
    const anterior = series(o)[2];
    expect(anterior.name).toBe(SERIE_MEDIA_ANTERIOR);
    expect(anterior.data).toEqual([2100, 2100, 2100]);
    expect(anterior.lineStyle).toEqual(expect.objectContaining({ type: 'dashed', color: TOKENS.textTertiary }));
    expect((o.legend as { data: string[] }).data).toContain(SERIE_MEDIA_ANTERIOR);
  });

  it('sin media anterior (null) no hay línea de comparación', () => {
    expect(series(opcionesEnergia(estadisticas(), null))).toHaveLength(2);
  });

  it('su tabla lleva la columna de la media anterior solo al comparar', () => {
    expect(tablaEnergia(estadisticas()).columnas).toEqual(['Periodo', 'Consumido', 'Objetivo']);
    const t = tablaEnergia(estadisticas(), 2100);
    expect(t.columnas.at(-1)).toBe(SERIE_MEDIA_ANTERIOR);
    expect(t.filas[0][0]).toBe('23 nov');
    expect(t.filas[0][1]).toMatch(/^1\.?950 kcal$/);
    expect(t.filas[1][1]).toBe('Sin registros');
    expect(t.filas[2][2]).toBe('—');
    expect(t.filas[2][3]).toMatch(/^2\.?100 kcal$/);
  });
});

describe('macros apiladas', () => {
  it('una serie apilada por macro con su color y nulos sin registro', () => {
    const s = series(opcionesMacros(estadisticas()));
    expect(s.map((x) => x.name)).toEqual(['Proteína', 'Carbohidratos', 'Grasa']);
    expect(s.every((x) => x.type === 'bar' && x.stack === 'macros')).toBe(true);
    expect(s[0].data).toEqual([120, null, 140]);
    expect(s.map((x) => x.itemStyle?.color)).toEqual([TOKENS.proteina, TOKENS.hidratos, TOKENS.grasa]);
  });

  it('tabla con los gramos por periodo', () => {
    const t = tablaMacros(estadisticas());
    expect(t.columnas).toEqual(['Periodo', 'Proteína', 'Carbohidratos', 'Grasa']);
    expect(t.filas[0]).toEqual(['23 nov', '120 g', '210 g', '60 g']);
    expect(t.filas[1].slice(1)).toEqual(['Sin registros', 'Sin registros', 'Sin registros']);
  });
});

describe('reparto de macros (anillo)', () => {
  it('pie con radio interior y los porcentajes en el orden de la app', () => {
    const [anillo] = series(opcionesReparto(estadisticas()));
    expect(anillo.type).toBe('pie');
    expect((anillo as unknown as { radius: string[] }).radius).toEqual(['55%', '80%']);
    expect(anillo.data).toEqual([
      { name: 'Proteína', value: 24, itemStyle: { color: TOKENS.proteina } },
      { name: 'Carbohidratos', value: 45, itemStyle: { color: TOKENS.hidratos } },
      { name: 'Grasa', value: 31, itemStyle: { color: TOKENS.grasa } },
    ]);
  });

  it('tabla con el % de cada macro (0 si falta)', () => {
    const t = tablaReparto(estadisticas({ repartoMacrosPct: { proteina: 30, carbohidratos: 70 } }));
    expect(t.filas).toEqual([
      ['Proteína', '30 %'],
      ['Carbohidratos', '70 %'],
      ['Grasa', '0 %'],
    ]);
  });
});

describe('peso con media móvil', () => {
  const serie: SeriePesoResponse = {
    puntos: [
      { fecha: '2026-11-20', pesoKg: 72.44, mediaMovil7: null },
      { fecha: '2026-11-21', pesoKg: 72.1, mediaMovil7: 72.27 },
    ],
    variacion: -0.34,
  };

  it('puntos de pesaje y línea de la media móvil del color del peso', () => {
    const o = opcionesPeso(serie);
    const [pesaje, media] = series(o);
    expect(ejeX(o)).toEqual(['20 nov', '21 nov']);
    expect(pesaje.data).toEqual([72.4, 72.1]);
    expect(media).toMatchObject({ name: 'Media móvil 7 días', data: [null, 72.3] });
    expect(media.itemStyle?.color).toBe(TOKENS.peso);
  });

  it('tabla con fecha, peso y media', () => {
    expect(tablaPeso(serie).filas).toEqual([
      ['20 nov 2026', '72,4 kg', '—'],
      ['21 nov 2026', '72,1 kg', '72,3 kg'],
    ]);
  });
});

describe('mapa de adherencia', () => {
  it('estado de cada día del rango; los que faltan en la serie, sin registro', () => {
    const est = estadisticas({ hasta: '2026-11-26' });
    expect(diasAdherencia(est)).toEqual([
      { fecha: '2026-11-23', estado: 'EN_OBJETIVO' },
      { fecha: '2026-11-24', estado: 'SIN_REGISTRO' },
      { fecha: '2026-11-25', estado: 'FUERA' },
      { fecha: '2026-11-26', estado: 'SIN_REGISTRO' },
    ]);
  });

  it('rechaza una serie que no sea por día', () => {
    expect(() => diasAdherencia(estadisticas({ agrupacion: 'SEMANA' }))).toThrow(RangeError);
  });

  it('heatmap sobre un calendario del rango con tres piezas de color', () => {
    const o = opcionesAdherencia(estadisticas()) as unknown as {
      calendar: { range: string[]; dayLabel: { firstDay: number } };
      visualMap: { pieces: { value: number; label: string; color: string }[] };
      series: { type: string; coordinateSystem: string; data: unknown[] }[];
    };
    expect(o.calendar.range).toEqual(['2026-11-23', '2026-11-25']);
    expect(o.calendar.dayLabel.firstDay).toBe(1);
    expect(o.visualMap.pieces).toEqual([
      { value: 2, label: 'En objetivo', color: TOKENS.kcal },
      { value: 1, label: 'Fuera del objetivo', color: TOKENS.warning },
      { value: 0, label: 'Sin registro', color: TOKENS.border },
    ]);
    expect(o.series[0]).toMatchObject({ type: 'heatmap', coordinateSystem: 'calendar' });
    expect(o.series[0].data).toEqual([
      ['2026-11-23', 2],
      ['2026-11-24', 0],
      ['2026-11-25', 1],
    ]);
  });

  it('tabla con el estado de cada día', () => {
    const t = tablaAdherencia(estadisticas());
    expect(t.columnas).toEqual(['Día', 'Estado']);
    expect(t.filas.map((f) => f[1])).toEqual(['En objetivo', 'Sin registro', 'Fuera del objetivo']);
    expect(t.filas[0][0]).toContain('23');
  });
});

describe('kcal por tipo de comida', () => {
  it('barras horizontales en el orden del día con etiquetas de TipoComida y sin los ceros', () => {
    const o = opcionesComidas(estadisticas()) as unknown as {
      yAxis: { type: string; inverse: boolean; data: string[] };
      series: { type: string; data: number[] }[];
    };
    expect(o.yAxis).toMatchObject({ type: 'category', inverse: true, data: ['Desayuno', 'Comida', 'Cena'] });
    expect(o.series[0]).toMatchObject({ type: 'bar', data: [451, 900, 700] });
  });

  it('tabla con el tipo de comida y sus kcal (un tipo desconocido, al final con su clave)', () => {
    const t = tablaComidas(estadisticas({ kcalPorTipoComida: { RECENA: 100, POST_ENTRENO: 300 } }));
    expect(t.filas.map((f) => f[0])).toEqual(['Post-entreno', 'RECENA']);
    expect(t.filas[0][1]).toBe('300 kcal');
  });
});

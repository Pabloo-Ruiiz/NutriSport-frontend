import { leerInicio, previsualizarCsv, validarCsv } from './csv';

describe('previsualizarCsv', () => {
  it('detecta el separador, quita el BOM y devuelve la cabecera y las 5 primeras filas', () => {
    const filas = Array.from({ length: 8 }, (_, i) => `Alimento ${i};${100 + i}`);
    const vista = previsualizarCsv(`﻿nombre;kcal100\r\n${filas.join('\r\n')}\r\n`);
    expect(vista.separador).toBe(';');
    expect(vista.cabecera).toEqual(['nombre', 'kcal100']);
    expect(vista.filas.length).toBe(5);
    expect(vista.filas[0]).toEqual(['Alimento 0', '100']);
  });

  it('respeta las comillas (separador y comillas dobles dentro) y salta las líneas vacías', () => {
    const vista = previsualizarCsv('nombre,marca\n"Pan, integral","La ""Buena"""\n\n"Leche\nentera",\n');
    expect(vista.separador).toBe(',');
    expect(vista.filas).toEqual([
      ['Pan, integral', 'La "Buena"'],
      ['Leche\nentera', ''],
    ]);
  });

  it('descarta la última línea si el texto venía cortado', () => {
    expect(previsualizarCsv('a\tb\n1\t2\n3\t', 5, true).filas).toEqual([['1', '2']]);
    expect(previsualizarCsv('', 5, true)).toEqual({ cabecera: [], filas: [], separador: ';' });
  });
});

describe('validarCsv y leerInicio', () => {
  it('solo .csv, no vacío y hasta 10 MB', () => {
    const csv = (nombre: string, bytes: number, type = '') => {
      const archivo = new File(['x'], nombre, { type });
      Object.defineProperty(archivo, 'size', { value: bytes });
      return archivo;
    };
    expect(validarCsv(csv('datos.CSV', 10))).toBeNull();
    expect(validarCsv(csv('datos', 10, 'text/csv'))).toBeNull();
    expect(validarCsv(csv('datos.xlsx', 10))).toContain('CSV');
    expect(validarCsv(csv('datos.csv', 0))).toContain('vacío');
    expect(validarCsv(csv('datos.csv', 10 * 1024 * 1024 + 1))).toContain('10 MB');
  });

  it('lee el principio del fichero como texto', async () => {
    const archivo = new File(['nombre;kcal\nAvena;370\n'], 'a.csv');
    expect(await leerInicio(archivo, 11)).toBe('nombre;kcal');
  });
});

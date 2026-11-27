import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { fechaNoFutura } from '../util/validadores';
import { SeguimientoService } from './seguimiento.service';

let servicio: SeguimientoService;
let http: HttpTestingController;

beforeEach(() => {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  servicio = TestBed.inject(SeguimientoService);
  http = TestBed.inject(HttpTestingController);
});

afterEach(() => http.verify());

describe('SeguimientoService (peso)', () => {
  it('registrarPeso() hace POST /seguimiento/peso solo con fecha y pesoKg (number)', () => {
    servicio.registrarPeso({ fecha: '2026-11-26', pesoKg: '71.4' as unknown as number, extra: 1 } as never).subscribe();
    const peticion = http.expectOne({ method: 'POST', url: '/api/v1/seguimiento/peso' });
    expect(peticion.request.body).toStrictEqual({ fecha: '2026-11-26', pesoKg: 71.4 });
  });

  it('eliminarPeso() hace DELETE /seguimiento/peso/{id}', () => {
    servicio.eliminarPeso('a-1').subscribe();
    http.expectOne({ method: 'DELETE', url: '/api/v1/seguimiento/peso/a-1' }).flush(null, {
      status: 204,
      statusText: 'No Content',
    });
  });

  it('seriePeso() pide el rango con desde y hasta', () => {
    servicio.seriePeso('2026-01-01', '2026-12-31').subscribe(); // 365 días
    const peticion = http.expectOne((req) => req.url === '/api/v1/seguimiento/peso');
    expect(peticion.request.params.get('desde')).toBe('2026-01-01');
    expect(peticion.request.params.get('hasta')).toBe('2026-12-31');
  });

  it('seriePeso() admite 366 días y rechaza más (o un rango al revés) sin llamar', async () => {
    servicio.seriePeso('2027-01-01', '2028-01-01').subscribe(); // 366 días
    http.expectOne((req) => req.url === '/api/v1/seguimiento/peso');

    await expect(firstValueFrom(servicio.seriePeso('2027-01-01', '2028-01-02'))).rejects.toBeInstanceOf(RangeError);
    await expect(firstValueFrom(servicio.seriePeso('2026-02-01', '2026-01-31'))).rejects.toBeInstanceOf(RangeError);
    http.expectNone((req) => req.url === '/api/v1/seguimiento/peso');
  });
});

describe('SeguimientoService (estadísticas, comparativa e insights)', () => {
  it('estadisticas() pide desde, hasta y la agrupación', () => {
    servicio.estadisticas('2026-11-01', '2026-11-27', 'SEMANA').subscribe();
    const peticion = http.expectOne((req) => req.url === '/api/v1/seguimiento/estadisticas');
    expect(peticion.request.method).toBe('GET');
    expect(peticion.request.params.get('desde')).toBe('2026-11-01');
    expect(peticion.request.params.get('hasta')).toBe('2026-11-27');
    expect(peticion.request.params.get('agrupacion')).toBe('SEMANA');
  });

  it('estadisticas() sin agrupación no la envía (el backend usa DIA)', () => {
    servicio.estadisticas('2026-11-01', '2026-11-07').subscribe();
    const peticion = http.expectOne((req) => req.url === '/api/v1/seguimiento/estadisticas');
    expect(peticion.request.params.has('agrupacion')).toBe(false);
  });

  it('estadisticas() admite 366 días y rechaza más (o un rango al revés) sin llamar', async () => {
    servicio.estadisticas('2027-01-01', '2028-01-01').subscribe(); // 366 días
    http.expectOne((req) => req.url === '/api/v1/seguimiento/estadisticas');

    await expect(firstValueFrom(servicio.estadisticas('2027-01-01', '2028-01-02'))).rejects.toBeInstanceOf(RangeError);
    await expect(firstValueFrom(servicio.estadisticas('2026-02-01', '2026-01-31'))).rejects.toBeInstanceOf(RangeError);
    http.expectNone((req) => req.url === '/api/v1/seguimiento/estadisticas');
  });

  it('comparativa() envía el periodo solo si se indica', () => {
    servicio.comparativa('MES').subscribe();
    expect(http.expectOne((req) => req.url === '/api/v1/seguimiento/comparativa').request.params.get('periodo')).toBe(
      'MES',
    );
    servicio.comparativa().subscribe();
    expect(http.expectOne((req) => req.url === '/api/v1/seguimiento/comparativa').request.params.has('periodo')).toBe(
      false,
    );
  });

  it('insights() hace GET /seguimiento/insights', async () => {
    const respuesta = firstValueFrom(servicio.insights());
    http.expectOne({ method: 'GET', url: '/api/v1/seguimiento/insights' }).flush([]);
    expect(await respuesta).toEqual([]);
  });
});

describe('fechaNoFutura', () => {
  const validar = (valor: string) => fechaNoFutura(() => '2026-11-26')(new FormControl(valor));

  it('admite hoy y fechas pasadas; rechaza las futuras y las no válidas', () => {
    expect(validar('2026-11-26')).toBeNull();
    expect(validar('2025-02-28')).toBeNull();
    expect(validar('2026-11-27')).toEqual({ fechaFutura: true });
    expect(validar('2026-02-30')).toEqual({ fechaNoValida: true });
    expect(validar('')).toBeNull();
  });
});

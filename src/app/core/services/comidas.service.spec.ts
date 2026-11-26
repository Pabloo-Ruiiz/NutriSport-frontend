import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import type { RegistroComidaRequest } from '../models';
import { ComidasService } from './comidas.service';

let servicio: ComidasService;
let http: HttpTestingController;

beforeEach(() => {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  servicio = TestBed.inject(ComidasService);
  http = TestBed.inject(HttpTestingController);
});

afterEach(() => http.verify());

const REQ = {
  fecha: '2026-11-26',
  hora: '14:05:00',
  tipoComida: 'COMIDA',
  notas: '  ',
  alimentos: [{ alimentoId: 'a-1', codigoBarras: '8410000000000', cantidad: '150', unidad: 'g', nombre: 'x' }],
  extra: true,
} as unknown as RegistroComidaRequest;

describe('ComidasService', () => {
  it('registrar() hace POST /comidas solo con los campos del contrato', () => {
    servicio.registrar(REQ).subscribe();
    const peticion = http.expectOne({ method: 'POST', url: '/api/v1/comidas' });
    expect(peticion.request.body).toStrictEqual({
      fecha: '2026-11-26',
      hora: '14:05:00',
      tipoComida: 'COMIDA',
      alimentos: [{ alimentoId: 'a-1', cantidad: 150, unidad: 'g' }],
    });
  });

  it('detalle(), editar() y eliminar()', () => {
    servicio.detalle('c-1').subscribe();
    http.expectOne({ method: 'GET', url: '/api/v1/comidas/c-1' }).flush({});
    servicio.editar('c-1', REQ).subscribe();
    expect(http.expectOne({ method: 'PUT', url: '/api/v1/comidas/c-1' }).request.body).not.toHaveProperty('extra');
    servicio.eliminar('c-1').subscribe();
    http.expectOne({ method: 'DELETE', url: '/api/v1/comidas/c-1' }).flush(null, { status: 204, statusText: '' });
  });

  it('duplicar() envía fecha y, si hay, tipoComida', () => {
    servicio.duplicar('c-1', { fecha: '2026-11-27' }).subscribe();
    expect(http.expectOne({ method: 'POST', url: '/api/v1/comidas/c-1/duplicar' }).request.body).toStrictEqual({
      fecha: '2026-11-27',
    });
    servicio.duplicar('c-1', { fecha: '2026-11-27', tipoComida: 'CENA' }).subscribe();
    expect(http.expectOne('/api/v1/comidas/c-1/duplicar').request.body).toStrictEqual({
      fecha: '2026-11-27',
      tipoComida: 'CENA',
    });
  });

  it('historial() admite hasta 92 días y el tipo opcional', async () => {
    servicio.historial('2026-09-01', '2026-12-01', 'CENA').subscribe(); // 92 días
    const peticion = http.expectOne((r) => r.url === '/api/v1/comidas');
    expect(peticion.request.params.get('desde')).toBe('2026-09-01');
    expect(peticion.request.params.get('hasta')).toBe('2026-12-01');
    expect(peticion.request.params.get('tipo')).toBe('CENA');

    await expect(firstValueFrom(servicio.historial('2026-09-01', '2026-12-02'))).rejects.toBeInstanceOf(RangeError);
    await expect(firstValueFrom(servicio.historial('2026-12-02', '2026-12-01'))).rejects.toBeInstanceOf(RangeError);
    http.expectNone((r) => r.url === '/api/v1/comidas');
  });

  it('dia() hace GET /comidas/dia/{fecha}', () => {
    servicio.dia('2026-11-26').subscribe();
    http.expectOne({ method: 'GET', url: '/api/v1/comidas/dia/2026-11-26' }).flush({});
  });
});

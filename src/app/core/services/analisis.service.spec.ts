import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TimeoutError } from 'rxjs';

import type { AnalisisResponse, ConfirmarAnalisisRequest, EstadoAnalisis } from '../models';
import { AnalisisService } from './analisis.service';

let servicio: AnalisisService;
let http: HttpTestingController;

beforeEach(() => {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  servicio = TestBed.inject(AnalisisService);
  http = TestBed.inject(HttpTestingController);
});

afterEach(() => {
  http.verify();
  vi.useRealTimers();
});

const analisis = (estado: EstadoAnalisis) => ({ id: 'a-1', estado }) as AnalisisResponse;

describe('AnalisisService', () => {
  it('subir() envía la foto en el FormData y tipoComida y descripcion en la query', () => {
    const foto = new Blob(['jpeg'], { type: 'image/jpeg' });
    servicio.subir(foto, 'CENA', '  Pasta con tomate ').subscribe();

    const peticion = http.expectOne((r) => r.method === 'POST' && r.url === '/api/v1/analisis/imagenes');
    expect(peticion.request.params.get('tipoComida')).toBe('CENA');
    expect(peticion.request.params.get('descripcion')).toBe('Pasta con tomate');
    expect(peticion.request.headers.has('Content-Type')).toBe(false);
    const datos = peticion.request.body as FormData;
    expect([...datos.keys()]).toEqual(['imagen']);
    expect((datos.get('imagen') as File).name).toBe('foto.jpg');
    peticion.flush(analisis('PENDIENTE'), { status: 202, statusText: 'Accepted' });
  });

  it('subir() sin descripción no la pone en la query', () => {
    servicio.subir(new Blob(['x']), 'DESAYUNO', ' ').subscribe();
    const peticion = http.expectOne((r) => r.url === '/api/v1/analisis/imagenes');
    expect(peticion.request.params.keys()).toEqual(['tipoComida']);
  });

  it('consultar(), urlImagen(), confirmar() y descartar()', () => {
    servicio.consultar('a-1').subscribe();
    http.expectOne({ method: 'GET', url: '/api/v1/analisis/a-1' }).flush(analisis('PENDIENTE'));
    servicio.urlImagen('a-1').subscribe();
    http.expectOne({ method: 'GET', url: '/api/v1/analisis/a-1/imagen' }).flush({});
    const req: ConfirmarAnalisisRequest = {
      fecha: '2026-11-26',
      tipoComida: 'CENA',
      alimentos: [{ alimentoId: 'al-1', gramos: 120, indiceCandidato: 0 }],
    };
    servicio.confirmar('a-1', req).subscribe();
    expect(http.expectOne({ method: 'POST', url: '/api/v1/analisis/a-1/confirmar' }).request.body).toEqual(req);
    servicio.descartar('a-1').subscribe();
    http
      .expectOne({ method: 'POST', url: '/api/v1/analisis/a-1/descartar' })
      .flush(null, { status: 204, statusText: '' });
  });

  it('seguir() consulta cada 1,5 s, emite hasta COMPLETADO (incluido) y se detiene', () => {
    vi.useFakeTimers();
    const estados: string[] = [];
    let terminado = false;
    servicio.seguir('a-1').subscribe({ next: (a) => estados.push(a.estado), complete: () => (terminado = true) });

    vi.advanceTimersByTime(0);
    http.expectOne('/api/v1/analisis/a-1').flush(analisis('PENDIENTE'));
    vi.advanceTimersByTime(1500);
    http.expectOne('/api/v1/analisis/a-1').flush(analisis('PROCESANDO'));
    vi.advanceTimersByTime(1500);
    http.expectOne('/api/v1/analisis/a-1').flush(analisis('COMPLETADO'));

    expect(estados).toEqual(['PENDIENTE', 'PROCESANDO', 'COMPLETADO']);
    expect(terminado).toBe(true);
    vi.advanceTimersByTime(10_000);
    http.expectNone('/api/v1/analisis/a-1');
  });

  it('seguir() falla con TimeoutError si a los 60 s sigue en curso', () => {
    vi.useFakeTimers();
    let error: unknown;
    servicio.seguir('a-1').subscribe({ error: (e) => (error = e) });

    for (let t = 0; t < 60_000; t += 1500) {
      vi.advanceTimersByTime(t === 0 ? 0 : 1500);
      http.expectOne('/api/v1/analisis/a-1').flush(analisis('PROCESANDO'));
    }
    expect(error).toBeUndefined();
    vi.advanceTimersByTime(1500);
    http.expectNone('/api/v1/analisis/a-1');
    expect(error).toBeInstanceOf(TimeoutError);
  });
});

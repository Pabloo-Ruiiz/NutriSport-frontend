import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import type { TipoActividadResponse } from '../models';
import { AlimentosService } from './alimentos.service';
import { CategoriasService } from './categorias.service';
import { TiposActividadService } from './tipos-actividad.service';

let http: HttpTestingController;

beforeEach(() => {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  http = TestBed.inject(HttpTestingController);
});

afterEach(() => http.verify());

describe('TiposActividadService', () => {
  const TIPOS: TipoActividadResponse[] = [{ codigo: 'CARRERA', nombre: 'Carrera', met: 9.8, categoria: 'Resistencia' }];

  it('pide el catálogo una sola vez y lo comparte', async () => {
    const servicio = TestBed.inject(TiposActividadService);
    const a = firstValueFrom(servicio.listar());
    const b = firstValueFrom(servicio.listar());
    http.expectOne({ method: 'GET', url: '/api/v1/entrenamientos/tipos' }).flush(TIPOS);
    expect(await a).toEqual(TIPOS);
    expect(await b).toEqual(TIPOS);

    expect(await firstValueFrom(servicio.listar())).toEqual(TIPOS);
    http.expectNone('/api/v1/entrenamientos/tipos');
  });

  it('si falla, la siguiente llamada lo vuelve a intentar', async () => {
    const servicio = TestBed.inject(TiposActividadService);
    const fallo = firstValueFrom(servicio.listar());
    http.expectOne('/api/v1/entrenamientos/tipos').flush(null, { status: 500, statusText: 'Error' });
    await expect(fallo).rejects.toMatchObject({ status: 500 });

    const reintento = firstValueFrom(servicio.listar());
    http.expectOne('/api/v1/entrenamientos/tipos').flush(TIPOS);
    expect(await reintento).toEqual(TIPOS);
  });
});

describe('CategoriasService', () => {
  it('cachea por tipo', async () => {
    const servicio = TestBed.inject(CategoriasService);
    const alimentos = firstValueFrom(servicio.listar('ALIMENTO'));
    const recetas = firstValueFrom(servicio.listar('RECETA'));
    http.expectOne('/api/v1/categorias?tipo=ALIMENTO').flush([{ id: '1' }]);
    http.expectOne('/api/v1/categorias?tipo=RECETA').flush([{ id: '2' }]);
    expect(await alimentos).toEqual([{ id: '1' }]);
    expect(await recetas).toEqual([{ id: '2' }]);

    expect(await firstValueFrom(servicio.listar('ALIMENTO'))).toEqual([{ id: '1' }]);
    http.expectNone((req) => req.url === '/api/v1/categorias');
  });

  it('no cachea los errores e invalidar() fuerza a pedirlas de nuevo', async () => {
    const servicio = TestBed.inject(CategoriasService);
    const fallo = firstValueFrom(servicio.listar('ALIMENTO'));
    http.expectOne('/api/v1/categorias?tipo=ALIMENTO').flush(null, { status: 503, statusText: 'Error' });
    await expect(fallo).rejects.toMatchObject({ status: 503 });

    servicio.listar('ALIMENTO').subscribe();
    http.expectOne('/api/v1/categorias?tipo=ALIMENTO').flush([]);

    servicio.invalidar('ALIMENTO');
    servicio.listar('ALIMENTO').subscribe();
    http.expectOne('/api/v1/categorias?tipo=ALIMENTO').flush([]);
  });
});

describe('AlimentosService.buscar', () => {
  it('busca con q, page y size', async () => {
    const servicio = TestBed.inject(AlimentosService);
    servicio.buscar('  avena ', { categoria: 'cat-1', page: 2, size: 10 }).subscribe();
    const peticion = http.expectOne((req) => req.url === '/api/v1/alimentos');
    expect(peticion.request.params.get('q')).toBe('avena');
    expect(peticion.request.params.get('categoria')).toBe('cat-1');
    expect(peticion.request.params.get('page')).toBe('2');
    expect(peticion.request.params.get('size')).toBe('10');
  });

  it('por defecto page 0 y size 20, sin categoría', () => {
    TestBed.inject(AlimentosService).buscar('pollo').subscribe();
    const params = http.expectOne((req) => req.url === '/api/v1/alimentos').request.params;
    expect([params.get('page'), params.get('size'), params.has('categoria')]).toEqual(['0', '20', false]);
  });

  it('limita size a 50', () => {
    TestBed.inject(AlimentosService).buscar('arroz', { size: 200 }).subscribe();
    expect(http.expectOne((req) => req.url === '/api/v1/alimentos').request.params.get('size')).toBe('50');
  });

  it('con menos de 2 caracteres no llama y devuelve una página vacía', async () => {
    const servicio = TestBed.inject(AlimentosService);
    expect(await firstValueFrom(servicio.buscar('a', { size: 10 }))).toEqual({
      content: [],
      page: 0,
      size: 10,
      totalElements: 0,
      totalPages: 0,
    });
    expect((await firstValueFrom(servicio.buscar('  '))).content).toEqual([]);
    http.expectNone((req) => req.url === '/api/v1/alimentos');
  });
});

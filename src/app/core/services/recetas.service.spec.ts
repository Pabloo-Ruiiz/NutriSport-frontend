import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { RecetasService } from './recetas.service';

let servicio: RecetasService;
let http: HttpTestingController;

beforeEach(() => {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  servicio = TestBed.inject(RecetasService);
  http = TestBed.inject(HttpTestingController);
});
afterEach(() => http.verify());

describe('RecetasService', () => {
  it('buscar solo envía los filtros con valor y omite origen = todas', () => {
    servicio
      .buscar({
        q: '  ',
        ingrediente: null,
        categoria: 'Pollo',
        origen: 'todas',
        maxKcal: undefined,
        page: 0,
        size: 20,
      })
      .subscribe();
    const req = http.expectOne((r) => r.url === '/api/v1/recetas');
    expect(req.request.params.keys().sort()).toEqual(['categoria', 'page', 'size']);
    req.flush({ catalogo: { content: [] }, themealdb: [], themealdbDisponible: true });
  });

  it('buscar envía todos los filtros rellenos', () => {
    servicio
      .buscar({
        q: ' curry ',
        ingrediente: 'pollo',
        categoria: 'Pollo',
        area: 'India',
        origen: 'themealdb',
        franja: 'CENA',
        maxKcal: 700,
        minProteina: 0,
        page: 2,
        size: 12,
      })
      .subscribe();
    const req = http.expectOne((r) => r.url === '/api/v1/recetas');
    const p = req.request.params;
    expect(p.get('q')).toBe('curry');
    expect(p.get('origen')).toBe('themealdb');
    expect(p.get('franja')).toBe('CENA');
    expect(p.get('maxKcal')).toBe('700');
    expect(p.get('minProteina')).toBe('0');
    expect(p.get('page')).toBe('2');
    expect(p.get('size')).toBe('12');
    req.flush({});
  });

  it('buscar rechaza página o tamaño no válidos sin llamar a la API', () => {
    servicio.buscar({ page: -1, size: 20 }).subscribe({ error: (e) => expect(e).toBeInstanceOf(RangeError) });
    servicio.buscar({ page: 0, size: 0 }).subscribe({ error: (e) => expect(e).toBeInstanceOf(RangeError) });
    http.expectNone((r) => r.url.startsWith('/api/v1/recetas'));
  });

  it('categorias se cachean y no guardan un error', () => {
    servicio.categorias().subscribe({ error: () => undefined });
    http.expectOne('/api/v1/recetas/categorias').flush(null, { status: 500, statusText: 'Error' });

    servicio.categorias().subscribe();
    http.expectOne('/api/v1/recetas/categorias').flush([{ id: '1' }]);
    servicio.categorias().subscribe((c) => expect(c).toEqual([{ id: '1' }]));
    http.expectNone('/api/v1/recetas/categorias');
  });

  it('detalle y nutricion envían raciones solo si es un entero positivo', () => {
    servicio.detalle('a1').subscribe();
    http.expectOne('/api/v1/recetas/a1').flush({});
    servicio.detalle('a1', 2).subscribe();
    http.expectOne('/api/v1/recetas/a1?raciones=2').flush({});
    servicio.nutricion('a1', 0).subscribe();
    http.expectOne('/api/v1/recetas/a1/nutricion').flush({});
  });

  it('relacionadas, favoritas, marcar y quitar favorita', () => {
    servicio.relacionadas('a1').subscribe();
    http.expectOne('/api/v1/recetas/a1/relacionadas').flush([]);
    servicio.favoritas().subscribe();
    http.expectOne('/api/v1/recetas/favoritas').flush([]);
    servicio.marcarFavorita('a1').subscribe();
    expect(http.expectOne('/api/v1/recetas/a1/favorita').request.method).toBe('PUT');
    servicio.quitarFavorita('a1').subscribe();
    expect(http.expectOne('/api/v1/recetas/a1/favorita').request.method).toBe('DELETE');
  });

  it('abrir devuelve el id o importa la receta de TheMealDB', () => {
    const ids: string[] = [];
    servicio.abrir({ id: 'a1', referenciaExterna: null }).subscribe((id) => ids.push(id));
    servicio.abrir({ id: null, referenciaExterna: '52795' }).subscribe((id) => ids.push(id));
    http.expectOne('/api/v1/recetas/externas/themealdb/52795').flush({ id: 'b2' });
    expect(ids).toEqual(['a1', 'b2']);

    servicio.abrir({ id: null, referenciaExterna: null }).subscribe({ error: (e) => expect(e).toBeInstanceOf(Error) });
  });
});

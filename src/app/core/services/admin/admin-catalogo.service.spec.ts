import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { AlimentoRequest } from '@core/models';
import { environment } from '@env/environment';
import { CategoriasService } from '../categorias.service';
import { AdminCatalogoService } from './admin-catalogo.service';

const URL = `${environment.apiUrl}/admin`;

const REQ: AlimentoRequest = {
  nombre: ' Avena ',
  categoriaId: 'c1',
  kcal100: 370,
  proteinas100: 13,
  carbohidratos100: 60,
  grasas100: 7,
  unidadBase: 'G',
  contieneLactosa: false,
  aptoVegano: true,
  aptoVegetariano: false,
  aptoPescetariano: false,
};

let servicio: AdminCatalogoService;
let http: HttpTestingController;

beforeEach(() => {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  servicio = TestBed.inject(AdminCatalogoService);
  http = TestBed.inject(HttpTestingController);
});

afterEach(() => http.verify());

describe('AdminCatalogoService', () => {
  it('alimentos envía solo los filtros indicados (también los booleanos false) y limita size a 100', () => {
    servicio
      .alimentos({ q: ' leche ', fuente: 'BEDCA', revisados: false, visibilidad: null, activo: true, page: 1, size: 300 })
      .subscribe();
    const req = http.expectOne((r) => r.url === `${URL}/alimentos`);
    const p = req.request.params;
    expect(p.keys().sort()).toEqual(['activo', 'fuente', 'page', 'q', 'revisados', 'size']);
    expect([p.get('q'), p.get('fuente'), p.get('revisados'), p.get('activo'), p.get('size')]).toEqual([
      'leche',
      'BEDCA',
      'false',
      'true',
      '100',
    ]);
    req.flush({ content: [], page: 1, size: 100, totalElements: 0, totalPages: 0 });
  });

  it('crearAlimento lleva fuente y referenciaExterna en la query y el cuerpo limpio', () => {
    servicio.crearAlimento(REQ, 'USDA', ' 171287 ').subscribe();
    const req = http.expectOne((r) => r.url === `${URL}/alimentos`);
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('fuente')).toBe('USDA');
    expect(req.request.params.get('referenciaExterna')).toBe('171287');
    expect(req.request.body.nombre).toBe('Avena');
    expect(req.request.body.aptoVegetariano).toBe(true);
    req.flush({});

    servicio.crearAlimento(REQ, 'ADMIN').subscribe();
    const sinRef = http.expectOne((r) => r.url === `${URL}/alimentos`);
    expect(sinRef.request.params.has('referenciaExterna')).toBe(false);
    sinRef.flush({});
  });

  it('editar, eliminar y revisar alérgenos usan /{id}; las trazas no repiten lo que contiene', () => {
    servicio.editarAlimento('a1', REQ).subscribe();
    expect(http.expectOne(`${URL}/alimentos/a1`).request.method).toBe('PUT');

    servicio.eliminarAlimento('a1').subscribe();
    expect(http.expectOne(`${URL}/alimentos/a1`).request.method).toBe('DELETE');

    servicio
      .revisarAlergenos('a1', { alergenosContiene: ['LACTEOS'], alergenosTrazas: ['LACTEOS', 'SOJA'], contieneLactosa: true })
      .subscribe();
    const revision = http.expectOne(`${URL}/alimentos/a1/alergenos`);
    expect(revision.request.method).toBe('PUT');
    expect(revision.request.body).toEqual({ alergenosContiene: ['LACTEOS'], alergenosTrazas: ['SOJA'], contieneLactosa: true });
  });

  it('importar manda multipart con el campo "archivo" y la fuente en la query', () => {
    const archivo = new File(['nombre;kcal\n'], 'bedca.csv', { type: 'text/csv' });
    servicio.importar(archivo, 'BEDCA', '2024').subscribe();
    const req = http.expectOne((r) => r.url === `${URL}/alimentos/importar`);
    expect(req.request.params.get('fuente')).toBe('BEDCA');
    expect(req.request.params.get('referencia')).toBe('2024');
    const cuerpo = req.request.body as FormData;
    expect(cuerpo).toBeInstanceOf(FormData);
    expect((cuerpo.get('archivo') as File).name).toBe('bedca.csv');
    expect(req.request.headers.has('Content-Type')).toBe(false);
    req.flush({ creados: 1, actualizados: 0, errores: [] });
  });

  it('las categorías se leen de /categorias y su caché se invalida al cambiarlas', () => {
    const invalidar = vi.spyOn(TestBed.inject(CategoriasService), 'invalidar');
    servicio.categorias('ALIMENTO').subscribe();
    http.expectOne(`${environment.apiUrl}/categorias?tipo=ALIMENTO`).flush([]);

    servicio.crearCategoria({ nombre: ' Frutas ', tipo: 'RECETA', orden: 1, seccionCompra: 'Fruta' }).subscribe();
    const crear = http.expectOne(`${URL}/categorias`);
    // Solo las de alimentos tienen sección de la compra.
    expect(crear.request.body).toEqual({ nombre: 'Frutas', tipo: 'RECETA', orden: 1 });
    crear.flush({});
    expect(invalidar).toHaveBeenCalledWith('RECETA');

    servicio.editarCategoria('c1', { nombre: 'Verduras', tipo: 'ALIMENTO', orden: 2 }).subscribe();
    http.expectOne(`${URL}/categorias/c1`).flush({});
    servicio.eliminarCategoria('c1', 'ALIMENTO').subscribe();
    http.expectOne(`${URL}/categorias/c1`).flush(null);
    expect(invalidar).toHaveBeenCalledTimes(3);
  });
});

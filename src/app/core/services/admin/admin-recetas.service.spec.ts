import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { RecetaAdminRequest } from '@core/models';
import { environment } from '@env/environment';
import { AdminRecetasService } from './admin-recetas.service';

const URL = `${environment.apiUrl}/admin`;

const REQ: RecetaAdminRequest = {
  nombre: 'Gachas de avena',
  categoriaId: 'c1',
  raciones: 2,
  ingredientes: [{ alimentoId: 'a1', gramos: 80 }],
};

let servicio: AdminRecetasService;
let http: HttpTestingController;

beforeEach(() => {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  servicio = TestBed.inject(AdminRecetasService);
  http = TestBed.inject(HttpTestingController);
});
afterEach(() => http.verify());

describe('AdminRecetasService', () => {
  it('crear, editar, eliminar y publicacion usan su método y ruta', () => {
    servicio.crear(REQ).subscribe();
    servicio.editar('r 1', REQ).subscribe();
    servicio.eliminar('r1').subscribe();
    servicio.publicacion('r1', { publicada: true, raciones: 4 }).subscribe();

    const crear = http.expectOne(`${URL}/recetas`);
    expect(crear.request.method).toBe('POST');
    expect(crear.request.body).toEqual(REQ);
    const editar = http.expectOne(`${URL}/recetas/r%201`);
    expect(editar.request.method).toBe('PUT');
    expect(editar.request.body).toEqual(REQ);
    expect(http.expectOne((r) => r.method === 'DELETE').request.url).toBe(`${URL}/recetas/r1`);
    const patch = http.expectOne(`${URL}/recetas/r1/publicacion`);
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ publicada: true, raciones: 4 });
  });

  it('mapeos envía revisado solo si es booleano y limita el tamaño a 100', () => {
    servicio.mapeos({ page: 0, size: 20 }).subscribe();
    const todos = http.expectOne((r) => r.url === `${URL}/mapeos-ingredientes`);
    expect(todos.request.params.keys().sort()).toEqual(['page', 'size']);
    todos.flush({ content: [] });

    servicio.mapeos({ revisado: false, page: 2, size: 500 }).subscribe();
    const pendientes = http.expectOne((r) => r.url === `${URL}/mapeos-ingredientes`);
    expect(pendientes.request.params.get('revisado')).toBe('false');
    expect(pendientes.request.params.get('page')).toBe('2');
    expect(pendientes.request.params.get('size')).toBe('100');
    pendientes.flush({ content: [] });
  });

  it('emparejar envía el alimento, o un cuerpo vacío para "sin equivalente"', () => {
    servicio.emparejar('m1', 'a1').subscribe();
    servicio.emparejar('m2', null).subscribe();
    const con = http.expectOne(`${URL}/mapeos-ingredientes/m1`);
    expect(con.request.method).toBe('PUT');
    expect(con.request.body).toEqual({ alimentoId: 'a1' });
    expect(http.expectOne(`${URL}/mapeos-ingredientes/m2`).request.body).toEqual({});
  });
});

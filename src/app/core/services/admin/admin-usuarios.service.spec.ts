import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';
import { AdminUsuariosService } from './admin-usuarios.service';

const URL = `${environment.apiUrl}/admin/usuarios`;

let servicio: AdminUsuariosService;
let http: HttpTestingController;

beforeEach(() => {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  servicio = TestBed.inject(AdminUsuariosService);
  http = TestBed.inject(HttpTestingController);
});

afterEach(() => http.verify());

describe('AdminUsuariosService', () => {
  it('buscar envía los filtros, recorta q y limita size a 100', () => {
    servicio.buscar({ q: '  ana ', estado: 'BLOQUEADO', page: 2, size: 500, sort: 'nombre,asc' }).subscribe();
    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('q')).toBe('ana');
    expect(req.request.params.get('estado')).toBe('BLOQUEADO');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('size')).toBe('100');
    expect(req.request.params.getAll('sort')).toEqual(['nombre,asc']);
    req.flush({ content: [], page: 2, size: 100, totalElements: 0, totalPages: 0 });
  });

  it('buscar omite los filtros vacíos', () => {
    servicio.buscar({ q: '   ', estado: null, page: 0, size: 20 }).subscribe();
    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.params.keys().sort()).toEqual(['page', 'size']);
    req.flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
  });

  it('detalle y actualizar usan /{id}; actualizar solo envía lo indicado', () => {
    servicio.detalle('u1').subscribe();
    http.expectOne(`${URL}/u1`).flush({});

    servicio.actualizar('u1', { estado: 'BLOQUEADO' }).subscribe();
    const req = http.expectOne(`${URL}/u1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ estado: 'BLOQUEADO' });
    req.flush({});
  });
});

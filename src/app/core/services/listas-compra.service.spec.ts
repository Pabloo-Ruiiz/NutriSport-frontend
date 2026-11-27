import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { ListaCompraResponse } from '../models';
import { ListasCompraService } from './listas-compra.service';

let servicio: ListasCompraService;
let http: HttpTestingController;

beforeEach(() => {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  servicio = TestBed.inject(ListasCompraService);
  http = TestBed.inject(HttpTestingController);
});
afterEach(() => http.verify());

const BASE = '/api/v1/listas-compra';

const LISTA: ListaCompraResponse = {
  id: 'l1',
  nombre: 'Compra semana',
  estado: 'ACTIVA',
  menuId: 'm1',
  fechaDesde: '2026-11-23',
  fechaHasta: '2026-11-29',
  comprados: 0,
  total: 0,
  secciones: [],
};

describe('ListasCompraService', () => {
  it('listar envía page y size (20 por defecto)', () => {
    servicio.listar().subscribe();
    const req = http.expectOne((r) => r.url === BASE);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('20');
    req.flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });

    servicio.listar(2, 50).subscribe();
    const otra = http.expectOne((r) => r.url === BASE);
    expect(otra.request.params.get('page')).toBe('2');
    expect(otra.request.params.get('size')).toBe('50');
    otra.flush({ content: [] });
  });

  it('detalle, actualizar y eliminar usan su método y ruta (con el id codificado)', () => {
    servicio.detalle('l 1').subscribe();
    servicio.actualizar('l1', { nombre: 'Nueva' }).subscribe();
    servicio.eliminar('l1').subscribe();

    expect(http.expectOne(`${BASE}/l%201`).request.method).toBe('GET');
    const patch = http.expectOne((r) => r.method === 'PATCH');
    expect(patch.request.url).toBe(`${BASE}/l1`);
    expect(patch.request.body).toEqual({ nombre: 'Nueva' });
    expect(http.expectOne((r) => r.method === 'DELETE').request.url).toBe(`${BASE}/l1`);
  });

  it('generarDesdeMenu solo envía las fechas con valor', () => {
    servicio.generarDesdeMenu('m1').subscribe();
    servicio.generarDesdeMenu('m2', { desde: '2026-11-24', hasta: ' ' }).subscribe();

    const todo = http.expectOne(`${BASE}/desde-menu/m1`);
    expect(todo.request.method).toBe('POST');
    expect(todo.request.body).toEqual({});
    expect(http.expectOne(`${BASE}/desde-menu/m2`).request.body).toEqual({ desde: '2026-11-24' });
  });

  it('anadirProducto, anadirDesdeReceta y actualizarProducto devuelven la lista', () => {
    const recibidas: ListaCompraResponse[] = [];
    servicio
      .anadirProducto('l1', { nombre: 'Servilletas', cantidad: 1, unidad: 'UD' })
      .subscribe((l) => recibidas.push(l));
    servicio.anadirDesdeReceta('l1', { recetaId: 'r1', raciones: 2 }).subscribe((l) => recibidas.push(l));
    servicio.actualizarProducto('l1', 'p1', { comprado: true }).subscribe((l) => recibidas.push(l));

    const producto = http.expectOne(`${BASE}/l1/productos`);
    expect(producto.request.method).toBe('POST');
    expect(producto.request.body).toEqual({ nombre: 'Servilletas', cantidad: 1, unidad: 'UD' });
    producto.flush(LISTA);
    const receta = http.expectOne(`${BASE}/l1/productos/desde-receta`);
    expect(receta.request.body).toEqual({ recetaId: 'r1', raciones: 2 });
    receta.flush(LISTA);
    const patch = http.expectOne(`${BASE}/l1/productos/p1`);
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ comprado: true });
    patch.flush(LISTA);

    expect(recibidas).toEqual([LISTA, LISTA, LISTA]);
  });

  it('quitarProducto hace DELETE y después devuelve el detalle', () => {
    let recibida: ListaCompraResponse | null = null;
    servicio.quitarProducto('l1', 'p1').subscribe((l) => (recibida = l));

    const borrado = http.expectOne(`${BASE}/l1/productos/p1`);
    expect(borrado.request.method).toBe('DELETE');
    borrado.flush(null, { status: 204, statusText: 'No Content' });
    http.expectOne(`${BASE}/l1`).flush(LISTA);
    expect(recibida).toEqual(LISTA);
  });

  it('quitarProducto no pide el detalle si el DELETE falla', () => {
    let error: unknown = null;
    servicio.quitarProducto('l1', 'p1').subscribe({ error: (e: unknown) => (error = e) });
    http.expectOne(`${BASE}/l1/productos/p1`).flush(null, { status: 404, statusText: 'Not Found' });
    expect(error).not.toBeNull();
  });
});

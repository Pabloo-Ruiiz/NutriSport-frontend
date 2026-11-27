import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ProductosService } from './productos.service';
let servicio: ProductosService;
let http: HttpTestingController;
beforeEach(() => {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  servicio = TestBed.inject(ProductosService);
  http = TestBed.inject(HttpTestingController);
});
afterEach(() => http.verify());
it('interpreta el aviso de proveedor en una respuesta 200', () => {
  servicio.buscar('yogur').subscribe((r) => expect(r).toEqual({ productos: [], proveedorDisponible: false }));
  http.expectOne('/api/v1/productos?q=yogur&page=0').flush([], { headers: { 'X-Proveedor-No-Disponible': 'true' } });
});
it('conserva los productos y solicita la ultima pagina admitida', () => {
  const productos = [{ codigoBarras: '12345678' }];
  servicio.buscar(' yogur ', 49).subscribe((r) => expect(r).toEqual({ productos, proveedorDisponible: true }));
  http.expectOne('/api/v1/productos?q=yogur&page=49').flush(productos);
});
it('rechaza codigos invalidos y paginas fuera del limite sin llamar a la API', () => {
  for (const codigo of ['1234567', '123456789012345', 'abcdefgh', '../12345678'])
    servicio.porCodigo(codigo).subscribe({ error: (e) => expect(e).toBeInstanceOf(RangeError) });
  for (const pagina of [-1, 50, 1.5, NaN])
    servicio.buscar('x', pagina).subscribe({ error: (e) => expect(e).toBeInstanceOf(RangeError) });
  http.expectNone((r) => r.url.startsWith('/api/v1/productos'));
});
it('consulta una ficha con codigo valido', () => {
  servicio.porCodigo('12345678').subscribe();
  http.expectOne('/api/v1/productos/12345678').flush({});
});

it('detecta la cabecera de proveedor aunque su valor esté vacío', () => {
  servicio.buscar('leche').subscribe((r) => expect(r.proveedorDisponible).toBe(false));
  http.expectOne('/api/v1/productos?q=leche&page=0').flush([], { headers: { 'X-Proveedor-No-Disponible': '' } });
});

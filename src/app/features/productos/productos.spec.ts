import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideLucideIcons } from '@lucide/angular';
import { ICONOS_APP } from '@shared/design/iconos';
import type { ProductoResponse } from '@core/models';
import { AnadirAComidaComponent } from './anadir-a-comida.component';
import { BuscadorProductosComponent } from './buscador-productos.component';

beforeEach(() =>
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideLucideIcons(...ICONOS_APP)],
  }),
);
afterEach(() => TestBed.inject(HttpTestingController).verify());
it('busca en el catalogo al escribir y consulta productos solo por accion explicita', async () => {
  const f = TestBed.createComponent(BuscadorProductosComponent);
  f.detectChanges();
  const input: HTMLInputElement = f.nativeElement.querySelector('input');
  input.value = 'yogur';
  input.dispatchEvent(new Event('input'));
  await new Promise((resolve) => setTimeout(resolve, 300));
  const http = TestBed.inject(HttpTestingController);
  http
    .expectOne((r) => r.url === '/api/v1/alimentos')
    .flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
  http.expectNone((r) => r.url === '/api/v1/productos');
  f.detectChanges();
  const boton = [...f.nativeElement.querySelectorAll('button')].find((b: any) =>
    b.textContent.includes('Buscar en productos comerciales'),
  ) as HTMLButtonElement;
  boton.click();
  http.expectOne('/api/v1/productos?q=yogur&page=0').flush([]);
  await f.whenStable();
});
for (const id of ['producto-1', null]) {
  it(`registra con ${id ? 'alimentoId' : 'codigoBarras'} y convierte una racion a gramos`, async () => {
    const f = TestBed.createComponent(AnadirAComidaComponent);
    f.componentRef.setInput('producto', {
      id,
      codigoBarras: '12345678',
      nutricionCompleta: true,
      unidadBase: 'G',
      racion: { gramos: 125, descripcion: null },
    } as ProductoResponse);
    f.detectChanges();
    const unidad: HTMLSelectElement = f.nativeElement.querySelector('select');
    unidad.value = 'racion';
    unidad.dispatchEvent(new Event('change'));
    f.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    const peticion = TestBed.inject(HttpTestingController).expectOne('/api/v1/comidas');
    expect(peticion.request.body.alimentos).toEqual([
      { ...(id ? { alimentoId: id } : { codigoBarras: '12345678' }), cantidad: 125, unidad: 'g' },
    ]);
    peticion.flush(
      { detail: 'No disponible', codigo: 'REGLA_NEGOCIO', errors: [] },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    await f.whenStable();
  });
}

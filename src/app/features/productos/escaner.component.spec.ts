import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, output } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideLucideIcons } from '@lucide/angular';
import { ICONOS_APP } from '@shared/design/iconos';
import { NsBarcodeScannerComponent, type ErrorEscaner } from '@shared/ui/form/barcode-scanner.component';
import { EscanerComponent } from './escaner.component';

@Component({ selector: 'ns-barcode-scanner', template: '' })
class CamaraSimuladaComponent {
  readonly detectado = output<string>();
  readonly error = output<ErrorEscaner>();
}

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideLucideIcons(...ICONOS_APP)],
  });
  TestBed.overrideComponent(EscanerComponent, {
    remove: { imports: [NsBarcodeScannerComponent] },
    add: { imports: [CamaraSimuladaComponent] },
  });
});
afterEach(() => TestBed.inject(HttpTestingController).verify());

it('con permiso denegado conserva solo el formulario manual y valida el código', async () => {
  const f = TestBed.createComponent(EscanerComponent);
  f.detectChanges();
  f.debugElement.query(By.directive(CamaraSimuladaComponent)).componentInstance.error.emit('permiso-denegado');
  f.detectChanges();
  expect(f.nativeElement.textContent).toContain('No tenemos permiso');
  expect(f.nativeElement.querySelector('ns-barcode-scanner')).toBeNull();
  const input: HTMLInputElement = f.nativeElement.querySelector('app-codigo-manual input');
  input.value = '123';
  input.dispatchEvent(new Event('input'));
  f.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
  TestBed.inject(HttpTestingController).expectNone((r) => r.url.startsWith('/api/v1/productos'));
  input.value = '0012345678905';
  input.dispatchEvent(new Event('input'));
  f.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
  TestBed.inject(HttpTestingController)
    .expectOne('/api/v1/productos/0012345678905')
    .flush({}, { status: 404, statusText: 'Not Found' });
  await f.whenStable();
  f.detectChanges();
  expect(f.nativeElement.textContent).toContain('No encontramos este producto');
  expect(f.nativeElement.textContent).toContain('Escanear otro');
  expect(f.nativeElement.querySelector('a[href="/productos"]')).not.toBeNull();
  expect(f.nativeElement.textContent).toContain('Crear alimento');
});

it('anuncia la búsqueda y el proveedor no disponible sin mantener la cámara abierta', async () => {
  const f = TestBed.createComponent(EscanerComponent);
  f.detectChanges();
  f.debugElement.query(By.directive(CamaraSimuladaComponent)).componentInstance.detectado.emit('12345678');
  f.detectChanges();
  expect(f.nativeElement.textContent).toContain('Buscando producto…');
  expect(f.nativeElement.querySelector('ns-barcode-scanner')).toBeNull();
  TestBed.inject(HttpTestingController)
    .expectOne('/api/v1/productos/12345678')
    .flush(
      { codigo: 'PROVEEDOR_NO_DISPONIBLE', detail: 'Prueba más tarde', errors: [] },
      { status: 503, statusText: 'Unavailable' },
    );
  await f.whenStable();
  f.detectChanges();
  expect(f.nativeElement.textContent).toContain('Productos comerciales no disponibles');
});

it.each([true, false])('muestra la ficha compacta con nutrición completa = %s', async (completa) => {
  const f = TestBed.createComponent(EscanerComponent);
  f.detectChanges();
  f.debugElement.query(By.directive(CamaraSimuladaComponent)).componentInstance.detectado.emit('12345678');
  TestBed.inject(HttpTestingController)
    .expectOne('/api/v1/productos/12345678')
    .flush({
      id: 'yogur',
      codigoBarras: '12345678',
      nombre: 'Yogur natural',
      marca: null,
      imagenUrl: null,
      unidadBase: 'G',
      por100: {
        kcal: 60,
        proteinas: 4,
        carbohidratos: 5,
        grasas: 3,
        azucares: null,
        saturadas: null,
        fibra: null,
        sal: null,
      },
      racion: null,
      ingredientesTexto: null,
      alergenosContiene: [],
      alergenosTrazas: [],
      alergenosRevisados: false,
      nutricionCompleta: completa,
      fuente: {
        proveedor: 'Open Food Facts',
        url: 'https://world.openfoodfacts.org',
        licencia: 'ODbL',
        atribucion: 'Datos de la comunidad',
      },
    });
  await f.whenStable();
  f.detectChanges();
  expect(f.nativeElement.querySelector('app-ficha-producto.compacta')).not.toBeNull();
  expect(f.nativeElement.textContent).toContain('Yogur natural');
  expect(!!f.nativeElement.querySelector('app-anadir-a-comida')).toBe(completa);
  if (!completa) expect(f.nativeElement.textContent).toContain('Crear alimento propio');
  else expect(f.nativeElement.querySelector('app-anadir-a-comida button').textContent).toContain('Añadir a ');
});

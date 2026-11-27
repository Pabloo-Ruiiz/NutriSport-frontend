import { InteractivityChecker } from '@angular/cdk/a11y';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideLucideIcons } from '@lucide/angular';

import { errorInterceptor } from '@core/interceptors/error.interceptor';
import { LayoutService } from '@core/layout/layout.service';
import type { AlimentoResponse, AlimentoResumenResponse, ProductoResponse, RegistroComidaResponse } from '@core/models';
import { hoyLocal, sumarDias } from '@core/util/fechas';
import { ICONOS_APP } from '@shared/design/iconos';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import { RegistroComidaComponent } from './registro-comida.component';

@Component({ template: '<p>Destino</p>' })
class Destino {}

const ARROZ: AlimentoResponse = {
  id: 'arroz',
  nombre: 'Arroz blanco cocido',
  marca: null,
  categoriaId: null,
  categoriaNombre: null,
  preparacion: 'COCIDO',
  kcal100: 130,
  proteinas100: 2.7,
  carbohidratos100: 28,
  grasas100: 0.3,
  azucares100: null,
  saturadas100: null,
  fibra100: null,
  sal100: null,
  unidadBase: 'G',
  porciones: [{ nombre: 'plato', gramos: 250 }],
  alergenosContiene: [],
  alergenosTrazas: [],
  alergenosRevisados: true,
  contieneLactosa: false,
  aptoVegano: true,
  aptoVegetariano: true,
  aptoPescetariano: true,
  fuente: 'BEDCA',
  referenciaExterna: null,
  visibilidad: 'PUBLICO',
  validado: true,
  activo: true,
  propio: false,
} as AlimentoResponse;

const RESUMEN: AlimentoResumenResponse = {
  id: 'arroz',
  nombre: 'Arroz blanco cocido',
  marca: null,
  kcal100: 130,
  proteinas100: 2.7,
  carbohidratos100: 28,
  grasas100: 0.3,
  fuente: 'BEDCA',
};

function respuesta(cambios: Partial<RegistroComidaResponse> = {}): RegistroComidaResponse {
  return {
    id: 'c-1',
    fecha: hoyLocal(),
    hora: '14:00:00',
    tipoComida: 'COMIDA',
    origen: 'MANUAL',
    notas: null,
    alimentos: [
      {
        id: 'l-1',
        alimentoId: 'arroz',
        nombre: 'Arroz',
        cantidad: 100,
        unidad: 'g',
        gramos: 100,
        kcal: 130,
        proteina: 2.7,
        carbohidratos: 28,
        grasa: 0.3,
        origenIa: false,
        confianzaIa: null,
      },
    ],
    totales: { kcal: 131, proteina: 2.7, carbohidratos: 28, grasa: 0.3 },
    avisos: [],
    ...cambios,
  };
}

class InteractivityCheckerJsdom {
  isDisabled = (e: HTMLElement) => e.hasAttribute('disabled');
  isVisible = () => true;
  isFocusable = (e: HTMLElement) => e.matches('button, input, select, textarea, a[href], [tabindex]');
  isTabbable = (e: HTMLElement) => this.isFocusable(e) && e.tabIndex >= 0;
}

const esMovil = signal(false);
let harness: RouterTestingHarness;
let http: HttpTestingController;

beforeEach(async () => {
  esMovil.set(false);
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
      provideRouter(
        [
          { path: 'comidas/nueva', component: RegistroComidaComponent },
          { path: 'comidas/:id/editar', component: RegistroComidaComponent },
          { path: '**', component: Destino },
        ],
        withComponentInputBinding(),
      ),
      provideLucideIcons(...ICONOS_APP),
      { provide: LayoutService, useValue: { esMovil, esTablet: signal(false) } },
      { provide: InteractivityChecker, useClass: InteractivityCheckerJsdom },
    ],
  });
  http = TestBed.inject(HttpTestingController);
  harness = await RouterTestingHarness.create();
});

afterEach(() => {
  http.verify();
  vi.useRealTimers();
  document.querySelector('.cdk-overlay-container')?.replaceChildren();
});

const raiz = () => harness.fixture.nativeElement as HTMLElement;
const url = () => TestBed.inject(Router).url;
const esperar = async () => {
  await harness.fixture.whenStable();
  await new Promise((resolver) => setTimeout(resolver));
  await harness.fixture.whenStable();
};
const boton = (texto: string, en: ParentNode = raiz()) =>
  [...en.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.includes(texto))!;
const componente = () => harness.routeDebugElement!.componentInstance as RegistroComidaComponent;

/** Busca "arroz" en el buscador, elige el resultado y responde el detalle. */
async function anadirArroz(): Promise<void> {
  vi.useFakeTimers();
  const input = raiz().querySelector<HTMLInputElement>('app-buscador-alimentos input[type=search]')!;
  input.value = 'arroz';
  input.dispatchEvent(new Event('input'));
  vi.advanceTimersByTime(250);
  http
    .expectOne((r) => r.url === '/api/v1/alimentos' && r.params.get('q') === 'arroz')
    .flush({ content: [RESUMEN], page: 0, size: 20, totalElements: 1, totalPages: 1 });
  vi.useRealTimers();
  await esperar();
  raiz().querySelector<HTMLButtonElement>('.ns-buscador__opcion')!.click();
  http.expectOne('/api/v1/alimentos/arroz').flush(ARROZ);
  await esperar();
}

describe('RegistroComidaComponent', () => {
  it('aplica tipoComida y fecha de la URL y empieza vacía', async () => {
    const ayer = sumarDias(hoyLocal(), -1);
    await harness.navigateByUrl(`/comidas/nueva?tipoComida=CENA&fecha=${ayer}`);
    await esperar(); // ngModel escribe el valor en una microtarea
    expect(raiz().querySelector<HTMLInputElement>('input[type=date]')!.value).toBe(ayer);
    expect(raiz().querySelector<HTMLSelectElement>('ns-select select')!.selectedOptions[0].textContent?.trim()).toBe(
      'Cena',
    );
    expect(raiz().textContent).toContain('Busca un alimento para empezar');
    expect(raiz().querySelector('a[href^="/comidas/foto"]')?.getAttribute('href')).toContain('tipoComida=CENA');
    expect(componente().tieneCambiosSinGuardar()).toBe(false);
  });

  it('ignora una fecha posterior a mañana o un tipo desconocido', async () => {
    await harness.navigateByUrl(`/comidas/nueva?tipoComida=BRUNCH&fecha=${sumarDias(hoyLocal(), 2)}`);
    await esperar();
    expect(raiz().querySelector<HTMLInputElement>('input[type=date]')!.value).toBe(hoyLocal());
  });

  it('no guarda una comida vacía', async () => {
    await harness.navigateByUrl('/comidas/nueva');
    boton('Guardar comida').click();
    await esperar();
    http.expectNone('/api/v1/comidas');
    expect(raiz().textContent).toContain('Añade al menos un alimento.');
  });

  it('añade un alimento con su detalle y guarda: toast con "Deshacer" y vuelta a /inicio', async () => {
    await harness.navigateByUrl('/comidas/nueva?tipoComida=COMIDA');
    await anadirArroz();
    expect(raiz().querySelector('app-linea-alimento')?.textContent).toContain('Arroz blanco cocido');
    expect(raiz().querySelector('app-totales-comida')?.textContent).toContain('Estimación');
    expect(componente().tieneCambiosSinGuardar()).toBe(true);

    boton('Guardar comida').click();
    const peticion = http.expectOne({ method: 'POST', url: '/api/v1/comidas' });
    expect(peticion.request.body).toMatchObject({
      tipoComida: 'COMIDA',
      alimentos: [{ alimentoId: 'arroz', cantidad: 100, unidad: 'g' }],
    });
    peticion.flush(respuesta(), { status: 201, statusText: 'Created' });
    await esperar();

    const toast = TestBed.inject(NsToastService).visibles()[0];
    expect(toast.titulo).toBe('Comida guardada · 131 kcal');
    expect(toast.accion?.texto).toBe('Deshacer');
    expect(url()).toBe('/inicio');

    toast.accion!.ejecutar();
    http.expectOne({ method: 'DELETE', url: '/api/v1/comidas/c-1' }).flush(null, { status: 204, statusText: '' });
  });

  it('vuelve a `volver` si es una ruta interna', async () => {
    await harness.navigateByUrl('/comidas/nueva?volver=%2Fcomidas');
    await anadirArroz();
    boton('Guardar comida').click();
    http.expectOne('/api/v1/comidas').flush(respuesta(), { status: 201, statusText: 'Created' });
    await esperar();
    expect(url()).toBe('/comidas');
  });

  it('con avisos los muestra antes de salir', async () => {
    await harness.navigateByUrl('/comidas/nueva');
    await anadirArroz();
    boton('Guardar comida').click();
    http.expectOne('/api/v1/comidas').flush(respuesta({ avisos: ['Contiene gluten (alergia estricta).'] }), {
      status: 201,
      statusText: 'Created',
    });
    await esperar();
    expect(url()).toBe('/comidas/nueva');
    expect(raiz().querySelector('ns-alert.ns-alert--warning')?.textContent).toContain('Contiene gluten');
    expect(componente().tieneCambiosSinGuardar()).toBe(false);

    boton('Continuar').click();
    await esperar();
    expect(url()).toBe('/inicio');
  });

  it('un 400 en alimentos[0].cantidad marca esa línea', async () => {
    await harness.navigateByUrl('/comidas/nueva');
    await anadirArroz();
    boton('Guardar comida').click();
    http.expectOne('/api/v1/comidas').flush(
      {
        status: 400,
        codigo: 'VALIDACION',
        title: 'Datos no válidos',
        detail: 'Los datos enviados no son válidos',
        errors: [{ campo: 'alimentos[0].cantidad', mensaje: 'Como mucho 5000' }],
      },
      { status: 400, statusText: 'Bad Request' },
    );
    await esperar();
    const linea = raiz().querySelector('app-linea-alimento')!;
    expect(linea.querySelector('.ns-linea--error')).not.toBeNull();
    expect(linea.textContent).toContain('Como mucho 5000');
    expect(raiz().textContent).toContain('Revisa los alimentos marcados.');
  });

  it('edita una comida: la carga, guarda con PUT y no ofrece "Deshacer"', async () => {
    await harness.navigateByUrl('/comidas/c-1/editar');
    http.expectOne({ method: 'GET', url: '/api/v1/comidas/c-1' }).flush(respuesta());
    await esperar();
    http.expectOne('/api/v1/alimentos/arroz').flush(ARROZ);
    await esperar();

    expect(raiz().textContent).toContain('Editar comida');
    expect(raiz().querySelector('app-totales-comida')?.textContent).toContain('Calculado');
    expect(componente().tieneCambiosSinGuardar()).toBe(false);

    boton('Guardar comida').click();
    const peticion = http.expectOne({ method: 'PUT', url: '/api/v1/comidas/c-1' });
    peticion.flush(respuesta());
    await esperar();
    expect(TestBed.inject(NsToastService).visibles()[0].accion).toBeUndefined();
  });

  it('"Copiar comida anterior" carga los alimentos de la comida elegida', async () => {
    await harness.navigateByUrl('/comidas/nueva');
    boton('Copiar comida anterior').click();
    await esperar();
    const historial = http.expectOne((r) => r.url === '/api/v1/comidas');
    expect(historial.request.params.get('hasta')).toBe(hoyLocal());
    expect(historial.request.params.get('desde')).toBe(sumarDias(hoyLocal(), -6));
    historial.flush([
      {
        fecha: hoyLocal(),
        comidas: [respuesta({ alimentos: [{ ...respuesta().alimentos[0], cantidad: 1, unidad: 'plato' }] })],
        totales: respuesta().totales,
      },
    ]);
    await esperar();

    (document.querySelector('.ns-copiar__opcion') as HTMLButtonElement).click();
    await esperar();
    http.expectOne('/api/v1/alimentos/arroz').flush(ARROZ);
    await esperar();
    expect(raiz().querySelector('app-linea-alimento')?.textContent).toContain('= 250 g');
  });

  describe('en móvil', () => {
    beforeEach(() => esMovil.set(true));

    it('muestra el resumen fijo y abre la comida en un bottom sheet', async () => {
      await harness.navigateByUrl('/comidas/nueva');
      expect(raiz().querySelector('.ns-registro__comida')).toBeNull();
      expect(raiz().querySelector('.ns-registro__ver')?.textContent).toContain('Busca un alimento para empezar');

      await anadirArroz();
      const ver = raiz().querySelector<HTMLButtonElement>('.ns-registro__ver')!;
      expect(ver.textContent).toContain('1 alimento · 130 kcal');
      expect(ver.textContent).toContain('Ver comida');

      ver.click();
      await esperar();
      const sheet = document.querySelector('app-comida-sheet') as HTMLElement;
      expect(sheet.querySelector('app-linea-alimento')?.textContent).toContain('Arroz blanco cocido');

      boton('Guardar comida', sheet).click();
      await esperar();
      http
        .expectOne({ method: 'POST', url: '/api/v1/comidas' })
        .flush(respuesta(), { status: 201, statusText: 'Created' });
      await esperar();
      expect(url()).toBe('/inicio');
    });
  });
});

describe('pestaña Productos del registro', () => {
  it('consulta bajo demanda y añade al borrador sin registrar otra comida', async () => {
    await harness.navigateByUrl('/comidas/nueva');
    await anadirArroz();
    boton('Productos').click();
    await esperar();
    vi.useFakeTimers();
    const input = raiz().querySelector<HTMLInputElement>('app-buscador-alimentos input[type=search]')!;
    input.value = 'yogur';
    input.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(250);
    http
      .expectOne((r) => r.url === '/api/v1/alimentos' && r.params.get('q') === 'yogur')
      .flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
    http.expectNone((r) => r.url === '/api/v1/productos');
    vi.useRealTimers();
    await esperar();
    const fuente = {
      proveedor: 'Open Food Facts',
      licencia: 'ODbL',
      url: 'https://world.openfoodfacts.org',
      atribucion: 'Datos de la comunidad',
    };
    boton('Buscar en productos comerciales').click();
    http.expectOne('/api/v1/productos?q=yogur&page=0').flush([
      {
        id: null,
        codigoBarras: '12345678',
        nombre: 'Yogur',
        marca: null,
        imagenUrl: null,
        kcal100: 60,
        nutricionCompleta: true,
        fuente,
      },
    ]);
    await esperar();
    raiz().querySelector<HTMLButtonElement>('app-producto-item button')!.click();
    http.expectOne('/api/v1/productos/12345678').flush({
      id: null,
      codigoBarras: '12345678',
      nombre: 'Yogur',
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
      nutricionCompleta: true,
      fuente,
    } satisfies ProductoResponse);
    await esperar();
    expect(raiz().querySelectorAll('app-linea-alimento')).toHaveLength(2);
    http.expectNone('/api/v1/comidas');
    boton('Guardar comida').click();
    const peticion = http.expectOne('/api/v1/comidas');
    expect(peticion.request.body.alimentos).toEqual([
      { alimentoId: 'arroz', cantidad: 100, unidad: 'g' },
      { codigoBarras: '12345678', cantidad: 100, unidad: 'g' },
    ]);
    peticion.flush(respuesta());
    await esperar();
  });
});

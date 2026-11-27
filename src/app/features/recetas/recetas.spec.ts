import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideLucideIcons } from '@lucide/angular';

import { errorInterceptor } from '@core/interceptors/error.interceptor';
import type { BusquedaRecetasResponse, CategoriaResponse, RecetaResumenResponse } from '@core/models';
import { ICONOS_APP } from '@shared/design/iconos';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import { RecetasComponent } from './recetas.component';
import {
  claveReceta,
  contarFiltrosActivos,
  FILTROS_AVANZADOS_VACIOS,
  leerFranja,
  leerNumero,
  leerOrigen,
  leerPagina,
  leerTexto,
  LIMITES_KCAL,
} from './recetas-url';

const URL_RECETAS = '/api/v1/recetas';

const receta = (id: string | null, cambios: Partial<RecetaResumenResponse> = {}): RecetaResumenResponse => ({
  id,
  referenciaExterna: null,
  origen: 'PROPIA',
  nombre: `Receta ${id}`,
  categoria: 'Pollo',
  area: null,
  imagenUrl: null,
  nutricionRacion: { kcal: 500, proteinas: 40, carbohidratos: 50, grasas: 15 },
  estadoNutricional: 'COMPLETO',
  alergenosVerificados: true,
  compatible: true,
  favorita: false,
  fuente: null,
  ...cambios,
});

const externa = (idMeal: string) =>
  receta(null, {
    referenciaExterna: idMeal,
    origen: 'THEMEALDB',
    nombre: `Meal ${idMeal}`,
    nutricionRacion: null,
    estadoNutricional: 'PENDIENTE',
  });

const busqueda = (
  content: RecetaResumenResponse[],
  themealdb: RecetaResumenResponse[] = [],
  themealdbDisponible = true,
): BusquedaRecetasResponse => ({
  catalogo: { content, page: 0, size: 12, totalElements: content.length, totalPages: 1 },
  themealdb,
  themealdbDisponible,
});

const CATEGORIAS: CategoriaResponse[] = [
  { id: 'c1', nombre: 'Pollo', tipo: 'RECETA', padreId: null, seccionCompra: null, codigoExterno: 'Chicken', orden: 1 },
] as CategoriaResponse[];

@Component({ template: '<p>Detalle</p>' })
class DetalleFalso {}

let http: HttpTestingController;
let harness: RouterTestingHarness;
let toastError: ReturnType<typeof vi.spyOn>;

beforeEach(async () => {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
      provideRouter(
        [
          { path: 'recetas', component: RecetasComponent },
          { path: 'recetas/:id', component: DetalleFalso },
        ],
        withComponentInputBinding(),
      ),
      provideLucideIcons(...ICONOS_APP),
    ],
  });
  http = TestBed.inject(HttpTestingController);
  toastError = vi.spyOn(TestBed.inject(NsToastService), 'error');
  harness = await RouterTestingHarness.create();
});

afterEach(() => http.verify());

const raiz = () => harness.fixture.nativeElement as HTMLElement;
const url = () => TestBed.inject(Router).url;
const esperar = async () => {
  for (let i = 0; i < 2; i++) {
    await harness.fixture.whenStable();
    await new Promise((resolver) => setTimeout(resolver));
  }
  await harness.fixture.whenStable();
};
const buscarReq = (): TestRequest => http.expectOne((r) => r.url === URL_RECETAS && r.method === 'GET');
const tarjetas = () => [...raiz().querySelectorAll<HTMLElement>('ns-recipe-card')];
const corazon = (t: HTMLElement) => t.querySelector<HTMLButtonElement>('.ns-recipe-card__favorita')!;

async function abrirPagina(ruta: string, respuesta: BusquedaRecetasResponse | null = busqueda([receta('a1')])) {
  await harness.navigateByUrl(ruta);
  http.expectOne(`${URL_RECETAS}/categorias`).flush(CATEGORIAS);
  let req: TestRequest | null = null;
  if (respuesta) {
    req = buscarReq();
    req.flush(respuesta);
  }
  await esperar();
  return req;
}

describe('lectura de la URL de recetas', () => {
  it('ignora valores no válidos', () => {
    expect([leerTexto('  pollo '), leerTexto('   '), leerTexto('x'.repeat(80))?.length]).toEqual(['pollo', null, 60]);
    expect([leerOrigen('propia'), leerOrigen('PROPIA')]).toEqual(['propia', 'todas']);
    expect([leerFranja('CENA'), leerFranja('cena')]).toEqual(['CENA', null]);
    expect([leerNumero('700', LIMITES_KCAL), leerNumero('10', LIMITES_KCAL), leerNumero('abc', LIMITES_KCAL)]).toEqual([
      700,
      null,
      null,
    ]);
    expect([leerPagina('2'), leerPagina('-1'), leerPagina('1.5'), leerPagina(undefined)]).toEqual([2, 0, 0, 0]);
    expect(contarFiltrosActivos({ ...FILTROS_AVANZADOS_VACIOS, origen: 'propia', maxKcal: 700 })).toBe(2);
  });

  it('la clave de TheMealDB no cambia al importarla', () => {
    const r = externa('52795');
    expect(claveReceta(r)).toBe(claveReceta({ ...r, id: 'nuevo' }));
  });
});

describe('RecetasComponent', () => {
  it('lleva los filtros de la URL a la búsqueda', async () => {
    await harness.navigateByUrl('/recetas?q=curry&categoria=Pollo&origen=themealdb&franja=CENA&maxKcal=700&page=1');
    http.expectOne(`${URL_RECETAS}/categorias`).flush(CATEGORIAS);
    const req = buscarReq();
    const p = req.request.params;
    expect([p.get('q'), p.get('categoria'), p.get('origen'), p.get('franja'), p.get('maxKcal')]).toEqual([
      'curry',
      'Pollo',
      'themealdb',
      'CENA',
      '700',
    ]);
    expect([p.get('page'), p.get('size'), p.has('minProteina')]).toEqual(['1', '12', false]);
    req.flush(busqueda([]));
    await esperar();
  });

  it('muestra el catálogo, el bloque de TheMealDB, el aviso si no está disponible y la atribución', async () => {
    await abrirPagina('/recetas', busqueda([receta('a1')], [externa('52795')], false));
    expect(tarjetas()).toHaveLength(2);
    expect(raiz().textContent).toContain('De TheMealDB');
    expect(raiz().textContent).toContain('TheMealDB no está disponible ahora: mostramos solo nuestras recetas.');
    expect(raiz().textContent).toContain('Recetas e imágenes de');
  });

  it('el buscador actualiza la URL tras 400 ms', async () => {
    await abrirPagina('/recetas');
    const input = raiz().querySelector<HTMLInputElement>('#buscar-recetas')!;
    expect(input.maxLength).toBe(60);
    input.value = 'pollo';
    input.dispatchEvent(new Event('input'));
    await new Promise((r) => setTimeout(r, 450));
    await esperar();
    expect(url()).toBe('/recetas?q=pollo');
    buscarReq().flush(busqueda([]));
    await esperar();
  });

  it('la categoría elegida pasa a la URL y vuelve a la primera página', async () => {
    await abrirPagina('/recetas?page=2');
    const chip = [...raiz().querySelectorAll<HTMLButtonElement>('.ns-chip')].find(
      (b) => b.textContent?.trim() === 'Pollo',
    )!;
    chip.click();
    await esperar();
    expect(url()).toBe('/recetas?categoria=Pollo');
    buscarReq().flush(busqueda([]));
    await esperar();
  });

  it('favorita optimista: cambia al momento y se revierte con un toast si falla', async () => {
    await abrirPagina('/recetas');
    corazon(tarjetas()[0]).click();
    await harness.fixture.whenStable();
    expect(corazon(tarjetas()[0]).getAttribute('aria-pressed')).toBe('true');

    const put = http.expectOne(`${URL_RECETAS}/a1/favorita`);
    expect(put.request.method).toBe('PUT');
    put.flush(null, { status: 500, statusText: 'Error' });
    await esperar();
    expect(corazon(tarjetas()[0]).getAttribute('aria-pressed')).toBe('false');
    expect(toastError).toHaveBeenCalledWith('No hemos podido guardarla en favoritas', expect.any(String));
  });

  it('abrir una receta de TheMealDB la importa y navega a su detalle; un 503 avisa con un toast', async () => {
    await abrirPagina('/recetas', busqueda([], [externa('52795')]));
    const abrir = () => tarjetas()[0].querySelector<HTMLButtonElement>('.ns-recipe-card__abrir')!.click();

    abrir();
    await harness.fixture.whenStable();
    expect(tarjetas()[0].querySelector('ns-spinner')).not.toBeNull();
    http
      .expectOne(`${URL_RECETAS}/externas/themealdb/52795`)
      .flush({ codigo: 'PROVEEDOR_NO_DISPONIBLE', detalle: 'x' }, { status: 503, statusText: 'Unavailable' });
    await esperar();
    expect(toastError).toHaveBeenCalledWith('TheMealDB no está disponible ahora', expect.any(String));
    expect(tarjetas()[0].querySelector('ns-spinner')).toBeNull();

    abrir();
    http.expectOne(`${URL_RECETAS}/externas/themealdb/52795`).flush({ id: 'r9' });
    await esperar();
    expect(url()).toBe('/recetas/r9');
  });

  it('la pestaña Favoritas pide GET /recetas/favoritas y no busca en el catálogo', async () => {
    await harness.navigateByUrl('/recetas?vista=favoritas');
    http.expectOne(`${URL_RECETAS}/categorias`).flush(CATEGORIAS);
    http.expectOne(`${URL_RECETAS}/favoritas`).flush([receta('f1', { favorita: true })]);
    http.expectNone((r) => r.url === URL_RECETAS);
    await esperar();
    expect(tarjetas()).toHaveLength(1);
    expect(raiz().querySelector('[role="tab"][aria-selected="true"]')?.textContent).toContain('Favoritas · 1');
  });
});

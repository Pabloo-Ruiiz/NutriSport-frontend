import { InteractivityChecker } from '@angular/cdk/a11y';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, getDebugNode, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideLucideIcons } from '@lucide/angular';

import { errorInterceptor } from '@core/interceptors/error.interceptor';
import { LayoutService } from '@core/layout/layout.service';
import type { AlimentoResponse, CategoriaResponse, Pagina } from '@core/models';
import { AlimentoFormComponent } from '@features/alimentos/alimento-form.component';
import { ICONOS_APP } from '@shared/design/iconos';
import { NsConfirmService } from '@shared/ui/overlay/confirm.service';
import { AlimentosAdminComponent } from './alimentos-admin.component';
import { CatalogoAdminComponent } from './catalogo-admin.component';
import { leerBooleano, leerFuente, leerOrdenCatalogo } from './catalogo-admin';

const URL_ALIMENTOS = '/api/v1/admin/alimentos';

const alimento = (id: string, cambios: Partial<AlimentoResponse> = {}): AlimentoResponse => ({
  id,
  nombre: `Alimento ${id}`,
  marca: null,
  categoriaId: 'c1',
  categoriaNombre: 'Cereales',
  preparacion: null,
  kcal100: 370,
  proteinas100: 13,
  carbohidratos100: 60,
  grasas100: 7,
  azucares100: null,
  saturadas100: null,
  fibra100: null,
  sal100: null,
  unidadBase: 'G',
  porciones: [],
  alergenosContiene: ['GLUTEN'],
  alergenosTrazas: [],
  alergenosRevisados: false,
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
  ...cambios,
});

const pagina = (content: AlimentoResponse[]): Pagina<AlimentoResponse> => ({
  content,
  page: 0,
  size: 20,
  totalElements: content.length,
  totalPages: 1,
});

const CATEGORIAS: CategoriaResponse[] = [
  { id: 'c1', nombre: 'Cereales', tipo: 'ALIMENTO', padreId: null, seccionCompra: null, codigoExterno: null, orden: 1 },
];

class InteractivityCheckerJsdom {
  isDisabled = (e: HTMLElement) => e.hasAttribute('disabled');
  isVisible = () => true;
  isFocusable = (e: HTMLElement) => e.matches('button, input, select, a[href], [tabindex]');
  isTabbable = (e: HTMLElement) => this.isFocusable(e) && e.tabIndex >= 0;
}

@Component({ template: '<p>Categorías</p>' })
class CategoriasFalsas {}

let http: HttpTestingController;
let harness: RouterTestingHarness;
let confirmar: ReturnType<typeof vi.spyOn>;

beforeEach(async () => {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
      provideRouter(
        [
          {
            path: 'admin/catalogo',
            component: CatalogoAdminComponent,
            children: [
              { path: '', pathMatch: 'full', redirectTo: 'alimentos' },
              { path: 'alimentos', component: AlimentosAdminComponent },
              { path: 'categorias', component: CategoriasFalsas },
            ],
          },
        ],
        withComponentInputBinding(),
      ),
      provideLucideIcons(...ICONOS_APP),
      { provide: LayoutService, useValue: { esMovil: signal(false) } },
      { provide: InteractivityChecker, useClass: InteractivityCheckerJsdom },
    ],
  });
  http = TestBed.inject(HttpTestingController);
  confirmar = vi.spyOn(TestBed.inject(NsConfirmService), 'confirmar');
  harness = await RouterTestingHarness.create();
});

afterEach(() => {
  http.verify();
  document.querySelector('.cdk-overlay-container')?.replaceChildren();
});

const raiz = () => harness.fixture.nativeElement as HTMLElement;
const url = () => TestBed.inject(Router).url;
const esperar = async () => {
  for (let i = 0; i < 2; i++) {
    await harness.fixture.whenStable();
    await new Promise((resolver) => setTimeout(resolver));
  }
  await harness.fixture.whenStable();
};
const boton = (texto: string, en: ParentNode = document.body) =>
  [...en.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim().startsWith(texto));
const listado = (): TestRequest => http.expectOne((r) => r.url === URL_ALIMENTOS && r.method === 'GET');

async function abrir(
  ruta: string,
  filas = [alimento('a1'), alimento('a2', { alergenosRevisados: true, visibilidad: 'PRIVADO' })],
) {
  await harness.navigateByUrl(ruta);
  const req = listado();
  req.flush(pagina(filas));
  await esperar();
  return req;
}

describe('lectura de la URL del catálogo', () => {
  it('ignora valores no válidos', () => {
    expect([leerFuente('USDA'), leerFuente('X')]).toEqual(['USDA', null]);
    expect([leerBooleano('true'), leerBooleano('false'), leerBooleano('si')]).toEqual([true, false, null]);
    expect([leerOrdenCatalogo('marca,desc'), leerOrdenCatalogo('kcal100,asc')]).toEqual(['marca,desc', null]);
  });
});

describe('CatalogoAdminComponent', () => {
  it('/admin/catalogo lleva a Alimentos y la pestaña Categorías navega a su ruta hija', async () => {
    await abrir('/admin/catalogo');
    expect(url()).toBe('/admin/catalogo/alimentos');
    const pestanas = raiz().querySelectorAll<HTMLButtonElement>('[role="tab"]');
    expect([...pestanas].map((p) => p.textContent?.trim())).toEqual(['Alimentos', 'Categorías']);
    expect(pestanas[0].getAttribute('aria-selected')).toBe('true');

    pestanas[1].click();
    await esperar();
    expect(url()).toBe('/admin/catalogo/categorias');
    expect(raiz().querySelector('[role="tab"][aria-selected="true"]')?.textContent?.trim()).toBe('Categorías');
    expect(raiz().textContent).toContain('Categorías');
  });
});

describe('AlimentosAdminComponent', () => {
  it('pide la página con los filtros de la URL y pinta la tabla', async () => {
    const req = await abrir(
      '/admin/catalogo/alimentos?q=avena&fuente=BEDCA&revisados=false&visibilidad=PRIVADO&activo=true&page=1',
    );
    const p = req.request.params;
    expect([
      p.get('q'),
      p.get('fuente'),
      p.get('revisados'),
      p.get('visibilidad'),
      p.get('activo'),
      p.get('page'),
    ]).toEqual(['avena', 'BEDCA', 'false', 'PRIVADO', 'true', '1']);
    const filas = raiz().querySelectorAll('tbody tr');
    expect(filas.length).toBe(2);
    expect(filas[0].textContent).toContain('Cereales');
    expect(filas[0].textContent).toContain('BEDCA');
    expect(filas[0].textContent).toContain('Sin revisar');
    expect(filas[1].textContent).toContain('Privado');
    expect(boton('Pendientes de revisar', raiz())?.getAttribute('aria-pressed')).toBe('true');
  });

  it('"Pendientes de revisar" alterna revisados=false en la URL', async () => {
    await abrir('/admin/catalogo/alimentos?page=2');
    boton('Pendientes de revisar', raiz())!.click();
    await esperar();
    expect(url()).toBe('/admin/catalogo/alimentos?revisados=false');
    listado().flush(pagina([]));
    await esperar();
    expect(raiz().textContent).toContain('No hay alimentos pendientes de revisar');

    boton('Pendientes de revisar', raiz())!.click();
    await esperar();
    expect(url()).toBe('/admin/catalogo/alimentos');
    listado().flush(pagina([]));
    await esperar();
  });

  it('"Nuevo alimento" abre el formulario en modo admin con fuente y referencia; al editar no salen', async () => {
    await abrir('/admin/catalogo/alimentos');
    boton('Nuevo alimento', raiz())!.click();
    await esperar();
    http.expectOne('/api/v1/categorias?tipo=ALIMENTO').flush(CATEGORIAS);
    await esperar();
    const drawer = () => document.querySelector('.ns-drawer') as HTMLElement;
    expect(drawer().querySelector('legend')?.textContent).toBe('Origen');

    // Rellena el formulario (el drawer vive en el overlay, fuera del fixture) y crea con la fuente elegida.
    const formulario = getDebugNode(document.querySelector('app-alimento-form')!)!
      .componentInstance as AlimentoFormComponent;
    formulario['form'].patchValue({
      nombre: 'Avena',
      categoriaId: 'c1',
      kcal100: 370,
      proteinas100: 13,
      carbohidratos100: 60,
      grasas100: 7,
    });
    formulario['origen'].patchValue({ fuente: 'USDA', referenciaExterna: '171287' });
    boton('Crear alimento', drawer())!.click();
    await esperar();
    const crear = http.expectOne((r) => r.url === URL_ALIMENTOS && r.method === 'POST');
    expect(crear.request.params.get('fuente')).toBe('USDA');
    expect(crear.request.params.get('referenciaExterna')).toBe('171287');
    expect(crear.request.body.nombre).toBe('Avena');
    crear.flush(alimento('nuevo', { nombre: 'Avena', fuente: 'USDA' }));
    await esperar();
    listado().flush(pagina([alimento('nuevo', { nombre: 'Avena' })]));
    await esperar();
    expect(document.querySelector('app-alimento-form')).toBeNull();

    boton('Editar', raiz())!.click();
    await esperar();
    expect(drawer().textContent).not.toContain('Origen');
    expect(drawer().textContent).toContain('Editar alimento');
  });

  it('revisar alérgenos: chips, lactosa y PUT; la fila queda revisada', async () => {
    await abrir('/admin/catalogo/alimentos');
    boton('Alérgenos', raiz())!.click();
    await esperar();
    const dialogo = document.querySelector('app-revision-alergenos-dialog') as HTMLElement;
    const grupos = dialogo.querySelectorAll('ns-chip-group');
    expect(grupos[0].querySelectorAll('button').length).toBe(14);
    const chip = (grupo: Element, texto: string) =>
      [...grupo.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.includes(texto))!;
    // Gluten ya está en "Contiene": no se ofrece como traza.
    expect(chip(grupos[1], 'Gluten').disabled).toBe(true);
    chip(grupos[1], 'Soja').click();
    dialogo.querySelector<HTMLInputElement>('ns-checkbox input')!.click();
    await esperar();

    boton('Marcar como revisado', dialogo)!.click();
    await esperar();
    const put = http.expectOne(`${URL_ALIMENTOS}/a1/alergenos`);
    expect(put.request.body).toEqual({
      alergenosContiene: ['GLUTEN'],
      alergenosTrazas: ['SOJA'],
      contieneLactosa: true,
    });
    put.flush(alimento('a1', { alergenosRevisados: true, alergenosTrazas: ['SOJA'], contieneLactosa: true }));
    await esperar();
    expect(document.querySelector('app-revision-alergenos-dialog')).toBeNull();
    expect(raiz().querySelector('tbody tr')!.textContent).toContain('Revisados');
  });

  it('eliminar pide confirmación de peligro, hace DELETE y recarga', async () => {
    await abrir('/admin/catalogo/alimentos');
    confirmar.mockResolvedValue(false);
    boton('Eliminar', raiz())!.click();
    await esperar();
    expect(confirmar).toHaveBeenCalledWith(
      expect.objectContaining({ peligro: true, mensaje: expect.stringContaining('se desactiva') }),
    );

    confirmar.mockResolvedValue(true);
    boton('Eliminar', raiz())!.click();
    await esperar();
    http.expectOne((r) => r.url === `${URL_ALIMENTOS}/a1` && r.method === 'DELETE').flush(null);
    await esperar();
    listado().flush(pagina([alimento('a1', { activo: false })]));
    await esperar();
    expect(raiz().querySelector('tbody tr')!.textContent).toContain('Desactivado');
    expect(boton('Eliminar', raiz())!.disabled).toBe(true);
  });
});

describe('ImportarCsvComponent', () => {
  const elegir = async (dialogo: HTMLElement, archivo: File) => {
    const input = dialogo.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, 'files', { value: [archivo], configurable: true });
    input.dispatchEvent(new Event('change'));
    await esperar();
    await new Promise((resolver) => setTimeout(resolver, 20));
    await esperar();
  };

  it('valida el fichero, previsualiza 5 filas, importa en multipart y muestra el resultado', async () => {
    await abrir('/admin/catalogo/alimentos');
    boton('Importar CSV', raiz())!.click();
    await esperar();
    const dialogo = document.querySelector('app-importar-csv') as HTMLElement;

    await elegir(dialogo, new File(['x'], 'datos.xlsx'));
    expect(dialogo.querySelector('[role="alert"]')?.textContent).toContain('CSV');

    const filas = Array.from({ length: 7 }, (_, i) => `Alimento ${i};${100 + i}`).join('\n');
    await elegir(dialogo, new File([`nombre;kcal100\n${filas}\n`], 'bedca.csv', { type: 'text/csv' }));
    const vista = dialogo.querySelector('ns-table')!;
    expect([...vista.querySelectorAll('th')].map((th) => th.textContent?.trim())).toEqual(['nombre', 'kcal100']);
    expect(vista.querySelectorAll('tbody tr').length).toBe(5);

    boton('Importar', dialogo)!.click();
    await esperar();
    const req = http.expectOne((r) => r.url === `${URL_ALIMENTOS}/importar`);
    expect(req.request.params.get('fuente')).toBe('BEDCA');
    expect(((req.request.body as FormData).get('archivo') as File).name).toBe('bedca.csv');
    req.flush({ creados: 5, actualizados: 1, errores: [{ campo: '4', mensaje: 'kcal100 no es un número' }] });
    await esperar();

    expect(dialogo.querySelectorAll('ns-metric')[0].textContent).toContain('5');
    expect(dialogo.querySelectorAll('ns-metric')[1].textContent).toContain('1');
    const errores = dialogo.querySelector('ns-table tbody tr')!;
    expect(errores.textContent).toContain('4');
    expect(errores.textContent).toContain('kcal100 no es un número');

    // Al cerrar con alimentos creados o actualizados, la lista se recarga.
    boton('Cerrar', dialogo)!.click();
    await esperar();
    listado().flush(pagina([]));
    await esperar();
  });

  it('un 400 del servidor (sin cabecera o columnas) se muestra con su detail', async () => {
    await abrir('/admin/catalogo/alimentos');
    boton('Importar CSV', raiz())!.click();
    await esperar();
    const dialogo = document.querySelector('app-importar-csv') as HTMLElement;
    await elegir(dialogo, new File(['solo;texto\n'], 'mal.csv'));
    boton('Importar', dialogo)!.click();
    await esperar();
    http
      .expectOne((r) => r.url === `${URL_ALIMENTOS}/importar`)
      .flush(
        { codigo: 'VALIDACION', status: 400, detail: 'Falta la columna kcal100.' },
        { status: 400, statusText: 'Bad' },
      );
    await esperar();
    expect(dialogo.querySelector('ns-alert')?.textContent).toContain('Falta la columna kcal100.');
    expect(boton('Importar', dialogo)).toBeTruthy();
  });
});

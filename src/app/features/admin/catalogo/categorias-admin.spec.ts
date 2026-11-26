import { InteractivityChecker } from '@angular/cdk/a11y';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { getDebugNode, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideLucideIcons } from '@lucide/angular';

import { errorInterceptor } from '@core/interceptors/error.interceptor';
import { LayoutService } from '@core/layout/layout.service';
import type { CategoriaResponse } from '@core/models';
import { ICONOS_APP } from '@shared/design/iconos';
import { NsConfirmService } from '@shared/ui/overlay/confirm.service';
import { CategoriaFormComponent } from './categoria-form.component';
import { CategoriasAdminComponent } from './categorias-admin.component';
import { arbolCategorias, conDescendientes } from './categorias';

const cat = (id: string, cambios: Partial<CategoriaResponse> = {}): CategoriaResponse => ({
  id,
  nombre: id,
  tipo: 'ALIMENTO',
  padreId: null,
  seccionCompra: null,
  codigoExterno: null,
  orden: 0,
  ...cambios,
});

const ALIMENTOS: CategoriaResponse[] = [
  cat('Lácteos', { orden: 2, seccionCompra: 'Lácteos y huevos' }),
  cat('Frutas', { orden: 1, seccionCompra: 'Fruta y verdura' }),
  cat('Cítricos', { padreId: 'Frutas', orden: 1 }),
  cat('Naranjas', { padreId: 'Cítricos' }),
];
const RECETAS: CategoriaResponse[] = [cat('Postres', { tipo: 'RECETA', seccionCompra: 'no debe verse' })];

describe('arbolCategorias y conDescendientes', () => {
  it('anida por padreId y ordena cada nivel por orden y nombre', () => {
    const arbol = arbolCategorias(ALIMENTOS);
    expect(arbol.map((n) => n.categoria.id)).toEqual(['Frutas', 'Lácteos']);
    expect(arbol[0].hijos[0].categoria.id).toBe('Cítricos');
    expect(arbol[0].hijos[0].hijos[0]).toMatchObject({ nivel: 2, categoria: { id: 'Naranjas' } });
    // Un padre que no existe → raíz; un ciclo no cuelga.
    expect(arbolCategorias([cat('a', { padreId: 'x' }), cat('b', { padreId: 'c' }), cat('c', { padreId: 'b' })]).length).toBe(1);
  });

  it('conDescendientes incluye la propia y todas sus hijas', () => {
    expect([...conDescendientes(ALIMENTOS, 'Frutas')].sort()).toEqual(['Cítricos', 'Frutas', 'Naranjas']);
  });
});

class InteractivityCheckerJsdom {
  isDisabled = (e: HTMLElement) => e.hasAttribute('disabled');
  isVisible = () => true;
  isFocusable = (e: HTMLElement) => e.matches('button, input, select, a[href], [tabindex]');
  isTabbable = (e: HTMLElement) => this.isFocusable(e) && e.tabIndex >= 0;
}

describe('CategoriasAdminComponent', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let confirmar: ReturnType<typeof vi.spyOn>;
  const raiz = () => harness.fixture.nativeElement as HTMLElement;
  const esperar = async () => {
    for (let i = 0; i < 2; i++) {
      await harness.fixture.whenStable();
      await new Promise((resolver) => setTimeout(resolver));
    }
    await harness.fixture.whenStable();
  };
  const boton = (texto: string, en: ParentNode = document.body) =>
    [...en.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim().startsWith(texto));
  const fila = (nombre: string) =>
    [...raiz().querySelectorAll<HTMLElement>('.ns-cat__fila')].find((f) => f.querySelector('.ns-cat__nombre')?.textContent === nombre)!;
  const listar = (tipo: 'ALIMENTO' | 'RECETA', lista: CategoriaResponse[]) =>
    http.expectOne(`/api/v1/categorias?tipo=${tipo}`).flush(lista);

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([{ path: 'admin/catalogo/categorias', component: CategoriasAdminComponent }], withComponentInputBinding()),
        provideLucideIcons(...ICONOS_APP),
        { provide: LayoutService, useValue: { esMovil: signal(false) } },
        { provide: InteractivityChecker, useClass: InteractivityCheckerJsdom },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    confirmar = vi.spyOn(TestBed.inject(NsConfirmService), 'confirmar');
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/catalogo/categorias');
    listar('ALIMENTO', ALIMENTOS);
    await esperar();
  });

  afterEach(() => {
    http.verify();
    document.querySelector('.cdk-overlay-container')?.replaceChildren();
  });

  it('pinta el árbol con el orden y la sección de la compra; en recetas no hay sección', async () => {
    const nombres = [...raiz().querySelectorAll('.ns-cat__nombre')].map((n) => n.textContent);
    expect(nombres).toEqual(['Frutas', 'Cítricos', 'Naranjas', 'Lácteos']);
    expect(fila('Frutas').textContent).toContain('Orden 1');
    expect(fila('Frutas').textContent).toContain('Fruta y verdura');
    expect(fila('Frutas').textContent).toContain('1 subcategoría');
    expect(fila('Naranjas').style.getPropertyValue('--nivel')).toBe('2');

    raiz().querySelectorAll<HTMLElement>('[role="radio"]')[1].click();
    await esperar();
    expect(TestBed.inject(Router).url).toBe('/admin/catalogo/categorias?tipo=RECETA');
    listar('RECETA', RECETAS);
    await esperar();
    expect(fila('Postres').textContent).not.toContain('no debe verse');
  });

  it('"Subcategoría" abre el formulario con el padre elegido y crea con POST', async () => {
    boton('Subcategoría', fila('Cítricos'))!.click();
    await esperar();
    const drawer = document.querySelector('.ns-drawer') as HTMLElement;
    expect(drawer.textContent).toContain('Nueva subcategoría de «Cítricos»');
    const select = drawer.querySelector<HTMLSelectElement>('ns-select select')!;
    expect(select.selectedOptions[0].textContent?.trim()).toBe('Frutas › Cítricos');

    const formulario = getDebugNode(drawer.querySelector('app-categoria-form')!)!.componentInstance as CategoriaFormComponent;
    formulario['form'].patchValue({ nombre: 'Limones', seccionCompra: ' Fruta ', orden: 3 });
    boton('Crear categoría', drawer)!.click();
    await esperar();
    const crear = http.expectOne('/api/v1/admin/categorias');
    expect(crear.request.body).toEqual({ nombre: 'Limones', tipo: 'ALIMENTO', orden: 3, padreId: 'Cítricos', seccionCompra: 'Fruta' });
    crear.flush(cat('Limones', { padreId: 'Cítricos', orden: 3 }));
    await esperar();
    // La caché se invalidó: vuelve a pedir la lista.
    listar('ALIMENTO', [...ALIMENTOS, cat('Limones', { padreId: 'Cítricos', orden: 3 })]);
    await esperar();
    expect(fila('Limones')).toBeTruthy();
  });

  it('al editar, el padre no ofrece la propia categoría ni sus descendientes; el orden va de 0 a 999', async () => {
    boton('Editar', fila('Frutas'))!.click();
    await esperar();
    const drawer = document.querySelector('.ns-drawer') as HTMLElement;
    const opciones = [...drawer.querySelectorAll<HTMLOptionElement>('ns-select option')].map((o) => o.textContent?.trim());
    expect(opciones).toEqual(['Ninguna (categoría principal)', 'Lácteos']);

    const formulario = getDebugNode(drawer.querySelector('app-categoria-form')!)!.componentInstance as CategoriaFormComponent;
    formulario['form'].patchValue({ orden: 1000 });
    boton('Guardar cambios', drawer)!.click();
    await esperar();
    http.expectNone('/api/v1/admin/categorias/Frutas');
    formulario['form'].patchValue({ orden: 5 });
    boton('Guardar cambios', drawer)!.click();
    await esperar();
    const editar = http.expectOne('/api/v1/admin/categorias/Frutas');
    expect(editar.request.method).toBe('PUT');
    editar.flush(
      { codigo: 'CONFLICTO', status: 409, detail: 'Ya existe una categoría de alimentos con ese nombre.' },
      { status: 409, statusText: 'Conflict' },
    );
    await esperar();
    expect(drawer.querySelector('ns-alert')?.textContent).toContain('Ya existe una categoría de alimentos con ese nombre.');
  });

  it('eliminar pide confirmación y un 409 se muestra en un aviso', async () => {
    confirmar.mockResolvedValue(true);
    boton('Eliminar', fila('Lácteos'))!.click();
    await esperar();
    expect(confirmar).toHaveBeenCalledWith(expect.objectContaining({ peligro: true }));
    http
      .expectOne(`/api/v1/admin/categorias/${encodeURIComponent('Lácteos')}`)
      .flush({ codigo: 'CONFLICTO', status: 409, detail: 'Tiene 12 alimentos.' }, { status: 409, statusText: 'Conflict' });
    await esperar();
    const aviso = raiz().querySelector('ns-alert')!;
    expect(aviso.textContent).toContain('No se puede eliminar «Lácteos»: Tiene 12 alimentos.');
  });
});

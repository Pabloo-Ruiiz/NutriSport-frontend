import { InteractivityChecker } from '@angular/cdk/a11y';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideLucideIcons } from '@lucide/angular';

import { errorInterceptor } from '@core/interceptors/error.interceptor';
import { LayoutService } from '@core/layout/layout.service';
import type { AlimentoResponse, AlimentoResumenResponse, CategoriaResponse } from '@core/models';
import { ICONOS_APP } from '@shared/design/iconos';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import { NsConfirmService } from '@shared/ui/overlay/confirm.service';
import {
  aAlimentoRequest,
  avisosAlimento,
  categoriasJerarquicas,
  crearFormularioAlimento,
  crearPorcion,
} from './alimento-form';
import { MisAlimentosComponent } from './mis-alimentos.component';

const CATEGORIAS: CategoriaResponse[] = [
  {
    id: 'c-fru',
    nombre: 'Frutas',
    tipo: 'ALIMENTO',
    padreId: null,
    seccionCompra: null,
    codigoExterno: null,
    orden: 2,
  },
  {
    id: 'c-cit',
    nombre: 'Cítricos',
    tipo: 'ALIMENTO',
    padreId: 'c-fru',
    seccionCompra: null,
    codigoExterno: null,
    orden: 1,
  },
  {
    id: 'c-cer',
    nombre: 'Cereales',
    tipo: 'ALIMENTO',
    padreId: null,
    seccionCompra: null,
    codigoExterno: null,
    orden: 1,
  },
  {
    id: 'c-hue',
    nombre: 'Huérfana',
    tipo: 'ALIMENTO',
    padreId: 'no-existe',
    seccionCompra: null,
    codigoExterno: null,
    orden: 9,
  },
];

const resumen = (
  id: string,
  nombre: string,
  fuente: AlimentoResumenResponse['fuente'] = 'USUARIO',
): AlimentoResumenResponse => ({
  id,
  nombre,
  marca: null,
  kcal100: 200,
  proteinas100: 5,
  carbohidratos100: 30,
  grasas100: 6,
  fuente,
});

const DETALLE: AlimentoResponse = {
  ...resumen('p-1', 'Tortitas de mamá'),
  categoriaId: 'c-cer',
  categoriaNombre: 'Cereales',
  preparacion: null,
  azucares100: null,
  saturadas100: null,
  fibra100: null,
  sal100: null,
  unidadBase: 'G',
  porciones: [{ nombre: 'unidad', gramos: 40 }],
  alergenosContiene: ['GLUTEN'],
  alergenosTrazas: [],
  alergenosRevisados: false,
  contieneLactosa: true,
  aptoVegano: false,
  aptoVegetariano: true,
  aptoPescetariano: true,
  referenciaExterna: null,
  visibilidad: 'PRIVADO',
  validado: false,
  activo: true,
  propio: true,
} as AlimentoResponse;

describe('alimento-form', () => {
  it('vegano marca vegetariano y pescetariano; quitar una quita las que la implican', () => {
    const { controls } = crearFormularioAlimento();
    controls.aptoVegano.setValue(true);
    expect([controls.aptoVegetariano.value, controls.aptoPescetariano.value]).toEqual([true, true]);

    controls.aptoPescetariano.setValue(false);
    expect([controls.aptoVegano.value, controls.aptoVegetariano.value]).toEqual([false, false]);

    controls.aptoVegetariano.setValue(true);
    expect(controls.aptoPescetariano.value).toBe(true);
    expect(controls.aptoVegano.value).toBe(false);
  });

  it('valida los rangos de §8 y las porciones', () => {
    const form = crearFormularioAlimento();
    form.patchValue({
      nombre: 'Tortitas',
      categoriaId: 'c-cer',
      kcal100: 901,
      proteinas100: 5,
      carbohidratos100: 30,
      grasas100: 6,
    });
    expect(form.controls.kcal100.errors).toEqual({ max: { max: 900, actual: 901 } });
    form.controls.kcal100.setValue(210);
    expect(form.valid).toBe(true);

    form.controls.porciones.push(crearPorcion('', 0));
    expect(form.valid).toBe(false);
    form.controls.porciones.at(0).setValue({ nombre: 'unidad', gramos: 40 });
    expect(form.valid).toBe(true);
  });

  it('aAlimentoRequest envía los booleanos siempre y los opcionales solo con valor', () => {
    const form = crearFormularioAlimento();
    form.patchValue({
      nombre: ' Tortitas ',
      marca: ' ',
      categoriaId: 'c-cer',
      kcal100: 210,
      proteinas100: 5,
      carbohidratos100: 30,
      grasas100: 6,
      sal100: 0,
    });
    expect(aAlimentoRequest(form.getRawValue())).toStrictEqual({
      nombre: 'Tortitas',
      categoriaId: 'c-cer',
      kcal100: 210,
      proteinas100: 5,
      carbohidratos100: 30,
      grasas100: 6,
      unidadBase: 'G',
      contieneLactosa: false,
      aptoVegano: false,
      aptoVegetariano: false,
      aptoPescetariano: false,
      sal100: 0,
    });
  });

  it('avisa (sin bloquear) de azúcares > hidratos, saturadas > grasas y alérgenos repetidos', () => {
    const form = crearFormularioAlimento();
    form.patchValue({ carbohidratos100: 10, azucares100: 12, grasas100: 5, saturadas100: 6 });
    form.controls.alergenosContiene.setValue(['GLUTEN']);
    form.controls.alergenosTrazas.setValue(['GLUTEN']);
    expect(avisosAlimento(form.getRawValue())).toHaveLength(3);
    expect(form.controls.azucares100.valid).toBe(true);
  });

  it('rellena el formulario al editar', () => {
    const form = crearFormularioAlimento(DETALLE);
    expect(form.controls.nombre.value).toBe('Tortitas de mamá');
    expect(form.controls.porciones.length).toBe(1);
    expect(form.controls.contieneLactosa.value).toBe(true);
  });

  it('ordena las categorías por jerarquía con la ruta completa', () => {
    expect(categoriasJerarquicas(CATEGORIAS).map((c) => c.etiqueta)).toEqual([
      'Cereales',
      'Frutas',
      'Frutas › Cítricos',
      'Huérfana',
    ]);
  });
});

class InteractivityCheckerJsdom {
  isDisabled = (e: HTMLElement) => e.hasAttribute('disabled');
  isVisible = () => true;
  isFocusable = (e: HTMLElement) => e.matches('button, input, select, a[href], [tabindex]');
  isTabbable = (e: HTMLElement) => this.isFocusable(e) && e.tabIndex >= 0;
}

describe('MisAlimentosComponent', () => {
  let fixture: ComponentFixture<MisAlimentosComponent>;
  let http: HttpTestingController;
  let confirmar: ReturnType<typeof vi.spyOn>;
  const raiz = () => fixture.nativeElement as HTMLElement;
  const nombres = () =>
    [...raiz().querySelectorAll('.ns-mis__nombre')].map((n) => n.textContent?.replace(/\s+/g, ' ').trim());
  const esperar = async () => {
    await fixture.whenStable();
    await new Promise((resolver) => setTimeout(resolver));
    await fixture.whenStable();
  };
  const boton = (texto: string, en: ParentNode = raiz()) =>
    [...en.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.includes(texto))!;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        provideLucideIcons(...ICONOS_APP),
        { provide: LayoutService, useValue: { esMovil: signal(false) } },
        { provide: InteractivityChecker, useClass: InteractivityCheckerJsdom },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    confirmar = vi.spyOn(TestBed.inject(NsConfirmService), 'confirmar');
    fixture = TestBed.createComponent(MisAlimentosComponent);
    http
      .expectOne('/api/v1/alimentos/recientes')
      .flush([resumen('p-1', 'Tortitas de mamá'), resumen('b-1', 'Avena', 'BEDCA')]);
    http
      .expectOne('/api/v1/alimentos/frecuentes')
      .flush([resumen('p-1', 'Tortitas de mamá'), resumen('p-2', 'Bizcocho')]);
    await esperar();
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
    document.querySelector('.cdk-overlay-container')?.replaceChildren();
  });

  it('sin texto muestra los propios de recientes y frecuentes, sin repetir', () => {
    expect(nombres()).toEqual(['Tortitas de mamá', 'Bizcocho']);
    expect(raiz().textContent).toContain('sin buscar, aquí ves los que has usado últimamente');
  });

  it('al buscar muestra solo los de fuente USUARIO', async () => {
    vi.useFakeTimers();
    const input = raiz().querySelector<HTMLInputElement>('input[type=search]')!;
    input.value = 'tor';
    input.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(250);
    const peticion = http.expectOne((r) => r.url === '/api/v1/alimentos');
    expect(peticion.request.params.get('q')).toBe('tor');
    peticion.flush({
      content: [resumen('p-9', 'Tortilla de patata'), resumen('b-2', 'Tortilla (catálogo)', 'BEDCA')],
      page: 0,
      size: 50,
      totalElements: 2,
      totalPages: 1,
    });
    vi.useRealTimers();
    await esperar();
    expect(nombres()).toEqual(['Tortilla de patata']);
  });

  it('crear abre el drawer y, al guardar, lo añade arriba', async () => {
    boton('Crear alimento').click();
    await esperar();
    http.expectOne('/api/v1/categorias?tipo=ALIMENTO').flush(CATEGORIAS);
    await esperar();
    const drawer = document.querySelector('.ns-drawer') as HTMLElement;
    expect(drawer.querySelector('h2')?.textContent).toContain('Crear alimento');
    expect([...drawer.querySelectorAll('option')].map((o) => o.textContent?.trim())).toContain('Frutas › Cítricos');

    // Formulario incompleto: no se envía.
    drawer.querySelector('form')!.dispatchEvent(new Event('submit'));
    await esperar();
    http.expectNone('/api/v1/alimentos');
    expect(drawer.textContent).toContain('Este campo es obligatorio.');
  });

  it('editar carga el detalle, guarda con PUT y actualiza la lista', async () => {
    boton('Editar', raiz().querySelectorAll('.ns-mis__fila')[0]).click();
    http.expectOne({ method: 'GET', url: '/api/v1/alimentos/p-1' }).flush(DETALLE);
    await esperar();
    http.expectOne('/api/v1/categorias?tipo=ALIMENTO').flush(CATEGORIAS);
    await esperar();

    const drawer = document.querySelector('.ns-drawer') as HTMLElement;
    expect(drawer.querySelector('h2')?.textContent).toContain('Editar alimento');
    const nombre = drawer.querySelector<HTMLInputElement>('input[formcontrolname=nombre]')!;
    expect(nombre.value).toBe('Tortitas de mamá');
    nombre.value = 'Tortitas de la abuela';
    nombre.dispatchEvent(new Event('input'));
    drawer.querySelector('form')!.dispatchEvent(new Event('submit'));

    const peticion = http.expectOne({ method: 'PUT', url: '/api/v1/alimentos/p-1' });
    expect(peticion.request.body).toMatchObject({
      nombre: 'Tortitas de la abuela',
      categoriaId: 'c-cer',
      porciones: [{ nombre: 'unidad', gramos: 40 }],
      alergenosContiene: ['GLUTEN'],
      contieneLactosa: true,
      aptoVegano: false,
      aptoVegetariano: true,
      aptoPescetariano: true,
    });
    peticion.flush({ ...DETALLE, nombre: 'Tortitas de la abuela' });
    await esperar();

    expect(document.querySelector('.ns-drawer')).toBeNull();
    expect(nombres()).toEqual(['Tortitas de la abuela', 'Bizcocho']);
    expect(
      TestBed.inject(NsToastService)
        .visibles()
        .map((t) => t.titulo),
    ).toContain('Alimento guardado');
  });

  it('eliminar pide confirmación con el aviso del historial y lo quita', async () => {
    confirmar.mockResolvedValueOnce(true);
    boton('Eliminar', raiz().querySelectorAll('.ns-mis__fila')[1]).click();
    await esperar();
    expect(confirmar.mock.calls[0][0].mensaje).toBe(
      'Si ya lo has usado en alguna comida, se desactivará y el historial lo conservará.',
    );
    http.expectOne({ method: 'DELETE', url: '/api/v1/alimentos/p-2' }).flush(null, { status: 204, statusText: '' });
    await esperar();
    expect(nombres()).toEqual(['Tortitas de mamá']);
  });
});

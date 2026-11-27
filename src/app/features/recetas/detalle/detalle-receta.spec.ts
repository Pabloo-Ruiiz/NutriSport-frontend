import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideLucideIcons } from '@lucide/angular';

import { errorInterceptor } from '@core/interceptors/error.interceptor';
import type { RecetaResponse, RecetaResumenResponse } from '@core/models';
import { ICONOS_APP } from '@shared/design/iconos';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import { DetalleRecetaComponent } from './detalle-receta.component';
import { etiquetaConversion, leerRaciones, textoGramos } from './ingredientes-receta.component';

const URL = '/api/v1/recetas';

const receta = (cambios: Partial<RecetaResponse> = {}): RecetaResponse => ({
  id: 'r1',
  origen: 'THEMEALDB',
  nombre: 'Chicken Couscous',
  descripcion: null,
  idioma: 'en',
  categoria: 'Pollo',
  area: 'Marroquí',
  imagenUrl: 'https://example.test/c.jpg',
  raciones: 4,
  racionesSupuestas: true,
  tiempoPreparacionMin: 40,
  dificultad: 'MEDIA',
  franjasAptas: [],
  etiquetas: ['Alto en proteína'],
  ingredientes: [
    {
      nombre: 'Aceite de oliva',
      nombreOriginal: 'Olive Oil',
      medidaOriginal: '1 tbsp',
      gramos: 13.5,
      estadoConversion: 'ESTIMADA',
      alimentoId: 'a1',
    },
    {
      nombre: 'Harissa',
      nombreOriginal: 'Harissa Spice',
      medidaOriginal: '2 tblsp',
      gramos: null,
      estadoConversion: 'SIN_DATOS',
      alimentoId: null,
    },
  ],
  instrucciones: [
    { orden: 1, texto: 'Heat the oil.' },
    { orden: 2, texto: 'Add the chicken.' },
  ],
  nutricionRacion: { kcal: 390, proteinas: 22, carbohidratos: 59, grasas: 6.6 },
  estadoNutricional: 'APROXIMADO',
  completitudPct: 97,
  alergenos: ['GLUTEN'],
  alergenosVerificados: false,
  compatible: true,
  favorita: false,
  fuente: null,
  ...cambios,
});

const resumen = (id: string): RecetaResumenResponse => ({
  id,
  referenciaExterna: null,
  origen: 'PROPIA',
  nombre: `Relacionada ${id}`,
  categoria: 'Pollo',
  area: null,
  imagenUrl: null,
  nutricionRacion: null,
  estadoNutricional: 'COMPLETO',
  alergenosVerificados: true,
  compatible: true,
  favorita: false,
  fuente: null,
});

@Component({ template: '<p>Destino</p>' })
class Destino {}

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
          { path: 'recetas/:id', component: DetalleRecetaComponent },
          { path: 'comidas/nueva', component: Destino },
          { path: 'planificador', component: Destino },
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
const boton = (texto: string, en: ParentNode = raiz()) =>
  [...en.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim().startsWith(texto))!;
const detalleReq = (): TestRequest => http.expectOne((r) => r.url === `${URL}/r1` && r.method === 'GET');

async function abrir(ruta = '/recetas/r1', datos = receta(), relacionadas: RecetaResumenResponse[] = []) {
  await harness.navigateByUrl(ruta);
  const req = detalleReq();
  req.flush(datos);
  http.expectOne(`${URL}/r1/relacionadas`).flush(relacionadas);
  await esperar();
  return req;
}

describe('utilidades de ingredientes', () => {
  it('leerRaciones admite enteros 1–20', () => {
    expect(['4', '20', '0', '21', '1.5', 'x', undefined].map(leerRaciones)).toEqual([
      4,
      20,
      null,
      null,
      null,
      null,
      null,
    ]);
  });

  it('textoGramos y etiquetaConversion', () => {
    expect(textoGramos({ gramos: 13.5, estadoConversion: 'ESTIMADA' })).toBe('≈ 13,5');
    expect(textoGramos({ gramos: 200, estadoConversion: 'EXACTA' })).toBe('200');
    expect(textoGramos({ gramos: null, estadoConversion: 'SIN_DATOS' })).toBe('—');
    expect(textoGramos({ gramos: 0, estadoConversion: 'DESPRECIABLE' })).toBe('0');
    expect(etiquetaConversion('SIN_DATOS')).toBe('Sin datos');
  });
});

describe('DetalleRecetaComponent', () => {
  it('pide las raciones de la URL y pinta cabecera, ingredientes, nutrición, pasos y atribución', async () => {
    const req = await abrir('/recetas/r1?raciones=6', receta(), [
      resumen('a'),
      resumen('b'),
      resumen('c'),
      resumen('d'),
    ]);
    expect(req.request.params.get('raciones')).toBe('6');

    const texto = raiz().textContent!;
    expect(raiz().querySelector('h1')?.textContent).toContain('Chicken Couscous');
    for (const t of ['Receta original en inglés', 'TheMealDB', '40 min', 'Media', 'Alto en proteína', 'Supuestas'])
      expect(texto).toContain(t);
    expect(raiz().querySelector('.cabecera__media img')?.getAttribute('alt')).toBe('Chicken Couscous');

    // Ingredientes
    const filas = [...raiz().querySelectorAll('app-ingredientes-receta tbody tr')];
    expect(filas[0].textContent).toContain('≈ 13,5');
    expect(filas[0].textContent).toContain('Olive Oil');
    expect(filas[1].textContent).toContain('Harissa Spice · sin emparejar');
    expect(filas[1].textContent).toContain('Sin datos');

    // Nutrición
    expect(raiz().querySelector('.cifra--kcal')?.textContent).toContain('≈ 390');
    expect(texto).toContain('Aproximado · 97 % de la masa');
    expect(texto).toContain('Alérgenos sin verificar');
    expect(texto).toContain('Valores estimados a partir de los ingredientes, no medidos');

    // Pasos, relacionadas (3) y atribución
    expect(raiz().querySelectorAll('.pasos__lista li')).toHaveLength(2);
    expect(raiz().querySelectorAll('ns-recipe-card')).toHaveLength(3);
    expect(texto).toContain('Receta e imagen:');
  });

  it('tacha un ingrediente con su casilla', async () => {
    await abrir();
    const fila = raiz().querySelector('app-ingredientes-receta tbody tr')!;
    fila.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    await esperar();
    expect(fila.classList).toContain('tachado');
  });

  it('cambiar las raciones recarga GET /recetas/{id}?raciones=', async () => {
    await abrir();
    raiz().querySelector<HTMLButtonElement>('ns-quantity-input button[aria-label^="Sumar"]')!.click();
    await new Promise((r) => setTimeout(r, 350));
    await esperar();
    expect(url()).toBe('/recetas/r1?raciones=5');
    const req = detalleReq();
    expect(req.request.params.get('raciones')).toBe('5');
    req.flush(receta({ raciones: 5 }));
    await esperar();
  });

  it('con el cálculo incompleto no hay totales y las acciones se desactivan con el motivo visible', async () => {
    await abrir('/recetas/r1', receta({ estadoNutricional: 'INCOMPLETO', nutricionRacion: null }));
    expect(raiz().querySelector('.cifras')).toBeNull();
    expect(boton('Registrar como comida').disabled).toBe(true);
    expect(boton('Añadir al plan').disabled).toBe(true);
    expect(raiz().querySelector('#motivo-bloqueo')?.textContent).toContain('el cálculo nutricional está incompleto');
  });

  it('si no es compatible, las acciones se desactivan con el motivo visible', async () => {
    await abrir('/recetas/r1', receta({ compatible: false, estadoNutricional: 'COMPLETO' }));
    expect(boton('Registrar como comida').disabled).toBe(true);
    expect(raiz().querySelector('#motivo-bloqueo')?.textContent).toContain('no es compatible con tus restricciones');
  });

  it('"Añadir al plan" navega a /planificador?receta=id', async () => {
    await abrir('/recetas/r1', receta({ estadoNutricional: 'COMPLETO' }));
    boton('Añadir al plan').click();
    await esperar();
    expect(url()).toBe('/planificador?receta=r1');
  });

  it('"Añadir a la lista" abre el diálogo con las listas activas y añade los ingredientes', async () => {
    await abrir('/recetas/r1?raciones=3');
    boton('Añadir a la lista').click();
    await esperar();
    http
      .expectOne((r) => r.url === '/api/v1/listas-compra' && r.method === 'GET')
      .flush({
        content: [
          {
            id: 'l1',
            nombre: 'Compra semana',
            estado: 'ACTIVA',
            menuId: null,
            fechaDesde: null,
            fechaHasta: null,
            comprados: 0,
            total: 0,
            creadoEn: '2026-11-22T10:00:00+01:00',
          },
        ],
        page: 0,
        size: 50,
        totalElements: 1,
        totalPages: 1,
      });
    await esperar();
    const dialogo = document.querySelector('app-anadir-receta-lista-dialog') as HTMLElement;
    expect(dialogo.textContent).toContain('Compra semana');
    boton('Añadir a la lista', dialogo).click();
    await esperar();
    const req = http.expectOne('/api/v1/listas-compra/l1/productos/desde-receta');
    expect(req.request.body).toEqual({ recetaId: 'r1', raciones: 3 });
    req.flush({
      id: 'l1',
      nombre: 'Compra semana',
      estado: 'ACTIVA',
      menuId: null,
      fechaDesde: null,
      fechaHasta: null,
      comprados: 0,
      total: 4,
      secciones: [],
    });
    await esperar();
    expect(document.querySelector('app-anadir-receta-lista-dialog')).toBeNull();
  });

  it('"Registrar como comida" abre el diálogo de registro', async () => {
    await abrir('/recetas/r1', receta({ estadoNutricional: 'COMPLETO' }));
    boton('Registrar como comida').click();
    await esperar();
    expect(document.querySelector('app-registrar-receta-dialog')?.textContent).toContain('Chicken Couscous');
  });

  it('favorita optimista: se revierte con un toast si falla', async () => {
    await abrir();
    boton('Favorita').click();
    await harness.fixture.whenStable();
    expect(boton('Favorita').getAttribute('aria-pressed')).toBe('true');
    http.expectOne(`${URL}/r1/favorita`).flush(null, { status: 500, statusText: 'Error' });
    await esperar();
    expect(boton('Favorita').getAttribute('aria-pressed')).toBe('false');
    expect(toastError).toHaveBeenCalled();
  });

  it('"Ver cómo se calcula" abre el desglose con GET /recetas/{id}/nutricion', async () => {
    await abrir();
    boton('Ver cómo se calcula').click();
    await esperar();
    const req = http.expectOne((r) => r.url === `${URL}/r1/nutricion`);
    expect(req.request.params.get('raciones')).toBe('4');
    req.flush({
      raciones: 4,
      racionesSupuestas: true,
      porRacion: { kcal: 390, proteina: 22, carbohidratos: 59, grasa: 6.6 },
      estado: 'APROXIMADO',
      completitudPct: 97,
      ingredientes: [
        {
          nombre: 'Aceite de oliva',
          nombreOriginal: 'Olive Oil',
          medidaOriginal: '1 tbsp',
          gramos: 13.5,
          estadoConversion: 'ESTIMADA',
          fuente: 'USDA',
        },
      ],
    });
    await esperar();
    const dialogo = document.querySelector('app-desglose-nutricion')!;
    expect(dialogo.textContent).toContain('USDA');
    expect(dialogo.textContent).toContain('Estimada');
  });

  it('un 404 muestra "No encontramos esta receta"', async () => {
    await harness.navigateByUrl('/recetas/r1');
    detalleReq().flush({ codigo: 'NO_ENCONTRADO', detalle: 'No existe' }, { status: 404, statusText: 'Not Found' });
    http.expectOne(`${URL}/r1/relacionadas`).flush([]);
    await esperar();
    expect(raiz().textContent).toContain('No encontramos esta receta');
  });
});

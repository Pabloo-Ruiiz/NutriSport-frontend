import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideLucideIcons } from '@lucide/angular';
import { firstValueFrom } from 'rxjs';

import type { AlimentoRequest, AlimentoResponse, AlimentoResumenResponse } from '@core/models';
import { AlimentosService } from '@core/services/alimentos.service';
import { ICONOS_APP } from '@shared/design/iconos';
import { NsNutritionFactsComponent } from '@shared/ui/data/nutrition-facts.component';
import { BuscadorAlimentosComponent } from './buscador-alimentos.component';
import { FichaAlimentoComponent } from './ficha-alimento.component';

const AVENA: AlimentoResponse = {
  id: 'a-1',
  nombre: 'Copos de avena',
  marca: null,
  categoriaId: 'c-1',
  categoriaNombre: 'Cereales',
  preparacion: 'CRUDO',
  kcal100: 372,
  proteinas100: 13.5,
  carbohidratos100: 58.7,
  grasas100: 7,
  azucares100: 1.1,
  saturadas100: null,
  fibra100: 10,
  sal100: null,
  unidadBase: 'G',
  porciones: [{ nombre: 'cucharada', gramos: 10 }],
  alergenosContiene: ['GLUTEN'],
  alergenosTrazas: ['FRUTOS_DE_CASCARA'],
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
} as AlimentoResponse;

const resumen = (
  id: string,
  nombre: string,
  fuente: AlimentoResumenResponse['fuente'] = 'BEDCA',
): AlimentoResumenResponse => ({
  id,
  nombre,
  marca: null,
  kcal100: 100,
  proteinas100: 1,
  carbohidratos100: 1,
  grasas100: 1,
  fuente,
});

let http: HttpTestingController;

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), provideLucideIcons(...ICONOS_APP)],
  });
  http = TestBed.inject(HttpTestingController);
});

afterEach(() => {
  http.verify();
  vi.useRealTimers();
});

describe('AlimentosService', () => {
  it('detalle() se pide una vez y se guarda; un error no se guarda', async () => {
    const servicio = TestBed.inject(AlimentosService);
    const a = firstValueFrom(servicio.detalle('a-1'));
    const b = firstValueFrom(servicio.detalle('a-1'));
    http.expectOne({ method: 'GET', url: '/api/v1/alimentos/a-1' }).flush(AVENA);
    expect(await a).toEqual(AVENA);
    expect(await b).toEqual(AVENA);
    await firstValueFrom(servicio.detalle('a-1'));
    http.expectNone('/api/v1/alimentos/a-1');

    const fallo = firstValueFrom(servicio.detalle('x'));
    http.expectOne('/api/v1/alimentos/x').flush(null, { status: 404, statusText: 'Not Found' });
    await expect(fallo).rejects.toMatchObject({ status: 404 });
    servicio.detalle('x').subscribe();
    http.expectOne('/api/v1/alimentos/x').flush(AVENA);
  });

  it('recientes() y frecuentes()', () => {
    const servicio = TestBed.inject(AlimentosService);
    servicio.recientes().subscribe();
    servicio.frecuentes().subscribe();
    http.expectOne({ method: 'GET', url: '/api/v1/alimentos/recientes' }).flush([]);
    http.expectOne({ method: 'GET', url: '/api/v1/alimentos/frecuentes' }).flush([]);
  });

  it('crear() envía solo los campos del contrato y aptitudes coherentes', () => {
    const req = {
      nombre: ' Tortitas caseras ',
      marca: '  ',
      categoriaId: 'c-1',
      kcal100: '210' as unknown as number,
      proteinas100: 8,
      carbohidratos100: 30,
      grasas100: 6,
      azucares100: null,
      fibra100: 0,
      unidadBase: 'G',
      porciones: [{ nombre: ' unidad ', gramos: 40 }],
      alergenosContiene: [],
      contieneLactosa: false,
      aptoVegano: true,
      aptoVegetariano: false,
      aptoPescetariano: false,
      extra: 'x',
    } as unknown as AlimentoRequest;
    TestBed.inject(AlimentosService).crear(req).subscribe();
    const peticion = http.expectOne({ method: 'POST', url: '/api/v1/alimentos' });
    expect(peticion.request.body).toStrictEqual({
      nombre: 'Tortitas caseras',
      categoriaId: 'c-1',
      kcal100: 210,
      proteinas100: 8,
      carbohidratos100: 30,
      grasas100: 6,
      fibra100: 0,
      unidadBase: 'G',
      porciones: [{ nombre: 'unidad', gramos: 40 }],
      contieneLactosa: false,
      aptoVegano: true,
      aptoVegetariano: true,
      aptoPescetariano: true,
    });
    peticion.flush({ ...AVENA, id: 'n-1' });
  });

  it('editar() actualiza la caché y eliminar() la borra', async () => {
    const servicio = TestBed.inject(AlimentosService);
    servicio.editar('a-1', { ...AVENA, categoriaId: 'c-1' } as unknown as AlimentoRequest).subscribe();
    http.expectOne({ method: 'PUT', url: '/api/v1/alimentos/a-1' }).flush({ ...AVENA, nombre: 'Avena fina' });
    expect((await firstValueFrom(servicio.detalle('a-1'))).nombre).toBe('Avena fina');
    http.expectNone('/api/v1/alimentos/a-1');

    servicio.eliminar('a-1').subscribe();
    http.expectOne({ method: 'DELETE', url: '/api/v1/alimentos/a-1' }).flush(null, { status: 204, statusText: '' });
    servicio.detalle('a-1').subscribe();
    http.expectOne({ method: 'GET', url: '/api/v1/alimentos/a-1' }).flush(AVENA);
  });

  it('buscar() recorta q a 60 caracteres', () => {
    TestBed.inject(AlimentosService).buscar('a'.repeat(80)).subscribe();
    expect(http.expectOne((r) => r.url === '/api/v1/alimentos').request.params.get('q')).toHaveLength(60);
  });
});

describe('NsNutritionFactsComponent', () => {
  it('muestra las 8 filas por 100 g y los datos que faltan como "—", nunca 0', async () => {
    const fixture = TestBed.createComponent(NsNutritionFactsComponent);
    fixture.componentRef.setInput('valores', AVENA);
    fixture.componentRef.setInput('racion', { nombre: 'cucharada', gramos: 10 });
    await fixture.whenStable();
    const raiz = fixture.nativeElement as HTMLElement;
    const filas = [...raiz.querySelectorAll('tbody tr')].map((f) => [...f.children].map((c) => c.textContent?.trim()));
    expect(filas.map((f) => f[0])).toEqual([
      'Energía',
      'Proteínas',
      'Hidratos de carbono',
      'de los cuales azúcares',
      'Grasas',
      'de las cuales saturadas',
      'Fibra',
      'Sal',
    ]);
    expect(filas[0][1]).toBe('372 kcal');
    expect(filas[0][2]).toBe('37 kcal');
    expect(filas[5][1]).toBe('—');
    expect(filas[7][2]).toBe('—');
    expect(raiz.querySelector('thead')?.textContent).toContain('por 100 g');
    expect(raiz.textContent).toContain('dato no disponible');
  });
});

describe('FichaAlimentoComponent', () => {
  it('muestra fuente, porciones, alérgenos (con aviso sin revisar) y aptitudes', async () => {
    const fixture = TestBed.createComponent(FichaAlimentoComponent);
    fixture.componentRef.setInput('alimento', AVENA);
    fixture.componentRef.setInput('restringidos', ['GLUTEN']);
    await fixture.whenStable();
    const texto = (fixture.nativeElement as HTMLElement).textContent!.replace(/\s+/g, ' ');
    expect(texto).toContain('Copos de avena');
    expect(texto).toContain('Fuente: BEDCA');
    expect(texto).toContain('1 cucharada');
    expect(texto).toContain('10 g · 37 kcal');
    expect(texto).toContain('ContieneGluten (está en tus restricciones)');
    expect(texto).toContain('Puede contenerFrutos de cáscara');
    expect(texto).toContain('sin revisar por NutriSport');
    expect(texto).toContain('Apto para veganos');
    expect(texto).toContain('Sin lactosa');
  });
});

describe('BuscadorAlimentosComponent (modo lista)', () => {
  let fixture: ComponentFixture<BuscadorAlimentosComponent>;
  let elegidos: AlimentoResumenResponse[];
  const raiz = () => fixture.nativeElement as HTMLElement;
  const pestana = (nombre: string) =>
    [...raiz().querySelectorAll<HTMLButtonElement>('[role=tab]')].find((t) => t.textContent?.trim() === nombre)!;

  beforeEach(async () => {
    fixture = TestBed.createComponent(BuscadorAlimentosComponent);
    elegidos = [];
    fixture.componentInstance.elegido.subscribe((a) => elegidos.push(a));
    await fixture.whenStable();
  });

  it('busca al escribir y emite el alimento elegido', async () => {
    vi.useFakeTimers();
    const input = raiz().querySelector<HTMLInputElement>('input[type=search]')!;
    input.value = 'avena';
    input.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(250);
    http
      .expectOne((r) => r.url === '/api/v1/alimentos' && r.params.get('q') === 'avena')
      .flush({ content: [resumen('a-1', 'Copos de avena')], page: 0, size: 20, totalElements: 1, totalPages: 1 });
    vi.useRealTimers();
    await fixture.whenStable();

    const opcion = raiz().querySelector<HTMLButtonElement>('.ns-buscador__opcion')!;
    expect(opcion.textContent).toContain('100 kcal');
    expect(opcion.querySelector('strong')?.textContent).toBe('avena');
    opcion.click();
    expect(elegidos.map((a) => a.id)).toEqual(['a-1']);
  });

  it('pide los recientes al abrir su pestaña, una sola vez', async () => {
    pestana('Recientes').click();
    await fixture.whenStable();
    http.expectOne('/api/v1/alimentos/recientes').flush([resumen('r-1', 'Plátano')]);
    await fixture.whenStable();
    expect(raiz().textContent).toContain('Plátano');

    pestana('Resultados').click();
    pestana('Recientes').click();
    await fixture.whenStable();
    http.expectNone('/api/v1/alimentos/recientes');
  });

  it('"Mis alimentos" muestra solo los propios de la búsqueda', async () => {
    vi.useFakeTimers();
    pestana('Mis alimentos').click();
    const input = raiz().querySelector<HTMLInputElement>('input[type=search]')!;
    input.value = 'tortitas';
    input.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(250);
    http
      .expectOne((r) => r.url === '/api/v1/alimentos')
      .flush({
        content: [resumen('p-1', 'Tortitas de mamá', 'USUARIO'), resumen('b-1', 'Tortitas de maíz')],
        page: 0,
        size: 20,
        totalElements: 2,
        totalPages: 1,
      });
    vi.useRealTimers();
    await fixture.whenStable();

    const panel = raiz().querySelector('[role=tabpanel]:not([hidden])')!;
    expect([...panel.querySelectorAll('.ns-alimento__nombre')].map((n) => n.textContent?.trim())).toEqual([
      'Tortitas de mamá',
    ]);
    expect(panel.textContent).toContain('Propio');
  });
});

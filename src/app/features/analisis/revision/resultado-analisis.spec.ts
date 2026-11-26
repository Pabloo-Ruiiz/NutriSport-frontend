import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideLucideIcons } from '@lucide/angular';

import { errorInterceptor } from '@core/interceptors/error.interceptor';
import { LayoutService } from '@core/layout/layout.service';
import type {
  AlimentoResumenResponse,
  AnalisisResponse,
  CandidatoAnalisis,
  EstadoAnalisis,
  RegistroComidaResponse,
} from '@core/models';
import { ICONOS_APP } from '@shared/design/iconos';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import { NsConfirmService } from '@shared/ui/overlay/confirm.service';
import { BuscadorAlimentosComponent } from '../../alimentos/buscador-alimentos.component';
import { ResultadoAnalisisComponent } from './resultado-analisis.component';

@Component({ template: '<p>Destino</p>' })
class Destino {}

const candidato = (cambios: Partial<CandidatoAnalisis>): CandidatoAnalisis => ({
  nombreDetectado: 'x',
  preparacion: null,
  gramosEstimados: 100,
  confianza: 0.9,
  nivelConfianza: 'Alta',
  estimado: true,
  coincidencias: [],
  ...cambios,
});

const SALMON = candidato({
  nombreDetectado: 'Salmón',
  preparacion: 'PLANCHA',
  gramosEstimados: 150,
  confianza: 0.94,
  coincidencias: [
    {
      alimentoId: 'salmon',
      nombre: 'Salmón a la plancha',
      similitud: 0.92,
      estimados: { kcal: 300, proteina: 30, carbohidratos: 0, grasa: 19.5 },
      fuente: 'BEDCA',
    },
    {
      alimentoId: 'salmon-ahumado',
      nombre: 'Salmón ahumado',
      similitud: 0.71,
      estimados: { kcal: 270, proteina: 37.5, carbohidratos: 0, grasa: 13.5 },
      fuente: 'BEDCA',
    },
  ],
});
const ARROZ = candidato({
  nombreDetectado: 'Arroz blanco',
  preparacion: 'COCIDO',
  gramosEstimados: 200,
  confianza: 0.42,
  nivelConfianza: 'Baja',
  coincidencias: [
    {
      alimentoId: 'arroz',
      nombre: 'Arroz blanco cocido',
      similitud: 0.88,
      estimados: { kcal: 260, proteina: 5.4, carbohidratos: 56, grasa: 0.6 },
      fuente: 'BEDCA',
    },
  ],
});
const SALSA = candidato({ nombreDetectado: 'Salsa', gramosEstimados: 30, confianza: 0.6, coincidencias: [] });

const analisis = (estado: EstadoAnalisis, cambios: Partial<AnalisisResponse> = {}): AnalisisResponse => ({
  id: 'a-1',
  tipo: 'COMIDA',
  estado,
  tipoComida: 'CENA',
  candidatos: estado === 'COMPLETADO' ? [SALMON, ARROZ] : [],
  totalEstimado: null,
  errorMensaje: null,
  creadoEn: '2026-11-25T21:05:00+01:00',
  completadoEn: null,
  ...cambios,
});

const BROCOLI: AlimentoResumenResponse = {
  id: 'brocoli',
  nombre: 'Brócoli cocido',
  marca: null,
  kcal100: 35,
  proteinas100: 2.4,
  carbohidratos100: 7,
  grasas100: 0.4,
  fuente: 'BEDCA',
};

const URL_ANALISIS = '/api/v1/analisis/a-1';
const esMovil = signal(false);
const confirmar = vi.fn();
let harness: RouterTestingHarness;
let http: HttpTestingController;

beforeEach(async () => {
  esMovil.set(false);
  confirmar.mockReset();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
      provideRouter(
        [
          { path: 'comidas/foto/:id', component: ResultadoAnalisisComponent },
          { path: '**', component: Destino },
        ],
        withComponentInputBinding(),
      ),
      provideLucideIcons(...ICONOS_APP),
      { provide: LayoutService, useValue: { esMovil, esTablet: signal(false) } },
      { provide: NsConfirmService, useValue: { confirmar } },
    ],
  });
  http = TestBed.inject(HttpTestingController);
  harness = await RouterTestingHarness.create();
});

afterEach(() => {
  http.verify();
  vi.restoreAllMocks();
});

const raiz = () => harness.fixture.nativeElement as HTMLElement;
const texto = () => raiz().textContent?.replace(/\s+/g, ' ') ?? '';
const url = () => TestBed.inject(Router).url;
const filas = () => [...raiz().querySelectorAll<HTMLElement>('app-candidato-item')];
const boton = (t: string, dentro: ParentNode = raiz()) =>
  [...dentro.querySelectorAll<HTMLButtonElement>('button, a')].find((b) => b.textContent?.includes(t)) as
    HTMLButtonElement | undefined;
const esperar = async () => {
  for (let i = 0; i < 3; i++) {
    await harness.fixture.whenStable();
    await new Promise((resolver) => setTimeout(resolver));
  }
};

/** Abre la revisión con el análisis indicado; si está COMPLETADO, responde también la foto. */
async function abrir(respuesta: AnalisisResponse = analisis('COMPLETADO'), ruta = '/comidas/foto/a-1'): Promise<void> {
  await harness.navigateByUrl(ruta);
  http.expectOne(URL_ANALISIS).flush(respuesta);
  await esperar();
  if (respuesta.estado === 'COMPLETADO') {
    http.expectOne(`${URL_ANALISIS}/imagen`).flush({ url: 'http://minio/foto.jpg', expiraEn: '…' });
    await esperar();
  }
}

describe('ResultadoAnalisisComponent', () => {
  it('muestra la foto con etiquetas numeradas, las filas, los totales y los avisos', async () => {
    await abrir();

    expect(texto()).toContain('Revisa tu cena');
    expect(texto()).toContain('Hemos detectado 2 alimentos');
    expect(raiz().querySelector<HTMLImageElement>('app-foto-marcadores img')?.src).toBe('http://minio/foto.jpg');
    const marcas = [...raiz().querySelectorAll('.ns-marcadores__marca')];
    expect(marcas.map((m) => m.getAttribute('aria-label'))).toEqual([
      'Ir al alimento 1: Salmón a la plancha',
      'Ir al alimento 2: Arroz blanco cocido',
    ]);

    const [salmon, arroz] = filas();
    expect(salmon.textContent).toContain('Salmón a la plancha');
    expect(salmon.textContent).toContain('Detectado: salmón · a la plancha');
    expect(salmon.textContent).toContain('Confianza alta · 94 %');
    expect(salmon.textContent).toContain('300 kcal');
    expect(arroz.textContent).toContain('Confianza baja · 42 %');
    // La confianza baja resalta la fila.
    expect(arroz.classList).toContain('ns-candidato--revisar');
    expect(salmon.classList).not.toContain('ns-candidato--revisar');

    expect(raiz().querySelector('app-totales-analisis')?.textContent).toContain('560');
    expect(texto()).toContain('Estimación IA');
    expect(texto()).toContain('Valores: catálogo NutriSport');
    expect(texto()).toContain('Revisa las cantidades');
    expect(raiz().querySelector('ns-disclaimer')).toBeTruthy();
    expect(boton('Confirmar y guardar · 560 kcal')!.disabled).toBe(false);
  });

  it('si la foto da 404, muestra un hueco con "La foto ya no está disponible"', async () => {
    await harness.navigateByUrl('/comidas/foto/a-1');
    http.expectOne(URL_ANALISIS).flush(analisis('COMPLETADO'));
    await esperar();
    http
      .expectOne(`${URL_ANALISIS}/imagen`)
      .flush({ status: 404, codigo: 'NO_ENCONTRADO', title: 'x', detail: 'x' }, { status: 404, statusText: '' });
    await esperar();
    expect(texto()).toContain('La foto ya no está disponible');
    expect(filas()).toHaveLength(2);
  });

  it('si el análisis sigue en curso, sigue el polling hasta COMPLETADO', async () => {
    await abrir(analisis('PROCESANDO'));
    expect(texto()).toContain('Seguimos analizando tu foto');
    http.expectOne(URL_ANALISIS).flush(analisis('PROCESANDO'));
    await new Promise((resolver) => setTimeout(resolver, 1600));
    http.expectOne(URL_ANALISIS).flush(analisis('COMPLETADO'));
    await esperar();
    http.expectOne(`${URL_ANALISIS}/imagen`).flush({ url: 'http://minio/foto.jpg', expiraEn: '…' });
    await esperar();
    expect(filas()).toHaveLength(2);
  });

  it('la etiqueta de la foto lleva el foco a su fila', async () => {
    await abrir();
    raiz().querySelectorAll<HTMLButtonElement>('.ns-marcadores__marca')[1].click();
    await esperar();
    expect(document.activeElement).toBe(filas()[1]);
    expect(raiz().querySelectorAll('.ns-marcadores__marca')[1].classList).toContain('ns-marcadores__marca--resaltada');
  });

  it('un candidato sin coincidencias queda "Sin emparejar" y bloquea "Confirmar" hasta elegir alimento', async () => {
    await abrir(analisis('COMPLETADO', { candidatos: [SALMON, SALSA] }));
    const salsa = filas()[1];
    expect(salsa.textContent).toContain('Sin emparejar');
    expect(boton('Confirmar y guardar')!.disabled).toBe(true);
    expect(raiz().querySelector('#ns-resultado-motivo')?.textContent).toContain('sin emparejar');

    // "Elegir alimento" está abierto de entrada: se elige con el buscador.
    const buscador = harness.fixture.debugElement.queryAll(By.directive(BuscadorAlimentosComponent))[0];
    (buscador.componentInstance as BuscadorAlimentosComponent).elegido.emit(BROCOLI);
    await esperar();
    expect(filas()[1].textContent).toContain('Brócoli cocido');
    expect(boton('Confirmar y guardar')!.disabled).toBe(false);
  });

  it('confirma con un candidato cambiado, uno quitado y uno añadido; toast con "Deshacer" y vuelta a /inicio', async () => {
    const exito = vi.spyOn(TestBed.inject(NsToastService), 'exito');
    await abrir(analisis('COMPLETADO'), '/comidas/foto/a-1?fecha=2026-11-24&hora=14:30');

    // Salmón → ahumado (otra coincidencia).
    boton('Cambiar alimento', filas()[0])!.click();
    await esperar();
    boton('Salmón ahumado', filas()[0])!.click();
    await esperar();
    expect(filas()[0].textContent).toContain('Salmón ahumado');

    // Quitar el arroz.
    filas()[1].querySelector<HTMLButtonElement>('[aria-label="Quitar Arroz blanco cocido"]')!.click();
    await esperar();
    expect(filas()).toHaveLength(1);

    // Añadir brócoli a mano (100 g).
    boton('Añadir alimento no detectado')!.click();
    await esperar();
    const buscador = harness.fixture.debugElement.query(By.directive(BuscadorAlimentosComponent));
    (buscador.componentInstance as BuscadorAlimentosComponent).elegido.emit(BROCOLI);
    await esperar();
    expect(filas()[1].textContent).toContain('Añadido a mano');

    boton('Confirmar y guardar')!.click();
    await esperar();
    const peticion = http.expectOne({ method: 'POST', url: `${URL_ANALISIS}/confirmar` });
    expect(peticion.request.body).toStrictEqual({
      fecha: '2026-11-24',
      hora: '14:30:00',
      tipoComida: 'CENA',
      alimentos: [
        { alimentoId: 'salmon-ahumado', gramos: 150, indiceCandidato: 0 },
        { alimentoId: 'brocoli', gramos: 100 },
      ],
    });
    peticion.flush(
      {
        id: 'c-9',
        tipoComida: 'CENA',
        totales: { kcal: 305, proteina: 0, carbohidratos: 0, grasa: 0 },
      } as RegistroComidaResponse,
      { status: 201, statusText: '' },
    );
    await esperar();

    expect(url()).toBe('/inicio');
    expect(exito).toHaveBeenCalledWith(
      'Cena guardada · 305 kcal',
      undefined,
      expect.objectContaining({ texto: 'Deshacer' }),
    );
    exito.mock.calls[0][2]!.ejecutar();
    http.expectOne({ method: 'DELETE', url: '/api/v1/comidas/c-9' }).flush(null, { status: 204, statusText: '' });
  });

  it('409 al confirmar vuelve a cargar el análisis y muestra su estado', async () => {
    await abrir();
    boton('Confirmar y guardar')!.click();
    await esperar();
    http
      .expectOne(`${URL_ANALISIS}/confirmar`)
      .flush(
        { status: 409, codigo: 'ANALISIS_NO_CONFIRMABLE', title: 'x', detail: 'x' },
        { status: 409, statusText: '' },
      );
    await esperar();
    http.expectOne(URL_ANALISIS).flush(analisis('CONFIRMADO'));
    await esperar();
    expect(texto()).toContain('Esta comida ya está guardada');
    expect(boton('Ver mis comidas')!.getAttribute('href')).toBe('/comidas');
  });

  it('"Descartar" pide confirmación y, si se acepta, descarta y vuelve a /inicio', async () => {
    await abrir();
    confirmar.mockResolvedValueOnce(false);
    boton('Descartar')!.click();
    await esperar();
    http.expectNone(`${URL_ANALISIS}/descartar`);

    confirmar.mockResolvedValueOnce(true);
    boton('Descartar')!.click();
    await esperar();
    expect(confirmar).toHaveBeenLastCalledWith(expect.objectContaining({ textoConfirmar: 'Descartar', peligro: true }));
    http.expectOne({ method: 'POST', url: `${URL_ANALISIS}/descartar` }).flush(null, { status: 204, statusText: '' });
    await esperar();
    expect(url()).toBe('/inicio');
  });

  it('DESCARTADO y FALLIDO muestran su tarjeta con el enlace adecuado', async () => {
    await abrir(analisis('DESCARTADO'));
    expect(texto()).toContain('Análisis descartado');
    expect(boton('Registrar con foto')!.getAttribute('href')).toBe('/comidas/foto');

    // Otro id en la misma ruta: el router reutiliza el componente y debe cargar el nuevo análisis.
    await harness.navigateByUrl('/comidas/foto/a-2');
    http
      .expectOne('/api/v1/analisis/a-2')
      .flush(analisis('FALLIDO', { id: 'a-2', errorMensaje: 'No hemos detectado alimentos en la foto' }));
    await esperar();
    expect(texto()).toContain('No hemos detectado alimentos en la foto');
    expect(boton('Probar otra foto')).toBeTruthy();
    expect(boton('Registrar manualmente')!.getAttribute('href')).toBe('/comidas/nueva');
  });

  it('móvil: foto de 240 px y los totales en la barra junto a "Confirmar"', async () => {
    esMovil.set(true);
    await abrir();
    expect(raiz().querySelector('app-foto-marcadores')?.classList).toContain('ns-marcadores--compacta');
    expect(raiz().querySelector('app-totales-analisis')).toBeNull();
    const pie = raiz().querySelector('.ns-resultado__pie')!;
    expect(pie.textContent).toContain('560 kcal');
    expect(boton('Confirmar', pie)).toBeTruthy();
  });
});

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideLucideIcons } from '@lucide/angular';
import { TimeoutError, throwError } from 'rxjs';

import { errorInterceptor } from '@core/interceptors/error.interceptor';
import type { AnalisisResponse, CuentaResponse, EstadoAnalisis } from '@core/models';
import { AnalisisService } from '@core/services/analisis.service';
import { AuthService } from '@core/services/auth.service';
import { ICONOS_APP } from '@shared/design/iconos';
import { FotoComidaComponent } from './foto-comida.component';

@Component({ template: '<p>Destino</p>' })
class Destino {}

const CUENTA: CuentaResponse = {
  id: 'cuenta-1',
  nombre: 'Ana',
  email: 'ana@correo.com',
  roles: ['DEPORTISTA'],
  estado: 'ACTIVO',
  emailVerificado: true,
  consentimientoSaludVigente: true,
  unidades: 'METRICO',
  insightsActivos: true,
};

const analisis = (estado: EstadoAnalisis, cambios: Partial<AnalisisResponse> = {}): AnalisisResponse => ({
  id: 'a-1',
  tipo: 'COMIDA',
  estado,
  tipoComida: 'CENA',
  candidatos: [],
  totalEstimado: null,
  errorMensaje: null,
  creadoEn: '2026-11-26T21:00:00+01:00',
  completadoEn: null,
  ...cambios,
});

const FOTO = new File(['jpeg'], 'plato.jpg', { type: 'image/jpeg' });
const URL_SUBIDA = '/api/v1/analisis/imagenes';

let harness: RouterTestingHarness;
let http: HttpTestingController;
let auth: AuthService;

beforeEach(async () => {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
      provideRouter(
        [
          { path: 'comidas/foto', component: FotoComidaComponent },
          { path: '**', component: Destino },
        ],
        withComponentInputBinding(),
      ),
      provideLucideIcons(...ICONOS_APP),
    ],
  });
  http = TestBed.inject(HttpTestingController);
  auth = TestBed.inject(AuthService);
  auth.actualizarCuenta(CUENTA);

  // Previsualización y compresión sin navegador real.
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:foto'), revokeObjectURL: vi.fn() }));
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 4000, height: 3000, close: vi.fn() }));
  vi.stubGlobal(
    'OffscreenCanvas',
    class {
      getContext = () => ({ fillRect: vi.fn(), drawImage: vi.fn() });
      convertToBlob = () => Promise.resolve(new Blob(['jpeg'], { type: 'image/jpeg' }));
    },
  );

  harness = await RouterTestingHarness.create();
});

afterEach(() => {
  http.verify();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const raiz = () => harness.fixture.nativeElement as HTMLElement;
const url = () => TestBed.inject(Router).url;
const texto = () => raiz().textContent ?? '';
const boton = (t: string) =>
  [...raiz().querySelectorAll<HTMLButtonElement | HTMLAnchorElement>('button, a')].find((b) =>
    b.textContent?.includes(t),
  ) as HTMLButtonElement | undefined;
const esperar = async () => {
  for (let i = 0; i < 3; i++) {
    await harness.fixture.whenStable();
    await new Promise((resolver) => setTimeout(resolver));
  }
  await harness.fixture.whenStable();
};

async function abrir(ruta = '/comidas/foto'): Promise<void> {
  await harness.navigateByUrl(ruta);
  await esperar();
}

async function elegir(archivo = FOTO): Promise<void> {
  const input = raiz().querySelectorAll<HTMLInputElement>('ns-dropzone input[type="file"]')[1];
  Object.defineProperty(input, 'files', { value: [archivo], configurable: true });
  input.dispatchEvent(new Event('change'));
  await esperar();
}

/** Elige la foto, pulsa "Analizar foto" y devuelve la petición de subida. */
async function analizar() {
  await elegir();
  boton('Analizar foto')!.click();
  await esperar();
  return http.expectOne((r) => r.url === URL_SUBIDA);
}

describe('FotoComidaComponent', () => {
  it('paso 1: dropzone, datos con el tipo de la query, consejos, aviso y "Registrar manualmente"', async () => {
    await abrir('/comidas/foto?tipoComida=CENA&fecha=2026-11-20');

    expect(raiz().querySelector('ns-stepper [aria-current="step"]')?.textContent).toContain('Foto');
    expect(raiz().querySelector('ns-dropzone')).toBeTruthy();
    expect(raiz().querySelector('ns-select')?.textContent).toContain('Cena');
    expect(raiz().querySelector<HTMLInputElement>('input[type="date"]')?.value).toBe('2026-11-20');
    expect(raiz().querySelector('textarea')?.getAttribute('maxlength')).toBe('500');
    expect(texto()).toContain('Consejos para una buena foto');
    expect(raiz().querySelector('ns-disclaimer')).toBeTruthy();
    expect(boton('Analizar foto')!.disabled).toBe(true);
    expect(texto()).toContain('Puedes analizar hasta 20 fotos al día.');
    expect(boton('Registrar manualmente')!.getAttribute('href')).toBe(
      '/comidas/nueva?tipoComida=CENA&fecha=2026-11-20',
    );
  });

  it('al elegir la foto la previsualiza y "Cambiar foto" vuelve al dropzone revocando la URL', async () => {
    await abrir();
    await elegir();
    expect(raiz().querySelector<HTMLImageElement>('.ns-foto__imagen')?.src).toBe('blob:foto');
    expect(boton('Analizar foto')!.disabled).toBe(false);

    boton('Cambiar foto')!.click();
    await esperar();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:foto');
    expect(raiz().querySelector('ns-dropzone')).toBeTruthy();
  });

  it('rechaza archivos que no son imágenes en el paso 1', async () => {
    await abrir();
    await elegir(new File(['%PDF'], 'menu.pdf', { type: 'application/pdf' }));
    expect(texto()).toContain('El archivo no es una imagen.');
    expect(raiz().querySelector('ns-dropzone')).toBeTruthy();
  });

  it('sin email verificado: aviso con "Reenviar correo" y el análisis desactivado', async () => {
    auth.actualizarCuenta({ ...CUENTA, emailVerificado: false });
    await abrir();
    await elegir();

    expect(texto()).toContain('Verifica tu email para analizar fotos');
    expect(boton('Analizar foto')!.disabled).toBe(true);
    expect(boton('Registrar manualmente')).toBeTruthy();

    boton('Reenviar correo')!.click();
    await esperar();
    http.expectOne('/api/v1/auth/reenviar-verificacion').flush({ mensaje: 'ok' }, { status: 202, statusText: '' });
  });

  it('analiza: sube con los datos en la query, sigue el estado y al COMPLETADO va a la revisión', async () => {
    await abrir('/comidas/foto?tipoComida=CENA&fecha=2026-11-20');
    const hora = raiz().querySelector<HTMLInputElement>('input[type="time"]')!;
    hora.value = '21:05';
    hora.dispatchEvent(new Event('input'));
    const descripcion = raiz().querySelector('textarea')!;
    descripcion.value = ' Salmón con arroz ';
    descripcion.dispatchEvent(new Event('input'));

    const subida = await analizar();
    expect(subida.request.params.get('tipoComida')).toBe('CENA');
    expect(subida.request.params.get('descripcion')).toBe('Salmón con arroz');
    expect((subida.request.body as FormData).get('imagen')).toBeInstanceOf(Blob);
    expect(raiz().querySelector('app-progreso-analisis')).toBeTruthy();
    expect(raiz().querySelector('[aria-live]')?.textContent).toContain('Optimizando');
    expect(texto()).toContain('Salmón con arroz');
    expect(boton('Continuar manualmente')).toBeTruthy();

    subida.flush(analisis('PENDIENTE'), { status: 202, statusText: 'Accepted' });
    await esperar();
    http.expectOne('/api/v1/analisis/a-1').flush(analisis('PROCESANDO'));
    await esperar();
    expect(raiz().querySelector('[aria-live]')?.textContent).toContain('Detectando alimentos');
    expect(raiz().querySelector('.ns-fases__fase--hecha')?.textContent).toContain('Imagen optimizada y sin metadatos');

    await new Promise((resolver) => setTimeout(resolver, 1600));
    http.expectOne('/api/v1/analisis/a-1').flush(analisis('COMPLETADO'));
    await esperar();
    expect(url()).toBe('/comidas/foto/a-1?fecha=2026-11-20&hora=21:05');
  });

  it('COMPLETADO con alimentos: los muestra sobre la foto y pasa a la revisión tras una pausa', async () => {
    await abrir();
    const candidato = (nombreDetectado: string, confianza: number | null) =>
      ({ nombreDetectado, confianza }) as AnalisisResponse['candidatos'][number];
    (await analizar()).flush(
      analisis('COMPLETADO', { candidatos: [candidato('Salmón', 0.94), candidato('Arroz blanco', null)] }),
      { status: 202, statusText: '' },
    );
    await esperar();

    const etiquetas = [...raiz().querySelectorAll('.ns-progreso__etiqueta')].map((e) => e.textContent?.trim());
    expect(etiquetas).toEqual(['Salmón, confianza 94 %', 'Arroz blanco']);
    expect(raiz().querySelector('[aria-live]')?.textContent).toContain('2 alimentos detectados');
    expect(url()).toBe('/comidas/foto');

    await new Promise((resolver) => setTimeout(resolver, 1300));
    await esperar();
    expect(url()).toMatch(/^\/comidas\/foto\/a-1\?/);
  });

  it('"Editar y reanalizar" deja de consultar y vuelve al paso 1 con la foto y los datos', async () => {
    await abrir('/comidas/foto?tipoComida=CENA');
    (await analizar()).flush(analisis('PENDIENTE'), { status: 202, statusText: '' });
    await esperar();
    http.expectOne('/api/v1/analisis/a-1').flush(analisis('PROCESANDO'));
    await esperar();
    expect(texto()).toContain('usará otro de los 20 de hoy');

    boton('Editar y reanalizar')!.click();
    await esperar();
    expect(raiz().querySelector<HTMLImageElement>('.ns-foto__imagen')?.src).toBe('blob:foto');
    expect(raiz().querySelector('ns-select')?.textContent).toContain('Cena');
    await new Promise((resolver) => setTimeout(resolver, 1600));
    http.expectNone('/api/v1/analisis/a-1');

    boton('Analizar foto')!.click();
    await esperar();
    http
      .expectOne((r) => r.url === URL_SUBIDA)
      .flush(analisis('COMPLETADO', { id: 'a-2' }), {
        status: 202,
        statusText: '',
      });
    await esperar();
    expect(url()).toMatch(/^\/comidas\/foto\/a-2\?/);
  });

  it('FALLIDO: muestra errorMensaje; "Reintentar" vuelve al paso 1 con la misma foto', async () => {
    await abrir();
    (await analizar()).flush(analisis('FALLIDO', { errorMensaje: 'No hemos detectado alimentos' }), {
      status: 202,
      statusText: '',
    });
    await esperar();

    expect(texto()).toContain('No hemos detectado alimentos');
    expect(boton('Continuar manualmente')!.getAttribute('href')).toContain('/comidas/nueva?tipoComida=');
    boton('Reintentar')!.click();
    await esperar();
    expect(raiz().querySelector<HTMLImageElement>('.ns-foto__imagen')?.src).toBe('blob:foto');
  });

  it('413 y 415 vuelven al paso 1 con el mensaje', async () => {
    await abrir();
    (await analizar()).flush(
      { status: 413, codigo: 'ARCHIVO_DEMASIADO_GRANDE', title: 'x', detail: 'La imagen supera los 10 MB.' },
      { status: 413, statusText: '' },
    );
    await esperar();
    expect(raiz().querySelector('.ns-foto__imagen')).toBeTruthy();
    expect(texto()).toContain('La imagen supera los 10 MB.');

    // 415 sin Problem Details: texto propio. La foto sigue elegida.
    boton('Analizar foto')!.click();
    await esperar();
    http.expectOne((r) => r.url === URL_SUBIDA).flush('', { status: 415, statusText: '' });
    await esperar();
    expect(texto()).toContain('Formato no admitido: usa una foto JPEG o PNG.');
  });

  it('429: límite diario con el tiempo de espera', async () => {
    await abrir();
    (await analizar()).flush(
      { status: 429, codigo: 'LIMITE_EXCEDIDO', title: 'x', detail: 'x' },
      { status: 429, statusText: '', headers: { 'Retry-After': '3600' } },
    );
    await esperar();
    expect(texto()).toContain('Has llegado al límite de 20 análisis de hoy. Inténtalo de nuevo en 1 hora.');
  });

  it('503: no se ha podido analizar, con "Reintentar" y "Continuar manualmente"', async () => {
    await abrir();
    (await analizar()).flush(
      { status: 503, codigo: 'SERVICIO_NO_DISPONIBLE', title: 'x', detail: 'x' },
      { status: 503, statusText: '' },
    );
    await esperar();
    expect(texto()).toContain(
      'No hemos podido analizar la foto. Puedes reintentarlo o registrar la comida manualmente.',
    );
    expect(boton('Reintentar')).toBeTruthy();
    expect(boton('Seguir esperando')).toBeUndefined();
  });

  it('timeout: ofrece "Seguir esperando", que vuelve a consultar el mismo análisis', async () => {
    const servicio = TestBed.inject(AnalisisService);
    const seguir = vi.spyOn(servicio, 'seguir').mockReturnValueOnce(throwError(() => new TimeoutError()));
    await abrir();
    (await analizar()).flush(analisis('PENDIENTE'), { status: 202, statusText: '' });
    await esperar();

    expect(texto()).toContain('El análisis está tardando más de lo habitual');
    boton('Seguir esperando')!.click();
    await esperar();
    expect(seguir).toHaveBeenLastCalledWith('a-1');
    expect(raiz().querySelector('app-progreso-analisis')).toBeTruthy();
    http.expectOne('/api/v1/analisis/a-1').flush(analisis('COMPLETADO'));
    await esperar();
    expect(url()).toMatch(/^\/comidas\/foto\/a-1\?/);
  });

  it('al salir de la pantalla revoca la URL de la previsualización y deja de consultar', async () => {
    await abrir();
    (await analizar()).flush(analisis('PENDIENTE'), { status: 202, statusText: '' });
    await esperar();
    http.expectOne('/api/v1/analisis/a-1').flush(analisis('PROCESANDO'));

    await harness.navigateByUrl('/inicio');
    await new Promise((resolver) => setTimeout(resolver, 1600));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:foto');
    http.expectNone('/api/v1/analisis/a-1');
  });
});

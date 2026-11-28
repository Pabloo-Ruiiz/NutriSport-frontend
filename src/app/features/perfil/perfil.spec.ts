import { InteractivityChecker } from '@angular/cdk/a11y';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, provideRouter } from '@angular/router';
import { provideLucideIcons } from '@lucide/angular';

import { cambiosSinGuardarGuard } from '@core/guards/cambios-sin-guardar.guard';
import { errorInterceptor } from '@core/interceptors/error.interceptor';
import { LayoutService } from '@core/layout/layout.service';
import type { ObjetivosResponse, PerfilResponse, PreferenciaDto, TipoActividadResponse } from '@core/models';
import { AuthService } from '@core/services/auth.service';
import { ICONOS_APP } from '@shared/design/iconos';
import { NsConfirmService } from '@shared/ui/overlay/confirm.service';
import { crearFormularioPerfil, rellenarFormularioPerfil } from '../onboarding/perfil-form';
import { PerfilComponent } from './perfil.component';

const PERFIL: PerfilResponse = {
  fechaNacimiento: '1995-04-12',
  sexo: 'HOMBRE',
  alturaCm: 178,
  pesoKg: 72.5,
  porcentajeGrasa: null,
  objetivo: 'RENDIMIENTO',
  fechaCompeticion: null,
  deportePrincipal: 'CARRERA',
  nivelActividad: 'LIGERO',
  diasEntrenamientoSemana: 5,
  duracionMediaMin: 60,
  comidasPorDia: 4,
  tiposComida: ['DESAYUNO', 'COMIDA', 'MERIENDA', 'CENA'],
  tiempoMaxCocinaMin: 30,
  objetivoKcal: 2680,
  objetivoProteinaG: 140,
  objetivoCarbohidratosG: 360,
  objetivoGrasaG: 75,
  objetivosManuales: false,
};
const PREFERENCIAS: PreferenciaDto[] = [{ tipo: 'ALERGIA', alergeno: 'GLUTEN', severidad: 'ESTRICTA' }];
const OBJETIVOS: ObjetivosResponse = {
  kcal: 2680,
  proteinaG: 140,
  carbohidratosG: 360,
  grasaG: 75,
  manuales: false,
  desglose: null,
  avisos: [],
};
const TIPOS: TipoActividadResponse[] = [{ codigo: 'CARRERA', nombre: 'Carrera', met: 9.8, categoria: 'Resistencia' }];

const PETICION_PERFIL = {
  fechaNacimiento: '1995-04-12',
  sexo: 'HOMBRE',
  alturaCm: 178,
  pesoKg: 72.5,
  objetivo: 'RENDIMIENTO',
  deportePrincipal: 'CARRERA',
  nivelActividad: 'LIGERO',
  diasEntrenamientoSemana: 5,
  duracionMediaMin: 60,
  comidasPorDia: 4,
  tiposComida: ['DESAYUNO', 'COMIDA', 'MERIENDA', 'CENA'],
  tiempoMaxCocinaMin: 30,
};

class InteractivityCheckerJsdom {
  isDisabled = (e: HTMLElement) => e.hasAttribute('disabled');
  isVisible = () => true;
  isFocusable = (e: HTMLElement) => e.matches('button, input, a[href], [tabindex]');
  isTabbable = (e: HTMLElement) => this.isFocusable(e) && e.tabIndex >= 0;
}

let fixture: ComponentFixture<PerfilComponent>;
let http: HttpTestingController;

const raiz = () => fixture.nativeElement as HTMLElement;
const componente = () =>
  fixture.componentInstance as unknown as PerfilComponent & { form: ReturnType<typeof crearFormularioPerfil> };
const esperar = async () => {
  await fixture.whenStable();
  await new Promise((resolver) => setTimeout(resolver));
  await fixture.whenStable();
};

async function crear(objetivos: ObjetivosResponse = OBJETIVOS): Promise<void> {
  fixture = TestBed.createComponent(PerfilComponent);
  http.expectOne({ method: 'GET', url: '/api/v1/perfil' }).flush(PERFIL);
  http.expectOne('/api/v1/perfil/preferencias').flush(PREFERENCIAS);
  http.expectOne('/api/v1/perfil/objetivos').flush(objetivos);
  await esperar();
  http.match('/api/v1/entrenamientos/tipos').forEach((p) => p.flush(TIPOS));
  await esperar();
}

function enviarPestana(valor: string): void {
  const panel = [...raiz().querySelectorAll<HTMLFormElement>('form.ns-perfil__panel')].find((f) =>
    f.id.endsWith(valor),
  )!;
  panel.dispatchEvent(new Event('submit'));
}

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
      provideRouter([]),
      provideLucideIcons(...ICONOS_APP),
      {
        provide: AuthService,
        useValue: { cuenta: signal({ nombre: 'Álex Romero' }), consentimientoVigente: signal(true) },
      },
      { provide: LayoutService, useValue: { esMovil: signal(false) } },
      { provide: InteractivityChecker, useClass: InteractivityCheckerJsdom },
    ],
  });
  http = TestBed.inject(HttpTestingController);
});

afterEach(() => {
  http.verify();
  document.querySelector('.cdk-overlay-container')?.replaceChildren();
});

describe('rellenarFormularioPerfil', () => {
  it('copia el perfil y las preferencias y deja el formulario sin cambios', () => {
    const form = crearFormularioPerfil();
    form.markAsDirty();
    rellenarFormularioPerfil(form, PERFIL, PREFERENCIAS);
    expect(form.valid).toBe(true);
    expect(form.dirty).toBe(false);
    expect(form.controls.alimentacion.controls.preferencias.value).toEqual(PREFERENCIAS);
    expect(form.controls.objetivo.controls.fechaCompeticion.value).toBe('');
  });
});

describe('PerfilComponent', () => {
  it('muestra la cabecera con lo guardado y el formulario relleno, sin cambios', async () => {
    await crear();
    expect(raiz().querySelector('.ns-perfil__avatar')?.textContent?.trim()).toBe('ÁR');
    expect(raiz().querySelector('.ns-perfil__nombre')?.textContent?.trim()).toBe('Álex Romero');
    const resumen = raiz().querySelector('.ns-perfil__resumen')!.textContent!;
    expect(resumen).toContain('Carrera');
    expect(resumen).toContain('Rendimiento');
    expect([...raiz().querySelectorAll('[role=tab]')].map((t) => t.textContent?.trim())).toEqual([
      'Datos físicos',
      'Deporte',
      'Objetivo y macros',
      'Alimentación',
    ]);
    expect(raiz().querySelector('app-tarjeta-objetivos')?.textContent).toContain('2.680');
    expect(componente().tieneCambiosSinGuardar()).toBe(false);
  });

  it('guardar una pestaña hace PUT /perfil con el perfil completo y avisa del recálculo', async () => {
    await crear();
    componente().form.controls.sobreTi.controls.pesoKg.setValue(71);
    componente().form.controls.sobreTi.controls.pesoKg.markAsDirty();
    expect(componente().tieneCambiosSinGuardar()).toBe(true);

    enviarPestana('sobreTi');
    const peticion = http.expectOne({ method: 'PUT', url: '/api/v1/perfil' });
    expect(peticion.request.body).toStrictEqual({ ...PETICION_PERFIL, pesoKg: 71 });
    peticion.flush({ ...PERFIL, pesoKg: 71 });
    await esperar();
    http.expectNone('/api/v1/perfil/preferencias');
    http.expectOne({ method: 'GET', url: '/api/v1/perfil/objetivos' }).flush({ ...OBJETIVOS, kcal: 2650 });
    await esperar();

    expect(raiz().querySelector('ns-alert.ns-alert--info')?.textContent).toContain('Tus objetivos se han recalculado');
    expect(raiz().querySelector('app-tarjeta-objetivos')?.textContent).toContain('2.650');
    expect(componente().tieneCambiosSinGuardar()).toBe(false);
  });

  it('alimentación guarda el perfil (comidas y tiempo) y las preferencias', async () => {
    await crear();
    const { comidasPorDia, tiposComida } = componente().form.controls.alimentacion.controls;
    comidasPorDia.setValue(5);
    tiposComida.setValue(['DESAYUNO', 'COMIDA', 'MERIENDA', 'PRE_ENTRENO', 'CENA']);

    enviarPestana('alimentacion');
    const perfil = http.expectOne({ method: 'PUT', url: '/api/v1/perfil' });
    expect(perfil.request.body).toStrictEqual({
      ...PETICION_PERFIL,
      comidasPorDia: 5,
      tiposComida: ['DESAYUNO', 'COMIDA', 'MERIENDA', 'PRE_ENTRENO', 'CENA'],
    });
    perfil.flush({
      ...PERFIL,
      comidasPorDia: 5,
      tiposComida: ['DESAYUNO', 'COMIDA', 'MERIENDA', 'PRE_ENTRENO', 'CENA'],
    });
    await esperar();
    const preferencias = http.expectOne({ method: 'PUT', url: '/api/v1/perfil/preferencias' });
    expect(preferencias.request.body).toEqual({
      preferencias: [{ tipo: 'ALERGIA', severidad: 'ESTRICTA', alergeno: 'GLUTEN' }],
    });
    preferencias.flush(PREFERENCIAS);
    await esperar();
    http.expectOne('/api/v1/perfil/objetivos').flush(OBJETIVOS);
    await esperar();
  });

  it('con objetivos manuales no avisa del recálculo', async () => {
    await crear({ ...OBJETIVOS, manuales: true });
    enviarPestana('deporte');
    http.expectOne({ method: 'PUT', url: '/api/v1/perfil' }).flush(PERFIL);
    await esperar();
    http.expectOne('/api/v1/perfil/objetivos').flush({ ...OBJETIVOS, manuales: true });
    await esperar();
    expect(raiz().querySelector('ns-alert.ns-alert--info')).toBeNull();
    expect(raiz().querySelector('app-tarjeta-objetivos')?.textContent).toContain('Manuales');
  });

  it('un 400 marca el campo y cambia a su pestaña', async () => {
    await crear();
    enviarPestana('alimentacion');
    http.expectOne({ method: 'PUT', url: '/api/v1/perfil' }).flush(
      {
        status: 400,
        codigo: 'VALIDACION',
        title: 'Datos no válidos',
        detail: 'Los datos enviados no son válidos',
        errors: [{ campo: 'alturaCm', mensaje: 'Entre 120 y 230 cm' }],
      },
      { status: 400, statusText: 'Bad Request' },
    );
    await esperar();
    const activa = raiz().querySelector('[role=tab][aria-selected=true]');
    expect(activa?.textContent?.trim()).toBe('Datos físicos');
    expect(raiz().textContent).toContain('Entre 120 y 230 cm');
  });

  it('no guarda si otra pestaña tiene datos no válidos', async () => {
    await crear();
    componente().form.controls.deporte.controls.duracionMediaMin.setValue(900);
    enviarPestana('sobreTi');
    await esperar();
    http.expectNone('/api/v1/perfil');
    expect(raiz().querySelector('ns-alert.ns-alert--error')?.textContent).toContain('«Deporte»');
  });

  it('"Volver al cálculo automático" pide confirmación y hace DELETE', async () => {
    await crear({ ...OBJETIVOS, manuales: true });
    const confirmar = vi.spyOn(TestBed.inject(NsConfirmService), 'confirmar');
    const boton = () =>
      [...raiz().querySelectorAll<HTMLButtonElement>('app-tarjeta-objetivos button')].find((b) =>
        b.textContent?.includes('Volver al cálculo'),
      )!;

    confirmar.mockResolvedValueOnce(false);
    boton().click();
    await esperar();
    http.expectNone('/api/v1/perfil/objetivos/manuales');

    confirmar.mockResolvedValueOnce(true);
    boton().click();
    await esperar();
    http.expectOne({ method: 'DELETE', url: '/api/v1/perfil/objetivos/manuales' }).flush(OBJETIVOS);
    await esperar();
    expect(raiz().querySelector('app-tarjeta-objetivos')?.textContent).not.toContain('Manuales');
  });
});

describe('PerfilComponent con el consentimiento revocado', () => {
  it('un 403 CONSENTIMIENTO_REVOCADO muestra el estado vacío con el enlace a Privacidad', async () => {
    fixture = TestBed.createComponent(PerfilComponent);
    http.expectOne({ method: 'GET', url: '/api/v1/perfil' }).flush(
      {
        status: 403,
        codigo: 'CONSENTIMIENTO_REVOCADO',
        title: 'Consentimiento revocado',
        detail: 'Revocado',
        errors: [],
      },
      { status: 403, statusText: 'Forbidden' },
    );
    // El error tarda alguna vuelta en llegar a la vista; forkJoin cancela entonces las otras dos peticiones.
    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(raiz().querySelector('ns-consentimiento-revocado')).not.toBeNull();
    });
    http.match('/api/v1/entrenamientos/tipos').forEach((p) => p.flush(TIPOS));
    // Las otras dos peticiones de la carga no siempre quedan canceladas a tiempo: se cierran aquí.
    http
      .match((req) => req.url.startsWith('/api/v1/perfil/'))
      .filter((p) => !p.cancelled)
      .forEach((p) => p.flush(null, { status: 403, statusText: 'Forbidden' }));
    expect(raiz().querySelector('a[href="/configuracion/privacidad"]')).not.toBeNull();
    expect(raiz().querySelector('ns-tabs')).toBeNull();
  });
});

describe('cambiosSinGuardarGuard', () => {
  const ejecutar = (componente: { tieneCambiosSinGuardar(): boolean }) =>
    TestBed.runInInjectionContext(() =>
      cambiosSinGuardarGuard(
        componente,
        {} as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot,
        {} as RouterStateSnapshot,
      ),
    );

  it('sin cambios deja salir sin preguntar', async () => {
    const confirmar = vi.spyOn(TestBed.inject(NsConfirmService), 'confirmar');
    expect(await ejecutar({ tieneCambiosSinGuardar: () => false })).toBe(true);
    expect(confirmar).not.toHaveBeenCalled();
  });

  it('con cambios pregunta y respeta la respuesta', async () => {
    const confirmar = vi.spyOn(TestBed.inject(NsConfirmService), 'confirmar');
    confirmar.mockResolvedValueOnce(false);
    expect(await ejecutar({ tieneCambiosSinGuardar: () => true })).toBe(false);
    confirmar.mockResolvedValueOnce(true);
    expect(await ejecutar({ tieneCambiosSinGuardar: () => true })).toBe(true);
    expect(confirmar.mock.calls[0][0]).toMatchObject({
      titulo: '¿Salir sin guardar?',
      textoConfirmar: 'Salir sin guardar',
    });
  });
});

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideLucideIcons } from '@lucide/angular';

import { errorInterceptor } from '@core/interceptors/error.interceptor';
import type { ObjetivosResponse, TipoActividadResponse } from '@core/models';
import { PerfilService } from '@core/services/perfil.service';
import { ICONOS_APP } from '@shared/design/iconos';
import { OnboardingComponent } from './onboarding.component';
import type { FormularioPerfil } from './perfil-form';

const TIPOS: TipoActividadResponse[] = [
  { codigo: 'CARRERA', nombre: 'Carrera', met: 9.8, categoria: 'Resistencia' },
  { codigo: 'CICLISMO', nombre: 'Ciclismo', met: 7.5, categoria: 'Resistencia' },
  { codigo: 'PESAS', nombre: 'Pesas', met: 5, categoria: 'Fuerza' },
  { codigo: 'YOGA', nombre: 'Yoga', met: 2.5, categoria: null },
];

const OBJETIVOS: ObjetivosResponse = {
  kcal: 2400,
  proteinaG: 130,
  carbohidratosG: 300,
  grasaG: 75,
  manuales: false,
  desglose: {
    edad: 31,
    metabolismoBasal: 1400,
    factorActividad: 1.55,
    gastoSinEntreno: 2170,
    ajustePorcentaje: 10,
    kcal: 2400,
    proteinaG: 130,
    carbohidratosG: 300,
    grasaG: 75,
    avisos: [],
  },
  avisos: [],
};

let fixture: ComponentFixture<OnboardingComponent>;
let http: HttpTestingController;

beforeEach(async () => {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
      provideRouter([]),
      provideLucideIcons(...ICONOS_APP),
    ],
  });
  http = TestBed.inject(HttpTestingController);
  fixture = TestBed.createComponent(OnboardingComponent);
  document.body.appendChild(fixture.nativeElement);
  await fixture.whenStable();
});

afterEach(() => {
  http.verify();
  fixture.nativeElement.remove();
});

const raiz = () => fixture.nativeElement as HTMLElement;
const form = () => (fixture.componentInstance as unknown as { form: FormularioPerfil }).form;
const titulo = () => raiz().querySelector('h1')?.textContent?.trim();
/** Radio de una tarjeta por su texto ([value] va a la directiva, no al atributo del DOM). */
const tarjeta = (texto: string) =>
  [...raiz().querySelectorAll('label.ns-tarjeta')]
    .find((l) => l.querySelector('.ns-tarjeta__titulo')?.textContent?.trim() === texto)!
    .querySelector('input') as HTMLInputElement;

async function continuar(): Promise<void> {
  raiz().querySelector('form')!.dispatchEvent(new Event('submit'));
  await fixture.whenStable();
  await new Promise((resolver) => setTimeout(resolver));
  await fixture.whenStable();
}

async function rellenarHastaElFinal(): Promise<void> {
  form().controls.sobreTi.setValue({
    fechaNacimiento: '1995-04-12',
    sexo: 'MUJER',
    alturaCm: 168,
    pesoKg: 61.5,
    porcentajeGrasa: null,
  });
  await continuar();
  http.expectOne('/api/v1/entrenamientos/tipos').flush(TIPOS);
  await fixture.whenStable();

  tarjeta('Carrera').click();
  form().controls.deporte.patchValue({ diasEntrenamientoSemana: 4, duracionMediaMin: 60, nivelActividad: 'LIGERO' });
  await continuar();

  tarjeta('Preparar una competición').click();
  await fixture.whenStable();
  form().controls.objetivo.controls.fechaCompeticion.setValue('2027-03-01');
  await continuar();
  expect(titulo()).toBe('Tu alimentación');
}

describe('OnboardingComponent', () => {
  it('no avanza si el paso no es válido y lleva el foco al primer error', async () => {
    expect(titulo()).toBe('Sobre ti');
    await continuar();
    expect(titulo()).toBe('Sobre ti');
    expect(raiz().textContent).toContain('Este campo es obligatorio.');
    expect(document.activeElement?.getAttribute('aria-invalid')).toBe('true');
  });

  it('agrupa los deportes por categoría, con los que no tienen al final', async () => {
    form().controls.sobreTi.setValue({
      fechaNacimiento: '1995-04-12',
      sexo: 'HOMBRE',
      alturaCm: 180,
      pesoKg: 75,
      porcentajeGrasa: null,
    });
    await continuar();
    http.expectOne('/api/v1/entrenamientos/tipos').flush(TIPOS);
    await fixture.whenStable();

    const categorias = [...raiz().querySelectorAll('.ns-paso__subtitulo')].map((e) => e.textContent?.trim());
    expect(categorias).toEqual(['Resistencia', 'Fuerza', 'Otros']);
    expect(raiz().querySelectorAll('input[type=radio][name=deportePrincipal]').length).toBe(4);
  });

  it('pide la fecha de competición solo con COMPETICION', async () => {
    form().controls.sobreTi.setValue({
      fechaNacimiento: '1995-04-12',
      sexo: 'HOMBRE',
      alturaCm: 180,
      pesoKg: 75,
      porcentajeGrasa: null,
    });
    await continuar();
    http.expectOne('/api/v1/entrenamientos/tipos').flush(TIPOS);
    form().controls.deporte.setValue({
      deportePrincipal: 'CARRERA',
      diasEntrenamientoSemana: 3,
      duracionMediaMin: 45,
      nivelActividad: 'MODERADO',
    });
    await continuar();

    expect(raiz().querySelectorAll('input[type=radio]').length).toBe(5);
    expect(raiz().querySelector('input[type=date]')).toBeNull();
    tarjeta('Preparar una competición').click();
    await fixture.whenStable();
    expect(raiz().querySelector('input[type=date]')).not.toBeNull();

    await continuar();
    expect(titulo()).toBe('Tu objetivo');
  });

  it('al terminar guarda el perfil, las preferencias y muestra los objetivos', async () => {
    await rellenarHastaElFinal();
    form().controls.alimentacion.controls.preferencias.setValue([
      { tipo: 'ALERGIA', alergeno: 'GLUTEN', severidad: 'ESTRICTA' },
    ]);
    await continuar();

    const perfil = http.expectOne({ method: 'PUT', url: '/api/v1/perfil' });
    expect(perfil.request.body).toStrictEqual({
      fechaNacimiento: '1995-04-12',
      sexo: 'MUJER',
      alturaCm: 168,
      pesoKg: 61.5,
      objetivo: 'COMPETICION',
      fechaCompeticion: '2027-03-01',
      deportePrincipal: 'CARRERA',
      nivelActividad: 'LIGERO',
      diasEntrenamientoSemana: 4,
      duracionMediaMin: 60,
      comidasPorDia: 4,
    });
    perfil.flush({});
    await continuar();

    const preferencias = http.expectOne({ method: 'PUT', url: '/api/v1/perfil/preferencias' });
    expect(preferencias.request.body).toEqual({
      preferencias: [{ tipo: 'ALERGIA', severidad: 'ESTRICTA', alergeno: 'GLUTEN' }],
    });
    preferencias.flush(preferencias.request.body.preferencias);
    await continuar();

    http.expectOne({ method: 'GET', url: '/api/v1/perfil/objetivos' }).flush(OBJETIVOS);
    await continuar();

    expect(titulo()).toBe('Tus objetivos diarios');
    expect(raiz().querySelector('app-resumen-objetivos')).not.toBeNull();
    expect(raiz().querySelector('a[href="/inicio"]')?.textContent).toContain('Ir a mi panel');
    expect(await TestBed.inject(PerfilService).existe()).toBe(true);
  });

  it('un 400 de PUT /perfil vuelve al primer paso con un campo erróneo', async () => {
    await rellenarHastaElFinal();
    await continuar();
    http.expectOne({ method: 'PUT', url: '/api/v1/perfil' }).flush(
      {
        status: 400,
        codigo: 'VALIDACION',
        title: 'Datos no válidos',
        detail: 'Los datos enviados no son válidos',
        errors: [
          { campo: 'deportePrincipal', mensaje: 'No es un deporte del catálogo' },
          { campo: 'comidasPorDia', mensaje: 'Entre 3 y 6' },
        ],
      },
      { status: 400, statusText: 'Bad Request' },
    );
    await continuar();

    expect(titulo()).toBe('Tu deporte');
    expect(raiz().textContent).toContain('No es un deporte del catálogo');
    http.expectNone('/api/v1/perfil/preferencias');
  });
});

import { InteractivityChecker } from '@angular/cdk/a11y';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideLucideIcons } from '@lucide/angular';
import { firstValueFrom } from 'rxjs';

import { LayoutService } from '@core/layout/layout.service';
import type { EntrenamientoResponse, TipoActividadResponse } from '@core/models';
import { EntrenamientosService } from '@core/services/entrenamientos.service';
import { environment } from '@env/environment';
import { ICONOS_APP } from '@shared/design/iconos';
import { NsDialogService } from '@shared/ui/overlay/dialog.service';
import {
  type ValorEntrenamiento,
  aEntrenamientoRequest,
  aIsoConZona,
  crearFormularioEntrenamiento,
  desdeFechaHoraLocal,
  esFutura,
  formatearDesfase,
  isoAFechaHoraLocal,
  valorInicial,
} from './entrenamiento-form';
import { abrirEntrenamientoForm } from './entrenamiento-form.component';

const URL = `${environment.apiUrl}/entrenamientos`;

/** Desfase de Madrid: UTC+2 de finales de marzo a finales de octubre (2026: 29-mar a 25-oct), UTC+1 el resto. */
function madrid(d: Date): number {
  const inicio = new Date(2026, 2, 29, 3, 0);
  const fin = new Date(2026, 9, 25, 3, 0);
  return d >= inicio && d < fin ? -120 : -60;
}

function valor(cambios: Partial<ValorEntrenamiento> = {}): ValorEntrenamiento {
  return {
    tipoActividadCodigo: 'RUNNING',
    fechaHora: '2026-11-25T18:30',
    duracionMin: 45,
    intensidad: 'MEDIA',
    estado: 'REALIZADO',
    rpe: 7,
    distanciaKm: 8.5,
    notas: '  Series 6x1000  ',
    ...cambios,
  };
}

/** Cambia la zona horaria del proceso (Node la relee al cambiar process.env.TZ). */
function conZona<T>(zona: string, fn: () => T): T {
  const env = (globalThis as unknown as { process?: { env: Record<string, string | undefined> } }).process?.env;
  if (!env) return fn();
  const antes = env['TZ'];
  env['TZ'] = zona;
  try {
    return fn();
  } finally {
    if (antes === undefined) delete env['TZ'];
    else env['TZ'] = antes;
  }
}

describe('Conversión a EntrenamientoRequest', () => {
  it('formatea el desfase con signo, horas y minutos', () => {
    expect(formatearDesfase(-60)).toBe('+01:00');
    expect(formatearDesfase(-120)).toBe('+02:00');
    expect(formatearDesfase(0)).toBe('+00:00');
    expect(formatearDesfase(300)).toBe('-05:00');
    expect(formatearDesfase(-330)).toBe('+05:30');
    expect(formatearDesfase(210)).toBe('-03:30');
  });

  it('pasa la hora local a ISO con el desfase de esa fecha (horario de verano incluido)', () => {
    expect(aIsoConZona('2026-11-25T18:30', madrid)).toBe('2026-11-25T18:30:00+01:00');
    expect(aIsoConZona('2026-07-10T07:05', madrid)).toBe('2026-07-10T07:05:00+02:00');
    expect(aIsoConZona('2026-03-29T01:59', madrid)).toBe('2026-03-29T01:59:00+01:00');
    expect(aIsoConZona('2026-11-25T18:30', () => 300)).toBe('2026-11-25T18:30:00-05:00');
    expect(aIsoConZona('2026-11-25T18:30', () => -330)).toBe('2026-11-25T18:30:00+05:30');
  });

  it('con la zona real del navegador, Europe/Madrid, también en los cambios de hora', () => {
    conZona('Europe/Madrid', () => {
      expect(aIsoConZona('2026-11-25T18:30')).toBe('2026-11-25T18:30:00+01:00');
      expect(aIsoConZona('2026-07-10T07:05')).toBe('2026-07-10T07:05:00+02:00');
      expect(aIsoConZona('2026-03-29T01:30')).toBe('2026-03-29T01:30:00+01:00');
      // 02:30 no existe ese día: el navegador la lleva a las 03:30, ya en verano.
      expect(aIsoConZona('2026-03-29T02:30')).toBe('2026-03-29T03:30:00+02:00');
      expect(aIsoConZona('2026-10-25T12:00')).toBe('2026-10-25T12:00:00+01:00');
    });
  });

  it('y en zonas al oeste de UTC', () => {
    conZona('America/New_York', () => {
      expect(aIsoConZona('2026-11-25T18:30')).toBe('2026-11-25T18:30:00-05:00');
      expect(aIsoConZona('2026-07-10T18:30')).toBe('2026-07-10T18:30:00-04:00');
    });
  });

  it('el ISO generado representa el mismo instante que la hora local (cualquier zona)', () => {
    for (const local of ['2026-01-15T06:00', '2026-06-21T23:45', '2026-12-31T00:00']) {
      expect(new Date(aIsoConZona(local)!).getTime()).toBe(desdeFechaHoraLocal(local)!.getTime());
    }
  });

  it('rechaza valores no válidos', () => {
    expect(aIsoConZona('')).toBeNull();
    expect(aIsoConZona('2026-02-30T10:00')).toBeNull();
    expect(aIsoConZona('25/11/2026 18:30')).toBeNull();
  });

  it('un ISO de la API se muestra en la hora local del navegador', () => {
    conZona('Europe/Madrid', () => {
      expect(isoAFechaHoraLocal('2026-11-25T18:30:00+01:00')).toBe('2026-11-25T18:30');
      expect(isoAFechaHoraLocal('2026-11-25T17:30:00Z')).toBe('2026-11-25T18:30');
      expect(isoAFechaHoraLocal('2026-11-25T12:30:00-05:00')).toBe('2026-11-25T18:30');
    });
  });

  it('construye el request: RPE solo si está realizado, distancia si la hay, notas recortadas', () => {
    expect(aEntrenamientoRequest(valor(), madrid)).toEqual({
      tipoActividadCodigo: 'RUNNING',
      fechaHora: '2026-11-25T18:30:00+01:00',
      duracionMin: 45,
      intensidad: 'MEDIA',
      estado: 'REALIZADO',
      rpe: 7,
      distanciaKm: 8.5,
      notas: 'Series 6x1000',
    });
    expect(aEntrenamientoRequest(valor({ estado: 'PLANIFICADO', distanciaKm: null, notas: '   ' }), madrid)).toEqual({
      tipoActividadCodigo: 'RUNNING',
      fechaHora: '2026-11-25T18:30:00+01:00',
      duracionMin: 45,
      intensidad: 'MEDIA',
      estado: 'PLANIFICADO',
    });
    expect(aEntrenamientoRequest(valor({ rpe: null }), madrid)).not.toHaveProperty('rpe');
  });

  it('valor inicial: editar convierte el ISO; uno nuevo en un día futuro, a las 18:00 y planificado', () => {
    conZona('Europe/Madrid', () => {
      const ahora = new Date(2026, 10, 26, 10, 7);
      const e = {
        tipoActividadCodigo: 'CICLISMO',
        tipoActividadNombre: 'Ciclismo',
        fechaHora: '2026-11-20T08:00:00+01:00',
        duracionMin: 90,
        intensidad: 'ALTA',
        rpe: null,
        estado: 'REALIZADO',
        distanciaKm: 40,
        notas: null,
      } as EntrenamientoResponse;
      expect(valorInicial(e, null, ahora)).toMatchObject({ fechaHora: '2026-11-20T08:00', notas: '', rpe: null });
      expect(valorInicial(null, null, ahora)).toMatchObject({ fechaHora: '2026-11-26T10:05', estado: 'REALIZADO' });
      expect(valorInicial(null, '2026-11-28', ahora)).toMatchObject({
        fechaHora: '2026-11-28T18:00',
        estado: 'PLANIFICADO',
      });
    });
  });

  it('el formulario valida los límites y no deja un entrenamiento futuro como realizado', () => {
    const ahora = new Date(2026, 10, 26, 10, 0);
    const form = crearFormularioEntrenamiento(valor(), () => ahora);
    expect(form.valid).toBe(true);
    form.controls.duracionMin.setValue(601);
    expect(form.controls.duracionMin.hasError('max')).toBe(true);
    form.controls.duracionMin.setValue(0);
    expect(form.controls.duracionMin.hasError('min')).toBe(true);
    form.controls.duracionMin.setValue(60);
    form.controls.rpe.setValue(11);
    expect(form.controls.rpe.invalid).toBe(true);
    form.controls.rpe.setValue(5);
    form.controls.notas.setValue('x'.repeat(501));
    expect(form.controls.notas.invalid).toBe(true);
    form.controls.notas.setValue('');
    form.controls.fechaHora.setValue('2026-11-27T10:00');
    expect(esFutura('2026-11-27T10:00', ahora)).toBe(true);
    expect(form.hasError('realizadoFuturo')).toBe(true);
    form.controls.estado.setValue('PLANIFICADO');
    expect(form.valid).toBe(true);
  });
});

describe('EntrenamientosService', () => {
  let http: HttpTestingController;
  let servicio: EntrenamientosService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    servicio = TestBed.inject(EntrenamientosService);
  });

  it('listar envía el rango y el estado; más de 92 días no llega a pedirse', async () => {
    servicio.listar('2026-11-01', '2026-11-30', 'PLANIFICADO').subscribe();
    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.params.get('desde')).toBe('2026-11-01');
    expect(req.request.params.get('hasta')).toBe('2026-11-30');
    expect(req.request.params.get('estado')).toBe('PLANIFICADO');
    req.flush([]);
    await expect(firstValueFrom(servicio.listar('2026-01-01', '2026-04-30'))).rejects.toBeInstanceOf(RangeError);
    http.expectNone((r) => r.url === URL);
  });

  it('marcarEstado reenvía el entrenamiento completo con el estado nuevo', () => {
    const e: EntrenamientoResponse = {
      id: 'e-1',
      tipoActividadCodigo: 'RUNNING',
      tipoActividadNombre: 'Carrera',
      fechaHora: '2026-11-25T18:30:00+01:00',
      duracionMin: 45,
      intensidad: 'MEDIA',
      rpe: null,
      estado: 'PLANIFICADO',
      kcalEstimadas: 420,
      distanciaKm: 8,
      notas: 'Rodaje',
    };
    servicio.marcarEstado(e, 'REALIZADO').subscribe();
    const req = http.expectOne(`${URL}/e-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      tipoActividadCodigo: 'RUNNING',
      fechaHora: '2026-11-25T18:30:00+01:00',
      duracionMin: 45,
      intensidad: 'MEDIA',
      estado: 'REALIZADO',
      distanciaKm: 8,
      notas: 'Rodaje',
    });
  });
});

describe('EntrenamientoFormComponent', () => {
  class InteractivityCheckerJsdom {
    isDisabled = (e: HTMLElement) => e.hasAttribute('disabled');
    isVisible = () => true;
    isFocusable = (e: HTMLElement) => e.matches('button, input, select, textarea, a[href], [tabindex]');
    isTabbable = (e: HTMLElement) => this.isFocusable(e) && e.tabIndex >= 0;
  }
  const TIPOS: TipoActividadResponse[] = [
    { codigo: 'RUNNING', nombre: 'Carrera', met: 9.8, categoria: 'Resistencia' },
    { codigo: 'CICLISMO', nombre: 'Ciclismo', met: 7.5, categoria: 'Resistencia' },
    { codigo: 'PESAS', nombre: 'Pesas', met: 5, categoria: 'Fuerza' },
  ];
  let http: HttpTestingController;
  const panel = () => document.querySelector('.cdk-overlay-container') as HTMLElement;
  const tick = () => new Promise((r) => setTimeout(r));

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideLucideIcons(...ICONOS_APP),
        { provide: LayoutService, useValue: { esMovil: signal(false) } },
        { provide: InteractivityChecker, useClass: InteractivityCheckerJsdom },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => panel()?.replaceChildren());

  async function abrir(fecha?: string) {
    const ref = abrirEntrenamientoForm(TestBed.inject(NsDialogService), { fecha });
    await tick();
    http.expectOne(`${URL}/tipos`).flush(TIPOS);
    await tick();
    TestBed.tick();
    return ref;
  }

  function boton(texto: string): HTMLButtonElement {
    return [...panel().querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent!.trim() === texto)!;
  }

  it('agrupa las actividades por categoría', async () => {
    await abrir();
    const grupos = [...panel().querySelectorAll('optgroup')].map((g) => g.label);
    expect(grupos).toEqual(['Resistencia', 'Fuerza']);
  });

  it('con una fecha futura, Realizado está deshabilitado y no se pide el RPE', async () => {
    await abrir('2099-01-01');
    expect(boton('Realizado').disabled).toBe(true);
    expect(boton('Planificado').getAttribute('aria-checked')).toBe('true');
    expect(panel().querySelector('input[type="range"]')).toBeNull();
  });

  it('hoy está realizado, muestra el RPE con su valor y envía el POST', async () => {
    let guardado: EntrenamientoResponse | undefined;
    const ref = await abrir();
    ref.closed.subscribe((e) => (guardado = e));
    const rango = panel().querySelector<HTMLInputElement>('input[type="range"]')!;
    expect(panel().textContent).toContain('Sin indicar');
    rango.value = '8';
    rango.dispatchEvent(new Event('input'));
    rango.dispatchEvent(new Event('change'));
    TestBed.tick();
    expect(panel().textContent).toContain('8 de 10');

    const select = panel().querySelector<HTMLSelectElement>('select')!;
    select.value = '0';
    select.dispatchEvent(new Event('change'));
    panel().querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));

    const req = http.expectOne((r) => r.method === 'POST' && r.url === URL);
    expect(req.request.body).toMatchObject({
      tipoActividadCodigo: 'RUNNING',
      duracionMin: 60,
      intensidad: 'MEDIA',
      estado: 'REALIZADO',
      rpe: 8,
    });
    expect(req.request.body.fechaHora).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00[+-]\d{2}:\d{2}$/);
    const respuesta = { id: 'e-1' } as EntrenamientoResponse;
    req.flush(respuesta, { status: 201, statusText: 'Created' });
    expect(guardado).toBe(respuesta);
  });

  it('un 422 PERFIL_REQUERIDO cierra el diálogo y lleva a /bienvenida', async () => {
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    let cerrado = false;
    const ref = await abrir();
    ref.closed.subscribe(() => (cerrado = true));
    const select = panel().querySelector<HTMLSelectElement>('select')!;
    select.value = '0';
    select.dispatchEvent(new Event('change'));
    panel().querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    http
      .expectOne((r) => r.method === 'POST' && r.url === URL)
      .flush({ title: 'Perfil requerido', codigo: 'PERFIL_REQUERIDO' }, { status: 422, statusText: 'Unprocessable' });
    expect(cerrado).toBe(true);
    expect(navegar).toHaveBeenCalledWith(['/bienvenida']);
  });
});

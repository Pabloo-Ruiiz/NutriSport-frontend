import { InteractivityChecker } from '@angular/cdk/a11y';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, type TestRequest } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideLucideIcons } from '@lucide/angular';

import { LayoutService } from '@core/layout/layout.service';
import type { EntrenamientoResponse, RelacionNutricionResponse } from '@core/models';
import { hoyLocal, lunesDeLaSemana, sumarDias } from '@core/util/fechas';
import { environment } from '@env/environment';
import { ICONOS_APP } from '@shared/design/iconos';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import { NsConfirmService } from '@shared/ui/overlay/confirm.service';
import { calcularKpis, cargaPorDia, etiquetaSemana } from './actividad';
import { AVISO_OBJETIVO_HOY, ActividadComponent } from './actividad.component';
import { aIsoConZona } from './entrenamiento-form';

class InteractivityCheckerJsdom {
  isDisabled = (e: HTMLElement) => e.hasAttribute('disabled');
  isVisible = () => true;
  isFocusable = (e: HTMLElement) => e.matches('button, input, select, textarea, a[href], [tabindex]');
  isTabbable = (e: HTMLElement) => this.isFocusable(e) && e.tabIndex >= 0;
}

const URL = `${environment.apiUrl}/entrenamientos`;
const HOY = hoyLocal();
const LUNES = lunesDeLaSemana(HOY);
const RELACION: RelacionNutricionResponse = {
  desde: sumarDias(HOY, -27),
  hasta: HOY,
  mediaEntreno: { kcal: 2500, proteina: 140, carbohidratos: 290, grasa: 80 },
  objetivoEntreno: { kcal: 2650, proteina: 150, carbohidratos: 340, grasa: 80 },
  mediaDescanso: { kcal: 1900, proteina: 120, carbohidratos: 210, grasa: 70 },
  objetivoDescanso: { kcal: 2000, proteina: 150, carbohidratos: 240, grasa: 75 },
  diasEntreno: 8,
  diasDescanso: 12,
  sesionesConProteinaPost: 5,
  sesiones: 6,
};

/** ISO con la zona local para el día y la hora indicados. */
const iso = (fecha: string, hora: string) => aIsoConZona(`${fecha}T${hora}`)!;

function ent(id: string, cambios: Partial<EntrenamientoResponse> = {}): EntrenamientoResponse {
  return {
    id,
    tipoActividadCodigo: 'RUNNING',
    tipoActividadNombre: 'Carrera',
    fechaHora: iso(LUNES, '08:00'),
    duracionMin: 60,
    intensidad: 'MEDIA',
    rpe: 6,
    estado: 'REALIZADO',
    kcalEstimadas: 500,
    distanciaKm: null,
    notas: null,
    ...cambios,
  };
}

describe('Funciones de Actividad', () => {
  it('etiqueta la semana en el mismo mes, entre meses y entre años', () => {
    expect(etiquetaSemana('2026-11-23')).toBe('23–29 nov');
    expect(etiquetaSemana('2026-11-30')).toBe('30 nov – 6 dic');
    expect(etiquetaSemana('2026-12-28')).toBe('28 dic 2026 – 3 ene 2027');
  });

  it('KPIs solo de los realizados; la carga es duración × RPE (sin RPE no suma)', () => {
    const kpis = calcularKpis([
      ent('a', { duracionMin: 60, rpe: 6, kcalEstimadas: 500 }),
      ent('b', { duracionMin: 30, rpe: null, kcalEstimadas: 200 }),
      ent('c', { estado: 'PLANIFICADO', duracionMin: 90, rpe: 8 }),
      ent('d', { estado: 'OMITIDO' }),
    ]);
    expect(kpis).toEqual({ sesiones: 2, minutos: 90, kcal: 700, carga: 360, sinRpe: 1 });
  });

  it('carga por día: 7 días, sin omitidos, con descripción en texto', () => {
    const dias = cargaPorDia(
      [
        ent('a', { intensidad: 'BAJA', duracionMin: 30 }),
        ent('b', { intensidad: 'ALTA', duracionMin: 45 }),
        ent('c', { fechaHora: iso(sumarDias(LUNES, 2), '18:00'), estado: 'PLANIFICADO' }),
        ent('d', { fechaHora: iso(sumarDias(LUNES, 3), '18:00'), estado: 'OMITIDO' }),
      ],
      LUNES,
    );
    expect(dias.map((d) => d.inicial)).toEqual(['L', 'M', 'X', 'J', 'V', 'S', 'D']);
    expect(dias[0].minutos).toBe(75);
    expect(dias[0].segmentos.map((s) => s.intensidad)).toEqual(['ALTA', 'BAJA']);
    expect(dias[0].descripcion).toContain('45 min de intensidad alta, 30 min de intensidad baja');
    expect(dias[2].descripcion).toContain('(planificado)');
    expect(dias[3].minutos).toBe(0);
    expect(dias[3].descripcion).toContain('sin entrenamientos');
  });
});

describe('ActividadComponent', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<ActividadComponent>;
  const confirmar = vi.fn();

  beforeEach(() => {
    confirmar.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideLucideIcons(...ICONOS_APP),
        { provide: LayoutService, useValue: { esMovil: signal(false) } },
        { provide: InteractivityChecker, useClass: InteractivityCheckerJsdom },
        { provide: NsConfirmService, useValue: { confirmar } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => document.querySelector('.cdk-overlay-container')?.replaceChildren());

  function semana(): TestRequest {
    return http.expectOne((r) => r.method === 'GET' && r.url === URL);
  }

  async function crear(lista: EntrenamientoResponse[]): Promise<HTMLElement> {
    fixture = TestBed.createComponent(ActividadComponent);
    fixture.detectChanges();
    const req = semana();
    expect(req.request.params.get('desde')).toBe(LUNES);
    expect(req.request.params.get('hasta')).toBe(sumarDias(LUNES, 6));
    req.flush(lista);
    relacionNutricion().forEach((r) => r.flush(RELACION));
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  /** "Alimentación y actividad" (últimas 4 semanas): se pide una vez al abrir la pantalla. */
  const relacionNutricion = () => http.match((r) => r.url === `${URL}/relacion-nutricion`);

  const texto = (el: HTMLElement) => el.textContent!.replace(/\s+/g, ' ');
  const botones = (el: HTMLElement, t: string) =>
    [...el.querySelectorAll<HTMLButtonElement>('button')].filter((b) => b.textContent!.trim() === t);

  it('separa próximos y realizados y calcula los KPIs', async () => {
    const el = await crear([
      ent('a'),
      ent('b', { estado: 'PLANIFICADO', fechaHora: iso(sumarDias(LUNES, 6), '19:00'), tipoActividadNombre: 'Pesas' }),
    ]);
    expect(texto(el)).toContain('Próximos (1)');
    expect(texto(el)).toContain('Realizados (1)');
    expect(el.querySelectorAll('app-entrenamiento-item').length).toBe(2);
    expect(el.querySelector('app-kpis-semana')!.textContent).toContain('360');
  });

  it('navega por semanas y vuelve a la actual', async () => {
    const el = await crear([]);
    el.querySelector<HTMLButtonElement>('[aria-label="Semana anterior"]')!.click();
    expect(semana().request.params.get('desde')).toBe(sumarDias(LUNES, -7));
    await fixture.whenStable();
    botones(el, 'Esta semana')[0].click();
    expect(semana().request.params.get('desde')).toBe(LUNES);
  });

  it('filtra por tipo de actividad en el cliente', async () => {
    const el = await crear([
      ent('a'),
      ent('b', { tipoActividadCodigo: 'PESAS', tipoActividadNombre: 'Pesas', duracionMin: 40, rpe: null }),
    ]);
    const select = el.querySelector<HTMLSelectElement>('ns-select select')!;
    const opciones = [...select.options].map((o) => o.textContent!.trim());
    expect(opciones).toEqual(['Todas las actividades', 'Carrera', 'Pesas']);
    select.value = '2';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    http.expectNone((r) => r.url === URL);
    expect(el.querySelectorAll('app-entrenamiento-item').length).toBe(1);
    expect(texto(el)).toContain('Pesas');
  });

  it('"Marcar como realizado" solo si ya ha llegado; envía el PUT completo y avisa si afecta a hoy', async () => {
    const pasado = ent('p', { estado: 'PLANIFICADO', rpe: null, fechaHora: iso(HOY, '00:00') });
    const futuro = ent('f', { estado: 'PLANIFICADO', fechaHora: iso(sumarDias(HOY, 1), '23:00') });
    const el = await crear([pasado, futuro]);
    const marcar = botones(el, 'Marcar como realizado');
    expect(marcar.length).toBe(1);

    marcar[0].click();
    const put = http.expectOne(`${URL}/p`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({
      tipoActividadCodigo: 'RUNNING',
      fechaHora: pasado.fechaHora,
      duracionMin: 60,
      intensidad: 'MEDIA',
      estado: 'REALIZADO',
    });
    put.flush({ ...pasado, estado: 'REALIZADO' });
    semana().flush([]);
    const toast = TestBed.inject(NsToastService).visibles().at(-1)!;
    expect(toast.titulo).toBe('Entrenamiento realizado');
    expect(toast.mensaje).toBe(AVISO_OBJETIVO_HOY);
  });

  it('eliminar pide confirmación; sin confirmar no borra', async () => {
    const otroDia = HOY === LUNES ? sumarDias(LUNES, 1) : LUNES;
    const e = ent('a', { fechaHora: iso(otroDia, '08:00') });
    await crear([e]);
    const componente = fixture.componentInstance as unknown as { eliminar(e: EntrenamientoResponse): Promise<void> };

    confirmar.mockResolvedValue(false);
    await componente.eliminar(e);
    http.expectNone(`${URL}/a`);

    confirmar.mockResolvedValue(true);
    await componente.eliminar(e);
    expect(confirmar.mock.calls[0][0]).toMatchObject({ peligro: true, textoConfirmar: 'Eliminar' });
    http.expectOne(`${URL}/a`).flush(null, { status: 204, statusText: 'No Content' });
    semana().flush([]);
    const toast = TestBed.inject(NsToastService).visibles().at(-1)!;
    expect(toast.titulo).toBe('Entrenamiento eliminado');
    expect(toast.mensaje).toBeUndefined();
  });

  it('un 422 PERFIL_REQUERIDO lleva a /bienvenida', async () => {
    const e = ent('p', { estado: 'PLANIFICADO', fechaHora: iso(HOY, '00:00') });
    const el = await crear([e]);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    botones(el, 'Marcar como realizado')[0].click();
    http
      .expectOne(`${URL}/p`)
      .flush(
        { title: 'Perfil requerido', detail: 'Completa tu perfil', codigo: 'PERFIL_REQUERIDO' },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
    expect(navegar).toHaveBeenCalledWith(['/bienvenida']);
  });

  it('"Alimentación y actividad" con la relación de las últimas 4 semanas', async () => {
    fixture = TestBed.createComponent(ActividadComponent);
    fixture.detectChanges();
    const [relacion] = relacionNutricion();
    expect(relacion.request.params.get('desde')).toBe(sumarDias(HOY, -27));
    expect(relacion.request.params.get('hasta')).toBe(HOY);
    relacion.flush(RELACION);
    semana().flush([]);
    await fixture.whenStable();
    const t = texto(fixture.nativeElement as HTMLElement);
    expect(t).toContain('Alimentación y actividad');
    expect(t).toContain('Media diaria · 8 días de entreno, 12 días de descanso');
    expect(t).toContain('5 de 6 sesiones');
  });
});

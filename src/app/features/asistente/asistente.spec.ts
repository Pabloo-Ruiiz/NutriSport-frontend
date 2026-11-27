import { InteractivityChecker } from '@angular/cdk/a11y';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideLucideIcons } from '@lucide/angular';
import { of, throwError } from 'rxjs';

import { LayoutService } from '@core/layout/layout.service';
import type { ConversacionResumenResponse, InsightResponse, MensajeAsistente } from '@core/models';
import { AsistenteService } from '@core/services/asistente.service';
import { AuthService } from '@core/services/auth.service';
import { aFechaApi } from '@core/util/fechas';
import { environment } from '@env/environment';
import { ICONOS_APP } from '@shared/design/iconos';
import {
  borradorDeInsight,
  datosConsultados,
  fechaConversacion,
  filtrarConversaciones,
  restriccionesActivas,
  tituloConversacion,
} from './asistente';
import { rutaAsistente } from '../../app.routes';
import { AsistenteComponent } from './asistente.component';
import { AsistenteStore } from './asistente.store';

const API = `${environment.apiUrl}/asistente`;

const resumen = (id: string, cambios: Partial<ConversacionResumenResponse> = {}): ConversacionResumenResponse => ({
  id,
  titulo: `Conversación ${id}`,
  archivada: false,
  ultimoMensajeEn: null,
  vistaPrevia: null,
  ...cambios,
});

const respuesta = (id: string, contenido: string, herramientas: string[] = []): MensajeAsistente => ({
  id,
  rol: 'ASISTENTE',
  contenido,
  herramientasUsadas: herramientas,
  valoracion: null,
  creadoEn: '2026-11-27T16:42:00+01:00',
});

describe('lógica del asistente', () => {
  it('datos consultados legibles y sin repetir', () => {
    expect(datosConsultados(['comidas', 'resumenDiario', 'comidas', 'planSemanal'])).toEqual([
      'Comidas',
      'Resumen del día',
      'Plan semanal',
    ]);
  });

  it('restricciones activas: alergias, intolerancias y dietas (no gustos ni favoritos)', () => {
    expect(
      restriccionesActivas([
        { tipo: 'ALERGIA', alergeno: 'CACAHUETES', severidad: 'ESTRICTA' },
        { tipo: 'INTOLERANCIA', intolerancia: 'LACTOSA', severidad: 'ESTRICTA' },
        { tipo: 'DIETA', dieta: 'VEGETARIANA', severidad: 'ESTRICTA' },
        { tipo: 'RECHAZO', alimentoId: 'a', severidad: 'PREFERENCIA' },
        { tipo: 'FAVORITO', alimentoId: 'b', severidad: 'PREFERENCIA' },
      ]),
    ).toEqual(['Alergia: Cacahuetes', 'Intolerancia a la lactosa', 'Dieta vegetariana']);
  });

  it('fecha de la lista: hora hoy, "Ayer" y día y mes', () => {
    const ahora = new Date(2026, 10, 27, 18, 0);
    const iso = (d: Date) => d.toISOString();
    expect(fechaConversacion(iso(new Date(2026, 10, 27, 16, 42)), ahora)).toBe('16:42');
    expect(fechaConversacion(iso(new Date(2026, 10, 26, 9, 0)), ahora)).toBe('Ayer');
    expect(fechaConversacion(iso(new Date(2026, 10, 21, 9, 0)), ahora)).toBe('21 nov');
    expect(fechaConversacion(null, ahora)).toBe('');
    expect(aFechaApi(ahora)).toBe('2026-11-27');
  });

  it('búsqueda en el cliente sobre título y vista previa, sin tildes ni mayúsculas', () => {
    const lista = [
      resumen('a', { titulo: 'Proteína y merienda', vistaPrevia: 'Tostadas con plátano' }),
      resumen('b', { titulo: 'Cenas rápidas', vistaPrevia: 'Te propongo 5 cenas' }),
      resumen('c', { titulo: null, vistaPrevia: null }),
    ];
    expect(filtrarConversaciones(lista, 'PROTEINA').map((c) => c.id)).toEqual(['a']);
    expect(filtrarConversaciones(lista, 'platano').map((c) => c.id)).toEqual(['a']);
    expect(filtrarConversaciones(lista, '  ').map((c) => c.id)).toEqual(['a', 'b', 'c']);
    expect(tituloConversacion(null)).toBe('Conversación nueva');
  });

  it('borrador de un insight', () => {
    const insight: InsightResponse = {
      id: 'i',
      tipo: 'PROTEINA_BAJA',
      severidad: 'ADVERTENCIA',
      titulo: null,
      texto: 'Tomas 20 g menos de proteína de lo recomendado.',
      periodoDesde: null,
      periodoHasta: null,
      creadoEn: '2026-11-27T03:00:00+01:00',
    };
    expect(borradorDeInsight(insight)).toBe(
      'Sobre el patrón «Proteína por debajo de tu objetivo»: Tomas 20 g menos de proteína de lo recomendado.\n\n¿Qué me recomiendas?',
    );
  });
});

describe('AsistenteStore (lista y bloqueos)', () => {
  function crear(servicio: Record<string, unknown>) {
    TestBed.configureTestingModule({
      providers: [
        AsistenteStore,
        {
          provide: AsistenteService,
          useValue: {
            conversaciones: vi.fn(() =>
              of({ content: [resumen('c-1'), resumen('c-2')], page: 0, size: 50, totalElements: 2, totalPages: 1 }),
            ),
            ...servicio,
          },
        },
      ],
    });
    return TestBed.inject(AsistenteStore);
  }

  it('403 EMAIL_NO_VERIFICADO bloquea el envío', async () => {
    const store = crear({
      crear: vi.fn(() => of({ id: 'c-1', titulo: null, archivada: false, mensajes: [] })),
      enviar: vi.fn(() =>
        throwError(
          () =>
            new HttpErrorResponse({
              status: 403,
              error: { status: 403, codigo: 'EMAIL_NO_VERIFICADO', title: 'Email', detail: 'Verifica tu email.' },
            }),
        ),
      ),
    });
    await store.enviar('Hola');
    expect(store.bloqueo()).toEqual({ tipo: 'email' });
    expect(store.mensajes()[0]).toMatchObject({ estado: 'error', error: 'Verifica tu email para usar el asistente.' });
  });

  it('archivar saca la conversación de la pestaña; eliminar la activa deja una nueva', async () => {
    const store = crear({
      actualizar: vi.fn(() => of({ id: 'c-1', titulo: 'Conversación c-1', archivada: true, mensajes: [] })),
      eliminar: vi.fn(() => of(undefined)),
      detalle: vi.fn(() => of({ id: 'c-2', titulo: 'Conversación c-2', archivada: false, mensajes: [] })),
    });
    await store.cargarConversaciones();
    await store.actualizar('c-1', { archivada: true });
    expect(store.conversaciones().map((c) => c.id)).toEqual(['c-2']);

    await store.abrir('c-2');
    await store.eliminar('c-2');
    expect(store.conversaciones()).toEqual([]);
    expect(store.conversacion()).toBeNull();
  });

  it('la pestaña Archivadas pide las archivadas', async () => {
    const conversaciones = vi.fn(() => of({ content: [], page: 0, size: 50, totalElements: 0, totalPages: 0 }));
    const store = crear({ conversaciones });
    await store.mostrarArchivadas(true);
    expect(conversaciones).toHaveBeenCalledWith({ archivada: true, page: 0, size: 50 });
  });
});

describe('AsistenteComponent', () => {
  let http: HttpTestingController;
  const cuenta = signal({ nombre: 'Álex', email: 'alex@example.com', emailVerificado: true });

  beforeEach(() => {
    cuenta.set({ nombre: 'Álex', email: 'alex@example.com', emailVerificado: true });
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ matcher: rutaAsistente, component: AsistenteComponent }], withComponentInputBinding()),
        provideLucideIcons(...ICONOS_APP),
        // Escritorio sin xl: lista a la izquierda y contexto en drawer (no se pide hasta abrirlo).
        {
          provide: LayoutService,
          useValue: {
            esMovil: signal(false),
            esTablet: signal(false),
            esEscritorio: signal(true),
            esXl: signal(false),
          },
        },
        { provide: AuthService, useValue: { cuenta, reenviarVerificacion: vi.fn(() => of({ mensaje: 'ok' })) } },
        {
          provide: InteractivityChecker,
          useValue: { isFocusable: () => true, isTabbable: () => true, isVisible: () => true, isDisabled: () => false },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  const lista = (content: ConversacionResumenResponse[]) =>
    http
      .match((r) => r.url === `${API}/conversaciones` && r.method === 'GET')
      .forEach((r) => r.flush({ content, page: 0, size: 50, totalElements: content.length, totalPages: 1 }));
  const sugerencias = (s: string[] = ['Resumen de mi semana']) =>
    http.match(`${API}/sugerencias`).forEach((r) => r.flush(s));

  async function abrir(url = '/asistente') {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    return { harness, el: () => harness.routeNativeElement! };
  }

  /** Deja correr las peticiones y promesas encadenadas (whenStable esperaría a las pendientes). */
  const tick = async (harness: RouterTestingHarness) => {
    await new Promise((r) => setTimeout(r));
    harness.fixture.detectChanges();
  };

  it('conversación nueva: sugerencias, el primer mensaje crea la conversación, pasa a la URL y se anuncia', async () => {
    const { harness, el } = await abrir();
    lista([resumen('vieja')]);
    sugerencias();
    await harness.fixture.whenStable();
    expect(el().textContent).toContain('Conversación vieja');
    expect(el().querySelector('.ns-composer__chip')!.textContent).toContain('Resumen de mi semana');

    (el().querySelector('.ns-composer__chip') as HTMLButtonElement).click();
    await tick(harness);
    // Mensaje optimista al momento.
    expect(el().querySelector('ns-chat-message')!.textContent).toContain('Resumen de mi semana');
    http.expectOne({ method: 'POST', url: `${API}/conversaciones` }).flush({
      id: 'c-1',
      titulo: null,
      archivada: false,
      mensajes: [],
    });
    await tick(harness);
    expect(el().textContent).toContain('Escribiendo…');
    const envio = http.expectOne({ method: 'POST', url: `${API}/conversaciones/c-1/mensajes` });
    expect(envio.request.body).toEqual({ contenido: 'Resumen de mi semana' });
    envio.flush(respuesta('r-1', 'Esta semana cumpliste **5 de 7** días.', ['tendencias']));
    await tick(harness);
    lista([resumen('c-1', { titulo: 'Resumen de mi semana' }), resumen('vieja')]);
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/asistente/c-1');
    const mensajes = [...el().querySelectorAll('ns-chat-message')];
    expect(mensajes).toHaveLength(2);
    expect(mensajes[1].querySelector('strong')!.textContent).toBe('5 de 7');
    expect(mensajes[1].textContent).toContain('Tendencias');
    expect(el().querySelector('[aria-live="polite"]')!.textContent).toContain(
      'El asistente responde: Esta semana cumpliste **5 de 7** días.',
    );
    // La conversación ya estaba en el store: no se vuelve a pedir al cambiar la URL.
    http.expectNone(`${API}/conversaciones/c-1`);
  });

  it('/asistente/:id abre la conversación del servidor', async () => {
    const { harness, el } = await abrir('/asistente/c-9');
    http.expectOne(`${API}/conversaciones/c-9`).flush({
      id: 'c-9',
      titulo: 'Cenas',
      archivada: false,
      mensajes: [{ ...respuesta('u', '¿Qué ceno?'), rol: 'USUARIO' }, respuesta('r', 'Salmón con patata.')],
    });
    lista([resumen('c-9')]);
    await harness.fixture.whenStable();
    expect(el().querySelectorAll('ns-chat-message')).toHaveLength(2);
    expect(el().querySelector('[aria-current="page"]')!.textContent).toContain('Conversación c-9');
    // Con mensajes no hay sugerencias.
    http.expectNone(`${API}/sugerencias`);
  });

  it('503: el mensaje queda con Reintentar', async () => {
    const { harness, el } = await abrir();
    lista([]);
    sugerencias([]);
    await harness.fixture.whenStable();
    const store = harness.routeDebugElement!.injector.get(AsistenteStore);
    void store.enviar('Hola');
    await tick(harness);
    http.expectOne({ method: 'POST', url: `${API}/conversaciones` }).flush({
      id: 'c-1',
      titulo: null,
      archivada: false,
      mensajes: [],
    });
    await tick(harness);
    http
      .expectOne(`${API}/conversaciones/c-1/mensajes`)
      .flush(
        { status: 503, codigo: 'SERVICIO_NO_DISPONIBLE', title: 'IA', detail: 'El asistente no responde ahora.' },
        { status: 503, statusText: 'Service Unavailable' },
      );
    await harness.fixture.whenStable();
    const mensaje = el().querySelector('ns-chat-message')!;
    expect(mensaje.textContent).toContain('El asistente no responde ahora.');
    expect([...mensaje.querySelectorAll('button')].some((b) => b.textContent!.includes('Reintentar'))).toBe(true);
    expect(el().querySelector('[aria-live="polite"]')!.textContent).toContain('No se ha podido enviar el mensaje.');
  });

  it('con el email sin verificar, el compositor está desactivado con "Verifica tu email" y "Reenviar"', async () => {
    cuenta.set({ nombre: 'Álex', email: 'alex@example.com', emailVerificado: false });
    const { harness, el } = await abrir();
    lista([]);
    sugerencias();
    await harness.fixture.whenStable();
    expect(el().textContent).toContain('Verifica tu email');
    expect(el().querySelector('textarea')!.disabled).toBe(true);
    const reenviar = [...el().querySelectorAll('button')].find((b) => b.textContent!.includes('Reenviar'))!;
    reenviar.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(AuthService).reenviarVerificacion).toHaveBeenCalledWith('alex@example.com');
  });

  it('un borrador pendiente (Preguntar al asistente) aparece en el compositor', async () => {
    TestBed.inject(AsistenteService).dejarBorrador('Sobre el patrón «X»: texto');
    const { harness, el } = await abrir();
    lista([]);
    sugerencias();
    await harness.fixture.whenStable();
    expect(el().querySelector('textarea')!.value).toBe('Sobre el patrón «X»: texto');
    expect(TestBed.inject(AsistenteService).tomarBorrador()).toBeNull();
  });
});

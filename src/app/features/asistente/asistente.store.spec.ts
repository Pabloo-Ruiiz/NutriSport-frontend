import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';

import type { ConversacionResponse, MensajeAsistente, Pagina, ConversacionResumenResponse } from '@core/models';
import { AsistenteService } from '@core/services/asistente.service';
import { AsistenteStore, PREFIJO_ID_TEMPORAL } from './asistente.store';

const respuesta = (id: string, contenido = 'Hoy llevas 92 g de proteína.'): MensajeAsistente => ({
  id,
  rol: 'ASISTENTE',
  contenido,
  herramientasUsadas: ['resumen_diario'],
  valoracion: null,
  creadoEn: '2026-11-27T10:00:05+01:00',
});

const usuario = (id: string, contenido: string): MensajeAsistente => ({
  id,
  rol: 'USUARIO',
  contenido,
  herramientasUsadas: [],
  valoracion: null,
  creadoEn: '2026-11-27T10:00:00+01:00',
});

const conversacion = (cambios: Partial<ConversacionResponse> = {}): ConversacionResponse => ({
  id: 'c-1',
  titulo: null,
  archivada: false,
  mensajes: [],
  ...cambios,
});

const pagina = (content: ConversacionResumenResponse[]): Pagina<ConversacionResumenResponse> => ({
  content,
  page: 0,
  size: 50,
  totalElements: content.length,
  totalPages: 1,
});

const error503 = () =>
  new HttpErrorResponse({
    status: 503,
    statusText: 'Service Unavailable',
    error: { status: 503, codigo: 'IA_NO_DISPONIBLE', title: 'IA no disponible', detail: 'El asistente no responde.' },
  });

function crearStore(servicio: Partial<Record<keyof AsistenteService, ReturnType<typeof vi.fn>>>) {
  const mock = {
    conversaciones: vi.fn(() =>
      of(
        pagina([
          { id: 'c-1', titulo: '¿Cuánta proteína llevo?', archivada: false, ultimoMensajeEn: null, vistaPrevia: null },
        ]),
      ),
    ),
    crear: vi.fn(() => of(conversacion())),
    detalle: vi.fn(),
    enviar: vi.fn(),
    valorar: vi.fn(() => of(undefined)),
    ...servicio,
  };
  TestBed.configureTestingModule({ providers: [AsistenteStore, { provide: AsistenteService, useValue: mock }] });
  return { store: TestBed.inject(AsistenteStore), mock };
}

describe('AsistenteStore', () => {
  it('añade al momento el mensaje del usuario como pendiente, con id temporal', async () => {
    const pendiente = new Subject<MensajeAsistente>();
    const { store, mock } = crearStore({ enviar: vi.fn(() => pendiente) });

    const envio = store.enviar('  ¿Cuánta proteína llevo?  ');
    await Promise.resolve(); // la conversación se crea (síncrona en el mock) y sale el envío

    expect(mock.crear).toHaveBeenCalledTimes(1);
    expect(mock.enviar).toHaveBeenCalledWith('c-1', '¿Cuánta proteína llevo?');
    expect(store.enviando()).toBe(true);
    const [m] = store.mensajes();
    expect(m).toMatchObject({ rol: 'USUARIO', contenido: '¿Cuánta proteína llevo?', estado: 'pendiente', error: null });
    expect(m.id.startsWith(PREFIJO_ID_TEMPORAL)).toBe(true);

    pendiente.next(respuesta('r-1'));
    pendiente.complete();
    await envio;
  });

  it('con la respuesta: confirma el mensaje, añade la del asistente y recarga la lista (título)', async () => {
    const { store, mock } = crearStore({ enviar: vi.fn(() => of(respuesta('r-1'))) });

    await store.enviar('¿Cuánta proteína llevo?');

    expect(store.mensajes().map((m) => [m.rol, m.estado])).toEqual([
      ['USUARIO', 'enviado'],
      ['ASISTENTE', 'enviado'],
    ]);
    expect(store.mensajes()[1]).toMatchObject({ id: 'r-1', herramientasUsadas: ['resumen_diario'] });
    expect(store.enviando()).toBe(false);
    await Promise.resolve();
    expect(mock.conversaciones).toHaveBeenCalledWith({ archivada: false, page: 0, size: 50 });
    expect(store.titulo()).toBe('¿Cuánta proteína llevo?');

    // El segundo mensaje va a la misma conversación y ya no recarga la lista.
    await store.enviar('¿Y de hidratos?');
    expect(mock.crear).toHaveBeenCalledTimes(1);
    expect(mock.conversaciones).toHaveBeenCalledTimes(1);
    expect(store.mensajes()).toHaveLength(4);
  });

  it('no envía textos vacíos ni otro mensaje mientras hay uno en curso', async () => {
    const pendiente = new Subject<MensajeAsistente>();
    const { store, mock } = crearStore({ enviar: vi.fn(() => pendiente) });
    await store.enviar('   ');
    expect(store.mensajes()).toEqual([]);

    void store.enviar('Uno');
    await Promise.resolve();
    await store.enviar('Dos');
    expect(store.mensajes().map((m) => m.contenido)).toEqual(['Uno']);
    expect(mock.enviar).toHaveBeenCalledTimes(1);
  });

  it('un 503 marca el mensaje con el error; al reintentar recarga la conversación y lo vuelve a enviar', async () => {
    const enviar = vi
      .fn()
      .mockReturnValueOnce(throwError(error503))
      .mockReturnValueOnce(of(respuesta('r-2')));
    // El servidor guardó el mensaje del usuario sin respuesta.
    const detalle = vi.fn(() =>
      of(conversacion({ titulo: 'Proteína de hoy', mensajes: [usuario('u-1', '¿Cuánta proteína llevo?')] })),
    );
    const { store, mock } = crearStore({ enviar, detalle });

    await store.enviar('¿Cuánta proteína llevo?');

    const [fallido] = store.mensajes();
    expect(fallido).toMatchObject({ estado: 'error', error: 'El asistente no responde.', guardado: true });
    expect(store.enviando()).toBe(false);
    expect(store.mensajes()).toHaveLength(1);

    await store.reintentar(fallido.id);

    expect(mock.detalle).toHaveBeenCalledWith('c-1');
    expect(enviar).toHaveBeenCalledTimes(2);
    expect(enviar).toHaveBeenLastCalledWith('c-1', '¿Cuánta proteína llevo?');
    // La copia guardada sin respuesta no se duplica: queda el reintento y la respuesta.
    expect(store.mensajes().map((m) => [m.rol, m.estado, m.contenido])).toEqual([
      ['USUARIO', 'enviado', '¿Cuánta proteína llevo?'],
      ['ASISTENTE', 'enviado', 'Hoy llevas 92 g de proteína.'],
    ]);
    // Era el primer mensaje: se recarga la lista y el título sale de ella.
    await Promise.resolve();
    expect(mock.conversaciones).toHaveBeenCalledTimes(1);
    expect(store.titulo()).toBe('¿Cuánta proteína llevo?');
  });

  it('un error sin guardar (429) se reintenta sin recargar y muestra cuándo volver a probar', async () => {
    const limite = new HttpErrorResponse({
      status: 429,
      statusText: 'Too Many Requests',
      error: { status: 429, codigo: 'LIMITE_EXCEDIDO', title: 'Límite', detail: 'Has llegado al límite diario.' },
    });
    const enviar = vi
      .fn()
      .mockReturnValueOnce(throwError(() => limite))
      .mockReturnValueOnce(of(respuesta('r-1')));
    const { store, mock } = crearStore({ enviar });

    await store.enviar('Hola');
    const [m] = store.mensajes();
    expect(m.estado).toBe('error');
    expect(m.guardado).toBe(false);
    expect(m.error).toBe('Has llegado al límite de 50 mensajes de hoy. Inténtalo de nuevo más tarde.');
    expect(store.bloqueo()).toEqual({ tipo: 'limite', retryAfterSegundos: null });

    await store.reintentar(m.id);
    expect(mock.detalle).not.toHaveBeenCalled();
    expect(store.mensajes().map((x) => x.estado)).toEqual(['enviado', 'enviado']);
    // Con una respuesta, el bloqueo desaparece.
    expect(store.bloqueo()).toBeNull();
  });

  it('si falla al crear la conversación, el mensaje queda con error y el reintento la crea', async () => {
    const crear = vi.fn().mockReturnValueOnce(throwError(error503)).mockReturnValueOnce(of(conversacion()));
    const { store, mock } = crearStore({ crear, enviar: vi.fn(() => of(respuesta('r-1'))) });

    await store.enviar('Hola');
    expect(store.conversacion()).toBeNull();
    expect(store.mensajes()[0].estado).toBe('error');

    await store.reintentar(store.mensajes()[0].id);
    expect(mock.crear).toHaveBeenCalledTimes(2);
    expect(store.conversacion()?.id).toBe('c-1');
    expect(store.mensajes()).toHaveLength(2);
  });

  it('abrir muestra los mensajes sin los de HERRAMIENTA; nueva vacía la vista', async () => {
    const herramienta: MensajeAsistente = { ...respuesta('h-1'), rol: 'HERRAMIENTA' };
    const { store } = crearStore({
      detalle: vi.fn(() =>
        of(conversacion({ titulo: 'Cena', mensajes: [usuario('u-1', 'Hola'), herramienta, respuesta('r-1')] })),
      ),
    });
    await store.abrir('c-1');
    expect(store.mensajes().map((m) => m.id)).toEqual(['u-1', 'r-1']);
    expect(store.titulo()).toBe('Cena');

    store.nueva();
    expect(store.conversacion()).toBeNull();
    expect(store.vacia()).toBe(true);
  });

  it('valorar cambia al momento y lo deshace si falla', async () => {
    const valorar = vi.fn().mockReturnValueOnce(of(undefined)).mockReturnValueOnce(throwError(error503));
    const { store } = crearStore({
      valorar,
      detalle: vi.fn(() => of(conversacion({ mensajes: [respuesta('r-1')] }))),
    });
    await store.abrir('c-1');

    await store.valorar('r-1', 1);
    expect(valorar).toHaveBeenCalledWith('r-1', 1);
    expect(store.mensajes()[0].valoracion).toBe(1);

    await expect(store.valorar('r-1', -1)).rejects.toThrow();
    expect(store.mensajes()[0].valoracion).toBe(1);
  });
});

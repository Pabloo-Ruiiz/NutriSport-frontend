import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';

import type { MenuResponse, MenuResumenResponse, Pagina } from '@core/models';
import { MenusService } from '@core/services/menus.service';
import { PlanificadorStore, desdeParaSemana, diasEnSemana, menusDeLaSemana } from './planificador.store';

const resumen = (cambios: Partial<MenuResumenResponse>): MenuResumenResponse => ({
  id: 'm',
  nombre: 'Menú',
  tipo: 'SEMANAL',
  fechaInicio: '2026-11-23',
  fechaFin: '2026-11-29',
  favorito: false,
  estado: 'ACTIVO',
  generadoAutomaticamente: true,
  numeroComidas: 0,
  ...cambios,
});

const detalle = (r: MenuResumenResponse, cambios: Partial<MenuResponse> = {}): MenuResponse => ({
  id: r.id,
  nombre: r.nombre,
  tipo: r.tipo,
  fechaInicio: r.fechaInicio,
  fechaFin: r.fechaFin,
  favorito: r.favorito,
  estado: r.estado,
  generadoAutomaticamente: r.generadoAutomaticamente,
  explicacion: null,
  dias: [],
  resumen: { mediaKcal: 0, ajustePorcentaje: 0, proteinaMedia: 0 },
  ...cambios,
});

const pagina = (content: MenuResumenResponse[]): Pagina<MenuResumenResponse> => ({
  content,
  page: 0,
  size: 50,
  totalElements: content.length,
  totalPages: 1,
});

// Semana del lunes 23 al domingo 29 de noviembre de 2026.
const LUNES = '2026-11-23';
const SEMANAL = resumen({ id: 'semanal' });
const DIARIO = resumen({ id: 'diario', tipo: 'DIARIO', fechaInicio: '2026-11-25', fechaFin: '2026-11-25' });
const BORRADOR = resumen({ id: 'borrador', estado: 'BORRADOR' });
const ARCHIVADO = resumen({ id: 'archivado', estado: 'ARCHIVADO' });
// Jueves a miércoles: 4 días en la semana del 23 y 3 en la siguiente.
const CRUZADO = resumen({ id: 'cruzado', fechaInicio: '2026-11-26', fechaFin: '2026-12-02' });
const SIGUIENTE = resumen({ id: 'siguiente', fechaInicio: '2026-11-30', fechaFin: '2026-12-06' });

describe('selección del menú de la semana', () => {
  it('diasEnSemana cuenta los días que se solapan con la semana', () => {
    expect(diasEnSemana(SEMANAL, LUNES)).toBe(7);
    expect(diasEnSemana(DIARIO, LUNES)).toBe(1);
    expect(diasEnSemana(CRUZADO, LUNES)).toBe(4);
    expect(diasEnSemana(CRUZADO, '2026-11-30')).toBe(3);
    expect(diasEnSemana(SIGUIENTE, LUNES)).toBe(0);
    expect(diasEnSemana(resumen({ fechaInicio: '2026-11-16', fechaFin: '2026-11-22' }), LUNES)).toBe(0);
  });

  it('descarta los menús de otras semanas', () => {
    expect(menusDeLaSemana([SIGUIENTE], LUNES)).toEqual([]);
  });

  it('prefiere ACTIVO a BORRADOR y BORRADOR a ARCHIVADO', () => {
    expect(menusDeLaSemana([ARCHIVADO, BORRADOR, DIARIO], LUNES).map((m) => m.id)).toEqual([
      'diario',
      'borrador',
      'archivado',
    ]);
  });

  it('con el mismo estado, prefiere el que cubre más días y luego el que empieza más tarde', () => {
    expect(menusDeLaSemana([DIARIO, CRUZADO, SEMANAL], LUNES).map((m) => m.id)).toEqual([
      'semanal',
      'cruzado',
      'diario',
    ]);
    const otroDiario = resumen({ id: 'otro', tipo: 'DIARIO', fechaInicio: '2026-11-27', fechaFin: '2026-11-27' });
    expect(menusDeLaSemana([DIARIO, otroDiario], LUNES).map((m) => m.id)).toEqual(['otro', 'diario']);
  });

  it('desdeParaSemana pide desde 6 días antes del lunes (un menú dura como mucho 7 días)', () => {
    expect(desdeParaSemana(LUNES)).toBe('2026-11-17');
    expect(diasEnSemana(resumen({ fechaInicio: '2026-11-17', fechaFin: '2026-11-23' }), LUNES)).toBe(1);
  });

  it('un menú que cruza dos semanas aparece en las dos', () => {
    expect(menusDeLaSemana([CRUZADO, SIGUIENTE], '2026-11-30').map((m) => m.id)).toEqual(['siguiente', 'cruzado']);
  });
});

describe('PlanificadorStore', () => {
  let servicio: { listar: ReturnType<typeof vi.fn>; detalle: ReturnType<typeof vi.fn> };
  let store: PlanificadorStore;

  const detalles: Record<string, MenuResponse> = Object.fromEntries(
    [SEMANAL, DIARIO, BORRADOR, CRUZADO, SIGUIENTE].map((r) => [r.id, detalle(r)]),
  );

  beforeEach(() => {
    servicio = {
      listar: vi.fn(() => of(pagina([SIGUIENTE, CRUZADO, DIARIO, BORRADOR]))),
      detalle: vi.fn((id: string) => of(detalles[id])),
    };
    TestBed.configureTestingModule({ providers: [PlanificadorStore, { provide: MenusService, useValue: servicio }] });
    store = TestBed.inject(PlanificadorStore);
    store.semana.set(LUNES);
  });

  it('empieza en el lunes de la semana actual', () => {
    const nuevo = TestBed.runInInjectionContext(() => new PlanificadorStore());
    expect(new Date(`${nuevo.semana()}T12:00:00`).getDay()).toBe(1);
    expect(nuevo.diasSemana()).toHaveLength(7);
  });

  it('cargar pide 50 menús desde la semana visible y selecciona el preferido', () => {
    store.cargar();
    expect(servicio.listar).toHaveBeenCalledWith({ desde: '2026-11-17', page: 0, size: 50 });
    expect(store.menusSemana().map((m) => m.id)).toEqual(['cruzado', 'diario', 'borrador']);
    expect(servicio.detalle).toHaveBeenCalledWith('cruzado');
    expect(store.menu()?.id).toBe('cruzado');
    expect(store.cargando()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('sin menús en la semana, no hay menú seleccionado', () => {
    servicio.listar.mockReturnValue(of(pagina([SIGUIENTE])));
    store.cargar();
    expect(store.menu()).toBeNull();
    expect(servicio.detalle).not.toHaveBeenCalled();
    expect(store.cargando()).toBe(false);
  });

  it('al cambiar de semana pide sus menús y selecciona el de esa semana (o ninguno)', () => {
    store.cargar();
    store.semanaSiguiente();
    expect(store.semana()).toBe('2026-11-30');
    expect(servicio.listar).toHaveBeenLastCalledWith({ desde: '2026-11-24', page: 0, size: 50 });
    expect(store.menu()?.id).toBe('siguiente');

    store.irASemana('2026-12-10'); // jueves → lunes 7
    expect(store.semana()).toBe('2026-12-07');
    expect(store.menu()).toBeNull();

    store.irASemana('2026-11-29'); // domingo → lunes 23
    expect(store.semana()).toBe(LUNES);
    expect(store.menu()?.id).toBe('cruzado');
  });

  it('no vuelve a pedir el detalle si el menú elegido ya es el seleccionado', () => {
    store.cargar();
    servicio.detalle.mockClear();
    store.irASemana('2026-11-25'); // misma semana: no hace nada
    store.semanaSiguiente();
    store.semanaAnterior();
    expect(servicio.detalle.mock.calls.map(([id]) => id)).toEqual(['siguiente', 'cruzado']);
  });

  it('seleccionar cancela la petición anterior y se queda con la última', () => {
    const lento = new Subject<MenuResponse>();
    servicio.detalle.mockImplementation((id: string) => (id === 'diario' ? lento : of(detalles[id])));
    store.seleccionar('diario');
    expect(store.cargando()).toBe(true);
    store.seleccionar('borrador');
    lento.next(detalles['diario']);
    expect(store.menu()?.id).toBe('borrador');
    expect(store.cargando()).toBe(false);
  });

  it('guarda el error y deja de cargar si falla la lista o el detalle', () => {
    servicio.listar.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    store.cargar();
    expect(store.error()).toBeTruthy();
    expect(store.cargando()).toBe(false);

    servicio.listar.mockReturnValue(of(pagina([SEMANAL])));
    servicio.detalle.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    store.cargar();
    expect(store.error()).toBeTruthy();
    expect(store.cargando()).toBe(false);
  });

  it('reemplazarMenu aplica la respuesta del servidor tal cual y actualiza su resumen', () => {
    store.cargar();
    const editado = detalle(CRUZADO, {
      nombre: 'Renombrado',
      favorito: true,
      dias: [
        {
          fecha: '2026-11-26',
          objetivo: null,
          planificado: { kcal: 612, proteina: 40, carbohidratos: 50, grasa: 20 },
          porcentajeObjetivo: 0,
          diaEntreno: false,
          comidas: [{ id: 'c1' } as MenuResponse['dias'][number]['comidas'][number]],
        },
      ],
      resumen: { mediaKcal: 612, ajustePorcentaje: 3, proteinaMedia: 40 },
    });
    servicio.detalle.mockClear();
    store.reemplazarMenu(editado);

    expect(store.menu()).toBe(editado);
    expect(servicio.detalle).not.toHaveBeenCalled();
    const r = store.menus().find((m) => m.id === 'cruzado');
    expect(r).toMatchObject({ nombre: 'Renombrado', favorito: true, numeroComidas: 1 });
    expect(store.menus()).toHaveLength(4);
  });

  it('reemplazarMenu añade un menú nuevo y va a su semana si no cae en la visible', () => {
    store.cargar();
    const nuevo = resumen({ id: 'nuevo', estado: 'BORRADOR', fechaInicio: '2026-12-14', fechaFin: '2026-12-20' });
    const otro = resumen({ id: 'otro', fechaInicio: '2026-12-14', fechaFin: '2026-12-20' });
    const generado = detalle(nuevo);
    servicio.listar.mockReturnValue(of(pagina([nuevo, otro])));
    servicio.detalle.mockClear();

    store.reemplazarMenu(generado);
    expect(store.semana()).toBe('2026-12-14');
    expect(servicio.listar).toHaveBeenLastCalledWith({ desde: '2026-12-08', page: 0, size: 50 });
    // Se queda con el menú nuevo aunque haya otro preferido en esa semana, sin volver a pedirlo.
    expect(store.menu()).toBe(generado);
    expect(servicio.detalle).not.toHaveBeenCalled();
    expect(store.menusSemana().map((m) => m.id)).toEqual(['otro', 'nuevo']);
  });

  it('quitarMenu quita el menú y, si era el seleccionado, selecciona el siguiente de la semana', () => {
    store.cargar();
    store.quitarMenu('diario');
    expect(store.menu()?.id).toBe('cruzado');
    expect(store.menus().map((m) => m.id)).not.toContain('diario');

    store.quitarMenu('cruzado');
    expect(store.menu()?.id).toBe('borrador');
    store.quitarMenu('borrador');
    expect(store.menu()).toBeNull();
  });
});

import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideLucideIcons } from '@lucide/angular';
import { Subject, of, throwError } from 'rxjs';

import { LayoutService } from '@core/layout/layout.service';
import type {
  AlternativaResponse,
  ComidaPlanificadaResponse,
  DiaMenuResponse,
  MenuResponse,
  TipoComida,
} from '@core/models';
import { MenusService } from '@core/services/menus.service';
import { hoyLocal, sumarDias } from '@core/util/fechas';
import { formatearKcal } from '@shared/pipes/formato';
import { ICONOS_APP } from '@shared/design/iconos';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import { NsConfirmService } from '@shared/ui/overlay/confirm.service';
import { NsDialogService } from '@shared/ui/overlay/dialog.service';
import { AlternativasPanelComponent } from './componentes/alternativas-panel.component';
import {
  AnadirRecetaDrawerComponent,
  DEBOUNCE_RECETAS_DISPONIBLES_MS,
  racionesValidas,
  textoHueco,
} from './componentes/anadir-receta-drawer.component';
import { MealSlotComponent } from './componentes/meal-slot.component';
import { WeekPlannerComponent } from './componentes/week-planner.component';
import { formatearDelta } from './planificador';
import { ALTERNATIVAS_DATA, PlanificadorEditor } from './planificador-editor';
import { PlanificadorStore } from './planificador.store';

// ---- Datos

const LUNES = '2026-11-23';
const N = { kcal: 0, proteina: 0, carbohidratos: 0, grasa: 0 };

function comida(
  id: string,
  fecha: string,
  tipoComida: TipoComida | null,
  cambios: Partial<ComidaPlanificadaResponse> = {},
): ComidaPlanificadaResponse {
  return {
    id,
    fecha,
    tipoComida,
    receta: { id: `r-${id}`, nombre: `Receta ${id}` } as ComidaPlanificadaResponse['receta'],
    raciones: 1,
    nutrientes: { kcal: 690, proteina: 42, carbohidratos: 60, grasa: 20 },
    bloqueada: false,
    consumida: false,
    ...cambios,
  };
}

function dia(
  fecha: string,
  comidas: ComidaPlanificadaResponse[],
  cambios: Partial<DiaMenuResponse> = {},
): DiaMenuResponse {
  return {
    fecha,
    objetivo: { fecha, base: N, kcalEntreno: 0, total: { kcal: 2680, proteina: 150, carbohidratos: 300, grasa: 80 } },
    planificado: { kcal: 2122, proteina: 112, carbohidratos: 277, grasa: 70 },
    porcentajeObjetivo: 79,
    diaEntreno: true,
    comidas,
    ...cambios,
  };
}

function menu(cambios: Partial<MenuResponse> = {}): MenuResponse {
  return {
    id: 'm1',
    nombre: 'Semana',
    tipo: 'SEMANAL',
    fechaInicio: LUNES,
    fechaFin: sumarDias(LUNES, 6),
    favorito: false,
    estado: 'ACTIVO',
    generadoAutomaticamente: true,
    explicacion: null,
    dias: [0, 1, 2, 3, 4, 5, 6].map((i) => {
      const f = sumarDias(LUNES, i);
      return dia(
        f,
        i === 5 ? [comida('d5', f, 'DESAYUNO')] : [comida(`d${i}`, f, 'DESAYUNO'), comida(`c${i}`, f, 'CENA')],
      );
    }),
    resumen: { mediaKcal: 2400, ajustePorcentaje: 100, proteinaMedia: 140 },
    ...cambios,
  };
}

function alternativa(
  id: string,
  kcal: number,
  proteina: number,
  raciones = 1,
  pct: number | null = 1,
): AlternativaResponse {
  return {
    receta: {
      id,
      nombre: `Alt ${id}`,
      origen: 'PROPIA',
      estadoNutricional: 'COMPLETO',
    } as AlternativaResponse['receta'],
    raciones,
    nutrientes: { kcal, proteina, carbohidratos: 50, grasa: 20 },
    diferenciaKcalPct: pct,
  };
}

const error = (status: number, codigo: string, detail = 'Detalle del servidor') =>
  throwError(() => new HttpErrorResponse({ status, error: { codigo, detail, title: 'Error' } }));

// ---- Montaje común

type ServicioMock = Record<
  | 'listar'
  | 'detalle'
  | 'anadirComida'
  | 'cambiarComida'
  | 'quitarComida'
  | 'registrarComida'
  | 'regenerar'
  | 'alternativas'
  | 'recetasDisponibles',
  ReturnType<typeof vi.fn>
>;

let servicio: ServicioMock;
let store: PlanificadorStore;
let editor: PlanificadorEditor;
const toast = { exito: vi.fn(), error: vi.fn(), info: vi.fn() };
const confirmar = vi.fn();
const abrirDialogo = vi.fn();
const cerrarAlternativas = vi.fn();
/** Comida del panel de alternativas (ALTERNATIVAS_DATA se lee al crear el componente). */
let comidaAlternativas: ComidaPlanificadaResponse | null = null;
const esMovil = signal(false);

beforeEach(() => {
  vi.clearAllMocks();
  esMovil.set(false);
  const m = menu();
  servicio = {
    listar: vi.fn(() => of({ content: [], page: 0, size: 50, totalElements: 0, totalPages: 0 })),
    detalle: vi.fn(() => of(m)),
    anadirComida: vi.fn(),
    cambiarComida: vi.fn(),
    quitarComida: vi.fn(() => of(undefined)),
    registrarComida: vi.fn(() => of({ id: 'reg' })),
    regenerar: vi.fn(),
    alternativas: vi.fn(() => of([])),
    recetasDisponibles: vi.fn(() => of([])),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideLucideIcons(...ICONOS_APP),
      PlanificadorStore,
      PlanificadorEditor,
      { provide: MenusService, useValue: servicio },
      { provide: NsToastService, useValue: toast },
      { provide: NsConfirmService, useValue: { confirmar } },
      { provide: NsDialogService, useValue: { open: abrirDialogo } },
      { provide: LayoutService, useValue: { esMovil } },
      { provide: ALTERNATIVAS_DATA, useFactory: () => ({ comida: comidaAlternativas, cerrar: cerrarAlternativas }) },
    ],
  });
  store = TestBed.inject(PlanificadorStore);
  editor = TestBed.inject(PlanificadorEditor);
  store.semana.set(LUNES);
  store.menu.set(m);
});

afterEach(() => document.querySelector('.cdk-overlay-container')?.replaceChildren());

const comidaDe = (id: string) =>
  store
    .menu()!
    .dias.flatMap((d) => d.comidas)
    .find((c) => c.id === id)!;

// ---- Funciones

describe('Funciones de edición', () => {
  it('textoHueco: objetivo − planificado, redondeado a 10 kcal (al sustituir, sin la comida actual)', () => {
    const d = dia(LUNES, []);
    expect(textoHueco(d)).toBe(`faltan ≈ ${formatearKcal(560)}`);
    expect(textoHueco(d, 690)).toBe(`faltan ≈ ${formatearKcal(1250)}`);
    expect(textoHueco(dia(LUNES, [], { planificado: { ...N, kcal: 2800 } }))).toBe('objetivo cubierto (+120 kcal)');
    expect(textoHueco(dia(LUNES, [], { objetivo: null }))).toBeNull();
  });

  it('formatearDelta con signo', () => {
    expect(formatearDelta(20)).toBe('+20');
    expect(formatearDelta(-10)).toBe('−10');
    expect(formatearDelta(0.2)).toBe('±0');
    expect(formatearDelta(5.56, 1)).toBe('+5,6');
  });

  it('racionesValidas: > 0 y ≤ 10', () => {
    expect([0, -1, 10.5, NaN, null].map(racionesValidas)).toEqual([false, false, false, false, false]);
    expect([0.25, 1, 10].map(racionesValidas)).toEqual([true, true, true]);
  });
});

// ---- Editor

describe('PlanificadorEditor', () => {
  it('añadir aplica el menú que devuelve el servidor', async () => {
    const respuesta = menu({ nombre: 'Con cena' });
    servicio.anadirComida.mockReturnValue(of(respuesta));
    const req = { recetaId: 'r9', fecha: LUNES, tipoComida: 'CENA' as const, raciones: 1.5 };
    expect(await editor.anadir(req)).toBe(true);
    expect(servicio.anadirComida).toHaveBeenCalledWith('m1', req);
    expect(store.menu()).toBe(respuesta);
    expect(toast.exito).toHaveBeenCalledWith('Receta añadida');
  });

  it('bloquear y desbloquear envían PUT { bloqueada }', async () => {
    servicio.cambiarComida.mockReturnValue(of(menu()));
    await editor.cambiarBloqueo(comidaDe('d0'));
    expect(servicio.cambiarComida).toHaveBeenLastCalledWith('m1', 'd0', { bloqueada: true });
    await editor.cambiarBloqueo({ ...comidaDe('d0'), bloqueada: true });
    expect(servicio.cambiarComida).toHaveBeenLastCalledWith('m1', 'd0', { bloqueada: false });
  });

  it('quitar (204) y registrar vuelven a pedir el menú', async () => {
    await editor.quitar(comidaDe('d0'));
    expect(servicio.quitarComida).toHaveBeenCalledWith('m1', 'd0');
    expect(servicio.detalle).toHaveBeenCalledTimes(1);

    await editor.registrar(comidaDe('c0'));
    expect(servicio.registrarComida).toHaveBeenCalledWith('m1', 'c0', undefined);
    expect(servicio.detalle).toHaveBeenCalledTimes(2);
    expect(toast.exito).toHaveBeenCalledWith('Comida registrada');
  });

  it('mover en la vista lo cambia al momento y lo revierte si falla', async () => {
    const original = store.menu();
    const respuesta = new Subject<MenuResponse>();
    servicio.cambiarComida.mockReturnValue(respuesta);
    const destino = { fecha: sumarDias(LUNES, 5), tipoComida: 'CENA' as const };

    const promesa = editor.mover(comidaDe('c0'), destino, true);
    expect(servicio.cambiarComida).toHaveBeenCalledWith('m1', 'c0', destino);
    expect(store.menu()!.dias[0].comidas.map((c) => c.id)).toEqual(['d0']);
    expect(store.menu()!.dias[5].comidas.map((c) => c.id)).toEqual(['d5', 'c0']);
    // No recalcula nada: las cifras del día siguen siendo las del servidor.
    expect(store.menu()!.dias[5].planificado).toEqual(original!.dias[5].planificado);

    respuesta.error(new HttpErrorResponse({ status: 500 }));
    expect(await promesa).toBe(false);
    expect(store.menu()).toBe(original);
    expect(toast.error).toHaveBeenCalledWith('No se ha podido mover la comida', expect.any(String));
  });

  it('mover al mismo sitio no hace nada', async () => {
    expect(await editor.mover(comidaDe('c0'), { fecha: LUNES, tipoComida: 'CENA' })).toBe(false);
    expect(servicio.cambiarComida).not.toHaveBeenCalled();
  });

  it('409 COMIDA_CONSUMIDA → toast con el detalle y recarga del menú', async () => {
    servicio.cambiarComida.mockReturnValue(error(409, 'COMIDA_CONSUMIDA', 'La comida ya está consumida.'));
    expect(await editor.sustituir(comidaDe('c0'), 'r9', 1)).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('No se ha podido sustituir la comida', 'La comida ya está consumida.');
    expect(servicio.detalle).toHaveBeenCalledWith('m1');
  });

  it('422 de reglas → toast con el detalle y recarga; otros errores no recargan', async () => {
    servicio.anadirComida.mockReturnValue(error(422, 'RECETA_INCOMPATIBLE', 'No cumple tus restricciones.'));
    await editor.anadir({ recetaId: 'r9', fecha: LUNES, tipoComida: 'CENA', raciones: 1 });
    expect(toast.error).toHaveBeenCalledWith('No se ha podido añadir la receta', 'No cumple tus restricciones.');
    expect(servicio.detalle).toHaveBeenCalledTimes(1);

    servicio.anadirComida.mockReturnValue(error(400, 'VALIDACION', 'Fecha fuera del menú.'));
    await editor.anadir({ recetaId: 'r9', fecha: LUNES, tipoComida: 'CENA', raciones: 1 });
    expect(servicio.detalle).toHaveBeenCalledTimes(1);
  });

  it('regenerar pide confirmación y aplica la respuesta', async () => {
    confirmar.mockResolvedValue(false);
    expect(await editor.regenerar()).toBe(false);
    expect(servicio.regenerar).not.toHaveBeenCalled();
    expect(confirmar).toHaveBeenCalledWith(
      expect.objectContaining({
        mensaje: expect.stringContaining('Se mantendrán las comidas bloqueadas y las ya consumidas'),
      }),
    );

    const regenerado = menu({ nombre: 'Regenerado' });
    servicio.regenerar.mockReturnValue(of(regenerado));
    confirmar.mockResolvedValue(true);
    expect(await editor.regenerar()).toBe(true);
    expect(servicio.regenerar).toHaveBeenCalledWith('m1');
    expect(store.menu()).toBe(regenerado);
  });

  it('"Mover a…" abre el diálogo con los días del menú y mueve al destino elegido', async () => {
    const destino = { fecha: sumarDias(LUNES, 2), tipoComida: 'COMIDA' as const };
    abrirDialogo.mockReturnValue({ closed: of(destino) });
    servicio.cambiarComida.mockReturnValue(of(menu()));
    await editor.abrirMover(comidaDe('c0'));
    expect(abrirDialogo.mock.calls[0][1].data.fechas).toHaveLength(7);
    expect(servicio.cambiarComida).toHaveBeenCalledWith('m1', 'c0', destino);
  });

  it('ver receta navega a /recetas/{id}', () => {
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    editor.verReceta(comidaDe('c0'));
    expect(navegar).toHaveBeenCalledWith(['/recetas', 'r-c0']);
  });
});

// ---- Meal slot

describe('MealSlotComponent · acciones', () => {
  async function abrirMenu(c: ComidaPlanificadaResponse): Promise<HTMLButtonElement[]> {
    const fixture = TestBed.createComponent(MealSlotComponent);
    fixture.componentRef.setInput('comida', c);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.ns-slot__mas') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    return [...document.querySelectorAll<HTMLButtonElement>('.ns-menu__item')];
  }
  const textos = (items: HTMLButtonElement[]) => items.map((b) => b.textContent?.trim());

  it('tiene todas las acciones; Registrar solo hasta mañana', async () => {
    const items = await abrirMenu(comida('x', hoyLocal(), 'CENA'));
    expect(textos(items)).toEqual([
      'Sustituir',
      'Pedir sugerencia IA',
      'Bloquear',
      'Mover a…',
      'Registrar como consumida',
      'Ver receta',
      'Añadir ingredientes a la lista',
      'Quitar',
    ]);
    expect(items[4].getAttribute('aria-disabled')).not.toBe('true');
  });

  it('una comida futura (después de mañana) no se puede registrar', async () => {
    const items = await abrirMenu(comida('x', sumarDias(hoyLocal(), 3), 'CENA', { bloqueada: true }));
    expect(items[2].textContent).toContain('Desbloquear');
    expect(items[4].getAttribute('aria-disabled')).toBe('true');
  });

  it('una comida consumida solo permite Ver receta', async () => {
    const items = await abrirMenu(comida('x', LUNES, 'CENA', { consumida: true }));
    expect(textos(items)).toEqual(['Ver receta']);
  });

  it('Quitar llama al editor', async () => {
    const quitar = vi.spyOn(editor, 'quitar').mockResolvedValue(true);
    const items = await abrirMenu(comida('x', LUNES, 'CENA'));
    items.find((b) => b.textContent?.includes('Quitar'))!.click();
    expect(quitar).toHaveBeenCalledWith(expect.objectContaining({ id: 'x' }));
  });
});

// ---- Rejilla

describe('WeekPlannerComponent · edición', () => {
  function crear(): ComponentFixture<WeekPlannerComponent> {
    const fixture = TestBed.createComponent(WeekPlannerComponent);
    fixture.componentRef.setInput('menu', store.menu());
    fixture.componentRef.setInput('semana', LUNES);
    fixture.detectChanges();
    return fixture;
  }

  it('las franjas vacías del menú tienen "Añadir receta", que abre el drawer', () => {
    const fixture = crear();
    const botones = fixture.nativeElement.querySelectorAll('.ns-wp__anadir') as NodeListOf<HTMLButtonElement>;
    // 7 comidas y 7 meriendas vacías, y la cena del sábado.
    expect(botones).toHaveLength(15);
    botones[0].click();
    expect(editor.drawer()).toEqual({ modo: 'anadir', fecha: LUNES, tipoComida: 'COMIDA' });
  });

  it('las comidas consumidas no se arrastran', () => {
    store.menu.update((m) => ({
      ...m!,
      dias: m!.dias.map((d, i) =>
        i === 0 ? { ...d, comidas: [{ ...d.comidas[0], consumida: true }, d.comidas[1]] } : d,
      ),
    }));
    const fixture = crear();
    const slots = fixture.nativeElement.querySelectorAll('app-meal-slot');
    expect(slots[0].classList).toContain('cdk-drag-disabled');
    expect(slots[1].classList).not.toContain('cdk-drag-disabled');
  });

  it('al soltar en otra celda mueve la comida en la vista y con PUT', () => {
    const mover = vi.spyOn(editor, 'mover').mockResolvedValue(true);
    const fixture = crear();
    const cmp = fixture.componentInstance as unknown as { soltar(e: unknown): void };
    const origen = {};
    const destino = { data: { fecha: sumarDias(LUNES, 5), tipoComida: 'CENA' } };
    cmp.soltar({ previousContainer: origen, container: origen, item: { data: comidaDe('c0') } });
    expect(mover).not.toHaveBeenCalled();
    cmp.soltar({ previousContainer: origen, container: destino, item: { data: comidaDe('c0') } });
    expect(mover).toHaveBeenCalledWith(comidaDe('c0'), destino.data, true);
  });
});

// ---- Drawer

describe('AnadirRecetaDrawerComponent', () => {
  let fixture: ComponentFixture<AnadirRecetaDrawerComponent>;

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function crear(): void {
    fixture = TestBed.createComponent(AnadirRecetaDrawerComponent);
    fixture.detectChanges();
  }
  const panel = () => document.querySelector('.ns-drawer') as HTMLElement;
  const refrescar = () => {
    TestBed.tick();
    fixture.detectChanges();
  };

  it('desde una franja vacía: cabecera con el hueco, búsqueda con debounce, raciones y POST', async () => {
    const lista = [alternativa('a', 585, 33, 1.5, 1), alternativa('b', 650, 52, 1, null)];
    servicio.recetasDisponibles.mockReturnValue(of(lista));
    crear();
    editor.abrirReceta({ modo: 'anadir', fecha: sumarDias(LUNES, 5), tipoComida: 'CENA' });
    refrescar();

    expect(panel().querySelector('.ns-drawer__titulo')?.textContent).toBe('Añadir receta · Cena');
    expect(panel().querySelector('.ns-ar__contexto')?.textContent).toContain(
      `día de entreno · faltan ≈ ${formatearKcal(560)}`,
    );
    expect(servicio.recetasDisponibles).toHaveBeenLastCalledWith(sumarDias(LUNES, 5), 'CENA', '');

    const recetas = panel().querySelectorAll('.ns-ar__receta');
    expect(recetas).toHaveLength(2);
    expect(recetas[0].textContent?.replace(/\s+/g, ' ')).toContain('1,5 raciones · ≈ 585 kcal · ≈ 33 g P');
    expect(recetas[0].textContent).toContain('+1 %');
    expect(recetas[0].querySelector('ns-source-badge')).not.toBeNull();
    expect(recetas[0].querySelector('ns-calc-status')).not.toBeNull();
    expect(recetas[1].querySelector('.ns-ar__ajuste')).toBeNull();

    // Buscar: espera al debounce.
    const buscador = panel().querySelector('input[type="search"]') as HTMLInputElement;
    buscador.value = 'pollo';
    buscador.dispatchEvent(new Event('input'));
    refrescar();
    expect(servicio.recetasDisponibles).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(DEBOUNCE_RECETAS_DISPONIBLES_MS);
    refrescar();
    expect(servicio.recetasDisponibles).toHaveBeenLastCalledWith(sumarDias(LUNES, 5), 'CENA', 'pollo');

    // Elegir la primera: las raciones pasan a las propuestas (1,5).
    const boton = [...panel().querySelectorAll<HTMLButtonElement>('[nsButton]')].at(-1)!;
    expect(boton.textContent?.trim()).toBe('Añadir a la cena');
    expect(boton.disabled).toBe(true);
    (panel().querySelector('.ns-ar__radio') as HTMLInputElement).click();
    refrescar();
    await Promise.resolve(); // ngModel escribe el valor en una microtarea
    refrescar();
    expect((panel().querySelector('.ns-quantity__input') as HTMLInputElement).value).toBe('1,5');
    expect(boton.disabled).toBe(false);

    servicio.anadirComida.mockReturnValue(of(menu()));
    boton.click();
    await vi.waitFor(() => expect(editor.drawer()).toBeNull());
    expect(servicio.anadirComida).toHaveBeenCalledWith('m1', {
      recetaId: 'a',
      fecha: sumarDias(LUNES, 5),
      tipoComida: 'CENA',
      raciones: 1.5,
    });
  });

  it('al sustituir envía PUT con la receta y las raciones', async () => {
    servicio.recetasDisponibles.mockReturnValue(of([alternativa('a', 585, 33, 2)]));
    servicio.cambiarComida.mockReturnValue(of(menu()));
    crear();
    editor.abrirReceta({ modo: 'sustituir', comida: comidaDe('c0') });
    refrescar();
    expect(panel().querySelector('.ns-drawer__titulo')?.textContent).toBe('Sustituir · Cena');
    expect(panel().querySelector('.ns-ar__contexto')?.textContent).toContain('Actual: Receta c0');

    (panel().querySelector('.ns-ar__radio') as HTMLInputElement).click();
    refrescar();
    const boton = [...panel().querySelectorAll<HTMLButtonElement>('[nsButton]')].at(-1)!;
    expect(boton.textContent?.trim()).toBe('Sustituir');
    boton.click();
    await vi.waitFor(() =>
      expect(servicio.cambiarComida).toHaveBeenCalledWith('m1', 'c0', { recetaId: 'a', raciones: 2 }),
    );
  });
});

// ---- Panel de alternativas

describe('AlternativasPanelComponent', () => {
  const cerrar = cerrarAlternativas;

  function crear(c: ComidaPlanificadaResponse): HTMLElement {
    comidaAlternativas = c;
    const fixture = TestBed.createComponent(AlternativasPanelComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('muestra hasta 3 alternativas con el delta frente a la actual y sustituye con PUT', async () => {
    servicio.alternativas.mockReturnValue(
      of([alternativa('a', 680, 44), alternativa('b', 710, 48), alternativa('c', 665, 46), alternativa('d', 700, 40)]),
    );
    servicio.cambiarComida.mockReturnValue(of(menu()));
    const raiz = crear(comida('c5', sumarDias(LUNES, 5), 'CENA'));

    expect(servicio.alternativas).toHaveBeenCalledWith('m1', 'c5');
    expect(raiz.querySelector('.ns-alt__titulo')?.textContent).toBe('Alternativas para cena');
    const opciones = raiz.querySelectorAll<HTMLButtonElement>('.ns-alt__opcion');
    expect(opciones).toHaveLength(3);
    expect(opciones[0].textContent?.replace(/\s+/g, ' ')).toContain('680 kcal (−10)');
    expect(opciones[0].textContent?.replace(/\s+/g, ' ')).toContain('P 44 g (+2 g)');
    expect(opciones[1].textContent?.replace(/\s+/g, ' ')).toContain('710 kcal (+20)');

    opciones[0].click();
    await vi.waitFor(() => expect(cerrar).toHaveBeenCalled());
    expect(servicio.cambiarComida).toHaveBeenCalledWith('m1', 'c5', { recetaId: 'a', raciones: 1 });
  });

  it('"Ver más recetas" cierra el panel y abre el drawer para sustituir', () => {
    const c = comida('c5', sumarDias(LUNES, 5), 'CENA');
    const raiz = crear(c);
    expect(raiz.querySelector('.ns-alt__vacio')).not.toBeNull();
    (raiz.querySelector('.ns-alt__pie button') as HTMLButtonElement).click();
    expect(cerrar).toHaveBeenCalled();
    expect(editor.drawer()).toEqual({ modo: 'sustituir', comida: c });
  });
});

import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideLucideIcons } from '@lucide/angular';
import { Subject, of, throwError } from 'rxjs';

import { LayoutService } from '@core/layout/layout.service';
import type {
  ComidaPlanificadaResponse,
  DiaMenuResponse,
  MenuResponse,
  MenuResumenResponse,
  Pagina,
  TipoComida,
} from '@core/models';
import { MenusService } from '@core/services/menus.service';
import { hoyLocal, lunesDeLaSemana, sumarDias } from '@core/util/fechas';
import { ICONOS_APP } from '@shared/design/iconos';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import { NsConfirmService } from '@shared/ui/overlay/confirm.service';
import { NsDialogService } from '@shared/ui/overlay/dialog.service';
import { GenerarMenuDialogComponent, MENSAJE_SIN_RECETAS } from './dialogos/generar-menu-dialog.component';
import { columnasSemana, comidasDeFranja, etiquetaSemana, fechaInicioSugerida, franjasVisibles } from './planificador';
import { PlanificadorComponent } from './planificador.component';

// ---- Datos

const HOY = hoyLocal();
const LUNES = lunesDeLaSemana(HOY);

const N = { kcal: 0, proteina: 0, carbohidratos: 0, grasa: 0 };

function comida(
  id: string,
  fecha: string,
  tipoComida: TipoComida | null,
  cambios: Partial<ComidaPlanificadaResponse> = {},
) {
  return {
    id,
    fecha,
    tipoComida,
    receta: { id: `r-${id}`, nombre: `Receta ${id}` } as ComidaPlanificadaResponse['receta'],
    raciones: 1,
    nutrientes: { kcal: 500, proteina: 30, carbohidratos: 60, grasa: 15 },
    bloqueada: false,
    consumida: false,
    ...cambios,
  } satisfies ComidaPlanificadaResponse;
}

function dia(
  fecha: string,
  comidas: ComidaPlanificadaResponse[],
  cambios: Partial<DiaMenuResponse> = {},
): DiaMenuResponse {
  return {
    fecha,
    objetivo: { fecha, base: N, kcalEntreno: 0, total: { kcal: 2500, proteina: 140, carbohidratos: 300, grasa: 80 } },
    planificado: { kcal: 2450, proteina: 135, carbohidratos: 310, grasa: 75 },
    porcentajeObjetivo: 98,
    diaEntreno: false,
    comidas,
    ...cambios,
  };
}

function menu(cambios: Partial<MenuResponse> = {}): MenuResponse {
  return {
    id: 'm1',
    nombre: 'Semana de carga',
    tipo: 'SEMANAL',
    fechaInicio: LUNES,
    fechaFin: sumarDias(LUNES, 6),
    favorito: false,
    estado: 'ACTIVO',
    generadoAutomaticamente: true,
    explicacion: 'Más hidratos los días de entreno.',
    dias: [0, 1, 2, 3, 4, 5, 6].map((i) => {
      const f = sumarDias(LUNES, i);
      return dia(f, [comida(`d${i}`, f, 'DESAYUNO'), comida(`c${i}`, f, 'CENA')], { diaEntreno: i === 2 });
    }),
    resumen: { mediaKcal: 2523, ajustePorcentaje: 102, proteinaMedia: 143 },
    ...cambios,
  };
}

const aResumen = (m: MenuResponse, cambios: Partial<MenuResumenResponse> = {}): MenuResumenResponse => ({
  id: m.id,
  nombre: m.nombre,
  tipo: m.tipo,
  fechaInicio: m.fechaInicio,
  fechaFin: m.fechaFin,
  favorito: m.favorito,
  estado: m.estado,
  generadoAutomaticamente: true,
  numeroComidas: 14,
  ...cambios,
});

const pagina = (content: MenuResumenResponse[]): Pagina<MenuResumenResponse> => ({
  content,
  page: 0,
  size: 50,
  totalElements: content.length,
  totalPages: 1,
});

// ---- Funciones

describe('Funciones del planificador', () => {
  it('etiqueta la semana con el año', () => {
    expect(etiquetaSemana('2026-11-23')).toBe('23–29 nov 2026');
    expect(etiquetaSemana('2026-11-30')).toBe('30 nov – 6 dic 2026');
    expect(etiquetaSemana('2026-12-28')).toBe('28 dic 2026 – 3 ene 2027');
  });

  it('columnasSemana: 7 fechas con su día del menú o null', () => {
    const diario = menu({ tipo: 'DIARIO', dias: [dia('2026-11-25', [])] });
    const columnas = columnasSemana(diario, '2026-11-23');
    expect(columnas.map((c) => c.fecha)).toEqual([
      '2026-11-23',
      '2026-11-24',
      '2026-11-25',
      '2026-11-26',
      '2026-11-27',
      '2026-11-28',
      '2026-11-29',
    ]);
    expect(columnas.map((c) => !!c.dia)).toEqual([false, false, true, false, false, false, false]);
  });

  it('franjasVisibles: las cuatro fijas y las demás solo con comidas, en orden', () => {
    expect(franjasVisibles([null])).toEqual(['DESAYUNO', 'COMIDA', 'MERIENDA', 'CENA']);
    const d = dia('2026-11-23', [comida('a', '2026-11-23', 'POST_ENTRENO'), comida('b', '2026-11-23', null)]);
    expect(franjasVisibles([d, null])).toEqual(['DESAYUNO', 'COMIDA', 'MERIENDA', 'CENA', 'POST_ENTRENO', 'OTRO']);
    expect(comidasDeFranja(d, 'OTRO').map((c) => c.id)).toEqual(['b']);
    expect(comidasDeFranja(null, 'CENA')).toEqual([]);
  });

  it('fechaInicioSugerida: semanal → próximo lunes (o hoy si es lunes); diario → hoy', () => {
    expect(fechaInicioSugerida('SEMANAL', '2026-11-27')).toBe('2026-11-30');
    expect(fechaInicioSugerida('SEMANAL', '2026-11-23')).toBe('2026-11-23');
    expect(fechaInicioSugerida('DIARIO', '2026-11-27')).toBe('2026-11-27');
    // Con una fecha preferida (la semana que se está viendo), si no queda en el pasado.
    expect(fechaInicioSugerida('SEMANAL', '2026-11-27', '2026-12-07')).toBe('2026-12-07');
    expect(fechaInicioSugerida('SEMANAL', '2026-11-27', '2026-11-27')).toBe('2026-11-30');
    expect(fechaInicioSugerida('DIARIO', '2026-11-27', '2026-12-07')).toBe('2026-12-07');
    expect(fechaInicioSugerida('DIARIO', '2026-11-27', '2026-11-20')).toBe('2026-11-27');
  });
});

// ---- Pantalla

describe('PlanificadorComponent', () => {
  let fixture: ComponentFixture<PlanificadorComponent>;
  let servicio: {
    listar: ReturnType<typeof vi.fn>;
    detalle: ReturnType<typeof vi.fn>;
    actualizar: ReturnType<typeof vi.fn>;
    eliminar: ReturnType<typeof vi.fn>;
  };
  const esMovil = signal(false);
  const confirmar = vi.fn();
  const abrir = vi.fn();
  const toast = { exito: vi.fn(), error: vi.fn(), info: vi.fn() };

  beforeEach(() => {
    esMovil.set(false);
    confirmar.mockReset();
    abrir.mockReset();
    const m = menu();
    servicio = {
      listar: vi.fn(() => of(pagina([aResumen(m)]))),
      detalle: vi.fn(() => of(m)),
      actualizar: vi.fn(),
      eliminar: vi.fn(() => of(undefined)),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideLucideIcons(...ICONOS_APP),
        { provide: MenusService, useValue: servicio },
        { provide: LayoutService, useValue: { esMovil } },
        { provide: NsConfirmService, useValue: { confirmar } },
        { provide: NsDialogService, useValue: { open: abrir } },
        { provide: NsToastService, useValue: toast },
      ],
    });
  });

  async function crear(): Promise<HTMLElement> {
    fixture = TestBed.createComponent(PlanificadorComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  const textos = (raiz: HTMLElement, selector: string) =>
    [...raiz.querySelectorAll(selector)].map((e) => e.textContent?.replace(/\s+/g, ' ').trim());

  it('pide los menús desde 6 días antes del lunes y muestra el resumen y la rejilla', async () => {
    const raiz = await crear();
    expect(servicio.listar).toHaveBeenCalledWith({ desde: sumarDias(LUNES, -6), page: 0, size: 50 });
    expect(servicio.detalle).toHaveBeenCalledWith('m1');

    expect(raiz.querySelector('.ns-plan__etiqueta')?.textContent).toContain(etiquetaSemana(LUNES));
    expect(textos(raiz, 'app-resumen-semana dd')).toEqual([
      '2.523 kcal/día',
      '102 % rango ±10 %',
      '143 g/día',
      '1 día',
    ]);
    expect(raiz.querySelectorAll('app-week-planner th[scope="col"]')).toHaveLength(7);
    expect(textos(raiz, 'app-week-planner th[scope="row"]')).toEqual(['Desayuno', 'Comida', 'Merienda', 'Cena']);
    expect(raiz.querySelectorAll('app-meal-slot')).toHaveLength(14);
    expect(raiz.querySelector('app-dia-planificador')).toBeNull();
  });

  it('cabecera de día: kcal frente al objetivo, % e hidratos; tinte activity si hay entreno', async () => {
    const raiz = await crear();
    const cabeceras = raiz.querySelectorAll('app-cabecera-dia');
    const texto = cabeceras[0].textContent?.replace(/\s+/g, ' ') ?? '';
    expect(texto).toContain('2.450 / 2.500 kcal');
    expect(texto).toContain('98 % · HC 310 g');
    expect(cabeceras[2].classList).toContain('ns-cdia--entreno');
    expect(cabeceras[2].textContent).toContain('Día de entreno');
    expect(cabeceras[0].classList).not.toContain('ns-cdia--entreno');
  });

  it('meal-slot: nombre, kcal y proteína y badges de bloqueada y consumida', async () => {
    const m = menu();
    m.dias[0].comidas[0] = comida('x', LUNES, 'DESAYUNO', { bloqueada: true, consumida: true, raciones: 2 });
    m.dias[0].comidas.push(comida('pre', LUNES, 'PRE_ENTRENO'));
    servicio.detalle.mockReturnValue(of(m));
    const raiz = await crear();

    const slot = raiz.querySelector('app-meal-slot')!;
    expect(slot.querySelector('.ns-slot__nombre')?.textContent).toBe('Receta x');
    expect(slot.querySelector('.ns-slot__cifras')?.textContent?.replace(/\s+/g, ' ')).toContain(
      '500 kcal · P 30 g · 2 rac.',
    );
    expect(textos(slot as HTMLElement, 'ns-badge')).toEqual(['Bloqueada', 'Consumida']);
    // Pre-entreno solo aparece porque hay una comida de ese tipo.
    expect(textos(raiz, 'app-week-planner th[scope="row"]')).toContain('Pre-entreno');
  });

  it('la explicación se pliega y lleva el aviso de menú', async () => {
    const raiz = await crear();
    const boton = raiz.querySelector('.ns-rs__plegar') as HTMLButtonElement;
    const explicacion = raiz.querySelector('#ns-rs-explicacion') as HTMLElement;
    expect(boton.getAttribute('aria-expanded')).toBe('false');
    expect(explicacion.hidden).toBe(true);
    boton.click();
    fixture.detectChanges();
    expect(boton.getAttribute('aria-expanded')).toBe('true');
    expect(explicacion.hidden).toBe(false);
    expect(explicacion.textContent).toContain('Más hidratos los días de entreno.');
    expect(explicacion.querySelector('ns-disclaimer')?.textContent).toContain('Menú orientativo');
  });

  it('sin explicación, el aviso de menú se muestra solo', async () => {
    servicio.detalle.mockReturnValue(of(menu({ explicacion: null })));
    const raiz = await crear();
    expect(raiz.querySelector('app-resumen-semana ns-card')).toBeNull();
    expect(raiz.querySelector('app-resumen-semana ns-disclaimer')).not.toBeNull();
  });

  it('sin menú en la semana: estado vacío con "Generar menú", que abre el diálogo', async () => {
    servicio.listar.mockReturnValue(of(pagina([])));
    abrir.mockReturnValue({ closed: new Subject() });
    const raiz = await crear();
    const vacio = raiz.querySelector('ns-empty-state')!;
    expect(vacio.textContent).toContain('No tienes menú para esta semana');
    (vacio.querySelector('button') as HTMLButtonElement).click();
    expect(abrir).toHaveBeenCalledWith(GenerarMenuDialogComponent, expect.objectContaining({ titulo: 'Generar menú' }));
  });

  it('al generar, selecciona el menú nuevo', async () => {
    servicio.listar.mockReturnValue(of(pagina([])));
    const cerrado = new Subject<MenuResponse | undefined>();
    abrir.mockReturnValue({ closed: cerrado });
    const raiz = await crear();
    (raiz.querySelector('ns-empty-state button') as HTMLButtonElement).click();

    const nuevo = menu({ id: 'nuevo', nombre: 'Nuevo' });
    servicio.listar.mockReturnValue(of(pagina([aResumen(nuevo)])));
    cerrado.next(nuevo);
    fixture.detectChanges();
    expect(raiz.querySelector('ns-empty-state')).toBeNull();
    expect(raiz.querySelector('#ns-plan-nombre')?.textContent).toBe('Nuevo');
    expect(toast.exito).toHaveBeenCalledWith('Menú generado', 'Nuevo');
  });

  it('cambiar de semana vuelve a pedir los menús', async () => {
    const raiz = await crear();
    servicio.listar.mockReturnValue(of(pagina([])));
    (raiz.querySelector('[aria-label="Semana siguiente"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(servicio.listar).toHaveBeenLastCalledWith({ desde: sumarDias(LUNES, 1), page: 0, size: 50 });
    expect(raiz.querySelector('ns-empty-state')).not.toBeNull();
    expect(raiz.textContent).toContain('Esta semana');
  });

  it('guardar como favorito aplica el menú que devuelve el servidor', async () => {
    servicio.actualizar.mockReturnValue(of(menu({ favorito: true })));
    const raiz = await crear();
    (raiz.querySelector('.ns-plan__mas') as HTMLButtonElement).click();
    fixture.detectChanges();
    const item = [...document.querySelectorAll<HTMLButtonElement>('.ns-menu__item')].find((b) =>
      b.textContent?.includes('Guardar como favorito'),
    )!;
    item.click();
    fixture.detectChanges();
    expect(servicio.actualizar).toHaveBeenCalledWith('m1', { favorito: true });
    expect(toast.exito).toHaveBeenCalledWith('Guardado como favorito', 'Semana de carga');
  });

  it('eliminar pide confirmación y quita el menú', async () => {
    const raiz = await crear();
    confirmar.mockResolvedValue(false);
    const cmp = fixture.componentInstance as unknown as { eliminar(m: MenuResponse): Promise<void> };
    await cmp.eliminar(menu());
    expect(servicio.eliminar).not.toHaveBeenCalled();

    confirmar.mockResolvedValue(true);
    await cmp.eliminar(menu());
    fixture.detectChanges();
    expect(confirmar).toHaveBeenCalledWith(expect.objectContaining({ peligro: true, textoConfirmar: 'Eliminar menú' }));
    expect(servicio.eliminar).toHaveBeenCalledWith('m1');
    expect(raiz.querySelector('ns-empty-state')).not.toBeNull();
  });

  it('en móvil muestra la vista por día con la tira de fechas', async () => {
    esMovil.set(true);
    const raiz = await crear();
    expect(raiz.querySelector('app-week-planner')).toBeNull();
    const vista = raiz.querySelector('app-dia-planificador')!;
    expect(vista.querySelector('ns-date-strip')).not.toBeNull();
    expect(textos(vista as HTMLElement, '.ns-dp__titulo')).toEqual(['Desayuno', 'Comida', 'Merienda', 'Cena']);
    expect(vista.querySelectorAll('app-meal-slot')).toHaveLength(2);
  });

  it('muestra el error con "Reintentar"', async () => {
    servicio.listar.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    const raiz = await crear();
    const alerta = raiz.querySelector('ns-alert')!;
    expect(alerta.textContent).toContain('No hemos podido cargar el menú');
    servicio.listar.mockReturnValue(of(pagina([])));
    (alerta.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(raiz.querySelector('ns-alert')).toBeNull();
    expect(raiz.querySelector('ns-empty-state')).not.toBeNull();
  });
});

// ---- Diálogo de generar

describe('GenerarMenuDialogComponent', () => {
  const generar = vi.fn();
  const cerrar = vi.fn();
  let raiz: HTMLElement;
  let fixture: ComponentFixture<GenerarMenuDialogComponent>;

  async function crear(data: { fechaPreferida?: string | null } = {}): Promise<void> {
    generar.mockReset();
    cerrar.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideLucideIcons(...ICONOS_APP),
        { provide: MenusService, useValue: { generar } },
        { provide: DialogRef, useValue: { close: cerrar, disableClose: false } },
        { provide: DIALOG_DATA, useValue: data },
      ],
    });
    fixture = TestBed.createComponent(GenerarMenuDialogComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    raiz = fixture.nativeElement as HTMLElement;
  }

  const fecha = () => (raiz.querySelector('input[type="date"]') as HTMLInputElement).value;
  const enviar = async () => {
    (raiz.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    await fixture.whenStable();
  };

  it('propone el próximo lunes para un menú semanal y envía la petición', async () => {
    await crear();
    expect(fecha()).toBe(fechaInicioSugerida('SEMANAL', HOY));
    const nuevo = menu();
    generar.mockReturnValue(of(nuevo));
    await enviar();
    expect(generar).toHaveBeenCalledWith({ tipo: 'SEMANAL', fechaInicio: fecha(), conExplicacion: true });
    expect(cerrar).toHaveBeenCalledWith(nuevo);
  });

  it('con la semana que se está viendo, propone su lunes', async () => {
    const lunesSiguiente = sumarDias(LUNES, 14);
    await crear({ fechaPreferida: lunesSiguiente });
    expect(fecha()).toBe(lunesSiguiente);
  });

  it('SIN_RECETAS_COMPATIBLES muestra el aviso y no cierra', async () => {
    await crear();
    generar.mockReturnValue(
      throwError(
        () => new HttpErrorResponse({ status: 422, error: { codigo: 'SIN_RECETAS_COMPATIBLES', detail: 'x' } }),
      ),
    );
    await enviar();
    expect(raiz.querySelector('ns-alert')?.textContent).toContain(MENSAJE_SIN_RECETAS);
    expect(cerrar).not.toHaveBeenCalled();
  });

  it('PERFIL_REQUERIDO cierra y lleva a /bienvenida', async () => {
    await crear();
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    generar.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 422, error: { codigo: 'PERFIL_REQUERIDO', detail: 'x' } })),
    );
    await enviar();
    expect(cerrar).toHaveBeenCalledWith();
    expect(navegar).toHaveBeenCalledWith(['/bienvenida']);
  });
});

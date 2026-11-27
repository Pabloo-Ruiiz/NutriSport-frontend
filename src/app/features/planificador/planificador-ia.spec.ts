import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideLucideIcons } from '@lucide/angular';
import { of, throwError } from 'rxjs';

import { LayoutService } from '@core/layout/layout.service';
import type { ComidaPlanificadaResponse, MenuResponse, SugerenciaIaResponse } from '@core/models';
import { AuthService } from '@core/services/auth.service';
import { CuentaService } from '@core/services/cuenta.service';
import { MenusService } from '@core/services/menus.service';
import { hoyLocal, sumarDias } from '@core/util/fechas';
import { ICONOS_APP } from '@shared/design/iconos';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import { NsConfirmService } from '@shared/ui/overlay/confirm.service';
import { NsDialogService } from '@shared/ui/overlay/dialog.service';
import { MENSAJE_IA_NO_DISPONIBLE, SugerenciaIaComponent, textoDeltas } from './componentes/sugerencia-ia.component';
import { RegistrarPlanificadaDialogComponent } from './dialogos/registrar-planificada-dialog.component';
import { PlanificadorEditor } from './planificador-editor';
import { PlanificadorStore } from './planificador.store';

// ---- Datos

const HOY = hoyLocal();

const comida = (fecha = HOY, cambios: Partial<ComidaPlanificadaResponse> = {}): ComidaPlanificadaResponse => ({
  id: 'c1',
  fecha,
  tipoComida: 'CENA',
  receta: { id: 'r1', nombre: 'Chicken Couscous' } as ComidaPlanificadaResponse['receta'],
  raciones: 1,
  nutrientes: { kcal: 585, proteina: 33, carbohidratos: 60, grasa: 20 },
  bloqueada: false,
  consumida: false,
  ...cambios,
});

const menu = (cambios: Partial<MenuResponse> = {}): MenuResponse => ({
  id: 'm1',
  nombre: 'Semana',
  tipo: 'DIARIO',
  fechaInicio: HOY,
  fechaFin: HOY,
  favorito: false,
  estado: 'ACTIVO',
  generadoAutomaticamente: true,
  explicacion: null,
  dias: [
    {
      fecha: HOY,
      objetivo: null,
      planificado: { kcal: 585, proteina: 33, carbohidratos: 60, grasa: 20 },
      porcentajeObjetivo: 0,
      diaEntreno: false,
      comidas: [comida()],
    },
  ],
  resumen: { mediaKcal: 585, ajustePorcentaje: 0, proteinaMedia: 33 },
  ...cambios,
});

const SUGERENCIA: SugerenciaIaResponse = {
  id: 's1',
  texto: 'Aumenta la pechuga de pollo de 200 g a 300 g.',
  deltaKcalRacion: 30,
  deltaProteinaRacion: 5.6,
  valida: true,
};

const error = (status: number, codigo: string, detail = 'Detalle del servidor') =>
  throwError(() => new HttpErrorResponse({ status, error: { codigo, detail, title: 'Error' } }));

// ---- Montaje

const servicio = {
  detalle: vi.fn(),
  registrarComida: vi.fn(),
  sugerenciaIa: vi.fn(),
  aplicarSugerencia: vi.fn(),
};
const toast = { exito: vi.fn(), error: vi.fn(), info: vi.fn() };
const abrirDialogo = vi.fn();
const cerrarDialogo = vi.fn();
const emailVerificado = signal(true);
const auth = {
  cuenta: signal({ email: 'alex@example.com' }),
  emailVerificado,
  reenviarVerificacion: vi.fn(() => of({ mensaje: 'ok' })),
};
const cuenta = { obtener: vi.fn(() => of({})) };
let datosDialogo: unknown = null;

let store: PlanificadorStore;
let editor: PlanificadorEditor;

beforeEach(() => {
  vi.clearAllMocks();
  emailVerificado.set(true);
  servicio.detalle.mockReturnValue(of(menu({ nombre: 'Recargado' })));
  servicio.registrarComida.mockReturnValue(of({ id: 'reg' }));
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideLucideIcons(...ICONOS_APP),
      PlanificadorStore,
      PlanificadorEditor,
      { provide: MenusService, useValue: servicio },
      { provide: NsToastService, useValue: toast },
      { provide: NsConfirmService, useValue: { confirmar: vi.fn() } },
      { provide: NsDialogService, useValue: { open: abrirDialogo } },
      { provide: LayoutService, useValue: { esMovil: signal(false) } },
      { provide: AuthService, useValue: auth },
      { provide: CuentaService, useValue: cuenta },
      { provide: DialogRef, useValue: { close: cerrarDialogo, disableClose: false } },
      { provide: DIALOG_DATA, useFactory: () => datosDialogo },
    ],
  });
  store = TestBed.inject(PlanificadorStore);
  editor = TestBed.inject(PlanificadorEditor);
  store.menu.set(menu());
});

const texto = (e: Element | null) => e?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

// ---- Registrar

describe('Registrar una comida planificada', () => {
  it('el editor abre el diálogo y registra con la hora elegida; toast y recarga del menú', async () => {
    abrirDialogo.mockReturnValue({ closed: of({ hora: '13:30' }) });
    expect(await editor.abrirRegistrar(comida())).toBe(true);
    expect(abrirDialogo).toHaveBeenCalledWith(
      RegistrarPlanificadaDialogComponent,
      expect.objectContaining({ data: { comida: comida() } }),
    );
    expect(servicio.registrarComida).toHaveBeenCalledWith('m1', 'c1', '13:30');
    expect(toast.exito).toHaveBeenCalledWith('Comida registrada');
    expect(servicio.detalle).toHaveBeenCalledWith('m1');
    expect(store.menu()?.nombre).toBe('Recargado');
  });

  it('cancelar no registra nada', async () => {
    abrirDialogo.mockReturnValue({ closed: of(undefined) });
    expect(await editor.abrirRegistrar(comida())).toBe(false);
    expect(servicio.registrarComida).not.toHaveBeenCalled();
  });

  it('409 COMIDA_CONSUMIDA: toast con el detalle y recarga', async () => {
    servicio.registrarComida.mockReturnValue(error(409, 'COMIDA_CONSUMIDA', 'Ya estaba registrada.'));
    expect(await editor.registrar(comida(), null)).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('No se ha podido registrar la comida', 'Ya estaba registrada.');
    expect(servicio.detalle).toHaveBeenCalled();
  });

  async function dialogo(fecha: string): Promise<HTMLElement> {
    datosDialogo = { comida: comida(fecha) };
    const fixture = TestBed.createComponent(RegistrarPlanificadaDialogComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('el diálogo propone la hora actual si la comida es de hoy y la devuelve', async () => {
    const raiz = await dialogo(HOY);
    const hora = raiz.querySelector('input[type="time"]') as HTMLInputElement;
    expect(hora.value).toMatch(/^\d{2}:\d{2}$/);
    (raiz.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    expect(cerrarDialogo).toHaveBeenCalledWith({ hora: hora.value });
  });

  it('sin hora devuelve null (la pone el servidor)', async () => {
    const raiz = await dialogo(sumarDias(HOY, -2));
    expect((raiz.querySelector('input[type="time"]') as HTMLInputElement).value).toBe('');
    (raiz.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    expect(cerrarDialogo).toHaveBeenCalledWith({ hora: null });
  });
});

// ---- Sugerencia IA

describe('SugerenciaIaComponent', () => {
  let fixture: ComponentFixture<SugerenciaIaComponent>;

  async function crear(): Promise<HTMLElement> {
    fixture = TestBed.createComponent(SugerenciaIaComponent);
    fixture.componentRef.setInput('comida', comida());
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  async function pedir(raiz: HTMLElement, preferencia = ''): Promise<void> {
    if (preferencia) {
      const campo = raiz.querySelector('textarea') as HTMLTextAreaElement;
      campo.value = preferencia;
      campo.dispatchEvent(new Event('input'));
    }
    (raiz.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    await fixture.whenStable();
  }

  const boton = (raiz: HTMLElement, textoBoton: string) =>
    [...raiz.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent!.trim() === textoBoton);

  it('textoDeltas: las cifras por ración que calcula el backend', () => {
    expect(textoDeltas({ deltaKcalRacion: 30, deltaProteinaRacion: 5.6 })).toBe(
      '≈ +5,6 g de proteína y +30 kcal por ración',
    );
    expect(textoDeltas({ deltaKcalRacion: -25, deltaProteinaRacion: null })).toBe('≈ −25 kcal por ración');
    expect(textoDeltas({ deltaKcalRacion: null, deltaProteinaRacion: null })).toBeNull();
  });

  it('tarjeta ai con el badge "Sugerencia IA", el campo de 300 caracteres y el aviso de menú', async () => {
    const raiz = await crear();
    expect(raiz.querySelector('ns-card')?.className).toContain('ai');
    expect(texto(raiz.querySelector('[nsCardTitulo] ns-badge'))).toBe('Sugerencia IA');
    expect(raiz.querySelector('textarea')?.getAttribute('maxlength')).toBe('300');
    expect(raiz.querySelector('ns-disclaimer')?.textContent).toContain('Menú orientativo');
  });

  it('pide con la preferencia; si es válida, "Aplicar" reemplaza el menú y cierra', async () => {
    servicio.sugerenciaIa.mockReturnValue(of(SUGERENCIA));
    const raiz = await crear();
    await pedir(raiz, ' más proteína ');
    expect(servicio.sugerenciaIa).toHaveBeenCalledWith('m1', 'c1', { preferencia: 'más proteína' });
    expect(texto(raiz.querySelector('.ns-sug__texto'))).toBe(SUGERENCIA.texto);
    expect(texto(raiz.querySelector('.ns-sug__cifras'))).toBe(
      'Calculado por NutriSport con el catálogo: ≈ +5,6 g de proteína y +30 kcal por ración',
    );

    const aplicado = menu({ nombre: 'Con receta derivada' });
    servicio.aplicarSugerencia.mockReturnValue(of(aplicado));
    const cerrar = vi.fn();
    fixture.componentInstance.cerrar.subscribe(cerrar);
    boton(raiz, 'Aplicar')!.click();
    await vi.waitFor(() => expect(cerrar).toHaveBeenCalled());
    expect(servicio.aplicarSugerencia).toHaveBeenCalledWith('m1', 'c1', 's1');
    expect(store.menu()).toBe(aplicado);
  });

  it('"Descartar" vuelve al formulario sin aplicar', async () => {
    servicio.sugerenciaIa.mockReturnValue(of(SUGERENCIA));
    const raiz = await crear();
    await pedir(raiz);
    expect(servicio.sugerenciaIa).toHaveBeenCalledWith('m1', 'c1', {});
    boton(raiz, 'Descartar')!.click();
    fixture.detectChanges();
    expect(raiz.querySelector('textarea')).not.toBeNull();
    expect(servicio.aplicarSugerencia).not.toHaveBeenCalled();
  });

  it('si no es válida muestra el motivo y no deja aplicar', async () => {
    servicio.sugerenciaIa.mockReturnValue(
      of({ ...SUGERENCIA, valida: false, texto: 'El tofu no está en el catálogo.', deltaKcalRacion: null }),
    );
    const raiz = await crear();
    await pedir(raiz);
    expect(texto(raiz.querySelector('ns-alert'))).toContain('El tofu no está en el catálogo.');
    expect(boton(raiz, 'Aplicar')).toBeUndefined();
  });

  it('403 EMAIL_NO_VERIFICADO → aviso con "Reenviar"', async () => {
    servicio.sugerenciaIa.mockReturnValue(error(403, 'EMAIL_NO_VERIFICADO'));
    const raiz = await crear();
    await pedir(raiz);
    expect(texto(raiz.querySelector('ns-alert'))).toContain('email verificado');
    expect(cuenta.obtener).toHaveBeenCalled();
    boton(raiz, 'Reenviar')!.click();
    expect(auth.reenviarVerificacion).toHaveBeenCalledWith('alex@example.com');
  });

  it('sin email verificado avisa desde el principio y no deja pedir', async () => {
    emailVerificado.set(false);
    const raiz = await crear();
    expect(texto(raiz.querySelector('ns-alert'))).toContain('email verificado');
    expect(boton(raiz, 'Pedir sugerencia')!.disabled).toBe(true);
  });

  it('503 → "La IA no está disponible ahora"', async () => {
    servicio.sugerenciaIa.mockReturnValue(error(503, 'SERVICIO_NO_DISPONIBLE'));
    const raiz = await crear();
    await pedir(raiz);
    expect(texto(raiz.querySelector('ns-alert'))).toBe(MENSAJE_IA_NO_DISPONIBLE);
  });

  it('si aplicar falla (409 SUGERENCIA_OBSOLETA): toast, recarga y vuelve al formulario', async () => {
    servicio.sugerenciaIa.mockReturnValue(of(SUGERENCIA));
    servicio.aplicarSugerencia.mockReturnValue(error(409, 'SUGERENCIA_OBSOLETA', 'La comida ya tiene otra receta.'));
    const raiz = await crear();
    await pedir(raiz);
    boton(raiz, 'Aplicar')!.click();
    await vi.waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'No se ha podido aplicar la sugerencia',
        'La comida ya tiene otra receta.',
      ),
    );
    fixture.detectChanges();
    expect(raiz.querySelector('textarea')).not.toBeNull();
  });
});

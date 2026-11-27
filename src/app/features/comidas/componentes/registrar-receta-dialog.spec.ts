import { InteractivityChecker } from '@angular/cdk/a11y';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideLucideIcons } from '@lucide/angular';

import { errorInterceptor } from '@core/interceptors/error.interceptor';
import type { RegistroComidaResponse } from '@core/models';
import { hoyLocal, sumarDias } from '@core/util/fechas';
import { ICONOS_APP } from '@shared/design/iconos';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import { NsDialogService } from '@shared/ui/overlay/dialog.service';
import {
  RegistrarRecetaDialogComponent,
  racionesValidas,
  type RecetaARegistrar,
  type RegistrarRecetaData,
} from './registrar-receta-dialog.component';

class InteractivityCheckerJsdom {
  isDisabled = (e: HTMLElement) => e.hasAttribute('disabled');
  isVisible = () => true;
  isFocusable = (e: HTMLElement) => e.matches('button, input, select, a[href], [tabindex]');
  isTabbable = (e: HTMLElement) => this.isFocusable(e) && e.tabIndex >= 0;
}

const RECETA: RecetaARegistrar = {
  id: 'r1',
  nombre: 'Bowl de pollo',
  nutricionRacion: { kcal: 390, proteinas: 22, carbohidratos: 59, grasas: 6.6 },
  estadoNutricional: 'APROXIMADO',
  racionesSupuestas: false,
};

const comida = (cambios: Partial<RegistroComidaResponse> = {}): RegistroComidaResponse => ({
  id: 'c1',
  fecha: hoyLocal(),
  hora: null,
  tipoComida: 'CENA',
  origen: 'RECETA',
  notas: null,
  alimentos: [],
  totales: { kcal: 683, proteina: 38, carbohidratos: 100, grasa: 12 },
  avisos: [],
  ...cambios,
});

let http: HttpTestingController;
let toasts: NsToastService;
let cerrada: RegistroComidaResponse | undefined | 'abierta';

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
      provideLucideIcons(...ICONOS_APP),
      { provide: InteractivityChecker, useClass: InteractivityCheckerJsdom },
    ],
  });
  http = TestBed.inject(HttpTestingController);
  toasts = TestBed.inject(NsToastService);
});

afterEach(() => {
  http.verify();
  document.querySelector('.cdk-overlay-container')?.replaceChildren();
});

const dialogo = () => document.querySelector('app-registrar-receta-dialog') as HTMLElement;
const boton = (texto: string) =>
  [...dialogo().querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === texto)!;
const esperar = async () => {
  TestBed.inject(ApplicationRef).tick();
  await new Promise((r) => setTimeout(r));
  TestBed.inject(ApplicationRef).tick();
};

async function abrir(data: Partial<RegistrarRecetaData> = {}) {
  cerrada = 'abierta';
  TestBed.inject(NsDialogService)
    .open<RegistrarRecetaDialogComponent, RegistroComidaResponse, RegistrarRecetaData>(RegistrarRecetaDialogComponent, {
      titulo: 'Registrar como comida',
      data: { receta: RECETA, ...data },
    })
    .closed.subscribe((c) => (cerrada = c));
  await esperar();
}

async function escribirRaciones(texto: string) {
  const input = dialogo().querySelector<HTMLInputElement>('ns-quantity-input input')!;
  input.value = texto;
  input.dispatchEvent(new Event('input'));
  input.dispatchEvent(new Event('blur'));
  await esperar();
}

describe('RegistrarRecetaDialogComponent', () => {
  it('racionesValidas: > 0 y ≤ 10, con decimales', () => {
    expect([0.5, 10, 0, 10.5, -1, NaN, null].map(racionesValidas)).toEqual([
      true,
      true,
      false,
      false,
      false,
      false,
      false,
    ]);
  });

  it('registra con raciones decimales: POST, toast con "Deshacer" y se cierra con la comida', async () => {
    const exito = vi.spyOn(toasts, 'exito');
    await abrir({ tipoComida: 'CENA', fecha: hoyLocal() });
    await escribirRaciones('1,75');
    expect(dialogo().textContent).toContain('≈ 683 kcal');

    boton('Registrar').click();
    const req = http.expectOne({ method: 'POST', url: '/api/v1/comidas/desde-receta' });
    expect(req.request.body).toEqual({ recetaId: 'r1', raciones: 1.75, fecha: hoyLocal(), tipoComida: 'CENA' });
    req.flush(comida());
    await esperar();

    expect(exito).toHaveBeenCalledWith(
      'Comida guardada · 683 kcal',
      undefined,
      expect.objectContaining({ texto: 'Deshacer' }),
    );
    expect(cerrada).toMatchObject({ id: 'c1' });

    // "Deshacer" borra la comida.
    exito.mock.calls[0][2]!.ejecutar();
    http.expectOne({ method: 'DELETE', url: '/api/v1/comidas/c1' }).flush(null);
  });

  it('muestra los avisos antes de cerrar', async () => {
    await abrir();
    boton('Registrar').click();
    http.expectOne('/api/v1/comidas/desde-receta').flush(comida({ avisos: ['Contiene gluten'] }));
    await esperar();
    expect(dialogo().textContent).toContain('Contiene gluten');
    expect(cerrada).toBe('abierta');
    boton('Entendido').click();
    await esperar();
    expect(cerrada).toMatchObject({ id: 'c1' });
  });

  it('no admite una fecha posterior a mañana (no llama a la API)', async () => {
    await abrir({ fecha: sumarDias(hoyLocal(), 1) });
    const fecha = dialogo().querySelector<HTMLInputElement>('input[type=date]')!;
    fecha.value = sumarDias(hoyLocal(), 2);
    fecha.dispatchEvent(new Event('input'));
    await esperar();
    boton('Registrar').click();
    await esperar();
    http.expectNone('/api/v1/comidas/desde-receta');
    expect(dialogo().textContent).toContain('La fecha puede ser como mucho mañana.');
  });

  it('un 422 NUTRICION_INCOMPLETA se explica en el diálogo y desactiva "Registrar"', async () => {
    await abrir();
    boton('Registrar').click();
    http
      .expectOne('/api/v1/comidas/desde-receta')
      .flush(
        { codigo: 'NUTRICION_INCOMPLETA', detalle: 'Nutrición incompleta', errors: [] },
        { status: 422, statusText: 'Unprocessable' },
      );
    await esperar();
    expect(dialogo().textContent).toContain('Su cálculo nutricional está incompleto');
    expect(boton('Registrar').disabled).toBe(true);
    expect(cerrada).toBe('abierta');
  });
});

import { InteractivityChecker } from '@angular/cdk/a11y';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideLucideIcons } from '@lucide/angular';

import { errorInterceptor } from '@core/interceptors/error.interceptor';
import { LayoutService } from '@core/layout/layout.service';
import type { PesoResponse } from '@core/models';
import { hoyLocal, sumarDias } from '@core/util/fechas';
import { ICONOS_APP } from '@shared/design/iconos';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import { NsDialogService } from '@shared/ui/overlay/dialog.service';
import { type DatosRegistrarPeso, RegistrarPesoDialogComponent } from './registrar-peso-dialog.component';

class InteractivityCheckerJsdom {
  isDisabled = (e: HTMLElement) => e.hasAttribute('disabled');
  isVisible = () => true;
  isFocusable = (e: HTMLElement) => e.matches('button, input, a[href], [tabindex]');
  isTabbable = (e: HTMLElement) => this.isFocusable(e) && e.tabIndex >= 0;
}

let http: HttpTestingController;

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
      provideLucideIcons(...ICONOS_APP),
      { provide: LayoutService, useValue: { esMovil: signal(false) } },
      { provide: InteractivityChecker, useClass: InteractivityCheckerJsdom },
    ],
  });
  http = TestBed.inject(HttpTestingController);
});

afterEach(() => {
  http.verify();
  document.querySelector('.cdk-overlay-container')?.replaceChildren();
});

const esperar = () => new Promise((resolver) => setTimeout(resolver));

async function abrir(datos?: DatosRegistrarPeso) {
  const ref = TestBed.inject(NsDialogService).open<RegistrarPesoDialogComponent, PesoResponse, DatosRegistrarPeso>(
    RegistrarPesoDialogComponent,
    { titulo: 'Registrar peso', size: 'sm', data: datos },
  );
  let resultado: PesoResponse | undefined | 'sin cerrar' = 'sin cerrar';
  ref.closed.subscribe((r) => (resultado = r));
  await esperar();
  const dialogo = document.querySelector('app-registrar-peso-dialog') as HTMLElement;
  return { dialogo, resultado: () => resultado };
}

function escribir(input: HTMLInputElement, valor: string): void {
  input.value = valor;
  input.dispatchEvent(new Event('input'));
  input.dispatchEvent(new Event('blur'));
}

describe('RegistrarPesoDialogComponent', () => {
  it('empieza con la fecha de hoy (tope en hoy) y el peso conocido', async () => {
    const { dialogo } = await abrir({ pesoKg: 71.4 });
    const fecha = dialogo.querySelector('input[type=date]') as HTMLInputElement;
    expect(fecha.value).toBe(hoyLocal());
    expect(fecha.max).toBe(hoyLocal());
    expect((dialogo.querySelector('ns-quantity-input input') as HTMLInputElement).value).toBe('71,4');
    expect(document.querySelector('.ns-dialog-pane--centrado')).not.toBeNull();
  });

  it('guarda con un decimal, muestra el toast y devuelve el PesoResponse', async () => {
    const { dialogo, resultado } = await abrir();
    escribir(dialogo.querySelector('ns-quantity-input input') as HTMLInputElement, '70,46');
    dialogo.querySelector('form')!.dispatchEvent(new Event('submit'));

    const peticion = http.expectOne({ method: 'POST', url: '/api/v1/seguimiento/peso' });
    expect(peticion.request.body).toEqual({ fecha: hoyLocal(), pesoKg: 70.5 });
    const pesaje: PesoResponse = { id: 'p-1', fecha: hoyLocal(), pesoKg: 70.5 };
    peticion.flush(pesaje, { status: 201, statusText: 'Created' });
    await esperar();

    expect(resultado()).toEqual(pesaje);
    const toast = TestBed.inject(NsToastService).visibles()[0];
    expect(toast.titulo).toBe('Peso guardado');
    expect(toast.mensaje).toContain('70,5 kg');
  });

  it('no envía una fecha futura ni un peso fuera de 30–250', async () => {
    const { dialogo, resultado } = await abrir();
    escribir(dialogo.querySelector('input[type=date]') as HTMLInputElement, sumarDias(hoyLocal(), 1));
    const peso = dialogo.querySelector('ns-quantity-input input') as HTMLInputElement;
    peso.value = '25';
    peso.dispatchEvent(new Event('input'));
    dialogo.querySelector('form')!.dispatchEvent(new Event('submit'));
    await esperar();

    http.expectNone('/api/v1/seguimiento/peso');
    expect(dialogo.textContent).toContain('La fecha no puede ser posterior a hoy.');
    expect(dialogo.textContent).toContain('El valor mínimo es 30.');
    expect(resultado()).toBe('sin cerrar');
  });

  it('un 400 se muestra en su campo y el diálogo sigue abierto', async () => {
    const { dialogo, resultado } = await abrir({ pesoKg: 70 });
    dialogo.querySelector('form')!.dispatchEvent(new Event('submit'));
    http.expectOne('/api/v1/seguimiento/peso').flush(
      {
        status: 400,
        codigo: 'VALIDACION',
        title: 'Datos no válidos',
        detail: 'Los datos enviados no son válidos',
        errors: [{ campo: 'fecha', mensaje: 'La fecha no puede ser futura' }],
      },
      { status: 400, statusText: 'Bad Request' },
    );
    await esperar();
    expect(dialogo.textContent).toContain('La fecha no puede ser futura');
    expect(resultado()).toBe('sin cerrar');
  });
});

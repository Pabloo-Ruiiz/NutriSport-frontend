import { InteractivityChecker } from '@angular/cdk/a11y';
import { Dialog } from '@angular/cdk/dialog';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideLucideIcons } from '@lucide/angular';

import { LayoutService } from '@core/layout/layout.service';
import { ICONOS_APP } from '@shared/design/iconos';
import { NsConfirmService } from './confirm.service';
import { DialogShellComponent } from './dialog-shell.component';
import { NsDialogService } from './dialog.service';
import { NsDrawerComponent } from './drawer.component';

@Component({
  imports: [DialogShellComponent],
  template: `<ns-dialog-shell
    ><p>Cuerpo</p>
    <button nsDialogAcciones type="button">Guardar</button></ns-dialog-shell
  >`,
})
class DialogoPrueba {}

const esMovil = signal(false);

/**
 * jsdom no calcula tamaños, así que el CDK cree que ningún elemento es visible ni enfocable y la
 * trampa de foco no encuentra dónde poner el foco. En un navegador real no hace falta.
 */
class InteractivityCheckerJsdom {
  isDisabled = (elemento: HTMLElement) => elemento.hasAttribute('disabled');
  isVisible = () => true;
  isFocusable = (elemento: HTMLElement) => elemento.matches('button, input, select, textarea, a[href], [tabindex]');
  isTabbable = (elemento: HTMLElement) => this.isFocusable(elemento) && elemento.tabIndex >= 0;
}

function configurar(): void {
  TestBed.configureTestingModule({
    providers: [
      provideLucideIcons(...ICONOS_APP),
      { provide: LayoutService, useValue: { esMovil } },
      { provide: InteractivityChecker, useClass: InteractivityCheckerJsdom },
    ],
  });
}

const contenedor = () => document.querySelector('.cdk-overlay-container') as HTMLElement;
const esperar = () => new Promise((resolver) => setTimeout(resolver));

describe('NsDialogService', () => {
  beforeEach(() => {
    esMovil.set(false);
    configurar();
  });

  afterEach(() => TestBed.inject(Dialog).closeAll());

  it('en escritorio abre un diálogo centrado con el ancho del tamaño y el título enlazado', async () => {
    TestBed.inject(NsDialogService).open(DialogoPrueba, { titulo: 'Añadir comida', size: 'lg' });
    await esperar();

    const panel = contenedor().querySelector('.ns-dialog-pane') as HTMLElement;
    expect(panel.classList).toContain('ns-dialog-pane--centrado');
    expect(panel.style.width).toBe('720px');

    const dialogo = contenedor().querySelector('[role="dialog"]') as HTMLElement;
    const titulo = contenedor().querySelector('.ns-dialog__titulo') as HTMLElement;
    expect(titulo.tagName).toBe('H2');
    expect(titulo.textContent).toBe('Añadir comida');
    expect(dialogo.getAttribute('aria-labelledby')).toBe(titulo.id);
    expect(contenedor().querySelector('.ns-dialog__cerrar')?.getAttribute('aria-label')).toBe('Cerrar');
    expect(contenedor().querySelector('.ns-dialog__pie')?.textContent).toContain('Guardar');
  });

  it('en móvil abre un bottom sheet a ancho completo con asa', async () => {
    esMovil.set(true);
    TestBed.inject(NsDialogService).open(DialogoPrueba, { titulo: 'Registrar' });
    await esperar();

    const panel = contenedor().querySelector('.ns-dialog-pane') as HTMLElement;
    expect(panel.classList).toContain('ns-dialog-pane--sheet');
    expect(panel.style.width).toBe('100%');
    expect(contenedor().querySelector('ns-dialog-shell')?.classList).toContain('ns-dialog--sheet');
    expect(contenedor().querySelector('.ns-dialog__asa')).not.toBeNull();
  });

  it('el botón cerrar cierra el diálogo', async () => {
    const ref = TestBed.inject(NsDialogService).open(DialogoPrueba, { titulo: 'Añadir comida' });
    const cerrado = vi.fn();
    ref.closed.subscribe(cerrado);
    await esperar();

    (contenedor().querySelector('.ns-dialog__cerrar') as HTMLButtonElement).click();
    expect(cerrado).toHaveBeenCalledWith(undefined);
  });
});

describe('NsConfirmService', () => {
  beforeEach(() => configurar());

  const pulsar = (texto: string) => {
    const boton = [...contenedor().querySelectorAll('button')].find((b) => b.textContent?.trim() === texto);
    if (!boton) throw new Error(`No hay botón "${texto}"`);
    boton.click();
  };

  it('devuelve true al confirmar y false al cancelar', async () => {
    const servicio = TestBed.inject(NsConfirmService);

    const confirmado = servicio.confirmar({
      titulo: '¿Duplicar?',
      mensaje: 'Se copiará el menú.',
      textoConfirmar: 'Duplicar',
    });
    await esperar();
    pulsar('Duplicar');
    expect(await confirmado).toBe(true);

    const cancelado = servicio.confirmar({ titulo: '¿Duplicar?', mensaje: 'Se copiará el menú.' });
    await esperar();
    pulsar('Cancelar');
    expect(await cancelado).toBe(false);
  });

  it('usa el botón danger en las acciones destructivas', async () => {
    const resultado = TestBed.inject(NsConfirmService).confirmar({
      titulo: '¿Eliminar?',
      mensaje: 'No se puede deshacer.',
      textoConfirmar: 'Eliminar',
      peligro: true,
    });
    await esperar();
    const eliminar = [...contenedor().querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Eliminar');
    expect(eliminar?.classList).toContain('ns-button--danger');
    pulsar('Cancelar');
    await resultado;
  });

  it('con pedirPassword exige la contraseña y la devuelve', async () => {
    const resultado = TestBed.inject(NsConfirmService).confirmar({
      titulo: 'Eliminar tu cuenta',
      mensaje: 'Se borrarán todos tus datos.',
      textoConfirmar: 'Eliminar cuenta',
      peligro: true,
      pedirPassword: true,
    });
    await esperar();

    const password = contenedor().querySelector('input[type="password"]') as HTMLInputElement;
    expect(password).not.toBeNull();

    pulsar('Eliminar cuenta');
    await esperar();
    expect(contenedor().querySelector('.ns-error-campo')?.textContent).toBe('Este campo es obligatorio.');

    password.value = 'secreta123';
    password.dispatchEvent(new Event('input'));
    pulsar('Eliminar cuenta');
    expect(await resultado).toBe('secreta123');
  });
});

@Component({
  imports: [NsDrawerComponent],
  template: `
    <button id="disparador" type="button" (click)="abierto.set(true)">Filtros</button>
    <ns-drawer [(abierto)]="abierto" titulo="Filtros" [ancho]="400">
      <button id="dentro" type="button">Opción</button>
    </ns-drawer>
  `,
})
class AnfitrionDrawer {
  readonly abierto = signal(false);
}

describe('NsDrawerComponent', () => {
  let fixture: ComponentFixture<AnfitrionDrawer>;

  beforeEach(async () => {
    configurar();
    fixture = TestBed.createComponent(AnfitrionDrawer);
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
  });

  afterEach(() => fixture.nativeElement.remove());

  it('se abre como diálogo modal con el ancho indicado y atrapa el foco', async () => {
    const disparador = fixture.nativeElement.querySelector('#disparador') as HTMLButtonElement;
    disparador.focus();
    disparador.click();
    await fixture.whenStable();
    await esperar();

    const panel = contenedor().querySelector('.ns-drawer') as HTMLElement;
    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.getAttribute('aria-modal')).toBe('true');
    expect(panel.style.width).toBe('400px');
    expect(contenedor().querySelector(`#${panel.getAttribute('aria-labelledby')}`)?.textContent).toBe('Filtros');
    expect(panel.contains(document.activeElement)).toBe(true);
    expect(panel.querySelector('#dentro')).not.toBeNull();
  });

  it('se cierra con Escape, actualiza el modelo y devuelve el foco', async () => {
    const disparador = fixture.nativeElement.querySelector('#disparador') as HTMLButtonElement;
    disparador.focus();
    disparador.click();
    await fixture.whenStable();
    await esperar();

    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();

    expect(fixture.componentInstance.abierto()).toBe(false);
    expect(contenedor().querySelector('.ns-drawer')).toBeNull();
    expect(document.activeElement).toBe(disparador);
  });
});

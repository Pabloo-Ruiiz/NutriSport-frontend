import { Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideLucideIcons } from '@lucide/angular';

import { ICONOS_APP } from '@shared/design/iconos';
import { NsDropzoneComponent } from './dropzone.component';

@Component({
  imports: [NsDropzoneComponent],
  template: `<ns-dropzone [deshabilitado]="deshabilitado()" (archivo)="elegidos.push($event)" />`,
})
class Anfitrion {
  readonly deshabilitado = signal(false);
  readonly elegidos: File[] = [];
}

let fixture: ComponentFixture<Anfitrion>;
const raiz = () => fixture.nativeElement as HTMLElement;
const zona = () => raiz().querySelector<HTMLElement>('.ns-dropzone__zona')!;
const inputs = () => [...raiz().querySelectorAll<HTMLInputElement>('input[type="file"]')];
const boton = (texto: string) =>
  [...raiz().querySelectorAll('button')].find((b) => b.textContent?.includes(texto)) as HTMLButtonElement;
const FOTO = new File(['x'], 'plato.jpg', { type: 'image/jpeg' });

function eventoArrastre(tipo: string, archivos: File[] = [FOTO]): Event {
  const evento = new Event(tipo, { bubbles: true, cancelable: true });
  Object.defineProperty(evento, 'dataTransfer', { value: { files: archivos, types: ['Files'], dropEffect: 'none' } });
  return evento;
}

beforeEach(async () => {
  TestBed.configureTestingModule({ providers: [provideLucideIcons(...ICONOS_APP)] });
  fixture = TestBed.createComponent(Anfitrion);
  await fixture.whenStable();
});

describe('NsDropzoneComponent', () => {
  it('muestra el texto, los formatos y los dos botones; la cámara usa capture="environment"', () => {
    expect(raiz().textContent).toContain('Arrastra una foto o haz clic');
    expect(raiz().textContent).toContain('JPEG o PNG hasta 10 MB');
    const [camara, selector] = inputs();
    expect(camara.accept).toBe('image/*');
    expect(camara.getAttribute('capture')).toBe('environment');
    expect(selector.accept).toBe('image/*');
    expect(selector.hasAttribute('capture')).toBe(false);
    expect(boton('Hacer foto')).toBeTruthy();
    expect(boton('Subir archivo')).toBeTruthy();
  });

  it('la zona es un botón accesible con teclado que abre el selector', () => {
    const [camara, selector] = inputs();
    const abrirSelector = vi.spyOn(selector, 'click').mockImplementation(() => undefined);
    const abrirCamara = vi.spyOn(camara, 'click').mockImplementation(() => undefined);

    expect(zona().getAttribute('role')).toBe('button');
    expect(zona().tabIndex).toBe(0);
    expect(zona().getAttribute('aria-describedby')).toBe(raiz().querySelector('.ns-dropzone__formatos')!.id);

    zona().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    zona().dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    zona().click();
    boton('Subir archivo').click();
    expect(abrirSelector).toHaveBeenCalledTimes(4);

    boton('Hacer foto').click();
    expect(abrirCamara).toHaveBeenCalledTimes(1);
  });

  it('emite el archivo elegido y vacía el input', () => {
    const selector = inputs()[1];
    Object.defineProperty(selector, 'files', { value: [FOTO], configurable: true });
    selector.dispatchEvent(new Event('change'));
    expect(fixture.componentInstance.elegidos).toEqual([FOTO]);
  });

  it('marca la zona al arrastrar y emite el archivo soltado', async () => {
    const host = raiz().querySelector('ns-dropzone')!;
    const dragover = eventoArrastre('dragover');
    host.dispatchEvent(dragover);
    await fixture.whenStable();
    expect(dragover.defaultPrevented).toBe(true);
    expect(host.classList).toContain('ns-dropzone--arrastrando');

    host.dispatchEvent(eventoArrastre('drop'));
    await fixture.whenStable();
    expect(host.classList).not.toContain('ns-dropzone--arrastrando');
    expect(fixture.componentInstance.elegidos).toEqual([FOTO]);
  });

  it('deshabilitado no abre el selector ni acepta archivos', async () => {
    fixture.componentInstance.deshabilitado.set(true);
    await fixture.whenStable();
    const abrir = vi.spyOn(inputs()[1], 'click');
    zona().click();
    expect(abrir).not.toHaveBeenCalled();
    expect(zona().tabIndex).toBe(-1);
    expect(boton('Hacer foto').disabled).toBe(true);

    raiz().querySelector('ns-dropzone')!.dispatchEvent(eventoArrastre('drop'));
    expect(fixture.componentInstance.elegidos).toEqual([]);
  });
});

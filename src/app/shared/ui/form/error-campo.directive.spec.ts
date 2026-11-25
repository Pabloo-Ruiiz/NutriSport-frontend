import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { ErrorCampoDirective } from './error-campo.directive';

@Component({
  imports: [ReactiveFormsModule, ErrorCampoDirective],
  template: `
    <input id="nombre" [formControl]="nombre" #campo />
    <p [nsErrorCampo]="nombre" [nsErrorCampoPara]="campo"></p>
  `,
})
class Anfitrion {
  readonly nombre = new FormControl('', Validators.required);
}

describe('ErrorCampoDirective', () => {
  let fixture: ComponentFixture<Anfitrion>;
  let mensaje: HTMLParagraphElement;
  let input: HTMLInputElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Anfitrion);
    await fixture.whenStable();
    mensaje = fixture.nativeElement.querySelector('p');
    input = fixture.nativeElement.querySelector('input');
  });

  it('no muestra nada mientras el control no está tocado', () => {
    expect(mensaje.hidden).toBe(true);
    expect(mensaje.textContent).toBe('');
    expect(input.hasAttribute('aria-describedby')).toBe(false);
  });

  it('muestra el mensaje de required al tocar el control y lo enlaza con aria-describedby', async () => {
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();

    expect(mensaje.hidden).toBe(false);
    expect(mensaje.textContent).toBe('Este campo es obligatorio.');
    expect(mensaje.id).toMatch(/^ns-error-\d+$/);
    expect(input.getAttribute('aria-describedby')).toBe(mensaje.id);
  });

  it('muestra el texto del error "servidor" aunque el control no esté tocado', async () => {
    const control = fixture.componentInstance.nombre;
    control.setValue('Ana');
    control.setErrors({ servidor: 'Este nombre de usuario ya está en uso.' });
    await fixture.whenStable();

    expect(mensaje.hidden).toBe(false);
    expect(mensaje.textContent).toBe('Este nombre de usuario ya está en uso.');
    expect(input.getAttribute('aria-describedby')).toBe(mensaje.id);

    // Al volver a escribir, los validadores se ejecutan y el error del servidor desaparece.
    control.setValue('Ana María');
    await fixture.whenStable();
    expect(mensaje.hidden).toBe(true);
    expect(input.hasAttribute('aria-describedby')).toBe(false);
  });
});

import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { provideLucideIcons } from '@lucide/angular';

import { ICONOS_APP } from '@shared/design/iconos';
import { ErrorCampoDirective } from './error-campo.directive';
import { NsFormFieldComponent } from './form-field.component';
import { NsInputDirective } from './input.directive';

@Component({
  imports: [ReactiveFormsModule, NsFormFieldComponent, NsInputDirective, ErrorCampoDirective],
  template: `
    <form [formGroup]="form">
      <ns-form-field label="Peso" hint="En ayunas." sufijo="kg" obligatorio>
        <input nsInput type="number" formControlName="peso" />
      </ns-form-field>

      <label for="email">Correo</label>
      <input id="email" aria-describedby="email-ayuda" formControlName="email" #email />
      <p [nsErrorCampo]="form.controls.email" [nsErrorCampoPara]="email"></p>
    </form>
  `,
})
class Anfitrion {
  readonly form = new FormGroup({
    peso: new FormControl<number | null>(null, [Validators.required, Validators.min(30)]),
    email: new FormControl('', [Validators.required, Validators.email]),
  });
}

describe('NsFormFieldComponent + NsInputDirective + ErrorCampoDirective', () => {
  let fixture: ComponentFixture<Anfitrion>;
  let raiz: HTMLElement;
  let input: HTMLInputElement;

  const errorDelCampo = () => raiz.querySelector('ns-form-field .ns-error-campo') as HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideLucideIcons(...ICONOS_APP)] });
    fixture = TestBed.createComponent(Anfitrion);
    await fixture.whenStable();
    raiz = fixture.nativeElement;
    input = raiz.querySelector('ns-form-field input') as HTMLInputElement;
  });

  it('enlaza la etiqueta con el input y anuncia unidad y obligatoriedad', () => {
    const etiqueta = raiz.querySelector('.ns-form-field__label') as HTMLLabelElement;
    expect(input.id).toMatch(/^ns-input-\d+$/);
    expect(etiqueta.htmlFor).toBe(input.id);
    expect(etiqueta.querySelector('.ns-form-field__obligatorio')?.getAttribute('aria-hidden')).toBe('true');
    expect(etiqueta.textContent?.replace(/\s+/g, ' ').trim()).toBe('Peso (kg)* (obligatorio)');
    expect(raiz.querySelector('.ns-form-field__sufijo')?.textContent).toBe('kg');
    expect(input.classList).toContain('ns-input');
  });

  it('describe el input con la ayuda', () => {
    const ayuda = raiz.querySelector('.ns-form-field__hint') as HTMLElement;
    expect(input.getAttribute('aria-describedby')).toBe(ayuda.id);
  });

  it('no muestra el error hasta que el control está tocado', async () => {
    expect(errorDelCampo().hidden).toBe(true);
    expect(input.classList).not.toContain('ns-input--error');
    expect(input.hasAttribute('aria-invalid')).toBe(false);

    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();

    expect(errorDelCampo().hidden).toBe(false);
    expect(errorDelCampo().textContent).toBe('Este campo es obligatorio.');
    expect(input.classList).toContain('ns-input--error');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')?.split(' ')).toContain(errorDelCampo().id);
  });

  it('actualiza el mensaje con el valor y lo quita al corregirlo', async () => {
    const peso = fixture.componentInstance.form.controls.peso;
    peso.markAsTouched();
    peso.setValue(20);
    await fixture.whenStable();
    expect(errorDelCampo().textContent).toBe('El valor mínimo es 30.');

    peso.setValue(72);
    await fixture.whenStable();
    expect(errorDelCampo().hidden).toBe(true);
    expect(input.classList).not.toContain('ns-input--error');
    expect(input.getAttribute('aria-describedby')).not.toContain(errorDelCampo().id);
  });

  it('muestra el error del servidor aunque el control no esté tocado', async () => {
    fixture.componentInstance.form.controls.peso.setValue(72);
    fixture.componentInstance.form.controls.peso.setErrors({ servidor: 'El peso no es realista.' });
    await fixture.whenStable();
    expect(errorDelCampo().hidden).toBe(false);
    expect(errorDelCampo().textContent).toBe('El peso no es realista.');
  });

  it('fuera del campo, enlaza el error con aria-describedby sin perder los ids previos', async () => {
    const email = raiz.querySelector('#email') as HTMLInputElement;
    const error = raiz.querySelector('form > .ns-error-campo') as HTMLElement;

    fixture.componentInstance.form.controls.email.setValue('no-es-un-correo');
    fixture.componentInstance.form.controls.email.markAsTouched();
    await fixture.whenStable();

    expect(error.textContent).toContain('correo electrónico válido');
    expect(email.getAttribute('aria-describedby')).toBe(`email-ayuda ${error.id}`);
    expect(email.getAttribute('aria-invalid')).toBe('true');

    fixture.componentInstance.form.controls.email.setValue('ana@correo.com');
    await fixture.whenStable();
    expect(error.hidden).toBe(true);
    expect(email.getAttribute('aria-describedby')).toBe('email-ayuda');
    expect(email.hasAttribute('aria-invalid')).toBe(false);
  });
});

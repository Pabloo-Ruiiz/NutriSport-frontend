import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { provideLucideIcons } from '@lucide/angular';

import { ICONOS_APP } from '@shared/design/iconos';

import { NsFormFieldComponent } from './form-field.component';
import { NsInputDirective } from './input.directive';

@Component({
  imports: [ReactiveFormsModule, NsFormFieldComponent, NsInputDirective],
  template: `
    <ns-form-field label="Fecha" hint="Como mucho, mañana.">
      <input nsInput type="date" [formControl]="control" [invalido]="!!error()" descritoPor="error-fecha" />
    </ns-form-field>
    <p id="error-fecha" [hidden]="!error()">{{ error() }}</p>
  `,
})
class Anfitrion {
  readonly control = new FormControl('', Validators.required);
  readonly error = signal<string | null>(null);
}

describe('NsInputDirective', () => {
  it('suma descritoPor a la ayuda del campo e invalido marca aria-invalid (sin pisarse con el campo)', async () => {
    TestBed.configureTestingModule({ providers: [provideLucideIcons(...ICONOS_APP)] });
    const fixture = TestBed.createComponent(Anfitrion);
    await fixture.whenStable();
    const input = (fixture.nativeElement as HTMLElement).querySelector('input')!;
    const ids = () => input.getAttribute('aria-describedby')?.split(' ') ?? [];

    expect(ids()).toContain('error-fecha');
    expect(ids().length).toBe(2); // ayuda del campo + error externo
    expect(input.hasAttribute('aria-invalid')).toBe(false);

    fixture.componentInstance.error.set('No puede ser posterior a mañana.');
    await fixture.whenStable();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.classList).toContain('ns-input--error');

    // El error propio del control también se sigue enlazando.
    fixture.componentInstance.error.set(null);
    fixture.componentInstance.control.markAsTouched();
    fixture.componentInstance.control.updateValueAndValidity();
    await fixture.whenStable();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(ids()).toContain('error-fecha');
    expect(ids().length).toBe(3);
  });
});

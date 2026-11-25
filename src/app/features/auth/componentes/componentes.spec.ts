import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { provideLucideIcons } from '@lucide/angular';

import { contrasenaSegura } from '@core/util/validadores';
import { ICONOS_APP } from '@shared/design/iconos';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { CampoPasswordComponent } from './campo-password.component';
import { PasswordStrengthComponent, evaluarFortaleza, tieneSecuenciaObvia } from './password-strength.component';

describe('evaluarFortaleza', () => {
  it('0 si está vacía', () => {
    expect(evaluarFortaleza('')).toBe(0);
    expect(evaluarFortaleza(null)).toBe(0);
  });

  it('Débil si no cumple las reglas o tiene una secuencia obvia', () => {
    expect(evaluarFortaleza('Ab1!')).toBe(1);
    expect(evaluarFortaleza('Abcdefghij')).toBe(1); // sin número
    expect(evaluarFortaleza('Qwerty#2025xx')).toBe(1);
    expect(evaluarFortaleza('Zpk1234#Lmw!x9')).toBe(1);
    expect(evaluarFortaleza('MiPassword#2025!')).toBe(1);
  });

  it('sube con la longitud y la variedad', () => {
    expect(evaluarFortaleza('zpkmlwtr9v')).toBe(1); // 10, 2 tipos
    expect(evaluarFortaleza('zpkmlwtr9vbnhy')).toBe(2); // 14, 2 tipos
    expect(evaluarFortaleza('Zpkmlwtr9v')).toBe(2); // 10, 3 tipos
    expect(evaluarFortaleza('Zpkmlwtr9vbnhy')).toBe(3); // 14, 3 tipos
    expect(evaluarFortaleza('Zpkm#lwtr9vbnh')).toBe(4); // 14, 4 tipos
  });

  it('detecta secuencias obvias', () => {
    expect(tieneSecuenciaObvia('xx1234xx')).toBe(true);
    expect(tieneSecuenciaObvia('xxdcbaxx')).toBe(true);
    expect(tieneSecuenciaObvia('xxaaaaxx')).toBe(true);
    expect(tieneSecuenciaObvia('xxasdfxx')).toBe(true);
    expect(tieneSecuenciaObvia('xxtrewxx')).toBe(true); // fila del teclado al revés
    expect(tieneSecuenciaObvia('NutriSport9x')).toBe(true);
    expect(tieneSecuenciaObvia('Zpkm#lwtr9vb')).toBe(false);
  });
});

@Component({
  imports: [ReactiveFormsModule, NsFormFieldComponent, CampoPasswordComponent, PasswordStrengthComponent],
  template: `
    <ns-form-field label="Contraseña" obligatorio>
      <ns-campo-password [formControl]="control" autocomplete="new-password" />
    </ns-form-field>
    <ns-password-strength [password]="valor()" />
  `,
})
class Anfitrion {
  readonly control = new FormControl('', { nonNullable: true, validators: [Validators.required, contrasenaSegura()] });
  readonly valor = signal('');
}

describe('CampoPasswordComponent y PasswordStrengthComponent', () => {
  let fixture: ComponentFixture<Anfitrion>;
  let input: HTMLInputElement;
  let boton: HTMLButtonElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideLucideIcons(...ICONOS_APP)] });
    fixture = TestBed.createComponent(Anfitrion);
    await fixture.whenStable();
    input = fixture.nativeElement.querySelector('input');
    boton = fixture.nativeElement.querySelector('.ns-campo-password__boton');
  });

  it('se enlaza con la etiqueta de ns-form-field', () => {
    const label = fixture.nativeElement.querySelector('label') as HTMLLabelElement;
    expect(label.htmlFor).toBe(input.id);
    expect(input.getAttribute('autocomplete')).toBe('new-password');
  });

  it('escribe y lee el valor del formulario', async () => {
    fixture.componentInstance.control.setValue('desde-fuera1');
    await fixture.whenStable();
    expect(input.value).toBe('desde-fuera1');

    input.value = 'tecleada 123';
    input.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.control.value).toBe('tecleada 123');
  });

  it('muestra y oculta la contraseña con aria-pressed', async () => {
    expect(input.type).toBe('password');
    expect(boton.getAttribute('aria-pressed')).toBe('false');
    expect(boton.getAttribute('aria-label')).toBe('Mostrar contraseña');

    boton.click();
    await fixture.whenStable();
    expect(input.type).toBe('text');
    expect(boton.getAttribute('aria-pressed')).toBe('true');

    boton.click();
    await fixture.whenStable();
    expect(input.type).toBe('password');
  });

  it('al salir del campo marca el control como tocado y muestra el error', async () => {
    input.value = 'corta1';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();

    expect(fixture.componentInstance.control.touched).toBe(true);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    const error = fixture.nativeElement.querySelector('.ns-error-campo') as HTMLElement;
    expect(error.textContent).toBe('La contraseña debe tener al menos 10 caracteres.');
    expect(input.getAttribute('aria-describedby')).toContain(error.id);
  });

  it('se deshabilita con el control', async () => {
    fixture.componentInstance.control.disable();
    await fixture.whenStable();
    expect(input.disabled).toBe(true);
    expect(boton.disabled).toBe(true);
  });

  it('el medidor dice el nivel con texto y llena los segmentos', async () => {
    const medidor = fixture.nativeElement.querySelector('ns-password-strength') as HTMLElement;
    expect(medidor.querySelector('.ns-fortaleza__nivel')?.textContent?.trim()).toBe('');
    expect(medidor.textContent).toContain('rechaza las contraseñas más comunes');

    fixture.componentInstance.valor.set('Zpkmlwtr9vbnhy');
    await fixture.whenStable();
    expect(medidor.querySelector('.ns-fortaleza__nivel')?.textContent?.trim()).toBe('Seguridad: Buena');
    expect(medidor.querySelectorAll('.ns-fortaleza__segmento--lleno').length).toBe(3);
    expect(medidor.getAttribute('data-nivel')).toBe('3');
  });
});

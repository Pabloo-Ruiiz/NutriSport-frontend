import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { provideLucideIcons } from '@lucide/angular';

import { ICONOS_APP } from '@shared/design/iconos';
import { NsQuantityInputComponent, escribirNumero, leerNumero } from './quantity-input.component';

describe('leerNumero / escribirNumero', () => {
  it('lee la coma decimal, los puntos de miles y el punto decimal', () => {
    expect(leerNumero('1,5')).toBe(1.5);
    expect(leerNumero('1.250')).toBe(1250);
    expect(leerNumero('1.250,5')).toBe(1250.5);
    expect(leerNumero('0.5')).toBe(0.5);
    expect(leerNumero(' 150 ')).toBe(150);
    expect(leerNumero('')).toBeNull();
    expect(leerNumero('abc')).toBeNull();
  });

  it('escribe con coma y sin ceros de sobra', () => {
    expect(escribirNumero(1.5, 1)).toBe('1,5');
    expect(escribirNumero(2, 1)).toBe('2');
    expect(escribirNumero(1250, 0)).toBe('1250');
    expect(escribirNumero(null, 0)).toBe('');
  });
});

@Component({
  imports: [ReactiveFormsModule, NsQuantityInputComponent],
  template: `<ns-quantity-input
    [formControl]="cantidad"
    [min]="0"
    [max]="2"
    [step]="0.5"
    [decimales]="1"
    unit="raciones"
  />`,
})
class Anfitrion {
  readonly cantidad = new FormControl<number | null>(1);
}

describe('NsQuantityInputComponent', () => {
  let fixture: ComponentFixture<Anfitrion>;
  let input: HTMLInputElement;
  let menos: HTMLButtonElement;
  let mas: HTMLButtonElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideLucideIcons(...ICONOS_APP)] });
    fixture = TestBed.createComponent(Anfitrion);
    await fixture.whenStable();
    input = fixture.nativeElement.querySelector('input');
    [menos, mas] = fixture.nativeElement.querySelectorAll('button');
  });

  it('suma y resta el paso con botones de nombre accesible, sin salirse de los límites', async () => {
    expect(input.value).toBe('1');
    expect(mas.getAttribute('aria-label')).toBe('Sumar 0,5 raciones');

    mas.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.cantidad.value).toBe(1.5);
    expect(input.value).toBe('1,5');

    mas.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.cantidad.value).toBe(2);
    expect(mas.disabled).toBe(true);
    expect(input.getAttribute('aria-valuenow')).toBe('2');
  });

  it('acepta la coma al escribir y ajusta a los límites al salir', async () => {
    input.dispatchEvent(new Event('focus'));
    input.value = '0,5';
    input.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.cantidad.value).toBe(0.5);

    input.value = '7';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(fixture.componentInstance.cantidad.value).toBe(2);
    expect(input.value).toBe('2');
    expect(fixture.componentInstance.cantidad.touched).toBe(true);
  });

  it('responde a las flechas del teclado', async () => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    await fixture.whenStable();
    expect(fixture.componentInstance.cantidad.value).toBe(0.5);
    expect(menos.disabled).toBe(false);
  });
});

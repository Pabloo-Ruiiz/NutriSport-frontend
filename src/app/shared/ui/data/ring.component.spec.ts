import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NsRingComponent } from './ring.component';

@Component({
  imports: [NsRingComponent],
  template: `
    <ns-ring
      [value]="valor()"
      [max]="1800"
      color="kcal"
      unidad="kcal"
      etiqueta="Energía de hoy"
      [size]="180"
      [valueInterior]="interior()"
      [maxInterior]="600"
      etiquetaInterior="Gasto del entreno"
    >
      <span class="centro">1.240</span>
    </ns-ring>
  `,
})
class Anfitrion {
  readonly valor = signal(560);
  readonly interior = signal<number | undefined>(undefined);
}

describe('NsRingComponent', () => {
  let fixture: ComponentFixture<Anfitrion>;
  let anillo: HTMLElement;
  const barras = () => [...anillo.querySelectorAll('[role="progressbar"]')] as HTMLElement[];

  beforeEach(async () => {
    fixture = TestBed.createComponent(Anfitrion);
    await fixture.whenStable();
    anillo = fixture.nativeElement.querySelector('ns-ring');
  });

  it('expone el progreso con role="progressbar", aria-valuenow, aria-valuemax y aria-label', () => {
    const [barra] = barras();
    expect(barras()).toHaveLength(1);
    expect(barra.getAttribute('aria-valuenow')).toBe('560');
    expect(barra.getAttribute('aria-valuemin')).toBe('0');
    expect(barra.getAttribute('aria-valuemax')).toBe('1800');
    expect(barra.getAttribute('aria-label')).toBe('Energía de hoy');
    expect(barra.getAttribute('aria-valuetext')).toBe('560 de 1.800 kcal');
    expect(anillo.querySelector('.centro')?.textContent).toBe('1.240');
    expect(anillo.querySelector('.ns-ring__exceso')).toBeNull();
  });

  it('con exceso completa el anillo, pinta el exceso y lo cuenta en el texto', async () => {
    fixture.componentInstance.valor.set(1920);
    await fixture.whenStable();

    const [barra] = barras();
    // aria-valuenow no puede superar aria-valuemax.
    expect(barra.getAttribute('aria-valuenow')).toBe('1800');
    expect(barra.getAttribute('aria-valuetext')).toBe('1.920 de 1.800 kcal, 120 kcal por encima');

    const exceso = anillo.querySelector('.ns-ring__exceso') as SVGCircleElement;
    expect(exceso).not.toBeNull();
    expect(exceso.getAttribute('stroke')).toMatch(/^url\(#ns-ring-patron-\d+\)$/);
    expect(exceso.getAttribute('stroke-dasharray')).toBe(`${(120 / 1800) * 100} 100`);
    expect(anillo.querySelector('.ns-ring__texto-exceso')?.textContent?.trim()).toBe('+120 kcal');
  });

  it('añade el anillo interior con su propia barra accesible', async () => {
    fixture.componentInstance.interior.set(320);
    await fixture.whenStable();

    expect(barras()).toHaveLength(2);
    const interior = barras()[1];
    expect(interior.getAttribute('aria-label')).toBe('Gasto del entreno');
    expect(interior.getAttribute('aria-valuenow')).toBe('320');
    expect(interior.getAttribute('aria-valuemax')).toBe('600');
  });
});

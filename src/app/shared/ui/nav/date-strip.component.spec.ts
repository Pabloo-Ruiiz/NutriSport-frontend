import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideLucideIcons } from '@lucide/angular';

import { ICONOS_APP } from '@shared/design/iconos';
import { NsDateStripComponent } from './date-strip.component';

@Component({
  imports: [NsDateStripComponent],
  template: `<ns-date-strip [(selected)]="fecha" hoy="2026-11-25" [markedDates]="marcadas" [max]="max()" />`,
})
class Anfitrion {
  readonly fecha = signal('2026-11-25');
  readonly marcadas = ['2026-11-23', '2026-11-24'];
  readonly max = signal<string | undefined>(undefined);
}

describe('NsDateStripComponent', () => {
  let fixture: ComponentFixture<Anfitrion>;
  let raiz: HTMLElement;

  const dias = () => [...raiz.querySelectorAll('.ns-date-strip__dia')] as HTMLButtonElement[];
  const fechas = () => dias().map((d) => d.dataset['fecha']);
  const boton = (etiqueta: string) => raiz.querySelector(`[aria-label="${etiqueta}"]`) as HTMLButtonElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideLucideIcons(...ICONOS_APP)] });
    fixture = TestBed.createComponent(Anfitrion);
    await fixture.whenStable();
    raiz = fixture.nativeElement;
  });

  it('muestra los 7 días alrededor de la fecha seleccionada', () => {
    expect(fechas()).toEqual([
      '2026-11-22',
      '2026-11-23',
      '2026-11-24',
      '2026-11-25',
      '2026-11-26',
      '2026-11-27',
      '2026-11-28',
    ]);
    const seleccionado = dias()[3];
    expect(seleccionado.getAttribute('aria-pressed')).toBe('true');
    expect(seleccionado.getAttribute('aria-current')).toBe('date');
    expect(seleccionado.getAttribute('aria-label')).toBe('miércoles, 25 de noviembre, hoy');
    expect(dias()[1].getAttribute('aria-label')).toBe('lunes, 23 de noviembre, con registros');
    expect(dias()[1].querySelector('.ns-date-strip__punto--visible')).not.toBeNull();
  });

  it('avanza una semana con la flecha sin cambiar la selección', async () => {
    boton('Semana siguiente').click();
    await fixture.whenStable();

    expect(fechas()[0]).toBe('2026-11-29');
    expect(fechas()[6]).toBe('2026-12-05');
    expect(fixture.componentInstance.fecha()).toBe('2026-11-25');

    boton('Semana anterior').click();
    boton('Semana anterior').click();
    await fixture.whenStable();
    expect(fechas()[3]).toBe('2026-11-18');
  });

  it('al elegir un día actualiza el modelo y se centra en él', async () => {
    boton('Semana siguiente').click();
    await fixture.whenStable();
    dias()[0].click(); // 2026-11-29
    await fixture.whenStable();

    expect(fixture.componentInstance.fecha()).toBe('2026-11-29');
    expect(fechas()[3]).toBe('2026-11-29');
  });

  it('con max deshabilita los días posteriores y la semana siguiente', async () => {
    fixture.componentInstance.max.set('2026-11-25');
    await fixture.whenStable();

    expect(dias().map((d) => d.disabled)).toEqual([false, false, false, false, true, true, true]);
    expect(boton('Semana siguiente').disabled).toBe(true);
  });
});

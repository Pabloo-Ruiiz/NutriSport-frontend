import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideLucideIcons } from '@lucide/angular';

import { ICONOS_APP } from '@shared/design/iconos';
import { NsAlertComponent, NsAlertType } from './alert.component';

@Component({
  imports: [NsAlertComponent],
  template: `
    <ns-alert [type]="tipo()" titulo="Aviso" dismissible (cerrar)="cerrado = true">Texto del aviso.</ns-alert>
  `,
})
class Anfitrion {
  readonly tipo = signal<NsAlertType>('info');
  cerrado = false;
}

describe('NsAlertComponent', () => {
  let fixture: ComponentFixture<Anfitrion>;
  let alerta: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideLucideIcons(...ICONOS_APP)] });
    fixture = TestBed.createComponent(Anfitrion);
    await fixture.whenStable();
    alerta = fixture.nativeElement.querySelector('ns-alert');
  });

  it('solo lleva role="alert" en el tipo error', async () => {
    expect(alerta.hasAttribute('role')).toBe(false);
    expect(alerta.classList).toContain('ns-alert--info');

    fixture.componentInstance.tipo.set('error');
    await fixture.whenStable();
    expect(alerta.getAttribute('role')).toBe('alert');
  });

  it('emite cerrar desde un botón con nombre accesible', () => {
    const boton = alerta.querySelector('button') as HTMLButtonElement;
    expect(boton.getAttribute('aria-label')).toBe('Cerrar aviso');
    boton.click();
    expect(fixture.componentInstance.cerrado).toBe(true);
  });
});

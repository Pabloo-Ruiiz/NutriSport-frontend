import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideLucideIcons } from '@lucide/angular';

import { ICONOS_APP } from '@shared/design/iconos';
import { NsButtonComponent, NsButtonVariant } from './button.component';

@Component({
  imports: [NsButtonComponent],
  template: `
    <button
      nsButton
      type="button"
      [variant]="variante()"
      size="sm"
      icon="sparkles"
      [loading]="cargando()"
      [disabled]="deshabilitado()"
      (click)="clics = clics + 1"
    >
      Analizar foto
    </button>
    <a nsButton href="/comidas" [disabled]="deshabilitado()" iconPosition="end" icon="chevron-right" fullWidth>
      Ver comidas
    </a>
  `,
})
class Anfitrion {
  readonly variante = signal<NsButtonVariant>('ai');
  readonly cargando = signal(false);
  readonly deshabilitado = signal(false);
  clics = 0;
}

describe('NsButtonComponent', () => {
  let fixture: ComponentFixture<Anfitrion>;
  let boton: HTMLButtonElement;
  let enlace: HTMLAnchorElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideLucideIcons(...ICONOS_APP)] });
    fixture = TestBed.createComponent(Anfitrion);
    await fixture.whenStable();
    boton = fixture.nativeElement.querySelector('button');
    enlace = fixture.nativeElement.querySelector('a');
  });

  it('refleja variante y tamaño en clases BEM del host', async () => {
    expect(boton.classList).toContain('ns-button');
    expect(boton.classList).toContain('ns-button--ai');
    expect(boton.classList).toContain('ns-button--sm');

    fixture.componentInstance.variante.set('danger');
    await fixture.whenStable();
    expect(boton.classList).toContain('ns-button--danger');
    expect(boton.classList).not.toContain('ns-button--ai');
  });

  it('pinta el icono y el texto', () => {
    expect(boton.querySelector('svg.ns-button__icon')).not.toBeNull();
    expect(boton.querySelector('.ns-button__label')?.textContent?.trim()).toBe('Analizar foto');
  });

  it('en carga muestra el spinner en lugar del icono, pone aria-busy y deshabilita', async () => {
    fixture.componentInstance.cargando.set(true);
    await fixture.whenStable();

    expect(boton.querySelector('ns-spinner')).not.toBeNull();
    expect(boton.querySelector('svg.ns-button__icon')).toBeNull();
    expect(boton.getAttribute('aria-busy')).toBe('true');
    expect(boton.disabled).toBe(true);
    expect(boton.querySelector('.ns-button__label')?.textContent?.trim()).toBe('Analizar foto');

    fixture.componentInstance.cargando.set(false);
    await fixture.whenStable();
    expect(boton.hasAttribute('aria-busy')).toBe(false);
    expect(boton.disabled).toBe(false);
  });

  it('en un enlace deshabilitado usa aria-disabled y cancela la navegación', async () => {
    expect(enlace.classList).toContain('ns-button--full');
    expect(enlace.classList).toContain('ns-button--icon-end');

    fixture.componentInstance.deshabilitado.set(true);
    await fixture.whenStable();

    expect(enlace.getAttribute('aria-disabled')).toBe('true');
    expect(enlace.getAttribute('tabindex')).toBe('-1');
    expect(enlace.hasAttribute('disabled')).toBe(false);

    const evento = new MouseEvent('click', { bubbles: true, cancelable: true });
    enlace.dispatchEvent(evento);
    expect(evento.defaultPrevented).toBe(true);
  });
});

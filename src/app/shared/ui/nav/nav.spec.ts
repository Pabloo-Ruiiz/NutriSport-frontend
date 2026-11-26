import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideLucideIcons } from '@lucide/angular';

import { ICONOS_APP } from '@shared/design/iconos';
import { NsPaginatorComponent } from './paginator.component';
import { NsTabPanelDirective, NsTabsComponent } from './tabs.component';

@Component({
  imports: [NsTabsComponent, NsTabPanelDirective],
  template: `
    <ns-tabs [pestanas]="pestanas" [(seleccionada)]="pestana" etiqueta="Detalle">
      <section nsTabPanel="ingredientes">Ingredientes</section>
      <section nsTabPanel="pasos">Pasos</section>
      <section nsTabPanel="nutricion">Nutrición</section>
    </ns-tabs>
  `,
})
class AnfitrionTabs {
  readonly pestanas = [
    { valor: 'ingredientes', etiqueta: 'Ingredientes' },
    { valor: 'pasos', etiqueta: 'Pasos', deshabilitada: true },
    { valor: 'nutricion', etiqueta: 'Nutrición' },
  ];
  readonly pestana = signal<string | null>('ingredientes');
}

describe('NsTabsComponent', () => {
  let fixture: ComponentFixture<AnfitrionTabs>;
  let tabs: HTMLButtonElement[];
  let paneles: HTMLElement[];

  beforeEach(async () => {
    fixture = TestBed.createComponent(AnfitrionTabs);
    // Dentro del documento, para que focus() y activeElement funcionen.
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
    tabs = [...fixture.nativeElement.querySelectorAll('[role="tab"]')];
    paneles = [...fixture.nativeElement.querySelectorAll('[role="tabpanel"]')];
  });

  afterEach(() => fixture.nativeElement.remove());

  it('enlaza pestañas y paneles y solo muestra el activo', () => {
    expect(fixture.nativeElement.querySelector('[role="tablist"]').getAttribute('aria-label')).toBe('Detalle');
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[0].getAttribute('aria-controls')).toBe(paneles[0].id);
    expect(paneles[0].getAttribute('aria-labelledby')).toBe(tabs[0].id);
    expect(paneles.map((p) => p.hidden)).toEqual([false, true, true]);
    expect(tabs.map((t) => t.tabIndex)).toEqual([0, -1, -1]);
  });

  it('con las flechas cambia de pestaña, salta las deshabilitadas y mueve el foco', async () => {
    tabs[0].focus();
    tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await fixture.whenStable();

    expect(fixture.componentInstance.pestana()).toBe('nutricion');
    expect(document.activeElement).toBe(tabs[2]);
    expect(paneles.map((p) => p.hidden)).toEqual([true, true, false]);

    tabs[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await fixture.whenStable();
    expect(fixture.componentInstance.pestana()).toBe('ingredientes');
  });
});

@Component({
  imports: [NsPaginatorComponent],
  template: `<ns-paginator [(page)]="pagina" [totalPages]="total()" />`,
})
class AnfitrionPaginador {
  readonly pagina = signal(0);
  readonly total = signal(7);
}

describe('NsPaginatorComponent', () => {
  it('muestra "Página N de M", cambia de página y se deshabilita en los extremos', async () => {
    TestBed.configureTestingModule({ providers: [provideLucideIcons(...ICONOS_APP)] });
    const fixture = TestBed.createComponent(AnfitrionPaginador);
    await fixture.whenStable();
    const raiz = fixture.nativeElement as HTMLElement;
    const [anterior, siguiente] = [...raiz.querySelectorAll('button')];

    expect(raiz.querySelector('.ns-paginator__texto')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Página 1 de 7');
    expect(anterior.disabled).toBe(true);

    siguiente.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.pagina()).toBe(1);
    expect(raiz.querySelector('.ns-paginator__texto')?.textContent).toContain('2');

    fixture.componentInstance.pagina.set(6);
    await fixture.whenStable();
    expect(siguiente.disabled).toBe(true);

    fixture.componentInstance.total.set(1);
    await fixture.whenStable();
    expect(raiz.querySelector('nav')).toBeNull();
  });
});

@Component({
  imports: [NsPaginatorComponent],
  template: `<ns-paginator [(page)]="pagina" [totalPages]="total()" [(size)]="tamano" [tamanos]="[10, 20, 50]" />`,
})
class AnfitrionPaginadorTamano {
  readonly pagina = signal(2);
  readonly total = signal(1);
  readonly tamano = signal<number | null>(20);
}

describe('NsPaginatorComponent con tamaños', () => {
  it('muestra el selector aunque haya una sola página y emite el tamaño sin tocar la página', async () => {
    TestBed.configureTestingModule({ providers: [provideLucideIcons(...ICONOS_APP)] });
    const fixture = TestBed.createComponent(AnfitrionPaginadorTamano);
    await fixture.whenStable();
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('.ns-paginator__texto')).toBeNull();
    const select = raiz.querySelector('select') as HTMLSelectElement;
    expect([...select.options].map((o) => o.textContent?.trim())).toEqual([
      '10 por página',
      '20 por página',
      '50 por página',
    ]);
    expect(select.selectedOptions[0].textContent?.trim()).toBe('20 por página');
    expect(select.getAttribute('aria-label')).toBe('Elementos por página');

    select.selectedIndex = 2;
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(fixture.componentInstance.tamano()).toBe(50);
    expect(fixture.componentInstance.pagina()).toBe(2);
  });
});

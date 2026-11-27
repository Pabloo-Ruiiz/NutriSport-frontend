import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideLucideIcons } from '@lucide/angular';

import type { RecetaResumenResponse } from '@core/models';
import { ICONOS_APP } from '@shared/design/iconos';
import { NsCalcStatusComponent } from './calc-status.component';
import { NsRecipeCardComponent } from './recipe-card.component';

const BASE: RecetaResumenResponse = {
  id: 'a1',
  referenciaExterna: null,
  origen: 'PROPIA',
  nombre: 'Bowl de pollo',
  categoria: 'Platos principales',
  area: null,
  imagenUrl: 'https://example.test/bowl.jpg',
  nutricionRacion: { kcal: 812.4, proteinas: 71.6, carbohidratos: 80, grasas: 20 },
  estadoNutricional: 'COMPLETO',
  alergenosVerificados: true,
  compatible: true,
  favorita: false,
  fuente: null,
};

@Component({
  imports: [NsRecipeCardComponent],
  template: `<ns-recipe-card
    [receta]="receta()"
    (favoritaCambiada)="cambios.push($event)"
    (abrir)="aperturas = aperturas + 1"
  />`,
})
class Anfitrion {
  readonly receta = signal<RecetaResumenResponse>(BASE);
  readonly cambios: boolean[] = [];
  aperturas = 0;
}

@Component({
  imports: [NsCalcStatusComponent],
  template: `<ns-calc-status [estado]="estado()" [completitud]="completitud()" />`,
})
class AnfitrionEstado {
  readonly estado = signal<string | null>('COMPLETO');
  readonly completitud = signal<number | null>(null);
}

beforeEach(() => TestBed.configureTestingModule({ providers: [provideLucideIcons(...ICONOS_APP)] }));

describe('NsCalcStatusComponent', () => {
  it('muestra cada estado con texto y la completitud si llega', async () => {
    const fixture = TestBed.createComponent(AnfitrionEstado);
    const texto = async () => {
      await fixture.whenStable();
      const badge = (fixture.nativeElement as HTMLElement).querySelector('ns-badge')!;
      return [badge.textContent?.trim(), badge.className];
    };
    expect(await texto()).toEqual(['Calculado', expect.stringContaining('info')]);

    fixture.componentInstance.estado.set('APROXIMADO');
    fixture.componentInstance.completitud.set(90);
    expect(await texto()).toEqual(['Aproximado · 90 % de ingredientes', expect.stringContaining('warning')]);

    fixture.componentInstance.estado.set('INCOMPLETO');
    fixture.componentInstance.completitud.set(null);
    expect((await texto())[0]).toBe('Cálculo incompleto');

    fixture.componentInstance.estado.set('PENDIENTE');
    expect(await texto()).toEqual(['Cálculo pendiente', expect.stringContaining('neutral')]);
  });
});

describe('NsRecipeCardComponent', () => {
  async function crear(receta: Partial<RecetaResumenResponse> = {}) {
    const fixture = TestBed.createComponent(Anfitrion);
    fixture.componentInstance.receta.set({ ...BASE, ...receta });
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('pinta imagen perezosa, datos, cifras y badges de una receta propia', async () => {
    const { el } = await crear();
    const img = el.querySelector('img')!;
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.alt).toBe('Bowl de pollo');
    expect(el.querySelector('.ns-recipe-card__cifras')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      '812 kcal · 72 g P',
    );
    expect(el.textContent).toContain('NutriSport');
    expect(el.textContent).toContain('Calculado');
    expect(el.textContent).toContain('Compatible');
    expect(el.textContent).not.toContain('≈');
  });

  it('marca las cifras aproximadas con ≈ y avisa si no es compatible', async () => {
    const { el } = await crear({ estadoNutricional: 'APROXIMADO', compatible: false, origen: 'THEMEALDB' });
    expect(el.querySelectorAll('.ns-recipe-card__cifras [aria-hidden="true"]')[0]?.textContent).toContain('≈');
    expect(el.textContent).toContain('No compatible con tus restricciones');
    expect(el.textContent).toContain('TheMealDB');
    expect(el.textContent).toContain('receta en inglés');
  });

  it('sin nutrición muestra "Cálculo pendiente"', async () => {
    const { el } = await crear({
      id: null,
      referenciaExterna: '52795',
      origen: 'THEMEALDB',
      nutricionRacion: null,
      estadoNutricional: 'PENDIENTE',
    });
    expect(el.querySelector('.ns-recipe-card__cifras')).toBeNull();
    expect(el.querySelector('.ns-recipe-card__pie')?.textContent).toContain('Cálculo pendiente');
  });

  it('el corazón refleja aria-pressed y emite el nuevo valor; el nombre abre la receta', async () => {
    const { fixture, el } = await crear({ favorita: true });
    const corazon = el.querySelector<HTMLButtonElement>('.ns-recipe-card__favorita')!;
    expect(corazon.getAttribute('aria-pressed')).toBe('true');
    corazon.click();
    expect(fixture.componentInstance.cambios).toEqual([false]);
    expect(fixture.componentInstance.aperturas).toBe(0);

    el.querySelector<HTMLButtonElement>('.ns-recipe-card__abrir')!.click();
    expect(fixture.componentInstance.aperturas).toBe(1);
  });
});

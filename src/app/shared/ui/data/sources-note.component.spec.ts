import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { NsSourcesNoteComponent } from './sources-note.component';

@Component({
  imports: [NsSourcesNoteComponent],
  template: `<ns-sources-note [fuentes]="fuentes()" />`,
})
class Anfitrion {
  readonly fuentes = signal<(string | null)[]>([]);
}

function montar(fuentes: (string | null)[]) {
  const fixture = TestBed.createComponent(Anfitrion);
  fixture.componentInstance.fuentes.set(fuentes);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('NsSourcesNoteComponent', () => {
  it('no pinta nada si no hay fuentes externas', () => {
    const raiz = montar(['ADMIN', 'BEDCA', 'USUARIO', 'PROPIA', null]);
    expect(raiz.querySelector('p')).toBeNull();
  });

  it('atribuye cada fuente externa una sola vez, en orden fijo y con enlace', () => {
    const raiz = montar(['USDA', 'THEMEALDB', 'USDA', 'ADMIN', 'OPEN_FOOD_FACTS']);
    const texto = raiz.textContent!.replace(/\s+/g, ' ');
    expect(texto).toContain('Datos de Open Food Facts');
    expect(texto).toContain('ODbL');
    expect(texto).toContain('TheMealDB');
    expect(texto).toContain('USDA FoodData Central');
    const enlaces = [...raiz.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(enlaces).toEqual([
      'https://world.openfoodfacts.org',
      'https://www.themealdb.com',
      'https://fdc.nal.usda.gov',
    ]);
    expect(raiz.querySelector('a')!.getAttribute('rel')).toBe('noopener');
  });

  it('con una sola fuente termina en punto', () => {
    const raiz = montar(['THEMEALDB']);
    expect(raiz.textContent!.replace(/\s+/g, ' ').trim()).toMatch(
      /TheMealDB \(se abre en una pestaña nueva\) \(recetas e imágenes\)\.$/,
    );
  });
});

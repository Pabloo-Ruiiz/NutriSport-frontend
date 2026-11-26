import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { activarFocoTrasNavegacion, rutaSinQuery } from './foco-navegacion';

@Component({ template: '<h1>Inicio</h1><button>Ir</button>' })
class Inicio {}

@Component({ template: '<h1>Comidas</h1><div role="tablist"><button id="pestana">Una</button></div>' })
class Comidas {}

@Component({ template: '<p>Sin título</p>' })
class SinTitulo {}

@Component({ selector: 'app-raiz', template: '' })
class Raiz {
  constructor() {
    activarFocoTrasNavegacion();
  }
}

describe('activarFocoTrasNavegacion', () => {
  let harness: RouterTestingHarness;
  const router = () => TestBed.inject(Router);
  const esperar = async () => {
    await harness.fixture.whenStable();
    await new Promise((resolver) => setTimeout(resolver, 150));
  };
  const region = () => document.querySelector('[data-ns-anuncios]')!;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'inicio', component: Inicio, title: 'Inicio' },
          { path: 'comidas', component: Comidas, title: 'Comidas' },
          { path: 'otra', component: SinTitulo, title: 'Otra' },
        ]),
      ],
    });
    TestBed.createComponent(Raiz);
    const main = document.createElement('main');
    main.id = 'contenido';
    main.tabIndex = -1;
    document.body.appendChild(main);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => document.querySelectorAll('[data-ns-anuncios], main#contenido').forEach((e) => e.remove()));

  it('rutaSinQuery quita query params y fragmento', () => {
    expect(rutaSinQuery('/comidas?desde=2026-11-01#x')).toBe('/comidas');
    expect(rutaSinQuery('')).toBe('/');
  });

  it('no mueve el foco en la primera carga; después, al h1 de la página nueva y lo anuncia', async () => {
    await harness.navigateByUrl('/inicio');
    await esperar();
    expect(document.activeElement?.tagName).not.toBe('H1');

    (harness.routeNativeElement!.querySelector('button') as HTMLButtonElement).focus();
    await harness.navigateByUrl('/comidas');
    await esperar();
    expect(document.activeElement?.textContent).toBe('Comidas');
    expect(document.activeElement?.getAttribute('tabindex')).toBe('-1');
    expect(region().textContent).toContain('Comidas');
  });

  it('no actúa si solo cambian los query params ni si el foco está en unas pestañas', async () => {
    await harness.navigateByUrl('/inicio');
    await harness.navigateByUrl('/comidas');
    await esperar();
    const pestana = harness.routeNativeElement!.querySelector<HTMLButtonElement>('#pestana')!;
    pestana.focus();
    await router().navigateByUrl('/comidas?tipo=CENA');
    await esperar();
    expect(document.activeElement).toBe(pestana);

    // Las pestañas navegan con las flechas: el foco no salta al h1.
    await router().navigateByUrl('/inicio');
    await esperar();
    expect(document.activeElement?.tagName).not.toBe('H1');
  });

  it('sin h1, el foco va a #contenido', async () => {
    await harness.navigateByUrl('/inicio');
    await harness.navigateByUrl('/otra');
    await esperar();
    expect(document.activeElement?.id).toBe('contenido');
    expect(region().textContent).toContain('Otra');
  });
});

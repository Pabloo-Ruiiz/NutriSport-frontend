import { InteractivityChecker } from '@angular/cdk/a11y';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { provideLucideIcons } from '@lucide/angular';

import { LayoutService } from '@core/layout/layout.service';
import type { ObjetivosResponse, PreferenciaDto } from '@core/models';
import { ICONOS_APP } from '@shared/design/iconos';
import { ResumenObjetivosComponent } from './resumen-objetivos.component';
import { DEBOUNCE_BUSQUEDA_MS, SelectorPreferenciasComponent } from './selector-preferencias.component';

class InteractivityCheckerJsdom {
  isDisabled = (e: HTMLElement) => e.hasAttribute('disabled');
  isVisible = () => true;
  isFocusable = (e: HTMLElement) => e.matches('button, input, a[href], [tabindex]');
  isTabbable = (e: HTMLElement) => this.isFocusable(e) && e.tabIndex >= 0;
}

let http: HttpTestingController;

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      provideLucideIcons(...ICONOS_APP),
      { provide: LayoutService, useValue: { esMovil: signal(false) } },
      { provide: InteractivityChecker, useClass: InteractivityCheckerJsdom },
    ],
  });
  http = TestBed.inject(HttpTestingController);
});

afterEach(() => {
  http.verify();
  vi.useRealTimers();
  document.querySelector('.cdk-overlay-container')?.replaceChildren();
});

@Component({
  imports: [ReactiveFormsModule, SelectorPreferenciasComponent],
  template: `<app-selector-preferencias [formControl]="control" />`,
})
class Anfitrion {
  readonly control = new FormControl<PreferenciaDto[]>([], { nonNullable: true });
}

describe('SelectorPreferenciasComponent', () => {
  let fixture: ComponentFixture<Anfitrion>;
  const raiz = () => fixture.nativeElement as HTMLElement;
  const valor = () => fixture.componentInstance.control.value;
  const chip = (texto: string) =>
    [...raiz().querySelectorAll<HTMLButtonElement>('.ns-chip')].find((c) => c.textContent?.trim().startsWith(texto))!;

  beforeEach(async () => {
    fixture = TestBed.createComponent(Anfitrion);
    await fixture.whenStable();
  });

  it('muestra los 14 alérgenos, la lactosa y las 5 dietas', () => {
    expect(raiz().querySelectorAll('.ns-chip').length).toBe(14 + 1 + 5);
    expect(raiz().textContent).toContain('no se filtran automáticamente');
  });

  it('un alérgeno es ALERGIA ESTRICTA y se puede pasar a PREFERENCIA', async () => {
    chip('Gluten').click();
    await fixture.whenStable();
    expect(valor()).toEqual([{ tipo: 'ALERGIA', alergeno: 'GLUTEN', severidad: 'ESTRICTA' }]);

    const preferencia = [...raiz().querySelectorAll<HTMLButtonElement>('[role=radio]')].find(
      (b) => b.textContent?.trim() === 'Preferencia',
    )!;
    preferencia.click();
    await fixture.whenStable();
    expect(valor()).toEqual([{ tipo: 'ALERGIA', alergeno: 'GLUTEN', severidad: 'PREFERENCIA' }]);

    chip('Gluten').click();
    expect(valor()).toEqual([]);
  });

  it('lactosa es INTOLERANCIA y las dietas son DIETA, cada una con su campo', async () => {
    chip('Lactosa').click();
    chip('Vegana').click();
    chip('Halal').click();
    await fixture.whenStable();
    expect(valor()).toEqual([
      { tipo: 'INTOLERANCIA', intolerancia: 'LACTOSA', severidad: 'ESTRICTA' },
      { tipo: 'DIETA', dieta: 'VEGANA', severidad: 'ESTRICTA' },
      { tipo: 'DIETA', dieta: 'HALAL', severidad: 'ESTRICTA' },
    ]);
    expect(raiz().querySelector('.ns-preferencias__nota--destacada')).not.toBeNull();
  });

  it('el combobox busca con debounce y añade un RECHAZO con alimentoId', async () => {
    vi.useFakeTimers();
    const input = raiz().querySelector<HTMLInputElement>('[role=combobox]')!;

    input.value = 'b';
    input.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(DEBOUNCE_BUSQUEDA_MS);
    http.expectNone((req) => req.url === '/api/v1/alimentos');

    input.value = 'bróc';
    input.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(DEBOUNCE_BUSQUEDA_MS - 1);
    http.expectNone((req) => req.url === '/api/v1/alimentos');
    vi.advanceTimersByTime(1);
    const peticion = http.expectOne((req) => req.url === '/api/v1/alimentos');
    expect(peticion.request.params.get('q')).toBe('bróc');
    peticion.flush({
      content: [
        {
          id: 'a-1',
          nombre: 'Brócoli',
          marca: null,
          kcal100: 34,
          proteinas100: 2.8,
          carbohidratos100: 7,
          grasas100: 0.4,
          fuente: 'BEDCA',
        },
      ],
      page: 0,
      size: 8,
      totalElements: 1,
      totalPages: 1,
    });
    vi.useRealTimers();
    await fixture.whenStable();

    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(raiz().querySelector('.ns-combo__estado')?.textContent).toContain('1 resultado');
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await fixture.whenStable();

    expect(valor()).toEqual([{ tipo: 'RECHAZO', alimentoId: 'a-1', severidad: 'PREFERENCIA' }]);
    expect(raiz().querySelector('.ns-preferencias__rechazo')?.textContent).toContain('Brócoli');

    raiz().querySelector<HTMLButtonElement>('[aria-label="Quitar Brócoli"]')!.click();
    expect(valor()).toEqual([]);
  });

  it('conserva lo que no gestiona (FAVORITO) al cambiar otras preferencias', async () => {
    const favorito: PreferenciaDto = { tipo: 'FAVORITO', alimentoId: 'f-1', severidad: 'PREFERENCIA' };
    fixture.componentInstance.control.setValue([favorito]);
    await fixture.whenStable();
    chip('Soja').click();
    expect(valor()).toEqual([{ tipo: 'ALERGIA', alergeno: 'SOJA', severidad: 'ESTRICTA' }, favorito]);
  });
});

describe('ResumenObjetivosComponent', () => {
  const OBJETIVOS: ObjetivosResponse = {
    kcal: 2400,
    proteinaG: 120,
    carbohidratosG: 300,
    grasaG: 80,
    manuales: false,
    desglose: {
      edad: 31,
      metabolismoBasal: 1450,
      factorActividad: 1.55,
      gastoSinEntreno: 2248,
      ajustePorcentaje: -15,
      kcal: 2400,
      proteinaG: 120,
      carbohidratosG: 300,
      grasaG: 80,
      avisos: ['Tu objetivo está cerca del mínimo recomendado.'],
    },
    avisos: [],
  };

  async function crear(): Promise<ComponentFixture<ResumenObjetivosComponent>> {
    const fixture = TestBed.createComponent(ResumenObjetivosComponent);
    fixture.componentRef.setInput('objetivos', OBJETIVOS);
    fixture.componentRef.setInput('irAlPanel', true);
    await fixture.whenStable();
    return fixture;
  }

  it('muestra kcal, macros en gramos y %, avisos, desglose y disclaimer', async () => {
    const raiz = (await crear()).nativeElement as HTMLElement;
    expect(raiz.querySelector('ns-ring')?.textContent).toContain('2.400');
    const macros = [...raiz.querySelectorAll('.ns-resumen__macro-cabecera')].map((e) =>
      e.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(macros).toEqual([
      'Proteína120 g · 20 % de la energía',
      'Hidratos300 g · 50 % de la energía',
      'Grasa80 g · 30 % de la energía',
    ]);
    expect(raiz.querySelectorAll('ns-progress-bar').length).toBe(3);
    expect(raiz.querySelector('ns-alert.ns-alert--warning')?.textContent).toContain('cerca del mínimo');
    const desglose = raiz.querySelector('details')!.textContent!.replace(/\s+/g, ' ');
    expect(desglose).toContain('Cómo lo calculamos');
    expect(desglose).toContain('Factor de actividad× 1,55');
    expect(desglose).toContain('Ajuste por tu objetivo−15 %');
    expect(raiz.querySelector('ns-disclaimer')).not.toBeNull();
    expect(raiz.querySelector('a[href="/inicio"]')).not.toBeNull();
  });

  it('"Ajustar manualmente" hace PUT /perfil/objetivos y muestra los avisos de la respuesta', async () => {
    const fixture = await crear();
    const raiz = fixture.nativeElement as HTMLElement;
    [...raiz.querySelectorAll('button')].find((b) => b.textContent?.includes('Ajustar manualmente'))!.click();
    await fixture.whenStable();

    const dialogo = document.querySelector('app-objetivos-manuales-dialog') as HTMLElement;
    expect(dialogo.textContent).toContain('Los macros suman 2.400 kcal.');
    dialogo.querySelector('form')!.dispatchEvent(new Event('submit'));

    const peticion = http.expectOne({ method: 'PUT', url: '/api/v1/perfil/objetivos' });
    expect(peticion.request.body).toEqual({ kcal: 2400, proteinaG: 120, carbohidratosG: 300, grasaG: 80 });
    peticion.flush({
      ...OBJETIVOS,
      manuales: true,
      avisos: ['La energía de los macros se aleja más de un 10 % de las kcal.'],
    });
    await fixture.whenStable();
    await new Promise((resolver) => setTimeout(resolver));
    await fixture.whenStable();

    expect(document.querySelector('app-objetivos-manuales-dialog')).toBeNull();
    expect(raiz.textContent).toContain('Objetivos manuales');
    expect(raiz.textContent).toContain('se aleja más de un 10 %');
  });
});

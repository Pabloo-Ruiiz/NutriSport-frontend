import { InteractivityChecker } from '@angular/cdk/a11y';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideLucideIcons } from '@lucide/angular';

import { LayoutService } from '@core/layout/layout.service';
import type { RegistroComidaResponse } from '@core/models';
import { hoyLocal, sumarDias } from '@core/util/fechas';
import { environment } from '@env/environment';
import { ICONOS_APP } from '@shared/design/iconos';
import { NsDialogService } from '@shared/ui/overlay/dialog.service';
import { resumirAlimentos } from './comida-util';
import { DetalleComidaComponent, type DetalleComidaData } from './detalle-comida.component';
import { DuplicarComidaDialogComponent, type DuplicarComidaData } from './duplicar-comida-dialog.component';
import { MealCardComponent } from './meal-card.component';

/** jsdom no calcula tamaños: el CDK cree que nada es enfocable (ver overlay.spec.ts). */
class InteractivityCheckerJsdom {
  isDisabled = (e: HTMLElement) => e.hasAttribute('disabled');
  isVisible = () => true;
  isFocusable = (e: HTMLElement) => e.matches('button, input, select, textarea, a[href], [tabindex]');
  isTabbable = (e: HTMLElement) => this.isFocusable(e) && e.tabIndex >= 0;
}

function comida(cambios: Partial<RegistroComidaResponse> = {}): RegistroComidaResponse {
  return {
    id: 'c-1',
    fecha: '2026-11-24',
    hora: '08:30:00',
    tipoComida: 'DESAYUNO',
    origen: 'MANUAL',
    notas: null,
    alimentos: [
      {
        id: 'a1',
        alimentoId: 'x1',
        nombre: 'Avena',
        cantidad: 60,
        unidad: 'g',
        gramos: 60,
        kcal: 230,
        proteina: 8,
        carbohidratos: 40,
        grasa: 4,
        origenIa: false,
        confianzaIa: null,
      },
      {
        id: 'a2',
        alimentoId: 'x2',
        nombre: 'Leche',
        cantidad: 1,
        unidad: 'taza',
        gramos: 240,
        kcal: 150,
        proteina: 8,
        carbohidratos: 12,
        grasa: 8,
        origenIa: false,
        confianzaIa: null,
      },
      {
        id: 'a3',
        alimentoId: 'x3',
        nombre: 'Plátano',
        cantidad: 1,
        unidad: 'unidad',
        gramos: 120,
        kcal: 105,
        proteina: 1.3,
        carbohidratos: 27,
        grasa: 0.4,
        origenIa: false,
        confianzaIa: null,
      },
    ],
    totales: { kcal: 485, proteina: 17.3, carbohidratos: 79, grasa: 12.4 },
    avisos: [],
    ...cambios,
  };
}

function configurar(): void {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideLucideIcons(...ICONOS_APP),
      { provide: LayoutService, useValue: { esMovil: signal(false) } },
      { provide: InteractivityChecker, useClass: InteractivityCheckerJsdom },
    ],
  });
}

function panel(): HTMLElement {
  return document.querySelector('.cdk-overlay-container') as HTMLElement;
}

describe('resumirAlimentos', () => {
  it('une los nombres en castellano y pasa a minúscula la inicial desde el segundo', () => {
    expect(resumirAlimentos(['Avena', 'Leche', 'Plátano'])).toBe('Avena, leche y plátano');
  });

  it('respeta siglas y cuenta los que no caben', () => {
    expect(resumirAlimentos(['Arroz', 'BCAA', 'Pollo', 'Brócoli', 'Aceite'])).toBe('Arroz, BCAA, pollo y 2 más');
    expect(resumirAlimentos([])).toBe('Sin alimentos');
  });
});

describe('MealCardComponent', () => {
  beforeEach(configurar);

  it('muestra tipo, hora, alimentos, kcal y macros; badge de foto', () => {
    const fixture = TestBed.createComponent(MealCardComponent);
    fixture.componentRef.setInput('comida', comida({ origen: 'FOTO' }));
    fixture.detectChanges();
    const texto = (fixture.nativeElement as HTMLElement).textContent!.replace(/\s+/g, ' ');
    expect(texto).toContain('Desayuno');
    expect(texto).toContain('08:30');
    expect(texto).toContain('Avena, leche y plátano');
    expect(texto).toContain('485');
    expect(texto).toContain('Foto');
    expect(texto).toContain('P 17 g');
  });

  it('las manuales no llevan badge de procedencia', () => {
    const fixture = TestBed.createComponent(MealCardComponent);
    fixture.componentRef.setInput('comida', comida());
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.ns-meal__cabecera ns-badge')).toBeNull();
  });

  it('el clic en la tarjeta emite ver y el menú emite cada acción', () => {
    const fixture = TestBed.createComponent(MealCardComponent);
    const c = comida();
    fixture.componentRef.setInput('comida', c);
    const emitidos: string[] = [];
    for (const salida of ['ver', 'editar', 'duplicar', 'eliminar'] as const) {
      fixture.componentInstance[salida].subscribe((x) => {
        expect(x).toBe(c);
        emitidos.push(salida);
      });
    }
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    host.querySelector<HTMLButtonElement>('.ns-meal__abrir')!.click();

    for (const accion of ['Editar', 'Duplicar', 'Eliminar']) {
      host.querySelector<HTMLButtonElement>('.ns-meal__menu')!.click();
      fixture.detectChanges();
      const item = [...panel().querySelectorAll<HTMLButtonElement>('.ns-menu__item')].find(
        (b) => b.textContent!.trim() === accion,
      );
      item!.click();
      fixture.detectChanges();
    }
    expect(emitidos).toEqual(['ver', 'editar', 'duplicar', 'eliminar']);
  });
});

describe('DetalleComidaComponent', () => {
  beforeEach(configurar);
  afterEach(() => panel()?.replaceChildren());

  it('lista alimentos con cantidad y gramos, notas y avisos', async () => {
    TestBed.inject(NsDialogService).open<DetalleComidaComponent, unknown, DetalleComidaData>(DetalleComidaComponent, {
      titulo: 'Detalle de la comida',
      data: { comida: comida({ notas: 'Antes de entrenar', avisos: ['Contiene lactosa'] }) },
    });
    await new Promise((r) => setTimeout(r));
    TestBed.tick();
    const texto = panel().textContent!.replace(/\s+/g, ' ');
    expect(texto).toContain('1 taza (240 g)');
    expect(texto).toContain('60 g');
    expect(texto).not.toContain('60 g (60 g)');
    expect(texto).toContain('Antes de entrenar');
    expect(texto).toContain('Contiene lactosa');
    expect(texto).not.toContain('Estimación IA');
  });

  it('en las de foto muestra "Estimación IA" y la confianza de cada alimento', async () => {
    const c = comida({ origen: 'FOTO' });
    c.alimentos[0] = { ...c.alimentos[0], origenIa: true, confianzaIa: 0.86 };
    c.alimentos[1] = { ...c.alimentos[1], origenIa: true, confianzaIa: 0.42 };
    TestBed.inject(NsDialogService).open<DetalleComidaComponent, unknown, DetalleComidaData>(DetalleComidaComponent, {
      data: { comida: c },
    });
    await new Promise((r) => setTimeout(r));
    TestBed.tick();
    const texto = panel().textContent!.replace(/\s+/g, ' ');
    expect(texto).toContain('Estimación IA');
    expect(texto).toContain('Confianza alta · 86 %');
    expect(texto).toContain('Confianza baja · 42 %');
    expect(panel().querySelector('ns-disclaimer')).not.toBeNull();
  });
});

describe('DuplicarComidaDialogComponent', () => {
  beforeEach(configurar);
  afterEach(() => panel()?.replaceChildren());

  async function abrir() {
    const ref = TestBed.inject(NsDialogService).open<
      DuplicarComidaDialogComponent,
      RegistroComidaResponse,
      DuplicarComidaData
    >(DuplicarComidaDialogComponent, { titulo: 'Duplicar comida', data: { comida: comida() } });
    await new Promise((r) => setTimeout(r));
    TestBed.tick();
    return ref;
  }

  it('propone hoy con máximo mañana y, sin tipo, envía solo la fecha', async () => {
    const ref = await abrir();
    let resultado: RegistroComidaResponse | undefined;
    ref.closed.subscribe((r) => (resultado = r));
    const fecha = panel().querySelector<HTMLInputElement>('input[type="date"]')!;
    expect(fecha.max).toBe(sumarDias(hoyLocal(), 1));
    await new Promise((r) => setTimeout(r));
    expect(fecha.value).toBe(hoyLocal());

    panel().querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    const req = TestBed.inject(HttpTestingController).expectOne(`${environment.apiUrl}/comidas/c-1/duplicar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ fecha: hoyLocal() });
    const nueva = comida({ id: 'c-2', origen: 'COPIA', fecha: hoyLocal() });
    req.flush(nueva, { status: 201, statusText: 'Created' });
    expect(resultado).toEqual(nueva);
  });

  it('rechaza una fecha posterior a mañana sin llamar a la API', async () => {
    await abrir();
    const fecha = panel().querySelector<HTMLInputElement>('input[type="date"]')!;
    fecha.value = sumarDias(hoyLocal(), 3);
    fecha.dispatchEvent(new Event('input'));
    panel().querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    TestBed.tick();
    TestBed.inject(HttpTestingController).expectNone(`${environment.apiUrl}/comidas/c-1/duplicar`);
    expect(panel().textContent).toContain('La fecha puede ser como mucho mañana.');
  });
});

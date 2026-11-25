import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { provideLucideIcons } from '@lucide/angular';

import { ICONOS_APP } from '@shared/design/iconos';
import { NsCheckboxComponent } from './checkbox.component';
import { NsChipGroupComponent } from './chip-group.component';
import { NsOpcion } from './control-valor';
import { NsFormFieldComponent } from './form-field.component';
import { NsSegmentedComponent } from './segmented.component';
import { NsSelectComponent } from './select.component';
import { NsSwitchComponent } from './switch.component';

type Periodo = 'dia' | 'semana' | 'mes';
interface Objetivo {
  id: number;
  nombre: string;
}

@Component({
  imports: [
    ReactiveFormsModule,
    NsFormFieldComponent,
    NsSelectComponent,
    NsCheckboxComponent,
    NsSwitchComponent,
    NsSegmentedComponent,
    NsChipGroupComponent,
  ],
  template: `
    <form [formGroup]="form">
      <ns-form-field label="Objetivo">
        <ns-select
          formControlName="objetivo"
          [opciones]="objetivos"
          placeholder="Elige tu objetivo"
          [compararCon]="mismoId"
        />
      </ns-form-field>
      <ns-checkbox formControlName="terminos">Acepto las condiciones</ns-checkbox>
      <ns-switch formControlName="avisos">Recordatorios</ns-switch>
      <ns-form-field label="Periodo">
        <ns-segmented formControlName="periodo" [opciones]="periodos" />
      </ns-form-field>
      <ns-chip-group class="multiple" formControlName="deportes" [opciones]="deportes" multiple etiqueta="Deportes" />
      <ns-chip-group class="simple" formControlName="comida" [opciones]="comidas" etiqueta="Comida" />
    </form>
  `,
})
class Anfitrion {
  readonly objetivos: NsOpcion<Objetivo>[] = [
    { valor: { id: 1, nombre: 'Perder grasa' }, etiqueta: 'Perder grasa' },
    { valor: { id: 2, nombre: 'Ganar músculo' }, etiqueta: 'Ganar músculo' },
  ];
  readonly periodos: NsOpcion<Periodo>[] = [
    { valor: 'dia', etiqueta: 'Día' },
    { valor: 'semana', etiqueta: 'Semana', deshabilitada: true },
    { valor: 'mes', etiqueta: 'Mes' },
  ];
  readonly deportes: NsOpcion<string>[] = [
    { valor: 'correr', etiqueta: 'Correr' },
    { valor: 'nadar', etiqueta: 'Nadar' },
    { valor: 'pesas', etiqueta: 'Pesas' },
  ];
  readonly comidas: NsOpcion<string>[] = [
    { valor: 'desayuno', etiqueta: 'Desayuno' },
    { valor: 'cena', etiqueta: 'Cena' },
  ];
  readonly mismoId = (a: Objetivo, b: Objetivo) => a.id === b.id;

  readonly form = new FormGroup({
    objetivo: new FormControl<Objetivo | null>(null, Validators.required),
    terminos: new FormControl(false),
    avisos: new FormControl(true),
    periodo: new FormControl<Periodo | null>('dia'),
    deportes: new FormControl<string[]>(['pesas']),
    comida: new FormControl<string | null>(null),
  });
}

describe('controles de formulario (ControlValueAccessor)', () => {
  let fixture: ComponentFixture<Anfitrion>;
  let raiz: HTMLElement;
  let form: Anfitrion['form'];

  const pulsar = async (elemento: Element) => {
    (elemento as HTMLElement).click();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideLucideIcons(...ICONOS_APP)] });
    fixture = TestBed.createComponent(Anfitrion);
    await fixture.whenStable();
    raiz = fixture.nativeElement;
    form = fixture.componentInstance.form;
  });

  describe('ns-select', () => {
    let select: HTMLSelectElement;
    beforeEach(() => (select = raiz.querySelector('ns-select select') as HTMLSelectElement));

    it('se enlaza con la etiqueta del campo y muestra el placeholder', () => {
      const etiqueta = raiz.querySelector('ns-form-field .ns-form-field__label') as HTMLLabelElement;
      expect(etiqueta.htmlFor).toBe(select.id);
      expect(select.value).toBe('');
      expect(select.options[0].textContent?.trim()).toBe('Elige tu objetivo');
    });

    it('escribe y lee valores que no son texto', async () => {
      form.controls.objetivo.setValue({ id: 2, nombre: 'Ganar músculo' });
      await fixture.whenStable();
      expect(select.selectedOptions[0].textContent?.trim()).toBe('Ganar músculo');

      select.value = '0';
      select.dispatchEvent(new Event('change'));
      expect(form.controls.objetivo.value).toEqual({ id: 1, nombre: 'Perder grasa' });

      select.value = '';
      select.dispatchEvent(new Event('change'));
      expect(form.controls.objetivo.value).toBeNull();
    });

    it('marca el error al perder el foco y se deshabilita desde el formulario', async () => {
      select.dispatchEvent(new Event('blur'));
      await fixture.whenStable();
      expect(select.getAttribute('aria-invalid')).toBe('true');
      expect(raiz.querySelector('ns-form-field .ns-error-campo')?.textContent).toBe('Este campo es obligatorio.');

      form.controls.objetivo.disable();
      await fixture.whenStable();
      expect(select.disabled).toBe(true);
    });
  });

  it('ns-checkbox sincroniza el valor en los dos sentidos', async () => {
    const casilla = raiz.querySelector('ns-checkbox input') as HTMLInputElement;
    expect(casilla.checked).toBe(false);
    await pulsar(casilla);
    expect(form.controls.terminos.value).toBe(true);

    form.controls.terminos.setValue(false);
    await fixture.whenStable();
    expect(casilla.checked).toBe(false);
  });

  it('ns-switch es un role="switch" con aria-checked y su texto como etiqueta', async () => {
    const boton = raiz.querySelector('ns-switch button') as HTMLButtonElement;
    const etiqueta = raiz.querySelector('ns-switch label') as HTMLLabelElement;
    expect(boton.getAttribute('role')).toBe('switch');
    expect(boton.getAttribute('aria-checked')).toBe('true');
    expect(etiqueta.htmlFor).toBe(boton.id);

    await pulsar(etiqueta);
    expect(form.controls.avisos.value).toBe(false);
    expect(boton.getAttribute('aria-checked')).toBe('false');
  });

  describe('ns-segmented', () => {
    let opciones: HTMLButtonElement[];
    const tecla = async (elemento: HTMLElement, key: string) => {
      elemento.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      await fixture.whenStable();
    };

    beforeEach(() => (opciones = Array.from(raiz.querySelectorAll('ns-segmented [role="radio"]'))));

    it('es un radiogroup etiquetado por el campo, con una sola opción tabulable', () => {
      const grupo = raiz.querySelector('ns-segmented [role="radiogroup"]') as HTMLElement;
      const etiquetas = raiz.querySelectorAll('ns-form-field .ns-form-field__label');
      expect(grupo.getAttribute('aria-labelledby')).toBe(etiquetas[1].id);
      expect(etiquetas[1].hasAttribute('for')).toBe(false);
      expect(opciones.map((o) => o.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false']);
      expect(opciones.map((o) => o.tabIndex)).toEqual([0, -1, -1]);
    });

    it('mueve selección y foco con las flechas, saltando las deshabilitadas y dando la vuelta', async () => {
      opciones[0].focus();
      await tecla(opciones[0], 'ArrowRight');
      expect(form.controls.periodo.value).toBe('mes');
      expect(document.activeElement).toBe(opciones[2]);
      expect(opciones.map((o) => o.tabIndex)).toEqual([-1, -1, 0]);

      await tecla(opciones[2], 'ArrowRight');
      expect(form.controls.periodo.value).toBe('dia');

      await tecla(opciones[0], 'ArrowLeft');
      expect(form.controls.periodo.value).toBe('mes');

      await tecla(opciones[2], 'Home');
      expect(form.controls.periodo.value).toBe('dia');
      await tecla(opciones[0], 'End');
      expect(form.controls.periodo.value).toBe('mes');
    });

    it('selecciona con el clic', async () => {
      await pulsar(opciones[2]);
      expect(form.controls.periodo.value).toBe('mes');
      expect(opciones[2].classList).toContain('ns-segmented__opcion--activa');
    });
  });

  describe('ns-chip-group', () => {
    it('en modo múltiple añade y quita valores, en el orden de las opciones', async () => {
      const chips = Array.from(raiz.querySelectorAll('ns-chip-group.multiple button'));
      expect(chips.map((c) => c.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'true']);
      expect(raiz.querySelector('ns-chip-group.multiple [role="group"]')?.getAttribute('aria-label')).toBe('Deportes');

      await pulsar(chips[0]);
      expect(form.controls.deportes.value).toEqual(['correr', 'pesas']);
      await pulsar(chips[2]);
      expect(form.controls.deportes.value).toEqual(['correr']);
      expect(chips[0].querySelector('svg')).not.toBeNull();
    });

    it('en modo simple elige una y la desmarca al pulsarla otra vez', async () => {
      const chips = Array.from(raiz.querySelectorAll('ns-chip-group.simple button'));
      await pulsar(chips[0]);
      expect(form.controls.comida.value).toBe('desayuno');
      await pulsar(chips[1]);
      expect(form.controls.comida.value).toBe('cena');
      expect(chips.map((c) => c.getAttribute('aria-pressed'))).toEqual(['false', 'true']);
      await pulsar(chips[1]);
      expect(form.controls.comida.value).toBeNull();
    });
  });
});

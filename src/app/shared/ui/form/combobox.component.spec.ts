import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideLucideIcons } from '@lucide/angular';
import { Observable, Subject, throwError } from 'rxjs';

import { ICONOS_APP } from '@shared/design/iconos';
import {
  NsComboboxComponent,
  NsComboboxOpcionDirective,
  NsResaltadoComponent,
  partesResaltadas,
} from './combobox.component';

interface Fruta {
  id: number;
  nombre: string;
}

@Component({
  imports: [NsComboboxComponent, NsComboboxOpcionDirective, NsResaltadoComponent],
  template: `
    <ns-combobox [buscar]="buscar" [textoOpcion]="nombre" etiqueta="Fruta" (seleccionado)="elegidas.push($event)">
      <ng-template nsComboboxOpcion let-f let-consulta="consulta">
        <ns-resaltado [texto]="f.nombre" [consulta]="consulta" />
      </ng-template>
    </ns-combobox>
  `,
})
class Anfitrion {
  /** Cada búsqueda devuelve un Subject que la prueba resuelve cuando quiere. */
  readonly peticiones: { texto: string; respuesta: Subject<Fruta[]>; cancelada: boolean }[] = [];
  readonly fallar = signal(false);
  readonly elegidas: Fruta[] = [];
  readonly nombre = (f: Fruta) => f.nombre;
  readonly buscar = (texto: string): Observable<Fruta[]> => {
    if (this.fallar()) return throwError(() => new Error('caída'));
    const respuesta = new Subject<Fruta[]>();
    const peticion = { texto, respuesta, cancelada: false };
    this.peticiones.push(peticion);
    return new Observable<Fruta[]>((suscriptor) => {
      const s = respuesta.subscribe(suscriptor);
      return () => {
        if (!respuesta.closed && !respuesta.isStopped) peticion.cancelada = true;
        s.unsubscribe();
      };
    });
  };
}

const FRUTAS: Fruta[] = [
  { id: 1, nombre: 'Plátano' },
  { id: 2, nombre: 'Platanito' },
];

describe('NsComboboxComponent', () => {
  let fixture: ComponentFixture<Anfitrion>;
  let anfitrion: Anfitrion;
  let input: HTMLInputElement;

  const raiz = () => fixture.nativeElement as HTMLElement;
  const escribir = (texto: string) => {
    input.value = texto;
    input.dispatchEvent(new Event('input'));
  };
  const tecla = (key: string) => input.dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true }));
  const estado = () => raiz().querySelector('[aria-live]')?.textContent?.trim();

  beforeEach(async () => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [provideLucideIcons(...ICONOS_APP)] });
    fixture = TestBed.createComponent(Anfitrion);
    anfitrion = fixture.componentInstance;
    fixture.detectChanges();
    input = raiz().querySelector('input[role=combobox]')!;
  });

  afterEach(() => vi.useRealTimers());

  it('no busca con 1 carácter (ni con espacios)', () => {
    escribir('p');
    vi.advanceTimersByTime(1000);
    escribir('  p  ');
    vi.advanceTimersByTime(1000);
    expect(anfitrion.peticiones).toEqual([]);
    fixture.detectChanges();
    expect(estado()).toBe('Escribe al menos 2 caracteres.');
  });

  it('espera 250 ms y no repite la misma búsqueda', () => {
    escribir('pl');
    vi.advanceTimersByTime(249);
    expect(anfitrion.peticiones.length).toBe(0);
    vi.advanceTimersByTime(1);
    expect(anfitrion.peticiones.map((p) => p.texto)).toEqual(['pl']);

    escribir('pl ');
    vi.advanceTimersByTime(250);
    expect(anfitrion.peticiones.length).toBe(1);
  });

  it('una búsqueda nueva cancela la anterior y su respuesta tardía no se muestra', () => {
    escribir('pla');
    vi.advanceTimersByTime(250);
    escribir('plat');
    vi.advanceTimersByTime(250);

    const [primera, segunda] = anfitrion.peticiones;
    expect(primera.cancelada).toBe(true);
    expect(segunda.cancelada).toBe(false);

    primera.respuesta.next([{ id: 9, nombre: 'Plancton' }]);
    segunda.respuesta.next(FRUTAS);
    fixture.detectChanges();
    const opciones = [...raiz().querySelectorAll('[role=option]')].map((o) => o.textContent?.trim());
    expect(opciones).toEqual(['Plátano', 'Platanito']);
  });

  it('muestra los estados cargando, resultados y sin resultados', () => {
    escribir('pla');
    vi.advanceTimersByTime(250);
    fixture.detectChanges();
    expect(estado()).toBe('Buscando…');
    expect(input.getAttribute('aria-busy')).toBe('true');

    anfitrion.peticiones[0].respuesta.next(FRUTAS);
    fixture.detectChanges();
    expect(estado()).toBe('2 resultados.');
    expect(input.getAttribute('aria-expanded')).toBe('true');

    escribir('kiwi');
    vi.advanceTimersByTime(250);
    anfitrion.peticiones[1].respuesta.next([]);
    fixture.detectChanges();
    expect(estado()).toBe('Sin resultados para «kiwi».');
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });

  it('un error muestra "Reintentar", que repite la búsqueda', () => {
    anfitrion.fallar.set(true);
    escribir('pla');
    vi.advanceTimersByTime(250);
    fixture.detectChanges();
    expect(estado()).toBe('No hemos podido buscar.');

    anfitrion.fallar.set(false);
    raiz().querySelector<HTMLButtonElement>('.ns-combobox__reintentar')!.click();
    vi.advanceTimersByTime(250);
    expect(anfitrion.peticiones.map((p) => p.texto)).toEqual(['pla']);
  });

  it('↓ ↑ mueven la opción activa, Enter la elige y vacía el campo', () => {
    escribir('pla');
    vi.advanceTimersByTime(250);
    anfitrion.peticiones[0].respuesta.next(FRUTAS);
    fixture.detectChanges();

    tecla('ArrowDown');
    tecla('ArrowDown');
    fixture.detectChanges();
    const opciones = raiz().querySelectorAll('[role=option]');
    expect(input.getAttribute('aria-activedescendant')).toBe(opciones[1].id);
    expect(opciones[1].getAttribute('aria-selected')).toBe('true');

    tecla('ArrowUp');
    fixture.detectChanges();
    expect(input.getAttribute('aria-activedescendant')).toBe(opciones[0].id);

    tecla('Enter');
    fixture.detectChanges();
    expect(anfitrion.elegidas).toEqual([FRUTAS[0]]);
    expect(input.value).toBe('');
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });

  it('Escape cierra la lista y, la segunda vez, borra el texto', () => {
    escribir('pla');
    vi.advanceTimersByTime(250);
    anfitrion.peticiones[0].respuesta.next(FRUTAS);
    fixture.detectChanges();

    tecla('Escape');
    fixture.detectChanges();
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(input.value).toBe('pla');

    tecla('Escape');
    fixture.detectChanges();
    expect(input.value).toBe('');
  });

  it('un clic en una opción la elige', () => {
    escribir('pla');
    vi.advanceTimersByTime(250);
    anfitrion.peticiones[0].respuesta.next(FRUTAS);
    fixture.detectChanges();
    raiz().querySelectorAll<HTMLElement>('[role=option]')[1].click();
    expect(anfitrion.elegidas).toEqual([FRUTAS[1]]);
  });

  it('resalta la coincidencia sin distinguir tildes ni mayúsculas', () => {
    expect(partesResaltadas('Plátano', 'PLA')).toEqual([
      { texto: 'Plá', coincide: true },
      { texto: 'tano', coincide: false },
    ]);
    expect(partesResaltadas('Avena', '')).toEqual([{ texto: 'Avena', coincide: false }]);

    escribir('pla');
    vi.advanceTimersByTime(250);
    anfitrion.peticiones[0].respuesta.next(FRUTAS);
    fixture.detectChanges();
    expect(raiz().querySelector('[role=option] strong')?.textContent).toBe('Plá');
  });
});

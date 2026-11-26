import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideLucideIcons } from '@lucide/angular';

import { ICONOS_APP } from '@shared/design/iconos';
import { NsCeldaDirective } from './table-cell.directive';
import { NsColumna, NsTableComponent, leerOrden } from './table.component';

interface Fila {
  id: string;
  nombre: string;
  kcal: number | null;
}

@Component({
  imports: [NsTableComponent, NsCeldaDirective],
  template: `
    <ns-table [columns]="columnas" [data]="filas()" [(sort)]="orden" [cargando]="cargando()" etiqueta="Alimentos">
      <ng-template nsCelda="nombre" [nsCeldaDe]="filas()" let-f let-i="indice">
        <strong>{{ i }}-{{ f.nombre }}</strong>
      </ng-template>
      <button nsTablaVacia type="button">Limpiar</button>
    </ns-table>
  `,
})
class Anfitrion {
  readonly columnas: NsColumna[] = [
    { clave: 'nombre', titulo: 'Nombre', ordenable: true },
    { clave: 'kcal', titulo: 'Kcal', alinear: 'end' },
  ];
  readonly filas = signal<Fila[]>([
    { id: '1', nombre: 'Arroz', kcal: 130 },
    { id: '2', nombre: 'Pollo', kcal: null },
  ]);
  readonly orden = signal<string | null>(null);
  readonly cargando = signal(false);
}

async function crear() {
  TestBed.configureTestingModule({ providers: [provideLucideIcons(...ICONOS_APP)] });
  const fixture = TestBed.createComponent(Anfitrion);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, el, host: fixture.componentInstance };
}

describe('NsTableComponent', () => {
  it('leerOrden separa campo y dirección', () => {
    expect(leerOrden('nombre,desc')).toEqual({ campo: 'nombre', direccion: 'desc' });
    expect(leerOrden('nombre')).toEqual({ campo: 'nombre', direccion: 'asc' });
    expect(leerOrden(null)).toBeNull();
  });

  it('pinta las celdas con su plantilla o con el valor, y la etiqueta para móvil', async () => {
    const { el } = await crear();
    const filas = el.querySelectorAll('tbody tr');
    expect(filas.length).toBe(2);
    expect(filas[0].querySelector('strong')?.textContent).toBe('0-Arroz');
    const celdas = filas[1].querySelectorAll('td');
    expect(celdas[1].textContent?.replace(/\s+/g, ' ').trim()).toBe('Kcal: —');
    expect(celdas[1].className).toContain('ns-table__celda--end');
  });

  it('ordena: asc → desc → sin orden, con aria-sort', async () => {
    const { fixture, el, host } = await crear();
    const th = () => el.querySelector('th') as HTMLElement;
    expect(th().getAttribute('aria-sort')).toBe('none');
    expect(el.querySelectorAll('th')[1].hasAttribute('aria-sort')).toBe(false);

    const pulsar = async () => {
      (th().querySelector('button') as HTMLButtonElement).click();
      await fixture.whenStable();
    };
    await pulsar();
    expect(host.orden()).toBe('nombre,asc');
    expect(th().getAttribute('aria-sort')).toBe('ascending');
    await pulsar();
    expect(host.orden()).toBe('nombre,desc');
    expect(th().getAttribute('aria-sort')).toBe('descending');
    await pulsar();
    expect(host.orden()).toBeNull();
  });

  it('muestra filas skeleton al cargar y el estado vacío sin datos', async () => {
    const { fixture, el, host } = await crear();
    host.cargando.set(true);
    await fixture.whenStable();
    expect(el.querySelector('table')?.getAttribute('aria-busy')).toBe('true');
    expect(el.querySelectorAll('tbody ns-skeleton').length).toBe(10);

    host.cargando.set(false);
    host.filas.set([]);
    await fixture.whenStable();
    expect(el.querySelector('ns-empty-state')?.textContent).toContain('No hay resultados');
    expect(el.querySelector('ns-empty-state button')?.textContent).toBe('Limpiar');
  });
});

@Component({
  imports: [NsTableComponent],
  template: `
    <ns-table
      seleccionable
      filasPulsables
      [columns]="columnas"
      [data]="filas()"
      [(seleccion)]="seleccion"
      [(sort)]="orden"
      [etiquetaSeleccion]="nombre"
      (filaPulsada)="pulsadas.push($event.id)"
    >
      <button nsTablaAcciones type="button">Borrar</button>
    </ns-table>
  `,
})
class AnfitrionSeleccion {
  readonly columnas: NsColumna[] = [
    { clave: 'nombre', titulo: 'Nombre', ordenable: true },
    { clave: 'kcal', titulo: 'Kcal' },
  ];
  readonly filas = signal<Fila[]>([
    { id: '1', nombre: 'Arroz', kcal: 130 },
    { id: '2', nombre: 'Pollo', kcal: 165 },
  ]);
  readonly seleccion = signal<readonly unknown[]>([]);
  readonly orden = signal<string | null>(null);
  readonly nombre = (f: Fila) => f.nombre;
  readonly pulsadas: string[] = [];
}

describe('NsTableComponent con selección', () => {
  async function crearSeleccion() {
    TestBed.configureTestingModule({ providers: [provideLucideIcons(...ICONOS_APP)] });
    const fixture = TestBed.createComponent(AnfitrionSeleccion);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const todas = () => el.querySelector<HTMLInputElement>('thead input[type="checkbox"]')!;
    const deFila = (i: number) => el.querySelectorAll<HTMLInputElement>('tbody input[type="checkbox"]')[i];
    const pulsar = async (input: HTMLInputElement) => {
      input.click();
      await fixture.whenStable();
    };
    return { fixture, el, host: fixture.componentInstance, todas, deFila, pulsar };
  }

  it('marca filas sueltas (sin abrir la fila), con "todo" indeterminado y la barra de acciones', async () => {
    const { el, host, todas, deFila, pulsar } = await crearSeleccion();
    expect(el.querySelector('ns-table-seleccion')).toBeNull();
    expect(deFila(0).closest('label')?.textContent).toContain('Seleccionar Arroz');

    await pulsar(deFila(1));
    expect(host.seleccion()).toEqual(['2']);
    expect(host.pulsadas).toEqual([]);
    expect(todas().indeterminate).toBe(true);
    expect(el.querySelectorAll('tbody tr')[1].className).toContain('ns-table__fila--marcada');

    const barra = el.querySelector('ns-table-seleccion')!;
    expect(barra.getAttribute('role')).toBe('region');
    expect(barra.textContent).toContain('1 seleccionada');
    expect(barra.querySelector('button')?.textContent).toBe('Borrar');

    await pulsar(todas());
    expect(host.seleccion()).toEqual(['1', '2']);
    expect(todas().checked).toBe(true);
    expect(todas().indeterminate).toBe(false);
    expect(barra.textContent).toContain('2 seleccionadas');
  });

  it('"todo" solo afecta a la página y "Quitar selección" lo vacía todo', async () => {
    const { fixture, el, host, todas, pulsar } = await crearSeleccion();
    host.seleccion.set(['otra-pagina']);
    await fixture.whenStable();
    await pulsar(todas());
    expect(host.seleccion()).toEqual(['otra-pagina', '1', '2']);
    await pulsar(todas());
    expect(host.seleccion()).toEqual(['otra-pagina']);

    const quitar = [...el.querySelectorAll('button')].find((b) => b.textContent?.includes('Quitar selección'))!;
    quitar.click();
    await fixture.whenStable();
    expect(host.seleccion()).toEqual([]);
    expect(el.querySelector('ns-table-seleccion')).toBeNull();
  });

  it('en móvil ofrece "Ordenar por" con el mismo sort', async () => {
    const { fixture, el, host } = await crearSeleccion();
    const select = el.querySelector<HTMLSelectElement>('.ns-table__barra-movil select')!;
    expect([...select.options].map((o) => o.textContent?.trim())).toEqual([
      'Orden por defecto',
      'Nombre: ascendente',
      'Nombre: descendente',
    ]);
    select.selectedIndex = 2;
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(host.orden()).toBe('nombre,desc');

    host.orden.set('nombre');
    await fixture.whenStable();
    expect(select.selectedOptions[0].textContent?.trim()).toBe('Nombre: ascendente');
  });
});

import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideLucideIcons } from '@lucide/angular';
import { Subject, of, throwError } from 'rxjs';

import { LayoutService } from '@core/layout/layout.service';
import type { ListaCompraResponse, ListaCompraResumenResponse, ProductoCompraResponse } from '@core/models';
import { ListasCompraService } from '@core/services/listas-compra.service';
import { ICONOS_APP } from '@shared/design/iconos';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import { NsDialogService } from '@shared/ui/overlay/dialog.service';
import { AnadirProductoDialogComponent } from './anadir-producto-dialog.component';
import { type AnadirRecetaListaData, AnadirRecetaListaDialogComponent } from './anadir-receta-lista-dialog.component';
import { cantidadTexto, desgloseTexto, marcarComprado, seccionesVisibles, textoCompartir } from './compra';
import { ListaCompraComponent } from './lista-compra.component';

// ---- Datos

function producto(id: string, cambios: Partial<ProductoCompraResponse> = {}): ProductoCompraResponse {
  return {
    id,
    nombre: `Producto ${id}`,
    cantidad: 200,
    unidad: 'G',
    seccion: 'Frutas',
    comprado: false,
    manual: false,
    desglose: [],
    ...cambios,
  };
}

function lista(cambios: Partial<ListaCompraResponse> = {}): ListaCompraResponse {
  return {
    id: 'l1',
    nombre: 'Compra semana',
    estado: 'ACTIVA',
    menuId: 'm1',
    fechaDesde: '2026-11-23',
    fechaHasta: '2026-11-29',
    comprados: 1,
    total: 4,
    secciones: [
      {
        nombre: 'Frutas',
        productos: [
          producto('a', {
            nombre: 'Plátano',
            desglose: [
              { fecha: '2026-11-23', gramos: 200 },
              { fecha: '2026-11-25', gramos: 150 },
            ],
          }),
          producto('b', { nombre: 'Manzana' }),
          producto('c', { nombre: 'Pera', comprado: true }),
        ],
      },
      {
        nombre: 'Otros',
        productos: [
          producto('d', { nombre: 'Servilletas', cantidad: 1, unidad: 'UD', manual: true, seccion: 'Otros' }),
        ],
      },
    ],
    ...cambios,
  };
}

const nombres = (l: ListaCompraResponse, seccion = 0) => l.secciones[seccion].productos.map((p) => p.id);

// ---- Funciones

describe('compra · detalle (funciones)', () => {
  it('cantidadTexto usa los decimales justos y la etiqueta de la unidad', () => {
    expect(cantidadTexto(200, 'G')).toBe('200 g');
    expect(cantidadTexto(1.5, 'KG')).toBe('1,5 kg');
    expect(cantidadTexto(0.25, 'L')).toBe('0,25 l');
    expect(cantidadTexto(3, 'UD')).toBe('3 ud.');
  });

  it('desgloseTexto: "lun. 23 · 200 g · mié. 25 · 150 g"', () => {
    expect(
      desgloseTexto(
        [
          { fecha: '2026-11-23', gramos: 200 },
          { fecha: '2026-11-25', gramos: 150 },
        ],
        'G',
      ),
    ).toBe('lun. 23 · 200 g · mié. 25 · 150 g');
    expect(desgloseTexto([{ fecha: '2026-11-24', gramos: 500 }], 'L')).toBe('mar. 24 · 500 ml');
    expect(desgloseTexto([{ fecha: '2026-11-24', gramos: null }], 'UD')).toBe('mar. 24');
  });

  it('marcarComprado mueve el producto al final de la sección y ajusta el contador', () => {
    const marcada = marcarComprado(lista(), 'a', true);
    expect(nombres(marcada)).toEqual(['b', 'c', 'a']);
    expect(marcada.comprados).toBe(2);

    const desmarcada = marcarComprado(marcada, 'c', false);
    expect(nombres(desmarcada)).toEqual(['b', 'c', 'a']);
    expect(desmarcada.secciones[0].productos[1].comprado).toBe(false);
    expect(desmarcada.comprados).toBe(1);

    const igual = lista();
    expect(marcarComprado(igual, 'c', true)).toBe(igual);
    expect(marcarComprado(igual, 'zz', true)).toBe(igual);
  });

  it('seccionesVisibles oculta los comprados y las secciones que se quedan vacías', () => {
    const l = marcarComprado(lista(), 'd', true);
    expect(seccionesVisibles(l, false).map((s) => s.nombre)).toEqual(['Frutas', 'Otros']);
    const ocultos = seccionesVisibles(l, true);
    expect(ocultos.map((s) => s.nombre)).toEqual(['Frutas']);
    expect(ocultos[0].productos.map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('textoCompartir lista los productos por sección con su estado', () => {
    const texto = textoCompartir(lista());
    expect(texto.split('\n')).toEqual([
      'Compra semana',
      '23–29 nov 2026',
      '',
      'Frutas:',
      '☐ Plátano — 200 g',
      '☐ Manzana — 200 g',
      '☑ Pera — 200 g',
      '',
      'Otros:',
      '☐ Servilletas — 1 ud.',
    ]);
  });
});

// ---- Detalle

describe('ListaCompraComponent', () => {
  let fixture: ComponentFixture<ListaCompraComponent>;
  let raiz: HTMLElement;
  let servicio: {
    detalle: ReturnType<typeof vi.fn>;
    actualizar: ReturnType<typeof vi.fn>;
    actualizarProducto: ReturnType<typeof vi.fn>;
    quitarProducto: ReturnType<typeof vi.fn>;
  };
  const abrir = vi.fn();
  const toast = { exito: vi.fn(), error: vi.fn(), info: vi.fn() };
  const esMovil = signal(false);

  beforeEach(() => {
    abrir.mockReset();
    toast.exito.mockReset();
    toast.error.mockReset();
    esMovil.set(false);
    servicio = {
      detalle: vi.fn(() => of(lista())),
      actualizar: vi.fn(),
      actualizarProducto: vi.fn(),
      quitarProducto: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideLucideIcons(...ICONOS_APP),
        { provide: ListasCompraService, useValue: servicio },
        { provide: NsDialogService, useValue: { open: abrir } },
        { provide: NsToastService, useValue: toast },
        { provide: LayoutService, useValue: { esMovil } },
      ],
    });
  });

  async function crear(): Promise<void> {
    fixture = TestBed.createComponent(ListaCompraComponent);
    fixture.componentRef.setInput('id', 'l1');
    fixture.detectChanges();
    await fixture.whenStable();
    raiz = fixture.nativeElement as HTMLElement;
  }

  const refrescar = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const filas = (seccion = 0) =>
    Array.from(raiz.querySelectorAll('app-seccion-compra')[seccion].querySelectorAll('.nombre')).map((n) =>
      n.textContent?.trim(),
    );
  const casilla = (nombre: string) =>
    Array.from(raiz.querySelectorAll('app-producto-compra-item'))
      .find((i) => i.querySelector('.nombre')?.textContent?.trim() === nombre)!
      .querySelector('input[type="checkbox"]') as HTMLInputElement;
  const marcar = async (nombre: string) => {
    const input = casilla(nombre);
    input.checked = !input.checked;
    input.dispatchEvent(new Event('change'));
    await refrescar();
  };

  it('pinta la cabecera, el progreso y las secciones con su contador de pendientes', async () => {
    await crear();
    expect(servicio.detalle).toHaveBeenCalledWith('l1');
    expect(raiz.querySelector('h1')?.textContent).toContain('Compra semana');
    expect(raiz.querySelector('.origen')?.textContent).toContain('23–29 nov 2026');
    expect(raiz.querySelector('.origen a')?.getAttribute('href')).toBe('/planificador?semana=2026-11-23');
    expect(raiz.querySelector('ns-progress-bar')?.textContent?.replace(/\s+/g, ' ')).toContain('1 / 4 comprados');
    const secciones = raiz.querySelectorAll('app-seccion-compra');
    expect(secciones.length).toBe(2);
    expect(secciones[0].querySelector('.contador')?.textContent).toContain('2 pendientes');
    expect(filas()).toEqual(['Plátano', 'Manzana', 'Pera']);
    expect(raiz.querySelector('app-seccion-compra:nth-child(2) ns-badge')?.textContent).toContain('Manual');
    expect(raiz.querySelector('.fab')).toBeNull();
  });

  it('expande el desglose por día de un producto', async () => {
    await crear();
    const boton = raiz.querySelector(
      'button[aria-expanded="false"][aria-controls^="ns-desglose"]',
    ) as HTMLButtonElement;
    boton.click();
    await refrescar();
    expect(raiz.querySelector('.desglose')?.textContent).toContain('lun. 23 · 200 g · mié. 25 · 150 g');
  });

  it('marcar comprado es optimista: mueve al final y aplica la respuesta', async () => {
    const respuesta = new Subject<ListaCompraResponse>();
    servicio.actualizarProducto.mockReturnValue(respuesta);
    await crear();
    await marcar('Plátano');
    expect(servicio.actualizarProducto).toHaveBeenCalledWith('l1', 'a', { comprado: true });
    expect(filas()).toEqual(['Manzana', 'Pera', 'Plátano']);
    expect(raiz.querySelector('ns-progress-bar')?.textContent?.replace(/\s+/g, ' ')).toContain('2 / 4');

    respuesta.next(marcarComprado(lista(), 'a', true));
    respuesta.complete();
    await refrescar();
    expect(filas()).toEqual(['Manzana', 'Pera', 'Plátano']);
  });

  it('si el PATCH falla, revierte el producto y avisa', async () => {
    servicio.actualizarProducto.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    await crear();
    await marcar('Plátano');
    expect(casilla('Plátano').checked).toBe(false);
    expect(raiz.querySelector('ns-progress-bar')?.textContent?.replace(/\s+/g, ' ')).toContain('1 / 4');
    expect(toast.error).toHaveBeenCalled();
  });

  it('"Ocultar comprados" quita los comprados de la vista', async () => {
    await crear();
    (raiz.querySelector('ns-switch button') as HTMLButtonElement).click();
    await refrescar();
    expect(filas()).toEqual(['Plátano', 'Manzana']);
  });

  it('editar la cantidad en línea hace PATCH con cantidad y unidad', async () => {
    servicio.actualizarProducto.mockReturnValue(of(lista()));
    await crear();
    (raiz.querySelector('button[aria-label="Editar cantidad de Manzana"]') as HTMLButtonElement).click();
    await refrescar();
    const input = raiz.querySelector('.edicion input') as HTMLInputElement;
    input.value = '350';
    input.dispatchEvent(new Event('input'));
    await refrescar();
    (raiz.querySelector('.edicion') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await refrescar();
    expect(servicio.actualizarProducto).toHaveBeenCalledWith('l1', 'b', { cantidad: 350, unidad: 'G' });
  });

  it('quitar un producto aplica la lista devuelta', async () => {
    const sin = lista();
    sin.secciones[0].productos = sin.secciones[0].productos.filter((p) => p.id !== 'b');
    servicio.quitarProducto.mockReturnValue(of(sin));
    await crear();
    (raiz.querySelector('button[aria-label="Quitar Manzana"]') as HTMLButtonElement).click();
    await refrescar();
    expect(servicio.quitarProducto).toHaveBeenCalledWith('l1', 'b');
    expect(filas()).toEqual(['Plátano', 'Pera']);
  });

  it('Completar lista hace PATCH { estado: COMPLETADA } y muestra el badge', async () => {
    servicio.actualizar.mockReturnValue(of(lista({ estado: 'COMPLETADA' })));
    await crear();
    const boton = Array.from(raiz.querySelectorAll('button')).find((b) => b.textContent?.includes('Completar lista'))!;
    boton.click();
    await refrescar();
    expect(servicio.actualizar).toHaveBeenCalledWith('l1', { estado: 'COMPLETADA' });
    expect(raiz.querySelector('.cabecera ns-badge')?.textContent).toContain('Completada');
    expect(raiz.textContent).toContain('Reabrir lista');
  });

  it('renombra en línea', async () => {
    servicio.actualizar.mockReturnValue(of(lista({ nombre: 'Súper' })));
    await crear();
    (raiz.querySelector('button[aria-label="Cambiar el nombre de la lista"]') as HTMLButtonElement).click();
    await refrescar();
    const input = raiz.querySelector('#ns-lista-nombre') as HTMLInputElement;
    input.value = '  Súper ';
    input.dispatchEvent(new Event('input'));
    (raiz.querySelector('.nombre-form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await refrescar();
    expect(servicio.actualizar).toHaveBeenCalledWith('l1', { nombre: 'Súper' });
    expect(raiz.querySelector('h1')?.textContent).toContain('Súper');
  });

  it('Compartir usa navigator.share si existe y, si no, copia al portapapeles', async () => {
    await crear();
    const componente = fixture.componentInstance as unknown as { compartir(): Promise<void> };
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    await componente.compartir();
    expect(share).toHaveBeenCalledWith({ title: 'Compra semana', text: textoCompartir(lista()) });

    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    await componente.compartir();
    expect(writeText).toHaveBeenCalledWith(textoCompartir(lista()));
    expect(toast.exito).toHaveBeenCalledWith('Lista copiada', expect.any(String));
  });

  it('Añadir producto abre el diálogo y aplica la lista devuelta', async () => {
    const nueva = lista({ total: 5 });
    abrir.mockReturnValue({ closed: of(nueva) });
    await crear();
    const boton = Array.from(raiz.querySelectorAll('button')).find((b) => b.textContent?.includes('Añadir producto'))!;
    boton.click();
    await refrescar();
    expect(abrir).toHaveBeenCalledWith(
      AnadirProductoDialogComponent,
      expect.objectContaining({ data: { listaId: 'l1', secciones: ['Frutas', 'Otros'] } }),
    );
    expect(raiz.querySelector('ns-progress-bar')?.textContent?.replace(/\s+/g, ' ')).toContain('1 / 5');
  });

  it('en móvil muestra el botón flotante "Añadir"', async () => {
    esMovil.set(true);
    await crear();
    expect(raiz.querySelector('.fab')?.textContent).toContain('Añadir');
  });

  it('lista vacía: estado vacío con "Añadir producto"', async () => {
    servicio.detalle.mockReturnValue(of(lista({ total: 0, comprados: 0, secciones: [] })));
    await crear();
    expect(raiz.querySelector('ns-empty-state')?.textContent).toContain('La lista está vacía');
  });

  it('404: "No encontramos esta lista"', async () => {
    servicio.detalle.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    await crear();
    expect(raiz.querySelector('ns-empty-state')?.textContent).toContain('No encontramos esta lista');
  });
});

// ---- Diálogos

describe('AnadirProductoDialogComponent', () => {
  let fixture: ComponentFixture<AnadirProductoDialogComponent>;
  let raiz: HTMLElement;
  const anadirProducto = vi.fn();
  const cerrar = vi.fn();

  beforeEach(async () => {
    anadirProducto.mockReset();
    cerrar.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideLucideIcons(...ICONOS_APP),
        { provide: ListasCompraService, useValue: { anadirProducto } },
        { provide: DialogRef, useValue: { close: cerrar, disableClose: false } },
        { provide: DIALOG_DATA, useValue: { listaId: 'l1', secciones: ['Frutas'] } },
      ],
    });
    fixture = TestBed.createComponent(AnadirProductoDialogComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    raiz = fixture.nativeElement as HTMLElement;
  });

  const escribir = async (selector: string, valor: string) => {
    const input = raiz.querySelector(selector) as HTMLInputElement;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const enviar = async () => {
    (raiz.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    await fixture.whenStable();
  };

  it('pide el nombre', async () => {
    await enviar();
    expect(anadirProducto).not.toHaveBeenCalled();
    expect(raiz.textContent).toContain('Escribe el nombre del producto.');
  });

  it('sin sección no la envía (el servidor usa "Otros") y se cierra con la lista', async () => {
    anadirProducto.mockReturnValue(of(lista()));
    await escribir('input[name="nombre"]', ' Servilletas ');
    await enviar();
    expect(anadirProducto).toHaveBeenCalledWith('l1', { nombre: 'Servilletas', cantidad: 1, unidad: 'UD' });
    expect(cerrar).toHaveBeenCalledWith(lista());
  });

  it('envía la sección escrita', async () => {
    anadirProducto.mockReturnValue(of(lista()));
    await escribir('input[name="nombre"]', 'Kiwi');
    await escribir('input[name="seccion"]', 'Frutas');
    await enviar();
    expect(anadirProducto).toHaveBeenCalledWith('l1', { nombre: 'Kiwi', cantidad: 1, unidad: 'UD', seccion: 'Frutas' });
  });
});

describe('AnadirRecetaListaDialogComponent', () => {
  let fixture: ComponentFixture<AnadirRecetaListaDialogComponent>;
  let raiz: HTMLElement;
  let servicio: {
    listar: ReturnType<typeof vi.fn>;
    anadirDesdeReceta: ReturnType<typeof vi.fn>;
    generarDesdeMenu: ReturnType<typeof vi.fn>;
  };
  const cerrar = vi.fn();
  const resumen = (
    id: string,
    estado: ListaCompraResumenResponse['estado'] = 'ACTIVA',
  ): ListaCompraResumenResponse => ({
    id,
    nombre: `Lista ${id}`,
    estado,
    menuId: null,
    fechaDesde: null,
    fechaHasta: null,
    comprados: 0,
    total: 0,
    creadoEn: '2026-11-22T10:00:00+01:00',
  });

  async function crear(data: AnadirRecetaListaData, listas: ListaCompraResumenResponse[]): Promise<void> {
    cerrar.mockReset();
    servicio = {
      listar: vi.fn(() => of({ content: listas, page: 0, size: 50, totalElements: listas.length, totalPages: 1 })),
      anadirDesdeReceta: vi.fn(() => of(lista())),
      generarDesdeMenu: vi.fn(() => of(lista({ id: 'nueva' }))),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideLucideIcons(...ICONOS_APP),
        { provide: ListasCompraService, useValue: servicio },
        { provide: DialogRef, useValue: { close: cerrar, disableClose: false } },
        { provide: DIALOG_DATA, useValue: data },
      ],
    });
    fixture = TestBed.createComponent(AnadirRecetaListaDialogComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    raiz = fixture.nativeElement as HTMLElement;
  }

  const enviar = async () => {
    (raiz.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const opciones = () =>
    Array.from(raiz.querySelectorAll('option'))
      .map((o) => o.textContent?.trim())
      .filter(Boolean);

  const RECETA = { id: 'r1', nombre: 'Pollo al curry' };
  const MENU = { id: 'm1', nombre: 'Semana de carga', fechaInicio: '2026-11-23', fechaFin: '2026-11-29' };

  it('ofrece solo las listas activas y añade la receta con las raciones', async () => {
    await crear({ receta: RECETA, raciones: 2 }, [resumen('a'), resumen('b', 'COMPLETADA')]);
    expect(opciones()).toEqual(['Lista a']);
    await enviar();
    expect(servicio.anadirDesdeReceta).toHaveBeenCalledWith('a', { recetaId: 'r1', raciones: 2 });
    expect(cerrar).toHaveBeenCalledWith({ lista: lista(), nueva: false });
  });

  it('desde el planificador ofrece crear una lista con el menú (sin volver a añadir la receta)', async () => {
    await crear({ receta: RECETA, raciones: 1, menu: MENU }, []);
    expect(opciones()).toEqual(['Nueva lista con el menú «Semana de carga»']);
    await enviar();
    expect(servicio.generarDesdeMenu).toHaveBeenCalledWith('m1');
    expect(servicio.anadirDesdeReceta).not.toHaveBeenCalled();
    expect(cerrar).toHaveBeenCalledWith({ lista: lista({ id: 'nueva' }), nueva: true });
  });

  it('sin listas activas ni menú, invita a ir al planificador', async () => {
    await crear({ receta: RECETA, raciones: 1 }, []);
    expect(raiz.textContent).toContain('No tienes listas activas');
    expect(raiz.querySelector('button[type="submit"]')?.hasAttribute('disabled')).toBe(true);
  });
});

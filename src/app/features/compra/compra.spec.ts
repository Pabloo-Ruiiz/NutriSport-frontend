import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideLucideIcons } from '@lucide/angular';
import { of, throwError } from 'rxjs';

import type { ListaCompraResponse, ListaCompraResumenResponse, Pagina } from '@core/models';
import { ListasCompraService } from '@core/services/listas-compra.service';
import { ICONOS_APP } from '@shared/design/iconos';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import { NsConfirmService } from '@shared/ui/overlay/confirm.service';
import { NsDialogService } from '@shared/ui/overlay/dialog.service';
import { etiquetaRango, rangoSugerido } from './compra';
import { type GenerarListaData, GenerarListaDialogComponent } from './generar-lista-dialog.component';
import { ListasCompraComponent } from './listas-compra.component';

function resumen(id: string, cambios: Partial<ListaCompraResumenResponse> = {}): ListaCompraResumenResponse {
  return {
    id,
    nombre: `Lista ${id}`,
    estado: 'ACTIVA',
    menuId: 'm1',
    fechaDesde: '2026-11-23',
    fechaHasta: '2026-11-29',
    comprados: 12,
    total: 34,
    creadoEn: '2026-11-22T10:00:00+01:00',
    ...cambios,
  };
}

function pagina(content: ListaCompraResumenResponse[], cambios: Partial<Pagina<unknown>> = {}) {
  return { content, page: 0, size: 12, totalElements: content.length, totalPages: 1, ...cambios };
}

const LISTA: ListaCompraResponse = {
  id: 'l9',
  nombre: 'Compra semana',
  estado: 'ACTIVA',
  menuId: 'm1',
  fechaDesde: '2026-11-23',
  fechaHasta: '2026-11-29',
  comprados: 0,
  total: 5,
  secciones: [],
};

describe('compra · funciones', () => {
  it('etiquetaRango compacta el mes y el año', () => {
    expect(etiquetaRango('2026-11-23', '2026-11-29')).toBe('23–29 nov 2026');
    expect(etiquetaRango('2026-11-30', '2026-12-06')).toBe('30 nov – 6 dic 2026');
    expect(etiquetaRango('2026-12-28', '2027-01-03')).toBe('28 dic 2026 – 3 ene 2027');
    expect(etiquetaRango('2026-11-24', '2026-11-24')).toBe('24 nov 2026');
    expect(etiquetaRango('2026-11-24', null)).toBe('24 nov 2026');
    expect(etiquetaRango(null, null)).toBeNull();
  });

  it('rangoSugerido empieza hoy si cae dentro del menú', () => {
    expect(rangoSugerido('2026-11-23', '2026-11-29', '2026-11-26')).toEqual({
      desde: '2026-11-26',
      hasta: '2026-11-29',
    });
    expect(rangoSugerido('2026-11-30', '2026-12-06', '2026-11-26')).toEqual({
      desde: '2026-11-30',
      hasta: '2026-12-06',
    });
    expect(rangoSugerido('2026-11-16', '2026-11-22', '2026-11-26')).toEqual({
      desde: '2026-11-16',
      hasta: '2026-11-22',
    });
  });
});

describe('ListasCompraComponent', () => {
  let fixture: ComponentFixture<ListasCompraComponent>;
  let servicio: { listar: ReturnType<typeof vi.fn>; eliminar: ReturnType<typeof vi.fn> };
  const confirmar = vi.fn();
  const abrir = vi.fn();
  const toast = { exito: vi.fn(), error: vi.fn(), info: vi.fn() };

  beforeEach(() => {
    confirmar.mockReset();
    abrir.mockReset();
    servicio = {
      listar: vi.fn(() =>
        of(
          pagina([
            resumen('a'),
            resumen('b', { estado: 'COMPLETADA', comprados: 34, fechaDesde: null, fechaHasta: null }),
          ]),
        ),
      ),
      eliminar: vi.fn(() => of(undefined)),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideLucideIcons(...ICONOS_APP),
        { provide: ListasCompraService, useValue: servicio },
        { provide: NsConfirmService, useValue: { confirmar } },
        { provide: NsDialogService, useValue: { open: abrir } },
        { provide: NsToastService, useValue: toast },
      ],
    });
  });

  async function crear(): Promise<HTMLElement> {
    fixture = TestBed.createComponent(ListasCompraComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('pinta una tarjeta por lista con rango, progreso y el badge Completada', async () => {
    const raiz = await crear();
    expect(servicio.listar).toHaveBeenCalledWith(0, 12);
    const tarjetas = raiz.querySelectorAll('ns-card');
    expect(tarjetas.length).toBe(2);
    expect(tarjetas[0].textContent).toContain('Lista a');
    expect(tarjetas[0].textContent).toContain('23–29 nov 2026');
    expect(tarjetas[0].textContent?.replace(/\s+/g, ' ')).toContain('12 / 34 comprados');
    expect(tarjetas[0].querySelector('ns-badge')).toBeNull();
    expect(tarjetas[1].querySelector('ns-badge')?.textContent).toContain('Completada');
    expect(tarjetas[1].textContent).toContain('Sin menú de origen');
    expect(tarjetas[0].querySelector('a')?.getAttribute('href')).toBe('/compra/a');
  });

  it('sin listas muestra el estado vacío con enlace al planificador', async () => {
    servicio.listar.mockReturnValue(of(pagina([])));
    const raiz = await crear();
    expect(raiz.querySelector('ns-empty-state')).not.toBeNull();
    expect(raiz.querySelector('a[href="/planificador"]')).not.toBeNull();
  });

  it('si falla la carga muestra el error con Reintentar', async () => {
    servicio.listar.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    const raiz = await crear();
    expect(raiz.querySelector('ns-alert')).not.toBeNull();
  });

  it('eliminar pide confirmación, borra y recarga', async () => {
    await crear();
    confirmar.mockResolvedValue(true);
    const componente = fixture.componentInstance as unknown as {
      eliminar(l: ListaCompraResumenResponse): Promise<void>;
    };
    await componente.eliminar(resumen('a'));
    expect(servicio.eliminar).toHaveBeenCalledWith('a');
    expect(toast.exito).toHaveBeenCalled();
    expect(servicio.listar).toHaveBeenCalledTimes(2);
  });

  it('eliminar no hace nada si se cancela', async () => {
    await crear();
    confirmar.mockResolvedValue(false);
    const componente = fixture.componentInstance as unknown as {
      eliminar(l: ListaCompraResumenResponse): Promise<void>;
    };
    await componente.eliminar(resumen('a'));
    expect(servicio.eliminar).not.toHaveBeenCalled();
  });

  it('renombrar aplica la lista devuelta a la tarjeta', async () => {
    abrir.mockReturnValue({ closed: of({ ...LISTA, id: 'a', nombre: 'Renombrada' }) });
    const raiz = await crear();
    const componente = fixture.componentInstance as unknown as { renombrar(l: ListaCompraResumenResponse): void };
    componente.renombrar(resumen('a'));
    fixture.detectChanges();
    expect(raiz.querySelector('ns-card')?.textContent).toContain('Renombrada');
  });

  it('abrir navega al detalle', async () => {
    await crear();
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    (fixture.componentInstance as unknown as { abrir(l: ListaCompraResumenResponse): void }).abrir(resumen('a'));
    expect(navegar).toHaveBeenCalledWith(['/compra', 'a']);
  });
});

describe('GenerarListaDialogComponent', () => {
  let fixture: ComponentFixture<GenerarListaDialogComponent>;
  let raiz: HTMLElement;
  const generarDesdeMenu = vi.fn();
  const cerrar = vi.fn();
  const data: GenerarListaData = {
    menu: { id: 'm1', nombre: 'Semana de carga', fechaInicio: '2099-11-23', fechaFin: '2099-11-29' },
  };

  beforeEach(async () => {
    generarDesdeMenu.mockReset();
    cerrar.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideLucideIcons(...ICONOS_APP),
        { provide: ListasCompraService, useValue: { generarDesdeMenu } },
        { provide: DialogRef, useValue: { close: cerrar, disableClose: false } },
        { provide: DIALOG_DATA, useValue: data },
      ],
    });
    fixture = TestBed.createComponent(GenerarListaDialogComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    raiz = fixture.nativeElement as HTMLElement;
  });

  const enviar = async () => {
    (raiz.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const elegirDias = async () => {
    (raiz.querySelectorAll('[role="radio"]')[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const escribirFecha = async (nombre: string, valor: string) => {
    const input = raiz.querySelector(`input[name="${nombre}"]`) as HTMLInputElement;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
  };

  it('por defecto genera la lista del menú completo y se cierra con ella', async () => {
    generarDesdeMenu.mockReturnValue(of(LISTA));
    expect(raiz.querySelector('input[type="date"]')).toBeNull();
    expect(raiz.textContent).toContain('23–29 nov 2099');
    await enviar();
    expect(generarDesdeMenu).toHaveBeenCalledWith('m1', {});
    expect(cerrar).toHaveBeenCalledWith(LISTA);
  });

  it('con "Elegir días" envía el rango, propuesto dentro del menú', async () => {
    generarDesdeMenu.mockReturnValue(of(LISTA));
    await elegirDias();
    const desde = raiz.querySelector('input[name="desde"]') as HTMLInputElement;
    expect(desde.value).toBe('2099-11-23');
    expect(desde.min).toBe('2099-11-23');
    expect(desde.max).toBe('2099-11-29');
    await escribirFecha('desde', '2099-11-25');
    await escribirFecha('hasta', '2099-11-27');
    await enviar();
    expect(generarDesdeMenu).toHaveBeenCalledWith('m1', { desde: '2099-11-25', hasta: '2099-11-27' });
  });

  it('no envía un rango fuera del menú o al revés', async () => {
    await elegirDias();
    await escribirFecha('desde', '2099-11-28');
    await escribirFecha('hasta', '2099-11-24');
    await enviar();
    expect(generarDesdeMenu).not.toHaveBeenCalled();
    expect(raiz.textContent).toContain('no puede ser posterior');

    await escribirFecha('desde', '2099-11-20');
    expect(raiz.textContent).toContain('dentro del menú');
  });

  it('muestra el error del servidor y no se cierra', async () => {
    generarDesdeMenu.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 404, error: { detail: 'Menú no encontrado' } })),
    );
    await enviar();
    expect(cerrar).not.toHaveBeenCalled();
    expect(raiz.querySelector('ns-alert')).not.toBeNull();
  });
});

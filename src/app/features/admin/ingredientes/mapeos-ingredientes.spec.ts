import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideLucideIcons } from '@lucide/angular';
import { of, throwError } from 'rxjs';

import type { AlimentoResponse, MapeoIngredienteResponse, Pagina } from '@core/models';
import { AdminCatalogoService } from '@core/services/admin/admin-catalogo.service';
import { AdminRecetasService } from '@core/services/admin/admin-recetas.service';
import { ICONOS_APP } from '@shared/design/iconos';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import { NsDialogService } from '@shared/ui/overlay/dialog.service';
import { EmparejarIngredienteDialogComponent } from './emparejar-ingrediente-dialog.component';
import { MapeosIngredientesComponent, textoEmparejado } from './mapeos-ingredientes.component';

function mapeo(id: string, cambios: Partial<MapeoIngredienteResponse> = {}): MapeoIngredienteResponse {
  return {
    id,
    nombreNormalizado: `ingrediente ${id}`,
    alimentoId: 'a1',
    alimentoNombre: 'Pechuga de pollo',
    metodo: 'AUTOMATICO',
    confianza: 0.9,
    revisado: false,
    recetasRecalculadas: 0,
    ...cambios,
  };
}

function pagina(content: MapeoIngredienteResponse[]): Pagina<MapeoIngredienteResponse> {
  return { content, page: 0, size: 20, totalElements: content.length, totalPages: 1 };
}

describe('textoEmparejado', () => {
  it('singular y plural', () => {
    expect(textoEmparejado(1)).toBe('1 receta recalculada');
    expect(textoEmparejado(3)).toBe('3 recetas recalculadas');
  });
});

describe('MapeosIngredientesComponent', () => {
  let fixture: ComponentFixture<MapeosIngredientesComponent>;
  let raiz: HTMLElement;
  const mapeos = vi.fn();
  const abrir = vi.fn();
  const toast = { exito: vi.fn(), error: vi.fn(), info: vi.fn() };

  beforeEach(async () => {
    mapeos.mockReset();
    abrir.mockReset();
    toast.exito.mockReset();
    mapeos.mockReturnValue(
      of(
        pagina([
          mapeo('m1'),
          mapeo('m2', { confianza: 0.45 }),
          mapeo('m3', { alimentoId: null, alimentoNombre: null, confianza: null }),
        ]),
      ),
    );
    TestBed.configureTestingModule({
      providers: [
        provideLucideIcons(...ICONOS_APP),
        { provide: AdminRecetasService, useValue: { mapeos } },
        { provide: NsDialogService, useValue: { open: abrir } },
        { provide: NsToastService, useValue: toast },
      ],
    });
    fixture = TestBed.createComponent(MapeosIngredientesComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    raiz = fixture.nativeElement as HTMLElement;
  });

  const filas = () => Array.from(raiz.querySelectorAll('tbody tr'));

  it('por defecto pide la cola de pendientes (revisado=false)', () => {
    expect(mapeos).toHaveBeenCalledWith({ revisado: false, page: 0, size: 20 });
    expect(filas().length).toBe(3);
    expect(raiz.querySelector('[role="radio"][aria-checked="true"]')?.textContent).toContain('Pendientes');
  });

  it('pinta alimento, método, confianza (con aviso si < 0,6) y revisado', () => {
    expect(filas()[0].textContent).toContain('Pechuga de pollo');
    expect(filas()[0].textContent).toContain('Automático');
    expect(filas()[0].textContent).toContain('90 %');
    expect(filas()[0].textContent).not.toContain('No se usa en los cálculos');
    expect(filas()[1].textContent).toContain('No se usa en los cálculos');
    expect(filas()[2].textContent).toContain('Sin equivalente');
    expect(filas()[0].textContent).toContain('Pendiente');
  });

  it('el filtro cambia revisado: Revisados = true, Todos = sin parámetro', async () => {
    const radios = raiz.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    radios[1].click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(mapeos).toHaveBeenLastCalledWith({ revisado: true, page: 0, size: 20 });
    radios[2].click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(mapeos).toHaveBeenLastCalledWith({ revisado: null, page: 0, size: 20 });
  });

  it('al emparejar muestra las recetas recalculadas y recarga la cola', async () => {
    abrir.mockReturnValue({ closed: of(mapeo('m1', { revisado: true, metodo: 'MANUAL', recetasRecalculadas: 4 })) });
    const boton = filas()[0].querySelector('button') as HTMLButtonElement;
    boton.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(abrir).toHaveBeenCalledWith(
      EmparejarIngredienteDialogComponent,
      expect.objectContaining({ data: { mapeo: mapeo('m1') } }),
    );
    expect(toast.exito).toHaveBeenCalledWith('Emparejado', '4 recetas recalculadas');
    expect(mapeos).toHaveBeenCalledTimes(2);
  });

  it('si falla la carga, error con Reintentar', async () => {
    mapeos.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    raiz.querySelectorAll<HTMLButtonElement>('[role="radio"]')[2].click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(raiz.querySelector('ns-alert')?.textContent).toContain('Reintentar');
  });
});

describe('EmparejarIngredienteDialogComponent', () => {
  let fixture: ComponentFixture<EmparejarIngredienteDialogComponent>;
  let raiz: HTMLElement;
  const emparejar = vi.fn();
  const cerrar = vi.fn();

  beforeEach(async () => {
    emparejar.mockReset();
    cerrar.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideLucideIcons(...ICONOS_APP),
        { provide: AdminRecetasService, useValue: { emparejar } },
        { provide: AdminCatalogoService, useValue: { alimentos: () => of({ content: [] }) } },
        { provide: DialogRef, useValue: { close: cerrar, disableClose: false } },
        { provide: DIALOG_DATA, useValue: { mapeo: mapeo('m1') } },
      ],
    });
    fixture = TestBed.createComponent(EmparejarIngredienteDialogComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    raiz = fixture.nativeElement as HTMLElement;
  });

  const enviar = async () => {
    (raiz.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    await fixture.whenStable();
  };

  it('sin elegir no se puede guardar', async () => {
    expect(raiz.querySelector('button[type="submit"]')?.hasAttribute('disabled')).toBe(true);
    await enviar();
    expect(emparejar).not.toHaveBeenCalled();
  });

  it('con un alimento envía su id y se cierra con el emparejamiento', async () => {
    const respuesta = mapeo('m1', { revisado: true, metodo: 'MANUAL', recetasRecalculadas: 2 });
    emparejar.mockReturnValue(of(respuesta));
    (fixture.componentInstance as unknown as { elegir(e: unknown): void }).elegir({
      tipo: 'alimento',
      alimento: { id: 'a9', nombre: 'Arroz', marca: null } as unknown as AlimentoResponse,
    });
    fixture.detectChanges();
    expect(raiz.textContent).toContain('Se emparejará con Arroz');
    await enviar();
    expect(emparejar).toHaveBeenCalledWith('m1', 'a9');
    expect(cerrar).toHaveBeenCalledWith(respuesta);
  });

  it('"Sin equivalente" envía alimentoId null', async () => {
    emparejar.mockReturnValue(of(mapeo('m1', { alimentoId: null })));
    const boton = Array.from(raiz.querySelectorAll('button')).find((b) => b.textContent?.includes('Sin equivalente'))!;
    boton.click();
    fixture.detectChanges();
    await enviar();
    expect(emparejar).toHaveBeenCalledWith('m1', null);
  });
});

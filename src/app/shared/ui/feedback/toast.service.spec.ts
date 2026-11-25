import { TestBed } from '@angular/core/testing';
import { provideLucideIcons } from '@lucide/angular';

import { ICONOS_APP } from '@shared/design/iconos';
import { ToastContainerComponent } from './toast-container.component';
import { MAXIMO_TOASTS_VISIBLES, NsToastService } from './toast.service';

describe('NsToastService', () => {
  let servicio: NsToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    servicio = TestBed.inject(NsToastService);
  });

  afterEach(() => {
    servicio.cerrarTodos();
    vi.useRealTimers();
  });

  it('se cierra solo a los 5 s, salvo los errores', () => {
    servicio.exito('Cena guardada');
    servicio.error('No hemos podido guardar');
    expect(servicio.visibles().map((t) => t.tipo)).toEqual(['success', 'error']);

    vi.advanceTimersByTime(4999);
    expect(servicio.visibles()).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(servicio.visibles().map((t) => t.tipo)).toEqual(['error']);

    vi.advanceTimersByTime(60_000);
    expect(servicio.visibles()).toHaveLength(1);
  });

  it(`muestra como mucho ${MAXIMO_TOASTS_VISIBLES} y el resto espera; la cuenta atrás empieza al verse`, () => {
    for (let i = 1; i <= 5; i++) servicio.info(`Toast ${i}`);
    expect(servicio.visibles().map((t) => t.titulo)).toEqual(['Toast 1', 'Toast 2', 'Toast 3']);
    expect(servicio.enEspera()).toBe(2);

    servicio.cerrar(servicio.visibles()[0].id);
    expect(servicio.visibles().map((t) => t.titulo)).toEqual(['Toast 2', 'Toast 3', 'Toast 4']);

    // Los tres visibles se cierran a los 5 s; Toast 4 empezó a contar más tarde.
    vi.advanceTimersByTime(5000);
    expect(servicio.visibles().map((t) => t.titulo)).toEqual(['Toast 5']);
    vi.advanceTimersByTime(5000);
    expect(servicio.visibles()).toHaveLength(0);
  });

  it('pausa la cuenta atrás y la reanuda con el tiempo que quedaba', () => {
    const id = servicio.info('Menú actualizado');
    vi.advanceTimersByTime(3000);
    servicio.pausar(id);
    vi.advanceTimersByTime(10_000);
    expect(servicio.visibles()).toHaveLength(1);

    servicio.reanudar(id);
    vi.advanceTimersByTime(1999);
    expect(servicio.visibles()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(servicio.visibles()).toHaveLength(0);
  });

  it('ejecuta la acción y cierra el toast', () => {
    const ejecutar = vi.fn();
    servicio.exito('Cena guardada', '718 kcal', { texto: 'Deshacer', ejecutar });
    servicio.ejecutarAccion(servicio.visibles()[0]);
    expect(ejecutar).toHaveBeenCalledOnce();
    expect(servicio.visibles()).toHaveLength(0);
  });
});

describe('ToastContainerComponent', () => {
  it('separa los errores en una región assertive y el resto en una polite', async () => {
    TestBed.configureTestingModule({ providers: [provideLucideIcons(...ICONOS_APP)] });
    const fixture = TestBed.createComponent(ToastContainerComponent);
    const servicio = TestBed.inject(NsToastService);
    await fixture.whenStable();

    const regiones = fixture.nativeElement.querySelectorAll('.ns-toasts__region') as NodeListOf<HTMLElement>;
    expect([...regiones].map((r) => r.getAttribute('aria-live'))).toEqual(['assertive', 'polite']);

    servicio.error('Error al guardar');
    servicio.info('Menú actualizado', undefined, { texto: 'Ver', ejecutar: () => {} });
    await fixture.whenStable();

    expect(regiones[0].textContent).toContain('Error al guardar');
    expect(regiones[1].textContent).toContain('Menú actualizado');
    expect(regiones[1].querySelector('.ns-toast__accion')?.textContent?.trim()).toBe('Ver');

    (regiones[0].querySelector('.ns-toast__cerrar') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(regiones[0].children).toHaveLength(0);
    servicio.cerrarTodos();
  });
});

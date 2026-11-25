import { Signal, computed, effect, linkedSignal, signal } from '@angular/core';
import { AbstractControl, ValidationErrors } from '@angular/forms';

let siguienteId = 0;

/** Id único en el documento para enlazar etiquetas, ayudas y errores (p. ej. "ns-campo-3"). */
export function idUnico(prefijo: string): string {
  return `${prefijo}-${++siguienteId}`;
}

/**
 * Contrato entre ns-form-field y el control que proyecta (nsInput, ns-select, ns-segmented…).
 *
 * El campo le asigna el id de su etiqueta y le pide que añada a aria-describedby los ids de la
 * ayuda y del error. El control es quien pinta esos atributos en el elemento enfocable, así que
 * nadie más toca aria-describedby y no se pisan entre sí.
 */
export abstract class NsControlCampo {
  /** Id del elemento enfocable (o del grupo), para <label for> o aria-labelledby. */
  abstract readonly idControl: Signal<string>;
  /**
   * true si el control es un elemento etiquetable de HTML (input, select, textarea, button) y la
   * etiqueta puede usar for="…". Si es un grupo (radiogroup), se enlaza con aria-labelledby.
   */
  abstract readonly etiquetable: boolean;

  /** Id de la etiqueta del ns-form-field que lo envuelve (si lo hay). */
  readonly idEtiqueta = signal<string | null>(null);

  private readonly descripciones = signal<readonly string[]>([]);
  /** Valor de aria-describedby: ids de ayuda y error, separados por espacios. */
  readonly describedBy = computed(() => this.descripciones().join(' ') || null);

  anadirDescripcion(id: string): void {
    this.descripciones.update((ids) => (ids.includes(id) ? ids : [...ids, id]));
  }

  quitarDescripcion(id: string): void {
    this.descripciones.update((ids) => ids.filter((actual) => actual !== id));
  }
}

/**
 * Estado de un AbstractControl expuesto como signals. Un control de formularios reactivos no es
 * reactivo para las signals: aquí se escucha `control.events` (valor, estado, touched…) y se
 * incrementa una versión para que los computed se recalculen.
 *
 * Debe crearse en contexto de inyección (como campo de un componente o directiva).
 *
 *   private readonly estado = new EstadoControl(() => this.control());   // desde un input
 *   private readonly estado = new EstadoControl();                       // y en ngDoCheck:
 *   this.estado.sincronizar(this.ngControl?.control);
 */
export class EstadoControl {
  /** Control observado. Sigue a `origen` y se puede fijar a mano con sincronizar(). */
  readonly control = linkedSignal<AbstractControl | null>(() => this.origen?.() ?? null);
  private readonly version = signal(0);

  constructor(private readonly origen?: () => AbstractControl | null | undefined) {
    effect((alLimpiar) => {
      const control = this.control();
      if (!control) return;
      const suscripcion = control.events.subscribe(() => this.version.update((v) => v + 1));
      alLimpiar(() => suscripcion.unsubscribe());
    });
  }

  /** Errores actuales del control (null si es válido o no hay control). */
  readonly errores = computed<ValidationErrors | null>(() => {
    this.version();
    return this.control()?.errors ?? null;
  });

  readonly tocado = computed(() => {
    this.version();
    return this.control()?.touched ?? false;
  });

  /**
   * Hay que mostrar el error: el control es inválido y el usuario ya pasó por él (touched), o el
   * error viene del servidor, que se enseña siempre.
   */
  readonly mostrarError = computed(() => {
    const errores = this.errores();
    if (!errores) return false;
    return this.tocado() || 'servidor' in errores;
  });

  sincronizar(control: AbstractControl | null | undefined): void {
    const nuevo = control ?? null;
    if (nuevo !== this.control()) this.control.set(nuevo);
  }
}

import { Injectable, computed, signal } from '@angular/core';

export type NsToastTipo = 'success' | 'error' | 'info' | 'warning';

export interface NsToastAccion {
  /** Verbo corto: "Deshacer", "Ver". */
  texto: string;
  ejecutar: () => void;
}

export interface NsToastOpciones {
  tipo: NsToastTipo;
  titulo: string;
  mensaje?: string;
  accion?: NsToastAccion;
  /** Milisegundos hasta cerrarse solo. 0 = solo a mano. Por defecto 5 s; los errores, 0 (§5.11). */
  duracion?: number;
}

export interface NsToast extends Required<Pick<NsToastOpciones, 'tipo' | 'titulo' | 'duracion'>> {
  id: number;
  mensaje?: string;
  accion?: NsToastAccion;
}

/** Toasts que se ven a la vez; el resto espera su turno (§5.11). */
export const MAXIMO_TOASTS_VISIBLES = 3;
const DURACION_POR_DEFECTO = 5000;

interface Temporizador {
  id: ReturnType<typeof setTimeout> | null;
  restante: number;
  inicio: number;
}

/**
 * Notificaciones breves (DESIGN.md §5.11). Las pinta <ns-toast-container>, que va una sola vez en
 * el componente raíz.
 *
 *   this.toasts.exito('Cena guardada', '718 kcal', { texto: 'Deshacer', ejecutar: () => … });
 *   this.toasts.error('No hemos podido guardar', 'Revisa tu conexión e inténtalo de nuevo.');
 *
 * Se ven como mucho 3; los siguientes esperan en cola. La cuenta atrás solo corre mientras el toast
 * está visible y se pausa mientras el ratón o el foco están sobre él (WCAG 2.2.1).
 */
@Injectable({ providedIn: 'root' })
export class NsToastService {
  private siguienteId = 0;
  private readonly cola = signal<readonly NsToast[]>([]);
  private readonly temporizadores = new Map<number, Temporizador>();

  /** Toasts en pantalla, del más antiguo al más reciente. */
  readonly visibles = computed(() => this.cola().slice(0, MAXIMO_TOASTS_VISIBLES));
  /** Cuántos esperan a que se cierre alguno de los visibles. */
  readonly enEspera = computed(() => Math.max(0, this.cola().length - MAXIMO_TOASTS_VISIBLES));

  mostrar(opciones: NsToastOpciones): number {
    const toast: NsToast = {
      id: ++this.siguienteId,
      tipo: opciones.tipo,
      titulo: opciones.titulo,
      mensaje: opciones.mensaje,
      accion: opciones.accion,
      duracion: opciones.duracion ?? (opciones.tipo === 'error' ? 0 : DURACION_POR_DEFECTO),
    };
    this.cola.update((cola) => [...cola, toast]);
    this.arrancarVisibles();
    return toast.id;
  }

  exito(titulo: string, mensaje?: string, accion?: NsToastAccion): number {
    return this.mostrar({ tipo: 'success', titulo, mensaje, accion });
  }

  /** Los errores no se cierran solos. */
  error(titulo: string, mensaje?: string, accion?: NsToastAccion): number {
    return this.mostrar({ tipo: 'error', titulo, mensaje, accion });
  }

  info(titulo: string, mensaje?: string, accion?: NsToastAccion): number {
    return this.mostrar({ tipo: 'info', titulo, mensaje, accion });
  }

  cerrar(id: number): void {
    this.pararTemporizador(id);
    this.temporizadores.delete(id);
    this.cola.update((cola) => cola.filter((toast) => toast.id !== id));
    this.arrancarVisibles();
  }

  /** Ejecuta la acción del toast y lo cierra. */
  ejecutarAccion(toast: NsToast): void {
    toast.accion?.ejecutar();
    this.cerrar(toast.id);
  }

  cerrarTodos(): void {
    for (const id of this.temporizadores.keys()) this.pararTemporizador(id);
    this.temporizadores.clear();
    this.cola.set([]);
  }

  /** Detiene la cuenta atrás (ratón o foco encima). */
  pausar(id: number): void {
    const temporizador = this.temporizadores.get(id);
    if (!temporizador?.id) return;
    this.pararTemporizador(id);
    temporizador.restante -= Date.now() - temporizador.inicio;
  }

  reanudar(id: number): void {
    const temporizador = this.temporizadores.get(id);
    if (!temporizador || temporizador.id) return;
    this.programar(id, temporizador);
  }

  /** Empieza la cuenta atrás de los toasts que acaban de hacerse visibles. */
  private arrancarVisibles(): void {
    for (const toast of this.visibles()) {
      if (toast.duracion > 0 && !this.temporizadores.has(toast.id)) {
        const temporizador: Temporizador = { id: null, restante: toast.duracion, inicio: 0 };
        this.temporizadores.set(toast.id, temporizador);
        this.programar(toast.id, temporizador);
      }
    }
  }

  private programar(id: number, temporizador: Temporizador): void {
    temporizador.inicio = Date.now();
    temporizador.id = setTimeout(() => this.cerrar(id), Math.max(0, temporizador.restante));
  }

  private pararTemporizador(id: number): void {
    const temporizador = this.temporizadores.get(id);
    if (temporizador?.id) {
      clearTimeout(temporizador.id);
      temporizador.id = null;
    }
  }
}

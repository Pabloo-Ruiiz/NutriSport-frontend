import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  booleanAttribute,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import { NsButtonComponent } from '../button/button.component';
import { idUnico } from './control-campo';

/**
 * Zona para arrastrar y soltar una foto (DESIGN.md §7.7): borde discontinuo border-input, icono
 * camera en círculo ai-50, "Arrastra una foto o haz clic" y los formatos admitidos, con los botones
 * "Hacer foto" (abre la cámara trasera en móvil) y "Subir archivo".
 *
 *   <ns-dropzone (archivo)="alElegir($event)" />
 *
 * La zona central es un botón (Enter o Espacio abren el selector). Emite el primer archivo elegido
 * o soltado, sin validarlo: lo comprueba quien lo recibe (validarArchivo de core/util/imagen).
 */
@Component({
  selector: 'ns-dropzone',
  imports: [LucideDynamicIcon, NsButtonComponent],
  template: `
    <div
      class="ns-dropzone__zona"
      role="button"
      [attr.tabindex]="deshabilitado() ? -1 : 0"
      [attr.aria-disabled]="deshabilitado() || null"
      [attr.aria-describedby]="idFormatos"
      (click)="abrir(selector)"
      (keydown.enter)="alTeclear($event, selector)"
      (keydown.space)="alTeclear($event, selector)"
    >
      <span class="ns-dropzone__icono" aria-hidden="true">
        <svg lucideIcon="camera" [size]="28"></svg>
      </span>
      <span class="ns-dropzone__titulo">{{ titulo() }}</span>
      <span class="ns-dropzone__formatos" [id]="idFormatos">{{ formatos() }}</span>
    </div>

    <div class="ns-dropzone__acciones">
      <button nsButton type="button" variant="ai" icon="camera" [disabled]="deshabilitado()" (click)="abrir(camara)">
        Hacer foto
      </button>
      <button
        nsButton
        type="button"
        variant="secondary"
        icon="upload"
        [disabled]="deshabilitado()"
        (click)="abrir(selector)"
      >
        Subir archivo
      </button>
    </div>

    <input
      #camara
      class="ns-dropzone__input"
      type="file"
      accept="image/*"
      capture="environment"
      tabindex="-1"
      aria-hidden="true"
      (change)="alCambiar(camara)"
    />
    <input
      #selector
      class="ns-dropzone__input"
      type="file"
      accept="image/*"
      tabindex="-1"
      aria-hidden="true"
      (change)="alCambiar(selector)"
    />
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--ns-space-4);
      padding: var(--ns-space-8) var(--ns-space-6);
      border: 2px dashed var(--ns-border-input);
      border-radius: var(--ns-radius-xl);
      background: var(--ns-surface);
      transition:
        border-color 150ms ease-out,
        background-color 150ms ease-out;
    }
    :host(.ns-dropzone--arrastrando) {
      border-color: var(--ns-action-ai);
      background: var(--ns-ai-50);
    }
    :host(.ns-dropzone--deshabilitado) {
      opacity: 0.6;
    }
    .ns-dropzone__zona {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--ns-space-2);
      width: 100%;
      padding: var(--ns-space-4);
      border-radius: var(--ns-radius-lg);
      text-align: center;
      cursor: pointer;

      &:focus-visible {
        outline: 2px solid var(--ns-focus-ring);
        outline-offset: 2px;
      }
      &[aria-disabled='true'] {
        cursor: not-allowed;
      }
    }
    .ns-dropzone__icono {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 64px;
      height: 64px;
      margin-bottom: var(--ns-space-2);
      border-radius: var(--ns-radius-full);
      background: var(--ns-ai-50);
      color: var(--ns-action-ai);
    }
    .ns-dropzone__titulo {
      color: var(--ns-text);
      font: 600 1rem/1.5rem var(--ns-font-body);
    }
    .ns-dropzone__formatos {
      color: var(--ns-text-secondary);
      font-size: 0.8125rem;
    }
    .ns-dropzone__acciones {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--ns-space-2);
    }
    .ns-dropzone__input {
      display: none;
    }
    @media (prefers-reduced-motion: reduce) {
      :host {
        transition: none;
      }
    }
  `,
  host: {
    class: 'ns-dropzone',
    '[class.ns-dropzone--arrastrando]': 'arrastrando()',
    '[class.ns-dropzone--deshabilitado]': 'deshabilitado()',
    '(dragenter)': 'alArrastrar($event)',
    '(dragover)': 'alArrastrar($event)',
    '(dragleave)': 'alSalir($event)',
    '(drop)': 'alSoltar($event)',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NsDropzoneComponent {
  readonly titulo = input('Arrastra una foto o haz clic');
  readonly formatos = input('JPEG o PNG hasta 10 MB');
  readonly deshabilitado = input(false, { transform: booleanAttribute });

  /** Archivo elegido con los botones o soltado en la zona. */
  readonly archivo = output<File>();

  protected readonly arrastrando = signal(false);
  protected readonly idFormatos = idUnico('ns-dropzone-formatos');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected abrir(input: HTMLInputElement): void {
    if (!this.deshabilitado()) input.click();
  }

  protected alTeclear(evento: Event, input: HTMLInputElement): void {
    evento.preventDefault();
    this.abrir(input);
  }

  protected alCambiar(input: HTMLInputElement): void {
    const archivo = input.files?.[0];
    // Se vacía para que elegir otra vez el mismo archivo vuelva a emitir.
    input.value = '';
    if (archivo) this.archivo.emit(archivo);
  }

  protected alArrastrar(evento: DragEvent): void {
    if (this.deshabilitado() || !tieneArchivos(evento)) return;
    evento.preventDefault();
    if (evento.dataTransfer) evento.dataTransfer.dropEffect = 'copy';
    this.arrastrando.set(true);
  }

  protected alSalir(evento: DragEvent): void {
    // dragleave también salta al pasar sobre un hijo: solo cuenta si sale del componente.
    const destino = evento.relatedTarget as Node | null;
    if (!destino || !this.host.nativeElement.contains(destino)) this.arrastrando.set(false);
  }

  protected alSoltar(evento: DragEvent): void {
    evento.preventDefault();
    this.arrastrando.set(false);
    if (this.deshabilitado()) return;
    const archivo = evento.dataTransfer?.files?.[0];
    if (archivo) this.archivo.emit(archivo);
  }
}

function tieneArchivos(evento: DragEvent): boolean {
  const tipos = evento.dataTransfer?.types;
  return !tipos || Array.from(tipos).includes('Files');
}

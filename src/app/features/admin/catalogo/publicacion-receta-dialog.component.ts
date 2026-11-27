import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { PublicarRecetaRequest, RecetaResponse, TipoComida } from '@core/models';
import { ETIQUETAS_TIPO_COMIDA, ORDEN_TIPOS_COMIDA } from '@core/models/etiquetas';
import { AdminRecetasService } from '@core/services/admin/admin-recetas.service';
import { RecetasService } from '@core/services/recetas.service';
import { aApiError } from '@core/util/api-error';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsSkeletonComponent } from '@shared/ui/feedback/skeleton.component';
import { NsChipGroupComponent } from '@shared/ui/form/chip-group.component';
import type { NsOpcion } from '@shared/ui/form/control-valor';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { NsInputDirective } from '@shared/ui/form/input.directive';
import { NsSegmentedComponent } from '@shared/ui/form/segmented.component';
import { DialogShellComponent } from '@shared/ui/overlay/dialog-shell.component';
import { MAX_RACIONES_RECETA, MIN_RACIONES_RECETA, franjasValidas } from './recetas-admin';

export interface PublicacionRecetaData {
  /** Receta con id propio (las de TheMealDB ya importadas). */
  receta: Pick<RecetaResponse, 'id' | 'nombre'>;
  /** Recién creada: se sabe que está sin publicar y se propone publicarla. */
  recienCreada?: boolean;
}

export interface PublicacionRecetaResultado {
  receta: RecetaResponse;
  /** Lo que se ha enviado; null si no se tocó la publicación. */
  publicada: boolean | null;
}

/**
 * Publicación de una receta (docs/api/admin.md §6, PATCH /admin/recetas/{id}/publicacion):
 * publicada o sin publicar, raciones reales y franjas aptas. Solo se envían los campos que cambian.
 *
 * Las respuestas no dicen si una receta está publicada (Annex B), así que la elección es explícita:
 * no hay valor por defecto salvo para una receta recién creada (sin publicar), a la que se propone
 * publicar. Si las raciones eran supuestas, se envían siempre: guardarlas las fija como reales.
 */
@Component({
  selector: 'app-publicacion-receta-dialog',
  imports: [
    DialogShellComponent,
    FormsModule,
    NsAlertComponent,
    NsButtonComponent,
    NsChipGroupComponent,
    NsFormFieldComponent,
    NsInputDirective,
    NsSegmentedComponent,
    NsSkeletonComponent,
  ],
  template: `
    <ns-dialog-shell>
      @if (cargando()) {
        <div class="ns-pub" aria-busy="true" aria-label="Cargando la receta">
          <ns-skeleton shape="rect" height="44px" />
          <ns-skeleton shape="rect" height="96px" />
        </div>
      } @else if (errorCarga(); as error) {
        <ns-alert type="error" titulo="No hemos podido cargar la receta">{{ error }}</ns-alert>
      } @else {
        <form id="ns-pub-receta-form" class="ns-pub" (ngSubmit)="guardar()" novalidate>
          <p class="ns-pub__intro">
            «{{ data.receta.nombre }}». Solo las publicadas salen en el catálogo y en el planificador.
          </p>

          <ns-form-field
            label="Publicación"
            [hint]="data.recienCreada ? 'Se ha creado sin publicar.' : 'Elige el estado: la API no informa del actual.'"
          >
            <ns-segmented
              name="publicada"
              [opciones]="estados"
              [ngModel]="publicada()"
              (ngModelChange)="publicada.set($event); error.set(null)"
            />
          </ns-form-field>

          <ns-form-field
            label="Raciones reales"
            obligatorio
            [hint]="
              racionesSupuestas()
                ? 'Ahora son supuestas: al guardar quedan fijadas como reales.'
                : minRaciones + '–' + maxRaciones
            "
          >
            <input
              nsInput
              type="number"
              inputmode="numeric"
              name="raciones"
              [min]="minRaciones"
              [max]="maxRaciones"
              step="1"
              [ngModel]="raciones()"
              (ngModelChange)="raciones.set($event); errorRaciones.set(null)"
              [invalido]="!!errorRaciones()"
              descritoPor="ns-pub-error-raciones"
            />
          </ns-form-field>
          <p class="ns-pub__error" id="ns-pub-error-raciones" [hidden]="!errorRaciones()">{{ errorRaciones() }}</p>

          <ns-form-field label="Franjas aptas" hint="En qué comidas del planificador puede salir.">
            <ns-chip-group
              name="franjas"
              [opciones]="franjas"
              multiple
              [ngModel]="franjasAptas()"
              (ngModelChange)="franjasAptas.set($event)"
            />
          </ns-form-field>

          @if (error(); as error) {
            <ns-alert type="error">{{ error }}</ns-alert>
          }
        </form>
      }

      <button
        nsDialogAcciones
        nsButton
        type="button"
        variant="secondary"
        [disabled]="guardando()"
        (click)="ref.close()"
      >
        Cancelar
      </button>
      <button
        nsDialogAcciones
        nsButton
        type="submit"
        form="ns-pub-receta-form"
        [disabled]="cargando() || !!errorCarga()"
        [loading]="guardando()"
      >
        Guardar
      </button>
    </ns-dialog-shell>
  `,
  styles: `
    .ns-pub {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-4);
    }
    .ns-pub__intro {
      margin: 0;
      color: var(--ns-text-secondary);
      font-size: 0.875rem;
    }
    .ns-pub__error {
      margin: calc(-1 * var(--ns-space-3)) 0 0;
      color: var(--ns-error);
      font-size: 0.8125rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicacionRecetaDialogComponent {
  protected readonly ref = inject<DialogRef<PublicacionRecetaResultado>>(DialogRef);
  private readonly adminRecetas = inject(AdminRecetasService);
  private readonly recetasService = inject(RecetasService);
  protected readonly data = inject<PublicacionRecetaData>(DIALOG_DATA);

  protected readonly minRaciones = MIN_RACIONES_RECETA;
  protected readonly maxRaciones = MAX_RACIONES_RECETA;
  protected readonly estados: NsOpcion<boolean>[] = [
    { valor: true, etiqueta: 'Publicada', icono: 'eye' },
    { valor: false, etiqueta: 'Sin publicar', icono: 'eye-off' },
  ];
  protected readonly franjas: NsOpcion<TipoComida>[] = ORDEN_TIPOS_COMIDA.map((t) => ({
    valor: t,
    etiqueta: ETIQUETAS_TIPO_COMIDA[t],
  }));

  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal<string | null>(null);
  protected readonly publicada = signal<boolean | null>(this.data.recienCreada ? true : null);
  protected readonly raciones = signal<number | null>(null);
  protected readonly racionesSupuestas = signal(false);
  protected readonly franjasAptas = signal<TipoComida[]>([]);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly errorRaciones = signal<string | null>(null);

  private original: { raciones: number; franjas: TipoComida[] } | null = null;

  constructor() {
    this.recetasService.detalle(this.data.receta.id).subscribe({
      next: (receta) => {
        const franjas = franjasValidas(receta.franjasAptas);
        this.original = { raciones: receta.raciones, franjas };
        this.raciones.set(receta.raciones);
        this.racionesSupuestas.set(receta.racionesSupuestas);
        this.franjasAptas.set(franjas);
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.errorCarga.set(aApiError(e).detalle);
        this.cargando.set(false);
      },
    });
  }

  protected guardar(): void {
    if (this.guardando() || !this.original) return;
    const raciones = Number(this.raciones());
    if (!Number.isInteger(raciones) || raciones < MIN_RACIONES_RECETA || raciones > MAX_RACIONES_RECETA) {
      this.errorRaciones.set(
        `Las raciones deben ser un número entero entre ${MIN_RACIONES_RECETA} y ${MAX_RACIONES_RECETA}.`,
      );
      return;
    }
    const franjas = franjasValidas(this.franjasAptas());
    const req: PublicarRecetaRequest = {};
    const publicada = this.publicada();
    if (publicada !== null) req.publicada = publicada;
    if (raciones !== this.original.raciones || this.racionesSupuestas()) req.raciones = raciones;
    if (franjas.join() !== this.original.franjas.join()) req.franjasAptas = franjas;
    if (Object.keys(req).length === 0) {
      this.error.set('Elige si la receta queda publicada o cambia sus raciones o franjas.');
      return;
    }

    this.guardando.set(true);
    this.error.set(null);
    this.adminRecetas.publicacion(this.data.receta.id, req).subscribe({
      next: (receta) => this.ref.close({ receta, publicada: req.publicada ?? null }),
      error: (e: unknown) => {
        const error = aApiError(e);
        const deRaciones = error.errores.find((c) => c.campo === 'raciones');
        if (deRaciones) this.errorRaciones.set(deRaciones.mensaje);
        else this.error.set(error.detalle);
        this.guardando.set(false);
      },
    });
  }
}

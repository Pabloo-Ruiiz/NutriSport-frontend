import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { Observable, map } from 'rxjs';

import type { AlimentoResponse, MapeoIngredienteResponse } from '@core/models';
import { AdminCatalogoService } from '@core/services/admin/admin-catalogo.service';
import { AdminRecetasService } from '@core/services/admin/admin-recetas.service';
import { aApiError } from '@core/util/api-error';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import {
  NsComboboxComponent,
  NsComboboxOpcionDirective,
  NsResaltadoComponent,
} from '@shared/ui/form/combobox.component';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { DialogShellComponent } from '@shared/ui/overlay/dialog-shell.component';

export interface EmparejarIngredienteData {
  mapeo: MapeoIngredienteResponse;
}

/** Alimentos que se ofrecen en el buscador. */
const RESULTADOS = 20;

/** Lo elegido: un alimento del catálogo o "sin equivalente". */
type Eleccion = { tipo: 'alimento'; alimento: Pick<AlimentoResponse, 'id' | 'nombre' | 'marca'> } | { tipo: 'ninguno' };

/**
 * Emparejar un ingrediente con un alimento del catálogo (docs/api/admin.md §6): buscador de
 * alimentos públicos activos o "Sin equivalente" (alimentoId null) → PUT
 * /admin/mapeos-ingredientes/{id}. Se cierra con el emparejamiento actualizado (revisado y MANUAL,
 * con las recetas recalculadas); sin valor si se cancela.
 */
@Component({
  selector: 'app-emparejar-ingrediente-dialog',
  imports: [
    DialogShellComponent,
    LucideDynamicIcon,
    NsAlertComponent,
    NsButtonComponent,
    NsComboboxComponent,
    NsComboboxOpcionDirective,
    NsFormFieldComponent,
    NsResaltadoComponent,
  ],
  template: `
    <ns-dialog-shell>
      <form id="ns-emparejar-form" class="ns-emp" (submit)="$event.preventDefault(); guardar()" novalidate>
        <p class="ns-emp__intro">
          Ingrediente <strong>«{{ mapeo.nombreNormalizado }}»</strong>
          @if (mapeo.alimentoNombre) {
            · ahora con <strong>{{ mapeo.alimentoNombre }}</strong>
          } @else {
            · ahora sin equivalente
          }
        </p>

        <ns-form-field label="Alimento del catálogo" hint="Solo alimentos públicos y activos.">
          <ns-combobox
            [buscar]="buscarAlimentos"
            [textoOpcion]="nombre"
            placeholder="Busca por nombre o marca"
            (seleccionado)="elegir({ tipo: 'alimento', alimento: $event })"
          >
            <ng-template nsComboboxOpcion let-a let-consulta="consulta">
              <ns-resaltado [texto]="a.nombre" [consulta]="consulta" />
              @if (a.marca) {
                <span class="ns-text-secondary"> · {{ a.marca }}</span>
              }
            </ng-template>
          </ns-combobox>
        </ns-form-field>

        <button
          nsButton
          type="button"
          variant="secondary"
          icon="x"
          [attr.aria-pressed]="eleccion()?.tipo === 'ninguno'"
          (click)="elegir({ tipo: 'ninguno' })"
        >
          Sin equivalente
        </button>

        <p class="ns-emp__eleccion" role="status">
          @switch (eleccion()?.tipo) {
            @case ('alimento') {
              <svg lucideIcon="circle-check" [size]="16" aria-hidden="true"></svg>
              Se emparejará con <strong>{{ textoEleccion() }}</strong>.
            }
            @case ('ninguno') {
              <svg lucideIcon="circle-check" [size]="16" aria-hidden="true"></svg>
              Quedará <strong>sin equivalente</strong>: no cuenta en los cálculos.
            }
            @default {
              Elige un alimento o «Sin equivalente».
            }
          }
        </p>

        @if (error(); as error) {
          <ns-alert type="error">{{ error }}</ns-alert>
        }
      </form>

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
        form="ns-emparejar-form"
        [disabled]="!eleccion()"
        [loading]="guardando()"
      >
        Guardar
      </button>
    </ns-dialog-shell>
  `,
  styles: `
    .ns-emp {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: var(--ns-space-4);

      ns-form-field {
        align-self: stretch;
      }
    }
    .ns-emp__intro,
    .ns-emp__eleccion {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--ns-space-1);
      margin: 0;
      color: var(--ns-text-secondary);
      font-size: 0.875rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmparejarIngredienteDialogComponent {
  protected readonly ref = inject<DialogRef<MapeoIngredienteResponse>>(DialogRef);
  private readonly catalogo = inject(AdminCatalogoService);
  private readonly adminRecetas = inject(AdminRecetasService);
  protected readonly mapeo = inject<EmparejarIngredienteData>(DIALOG_DATA).mapeo;

  protected readonly eleccion = signal<Eleccion | null>(null);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly textoEleccion = computed(() => {
    const e = this.eleccion();
    return e?.tipo === 'alimento' ? this.nombre(e.alimento) : '';
  });

  protected readonly buscarAlimentos = (q: string): Observable<AlimentoResponse[]> =>
    this.catalogo
      .alimentos({ q, visibilidad: 'PUBLICO', activo: true, page: 0, size: RESULTADOS })
      .pipe(map((p) => p.content));
  protected readonly nombre = (a: Pick<AlimentoResponse, 'nombre' | 'marca'>): string =>
    a.marca ? `${a.nombre} · ${a.marca}` : a.nombre;

  protected elegir(eleccion: Eleccion): void {
    this.eleccion.set(eleccion);
    this.error.set(null);
  }

  protected guardar(): void {
    const eleccion = this.eleccion();
    if (!eleccion || this.guardando()) return;
    this.guardando.set(true);
    this.error.set(null);
    this.adminRecetas.emparejar(this.mapeo.id, eleccion.tipo === 'alimento' ? eleccion.alimento.id : null).subscribe({
      next: (mapeo) => this.ref.close(mapeo),
      error: (e: unknown) => {
        this.error.set(aApiError(e).detalle);
        this.guardando.set(false);
      },
    });
  }
}

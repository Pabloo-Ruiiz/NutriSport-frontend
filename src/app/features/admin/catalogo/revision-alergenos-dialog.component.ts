import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import type { Alergeno, AlimentoResponse } from '@core/models';
import { ETIQUETAS_ALERGENO } from '@core/models/etiquetas';
import { AdminCatalogoService } from '@core/services/admin/admin-catalogo.service';
import { aApiError } from '@core/util/api-error';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsBadgeComponent } from '@shared/ui/feedback/badge.component';
import { NsCheckboxComponent } from '@shared/ui/form/checkbox.component';
import { NsChipGroupComponent } from '@shared/ui/form/chip-group.component';
import type { NsOpcion } from '@shared/ui/form/control-valor';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { DialogShellComponent } from '@shared/ui/overlay/dialog-shell.component';

export interface RevisionAlergenosData {
  alimento: AlimentoResponse;
}

/** Los 14 alérgenos de declaración obligatoria (Reglamento UE 1169/2011), en el orden de ETIQUETAS_ALERGENO. */
const ALERGENOS = Object.keys(ETIQUETAS_ALERGENO) as Alergeno[];

/**
 * Revisión de alérgenos de un alimento (docs/api/admin.md §6): contiene, trazas (chips de los 14
 * alérgenos) y lactosa → PUT /admin/alimentos/{id}/alergenos. Al guardar queda revisado y deja de
 * excluirse para los usuarios con alergias estrictas. Se cierra con el alimento actualizado; sin
 * valor si se cancela.
 *
 *   this.dialogos.open<RevisionAlergenosDialogComponent, AlimentoResponse, RevisionAlergenosData>(
 *     RevisionAlergenosDialogComponent, { titulo: 'Revisar alérgenos', size: 'md', data: { alimento } });
 *
 * Un alérgeno marcado en "Contiene" no se ofrece como traza (sería redundante).
 */
@Component({
  selector: 'app-revision-alergenos-dialog',
  imports: [
    DialogShellComponent,
    ReactiveFormsModule,
    NsAlertComponent,
    NsBadgeComponent,
    NsButtonComponent,
    NsCheckboxComponent,
    NsChipGroupComponent,
    NsFormFieldComponent,
  ],
  template: `
    <ns-dialog-shell>
      <form id="ns-revision-alergenos" class="ns-revision" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
        <p class="ns-revision__alimento">
          <span class="ns-revision__nombre">{{ alimento.nombre }}</span>
          @if (alimento.marca) {
            <span class="ns-revision__marca">{{ alimento.marca }}</span>
          }
          <ns-badge [variant]="alimento.alergenosRevisados ? 'success' : 'warning'">
            {{ alimento.alergenosRevisados ? 'Revisados' : 'Pendientes de revisar' }}
          </ns-badge>
        </p>

        <ns-form-field label="Contiene" hint="Ingredientes del alimento.">
          <ns-chip-group formControlName="alergenosContiene" [opciones]="opcionesContiene" multiple />
        </ns-form-field>
        <ns-form-field label="Puede contener trazas" hint="Contaminación cruzada declarada por el fabricante.">
          <ns-chip-group formControlName="alergenosTrazas" [opciones]="opcionesTrazas()" multiple />
        </ns-form-field>
        <ns-checkbox formControlName="contieneLactosa">Contiene lactosa</ns-checkbox>
        <p class="ns-revision__ayuda">
          La lactosa va aparte de «Lácteos»: hay lácteos sin lactosa y la intolerancia no es una alergia.
        </p>

        @if (error(); as mensaje) {
          <ns-alert type="error" titulo="No se ha podido guardar la revisión">{{ mensaje }}</ns-alert>
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
        form="ns-revision-alergenos"
        icon="shield-check"
        [loading]="guardando()"
      >
        Marcar como revisado
      </button>
    </ns-dialog-shell>
  `,
  styles: `
    .ns-revision {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-4);
    }
    .ns-revision__alimento {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--ns-space-1) var(--ns-space-2);
      margin: 0;
      padding: var(--ns-space-3);
      border-radius: var(--ns-radius-md);
      background: var(--ns-surface-muted);
    }
    .ns-revision__nombre {
      font-weight: 600;
    }
    .ns-revision__marca,
    .ns-revision__ayuda {
      color: var(--ns-text-secondary);
      font-size: 0.8125rem;
    }
    .ns-revision__ayuda {
      margin: calc(-1 * var(--ns-space-3)) 0 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RevisionAlergenosDialogComponent {
  protected readonly ref = inject<DialogRef<AlimentoResponse>>(DialogRef);
  private readonly catalogo = inject(AdminCatalogoService);
  protected readonly alimento = inject<RevisionAlergenosData>(DIALOG_DATA).alimento;

  protected readonly form = new FormGroup({
    alergenosContiene: new FormControl<Alergeno[]>([...this.alimento.alergenosContiene], { nonNullable: true }),
    alergenosTrazas: new FormControl<Alergeno[]>(
      this.alimento.alergenosTrazas.filter((a) => !this.alimento.alergenosContiene.includes(a)),
      { nonNullable: true },
    ),
    contieneLactosa: new FormControl(this.alimento.contieneLactosa, { nonNullable: true }),
  });

  protected readonly opcionesContiene: NsOpcion<Alergeno>[] = ALERGENOS.map((valor) => ({
    valor,
    etiqueta: ETIQUETAS_ALERGENO[valor],
  }));
  private readonly contiene = toSignal(this.form.controls.alergenosContiene.valueChanges, {
    initialValue: this.form.controls.alergenosContiene.value,
  });
  protected readonly opcionesTrazas = computed<NsOpcion<Alergeno>[]>(() => {
    const contiene = this.contiene();
    return ALERGENOS.map((valor) => ({
      valor,
      etiqueta: ETIQUETAS_ALERGENO[valor],
      deshabilitada: contiene.includes(valor),
    }));
  });

  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    // Lo que pasa a "Contiene" sale de las trazas.
    this.form.controls.alergenosContiene.valueChanges.subscribe((contiene) => {
      const trazas = this.form.controls.alergenosTrazas.value;
      const filtradas = trazas.filter((a) => !contiene.includes(a));
      if (filtradas.length !== trazas.length) this.form.controls.alergenosTrazas.setValue(filtradas);
    });
  }

  protected async guardar(): Promise<void> {
    if (this.guardando()) return;
    this.guardando.set(true);
    this.error.set(null);
    try {
      const alimento = await firstValueFrom(this.catalogo.revisarAlergenos(this.alimento.id, this.form.getRawValue()));
      this.ref.close(alimento);
    } catch (e) {
      this.error.set(aApiError(e).detalle);
    } finally {
      this.guardando.set(false);
    }
  }
}

import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, of, startWith, switchMap, tap } from 'rxjs';

import type { NutricionRecetaResponse } from '@core/models';
import { RecetasService } from '@core/services/recetas.service';
import { aApiError } from '@core/util/api-error';
import { formatearNumero } from '@shared/pipes/formato';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsCalcStatusComponent } from '@shared/ui/data/calc-status.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsSpinnerComponent } from '@shared/ui/feedback/spinner.component';
import { DialogShellComponent } from '@shared/ui/overlay/dialog-shell.component';
import { etiquetaConversion, textoGramos } from './ingredientes-receta.component';

export interface DesgloseNutricionData {
  id: string;
  raciones: number;
}

/**
 * Cómo se calcula la nutrición de una receta (DESIGN.md §7.22, GET /recetas/{id}/nutricion): cada
 * ingrediente con sus gramos para las raciones pedidas, cómo se han obtenido (exacta, estimada,
 * despreciable, sin datos) y la fuente de sus nutrientes. Se abre con NsDialogService.
 */
@Component({
  selector: 'app-desglose-nutricion',
  imports: [NsAlertComponent, NsButtonComponent, NsCalcStatusComponent, DialogShellComponent, NsSpinnerComponent],
  template: `
    <ns-dialog-shell>
      @if (desglose(); as d) {
        <div class="resumen">
          <ns-calc-status [estado]="d.estado" [completitud]="d.completitudPct" />
          <span class="ns-text-body-sm ns-text-secondary">
            {{ d.raciones }} {{ d.raciones === 1 ? 'ración' : 'raciones'
            }}{{ d.racionesSupuestas ? ' (supuestas)' : '' }}
            @if (d.porRacion; as n) {
              · {{ aprox() }}{{ numero(n.kcal) }} kcal por ración
            }
          </span>
        </div>
        <div class="tabla-scroll">
          <table class="tabla">
            <caption class="ns-sr-only">
              Cálculo por ingrediente
            </caption>
            <thead>
              <tr>
                <th scope="col">Ingrediente</th>
                <th scope="col" class="num">Gramos</th>
                <th scope="col">Conversión</th>
                <th scope="col">Fuente</th>
              </tr>
            </thead>
            <tbody>
              @for (i of d.ingredientes; track $index) {
                <tr>
                  <td>
                    <span class="nombre">{{ i.nombre }}</span>
                    @if (i.nombreOriginal && i.nombreOriginal !== i.nombre) {
                      <span class="ns-text-caption ns-text-secondary">{{ i.nombreOriginal }}</span>
                    }
                    @if (i.medidaOriginal) {
                      <span class="ns-text-caption ns-text-secondary">{{ i.medidaOriginal }}</span>
                    }
                  </td>
                  <td class="num ns-tnum">{{ gramos(i) }}</td>
                  <td>{{ conversion(i.estadoConversion) }}</td>
                  <td>{{ i.fuente || '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <p class="ns-text-caption ns-text-secondary nota">
          Los nutrientes de cada ingrediente salen del catálogo NutriSport o de USDA FoodData Central. Los ingredientes
          sin datos no suman: por eso el cálculo puede ser aproximado o incompleto.
        </p>
      } @else if (error(); as mensaje) {
        <ns-alert type="error" titulo="No hemos podido cargar el desglose">
          {{ mensaje }}
          <button nsAlertAcciones nsButton type="button" variant="secondary" size="sm" (click)="recargas.next()">
            Reintentar
          </button>
        </ns-alert>
      } @else {
        <div class="cargando"><ns-spinner [size]="24" etiqueta="Cargando el desglose" /></div>
      }
      <button nsDialogAcciones nsButton type="button" variant="secondary" (click)="ref.close()">Cerrar</button>
    </ns-dialog-shell>
  `,
  styles: `
    .resumen {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--ns-space-2);
      margin-bottom: var(--ns-space-4);
    }
    .tabla-scroll {
      overflow-x: auto;
    }
    .tabla {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    th {
      padding: var(--ns-space-2);
      color: var(--ns-text-secondary);
      font-weight: 500;
      text-align: start;
      border-bottom: 1px solid var(--ns-border);
    }
    td {
      padding: var(--ns-space-2);
      border-bottom: 1px solid var(--ns-border);
      vertical-align: top;
    }
    td span {
      display: block;
    }
    .nombre {
      font-weight: 500;
    }
    .num {
      text-align: end;
      white-space: nowrap;
    }
    .nota {
      margin: var(--ns-space-3) 0 0;
    }
    .cargando {
      display: grid;
      place-items: center;
      padding: var(--ns-space-8);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DesgloseNutricionComponent {
  protected readonly ref = inject(DialogRef);
  private readonly data = inject<DesgloseNutricionData>(DIALOG_DATA);
  private readonly servicio = inject(RecetasService);

  protected readonly desglose = signal<NutricionRecetaResponse | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly recargas = new Subject<void>();
  protected readonly aprox = computed(() => (this.desglose()?.estado === 'APROXIMADO' ? '≈ ' : ''));
  protected readonly numero = (n: number) => formatearNumero(n, 0);
  protected readonly gramos = textoGramos;
  protected readonly conversion = etiquetaConversion;

  constructor() {
    this.recargas
      .pipe(
        startWith(undefined),
        tap(() => this.error.set(null)),
        switchMap(() =>
          this.servicio.nutricion(this.data.id, this.data.raciones).pipe(
            catchError((e: unknown) => {
              this.error.set(aApiError(e).detalle);
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((d) => this.desglose.set(d));
  }
}

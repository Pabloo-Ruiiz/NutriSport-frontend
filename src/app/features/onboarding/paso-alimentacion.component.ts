import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { combineLatest, map, startWith, switchMap } from 'rxjs';

import type { TipoComida } from '@core/models';
import type { NsOpcion } from '@shared/ui/form/control-valor';
import { ErrorCampoDirective } from '@shared/ui/form/error-campo.directive';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { NsQuantityInputComponent } from '@shared/ui/form/quantity-input.component';
import { NsSegmentedComponent } from '@shared/ui/form/segmented.component';
import { SelectorPreferenciasComponent } from '../perfil/componentes/selector-preferencias.component';
import { FRANJAS_ELEGIBLES } from '@core/util/franjas';
import type { GrupoAlimentacion } from './perfil-form';

/** Tarjeta de cada franja elegible: nombre, cuándo es e icono. "Almuerzo" es MEDIA_MANANA. */
export const FRANJAS_TARJETA: Record<Exclude<TipoComida, 'OTRO'>, { nombre: string; cuando: string; icono: string }> = {
  DESAYUNO: { nombre: 'Desayuno', cuando: 'Al empezar el día', icono: 'coffee' },
  MEDIA_MANANA: { nombre: 'Almuerzo', cuando: 'A media mañana', icono: 'sandwich' },
  COMIDA: { nombre: 'Comida', cuando: 'A mediodía', icono: 'utensils' },
  MERIENDA: { nombre: 'Merienda', cuando: 'Por la tarde', icono: 'apple' },
  PRE_ENTRENO: { nombre: 'Pre-entreno', cuando: 'Antes de entrenar', icono: 'zap' },
  POST_ENTRENO: { nombre: 'Post-entreno', cuando: 'Después de entrenar', icono: 'battery-charging' },
  CENA: { nombre: 'Cena', cuando: 'Por la noche', icono: 'moon' },
};

/**
 * Paso 4 · Alimentación, en tres bloques: restricciones y preferencias; comidas del día (cuántas y
 * cuáles: exactamente tantas franjas como comidas, con contador) y tiempo para cocinar.
 * Las franjas elegidas las usan Inicio y el planificador.
 */
@Component({
  selector: 'app-paso-alimentacion',
  imports: [
    ReactiveFormsModule,
    LucideDynamicIcon,
    ErrorCampoDirective,
    NsFormFieldComponent,
    NsQuantityInputComponent,
    NsSegmentedComponent,
    SelectorPreferenciasComponent,
  ],
  template: `
    <div class="ns-paso" [formGroup]="grupo()">
      <section class="ns-bloque" aria-labelledby="ns-bloque-preferencias">
        <header class="ns-bloque__cabecera">
          <span class="ns-bloque__icono" aria-hidden="true"><svg lucideIcon="shield-check" [size]="20"></svg></span>
          <span>
            <h2 class="ns-bloque__titulo" id="ns-bloque-preferencias">Restricciones y preferencias</h2>
            <p class="ns-bloque__texto">Las tendremos en cuenta en los avisos, las recetas y tus menús.</p>
          </span>
        </header>
        <app-selector-preferencias #preferencias formControlName="preferencias" />
        <p class="ns-paso__error" [nsErrorCampo]="grupo().controls.preferencias" [nsErrorCampoPara]="preferencias"></p>
      </section>

      <section class="ns-bloque" aria-labelledby="ns-bloque-comidas">
        <header class="ns-bloque__cabecera">
          <span class="ns-bloque__icono" aria-hidden="true"><svg lucideIcon="utensils" [size]="20"></svg></span>
          <span>
            <h2 class="ns-bloque__titulo" id="ns-bloque-comidas">Tus comidas del día</h2>
            <p class="ns-bloque__texto">Inicio y el planificador mostrarán solo estas comidas.</p>
          </span>
        </header>

        <ns-form-field label="Comidas al día" hint="Cuántas veces sueles comer, contando tentempiés." obligatorio>
          <ns-segmented formControlName="comidasPorDia" [opciones]="comidas" />
        </ns-form-field>

        <fieldset class="ns-paso__grupo" #franjas>
          <legend class="ns-paso__leyenda ns-franjas__leyenda">
            ¿Cuáles? <span aria-hidden="true">*</span>
            <span
              class="ns-franjas__contador"
              [class.ns-franjas__contador--completo]="completo()"
              [class.ns-franjas__contador--exceso]="elegidas().length > requeridas()"
              aria-live="polite"
            >
              @if (completo()) {
                <svg lucideIcon="circle-check" [size]="14" aria-hidden="true"></svg>
              }
              {{ elegidas().length }} de {{ requeridas() }} comidas seleccionadas
            </span>
          </legend>
          <div class="ns-franjas">
            @for (f of franjasTarjeta; track f.tipo) {
              <label class="ns-franja" [class.ns-franja--bloqueada]="bloqueada(f.tipo)">
                <input
                  class="ns-tarjeta__radio"
                  type="checkbox"
                  [checked]="elegidas().includes(f.tipo)"
                  [disabled]="bloqueada(f.tipo)"
                  (change)="alternar(f.tipo)"
                />
                <span class="ns-franja__icono" aria-hidden="true"><svg [lucideIcon]="f.icono" [size]="20"></svg></span>
                <span class="ns-franja__textos">
                  <span class="ns-franja__nombre">{{ f.nombre }}</span>
                  <span class="ns-franja__cuando">{{ f.cuando }}</span>
                </span>
                <span class="ns-franja__indicador" aria-hidden="true">
                  <svg lucideIcon="check" [size]="12" [strokeWidth]="3"></svg>
                </span>
              </label>
            }
          </div>
          <p class="ns-paso__error" [nsErrorCampo]="grupo().controls.tiposComida" [nsErrorCampoPara]="franjas"></p>
        </fieldset>
      </section>

      <section class="ns-bloque" aria-labelledby="ns-bloque-cocina">
        <header class="ns-bloque__cabecera">
          <span class="ns-bloque__icono" aria-hidden="true"><svg lucideIcon="chef-hat" [size]="20"></svg></span>
          <span>
            <h2 class="ns-bloque__titulo" id="ns-bloque-cocina">En la cocina</h2>
            <p class="ns-bloque__texto">Opcional. Lo usaremos para sugerirte recetas que te den tiempo.</p>
          </span>
        </header>
        <ns-form-field label="Tiempo máximo para cocinar" hint="Entre 0 y 600 minutos.">
          <ns-quantity-input formControlName="tiempoMaxCocinaMin" [min]="0" [max]="600" [step]="5" unit="min" />
        </ns-form-field>
      </section>
    </div>
  `,
  styleUrls: ['./pasos.scss', './paso-alimentacion.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasoAlimentacionComponent {
  readonly grupo = input.required<GrupoAlimentacion>();

  protected readonly comidas: NsOpcion<number>[] = [3, 4, 5, 6].map((n) => ({ valor: n, etiqueta: String(n) }));
  protected readonly franjasTarjeta = FRANJAS_ELEGIBLES.map((tipo) => ({
    tipo,
    ...FRANJAS_TARJETA[tipo as Exclude<TipoComida, 'OTRO'>],
  }));

  /** [comidas al día, franjas elegidas] del grupo actual. */
  private readonly estado = toSignal(
    toObservable(this.grupo).pipe(
      switchMap(({ controls }) =>
        combineLatest([
          controls.comidasPorDia.valueChanges.pipe(startWith(controls.comidasPorDia.value)),
          controls.tiposComida.valueChanges.pipe(startWith(controls.tiposComida.value)),
        ]),
      ),
      map(([comidas, tipos]) => ({ requeridas: Number(comidas) || 0, elegidas: tipos ?? [] })),
    ),
    { initialValue: { requeridas: 0, elegidas: [] as TipoComida[] } },
  );
  protected readonly requeridas = computed(() => this.estado().requeridas);
  protected readonly elegidas = computed(() => this.estado().elegidas);
  protected readonly completo = computed(() => this.elegidas().length === this.requeridas());

  /** Con el cupo lleno, las no elegidas no se pueden marcar (sí desmarcar las elegidas). */
  protected bloqueada(tipo: TipoComida): boolean {
    return !this.elegidas().includes(tipo) && this.elegidas().length >= this.requeridas();
  }

  protected alternar(tipo: TipoComida): void {
    const control = this.grupo().controls.tiposComida;
    const actuales = control.value;
    const nuevas = actuales.includes(tipo) ? actuales.filter((t) => t !== tipo) : [...actuales, tipo];
    control.setValue(FRANJAS_ELEGIBLES.filter((t) => nuevas.includes(t)));
    control.markAsDirty();
    control.markAsTouched();
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { firstValueFrom, map } from 'rxjs';

import type { Alergeno, AlimentoResponse, Preparacion, UnidadBase } from '@core/models';
import { ETIQUETAS_ALERGENO, ETIQUETAS_PREPARACION } from '@core/models/etiquetas';
import { AlimentosService } from '@core/services/alimentos.service';
import { CategoriasService } from '@core/services/categorias.service';
import { aApiError } from '@core/util/api-error';
import { aplicarErroresServidor } from '@core/util/formularios';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsCheckboxComponent } from '@shared/ui/form/checkbox.component';
import { NsChipGroupComponent } from '@shared/ui/form/chip-group.component';
import { idUnico } from '@shared/ui/form/control-campo';
import type { NsOpcion } from '@shared/ui/form/control-valor';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { NsInputDirective } from '@shared/ui/form/input.directive';
import { NsQuantityInputComponent } from '@shared/ui/form/quantity-input.component';
import { NsSegmentedComponent } from '@shared/ui/form/segmented.component';
import { NsSelectComponent } from '@shared/ui/form/select.component';
import {
  MAX_PORCIONES,
  aAlimentoRequest,
  avisosAlimento,
  categoriasJerarquicas,
  crearFormularioAlimento,
  crearPorcion,
} from './alimento-form';

/**
 * Crear o editar un alimento propio (NutriSport_API.md §5 AlimentoRequest, POST y PUT /alimentos).
 * No pinta botones: quien lo usa pone el de guardar con `form` = `idFormulario` (p. ej. en el pie
 * de un ns-drawer) y lee `enviando`.
 *
 *   <app-alimento-form #formulario [alimento]="editando" (guardado)="alGuardar($event)" />
 *   <button nsButton type="submit" [attr.form]="formulario.idFormulario" [loading]="formulario.enviando()">Guardar</button>
 */
@Component({
  selector: 'app-alimento-form',
  imports: [
    ReactiveFormsModule,
    LucideDynamicIcon,
    NsAlertComponent,
    NsButtonComponent,
    NsCheckboxComponent,
    NsChipGroupComponent,
    NsFormFieldComponent,
    NsInputDirective,
    NsQuantityInputComponent,
    NsSegmentedComponent,
    NsSelectComponent,
  ],
  templateUrl: './alimento-form.component.html',
  styleUrl: './alimento-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlimentoFormComponent implements OnInit {
  /** Alimento que se edita; sin él, se crea uno nuevo. Se lee al crear el componente. */
  readonly alimento = input<AlimentoResponse | null>(null);
  readonly guardado = output<AlimentoResponse>();

  private readonly alimentos = inject(AlimentosService);

  readonly idFormulario = idUnico('ns-alimento-form');
  readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  private readonly destroyRef = inject(DestroyRef);

  // Se crea en ngOnInit: `alimento` es un input y en el constructor aún no tiene valor.
  protected form = crearFormularioAlimento();

  protected readonly categorias = toSignal(
    inject(CategoriasService)
      .listar('ALIMENTO')
      .pipe(
        map((lista) =>
          categoriasJerarquicas(lista).map((c): NsOpcion<string> => ({ valor: c.id, etiqueta: c.etiqueta })),
        ),
      ),
    { initialValue: [] as NsOpcion<string>[] },
  );

  protected readonly preparaciones: NsOpcion<Preparacion>[] = (Object.keys(ETIQUETAS_PREPARACION) as Preparacion[]).map(
    (valor) => ({ valor, etiqueta: ETIQUETAS_PREPARACION[valor] }),
  );
  protected readonly unidades: NsOpcion<UnidadBase>[] = [
    { valor: 'G', etiqueta: 'Gramos (sólido)' },
    { valor: 'ML', etiqueta: 'Mililitros (líquido)' },
  ];
  protected readonly alergenos: NsOpcion<Alergeno>[] = (Object.keys(ETIQUETAS_ALERGENO) as Alergeno[]).map((valor) => ({
    valor,
    etiqueta: ETIQUETAS_ALERGENO[valor],
  }));
  protected readonly maxPorciones = MAX_PORCIONES;

  private readonly valor = signal(this.form.getRawValue());
  protected readonly unidad = computed(() => (this.valor().unidadBase === 'ML' ? 'ml' : 'g'));
  protected readonly avisos = computed(() => avisosAlimento(this.valor()));

  ngOnInit(): void {
    this.form = crearFormularioAlimento(this.alimento());
    this.valor.set(this.form.getRawValue());
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.valor.set(this.form.getRawValue()));
  }

  protected anadirPorcion(): void {
    const porciones = this.form.controls.porciones;
    if (porciones.length >= MAX_PORCIONES) return;
    porciones.push(crearPorcion());
    porciones.markAsDirty();
  }

  protected quitarPorcion(indice: number): void {
    this.form.controls.porciones.removeAt(indice);
    this.form.controls.porciones.markAsDirty();
  }

  /** true si hay cambios sin guardar. */
  tieneCambios(): boolean {
    return this.form.dirty;
  }

  protected async guardar(): Promise<void> {
    if (this.enviando()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const peticion = aAlimentoRequest(this.form.getRawValue());
    const existente = this.alimento();
    this.enviando.set(true);
    this.error.set(null);
    try {
      const alimento = await firstValueFrom(
        existente ? this.alimentos.editar(existente.id, peticion) : this.alimentos.crear(peticion),
      );
      this.form.markAsPristine();
      this.guardado.emit(alimento);
    } catch (e) {
      const error = aApiError(e);
      if (error.status === 400 && aplicarErroresServidor(this.form, error)) {
        this.error.set('Revisa los campos marcados.');
        return;
      }
      this.error.set(error.detalle);
    } finally {
      this.enviando.set(false);
    }
  }
}

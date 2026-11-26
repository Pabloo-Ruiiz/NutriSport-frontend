import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, distinctUntilChanged, firstValueFrom, of, startWith, switchMap } from 'rxjs';

import type { CategoriaRequest, CategoriaResponse, TipoCategoria } from '@core/models';
import { AdminCatalogoService } from '@core/services/admin/admin-catalogo.service';
import { aApiError } from '@core/util/api-error';
import { aplicarErroresServidor } from '@core/util/formularios';
import { categoriasJerarquicas } from '@features/alimentos/alimento-form';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { idUnico } from '@shared/ui/form/control-campo';
import type { NsOpcion } from '@shared/ui/form/control-valor';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { NsInputDirective } from '@shared/ui/form/input.directive';
import { NsSegmentedComponent } from '@shared/ui/form/segmented.component';
import { NsSelectComponent } from '@shared/ui/form/select.component';
import { conDescendientes } from './categorias';

export const MAX_NOMBRE_CATEGORIA = 80;
export const MAX_SECCION_COMPRA = 40;
export const MAX_ORDEN_CATEGORIA = 999;

/**
 * Crear o editar una categoría (docs/api/admin.md §5 CategoriaRequest): nombre, tipo, padre del
 * mismo tipo, sección de la compra (solo alimentos) y orden 0–999. Como AlimentoFormComponent, no
 * pinta botones: el de guardar va fuera con `form` = `idFormulario` y lee `enviando`.
 *
 *   <app-categoria-form [categoria]="editando" tipo="ALIMENTO" [padreId]="padre" (guardado)="…" />
 *
 * El padre no puede ser la propia categoría ni una de sus descendientes. 409 (nombre repetido en
 * ese tipo, o cambiar el tipo de una categoría con elementos) y el resto de errores → ns-alert.
 */
@Component({
  selector: 'app-categoria-form',
  imports: [ReactiveFormsModule, NsAlertComponent, NsFormFieldComponent, NsInputDirective, NsSegmentedComponent, NsSelectComponent],
  template: `
    <form class="ns-cf" [id]="idFormulario" [formGroup]="form" (ngSubmit)="guardar()" novalidate>
      @if (error(); as mensaje) {
        <ns-alert type="error" titulo="No se ha podido guardar la categoría">{{ mensaje }}</ns-alert>
      }
      <ns-form-field label="Nombre" obligatorio>
        <input nsInput type="text" formControlName="nombre" [maxlength]="maxNombre" autocomplete="off" />
      </ns-form-field>
      <ns-form-field label="Tipo" obligatorio [hint]="categoria() ? 'Solo se puede cambiar si no tiene alimentos, recetas ni subcategorías.' : undefined">
        <ns-segmented formControlName="tipo" [opciones]="tipos" />
      </ns-form-field>
      <ns-form-field label="Categoría padre" hint="Del mismo tipo. Sin padre, es una categoría principal.">
        <ns-select formControlName="padreId" [opciones]="padres()" />
      </ns-form-field>
      @if (esAlimento()) {
        <ns-form-field label="Sección de la compra" hint="Opcional: agrupa la lista de la compra (p. ej. «Fruta y verdura»).">
          <input nsInput type="text" formControlName="seccionCompra" [maxlength]="maxSeccion" autocomplete="off" />
        </ns-form-field>
      }
      <ns-form-field label="Orden" hint="De 0 a 999: las de menor orden van primero." obligatorio>
        <input nsInput type="number" inputmode="numeric" formControlName="orden" min="0" [max]="maxOrden" step="1" />
      </ns-form-field>
    </form>
  `,
  styles: `
    .ns-cf {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-4);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriaFormComponent implements OnInit {
  /** Categoría que se edita; sin ella, se crea una. Se lee al crear el componente. */
  readonly categoria = input<CategoriaResponse | null>(null);
  /** Tipo al crear. */
  readonly tipo = input<TipoCategoria>('ALIMENTO');
  /** Padre al crear (p. ej. "Añadir subcategoría"). */
  readonly padreId = input<string | null>(null);
  readonly guardado = output<CategoriaResponse>();

  private readonly catalogo = inject(AdminCatalogoService);
  private readonly destroyRef = inject(DestroyRef);

  readonly idFormulario = idUnico('ns-categoria-form');
  readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly maxNombre = MAX_NOMBRE_CATEGORIA;
  protected readonly maxSeccion = MAX_SECCION_COMPRA;
  protected readonly maxOrden = MAX_ORDEN_CATEGORIA;
  protected readonly tipos: NsOpcion<TipoCategoria>[] = [
    { valor: 'ALIMENTO', etiqueta: 'Alimentos' },
    { valor: 'RECETA', etiqueta: 'Recetas' },
  ];

  protected readonly form = new FormGroup({
    nombre: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(MAX_NOMBRE_CATEGORIA)],
    }),
    tipo: new FormControl<TipoCategoria>('ALIMENTO', { nonNullable: true, validators: Validators.required }),
    padreId: new FormControl<string | null>(null),
    seccionCompra: new FormControl('', { nonNullable: true, validators: Validators.maxLength(MAX_SECCION_COMPRA) }),
    orden: new FormControl<number | null>(0, [
      Validators.required,
      Validators.min(0),
      Validators.max(MAX_ORDEN_CATEGORIA),
      Validators.pattern(/^\d+$/),
    ]),
  });

  private readonly tipoActual = signal<TipoCategoria>('ALIMENTO');
  protected readonly esAlimento = computed(() => this.tipoActual() === 'ALIMENTO');
  /** Categorías del tipo elegido (para el padre). */
  private readonly delTipo = signal<CategoriaResponse[]>([]);
  protected readonly padres = computed<NsOpcion<string | null>[]>(() => {
    const lista = this.delTipo();
    const propia = this.categoria();
    const excluidas = propia ? conDescendientes(lista, propia.id) : new Set<string>();
    return [
      { valor: null, etiqueta: 'Ninguna (categoría principal)' },
      ...categoriasJerarquicas(lista)
        .filter((c) => !excluidas.has(c.id))
        .map((c) => ({ valor: c.id, etiqueta: c.etiqueta })),
    ];
  });

  ngOnInit(): void {
    const c = this.categoria();
    this.form.reset({
      nombre: c?.nombre ?? '',
      tipo: c?.tipo ?? this.tipo(),
      padreId: c ? c.padreId : this.padreId(),
      seccionCompra: c?.seccionCompra ?? '',
      orden: c?.orden ?? 0,
    });
    this.tipoActual.set(this.form.controls.tipo.value);

    const tipo = this.form.controls.tipo;
    tipo.valueChanges
      .pipe(
        startWith(tipo.value),
        distinctUntilChanged(),
        switchMap((t) => this.catalogo.categorias(t).pipe(catchError(() => of([] as CategoriaResponse[])))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((lista) => this.delTipo.set(lista));

    // Otro tipo: el padre ya no vale.
    tipo.valueChanges.pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe((t) => {
      this.tipoActual.set(t);
      this.form.controls.padreId.setValue(null);
    });
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
    const v = this.form.getRawValue();
    const req: CategoriaRequest = {
      nombre: v.nombre,
      tipo: v.tipo,
      orden: Number(v.orden),
      ...(v.padreId ? { padreId: v.padreId } : {}),
      ...(v.tipo === 'ALIMENTO' && v.seccionCompra.trim() ? { seccionCompra: v.seccionCompra } : {}),
    };
    const existente = this.categoria();
    this.enviando.set(true);
    this.error.set(null);
    try {
      const guardada = await firstValueFrom(
        existente ? this.catalogo.editarCategoria(existente.id, req) : this.catalogo.crearCategoria(req),
      );
      this.form.markAsPristine();
      this.guardado.emit(guardada);
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

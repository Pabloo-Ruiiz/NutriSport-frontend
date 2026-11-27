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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { Observable, catchError, firstValueFrom, forkJoin, map, of } from 'rxjs';

import type { AlimentoResponse, CategoriaResponse, Dificultad, RecetaResponse, TipoComida } from '@core/models';
import { ETIQUETAS_DIFICULTAD, ETIQUETAS_TIPO_COMIDA, ORDEN_TIPOS_COMIDA } from '@core/models/etiquetas';
import { AdminCatalogoService } from '@core/services/admin/admin-catalogo.service';
import { AdminRecetasService } from '@core/services/admin/admin-recetas.service';
import { CategoriasService } from '@core/services/categorias.service';
import { RecetasService } from '@core/services/recetas.service';
import { aApiError } from '@core/util/api-error';
import { aplicarErroresServidor, marcarTodoTocado } from '@core/util/formularios';
import { noSoloEspacios } from '@core/util/validadores';
import { categoriasJerarquicas } from '@features/alimentos/alimento-form';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsSkeletonComponent } from '@shared/ui/feedback/skeleton.component';
import { NsChipGroupComponent } from '@shared/ui/form/chip-group.component';
import {
  NsComboboxComponent,
  NsComboboxOpcionDirective,
  NsResaltadoComponent,
} from '@shared/ui/form/combobox.component';
import { idUnico } from '@shared/ui/form/control-campo';
import type { NsOpcion } from '@shared/ui/form/control-valor';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { NsInputDirective } from '@shared/ui/form/input.directive';
import { NsSegmentedComponent } from '@shared/ui/form/segmented.component';
import { NsSelectComponent } from '@shared/ui/form/select.component';
import {
  type IngredienteForm,
  MAX_DESCRIPCION_RECETA,
  MAX_ETIQUETAS_RECETA,
  MAX_GRAMOS_INGREDIENTE,
  MAX_INGREDIENTES_RECETA,
  MAX_MEDIDA_INGREDIENTE,
  MAX_NOMBRE_RECETA,
  MAX_PASOS_RECETA,
  MAX_RACIONES_RECETA,
  MAX_TIEMPO_RECETA,
  MIN_INGREDIENTES_RECETA,
  MIN_RACIONES_RECETA,
  MIN_TIEMPO_RECETA,
  type ModoCantidad,
  type RecetaForm,
  aRecetaAdminRequest,
  desdeReceta,
  ingredienteVacio,
  mover,
} from './recetas-admin';

/** Alimentos que se ofrecen en el buscador de cada ingrediente. */
const RESULTADOS_ALIMENTOS = 20;

type IngredienteGroup = FormGroup<{
  alimentoId: FormControl<string | null>;
  alimentoNombre: FormControl<string>;
  modo: FormControl<ModoCantidad>;
  gramos: FormControl<number | null>;
  medida: FormControl<string>;
}>;

/** Gramos obligatorios en modo gramos; medida obligatoria en modo medida. */
function cantidadSegunModo(grupo: AbstractControl): ValidationErrors | null {
  const g = grupo as IngredienteGroup;
  const { modo, gramos, medida } = g.controls;
  const errorGramos = modo.value === 'gramos' && gramos.value === null ? { required: true } : null;
  const errorMedida = modo.value === 'medida' && !medida.value.trim() ? { required: true } : null;
  // Se ponen en el control para que su ns-form-field muestre el mensaje.
  sincronizarError(gramos, errorGramos);
  sincronizarError(medida, errorMedida);
  return null;
}

function sincronizarError(control: AbstractControl, error: ValidationErrors | null): void {
  const actuales = { ...(control.errors ?? {}) };
  if (error) {
    if (actuales['required']) return;
    control.setErrors({ ...actuales, ...error });
  } else if (actuales['required']) {
    delete actuales['required'];
    control.setErrors(Object.keys(actuales).length ? actuales : null);
  }
}

/**
 * Crear o editar una receta propia pública (docs/api/admin.md §5 RecetaAdminRequest y §8). Como
 * AlimentoFormComponent, no pinta botones: el de guardar va fuera con `form` = `idFormulario` y
 * lee `enviando`. Pensado para un drawer de 560 px.
 *
 *   <app-receta-admin-form [recetaId]="editando" (guardado)="…" />
 *
 * - Ingredientes (1–40): alimento público activo del catálogo (ns-combobox) y gramos o una medida
 *   de texto. Pasos (hasta 30), reordenables con ↑ ↓. Etiquetas (hasta 10) como chips.
 * - Al editar, carga la receta con GET /recetas/{id}; la categoría llega por nombre y se busca
 *   entre las categorías de receta.
 * - 400 → errores en sus campos (también "ingredientes[2].gramos"); el resto → ns-alert.
 */
@Component({
  selector: 'app-receta-admin-form',
  imports: [
    LucideDynamicIcon,
    NsAlertComponent,
    NsButtonComponent,
    NsChipGroupComponent,
    NsComboboxComponent,
    NsComboboxOpcionDirective,
    NsFormFieldComponent,
    NsInputDirective,
    NsResaltadoComponent,
    NsSegmentedComponent,
    NsSelectComponent,
    NsSkeletonComponent,
    ReactiveFormsModule,
  ],
  templateUrl: './receta-admin-form.component.html',
  styleUrl: './receta-admin-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecetaAdminFormComponent implements OnInit {
  /** Id de la receta que se edita; sin él, se crea una. Se lee al crear el componente. */
  readonly recetaId = input<string | null>(null);
  readonly guardado = output<RecetaResponse>();

  private readonly adminRecetas = inject(AdminRecetasService);
  private readonly catalogo = inject(AdminCatalogoService);
  private readonly categoriasService = inject(CategoriasService);
  private readonly recetasService = inject(RecetasService);
  private readonly destroyRef = inject(DestroyRef);

  readonly idFormulario = idUnico('ns-receta-admin-form');
  readonly enviando = signal(false);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly errorCarga = signal<string | null>(null);

  protected readonly maxNombre = MAX_NOMBRE_RECETA;
  protected readonly maxDescripcion = MAX_DESCRIPCION_RECETA;
  protected readonly minRaciones = MIN_RACIONES_RECETA;
  protected readonly maxRaciones = MAX_RACIONES_RECETA;
  protected readonly minTiempo = MIN_TIEMPO_RECETA;
  protected readonly maxTiempo = MAX_TIEMPO_RECETA;
  protected readonly maxEtiquetas = MAX_ETIQUETAS_RECETA;
  protected readonly maxPasos = MAX_PASOS_RECETA;
  protected readonly maxIngredientes = MAX_INGREDIENTES_RECETA;
  protected readonly maxGramos = MAX_GRAMOS_INGREDIENTE;
  protected readonly maxMedida = MAX_MEDIDA_INGREDIENTE;

  protected readonly categorias = signal<NsOpcion<string | null>[]>([]);
  protected readonly dificultades: NsOpcion<Dificultad | null>[] = [
    { valor: null, etiqueta: 'Sin indicar' },
    ...(Object.keys(ETIQUETAS_DIFICULTAD) as Dificultad[]).map((d) => ({
      valor: d,
      etiqueta: ETIQUETAS_DIFICULTAD[d],
    })),
  ];
  protected readonly franjas: NsOpcion<TipoComida>[] = ORDEN_TIPOS_COMIDA.map((t) => ({
    valor: t,
    etiqueta: ETIQUETAS_TIPO_COMIDA[t],
  }));
  protected readonly modos: NsOpcion<ModoCantidad>[] = [
    { valor: 'gramos', etiqueta: 'Gramos' },
    { valor: 'medida', etiqueta: 'Medida' },
  ];

  protected readonly form = new FormGroup({
    nombre: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, noSoloEspacios(), Validators.maxLength(MAX_NOMBRE_RECETA)],
    }),
    descripcion: new FormControl('', { nonNullable: true, validators: Validators.maxLength(MAX_DESCRIPCION_RECETA) }),
    categoriaId: new FormControl<string | null>(null, Validators.required),
    raciones: new FormControl<number | null>(2, [
      Validators.required,
      Validators.min(MIN_RACIONES_RECETA),
      Validators.max(MAX_RACIONES_RECETA),
      Validators.pattern(/^\d+$/),
    ]),
    tiempoPreparacionMin: new FormControl<number | null>(null, [
      Validators.min(MIN_TIEMPO_RECETA),
      Validators.max(MAX_TIEMPO_RECETA),
      Validators.pattern(/^\d+$/),
    ]),
    dificultad: new FormControl<Dificultad | null>(null),
    franjasAptas: new FormControl<TipoComida[]>([], { nonNullable: true }),
    etiquetas: new FormControl<string[]>([], { nonNullable: true }),
    pasos: new FormArray<FormControl<string>>([]),
    ingredientes: new FormArray<IngredienteGroup>([], [Validators.minLength(MIN_INGREDIENTES_RECETA)]),
  });

  /** Texto de la etiqueta que se está escribiendo. */
  protected readonly etiquetaNueva = new FormControl('', { nonNullable: true });
  private readonly etiquetasActuales = signal<string[]>([]);
  protected readonly etiquetasLlenas = computed(() => this.etiquetasActuales().length >= MAX_ETIQUETAS_RECETA);

  protected get pasos(): FormArray<FormControl<string>> {
    return this.form.controls.pasos;
  }

  protected get ingredientes(): FormArray<IngredienteGroup> {
    return this.form.controls.ingredientes;
  }

  /** Buscador de alimentos públicos activos del catálogo. */
  protected readonly buscarAlimentos = (q: string): Observable<AlimentoResponse[]> =>
    this.catalogo
      .alimentos({ q, visibilidad: 'PUBLICO', activo: true, page: 0, size: RESULTADOS_ALIMENTOS })
      .pipe(map((p) => p.content));
  protected readonly nombreAlimento = (a: AlimentoResponse): string =>
    a.marca ? `${a.nombre} · ${a.marca}` : a.nombre;

  ngOnInit(): void {
    this.form.controls.etiquetas.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((e) => this.etiquetasActuales.set(e));

    const categorias$ = this.categoriasService.listar('RECETA').pipe(catchError(() => of([] as CategoriaResponse[])));
    const id = this.recetaId();

    if (!id) {
      this.anadirIngrediente();
      categorias$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((c) => this.ponerCategorias(c));
      return;
    }

    this.cargando.set(true);
    forkJoin([categorias$, this.recetasService.detalle(id)])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ([categorias, receta]) => {
          this.ponerCategorias(categorias);
          this.rellenar(desdeReceta(receta, categorias));
          this.cargando.set(false);
        },
        error: (e: unknown) => {
          this.errorCarga.set(aApiError(e).detalle);
          this.cargando.set(false);
        },
      });
  }

  /** true si hay cambios sin guardar. */
  tieneCambios(): boolean {
    return this.form.dirty;
  }

  // ---- Etiquetas

  protected anadirEtiqueta(evento?: Event): void {
    evento?.preventDefault();
    const texto = this.etiquetaNueva.value.trim();
    const actuales = this.form.controls.etiquetas.value;
    if (!texto || actuales.length >= MAX_ETIQUETAS_RECETA) return;
    if (!actuales.some((e) => e.toLocaleLowerCase('es') === texto.toLocaleLowerCase('es'))) {
      this.form.controls.etiquetas.setValue([...actuales, texto]);
      this.form.markAsDirty();
    }
    this.etiquetaNueva.setValue('');
  }

  protected quitarEtiqueta(indice: number): void {
    const actuales = this.form.controls.etiquetas.value;
    this.form.controls.etiquetas.setValue(actuales.filter((_, i) => i !== indice));
    this.form.markAsDirty();
  }

  // ---- Pasos

  protected anadirPaso(texto = ''): void {
    if (this.pasos.length >= MAX_PASOS_RECETA) return;
    this.pasos.push(new FormControl(texto, { nonNullable: true, validators: [Validators.required, noSoloEspacios()] }));
  }

  protected quitarPaso(indice: number): void {
    this.pasos.removeAt(indice);
    this.form.markAsDirty();
  }

  protected moverPaso(indice: number, delta: -1 | 1): void {
    const destino = indice + delta;
    if (destino < 0 || destino >= this.pasos.length) return;
    this.pasos.setValue(mover(this.pasos.getRawValue(), indice, destino));
    this.form.markAsDirty();
  }

  // ---- Ingredientes

  protected anadirIngrediente(valor: IngredienteForm = ingredienteVacio()): void {
    if (this.ingredientes.length >= MAX_INGREDIENTES_RECETA) return;
    this.ingredientes.push(
      new FormGroup(
        {
          alimentoId: new FormControl<string | null>(valor.alimentoId, Validators.required),
          alimentoNombre: new FormControl(valor.alimentoNombre, { nonNullable: true }),
          modo: new FormControl<ModoCantidad>(valor.modo, { nonNullable: true }),
          gramos: new FormControl<number | null>(valor.gramos, [
            Validators.min(0.1),
            Validators.max(MAX_GRAMOS_INGREDIENTE),
          ]),
          medida: new FormControl(valor.medida, {
            nonNullable: true,
            validators: Validators.maxLength(MAX_MEDIDA_INGREDIENTE),
          }),
        },
        { validators: cantidadSegunModo },
      ),
    );
  }

  protected quitarIngrediente(indice: number): void {
    if (this.ingredientes.length <= MIN_INGREDIENTES_RECETA) return;
    this.ingredientes.removeAt(indice);
    this.form.markAsDirty();
  }

  protected elegirAlimento(fila: IngredienteGroup, alimento: AlimentoResponse): void {
    fila.patchValue({ alimentoId: alimento.id, alimentoNombre: this.nombreAlimento(alimento) });
    fila.markAsDirty();
  }

  protected cambiarAlimento(fila: IngredienteGroup): void {
    fila.patchValue({ alimentoId: null, alimentoNombre: '' });
    fila.markAsDirty();
  }

  protected sinAlimento(fila: IngredienteGroup): boolean {
    const c = fila.controls.alimentoId;
    return c.invalid && (c.touched || fila.touched);
  }

  // ---- Guardar

  protected async guardar(): Promise<void> {
    if (this.enviando() || this.cargando()) return;
    if (this.form.invalid) {
      marcarTodoTocado(this.form);
      this.error.set(
        this.ingredientes.length < MIN_INGREDIENTES_RECETA
          ? 'Añade al menos un ingrediente.'
          : 'Revisa los campos marcados.',
      );
      return;
    }
    const req = aRecetaAdminRequest(this.form.getRawValue() as RecetaForm);
    const id = this.recetaId();
    this.enviando.set(true);
    this.error.set(null);
    try {
      const receta = await firstValueFrom(id ? this.adminRecetas.editar(id, req) : this.adminRecetas.crear(req));
      this.form.markAsPristine();
      this.guardado.emit(receta);
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

  private ponerCategorias(categorias: readonly CategoriaResponse[]): void {
    this.categorias.set(categoriasJerarquicas(categorias).map((c) => ({ valor: c.id, etiqueta: c.etiqueta })));
  }

  private rellenar(v: RecetaForm): void {
    this.pasos.clear();
    this.ingredientes.clear();
    v.pasos.forEach((p) => this.anadirPaso(p));
    v.ingredientes.forEach((i) => this.anadirIngrediente(i));
    if (this.ingredientes.length === 0) this.anadirIngrediente();
    this.form.patchValue({
      nombre: v.nombre,
      descripcion: v.descripcion,
      categoriaId: v.categoriaId,
      raciones: v.raciones,
      tiempoPreparacionMin: v.tiempoPreparacionMin,
      dificultad: v.dificultad,
      franjasAptas: v.franjasAptas,
      etiquetas: v.etiquetas,
    });
    this.form.markAsPristine();
  }
}

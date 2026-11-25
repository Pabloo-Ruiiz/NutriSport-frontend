import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  NS_CARD,
  NsAlertComponent,
  NsAlertType,
  NsBadgeComponent,
  NsBadgeVariant,
  NsButtonComponent,
  NsButtonSize,
  NsButtonVariant,
  NsCheckboxComponent,
  NsChipGroupComponent,
  NsEmptyStateComponent,
  NsFormFieldComponent,
  NsInputDirective,
  NsOpcion,
  NsSegmentedComponent,
  NsSelectComponent,
  NsSkeletonComponent,
  NsSpinnerComponent,
  NsSwitchComponent,
} from '@shared/ui';

interface Aviso {
  type: NsAlertType;
  titulo: string;
  texto: string;
}

/**
 * Catálogo de componentes de shared/ui (solo en desarrollo: ruta /dev/componentes).
 * Una sección por componente con sus variantes, tamaños y estados.
 */
@Component({
  selector: 'app-componentes',
  imports: [
    JsonPipe,
    ReactiveFormsModule,
    RouterLink,
    NsButtonComponent,
    ...NS_CARD,
    NsBadgeComponent,
    NsAlertComponent,
    NsSpinnerComponent,
    NsSkeletonComponent,
    NsEmptyStateComponent,
    NsFormFieldComponent,
    NsInputDirective,
    NsSelectComponent,
    NsCheckboxComponent,
    NsSwitchComponent,
    NsSegmentedComponent,
    NsChipGroupComponent,
  ],
  templateUrl: './componentes.component.html',
  styleUrl: './componentes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComponentesComponent {
  private readonly destroyRef = inject(DestroyRef);

  protected readonly secciones = [
    { id: 'botones', titulo: 'Botones' },
    { id: 'formularios', titulo: 'Formularios' },
    { id: 'tarjetas', titulo: 'Tarjetas' },
    { id: 'badges', titulo: 'Badges' },
    { id: 'avisos', titulo: 'Avisos' },
    { id: 'carga', titulo: 'Spinner y skeleton' },
    { id: 'vacios', titulo: 'Estados vacíos' },
  ];

  /* Botones */
  protected readonly variantesBoton: NsButtonVariant[] = ['primary', 'ai', 'secondary', 'ghost', 'danger'];
  protected readonly tamanosBoton: NsButtonSize[] = ['sm', 'md', 'lg'];
  protected readonly guardando = signal(false);

  private temporizador?: ReturnType<typeof setTimeout>;

  protected simularGuardado(): void {
    this.guardando.set(true);
    clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => this.guardando.set(false), 2000);
  }

  /* Formularios */
  protected readonly objetivos: NsOpcion<string>[] = [
    { valor: 'perder', etiqueta: 'Perder grasa' },
    { valor: 'mantener', etiqueta: 'Mantener el peso' },
    { valor: 'ganar', etiqueta: 'Ganar músculo' },
    { valor: 'rendimiento', etiqueta: 'Mejorar el rendimiento', deshabilitada: true },
  ];
  protected readonly periodos: NsOpcion<string>[] = [
    { valor: 'dia', etiqueta: 'Día' },
    { valor: 'semana', etiqueta: 'Semana' },
    { valor: 'mes', etiqueta: 'Mes' },
  ];
  protected readonly deportes: NsOpcion<string>[] = [
    { valor: 'correr', etiqueta: 'Correr', icono: 'activity' },
    { valor: 'gimnasio', etiqueta: 'Gimnasio', icono: 'dumbbell' },
    { valor: 'ciclismo', etiqueta: 'Ciclismo' },
    { valor: 'natacion', etiqueta: 'Natación' },
    { valor: 'yoga', etiqueta: 'Yoga', deshabilitada: true },
  ];
  protected readonly comidas: NsOpcion<string>[] = [
    { valor: 'desayuno', etiqueta: 'Desayuno', icono: 'coffee' },
    { valor: 'comida', etiqueta: 'Comida', icono: 'utensils' },
    { valor: 'cena', etiqueta: 'Cena', icono: 'moon' },
  ];

  protected readonly form = new FormGroup({
    nombre: new FormControl(''),
    peso: new FormControl<number | null>(72.5, [Validators.required, Validators.min(30), Validators.max(250)]),
    email: new FormControl('', [Validators.required, Validators.email]),
    emailServidor: new FormControl('ana@correo.com', Validators.email),
    bloqueado: new FormControl({ value: 'No se puede editar', disabled: true }),
    notas: new FormControl('', Validators.maxLength(200)),
    objetivo: new FormControl<string | null>(null),
    objetivoError: new FormControl<string | null>(null, Validators.required),
    objetivoBloqueado: new FormControl<string | null>({ value: 'mantener', disabled: true }),
    terminos: new FormControl(false),
    terminosBloqueado: new FormControl({ value: true, disabled: true }),
    avisos: new FormControl(true),
    avisosBloqueado: new FormControl({ value: false, disabled: true }),
    periodo: new FormControl<string | null>('semana'),
    periodoBloqueado: new FormControl<string | null>({ value: 'dia', disabled: true }),
    deportes: new FormControl<string[]>(['gimnasio']),
    comida: new FormControl<string | null>('comida'),
    comidaBloqueada: new FormControl<string | null>({ value: 'cena', disabled: true }),
  });

  constructor() {
    this.destroyRef.onDestroy(() => clearTimeout(this.temporizador));
    // Estados de error visibles desde el principio.
    this.form.controls.email.markAsTouched();
    this.form.controls.objetivoError.markAsTouched();
    this.simularErrorServidor();
  }

  protected simularErrorServidor(): void {
    this.form.controls.emailServidor.setErrors({ servidor: 'Ya existe una cuenta con este correo.' });
  }

  protected validarTodo(): void {
    this.form.markAllAsTouched();
  }

  /* Badges */
  protected readonly variantesBadge: { variant: NsBadgeVariant; texto: string; icono?: string }[] = [
    { variant: 'neutral', texto: 'Neutro' },
    { variant: 'success', texto: 'Completado', icono: 'circle-check' },
    { variant: 'warning', texto: 'Pendiente' },
    { variant: 'error', texto: 'Fallido' },
    { variant: 'info', texto: 'Novedad', icono: 'info' },
    { variant: 'ai', texto: 'Estimación IA', icono: 'sparkles' },
    { variant: 'activity', texto: 'Pre-entreno', icono: 'dumbbell' },
    { variant: 'kcal', texto: '718 kcal' },
    { variant: 'protein', texto: 'Proteínas 42 g' },
    { variant: 'carbs', texto: 'Hidratos 85 g' },
    { variant: 'fat', texto: 'Grasas 21 g' },
  ];

  /* Avisos */
  protected readonly avisos: Aviso[] = [
    { type: 'info', titulo: 'Completa tu perfil', texto: 'Con tu peso y tu actividad calculamos mejor tus objetivos.' },
    {
      type: 'success',
      titulo: 'Menú semanal generado',
      texto: 'Puedes cambiar cualquier receta desde el planificador.',
    },
    { type: 'warning', titulo: 'Te faltan datos de ayer', texto: 'No registraste la cena. ¿Quieres añadirla ahora?' },
    {
      type: 'error',
      titulo: 'No hemos podido analizar la foto',
      texto: 'Puedes reintentarlo o registrar la comida manualmente.',
    },
    { type: 'ai', titulo: 'Asistente no disponible', texto: 'El asistente IA volverá a funcionar en unos minutos.' },
  ];
  protected readonly cerrados = signal<ReadonlySet<NsAlertType>>(new Set());

  protected cerrarAviso(tipo: NsAlertType): void {
    this.cerrados.update((actuales) => new Set([...actuales, tipo]));
  }

  protected restaurarAvisos(): void {
    this.cerrados.set(new Set());
  }
}

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
  NS_TABS,
  NsCheckboxComponent,
  NsChipGroupComponent,
  NsConfirmService,
  NsDateStripComponent,
  NsDialogService,
  NsDialogSize,
  NsDisclaimerComponent,
  NsDisclaimerContext,
  NsDrawerComponent,
  NsEmptyStateComponent,
  NsFormFieldComponent,
  NsInputDirective,
  NsMetricComponent,
  NsOpcion,
  NsPaginatorComponent,
  NsProgressBarComponent,
  NsQuantityInputComponent,
  NsRingComponent,
  NsSegmentedComponent,
  NsSelectComponent,
  NsSkeletonComponent,
  NsSpinnerComponent,
  NsStepperComponent,
  NsSwitchComponent,
  NsToastService,
} from '@shared/ui';
import { hoyLocal, sumarDias } from '@core/util/fechas';
import { DatosDialogoEjemplo, DialogoEjemploComponent } from './dialogo-ejemplo.component';

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
    NsDisclaimerComponent,
    NsDrawerComponent,
    NsQuantityInputComponent,
    NsRingComponent,
    NsProgressBarComponent,
    NsMetricComponent,
    ...NS_TABS,
    NsStepperComponent,
    NsDateStripComponent,
    NsPaginatorComponent,
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
    { id: 'dialogos', titulo: 'Diálogos y drawer' },
    { id: 'toasts', titulo: 'Toasts' },
    { id: 'disclaimer', titulo: 'Aviso orientativo' },
    { id: 'datos', titulo: 'Datos y progreso' },
    { id: 'navegacion', titulo: 'Navegación' },
  ];

  /* Datos y progreso */
  protected readonly consumidas = signal(560);

  /* Navegación */
  protected readonly pestanas: NsOpcion<string>[] = [
    { valor: 'ingredientes', etiqueta: 'Ingredientes', icono: 'shopping-basket' },
    { valor: 'pasos', etiqueta: 'Preparación', icono: 'utensils' },
    { valor: 'nutricion', etiqueta: 'Nutrición', icono: 'chart-column' },
    { valor: 'opiniones', etiqueta: 'Opiniones', deshabilitada: true },
  ];
  protected readonly pestana = signal<string | null>('ingredientes');
  protected readonly pasosPerfil = ['Datos personales', 'Objetivo', 'Actividad', 'Preferencias'];
  protected readonly pasoActual = signal(1);
  protected readonly hoy = hoyLocal();
  protected readonly fecha = signal(this.hoy);
  protected readonly diasConDatos = [-6, -5, -3, -2, -1, 0].map((dias) => sumarDias(this.hoy, dias));
  protected readonly pagina = signal(1);

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
    gramos: new FormControl<number | null>(150, Validators.required),
    raciones: new FormControl<number | null>(1),
    racionesBloqueadas: new FormControl<number | null>({ value: 2, disabled: true }),
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

  /* Diálogos, confirmación y drawer */
  private readonly dialogos = inject(NsDialogService);
  private readonly confirmacion = inject(NsConfirmService);
  protected readonly toasts = inject(NsToastService);

  protected readonly tamanosDialogo: NsDialogSize[] = ['sm', 'md', 'lg'];
  protected readonly resultado = signal('Aún no has abierto ningún diálogo.');
  protected readonly drawerAbierto = signal(false);

  protected abrirDialogo(tamano: NsDialogSize, parrafos = 2): void {
    const ref = this.dialogos.open<DialogoEjemploComponent, string, DatosDialogoEjemplo>(DialogoEjemploComponent, {
      titulo: 'Añadir comida',
      size: tamano,
      data: { tamano, parrafos },
    });
    ref.closed.subscribe((nombre) =>
      this.resultado.set(nombre ? `Diálogo cerrado con: "${nombre}"` : 'Diálogo cancelado.'),
    );
  }

  protected async confirmarSimple(): Promise<void> {
    const ok = await this.confirmacion.confirmar({
      titulo: '¿Duplicar el menú de esta semana?',
      mensaje: 'Se copiarán las comidas planificadas a la semana que viene.',
      textoConfirmar: 'Duplicar menú',
    });
    this.resultado.set(`Confirmación simple: ${ok}`);
  }

  protected async confirmarPeligro(): Promise<void> {
    const ok = await this.confirmacion.confirmar({
      titulo: '¿Eliminar la comida?',
      mensaje: 'Se borrará «Cena · 718 kcal» de tu historial. Esta acción no se puede deshacer.',
      textoConfirmar: 'Eliminar comida',
      peligro: true,
    });
    this.resultado.set(`Confirmación destructiva: ${ok}`);
  }

  protected async confirmarPassword(): Promise<void> {
    const password = await this.confirmacion.confirmar({
      titulo: 'Eliminar tu cuenta',
      mensaje: 'Se borrarán tu perfil, tus comidas, tus planes y tu historial. No podrás recuperarlos.',
      textoConfirmar: 'Eliminar cuenta',
      peligro: true,
      pedirPassword: true,
    });
    this.resultado.set(
      password === false ? 'Eliminación cancelada.' : `Contraseña recibida (${password.length} caracteres).`,
    );
  }

  /* Toasts */
  protected toastExito(): void {
    this.toasts.exito('Cena guardada', '718 kcal añadidas a hoy.', {
      texto: 'Deshacer',
      ejecutar: () => this.toasts.info('Cena eliminada', 'Hemos deshecho el registro.'),
    });
  }

  protected toastError(): void {
    this.toasts.error('No hemos podido guardar', 'Revisa tu conexión e inténtalo de nuevo.');
  }

  protected toastInfo(): void {
    this.toasts.info('Menú actualizado', 'Hemos cambiado la cena del jueves.');
  }

  protected toastAviso(): void {
    this.toasts.mostrar({ tipo: 'warning', titulo: 'Te quedan 2 análisis hoy', duracion: 8000 });
  }

  protected variosToasts(): void {
    for (let i = 1; i <= 5; i++) this.toasts.info(`Notificación ${i} de 5`, 'Solo se ven 3 a la vez; el resto espera.');
  }

  /* Aviso orientativo */
  protected readonly contextosDisclaimer: NsDisclaimerContext[] = ['analisis', 'menu', 'asistente', 'receta'];
}

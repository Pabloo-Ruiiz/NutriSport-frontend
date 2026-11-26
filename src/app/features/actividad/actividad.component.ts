import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { Subscription } from 'rxjs';

import type { EntrenamientoResponse, EstadoEntrenamiento } from '@core/models';
import { EntrenamientosService } from '@core/services/entrenamientos.service';
import { type ApiError, aApiError } from '@core/util/api-error';
import { hoyLocal, lunesDeLaSemana, sumarDias } from '@core/util/fechas';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NS_CARD } from '@shared/ui/card/card.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsEmptyStateComponent } from '@shared/ui/feedback/empty-state.component';
import { NsSkeletonComponent } from '@shared/ui/feedback/skeleton.component';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import type { NsOpcion } from '@shared/ui/form/control-valor';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { NsSelectComponent } from '@shared/ui/form/select.component';
import { NsConfirmService } from '@shared/ui/overlay/confirm.service';
import { NsDialogService } from '@shared/ui/overlay/dialog.service';
import { calcularKpis, cargaPorDia, domingoDe, etiquetaSemana, fechaLocalDeIso, formatearFechaHora } from './actividad';
import { CargaSemanaComponent } from './componentes/carga-semana.component';
import { EntrenamientoItemComponent } from './componentes/entrenamiento-item.component';
import { KpisSemanaComponent } from './componentes/kpis-semana.component';
import { abrirEntrenamientoForm } from './entrenamiento-form.component';

type Estado = 'cargando' | 'error' | 'listo';

/** Texto del toast cuando un cambio afecta al día de hoy (el backend recalcula su objetivo). */
export const AVISO_OBJETIVO_HOY = 'Tu objetivo de hoy se ha actualizado';

/**
 * Actividad deportiva (/actividad, DESIGN.md §7.13): semana de lunes a domingo con KPIs, carga por
 * día, entrenamientos próximos y realizados, filtro por tipo (en el cliente) y alta, edición,
 * cambio de estado y borrado. Cada cambio recalcula el objetivo del día en el backend: si afecta a
 * hoy, se avisa con un toast.
 */
@Component({
  selector: 'app-actividad',
  imports: [
    CargaSemanaComponent,
    EntrenamientoItemComponent,
    FormsModule,
    KpisSemanaComponent,
    LucideDynamicIcon,
    NS_CARD,
    NsAlertComponent,
    NsButtonComponent,
    NsEmptyStateComponent,
    NsFormFieldComponent,
    NsSelectComponent,
    NsSkeletonComponent,
  ],
  templateUrl: './actividad.component.html',
  styleUrl: './actividad.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActividadComponent {
  private readonly entrenamientos = inject(EntrenamientosService);
  private readonly dialogos = inject(NsDialogService);
  private readonly confirmacion = inject(NsConfirmService);
  private readonly toasts = inject(NsToastService);
  private readonly router = inject(Router);

  private readonly lunesActual = lunesDeLaSemana(hoyLocal());
  /** Lunes de la semana que se ve. */
  protected readonly lunes = signal(this.lunesActual);
  protected readonly esSemanaActual = computed(() => this.lunes() === this.lunesActual);
  protected readonly etiqueta = computed(() => etiquetaSemana(this.lunes()));

  protected readonly estado = signal<Estado>('cargando');
  protected readonly error = signal<string | null>(null);
  private readonly lista = signal<EntrenamientoResponse[]>([]);
  private peticion?: Subscription;

  /** Filtro por tipo de actividad (código), en el cliente; null = todas. */
  protected readonly tipo = signal<string | null>(null);
  protected readonly opcionesTipo = computed<NsOpcion<string | null>[]>(() => {
    const tipos = new Map(this.lista().map((e) => [e.tipoActividadCodigo, e.tipoActividadNombre]));
    // El elegido sigue en la lista aunque ya no tenga entrenamientos esta semana.
    const elegido = this.tipo();
    if (elegido && !tipos.has(elegido)) tipos.set(elegido, this.nombresTipo.get(elegido) ?? elegido);
    return [
      { valor: null, etiqueta: 'Todas las actividades' },
      ...[...tipos].sort((a, b) => a[1].localeCompare(b[1], 'es')).map(([valor, etiqueta]) => ({ valor, etiqueta })),
    ];
  });
  private readonly nombresTipo = new Map<string, string>();

  protected readonly filtrados = computed(() => {
    const tipo = this.tipo();
    return tipo ? this.lista().filter((e) => e.tipoActividadCodigo === tipo) : this.lista();
  });
  protected readonly kpis = computed(() => calcularKpis(this.filtrados()));
  protected readonly carga = computed(() => cargaPorDia(this.filtrados(), this.lunes()));
  /** Planificados, del más próximo al más lejano. */
  protected readonly proximos = computed(() => this.filtrados().filter((e) => e.estado === 'PLANIFICADO'));
  /** Realizados, el más reciente primero. */
  protected readonly realizados = computed(() =>
    this.filtrados()
      .filter((e) => e.estado === 'REALIZADO')
      .reverse(),
  );
  protected readonly omitidos = computed(() => this.filtrados().filter((e) => e.estado === 'OMITIDO'));

  constructor() {
    this.cargar();
  }

  protected cambiarSemana(semanas: number): void {
    this.lunes.update((l) => sumarDias(l, semanas * 7));
    this.cargar();
  }

  protected irASemanaActual(): void {
    this.lunes.set(this.lunesActual);
    this.cargar();
  }

  /** Pide la semana. Con `silencioso`, sin skeleton (tras un cambio). */
  protected cargar(silencioso = false): void {
    this.peticion?.unsubscribe();
    if (!silencioso) this.estado.set('cargando');
    this.error.set(null);
    this.peticion = this.entrenamientos.listar(this.lunes(), domingoDe(this.lunes())).subscribe({
      next: (lista) => {
        for (const e of lista) this.nombresTipo.set(e.tipoActividadCodigo, e.tipoActividadNombre);
        this.lista.set(lista);
        this.estado.set('listo');
      },
      error: (e: unknown) => {
        this.error.set(aApiError(e).detalle);
        this.estado.set('error');
      },
    });
  }

  protected registrar(): void {
    // En otra semana, el formulario propone su lunes; en la actual, ahora.
    const fecha = this.esSemanaActual() ? null : this.lunes();
    abrirEntrenamientoForm(this.dialogos, { fecha }).closed.subscribe((nuevo) => {
      if (!nuevo) return;
      this.trasCambio([nuevo.fechaHora], 'Entrenamiento guardado');
    });
  }

  protected editar(e: EntrenamientoResponse): void {
    abrirEntrenamientoForm(this.dialogos, { entrenamiento: e }).closed.subscribe((editado) => {
      if (!editado) return;
      this.trasCambio([e.fechaHora, editado.fechaHora], 'Entrenamiento actualizado');
    });
  }

  protected marcar(e: EntrenamientoResponse, estado: EstadoEntrenamiento): void {
    this.entrenamientos.marcarEstado(e, estado).subscribe({
      next: () =>
        this.trasCambio([e.fechaHora], estado === 'REALIZADO' ? 'Entrenamiento realizado' : 'Entrenamiento omitido'),
      error: (err: unknown) => this.mostrarError(aApiError(err), 'No hemos podido cambiar el estado'),
    });
  }

  protected async eliminar(e: EntrenamientoResponse): Promise<void> {
    const confirmado = await this.confirmacion.confirmar({
      titulo: '¿Eliminar el entrenamiento?',
      mensaje: `Se eliminará «${e.tipoActividadNombre}» del ${formatearFechaHora(e.fechaHora)} y se recalculará el objetivo de ese día.`,
      textoConfirmar: 'Eliminar',
      peligro: true,
    });
    if (!confirmado) return;
    this.entrenamientos.eliminar(e.id).subscribe({
      next: () => this.trasCambio([e.fechaHora], 'Entrenamiento eliminado'),
      error: (err: unknown) => this.mostrarError(aApiError(err), 'No hemos podido eliminar el entrenamiento'),
    });
  }

  /** Recarga la semana y avisa; si alguna de las fechas es hoy, del objetivo recalculado. */
  private trasCambio(fechasIso: string[], titulo: string): void {
    this.cargar(true);
    const hoy = hoyLocal();
    const afectaHoy = fechasIso.some((f) => fechaLocalDeIso(f) === hoy);
    this.toasts.exito(titulo, afectaHoy ? AVISO_OBJETIVO_HOY : undefined);
  }

  private mostrarError(error: ApiError, titulo: string): void {
    if (error.codigo === 'PERFIL_REQUERIDO') {
      void this.router.navigate(['/bienvenida']);
      return;
    }
    this.toasts.error(titulo, error.detalle);
  }
}

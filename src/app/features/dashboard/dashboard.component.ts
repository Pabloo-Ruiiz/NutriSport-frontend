import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subscription, catchError, finalize, forkJoin, of, shareReplay, tap } from 'rxjs';

import { LayoutService } from '@core/layout/layout.service';
import { AuthService } from '@core/services/auth.service';
import type {
  ComidaPendienteResponse,
  EntrenamientoResponse,
  RegistroComidaResponse,
  ResumenDiarioResponse,
} from '@core/models';
import { ComidasService } from '@core/services/comidas.service';
import { EntrenamientosService } from '@core/services/entrenamientos.service';
import { MenusService } from '@core/services/menus.service';
import { SeguimientoService } from '@core/services/seguimiento.service';
import { type ApiError, aApiError } from '@core/util/api-error';
import { hoyLocal, lunesDeLaSemana, rangoDias, sumarDias } from '@core/util/fechas';
import { formatearFecha } from '@shared/pipes/formato';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsSkeletonComponent } from '@shared/ui/feedback/skeleton.component';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import { NsDateStripComponent } from '@shared/ui/nav/date-strip.component';
import { NsConfirmService } from '@shared/ui/overlay/confirm.service';
import { NsDialogService } from '@shared/ui/overlay/dialog.service';
import { abrirEntrenamientoForm } from '../actividad/entrenamiento-form.component';
import {
  DetalleComidaComponent,
  type DetalleComidaData,
  type ResultadoDetalleComida,
} from '../comidas/componentes/detalle-comida.component';
import {
  DuplicarComidaDialogComponent,
  type DuplicarComidaData,
} from '../comidas/componentes/duplicar-comida-dialog.component';
import { ComidasHoyComponent } from './componentes/comidas-hoy.component';
import { EntrenamientoHoyComponent } from './componentes/entrenamiento-hoy.component';
import { GraficoSemanaComponent } from './componentes/grafico-semana.component';
import { TarjetaEnergiaComponent } from './componentes/tarjeta-energia.component';
import { TarjetaMacroComponent } from './componentes/tarjeta-macro.component';
import { TarjetaPesoComponent } from './componentes/tarjeta-peso.component';
import { type DiaSemanaKcal, type Macro, diaDesdeResumen, primerNombre, saludo } from './dashboard';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

type Estado = 'cargando' | 'error' | 'listo';

/**
 * Dashboard (/inicio, DESIGN.md §7.4): "¿cómo voy hoy y qué hago ahora?". El día se elige en la
 * tira de fechas (hasta mañana) y queda en la URL (?fecha=), así el registro de comidas vuelve al
 * mismo día; al volver, el componente se crea de nuevo y recarga el resumen.
 *
 * Datos: GET /seguimiento/resumen del día (energía, macros, comidas y entrenamientos) y, para el
 * gráfico semanal, el resumen de cada día de la semana (ver GraficoSemanaComponent): da el
 * objetivo REAL de cada día (cambia con los entrenamientos), lo consumido y si hubo entreno. Se
 * guardan en caché por fecha: cambiar de día dentro de la misma semana no repite peticiones.
 * El peso lo carga su tarjeta.
 */
@Component({
  selector: 'app-dashboard',
  imports: [
    ComidasHoyComponent,
    EntrenamientoHoyComponent,
    GraficoSemanaComponent,
    NsAlertComponent,
    NsButtonComponent,
    NsDateStripComponent,
    NsSkeletonComponent,
    TarjetaEnergiaComponent,
    TarjetaMacroComponent,
    TarjetaPesoComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  /** ?fecha=AAAA-MM-DD (con withComponentInputBinding). */
  readonly fecha = input<string>();

  private readonly seguimiento = inject(SeguimientoService);
  private readonly comidasService = inject(ComidasService);
  private readonly entrenamientos = inject(EntrenamientosService);
  private readonly menus = inject(MenusService);
  private readonly dialogos = inject(NsDialogService);
  private readonly confirmacion = inject(NsConfirmService);
  private readonly toasts = inject(NsToastService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  /** En móvil las macros son un carrusel: se hace enfocable para desplazarlo con el teclado. */
  protected readonly layout = inject(LayoutService);

  protected readonly hoy = hoyLocal();
  protected readonly maxFecha = sumarDias(this.hoy, 1);
  protected readonly macros: Macro[] = ['proteina', 'carbohidratos', 'grasa'];

  /** Día que se ve: el de la URL si es válido y no pasa de mañana; si no, hoy. */
  protected readonly dia = computed(() => {
    const f = this.fecha();
    return f && FECHA.test(f) && f <= this.maxFecha ? f : this.hoy;
  });
  protected readonly esHoy = computed(() => this.dia() === this.hoy);
  /** "Buenas tardes, Álex" (sin nombre, solo el saludo). */
  protected readonly saludo = computed(() => {
    const nombre = primerNombre(this.auth.cuenta()?.nombre);
    const texto = saludo(new Date().getHours());
    return nombre ? `${texto}, ${nombre}` : texto;
  });
  /** "Sábado, 21 de noviembre". */
  protected readonly fechaLarga = computed(() => {
    const larga = formatearFecha(this.dia(), 'larga');
    return larga.charAt(0).toUpperCase() + larga.slice(1);
  });
  /**
   * Texto de la región role="status": al cargar otro día desde la tira de fechas, el contenido
   * cambia sin navegar; así un lector de pantalla sabe qué día se ve.
   */
  protected readonly anuncio = computed(() => {
    if (this.estado() !== 'listo') return '';
    const comidas = this.resumen()?.comidas.length ?? 0;
    const textoComidas = comidas === 0 ? 'sin comidas registradas' : comidas === 1 ? '1 comida' : `${comidas} comidas`;
    return `Resumen del ${formatearFecha(this.dia(), 'larga')}: ${textoComidas}.`;
  });
  /** A dónde vuelve el registro de comidas. */
  protected readonly volver = computed(() => (this.esHoy() ? '/inicio' : `/inicio?fecha=${this.dia()}`));

  protected readonly estado = signal<Estado>('cargando');
  protected readonly error = signal<string | null>(null);
  protected readonly resumen = signal<ResumenDiarioResponse | null>(null);
  protected readonly marcando = signal<string | null>(null);
  /** Comida del plan que se está marcando como consumida. */
  protected readonly marcandoPlan = signal<string | null>(null);

  private readonly cache = new Map<string, ResumenDiarioResponse | null>();
  /**
   * Peticiones en curso por día, compartidas: si el día ya se está pidiendo (p. ej. como parte de la
   * semana y luego se elige en la tira de fechas), se reutiliza la misma en vez de repetirla.
   */
  private readonly enVuelo = new Map<string, Observable<ResumenDiarioResponse>>();
  private readonly version = signal(0);
  private peticion?: Subscription;
  private peticionSemana?: Subscription;

  /** Los 7 días de la semana del día que se ve; null mientras falta alguno. */
  protected readonly semana = computed<DiaSemanaKcal[] | null>(() => {
    this.version();
    const dias = rangoDias(lunesDeLaSemana(this.dia()), sumarDias(lunesDeLaSemana(this.dia()), 6));
    if (dias.some((d) => !this.cache.has(d))) return null;
    return dias.map((d) => diaDesdeResumen(d, this.cache.get(d)));
  });
  /** Días con comidas en la tira de fechas (de lo que hay en caché). */
  protected readonly diasConComidas = computed(() => {
    this.version();
    return [...this.cache].filter(([, r]) => r?.comidas.length).map(([f]) => f);
  });

  constructor() {
    effect(() => {
      const dia = this.dia();
      untracked(() => this.cargar(dia));
    });
  }

  protected cambiarDia(fecha: string): void {
    void this.router.navigate([], {
      queryParams: { fecha: fecha === this.hoy ? null : fecha },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /** Carga el resumen del día (de la caché si lo hay) y, a la vez, lo que falte de la semana. */
  protected cargar(dia = this.dia(), silencioso = false): void {
    this.peticion?.unsubscribe();
    this.error.set(null);
    const enCache = this.cache.get(dia);
    if (enCache) {
      this.resumen.set(enCache);
      this.estado.set('listo');
      this.cargarSemana(dia);
      return;
    }
    if (!silencioso) this.estado.set('cargando');
    // Primero el día que se ve; enseguida, sin esperar a su respuesta, el resto de la semana (en
    // paralelo). cargarSemana reutiliza la petición del día, que ya está en enVuelo.
    this.peticion = this.resumenDe(dia).subscribe({
      next: (r) => {
        this.resumen.set(r);
        this.estado.set('listo');
      },
      error: (e: unknown) => {
        const error = aApiError(e);
        if (this.siPerfilRequerido(error)) return;
        this.error.set(error.detalle);
        this.estado.set('error');
      },
    });
    this.cargarSemana(dia);
  }

  /** Tras un cambio: vacía la caché y recarga el día y su semana sin skeleton. */
  protected recargar(): void {
    this.cache.clear();
    this.enVuelo.clear();
    this.version.update((v) => v + 1);
    this.cargar(this.dia(), true);
  }

  private cargarSemana(dia: string): void {
    const lunes = lunesDeLaSemana(dia);
    const faltan = rangoDias(lunes, sumarDias(lunes, 6)).filter((d) => !this.cache.has(d));
    if (!faltan.length) return;
    // Dejar de escuchar la semana anterior no cancela sus peticiones (están compartidas en
    // enVuelo): las que ya iban siguen y se guardan en la caché.
    this.peticionSemana?.unsubscribe();
    const peticiones: Observable<ResumenDiarioResponse | null>[] = faltan.map((d) =>
      this.resumenDe(d).pipe(catchError(() => of(null))),
    );
    this.peticionSemana = forkJoin(peticiones).subscribe((resumenes) => {
      // Un día que falló se marca como sin datos para el gráfico (null), salvo que ya esté.
      faltan.forEach((d, i) => {
        if (!this.cache.has(d)) this.cache.set(d, resumenes[i]);
      });
      this.version.update((v) => v + 1);
    });
  }

  /**
   * GET /seguimiento/resumen de un día, una sola vez aunque lo pidan el día y la semana a la vez.
   * Al llegar se guarda en la caché; si falla, no se guarda (se puede reintentar).
   */
  private resumenDe(dia: string): Observable<ResumenDiarioResponse> {
    const enCache = this.cache.get(dia);
    if (enCache) return of(enCache);
    let peticion = this.enVuelo.get(dia);
    if (!peticion) {
      peticion = this.seguimiento.resumen(dia).pipe(
        tap((r) => this.guardar(dia, r)),
        finalize(() => this.enVuelo.delete(dia)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
      this.enVuelo.set(dia, peticion);
    }
    return peticion;
  }

  private guardar(dia: string, r: ResumenDiarioResponse): void {
    this.cache.set(dia, r);
    this.version.update((v) => v + 1);
  }

  // ---- Comidas

  protected verComida(comida: RegistroComidaResponse): void {
    this.dialogos
      .open<DetalleComidaComponent, ResultadoDetalleComida, DetalleComidaData>(DetalleComidaComponent, {
        titulo: 'Detalle de la comida',
        size: 'lg',
        data: { comida },
      })
      .closed.subscribe((r) => {
        if (r?.accion === 'editar') this.editarComida(r.comida);
        else if (r?.accion === 'duplicar') this.duplicarComida(r.comida);
      });
  }

  protected editarComida(comida: RegistroComidaResponse): void {
    void this.router.navigate(['/comidas', comida.id, 'editar'], { queryParams: { volver: this.volver() } });
  }

  protected duplicarComida(comida: RegistroComidaResponse): void {
    this.dialogos
      .open<DuplicarComidaDialogComponent, RegistroComidaResponse, DuplicarComidaData>(DuplicarComidaDialogComponent, {
        titulo: 'Duplicar comida',
        size: 'sm',
        data: { comida },
      })
      .closed.subscribe((nueva) => {
        if (!nueva) return;
        this.toasts.exito('Comida duplicada');
        this.recargar();
      });
  }

  protected async eliminarComida(comida: RegistroComidaResponse): Promise<void> {
    const ok = await this.confirmacion.confirmar({
      titulo: '¿Eliminar la comida?',
      mensaje: 'Se borrará con todos sus alimentos y se recalcularán los totales del día.',
      textoConfirmar: 'Eliminar',
      peligro: true,
    });
    if (!ok) return;
    this.comidasService.eliminar(comida.id).subscribe({
      next: () => {
        this.toasts.exito('Comida eliminada');
        this.recargar();
      },
      error: (e: unknown) => this.toasts.error('No hemos podido eliminar la comida', aApiError(e).detalle),
    });
  }

  /**
   * "Marcar comida" en una comida del plan: POST /menus/{menuId}/comidas/{id}/registrar (la hora la
   * pone el servidor) y recarga el resumen, donde aparece ya como comida registrada.
   */
  protected marcarPlanificada(p: ComidaPendienteResponse): void {
    if (!p.menuId || this.marcandoPlan()) return;
    this.marcandoPlan.set(p.id);
    this.menus.registrarComida(p.menuId, p.id).subscribe({
      next: () => {
        this.marcandoPlan.set(null);
        this.toasts.exito('Comida registrada', p.receta.nombre);
        this.recargar();
      },
      error: (e: unknown) => {
        this.marcandoPlan.set(null);
        this.toasts.error('No hemos podido registrar la comida', aApiError(e).detalle);
        // Puede que ya estuviera registrada (409): el resumen lo dirá.
        this.recargar();
      },
    });
  }

  // ---- Entrenamientos

  protected marcarRealizado(e: EntrenamientoResponse): void {
    this.marcando.set(e.id);
    this.entrenamientos.marcarEstado(e, 'REALIZADO').subscribe({
      next: () => {
        this.marcando.set(null);
        this.toasts.exito('Entrenamiento realizado', this.esHoy() ? 'Tu objetivo de hoy se ha actualizado' : undefined);
        this.recargar();
      },
      error: (err: unknown) => {
        this.marcando.set(null);
        const error = aApiError(err);
        if (this.siPerfilRequerido(error)) return;
        this.toasts.error('No hemos podido marcarlo como realizado', error.detalle);
      },
    });
  }

  protected registrarEntrenamiento(): void {
    abrirEntrenamientoForm(this.dialogos, { fecha: this.esHoy() ? null : this.dia() }).closed.subscribe((nuevo) => {
      if (!nuevo) return;
      this.toasts.exito('Entrenamiento guardado');
      this.recargar();
    });
  }

  /** 422 PERFIL_REQUERIDO → /bienvenida. */
  private siPerfilRequerido(error: ApiError): boolean {
    if (error.codigo !== 'PERFIL_REQUERIDO') return false;
    void this.router.navigate(['/bienvenida']);
    return true;
  }
}

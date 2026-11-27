import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { type Observable, catchError, forkJoin, map, of } from 'rxjs';

import type { EstadisticasResponse, InsightResponse, RelacionNutricionResponse, SeriePesoResponse } from '@core/models';
import { AsistenteService } from '@core/services/asistente.service';
import { AuthService } from '@core/services/auth.service';
import { EntrenamientosService } from '@core/services/entrenamientos.service';
import { SeguimientoService } from '@core/services/seguimiento.service';
import { aApiError } from '@core/util/api-error';
import { hoyLocal } from '@core/util/fechas';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NS_CARD } from '@shared/ui/card/card.component';
import { NsInsightCardComponent } from '@shared/ui/data/insight-card.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsEmptyStateComponent } from '@shared/ui/feedback/empty-state.component';
import { NsSkeletonComponent } from '@shared/ui/feedback/skeleton.component';
import { borradorDeInsight } from '../asistente/asistente';
import { EntrenoDescansoComponent } from './componentes/entreno-descanso.component';
import { FiltrosPeriodoComponent } from './componentes/filtros-periodo.component';
import { GraficoEnergiaComponent } from './componentes/grafico-energia.component';
import { GraficoMacrosComponent } from './componentes/grafico-macros.component';
import { GraficoPesoComponent } from './componentes/grafico-peso.component';
import { KpisPeriodoComponent } from './componentes/kpis-periodo.component';
import { MapaAdherenciaComponent } from './componentes/mapa-adherencia.component';
import { RepartoComidasComponent } from './componentes/reparto-comidas.component';
import { RepartoMacrosComponent } from './componentes/reparto-macros.component';
import { TopAlimentosComponent } from './componentes/top-alimentos.component';
import {
  type FiltrosEstadisticas,
  MIN_DIAS_REGISTRO,
  aParametros,
  calcularKpis,
  comoComparar,
  leerFiltros,
  mediaAnteriorKcal,
  textoRango,
} from './estadisticas';

/** Todo lo que necesita la pantalla para unos filtros. */
interface DatosPeriodo {
  filtros: FiltrosEstadisticas;
  estadisticas: EstadisticasResponse;
  /** Periodo anterior (solo con "Comparar"); null si no se compara o falla. */
  anterior: EstadisticasResponse | null;
  peso: SeriePesoResponse | null;
  relacion: RelacionNutricionResponse | null;
}

/**
 * Estadísticas y progreso (/estadisticas, DESIGN.md §7.14): filtros de periodo en la URL, KPIs con su
 * variación, gráficos (energía, macros, reparto, peso, adherencia y comidas), entreno frente a
 * descanso, alimentos más consumidos e insights.
 *
 * Datos, en paralelo y de nuevo con cada cambio de filtros: GET /seguimiento/estadisticas (la única
 * imprescindible), /seguimiento/peso, /entrenamientos/relacion-nutricion y, con "Comparar",
 * /seguimiento/comparativa o las estadísticas del rango anterior (ver comoComparar). Si falla una
 * secundaria, su tarjeta se queda sin datos pero la pantalla sigue. Los insights se piden una vez y
 * solo si el usuario los tiene activos en su cuenta.
 */
@Component({
  selector: 'app-estadisticas',
  imports: [
    RouterLink,
    NS_CARD,
    NsAlertComponent,
    NsButtonComponent,
    NsEmptyStateComponent,
    NsInsightCardComponent,
    NsSkeletonComponent,
    EntrenoDescansoComponent,
    FiltrosPeriodoComponent,
    GraficoEnergiaComponent,
    GraficoMacrosComponent,
    GraficoPesoComponent,
    KpisPeriodoComponent,
    MapaAdherenciaComponent,
    RepartoComidasComponent,
    RepartoMacrosComponent,
    TopAlimentosComponent,
  ],
  templateUrl: './estadisticas.component.html',
  styleUrl: './estadisticas.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EstadisticasComponent {
  /** Query params (con withComponentInputBinding). */
  readonly periodo = input<string>();
  readonly desde = input<string>();
  readonly hasta = input<string>();
  readonly agrupacion = input<string>();
  readonly comparar = input<string>();

  private readonly seguimiento = inject(SeguimientoService);
  private readonly entrenamientos = inject(EntrenamientosService);
  private readonly auth = inject(AuthService);
  private readonly asistente = inject(AsistenteService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);

  protected readonly hoy = hoyLocal();
  protected readonly minDias = MIN_DIAS_REGISTRO;

  protected readonly filtros = computed(
    () =>
      leerFiltros(
        {
          periodo: this.periodo(),
          desde: this.desde(),
          hasta: this.hasta(),
          agrupacion: this.agrupacion(),
          comparar: this.comparar(),
        },
        this.hoy,
      ),
    { equal: (a, b) => JSON.stringify(a) === JSON.stringify(b) },
  );
  protected readonly comparacion = computed(() => (this.filtros().comparar ? comoComparar(this.filtros()) : null));
  /** "26 oct – 21 nov 2026 · comparado con el mes anterior". */
  protected readonly subtitulo = computed(() => {
    const f = this.filtros();
    const c = this.comparacion();
    return textoRango(f.desde, f.hasta) + (c ? ` · comparado con ${c.texto}` : '');
  });

  protected readonly datos = rxResource({
    params: () => this.filtros(),
    stream: ({ params: f }) => this.cargar(f),
  });
  protected readonly error = computed(() => (this.datos.error() ? aApiError(this.datos.error()).detalle : null));
  /** Los datos de los filtros actuales (al cambiar de filtros, los anteriores se siguen viendo mientras carga). */
  protected readonly actual = computed(() => (this.datos.hasValue() ? this.datos.value() : null));
  protected readonly sinDatos = computed(() => {
    const d = this.actual();
    return d !== null && d.estadisticas.diasConRegistro < MIN_DIAS_REGISTRO;
  });
  protected readonly kpis = computed(() => {
    const d = this.actual();
    return d ? calcularKpis(d.estadisticas, d.anterior, d.peso) : null;
  });
  protected readonly mediaAnterior = computed(() => mediaAnteriorKcal(this.actual()?.anterior ?? null));
  protected readonly contextoDelta = computed(() => {
    const c = this.comparacion();
    return c ? `frente a ${c.texto}` : undefined;
  });

  // ---- Insights

  protected readonly insightsActivos = computed(() => this.auth.cuenta()?.insightsActivos ?? false);
  protected readonly insights = rxResource({
    params: () => (this.insightsActivos() ? true : undefined),
    stream: () => this.seguimiento.insights(),
  });

  /** "Preguntar al asistente": conversación nueva con el insight como borrador. */
  protected preguntar(insight: InsightResponse): void {
    this.asistente.dejarBorrador(borradorDeInsight(insight));
    void this.router.navigate(['/asistente']);
  }

  protected cambiarFiltros(f: FiltrosEstadisticas): void {
    void this.router.navigate([], { relativeTo: this.ruta, queryParams: aParametros(f) });
  }

  protected reintentar(): void {
    this.datos.reload();
  }

  private cargar(f: FiltrosEstadisticas): Observable<DatosPeriodo> {
    const opcional = <T>(o: Observable<T>) => o.pipe(catchError(() => of(null)));
    return forkJoin({
      estadisticas: this.seguimiento.estadisticas(f.desde, f.hasta, f.agrupacion),
      anterior: opcional(this.anterior(f)),
      peso: opcional(this.seguimiento.seriePeso(f.desde, f.hasta)),
      relacion: opcional(this.entrenamientos.relacionNutricion(f.desde, f.hasta)),
    }).pipe(map((d) => ({ filtros: f, ...d })));
  }

  /** Estadísticas del periodo anterior según comoComparar (null sin "Comparar"). */
  private anterior(f: FiltrosEstadisticas): Observable<EstadisticasResponse | null> {
    if (!f.comparar) return of(null);
    const c = comoComparar(f);
    return c.tipo === 'comparativa'
      ? this.seguimiento.comparativa(c.periodo).pipe(map((r) => r.anterior))
      : this.seguimiento.estadisticas(c.desde, c.hasta, f.agrupacion);
  }
}

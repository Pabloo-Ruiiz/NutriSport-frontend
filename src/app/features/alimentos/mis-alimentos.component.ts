import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { catchError, firstValueFrom, forkJoin, map, of } from 'rxjs';

import type { AlimentoResponse, AlimentoResumenResponse } from '@core/models';
import { AlimentosService, MIN_CARACTERES_BUSQUEDA } from '@core/services/alimentos.service';
import { aApiError } from '@core/util/api-error';
import { formatearNumero } from '@shared/pipes/formato';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsEmptyStateComponent } from '@shared/ui/feedback/empty-state.component';
import { NsSkeletonComponent } from '@shared/ui/feedback/skeleton.component';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import { BusquedaReactiva } from '@shared/ui/form/busqueda';
import { NsResaltadoComponent } from '@shared/ui/form/combobox.component';
import { idUnico } from '@shared/ui/form/control-campo';
import { NsConfirmService } from '@shared/ui/overlay/confirm.service';
import { NsDrawerComponent } from '@shared/ui/overlay/drawer.component';
import { AlimentoFormComponent } from './alimento-form.component';

const esPropio = (a: { fuente: string }) => a.fuente === 'USUARIO';

/** De AlimentoResponse (al crear o editar) al resumen que muestra la lista. */
function aResumen(a: AlimentoResponse): AlimentoResumenResponse {
  return {
    id: a.id,
    nombre: a.nombre,
    marca: a.marca,
    kcal100: a.kcal100,
    proteinas100: a.proteinas100,
    carbohidratos100: a.carbohidratos100,
    grasas100: a.grasas100,
    fuente: a.fuente,
  };
}

/**
 * Mis alimentos (/mis-alimentos): alimentos privados del usuario.
 *
 * La API no tiene un listado de "mis alimentos" (NutriSport_API.md §11.7): GET /alimentos exige
 * `q` y devuelve públicos y propios; los propios llevan fuente = USUARIO. Por eso:
 * - con texto, se buscan y se muestran solo los propios;
 * - sin texto, los propios de recientes y frecuentes, más los creados o editados en esta sesión.
 *
 * Crear y editar en un ns-drawer con AlimentoFormComponent; eliminar con confirmación (si ya se ha
 * usado en alguna comida, el backend solo lo desactiva).
 */
@Component({
  selector: 'app-mis-alimentos',
  imports: [
    LucideDynamicIcon,
    NsAlertComponent,
    NsButtonComponent,
    NsDrawerComponent,
    NsEmptyStateComponent,
    NsResaltadoComponent,
    NsSkeletonComponent,
    AlimentoFormComponent,
  ],
  templateUrl: './mis-alimentos.component.html',
  styleUrl: './mis-alimentos.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MisAlimentosComponent {
  private readonly alimentos = inject(AlimentosService);
  private readonly confirmacion = inject(NsConfirmService);
  private readonly toasts = inject(NsToastService);

  protected readonly idBuscador = idUnico('ns-mis-alimentos');
  protected readonly minCaracteres = MIN_CARACTERES_BUSQUEDA;
  protected readonly formatear = formatearNumero;

  protected readonly busqueda = new BusquedaReactiva<AlimentoResumenResponse>((texto) =>
    this.alimentos.buscar(texto, { size: 50 }).pipe(map((pagina) => pagina.content.filter(esPropio))),
  );
  protected readonly buscando = computed(() => this.busqueda.estado() !== 'inactiva');

  /** Propios de recientes y frecuentes (sin texto). */
  protected readonly usados = signal<AlimentoResumenResponse[]>([]);
  protected readonly cargandoUsados = signal(true);
  protected readonly errorUsados = signal<string | null>(null);
  /** Creados o editados en esta sesión: no aparecen en recientes ni frecuentes hasta usarlos. */
  private readonly deEstaSesion = signal<AlimentoResumenResponse[]>([]);
  /** Eliminados en esta sesión (para quitarlos también de las listas ya cargadas). */
  private readonly eliminados = signal<ReadonlySet<string>>(new Set());

  protected readonly lista = computed(() => {
    const quitados = this.eliminados();
    const sesion = this.deEstaSesion();
    const porId = new Map(sesion.map((a) => [a.id, a]));
    const base = this.buscando() ? this.busqueda.resultados() : this.usados();
    // Lo editado en esta sesión sustituye a su versión antigua; lo creado va arriba (sin texto).
    const actualizados = base.map((a) => porId.get(a.id) ?? a);
    const extra = this.buscando() ? [] : sesion.filter((a) => !base.some((b) => b.id === a.id));
    return [...extra, ...actualizados].filter((a) => !quitados.has(a.id));
  });

  // ---- Drawer de crear/editar
  protected readonly drawerAbierto = signal(false);
  /** null = crear; un alimento = editar. */
  protected readonly editando = signal<AlimentoResponse | null>(null);
  protected readonly cargandoDetalle = signal<string | null>(null);
  protected readonly formulario = viewChild(AlimentoFormComponent);
  protected readonly eliminando = signal<string | null>(null);
  private readonly buscador = viewChild<ElementRef<HTMLInputElement>>('buscador');
  private readonly injector = inject(Injector);

  constructor() {
    this.cargarUsados();
  }

  protected cargarUsados(): void {
    this.cargandoUsados.set(true);
    this.errorUsados.set(null);
    forkJoin({
      recientes: this.alimentos.recientes().pipe(catchError(() => of(null))),
      frecuentes: this.alimentos.frecuentes().pipe(catchError(() => of(null))),
    }).subscribe(({ recientes, frecuentes }) => {
      if (recientes === null && frecuentes === null) {
        this.errorUsados.set('No hemos podido cargar tus alimentos usados.');
      }
      const vistos = new Set<string>();
      this.usados.set(
        [...(recientes ?? []), ...(frecuentes ?? [])].filter(
          (a) => esPropio(a) && !vistos.has(a.id) && vistos.add(a.id),
        ),
      );
      this.cargandoUsados.set(false);
    });
  }

  protected alEscribir(evento: Event): void {
    this.busqueda.escribir((evento.target as HTMLInputElement).value);
  }

  protected crear(): void {
    this.editando.set(null);
    this.drawerAbierto.set(true);
  }

  protected async editar(alimento: AlimentoResumenResponse): Promise<void> {
    this.cargandoDetalle.set(alimento.id);
    try {
      this.editando.set(await firstValueFrom(this.alimentos.detalle(alimento.id)));
      this.drawerAbierto.set(true);
    } catch (e) {
      this.toasts.error('No hemos podido abrir el alimento', aApiError(e).detalle);
    } finally {
      this.cargandoDetalle.set(null);
    }
  }

  protected alGuardar(alimento: AlimentoResponse): void {
    const resumen = aResumen(alimento);
    this.deEstaSesion.update((lista) => [resumen, ...lista.filter((a) => a.id !== alimento.id)]);
    this.toasts.exito(this.editando() ? 'Alimento guardado' : 'Alimento creado', alimento.nombre);
    this.drawerAbierto.set(false);
  }

  protected async eliminar(alimento: AlimentoResumenResponse): Promise<void> {
    const confirmado = await this.confirmacion.confirmar({
      titulo: `¿Eliminar «${alimento.nombre}»?`,
      mensaje: 'Si ya lo has usado en alguna comida, se desactivará y el historial lo conservará.',
      textoConfirmar: 'Eliminar',
      peligro: true,
    });
    if (!confirmado) return;
    this.eliminando.set(alimento.id);
    try {
      await firstValueFrom(this.alimentos.eliminar(alimento.id));
      this.eliminados.update((ids) => new Set([...ids, alimento.id]));
      this.toasts.exito('Alimento eliminado', alimento.nombre);
      // Su fila (y el botón que tenía el foco) desaparece: el foco va al buscador.
      afterNextRender(() => this.buscador()?.nativeElement.focus(), { injector: this.injector });
    } catch (e) {
      this.toasts.error('No hemos podido eliminar el alimento', aApiError(e).detalle);
    } finally {
      this.eliminando.set(null);
    }
  }
}

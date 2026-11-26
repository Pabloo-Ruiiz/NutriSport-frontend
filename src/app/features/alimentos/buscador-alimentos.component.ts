import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  WritableSignal,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { Observable, map } from 'rxjs';

import type { AlimentoResumenResponse } from '@core/models';
import { AlimentosService, MIN_CARACTERES_BUSQUEDA } from '@core/services/alimentos.service';
import { aApiError } from '@core/util/api-error';
import { formatearNumero } from '@shared/pipes/formato';
import { NsSourceBadgeComponent } from '@shared/ui/data/source-badge.component';
import { NsSkeletonComponent } from '@shared/ui/feedback/skeleton.component';
import { BusquedaReactiva } from '@shared/ui/form/busqueda';
import {
  NsComboboxComponent,
  NsComboboxOpcionDirective,
  NsResaltadoComponent,
} from '@shared/ui/form/combobox.component';
import { idUnico } from '@shared/ui/form/control-campo';
import type { NsOpcion } from '@shared/ui/form/control-valor';
import { NsTabPanelDirective, NsTabsComponent } from '@shared/ui/nav/tabs.component';

export type ModoBuscador = 'lista' | 'combobox';
type Pestana = 'resultados' | 'recientes' | 'frecuentes' | 'mis';
type ListaRapida = 'recientes' | 'frecuentes';

interface ListaCargada {
  estado: 'sin-cargar' | 'cargando' | 'lista' | 'error';
  alimentos: AlimentoResumenResponse[];
  error?: string;
}

const PESTANAS: NsOpcion<Pestana>[] = [
  { valor: 'resultados', etiqueta: 'Resultados' },
  { valor: 'recientes', etiqueta: 'Recientes' },
  { valor: 'frecuentes', etiqueta: 'Frecuentes' },
  { valor: 'mis', etiqueta: 'Mis alimentos' },
];

/**
 * Buscador de alimentos del catálogo (DESIGN.md §7.6). Cada resultado muestra nombre, marca,
 * kcal/100 g y la fuente. Emite `elegido` con el alimento.
 *
 * - modo 'combobox': ns-combobox con la lista desplegable (formularios compactos).
 * - modo 'lista' (por defecto): campo de búsqueda y pestañas Resultados · Recientes · Frecuentes ·
 *   Mis alimentos con la lista en la página (registro de comidas). Recientes y frecuentes se piden
 *   la primera vez que se abre su pestaña. "Mis alimentos" son los resultados propios (fuente
 *   USUARIO): la API no tiene un listado de alimentos propios sin búsqueda (§11.7).
 *
 *   <app-buscador-alimentos (elegido)="anadir($event)" />
 */
@Component({
  selector: 'app-buscador-alimentos',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    LucideDynamicIcon,
    NsComboboxComponent,
    NsComboboxOpcionDirective,
    NsResaltadoComponent,
    NsSkeletonComponent,
    NsSourceBadgeComponent,
    NsTabsComponent,
    NsTabPanelDirective,
  ],
  templateUrl: './buscador-alimentos.component.html',
  styleUrl: './buscador-alimentos.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BuscadorAlimentosComponent {
  readonly modo = input<ModoBuscador>('lista');
  readonly etiqueta = input('Buscar alimento');
  readonly elegido = output<AlimentoResumenResponse>();

  private readonly alimentos = inject(AlimentosService);

  /** Búsqueda para ns-combobox (y para el modo lista). */
  protected readonly buscarAlimentos = (texto: string): Observable<AlimentoResumenResponse[]> =>
    this.alimentos.buscar(texto, { size: 20 }).pipe(map((pagina) => pagina.content));
  protected readonly nombreAlimento = (a: AlimentoResumenResponse) => (a.marca ? `${a.nombre} (${a.marca})` : a.nombre);
  protected readonly formatear = formatearNumero;
  protected readonly minCaracteres = MIN_CARACTERES_BUSQUEDA;

  // ---- Modo lista
  protected readonly pestanas = PESTANAS;
  protected readonly pestana = signal<string | null>('resultados');
  protected readonly idCampo = idUnico('ns-buscador');
  protected readonly listasRapidas: readonly ListaRapida[] = ['recientes', 'frecuentes'];
  protected readonly busqueda = new BusquedaReactiva<AlimentoResumenResponse>(this.buscarAlimentos);
  protected readonly propios = computed(() => this.busqueda.resultados().filter((a) => a.fuente === 'USUARIO'));

  protected readonly recientes = signal<ListaCargada>({ estado: 'sin-cargar', alimentos: [] });
  protected readonly frecuentes = signal<ListaCargada>({ estado: 'sin-cargar', alimentos: [] });

  constructor() {
    // Recientes y frecuentes se piden al abrir su pestaña por primera vez.
    effect(() => {
      const pestana = this.pestana();
      untracked(() => {
        if (this.modo() !== 'lista') return;
        if ((pestana === 'recientes' || pestana === 'frecuentes') && this.datosDe(pestana).estado === 'sin-cargar') {
          this.cargar(pestana);
        }
      });
    });
  }

  protected alEscribir(evento: Event): void {
    const texto = (evento.target as HTMLInputElement).value;
    this.busqueda.escribir(texto);
    // Al escribir se ven los resultados (salvo si se está buscando en "Mis alimentos").
    if (texto.trim().length >= MIN_CARACTERES_BUSQUEDA && this.pestana() !== 'mis') this.pestana.set('resultados');
  }

  protected datosDe(clave: ListaRapida): ListaCargada {
    return clave === 'recientes' ? this.recientes() : this.frecuentes();
  }

  protected cargar(clave: ListaRapida): void {
    const destino: WritableSignal<ListaCargada> = clave === 'recientes' ? this.recientes : this.frecuentes;
    const peticion = clave === 'recientes' ? this.alimentos.recientes() : this.alimentos.frecuentes();
    destino.set({ estado: 'cargando', alimentos: [] });
    peticion.subscribe({
      next: (alimentos) => destino.set({ estado: 'lista', alimentos }),
      error: (e: unknown) => destino.set({ estado: 'error', alimentos: [], error: aApiError(e).detalle }),
    });
  }
}

import { BreakpointObserver } from '@angular/cdk/layout';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import type { ProductoResponse, AlimentoResumenResponse } from '@core/models';
import { AlimentosService } from '@core/services/alimentos.service';
import { BusquedaReactiva } from '@shared/ui/form/busqueda';
import { LucideDynamicIcon } from '@lucide/angular';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsSkeletonComponent } from '@shared/ui/feedback/skeleton.component';
import { NsSourceBadgeComponent } from '@shared/ui/data/source-badge.component';
import { NsDrawerComponent } from '@shared/ui/overlay/drawer.component';
import { formatearNumero } from '@shared/pipes/formato';
import { ProductosComercialesComponent } from './productos-comerciales.component';
import { FichaProductoComponent } from './ficha-producto.component';
/**
 * Buscador de alimentos y productos (/productos, DESIGN.md §7.19), layout 7 + 5:
 *
 * - Izquierda: buscador y dos bloques. "En tu catálogo" busca al escribir (debounce, mínimo 2
 *   letras); "Productos comerciales" consulta Open Food Facts solo al pulsar el botón.
 * - Derecha: la ficha del producto elegido. En móvil se abre como bottom sheet.
 */
@Component({
  selector: 'app-buscador-productos',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    LucideDynamicIcon,
    NsSkeletonComponent,
    NsButtonComponent,
    NsAlertComponent,
    NsSourceBadgeComponent,
    NsDrawerComponent,
    ProductosComercialesComponent,
    FichaProductoComponent,
  ],
  templateUrl: './buscador-productos.component.html',
  styleUrl: './buscador-productos.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BuscadorProductosComponent {
  private readonly alimentos = inject(AlimentosService);
  private readonly ruta = inject(ActivatedRoute);
  protected readonly movil = toSignal(
    inject(BreakpointObserver)
      .observe('(max-width: 767px)')
      .pipe(map((e) => e.matches)),
    { initialValue: false },
  );
  protected readonly catalogo = new BusquedaReactiva((texto) =>
    this.alimentos.buscar(texto).pipe(map((p) => p.content)),
  );
  protected readonly seleccionado = signal<ProductoResponse | null>(null);
  protected readonly abierto = signal(false);
  protected readonly numero = formatearNumero;
  protected escribir(evento: Event): void {
    this.catalogo.escribir((evento.target as HTMLInputElement).value);
  }
  /** Vacía el buscador y le devuelve el foco. */
  protected borrar(campo: HTMLInputElement): void {
    campo.value = '';
    this.catalogo.escribir('');
    campo.focus();
  }
  protected elegir(producto: ProductoResponse): void {
    this.seleccionado.set(producto);
    this.abierto.set(true);
  }
  protected parametros(alimento: AlimentoResumenResponse) {
    return {
      alimentoId: alimento.id,
      fecha: this.ruta.snapshot.queryParamMap.get('fecha'),
      tipoComida: this.ruta.snapshot.queryParamMap.get('tipoComida'),
    };
  }
}

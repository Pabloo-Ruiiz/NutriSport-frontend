import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import type { ProductoResponse, ProductoResumenResponse } from '@core/models';
import { ProductosService } from '@core/services/productos.service';
import { aApiError } from '@core/util/api-error';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { ProductoItemComponent } from './producto-item.component';
@Component({
  selector: 'app-productos-comerciales',
  imports: [NsButtonComponent, NsAlertComponent, ProductoItemComponent],
  templateUrl: './productos-comerciales.component.html',
  styleUrl: './productos-comerciales.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductosComercialesComponent {
  readonly consultaBusqueda = input('');
  readonly elegido = output<ProductoResponse>();
  private readonly productos = inject(ProductosService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly resultados = signal<ProductoResumenResponse[]>([]);
  protected readonly cargando = signal(false);
  protected readonly cargandoFicha = signal(false);
  protected readonly buscado = signal(false);
  protected readonly disponible = signal(true);
  protected readonly mas = signal(false);
  protected readonly error = signal('');
  protected readonly tipoError = signal<'info' | 'error'>('error');
  private consulta = '';
  private pagina = 0;
  private intentoFicha = 0;
  protected async buscar(siguiente = false): Promise<void> {
    if (this.cargando() || (siguiente && (!this.mas() || this.pagina >= 49))) return;
    const pagina = siguiente ? this.pagina + 1 : 0;
    const consulta = siguiente ? this.consulta : this.consultaBusqueda().trim();
    if (!consulta) return;
    this.cargando.set(true);
    this.error.set('');
    try {
      const respuesta = await firstValueFrom(
        this.productos.buscar(consulta, pagina).pipe(takeUntilDestroyed(this.destroyRef)),
      );
      this.consulta = consulta;
      this.pagina = pagina;
      this.resultados.update((prev) =>
        siguiente
          ? [...prev, ...respuesta.productos.filter((p) => !prev.some((a) => a.codigoBarras === p.codigoBarras))]
          : respuesta.productos,
      );
      this.disponible.set(respuesta.proveedorDisponible);
      this.mas.set(respuesta.proveedorDisponible && respuesta.productos.length === 20 && pagina < 49);
      this.buscado.set(true);
    } catch (e) {
      this.mostrarError(e);
    } finally {
      this.cargando.set(false);
    }
  }
  protected async elegir(producto: ProductoResumenResponse): Promise<void> {
    const intento = ++this.intentoFicha;
    this.cargandoFicha.set(true);
    this.error.set('');
    try {
      const ficha = await firstValueFrom(
        this.productos.porCodigo(producto.codigoBarras).pipe(takeUntilDestroyed(this.destroyRef)),
      );
      if (intento !== this.intentoFicha) return;
      this.elegido.emit(ficha);
    } catch (e) {
      if (intento === this.intentoFicha) this.mostrarError(e);
    } finally {
      if (intento === this.intentoFicha) this.cargandoFicha.set(false);
    }
  }
  private mostrarError(e: unknown): void {
    const error = aApiError(e);
    this.tipoError.set(error.codigo === 'PROVEEDOR_NO_DISPONIBLE' ? 'info' : 'error');
    this.error.set(error.detalle + (error.retryAfterSegundos !== null ? ' ' + error.mensajeEspera() : ''));
  }
}

import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type { ProductoResponse } from '@core/models';
import { ProductosService } from '@core/services/productos.service';
import { aApiError } from '@core/util/api-error';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsBarcodeScannerComponent, type ErrorEscaner } from '@shared/ui/form/barcode-scanner.component';
import { AlimentoFormComponent } from '@features/alimentos/alimento-form.component';
import { CodigoManualComponent } from './codigo-manual.component';
import { FichaProductoComponent } from './ficha-producto.component';

type EstadoEscaner = 'listo' | 'buscando' | 'encontrado' | 'no-encontrado' | 'proveedor' | 'error';
@Component({
  selector: 'app-escaner',
  imports: [
    RouterLink,
    NsButtonComponent,
    NsAlertComponent,
    NsBarcodeScannerComponent,
    CodigoManualComponent,
    FichaProductoComponent,
    AlimentoFormComponent,
  ],
  templateUrl: './escaner.component.html',
  styleUrl: './escaner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EscanerComponent {
  private readonly productos = inject(ProductosService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly contexto = inject(ActivatedRoute).snapshot.queryParams;
  protected readonly estado = signal<EstadoEscaner>('listo');
  protected readonly manual = signal(false);
  protected readonly producto = signal<ProductoResponse | null>(null);
  protected readonly avisoCamara = signal('');
  protected readonly mensaje = signal('');
  protected readonly creando = signal(false);
  protected readonly creado = signal(false);
  private intento = 0;

  protected errorCamara(error: ErrorEscaner): void {
    const textos: Record<ErrorEscaner, string> = {
      'permiso-denegado': 'No tenemos permiso para usar la cámara. Introduce el código del envase manualmente.',
      'sin-camara': 'No hemos podido abrir una cámara. Introduce el código manualmente.',
      'no-soportado': 'Este navegador no permite escanear con la cámara. Introduce el código manualmente.',
    };
    this.avisoCamara.set(textos[error]);
    this.manual.set(true);
  }

  protected async buscar(codigo: string): Promise<void> {
    if (!/^\d{8,14}$/.test(codigo) || this.estado() === 'buscando') return;
    const intento = ++this.intento;
    this.estado.set('buscando');
    this.producto.set(null);
    this.mensaje.set('');
    this.creando.set(false);
    this.creado.set(false);
    try {
      const producto = await firstValueFrom(this.productos.porCodigo(codigo).pipe(takeUntilDestroyed(this.destroyRef)));
      if (intento !== this.intento) return;
      this.producto.set(producto);
      this.estado.set('encontrado');
    } catch (e) {
      if (intento !== this.intento || this.destroyRef.destroyed) return;
      const error = aApiError(e);
      this.estado.set(
        error.status === 404
          ? 'no-encontrado'
          : error.status === 503 || error.codigo === 'PROVEEDOR_NO_DISPONIBLE'
            ? 'proveedor'
            : 'error',
      );
      this.mensaje.set(error.detalle + (error.retryAfterSegundos !== null ? ' ' + error.mensajeEspera() : ''));
    }
  }

  protected escanearOtro(): void {
    ++this.intento;
    this.producto.set(null);
    this.estado.set('listo');
    this.manual.set(false);
    this.avisoCamara.set('');
    this.creando.set(false);
    this.creado.set(false);
  }
}

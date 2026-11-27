import { ChangeDetectionStrategy, Component, Injector, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import type { ConCambiosSinGuardar } from '@core/guards/cambios-sin-guardar.guard';
import {
  ConsentimientoRevocadoComponent,
  esConsentimientoRevocado,
} from '@core/layout/consentimiento-revocado.component';
import { LayoutService } from '@core/layout/layout.service';
import type { AlimentoResumenResponse, ProductoResponse, RegistroComidaResponse, TipoComida } from '@core/models';
import { ETIQUETAS_TIPO_COMIDA } from '@core/models/etiquetas';
import { AlimentosService } from '@core/services/alimentos.service';
import { ComidasService } from '@core/services/comidas.service';
import { type ApiError, aApiError } from '@core/util/api-error';
import { hoyLocal, sumarDias } from '@core/util/fechas';
import { formatearNumero } from '@shared/pipes/formato';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsSkeletonComponent } from '@shared/ui/feedback/skeleton.component';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import type { NsOpcion } from '@shared/ui/form/control-valor';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { NsInputDirective } from '@shared/ui/form/input.directive';
import { NsSelectComponent } from '@shared/ui/form/select.component';
import { NsDialogService } from '@shared/ui/overlay/dialog.service';
import { BuscadorAlimentosComponent } from '../../alimentos/buscador-alimentos.component';
import { destinoInterno } from '../../auth/login/login.component';
import { ComidaEditorStore } from './comida-editor.store';
import { ComidaEnConstruccionComponent } from './comida-en-construccion.component';
import { ComidaSheetComponent, type ResultadoComidaSheet } from './comida-sheet.component';
import { CopiarComidaDialogComponent } from './copiar-comida-dialog.component';

const TIPOS = Object.keys(ETIQUETAS_TIPO_COMIDA) as TipoComida[];
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

type Estado = 'cargando' | 'error' | 'listo' | 'revocado';

/**
 * Registro de comidas (DESIGN.md §7.6) en /comidas/nueva y /comidas/:id/editar.
 *
 * - Izquierda: fecha (como mucho mañana), hora, tipo (los 8), "Foto del plato", "Copiar comida
 *   anterior" y el buscador en modo lista; al elegir un alimento se pide su detalle (porciones).
 * - Derecha: "Tu comida" (líneas, totales con "Estimación" y notas) y "Guardar comida".
 * - Móvil: buscador arriba y resumen fijo abajo que abre la comida en un bottom sheet.
 *
 * Desde el dashboard llegan ?tipoComida=…&fecha=… (y ?volver=… para regresar). Guardar hace POST (o
 * PUT al editar); si hay avisos, se muestran antes de salir; después, toast con "Deshacer" (solo al
 * crear) y vuelta a /inicio o a `volver`. Con cambios sin guardar, avisa antes de salir.
 */
@Component({
  selector: 'app-registro-comida',
  imports: [
    FormsModule,
    RouterLink,
    ConsentimientoRevocadoComponent,
    NsAlertComponent,
    NsButtonComponent,
    NsFormFieldComponent,
    NsInputDirective,
    NsSelectComponent,
    NsSkeletonComponent,
    BuscadorAlimentosComponent,
    ComidaEnConstruccionComponent,
  ],
  providers: [ComidaEditorStore],
  templateUrl: './registro-comida.component.html',
  styleUrl: './registro-comida.component.scss',
  host: { '(window:beforeunload)': 'alSalirDelNavegador($event)' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistroComidaComponent implements OnInit, ConCambiosSinGuardar {
  /** Parámetro de ruta (edición). */
  readonly id = input<string>();
  /** Query params desde el dashboard. */
  readonly tipoComida = input<string>();
  readonly fecha = input<string>();
  readonly volver = input<string>();
  readonly alimentoId = input<string>();

  protected readonly editor = inject(ComidaEditorStore);
  protected readonly layout = inject(LayoutService);
  private readonly comidas = inject(ComidasService);
  private readonly alimentos = inject(AlimentosService);
  private readonly dialogos = inject(NsDialogService);
  private readonly toasts = inject(NsToastService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  protected readonly estado = signal<Estado>('listo');
  protected readonly errorCarga = signal<string | null>(null);
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly errorFecha = signal<string | null>(null);
  /** Comida guardada con avisos: se muestran antes de salir. */
  protected readonly guardadaConAvisos = signal<RegistroComidaResponse | null>(null);
  protected readonly anadiendo = signal<string | null>(null);
  /** Anuncio para lectores de pantalla ("Avena añadida"). */
  protected readonly anuncio = signal('');

  protected readonly fechaMaxima = sumarDias(hoyLocal(), 1);
  protected readonly tipos: NsOpcion<TipoComida>[] = TIPOS.map((valor) => ({
    valor,
    etiqueta: ETIQUETAS_TIPO_COMIDA[valor],
  }));
  protected readonly editando = computed(() => !!this.id());
  protected readonly rutaFoto = computed(() => ({ tipoComida: this.editor.tipoComida(), fecha: this.editor.fecha() }));
  protected readonly resumenMovil = computed(() => {
    const n = this.editor.lineas().length;
    return `${n} ${n === 1 ? 'alimento' : 'alimentos'} · ${formatearNumero(this.editor.estimacion().kcal)} kcal`;
  });

  /** Firma de lo que se enviaría: si cambia respecto a la inicial, hay cambios sin guardar. */
  private readonly firma = computed(() => JSON.stringify(this.editor.aRequest()));
  private readonly firmaInicial = signal<string | null>(null);
  private guardada = false;

  async ngOnInit(): Promise<void> {
    const id = this.id();
    if (id) {
      await this.cargar(id);
    } else {
      const fecha = this.fecha();
      if (fecha && FECHA.test(fecha) && fecha <= this.fechaMaxima) this.editor.cambiarFecha(fecha);
      const tipo = this.tipoComida();
      if (tipo && (TIPOS as string[]).includes(tipo)) this.editor.cambiarTipo(tipo as TipoComida);
      const alimentoId = this.alimentoId();
      if (alimentoId) {
        try {
          this.editor.anadir(await firstValueFrom(this.alimentos.detalle(alimentoId)));
        } catch (e) {
          this.toasts.error('No se ha podido cargar el alimento', aApiError(e).detalle);
        }
      }
      this.firmaInicial.set(this.firma());
    }
  }

  tieneCambiosSinGuardar(): boolean {
    return (
      !this.guardada &&
      this.estado() === 'listo' &&
      this.firmaInicial() !== null &&
      this.firma() !== this.firmaInicial()
    );
  }

  protected alSalirDelNavegador(evento: BeforeUnloadEvent): void {
    if (this.tieneCambiosSinGuardar()) evento.preventDefault();
  }

  protected async cargar(id: string): Promise<void> {
    this.estado.set('cargando');
    this.errorCarga.set(null);
    try {
      const comida = await firstValueFrom(this.comidas.detalle(id));
      await this.editor.cargarDesde(comida);
      this.firmaInicial.set(this.firma());
      this.estado.set('listo');
    } catch (e) {
      const error = aApiError(e);
      this.errorCarga.set(error.detalle);
      this.estado.set(esConsentimientoRevocado(error) ? 'revocado' : 'error');
    }
  }

  // ---- Datos de la comida

  protected cambiarFecha(fecha: string): void {
    this.errorFecha.set(null);
    this.editor.cambiarFecha(fecha);
  }

  // ---- Alimentos

  protected anadirProducto(producto: ProductoResponse): void {
    if (!producto.nutricionCompleta) {
      this.toasts.info(
        'Información nutricional incompleta',
        'Crea un alimento propio desde Productos para completar sus datos.',
      );
      return;
    }
    if (!this.editor.anadirProducto(producto)) {
      this.toasts.error('La comida ya tiene 40 alimentos', 'Guárdala y registra el resto en otra comida.');
      return;
    }
    this.anuncio.set(`${producto.nombre} añadido a la comida`);
  }

  protected async anadir(resumen: AlimentoResumenResponse): Promise<void> {
    if (this.editor.llena()) {
      this.toasts.error('La comida ya tiene 40 alimentos', 'Guárdala y registra el resto en otra comida.');
      return;
    }
    this.anadiendo.set(resumen.id);
    try {
      const alimento = await firstValueFrom(this.alimentos.detalle(resumen.id));
      this.editor.anadir(alimento);
      this.anuncio.set(`${alimento.nombre} añadido a la comida.`);
    } catch (e) {
      this.toasts.error('No hemos podido añadir el alimento', aApiError(e).detalle);
    } finally {
      this.anadiendo.set(null);
    }
  }

  protected copiarComidaAnterior(): void {
    const ref = this.dialogos.open<CopiarComidaDialogComponent, RegistroComidaResponse>(CopiarComidaDialogComponent, {
      titulo: 'Copiar comida anterior',
      size: 'md',
    });
    ref.closed.subscribe(async (comida) => {
      if (!comida) return;
      try {
        const sinCopiar = await this.editor.copiarAlimentosDe(comida);
        this.anuncio.set('Alimentos copiados a la comida.');
        if (sinCopiar) this.toasts.info('Algunos alimentos no se han copiado', 'No están en el catálogo.');
      } catch (e) {
        this.toasts.error('No hemos podido copiar la comida', aApiError(e).detalle);
      }
    });
  }

  protected verComida(): void {
    const ref = this.dialogos.open<ComidaSheetComponent, ResultadoComidaSheet>(ComidaSheetComponent, {
      titulo: 'Tu comida',
      size: 'md',
      injector: this.injector,
    });
    ref.closed.subscribe((resultado) => {
      if (resultado === 'guardar') void this.guardar();
    });
  }

  // ---- Guardar

  protected async guardar(): Promise<void> {
    if (this.enviando()) return;
    this.error.set(null);
    this.errorFecha.set(null);

    if (!FECHA.test(this.editor.fecha()) || this.editor.fecha() > this.fechaMaxima) {
      this.errorFecha.set('La fecha puede ser como mucho mañana.');
      return;
    }
    if (this.editor.vacia()) {
      this.error.set('Añade al menos un alimento.');
      return;
    }
    if (this.editor.lineasSinCantidad().length) {
      this.error.set('Hay alimentos sin cantidad: corrígelos o quítalos.');
      return;
    }

    const id = this.id();
    this.enviando.set(true);
    try {
      const peticion = this.editor.aRequest();
      const comida = await firstValueFrom(id ? this.comidas.editar(id, peticion) : this.comidas.registrar(peticion));
      this.editor.aplicarRespuesta(comida);
      this.guardada = true;
      if (comida.avisos.length) this.guardadaConAvisos.set(comida);
      else await this.salir(comida);
    } catch (e) {
      this.mostrarError(aApiError(e));
    } finally {
      this.enviando.set(false);
    }
  }

  /** "Continuar" tras ver los avisos. */
  protected async continuar(): Promise<void> {
    const comida = this.guardadaConAvisos();
    if (comida) await this.salir(comida);
  }

  private async salir(comida: RegistroComidaResponse): Promise<void> {
    const kcal = formatearNumero(comida.totales.kcal);
    // Deshacer solo al crear: borrar una comida editada perdería la versión anterior.
    const deshacer = this.editando()
      ? undefined
      : {
          texto: 'Deshacer',
          ejecutar: () =>
            this.comidas.eliminar(comida.id).subscribe({
              next: () => this.toasts.info('Comida eliminada'),
              error: (e: unknown) => this.toasts.error('No hemos podido deshacer', aApiError(e).detalle),
            }),
        };
    this.toasts.exito(`Comida guardada · ${kcal} kcal`, undefined, deshacer);
    await this.router.navigateByUrl(destinoInterno(this.volver()) ?? '/inicio');
  }

  private mostrarError(error: ApiError): void {
    if (esConsentimientoRevocado(error)) {
      this.estado.set('revocado');
      return;
    }
    if (error.status === 400 && error.errores.length) {
      const resto = this.editor.aplicarErroresLineas(error.errores);
      const deFecha = resto.find((e) => e.campo === 'fecha');
      if (deFecha) this.errorFecha.set(deFecha.mensaje);
      const otros = resto.filter((e) => e.campo !== 'fecha');
      this.error.set(
        otros.length
          ? otros.map((e) => e.mensaje).join(' ')
          : resto.length === error.errores.length
            ? error.detalle
            : 'Revisa los alimentos marcados.',
      );
      return;
    }
    this.error.set(error.detalle);
  }
}

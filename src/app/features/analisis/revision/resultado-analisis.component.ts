import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';

import {
  ConsentimientoRevocadoComponent,
  esConsentimientoRevocado,
} from '@core/layout/consentimiento-revocado.component';
import { LayoutService } from '@core/layout/layout.service';
import type { AlimentoResumenResponse, AnalisisResponse, CoincidenciaCatalogo, EstadoAnalisis } from '@core/models';
import { ETIQUETAS_TIPO_COMIDA } from '@core/models/etiquetas';
import { AnalisisService } from '@core/services/analisis.service';
import { ComidasService } from '@core/services/comidas.service';
import { aApiError } from '@core/util/api-error';
import { formatearFecha, formatearNumero } from '@shared/pipes/formato';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsDisclaimerComponent } from '@shared/ui/feedback/disclaimer.component';
import { NsSkeletonComponent } from '@shared/ui/feedback/skeleton.component';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import { NsStepperComponent } from '@shared/ui/nav/stepper.component';
import { NsConfirmService } from '@shared/ui/overlay/confirm.service';
import { BuscadorAlimentosComponent } from '../../alimentos/buscador-alimentos.component';
import { AnalisisStore } from './analisis.store';
import { CandidatoItemComponent } from './candidato-item.component';
import { type EstadoFoto, FotoMarcadoresComponent, type Marcador } from './foto-marcadores.component';
import { TotalesAnalisisComponent } from './totales-analisis.component';

type Estado = 'cargando' | 'analizando' | 'revision' | 'terminado' | 'error' | 'no-encontrado' | 'revocado';

/** Gramos con los que entra un alimento añadido a mano. */
export const GRAMOS_ANADIDO = 100;

/** Estados que ya no se pueden revisar: tarjeta con el estado y el enlace adecuado. */
const TERMINADOS: Partial<Record<EstadoAnalisis, { titulo: string; texto: string }>> = {
  CONFIRMADO: {
    titulo: 'Esta comida ya está guardada',
    texto: 'Ya confirmaste este análisis y la comida está en tu historial.',
  },
  DESCARTADO: { titulo: 'Análisis descartado', texto: 'Descartaste este análisis: no se guardó ninguna comida.' },
  FALLIDO: { titulo: 'No hemos detectado alimentos', texto: 'No hemos podido analizar esta foto.' },
};

/**
 * Revisión del resultado de un análisis (DESIGN.md §7.8) en /comidas/foto/:id
 * (?fecha=…&hora=… desde la pantalla de la foto).
 *
 * - Carga el análisis; si sigue PENDIENTE o PROCESANDO, sigue el polling. Pide la URL prefirmada de
 *   la foto (404: "La foto ya no está disponible").
 * - Izquierda (5): foto con etiquetas numeradas, enlazadas con las filas, y totales. Derecha (7):
 *   una fila por alimento, "Añadir alimento no detectado" y el aviso de revisar las cantidades.
 * - Pie fijo: "Descartar" (con confirmación) y "Confirmar y guardar" (toast con "Deshacer").
 *   409 → recarga el análisis.
 * - CONFIRMADO, DESCARTADO o FALLIDO: tarjeta con el estado y su enlace.
 * - Móvil: foto de 240 px arriba, lista debajo y los totales en la barra junto a "Confirmar".
 */
@Component({
  selector: 'app-resultado-analisis',
  imports: [
    RouterLink,
    ConsentimientoRevocadoComponent,
    NsAlertComponent,
    NsButtonComponent,
    NsDisclaimerComponent,
    NsSkeletonComponent,
    NsStepperComponent,
    BuscadorAlimentosComponent,
    CandidatoItemComponent,
    FotoMarcadoresComponent,
    TotalesAnalisisComponent,
  ],
  providers: [AnalisisStore],
  templateUrl: './resultado-analisis.component.html',
  styleUrl: './resultado-analisis.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultadoAnalisisComponent {
  /** Parámetro de ruta. */
  readonly id = input.required<string>();
  /** Query params: fecha y hora elegidas antes de analizar. */
  readonly fecha = input<string>();
  readonly hora = input<string>();

  protected readonly store = inject(AnalisisStore);
  protected readonly layout = inject(LayoutService);
  private readonly analisis = inject(AnalisisService);
  private readonly comidas = inject(ComidasService);
  private readonly confirmacion = inject(NsConfirmService);
  private readonly toasts = inject(NsToastService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly pasos = ['Foto', 'Análisis', 'Revisión'];
  protected readonly estado = signal<Estado>('cargando');
  protected readonly errorCarga = signal<string | null>(null);
  protected readonly terminado = signal<{ estado: EstadoAnalisis; titulo: string; texto: string } | null>(null);

  protected readonly urlFoto = signal<string | null>(null);
  protected readonly estadoFoto = signal<EstadoFoto>('cargando');

  protected readonly resaltado = signal<number | null>(null);
  protected readonly anadiendo = signal(false);
  protected readonly enviando = signal<'confirmar' | 'descartar' | null>(null);
  protected readonly errorEnvio = signal<string | null>(null);
  protected readonly anuncio = signal('');

  private sondeo: Subscription | null = null;

  protected readonly tipoTexto = computed(() => ETIQUETAS_TIPO_COMIDA[this.store.tipoComida()]);
  protected readonly titulo = computed(() => `Revisa tu ${this.tipoTexto().toLocaleLowerCase('es-ES')}`);
  protected readonly resumen = computed(() => {
    const n = this.store.lineas().filter((l) => l.indiceCandidato !== null).length;
    const detectados = n === 1 ? 'Hemos detectado 1 alimento' : `Hemos detectado ${n} alimentos`;
    return `${detectados}. Ajusta lo que haga falta antes de guardar.`;
  });
  protected readonly marcadores = computed<Marcador[]>(() =>
    this.store.lineas().map((l, i) => ({
      numero: i + 1,
      nombre: l.nombreAlimento ?? l.nombreDetectado ?? `Alimento ${i + 1}`,
    })),
  );
  protected readonly kcalTotal = computed(() => formatearNumero(this.store.totales().kcal));
  protected readonly datosComida = computed(() => {
    const hora = this.store.hora();
    return `${this.tipoTexto()} · ${formatearFecha(this.store.fecha())}${hora ? ' · ' + hora : ''}`;
  });
  protected readonly motivoNoValido = computed(() => {
    if (this.store.valido()) return null;
    if (!this.store.lineas().length) return 'Añade al menos un alimento.';
    if (this.store.sinEmparejar().length) return 'Elige el alimento de las filas sin emparejar.';
    return 'Revisa los gramos: deben ser mayores que 0 y como mucho 5.000.';
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.parar());
    // Al pasar de /comidas/foto/a-1 a /comidas/foto/a-2 el router reutiliza el componente: se
    // carga cada vez que cambia el id, no solo al crearlo.
    effect(() => {
      this.id();
      untracked(() => void this.cargar());
    });
  }

  /** Carga el análisis (y sigue el polling si aún está en curso). */
  protected async cargar(): Promise<void> {
    this.parar();
    this.estado.set('cargando');
    this.errorCarga.set(null);
    this.terminado.set(null);
    this.errorEnvio.set(null);
    this.resaltado.set(null);
    this.anadiendo.set(false);
    try {
      const analisis = await firstValueFrom(this.analisis.consultar(this.id()));
      if (analisis.estado === 'PENDIENTE' || analisis.estado === 'PROCESANDO') this.seguir();
      else this.aplicar(analisis);
    } catch (e) {
      this.alFallarCarga(e);
    }
  }

  private seguir(): void {
    this.estado.set('analizando');
    this.sondeo = this.analisis.seguir(this.id()).subscribe({
      next: (analisis) => {
        if (analisis.estado !== 'PENDIENTE' && analisis.estado !== 'PROCESANDO') this.aplicar(analisis);
      },
      error: (e: unknown) => this.alFallarCarga(e),
    });
  }

  private aplicar(analisis: AnalisisResponse): void {
    const terminado = TERMINADOS[analisis.estado];
    if (terminado) {
      this.terminado.set({
        estado: analisis.estado,
        titulo: terminado.titulo,
        texto: analisis.estado === 'FALLIDO' ? (analisis.errorMensaje ?? terminado.texto) : terminado.texto,
      });
      this.estado.set('terminado');
      return;
    }
    this.store.iniciar(analisis, { fecha: this.fecha(), hora: this.hora() });
    this.estado.set('revision');
    void this.cargarFoto();
  }

  private alFallarCarga(e: unknown): void {
    const error = aApiError(e);
    if (esConsentimientoRevocado(error)) this.estado.set('revocado');
    else if (error.status === 404) this.estado.set('no-encontrado');
    else {
      this.errorCarga.set(error.status === 0 ? error.detalle : 'Inténtalo de nuevo dentro de un momento.');
      this.estado.set('error');
    }
  }

  /** URL prefirmada de la foto: caduca en minutos, así que se pide al mostrar la pantalla. */
  private async cargarFoto(): Promise<void> {
    this.estadoFoto.set('cargando');
    try {
      const { url } = await firstValueFrom(this.analisis.urlImagen(this.id()));
      this.urlFoto.set(url);
      this.estadoFoto.set('lista');
    } catch (e) {
      this.urlFoto.set(null);
      this.estadoFoto.set(aApiError(e).status === 404 ? 'no-disponible' : 'error');
    }
  }

  // ---- Líneas

  /** Etiqueta de la foto → su fila (scroll y foco). */
  protected irAFila(i: number): void {
    const fila = this.host.nativeElement.querySelectorAll<HTMLElement>('app-candidato-item')[i];
    if (!fila) return;
    const reducir = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    fila.scrollIntoView?.({ behavior: reducir ? 'auto' : 'smooth', block: 'center' });
    fila.focus({ preventScroll: true });
    this.resaltado.set(i);
  }

  protected cambiarAlimento(i: number, alimento: CoincidenciaCatalogo | AlimentoResumenResponse): void {
    this.store.cambiarAlimento(i, alimento);
    this.anuncio.set(`Alimento ${i + 1}: ${alimento.nombre}.`);
  }

  protected quitar(i: number): void {
    const nombre = this.marcadores()[i]?.nombre ?? '';
    this.store.quitar(i);
    this.resaltado.set(null);
    this.anuncio.set(`${nombre} quitado.`);
  }

  protected anadir(alimento: AlimentoResumenResponse): void {
    if (!this.store.anadirManual(alimento, GRAMOS_ANADIDO)) {
      this.toasts.error('No caben más alimentos', 'Una comida con foto admite como mucho 20.');
      return;
    }
    this.anadiendo.set(false);
    this.anuncio.set(`${alimento.nombre} añadido con ${GRAMOS_ANADIDO} g.`);
  }

  // ---- Pie

  protected async confirmar(): Promise<void> {
    if (this.enviando() || !this.store.valido()) return;
    this.enviando.set('confirmar');
    this.errorEnvio.set(null);
    try {
      const comida = await firstValueFrom(this.analisis.confirmar(this.id(), this.store.aRequest()));
      const tipo = ETIQUETAS_TIPO_COMIDA[comida.tipoComida ?? this.store.tipoComida()];
      this.toasts.exito(`${tipo} guardada · ${formatearNumero(comida.totales.kcal)} kcal`, undefined, {
        texto: 'Deshacer',
        ejecutar: () =>
          this.comidas.eliminar(comida.id).subscribe({
            next: () => this.toasts.info('Comida eliminada'),
            error: (e: unknown) => this.toasts.error('No hemos podido deshacer', aApiError(e).detalle),
          }),
      });
      await this.router.navigateByUrl('/inicio');
    } catch (e) {
      this.alFallarEnvio(e);
    } finally {
      this.enviando.set(null);
    }
  }

  protected async descartar(): Promise<void> {
    if (this.enviando()) return;
    const ok = await this.confirmacion.confirmar({
      titulo: '¿Descartar el análisis?',
      mensaje: 'No se guardará ninguna comida y la foto se borrará más adelante.',
      textoConfirmar: 'Descartar',
      peligro: true,
    });
    if (!ok) return;
    this.enviando.set('descartar');
    this.errorEnvio.set(null);
    try {
      await firstValueFrom(this.analisis.descartar(this.id()));
      this.toasts.info('Análisis descartado');
      await this.router.navigateByUrl('/inicio');
    } catch (e) {
      this.alFallarEnvio(e);
    } finally {
      this.enviando.set(null);
    }
  }

  private alFallarEnvio(e: unknown): void {
    const error = aApiError(e);
    if (error.status === 409) {
      // Ya no se puede confirmar o descartar (p. ej. desde otra pestaña): se muestra su estado real.
      this.toasts.info('El análisis ha cambiado', 'Lo hemos vuelto a cargar.');
      void this.cargar();
      return;
    }
    if (esConsentimientoRevocado(error)) {
      this.estado.set('revocado');
      return;
    }
    this.errorEnvio.set(error.errores.length ? error.errores.map((x) => x.mensaje).join(' ') : error.detalle);
  }

  private parar(): void {
    this.sondeo?.unsubscribe();
    this.sondeo = null;
  }
}

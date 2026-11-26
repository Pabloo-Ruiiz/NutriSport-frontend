import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { Subscription, TimeoutError, firstValueFrom, from, of, switchMap, tap } from 'rxjs';

import {
  ConsentimientoRevocadoComponent,
  esConsentimientoRevocado,
} from '@core/layout/consentimiento-revocado.component';
import type { AnalisisResponse, TipoComida } from '@core/models';
import { ETIQUETAS_TIPO_COMIDA } from '@core/models/etiquetas';
import { AnalisisService } from '@core/services/analisis.service';
import { AuthService } from '@core/services/auth.service';
import { CuentaService } from '@core/services/cuenta.service';
import { type ApiError, aApiError } from '@core/util/api-error';
import { EsperaLimite } from '@core/util/espera-limite';
import { aHoraApi, hoyLocal, sumarDias } from '@core/util/fechas';
import { ErrorImagen, comprimirAJpeg, validarArchivo } from '@core/util/imagen';
import { formatearNumero } from '@shared/pipes/formato';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsBadgeComponent } from '@shared/ui/feedback/badge.component';
import { NsDisclaimerComponent } from '@shared/ui/feedback/disclaimer.component';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import type { NsOpcion } from '@shared/ui/form/control-valor';
import { NsDropzoneComponent } from '@shared/ui/form/dropzone.component';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { NsInputDirective } from '@shared/ui/form/input.directive';
import { NsSelectComponent } from '@shared/ui/form/select.component';
import { NsStepperComponent } from '@shared/ui/nav/stepper.component';
import { tipoPorHora } from '../../comidas/registro/comida-editor.store';
import {
  FasesAnalisisComponent,
  type AlimentoDetectado,
  type MomentoAnalisis,
  ProgresoAnalisisComponent,
  TEXTOS_MOMENTO,
} from './progreso-analisis.component';

const TIPOS = Object.keys(ETIQUETAS_TIPO_COMIDA) as TipoComida[];
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
/** Longitud máxima de la descripción del plato. */
export const MAX_DESCRIPCION = 500;
/**
 * Análisis de fotos por día. El backend no expone cuántos quedan (Annex B, punto 8 de la guía):
 * se muestra el límite como texto y el 429 avisa al alcanzarlo.
 */
export const LIMITE_ANALISIS_DIARIO = 20;
/** Tiempo (ms) que se ven los alimentos detectados sobre la foto antes de pasar a la revisión. */
export const PAUSA_DETECTADOS = 1200;

type Paso = 'foto' | 'analisis' | 'error';

/**
 * Fallo del análisis que lleva al estado de error:
 * - fallido: el análisis terminó FALLIDO (errorMensaje del backend).
 * - servicio: 503, el servicio de IA no responde.
 * - timeout: han pasado 60 s sin terminar ("Seguir esperando").
 * - otro: cualquier otro error al consultar.
 */
interface Fallo {
  tipo: 'fallido' | 'servicio' | 'timeout' | 'otro';
  titulo: string;
  mensaje: string;
}

const MENSAJE_SERVICIO = 'No hemos podido analizar la foto. Puedes reintentarlo o registrar la comida manualmente.';

/** Consejos para una buena foto (DESIGN.md §7.7). */
const CONSEJOS = [
  { icono: 'sun', titulo: 'Luz natural', texto: 'Evita sombras fuertes y flash.' },
  { icono: 'focus', titulo: 'Vista cenital', texto: 'Fotografía desde arriba, a unos 40 cm.' },
  { icono: 'image', titulo: 'Plato completo', texto: 'Que se vea entero y sin recortar.' },
  { icono: 'utensils', titulo: 'Un plato por foto', texto: 'Analiza cada plato por separado.' },
] as const;

/**
 * Registro de una comida con foto (DESIGN.md §7.7, docs/api/analisis.md §7.1) en /comidas/foto.
 * Admite ?tipoComida=…&fecha=… (desde el dashboard o el registro manual).
 *
 * 1. Foto: dropzone o previsualización con "Cambiar foto", y al lado tipo de comida (sugerido por la
 *    hora mientras no se elija), fecha, hora y descripción opcional, y el límite diario como texto
 *    (no hay endpoint de uso). Sin email verificado, aviso con "Reenviar correo" y "Analizar"
 *    desactivado.
 * 2. Análisis: comprime a JPEG, sube y sigue el estado cada 1,5 s; la foto con el escaneo y las
 *    fases, y los datos del paso 1 en solo lectura con "Editar y reanalizar".
 * 3. COMPLETADO → los alimentos detectados sobre la foto durante 1,2 s y después
 *    /comidas/foto/{id}?fecha=…&hora=… (revisión). FALLIDO, 503, timeout u otros
 *    errores → estado de error con "Reintentar" (vuelve al paso 1 con la misma foto).
 *
 * 413/415 y el límite diario (429) vuelven al paso 1 con el mensaje. "Continuar manualmente" lleva a
 * /comidas/nueva con el tipo y la fecha.
 */
@Component({
  selector: 'app-foto-comida',
  imports: [
    FormsModule,
    RouterLink,
    LucideDynamicIcon,
    ConsentimientoRevocadoComponent,
    NsAlertComponent,
    NsBadgeComponent,
    NsButtonComponent,
    NsDisclaimerComponent,
    NsDropzoneComponent,
    NsFormFieldComponent,
    NsInputDirective,
    NsSelectComponent,
    NsStepperComponent,
    FasesAnalisisComponent,
    ProgresoAnalisisComponent,
  ],
  templateUrl: './foto-comida.component.html',
  styleUrl: './foto-comida.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FotoComidaComponent implements OnInit {
  /** Query params. */
  readonly tipoComida = input<string>();
  readonly fecha = input<string>();

  protected readonly auth = inject(AuthService);
  private readonly analisis = inject(AnalisisService);
  private readonly cuenta = inject(CuentaService);
  private readonly toasts = inject(NsToastService);
  private readonly router = inject(Router);

  protected readonly pasos = ['Foto', 'Análisis', 'Revisión'];
  protected readonly consejos = CONSEJOS;
  protected readonly maxDescripcion = MAX_DESCRIPCION;
  protected readonly limiteDiario = LIMITE_ANALISIS_DIARIO;
  protected readonly fechaMaxima = sumarDias(hoyLocal(), 1);
  protected readonly tipos: NsOpcion<TipoComida>[] = TIPOS.map((valor) => ({
    valor,
    etiqueta: ETIQUETAS_TIPO_COMIDA[valor],
  }));

  // ---- Paso 1: foto y datos
  protected readonly foto = signal<File | null>(null);
  protected readonly previsualizacion = signal<string | null>(null);
  protected readonly datosFecha = signal(hoyLocal());
  protected readonly datosHora = signal(aHoraApi(new Date()));
  protected readonly datosTipo = signal<TipoComida>(tipoPorHora(this.datosHora()));
  private readonly tipoElegido = signal(false);
  protected readonly descripcion = signal('');

  /** Error de la foto (tipo, tamaño, 413/415) en el paso 1. */
  protected readonly errorFoto = signal<string | null>(null);
  /** Límite diario alcanzado (429). */
  protected readonly avisoLimite = signal<string | null>(null);

  // ---- Paso 2 y error
  protected readonly paso = signal<Paso>('foto');
  protected readonly momento = signal<MomentoAnalisis>('preparando');
  protected readonly fallo = signal<Fallo | null>(null);
  protected readonly revocado = signal(false);
  /** Candidatos del análisis COMPLETADO, sobre la foto antes de pasar a la revisión. */
  protected readonly detectados = signal<readonly AlimentoDetectado[]>([]);
  private analisisId: string | null = null;
  private sondeo: Subscription | null = null;
  private pausa: ReturnType<typeof setTimeout> | null = null;

  // ---- Email sin verificar
  protected readonly reenviando = signal(false);
  protected readonly espera = new EsperaLimite();

  protected readonly indicePaso = computed(() => (this.paso() === 'foto' ? 0 : 1));
  protected readonly puedeAnalizar = computed(() => !!this.foto() && this.auth.emailVerificado());
  protected readonly etiquetaTipo = computed(() => ETIQUETAS_TIPO_COMIDA[this.datosTipo()]);
  protected readonly infoFoto = computed(() => {
    const foto = this.foto();
    if (!foto) return '';
    const tamano =
      foto.size < 1024 * 1024
        ? `${formatearNumero(Math.max(1, Math.round(foto.size / 1024)))} KB`
        : `${formatearNumero(foto.size / (1024 * 1024), 1)} MB`;
    return `${foto.name} · ${tamano}`;
  });
  protected readonly rutaManual = computed(() => ({ tipoComida: this.datosTipo(), fecha: this.datosFecha() }));

  /** Texto para aria-live: el estado del análisis o su fallo. */
  protected readonly anuncio = computed(() => {
    switch (this.paso()) {
      case 'analisis': {
        const n = this.detectados().length;
        return n
          ? `${n} ${n === 1 ? 'alimento detectado' : 'alimentos detectados'}. ${TEXTOS_MOMENTO[this.momento()]}`
          : TEXTOS_MOMENTO[this.momento()];
      }
      case 'error':
        return this.fallo()?.titulo ?? '';
      default:
        return '';
    }
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.parar();
      this.revocarPrevisualizacion();
    });
  }

  ngOnInit(): void {
    const fecha = this.fecha();
    if (fecha && FECHA.test(fecha) && fecha <= this.fechaMaxima) this.datosFecha.set(fecha);
    const tipo = this.tipoComida();
    if (tipo && (TIPOS as string[]).includes(tipo)) {
      this.datosTipo.set(tipo as TipoComida);
      this.tipoElegido.set(true);
    }
  }

  // ---- Paso 1

  protected elegirFoto(archivo: File): void {
    const error = validarArchivo(archivo);
    if (error) {
      this.errorFoto.set(error);
      return;
    }
    this.errorFoto.set(null);
    this.revocarPrevisualizacion();
    this.foto.set(archivo);
    this.previsualizacion.set(URL.createObjectURL(archivo));
  }

  protected cambiarFoto(): void {
    this.revocarPrevisualizacion();
    this.foto.set(null);
    this.errorFoto.set(null);
  }

  protected cambiarHora(hora: string): void {
    this.datosHora.set(hora);
    if (!this.tipoElegido() && hora) this.datosTipo.set(tipoPorHora(hora));
  }

  protected cambiarTipo(tipo: TipoComida): void {
    this.datosTipo.set(tipo);
    this.tipoElegido.set(true);
  }

  protected async reenviarCorreo(): Promise<void> {
    const email = this.auth.cuenta()?.email;
    if (!email || this.reenviando() || this.espera.activa()) return;
    this.reenviando.set(true);
    this.espera.limpiar();
    try {
      await firstValueFrom(this.auth.reenviarVerificacion(email));
      this.toasts.exito('Correo reenviado', `Revisa la bandeja de ${email}. El enlace caduca en 24 horas.`);
    } catch (e) {
      const error = aApiError(e);
      if (error.status === 429) this.espera.iniciar(error.retryAfterSegundos);
      else this.toasts.error('No hemos podido reenviar el correo', error.detalle);
    } finally {
      this.reenviando.set(false);
    }
  }

  // ---- Paso 2

  protected analizar(): void {
    const foto = this.foto();
    if (!foto || !this.puedeAnalizar() || this.paso() === 'analisis') return;

    this.errorFoto.set(null);
    this.avisoLimite.set(null);
    this.fallo.set(null);
    this.detectados.set([]);
    this.analisisId = null;
    this.momento.set('preparando');
    this.paso.set('analisis');

    const descripcion = this.descripcion().trim().slice(0, MAX_DESCRIPCION);
    this.seguirCon(
      from(comprimirAJpeg(foto)).pipe(
        switchMap((jpeg) => this.analisis.subir(jpeg, this.datosTipo(), descripcion || null)),
        tap((analisis) => {
          this.analisisId = analisis.id;
          this.momento.set('detectando');
        }),
        switchMap((analisis) => (enCurso(analisis) ? this.analisis.seguir(analisis.id) : of(analisis))),
      ),
    );
  }

  /** "Seguir esperando" tras el timeout: vuelve a consultar el mismo análisis. */
  protected seguirEsperando(): void {
    const id = this.analisisId;
    if (!id) return;
    this.fallo.set(null);
    this.momento.set('detectando');
    this.paso.set('analisis');
    this.seguirCon(this.analisis.seguir(id));
  }

  /**
   * "Editar y reanalizar": deja de seguir el análisis en curso y vuelve al paso 1 con la foto y los
   * datos. El backend no permite cancelarlo (descartar solo admite COMPLETADO o FALLIDO), así que
   * queda abandonado, y volver a analizar gasta otro análisis del día.
   */
  protected editarYReanalizar(): void {
    this.parar();
    this.analisisId = null;
    this.detectados.set([]);
    this.paso.set('foto');
  }

  /** "Reintentar": vuelve al paso 1 con la misma foto y los mismos datos. */
  protected reintentar(): void {
    this.parar();
    this.fallo.set(null);
    this.paso.set('foto');
  }

  private seguirCon(origen: ReturnType<AnalisisService['seguir']>): void {
    this.parar();
    this.sondeo = origen.subscribe({
      next: (analisis) => this.alRecibir(analisis),
      error: (e: unknown) => this.alFallar(e),
    });
  }

  private alRecibir(analisis: AnalisisResponse): void {
    switch (analisis.estado) {
      case 'PENDIENTE':
      case 'PROCESANDO':
        this.momento.set('detectando');
        return;
      case 'COMPLETADO': {
        this.momento.set('calculando');
        const detectados = analisis.candidatos.map((c) => ({
          nombre: c.nombreDetectado,
          confianza: c.confianza,
        }));
        this.detectados.set(detectados);
        // Con alimentos, una pausa breve para verlos sobre la foto; sin ellos, directamente.
        if (detectados.length) this.pausa = setTimeout(() => this.irARevision(analisis.id), PAUSA_DETECTADOS);
        else this.irARevision(analisis.id);
        return;
      }
      case 'FALLIDO':
        this.mostrarFallo({
          tipo: 'fallido',
          titulo: 'No hemos detectado alimentos',
          mensaje: analisis.errorMensaje || MENSAJE_SERVICIO,
        });
        return;
      default:
        // CONFIRMADO o DESCARTADO: ya no se puede revisar aquí.
        this.mostrarFallo({ tipo: 'otro', titulo: 'No hemos podido analizar la foto', mensaje: MENSAJE_SERVICIO });
    }
  }

  private alFallar(e: unknown): void {
    if (e instanceof TimeoutError) {
      this.mostrarFallo({
        tipo: 'timeout',
        titulo: 'El análisis está tardando más de lo habitual',
        mensaje: MENSAJE_SERVICIO,
      });
      return;
    }
    if (e instanceof ErrorImagen) {
      this.volverAFoto(() => this.errorFoto.set(e.message));
      return;
    }
    this.mostrarErrorApi(aApiError(e));
  }

  private mostrarErrorApi(error: ApiError): void {
    if (esConsentimientoRevocado(error)) {
      this.parar();
      this.revocado.set(true);
      return;
    }
    if (
      error.status === 413 ||
      error.status === 415 ||
      error.esCodigo('ARCHIVO_DEMASIADO_GRANDE', 'ARCHIVO_NO_VALIDO')
    ) {
      // Sin Problem Details (p. ej. un 413 del proxy) se usa un texto propio.
      const mensaje = error.esCodigo('ARCHIVO_DEMASIADO_GRANDE', 'ARCHIVO_NO_VALIDO')
        ? error.detalle
        : error.status === 413
          ? 'La imagen supera los 10 MB o los 40 megapíxeles.'
          : 'Formato no admitido: usa una foto JPEG o PNG.';
      this.volverAFoto(() => this.errorFoto.set(mensaje));
      return;
    }
    if (error.status === 429) {
      this.volverAFoto(() =>
        this.avisoLimite.set(
          `Has llegado al límite de ${LIMITE_ANALISIS_DIARIO} análisis de hoy. ${error.mensajeEspera()}`,
        ),
      );
      return;
    }
    if (error.esCodigo('EMAIL_NO_VERIFICADO')) {
      // La cuenta en memoria decía lo contrario: se recarga para mostrar el aviso.
      this.volverAFoto(() => this.cuenta.obtener().subscribe({ error: () => undefined }));
      return;
    }
    if (error.status === 503) {
      this.mostrarFallo({ tipo: 'servicio', titulo: 'No hemos podido analizar la foto', mensaje: MENSAJE_SERVICIO });
      return;
    }
    this.mostrarFallo({ tipo: 'otro', titulo: 'No hemos podido analizar la foto', mensaje: error.detalle });
  }

  private volverAFoto(aplicar: () => void): void {
    this.parar();
    this.paso.set('foto');
    aplicar();
  }

  private mostrarFallo(fallo: Fallo): void {
    this.parar();
    this.fallo.set(fallo);
    this.paso.set('error');
  }

  private irARevision(id: string): void {
    this.pausa = null;
    void this.router.navigate(['/comidas/foto', id], {
      queryParams: { fecha: this.datosFecha(), hora: this.datosHora() || null },
    });
  }

  private parar(): void {
    this.sondeo?.unsubscribe();
    this.sondeo = null;
    if (this.pausa !== null) clearTimeout(this.pausa);
    this.pausa = null;
  }

  private revocarPrevisualizacion(): void {
    const url = this.previsualizacion();
    if (url) URL.revokeObjectURL(url);
    this.previsualizacion.set(null);
  }
}

function enCurso(analisis: AnalisisResponse): boolean {
  return analisis.estado === 'PENDIENTE' || analisis.estado === 'PROCESANDO';
}

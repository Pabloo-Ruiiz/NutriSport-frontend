import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { NsButtonComponent } from '../button/button.component';

export type ErrorEscaner = 'permiso-denegado' | 'sin-camara' | 'no-soportado';
interface DetectorCodigos {
  detect(video: HTMLVideoElement): Promise<{ rawValue: string }[]>;
}
interface ConstructorDetector {
  new (opciones: { formats: string[] }): DetectorCodigos;
  getSupportedFormats(): Promise<string[]>;
}
const FORMATOS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];

@Component({
  selector: 'ns-barcode-scanner',
  imports: [NsButtonComponent],
  templateUrl: './barcode-scanner.component.html',
  styleUrl: './barcode-scanner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NsBarcodeScannerComponent implements OnDestroy {
  readonly detectado = output<string>();
  readonly error = output<ErrorEscaner>();
  protected readonly conLinterna = signal(false);
  protected readonly linterna = signal(false);
  protected readonly avisoLinterna = signal('');
  private readonly video = viewChild.required<ElementRef<HTMLVideoElement>>('video');
  private flujo: MediaStream | null = null;
  private controles: { stop(): void } | null = null;
  private temporizador: ReturnType<typeof setInterval> | null = null;
  private activo = true;
  private leyendo = false;

  constructor() {
    afterNextRender(() => void this.iniciar());
  }

  private async iniciar(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.fallar('no-soportado');
      return;
    }
    try {
      const flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (!this.activo) {
        flujo.getTracks().forEach((pista) => pista.stop());
        return;
      }
      this.flujo = flujo;
      const pista = flujo.getVideoTracks()[0];
      const capacidades = pista?.getCapabilities?.() as (MediaTrackCapabilities & { torch?: boolean }) | undefined;
      this.conLinterna.set(!!capacidades?.torch);
      const video = this.video().nativeElement;
      video.srcObject = flujo;
      await video.play();
      if (!this.activo) return;
      const Constructor = (window as Window & { BarcodeDetector?: ConstructorDetector }).BarcodeDetector;
      let detector: DetectorCodigos | null = null;
      if (Constructor) {
        try {
          const formatos = await Constructor.getSupportedFormats();
          if (FORMATOS.every((formato) => formatos.includes(formato)))
            detector = new Constructor({ formats: FORMATOS });
        } catch {
          /* Si la API nativa no está operativa, se usa ZXing. */
        }
      }
      if (!this.activo) return;
      if (detector) {
        this.temporizador = setInterval(() => void this.leer(detector!, video), 300);
      } else {
        await this.iniciarAlternativa(flujo, video);
      }
    } catch (e) {
      if (!this.activo) return;
      const nombre = typeof e === 'object' && e !== null && 'name' in e ? String(e.name) : '';
      this.fallar(
        nombre === 'NotAllowedError' || nombre === 'SecurityError'
          ? 'permiso-denegado'
          : ['NotFoundError', 'NotReadableError', 'OverconstrainedError', 'AbortError'].includes(nombre)
            ? 'sin-camara'
            : 'no-soportado',
      );
    }
  }

  private async iniciarAlternativa(flujo: MediaStream, video: HTMLVideoElement): Promise<void> {
    const { BrowserMultiFormatReader } = await import('@zxing/browser');
    if (!this.activo) return;
    const lector = new BrowserMultiFormatReader(undefined, {
      delayBetweenScanAttempts: 300,
      delayBetweenScanSuccess: 300,
    });
    const controles = await lector.decodeFromStream(flujo, video, (resultado, _error, control) => {
      if (resultado && this.aceptar(resultado.getText())) control.stop();
    });
    if (!this.activo) controles.stop();
    else this.controles = controles;
  }

  private async leer(detector: DetectorCodigos, video: HTMLVideoElement): Promise<void> {
    if (!this.activo || this.leyendo || video.readyState < 2) return;
    this.leyendo = true;
    try {
      for (const resultado of await detector.detect(video)) if (this.aceptar(resultado.rawValue)) break;
    } catch {
      if (this.activo) this.fallar('no-soportado');
    } finally {
      this.leyendo = false;
    }
  }

  private aceptar(codigo: string): boolean {
    if (!this.activo || !/^\d{8,14}$/.test(codigo)) return false;
    this.detener();
    try {
      navigator.vibrate?.(100);
    } catch {
      /* La vibración es opcional. */
    }
    this.detectado.emit(codigo);
    return true;
  }

  protected async alternarLinterna(): Promise<void> {
    const pista = this.flujo?.getVideoTracks()[0];
    if (!pista || !this.activo) return;
    try {
      const encendida = !this.linterna();
      await pista.applyConstraints({ advanced: [{ torch: encendida } as MediaTrackConstraintSet] });
      this.linterna.set(encendida);
    } catch {
      this.avisoLinterna.set('No hemos podido cambiar la linterna.');
    }
  }

  private fallar(error: ErrorEscaner): void {
    this.detener();
    this.error.emit(error);
  }

  private detener(): void {
    this.activo = false;
    if (this.temporizador !== null) clearInterval(this.temporizador);
    this.temporizador = null;
    this.controles?.stop();
    this.controles = null;
    this.flujo?.getTracks().forEach((pista) => pista.stop());
    this.flujo = null;
    this.conLinterna.set(false);
    this.video().nativeElement.srcObject = null;
  }

  ngOnDestroy(): void {
    this.detener();
  }
}

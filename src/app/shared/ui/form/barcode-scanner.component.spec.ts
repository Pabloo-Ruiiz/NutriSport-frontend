import { TestBed } from '@angular/core/testing';
import { NsBarcodeScannerComponent } from './barcode-scanner.component';

const alternativa = vi.hoisted(() => ({ iniciar: vi.fn(), parar: vi.fn() }));
vi.mock('@zxing/browser', () => ({
  BrowserMultiFormatReader: class {
    decodeFromStream = alternativa.iniciar;
  },
}));

let parar: ReturnType<typeof vi.fn>;
let obtener: ReturnType<typeof vi.fn>;
let detectar: ReturnType<typeof vi.fn>;
let flujo: MediaStream;
beforeEach(() => {
  parar = vi.fn();
  detectar = vi.fn(async () => [{ rawValue: '8412345678905' }]);
  const pista = {
    stop: parar,
    getCapabilities: () => ({ torch: true }),
    applyConstraints: vi.fn(async () => undefined),
  };
  flujo = { getTracks: () => [pista], getVideoTracks: () => [pista] } as unknown as MediaStream;
  obtener = vi.fn(async () => flujo);
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: obtener }, vibrate: vi.fn() });
  vi.stubGlobal(
    'BarcodeDetector',
    class {
      static getSupportedFormats = async () => ['ean_13', 'ean_8', 'upc_a', 'upc_e'];
      detect = detectar;
    },
  );
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get').mockReturnValue(2);
  alternativa.iniciar.mockReset().mockResolvedValue({ stop: alternativa.parar });
  alternativa.parar.mockReset();
});
afterEach(() => {
  TestBed.resetTestingModule();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('detecta una sola vez, vibra y libera la cámara', async () => {
  const f = TestBed.createComponent(NsBarcodeScannerComponent);
  const emitir = vi.fn();
  f.componentInstance.detectado.subscribe(emitir);
  f.detectChanges();
  await f.whenStable();
  expect(obtener).toHaveBeenCalledWith({ video: { facingMode: 'environment' } });
  await vi.waitFor(() => expect(emitir).toHaveBeenCalledWith('8412345678905'));
  expect(emitir).toHaveBeenCalledTimes(1);
  expect(parar).toHaveBeenCalled();
  expect(navigator.vibrate).toHaveBeenCalledWith(100);
  expect(alternativa.iniciar).not.toHaveBeenCalled();
});

it('usa ZXing cuando falta alguno de los formatos nativos y para al destruirse', async () => {
  vi.stubGlobal(
    'BarcodeDetector',
    class {
      static getSupportedFormats = async () => ['ean_13'];
    },
  );
  const f = TestBed.createComponent(NsBarcodeScannerComponent);
  f.detectChanges();
  await f.whenStable();
  await vi.waitFor(() => expect(alternativa.iniciar).toHaveBeenCalled());
  f.destroy();
  expect(alternativa.parar).toHaveBeenCalled();
  expect(parar).toHaveBeenCalled();
});

it('emite permiso-denegado sin continuar leyendo', async () => {
  obtener.mockRejectedValue(new DOMException('Denegado', 'NotAllowedError'));
  const f = TestBed.createComponent(NsBarcodeScannerComponent);
  const error = vi.fn();
  f.componentInstance.error.subscribe(error);
  f.detectChanges();
  await f.whenStable();
  await vi.waitFor(() => expect(error).toHaveBeenCalledWith('permiso-denegado'));
  expect(detectar).not.toHaveBeenCalled();
});

it('detiene las pistas que llegan después de destruir el componente', async () => {
  let resolver!: (flujo: MediaStream) => void;
  obtener.mockReturnValue(new Promise<MediaStream>((resolve) => (resolver = resolve)));
  const f = TestBed.createComponent(NsBarcodeScannerComponent);
  f.detectChanges();
  await vi.waitFor(() => expect(obtener).toHaveBeenCalled());
  f.destroy();
  resolver(flujo);
  await Promise.resolve();
  expect(parar).toHaveBeenCalled();
  expect(detectar).not.toHaveBeenCalled();
});

it('aplica la restricción de linterna cuando la pista la admite', async () => {
  detectar.mockResolvedValue([]);
  const f = TestBed.createComponent(NsBarcodeScannerComponent);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  const boton: HTMLButtonElement = f.nativeElement.querySelector('button');
  expect(boton.textContent).toContain('Encender linterna');
  boton.click();
  await f.whenStable();
  f.detectChanges();
  expect(flujo.getVideoTracks()[0].applyConstraints).toHaveBeenCalledWith({ advanced: [{ torch: true }] });
  expect(boton.getAttribute('aria-pressed')).toBe('true');
});

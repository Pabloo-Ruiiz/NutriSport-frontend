import { TAMANO_MAX_IMAGEN, comprimirAJpeg, validarArchivo } from './imagen';

function archivo(tipo: string, tamano = 1000): File {
  const f = new File(['x'], 'foto', { type: tipo });
  Object.defineProperty(f, 'size', { value: tamano });
  return f;
}

/** Canvas simulado: registra lo que se dibuja y devuelve un Blob JPEG. */
function simularCanvas() {
  const ctx = { fillStyle: '', imageSmoothingQuality: '', fillRect: vi.fn(), drawImage: vi.fn() };
  const creados: { ancho: number; alto: number; opciones?: ImageEncodeOptions }[] = [];
  class OffscreenCanvasFalso {
    constructor(
      readonly width: number,
      readonly height: number,
    ) {
      creados.push({ ancho: width, alto: height });
    }
    getContext() {
      return ctx;
    }
    convertToBlob(opciones: ImageEncodeOptions) {
      creados.at(-1)!.opciones = opciones;
      return Promise.resolve(new Blob(['jpeg'], { type: 'image/jpeg' }));
    }
  }
  vi.stubGlobal('OffscreenCanvas', OffscreenCanvasFalso);
  return { ctx, creados };
}

function simularBitmap(width: number, height: number) {
  const bitmap = { width, height, close: vi.fn() };
  const crear = vi.fn().mockResolvedValue(bitmap);
  vi.stubGlobal('createImageBitmap', crear);
  return { bitmap, crear };
}

afterEach(() => vi.unstubAllGlobals());

describe('validarArchivo', () => {
  it('acepta imágenes de hasta 10 MB', () => {
    expect(validarArchivo(archivo('image/jpeg'))).toBeNull();
    expect(validarArchivo(archivo('image/heic', TAMANO_MAX_IMAGEN))).toBeNull();
  });

  it('rechaza otros tipos, archivos vacíos y los de más de 10 MB', () => {
    expect(validarArchivo(archivo('application/pdf'))).toBe('El archivo no es una imagen.');
    expect(validarArchivo(archivo('image/png', 0))).toBe('La imagen está vacía.');
    expect(validarArchivo(archivo('image/png', TAMANO_MAX_IMAGEN + 1))).toBe('La imagen supera los 10 MB.');
  });
});

describe('comprimirAJpeg', () => {
  it('reduce el lado mayor a 2048 px, respeta la orientación EXIF y codifica JPEG al 0,85', async () => {
    const { ctx, creados } = simularCanvas();
    const { bitmap, crear } = simularBitmap(3000, 4000);

    const blob = await comprimirAJpeg(archivo('image/jpeg'));

    expect(blob.type).toBe('image/jpeg');
    expect(crear).toHaveBeenCalledWith(expect.any(File), { imageOrientation: 'from-image' });
    expect(creados).toEqual([{ ancho: 1536, alto: 2048, opciones: { type: 'image/jpeg', quality: 0.85 } }]);
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1536, 2048);
    expect(ctx.drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 1536, 2048);
    expect(bitmap.close).toHaveBeenCalled();
  });

  it('no amplía las imágenes pequeñas y admite otras opciones', async () => {
    const { creados } = simularCanvas();
    simularBitmap(800, 600);
    await comprimirAJpeg(archivo('image/png'), { calidad: 0.5 });
    expect(creados[0]).toEqual({ ancho: 800, alto: 600, opciones: { type: 'image/jpeg', quality: 0.5 } });

    simularBitmap(800, 600);
    await comprimirAJpeg(archivo('image/png'), { ladoMax: 400 });
    expect(creados[1]).toMatchObject({ ancho: 400, alto: 300 });
  });

  it('sin OffscreenCanvas usa un <canvas>', async () => {
    vi.stubGlobal('OffscreenCanvas', undefined);
    simularBitmap(100, 50);
    const ctx = { fillRect: vi.fn(), drawImage: vi.fn() };
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
    const toBlob = vi.spyOn(canvas, 'toBlob').mockImplementation((cb, tipo) => cb(new Blob(['jpeg'], { type: tipo })));
    vi.spyOn(document, 'createElement').mockReturnValueOnce(canvas);

    const blob = await comprimirAJpeg(archivo('image/webp'));

    expect(blob.type).toBe('image/jpeg');
    expect([canvas.width, canvas.height]).toEqual([100, 50]);
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.85);
    vi.restoreAllMocks();
  });

  it('rechaza si no es una imagen o no se puede decodificar', async () => {
    const { crear } = simularBitmap(1, 1);
    await expect(comprimirAJpeg(archivo('text/plain'))).rejects.toThrow('El archivo no es una imagen.');
    expect(crear).not.toHaveBeenCalled();

    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new DOMException('InvalidStateError')));
    await expect(comprimirAJpeg(archivo('image/jpeg'))).rejects.toThrow('El archivo no es una imagen.');
  });
});

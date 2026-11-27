import { descargarBlob, nombreDeContentDisposition } from './descarga';

describe('nombreDeContentDisposition', () => {
  it('lee filename entre comillas (respuesta de GET /cuenta/exportacion)', () => {
    expect(nombreDeContentDisposition('attachment; filename="nutrisport-datos-20261127.json"')).toBe(
      'nutrisport-datos-20261127.json',
    );
  });

  it('lee filename sin comillas y con espacios', () => {
    expect(nombreDeContentDisposition('attachment;filename = datos.json ')).toBe('datos.json');
    expect(nombreDeContentDisposition('ATTACHMENT; FILENAME=datos.json; size=10')).toBe('datos.json');
  });

  it('da prioridad a filename* (RFC 5987) y lo decodifica', () => {
    expect(
      nombreDeContentDisposition(`attachment; filename="datos.json"; filename*=UTF-8''nutrisport-%C3%B1and%C3%BA.json`),
    ).toBe('nutrisport-ñandú.json');
  });

  it('si filename* no se puede decodificar usa filename', () => {
    expect(nombreDeContentDisposition(`attachment; filename*=UTF-8''%E0%A4%A; filename="b.json"`)).toBe('b.json');
  });

  it('respeta las comillas escapadas y quita las rutas', () => {
    expect(nombreDeContentDisposition('attachment; filename="mis \\"datos\\".json"')).toBe('mis "datos".json');
    expect(nombreDeContentDisposition('attachment; filename="../../etc/datos.json"')).toBe('datos.json');
    expect(nombreDeContentDisposition('attachment; filename="C:\\\\tmp\\\\datos.json"')).toBe('datos.json');
  });

  it('null si no hay cabecera o no trae nombre', () => {
    expect(nombreDeContentDisposition(null)).toBeNull();
    expect(nombreDeContentDisposition(undefined)).toBeNull();
    expect(nombreDeContentDisposition('')).toBeNull();
    expect(nombreDeContentDisposition('attachment')).toBeNull();
    expect(nombreDeContentDisposition('attachment; filename=""')).toBeNull();
  });
});

describe('descargarBlob', () => {
  // jsdom no implementa createObjectURL/revokeObjectURL: se ponen y se quitan en cada prueba.
  const originales = { crear: URL.createObjectURL, revocar: URL.revokeObjectURL };
  function simularUrl(url: string) {
    const crear = vi.fn(() => url);
    const revocar = vi.fn();
    URL.createObjectURL = crear;
    URL.revokeObjectURL = revocar;
    return { crear, revocar };
  }

  afterEach(() => {
    URL.createObjectURL = originales.crear;
    URL.revokeObjectURL = originales.revocar;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('hace click en un enlace temporal con la URL del Blob y luego la libera', () => {
    vi.useFakeTimers();
    const { crear, revocar } = simularUrl('blob:nutrisport/1');
    let pulsado: HTMLAnchorElement | null = null;
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      pulsado = this;
      expect(document.body.contains(this)).toBe(true);
    });

    const blob = new Blob(['{}'], { type: 'application/json' });
    descargarBlob(blob, 'nutrisport-datos.json');

    expect(crear).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalledOnce();
    expect(pulsado!.download).toBe('nutrisport-datos.json');
    expect(pulsado!.getAttribute('href')).toBe('blob:nutrisport/1');
    expect(document.body.contains(pulsado)).toBe(false);

    expect(revocar).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revocar).toHaveBeenCalledWith('blob:nutrisport/1');
  });

  it('libera la URL aunque el click falle', () => {
    vi.useFakeTimers();
    const { revocar } = simularUrl('blob:x');
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      throw new Error('bloqueado');
    });

    expect(() => descargarBlob(new Blob(['x']), 'x.json')).toThrow('bloqueado');
    expect(document.querySelector('a[download]')).toBeNull();
    vi.runAllTimers();
    expect(revocar).toHaveBeenCalledWith('blob:x');
  });
});

import { ACCIONES_REGISTRO, BARRA_INFERIOR, NAVEGACION, gruposDrawer, gruposVisibles, iniciales } from './navegacion';

const rutas = (grupos: { elementos: { ruta: string }[] }[]) => grupos.flatMap((g) => g.elementos.map((e) => e.ruta));

describe('navegacion', () => {
  it('los grupos del MVP, en el orden de DESIGN.md §6.2', () => {
    expect(NAVEGACION.map((g) => g.titulo)).toEqual(['Principal', 'Rendimiento', 'Cuenta', 'Administración']);
    expect(rutas([...NAVEGACION])).toEqual([
      '/inicio',
      '/comidas',
      '/mis-alimentos',
      '/productos',
      '/planificador',
      '/compra',
      '/recetas',
      '/actividad',
      '/perfil',
      '/configuracion',
      '/admin/usuarios',
      '/admin/catalogo',
      '/admin/ingredientes',
    ]);
  });

  it('gruposVisibles oculta Administración a quien no es ADMIN', () => {
    expect(gruposVisibles(false).map((g) => g.titulo)).toEqual(['Principal', 'Rendimiento', 'Cuenta']);
    expect(gruposVisibles(true).map((g) => g.titulo)).toContain('Administración');
  });

  it('la barra inferior con la Ampliación es Inicio · Comidas · [Registrar] · Plan · Actividad', () => {
    expect(BARRA_INFERIOR.izquierda.map((e) => e.etiqueta)).toEqual(['Inicio', 'Comidas']);
    expect(BARRA_INFERIOR.derecha.map((e) => e.etiqueta)).toEqual(['Plan', 'Actividad']);
    expect(BARRA_INFERIOR.derecha[0].ruta).toBe('/planificador');
    expect(ACCIONES_REGISTRO.map((a) => a.etiqueta)).toEqual([
      'Foto del plato',
      'Buscar alimento',
      'Escanear código',
      'Desde mi plan',
    ]);
  });

  it('el drawer lleva lo que no está en la barra inferior', () => {
    expect(rutas(gruposDrawer(false))).toEqual([
      '/mis-alimentos',
      '/productos',
      '/compra',
      '/recetas',
      '/perfil',
      '/configuracion',
    ]);
    expect(rutas(gruposDrawer(true))).toEqual([
      '/mis-alimentos',
      '/productos',
      '/compra',
      '/recetas',
      '/perfil',
      '/configuracion',
      '/admin/usuarios',
      '/admin/catalogo',
      '/admin/ingredientes',
    ]);
    expect(gruposDrawer(false).map((g) => g.titulo)).toEqual(['Principal', 'Cuenta']);
  });

  it('iniciales', () => {
    expect(iniciales('Álex Romero')).toBe('ÁR');
    expect(iniciales('  ana  ')).toBe('A');
    expect(iniciales('María José García López')).toBe('ML');
    expect(iniciales('')).toBe('?');
    expect(iniciales(null)).toBe('?');
  });
});

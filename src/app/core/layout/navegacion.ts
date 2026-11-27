/**
 * Navegación de la aplicación (DESIGN.md §6.2 y §6.4). Una sola fuente para la sidebar, el drawer
 * móvil, la barra inferior y el bottom sheet de "Registrar".
 *
 * Los elementos de la Ampliación están comentados: se activan en su paso, junto con su ruta y,
 * si su icono aún no está, añadiéndolo a shared/design/iconos.ts.
 */

export interface ElementoNav {
  etiqueta: string;
  ruta: string;
  /** Nombre del icono de Lucide (registrado en shared/design/iconos.ts). */
  icono: string;
  /** true: solo está activo con la ruta exacta (no con sus hijas). */
  exacta?: boolean;
}

export interface GrupoNav {
  titulo: string;
  elementos: ElementoNav[];
  /** Solo se muestra a quien tiene el rol ADMIN. */
  soloAdmin?: boolean;
}

export const INICIO: ElementoNav = { etiqueta: 'Inicio', ruta: '/inicio', icono: 'house' };
export const COMIDAS: ElementoNav = { etiqueta: 'Comidas', ruta: '/comidas', icono: 'utensils' };
export const MIS_ALIMENTOS: ElementoNav = { etiqueta: 'Mis alimentos', ruta: '/mis-alimentos', icono: 'apple' };
export const PRODUCTOS: ElementoNav = { etiqueta: 'Productos', ruta: '/productos', icono: 'scan-barcode' };
export const ACTIVIDAD: ElementoNav = { etiqueta: 'Actividad', ruta: '/actividad', icono: 'activity' };
export const MI_PERFIL: ElementoNav = { etiqueta: 'Mi perfil', ruta: '/perfil', icono: 'user' };
export const CONFIGURACION: ElementoNav = { etiqueta: 'Configuración', ruta: '/configuracion', icono: 'settings' };
export const RECETAS: ElementoNav = { etiqueta: 'Recetas', ruta: '/recetas', icono: 'chef-hat' };
export const PLANIFICADOR: ElementoNav = { etiqueta: 'Planificador', ruta: '/planificador', icono: 'calendar' };

// Ampliación:
// export const COMPRA: ElementoNav = { etiqueta: 'Lista de la compra', ruta: '/compra', icono: 'shopping-basket' };
// export const ESTADISTICAS: ElementoNav = { etiqueta: 'Estadísticas', ruta: '/estadisticas', icono: 'chart-column' };
// export const ASISTENTE: ElementoNav = { etiqueta: 'Asistente IA', ruta: '/asistente', icono: 'sparkles' };

/** Grupos de la sidebar, en orden. */
export const NAVEGACION: readonly GrupoNav[] = [
  {
    titulo: 'Principal',
    elementos: [
      INICIO,
      COMIDAS,
      MIS_ALIMENTOS,
      PRODUCTOS,
      PLANIFICADOR,
      // COMPRA,
      RECETAS,
    ],
  },
  {
    titulo: 'Rendimiento',
    elementos: [
      ACTIVIDAD,
      // ESTADISTICAS,
    ],
  },
  // Ampliación:
  // { titulo: 'Inteligencia', elementos: [ASISTENTE] },
  { titulo: 'Cuenta', elementos: [MI_PERFIL, CONFIGURACION] },
  {
    titulo: 'Administración',
    soloAdmin: true,
    elementos: [
      { etiqueta: 'Usuarios', ruta: '/admin/usuarios', icono: 'users' },
      { etiqueta: 'Catálogo', ruta: '/admin/catalogo', icono: 'library' },
    ],
  },
];

/** Grupos que ve el usuario: los de administración solo si es ADMIN. */
export function gruposVisibles(esAdmin: boolean, grupos: readonly GrupoNav[] = NAVEGACION): GrupoNav[] {
  return grupos.filter((grupo) => !grupo.soloAdmin || esAdmin);
}

/**
 * Barra inferior en móvil (§6.4), a los lados del botón central "Registrar".
 * MVP: Inicio · Comidas · [Registrar] · Actividad · Perfil.
 * Ampliación: Inicio · Comidas · [Registrar] · Plan · Asistente (Actividad y Perfil pasan al drawer).
 *
 * Mientras no exista el Asistente, su hueco lo ocupa Actividad; Perfil ya pasa al drawer (también se
 * llega desde el avatar).
 */
export const BARRA_INFERIOR: { izquierda: ElementoNav[]; derecha: ElementoNav[] } = {
  izquierda: [INICIO, COMIDAS],
  derecha: [{ ...PLANIFICADOR, etiqueta: 'Plan' }, ACTIVIDAD],
  // derecha: [{ ...PLANIFICADOR, etiqueta: 'Plan' }, { ...ASISTENTE, etiqueta: 'Asistente' }],
};

/**
 * Drawer de "Más" en móvil: los grupos sin lo que ya está en la barra inferior.
 * Los grupos que se quedan vacíos no se muestran.
 */
export function gruposDrawer(esAdmin: boolean): GrupoNav[] {
  const enBarra = new Set([...BARRA_INFERIOR.izquierda, ...BARRA_INFERIOR.derecha].map((e) => e.ruta));
  return gruposVisibles(esAdmin)
    .map((grupo) => ({ ...grupo, elementos: grupo.elementos.filter((e) => !enBarra.has(e.ruta)) }))
    .filter((grupo) => grupo.elementos.length > 0);
}

export interface AccionRegistro extends ElementoNav {
  descripcion: string;
}

/** Opciones del botón central "Registrar" (bottom sheet en móvil). */
export const ACCIONES_REGISTRO: readonly AccionRegistro[] = [
  {
    etiqueta: 'Foto del plato',
    descripcion: 'La IA estima los alimentos y las cantidades',
    ruta: '/comidas/foto',
    icono: 'camera',
  },
  {
    etiqueta: 'Buscar alimento',
    descripcion: 'Busca en el catálogo y ajusta las cantidades',
    ruta: '/comidas/nueva',
    icono: 'search',
  },
  // Ampliación:
  {
    etiqueta: 'Escanear código',
    descripcion: 'Lee el código de barras del envase',
    ruta: '/escaner',
    icono: 'scan-barcode',
  },
  // { etiqueta: 'Desde mi plan', descripcion: 'Marca una comida planificada para hoy', ruta: '/planificador', icono: 'calendar' },
];

/** Ruta del botón "Registrar comida" de la topbar. */
export const RUTA_REGISTRAR_COMIDA = '/comidas/nueva';

/** Iniciales para el avatar: "Álex Romero" → "ÁR"; "ana" → "A". */
export function iniciales(nombre: string | null | undefined): string {
  const partes = (nombre ?? '').trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  const primera = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primera + ultima).toLocaleUpperCase('es-ES');
}

// Utilidades de la pantalla de usuarios (administración): lectura de los query params y badges.
import type { EstadoUsuario, Rol } from '@core/models';
import type { NsBadgeVariant } from '@shared/ui/feedback/badge.component';

export const TAMANOS_PAGINA = [10, 20, 50, 100] as const;
export const TAMANO_POR_DEFECTO = 20;
/** Columnas por las que se puede ordenar (campos de UsuarioAdminResponse). */
export const CAMPOS_ORDENABLES = ['nombre', 'email', 'ultimoAcceso', 'creadoEn'] as const;
export const ESTADOS: readonly EstadoUsuario[] = ['ACTIVO', 'BLOQUEADO', 'ELIMINADO'];
export const ROLES: readonly Rol[] = ['DEPORTISTA', 'ADMIN'];

export const VARIANTE_ESTADO: Record<EstadoUsuario, NsBadgeVariant> = {
  ACTIVO: 'success',
  BLOQUEADO: 'error',
  ELIMINADO: 'neutral',
};

export const VARIANTE_ROL: Record<Rol, NsBadgeVariant> = {
  DEPORTISTA: 'neutral',
  ADMIN: 'info',
};

export function leerEstado(valor: string | null | undefined): EstadoUsuario | null {
  return ESTADOS.includes(valor as EstadoUsuario) ? (valor as EstadoUsuario) : null;
}

export function leerPagina(valor: string | null | undefined): number {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

export function leerTamano(valor: string | null | undefined): number {
  const n = Number(valor);
  return (TAMANOS_PAGINA as readonly number[]).includes(n) ? n : TAMANO_POR_DEFECTO;
}

/** "campo,asc|desc" si el campo es ordenable; si no, null (orden por defecto: los más recientes). */
export function leerOrdenUsuarios(valor: string | null | undefined): string | null {
  const [campo, dir] = (valor ?? '').split(',');
  if (!(CAMPOS_ORDENABLES as readonly string[]).includes(campo)) return null;
  return `${campo},${dir === 'desc' ? 'desc' : 'asc'}`;
}

/** Roles en el orden de ROLES y sin repetir. */
export function rolesOrdenados(roles: readonly Rol[]): Rol[] {
  return ROLES.filter((rol) => roles.includes(rol));
}

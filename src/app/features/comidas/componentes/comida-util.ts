import type { OrigenComida, RegistroComidaRequest, RegistroComidaResponse } from '@core/models';
import { ETIQUETAS_ORIGEN_COMIDA, ETIQUETAS_TIPO_COMIDA, ICONOS_TIPO_COMIDA } from '@core/models/etiquetas';
import type { NsBadgeVariant } from '@shared/ui/feedback/badge.component';

/** Alimentos que se nombran en el resumen; el resto se cuenta ("y 2 más"). */
export const MAX_NOMBRES_RESUMEN = 3;

const LISTA = new Intl.ListFormat('es', { style: 'long', type: 'conjunction' });

/**
 * "Avena, leche y plátano": los nombres unidos en castellano, con la inicial en minúscula a partir
 * del segundo (salvo siglas o marcas: "BCAA", "iPhone"). Con más de 3: "Avena, leche, plátano y 2 más".
 */
export function resumirAlimentos(nombres: readonly string[]): string {
  const limpios = nombres.map((n) => n.trim()).filter(Boolean);
  if (limpios.length === 0) return 'Sin alimentos';
  const visibles = limpios.slice(0, MAX_NOMBRES_RESUMEN).map((n, i) => (i === 0 ? n : minusculaInicial(n)));
  const resto = limpios.length - visibles.length;
  return LISTA.format(resto > 0 ? [...visibles, `${resto} más`] : visibles);
}

/** Pasa a minúscula la inicial solo si la segunda letra ya lo es ("Leche" → "leche", "BCAA" igual). */
function minusculaInicial(nombre: string): string {
  const [primera, segunda] = nombre;
  if (!segunda || segunda !== segunda.toLocaleLowerCase('es')) return nombre;
  return primera.toLocaleLowerCase('es') + nombre.slice(1);
}

export function etiquetaTipo(c: RegistroComidaResponse): string {
  return c.tipoComida ? ETIQUETAS_TIPO_COMIDA[c.tipoComida] : 'Comida';
}

export function iconoTipo(c: RegistroComidaResponse): string {
  return c.tipoComida ? ICONOS_TIPO_COMIDA[c.tipoComida] : 'utensils';
}

/** "08:30" a partir de "08:30:00"; null si no tiene hora. */
export function horaCorta(c: RegistroComidaResponse): string | null {
  return c.hora ? c.hora.slice(0, 5) : null;
}

export interface BadgeOrigen {
  texto: string;
  icono: string;
  variant: NsBadgeVariant;
}

/**
 * Badge de la procedencia de la comida. La foto es una estimación de la IA (variante `ai`); plan,
 * receta y copia van en neutral. Las manuales y por código de barras no llevan badge: son lo normal.
 */
const BADGES_ORIGEN: Partial<Record<OrigenComida, BadgeOrigen>> = {
  FOTO: { texto: ETIQUETAS_ORIGEN_COMIDA.FOTO, icono: 'camera', variant: 'ai' },
  PLAN: { texto: ETIQUETAS_ORIGEN_COMIDA.PLAN, icono: 'calendar', variant: 'neutral' },
  RECETA: { texto: ETIQUETAS_ORIGEN_COMIDA.RECETA, icono: 'library', variant: 'neutral' },
  COPIA: { texto: ETIQUETAS_ORIGEN_COMIDA.COPIA, icono: 'copy', variant: 'neutral' },
};

export function badgeOrigen(origen: OrigenComida): BadgeOrigen | null {
  return BADGES_ORIGEN[origen] ?? null;
}

export type NivelConfianza = 'alta' | 'media' | 'baja';

/** Confianza de la IA (0–1) en niveles: alta ≥ 0,8, media ≥ 0,5, baja por debajo. */
export function nivelConfianza(confianza: number): NivelConfianza {
  if (confianza >= 0.8) return 'alta';
  if (confianza >= 0.5) return 'media';
  return 'baja';
}

export interface PeticionRecuperada {
  peticion: RegistroComidaRequest;
  /** Nombres de los alimentos sin alimentoId: no se pueden volver a registrar. */
  omitidos: string[];
}

/**
 * Vuelve a construir el RegistroComidaRequest de una comida (para "Deshacer" tras eliminarla):
 * fecha, hora, tipo, notas y, de cada alimento, alimentoId, cantidad y unidad. Los alimentos sin
 * alimentoId se omiten y se devuelven aparte; sin tipo se usa OTRO (el POST lo exige). Null si no
 * queda ningún alimento que registrar.
 */
export function peticionDesdeRespuesta(c: RegistroComidaResponse): PeticionRecuperada | null {
  const conId = c.alimentos.filter((a) => a.alimentoId);
  if (conId.length === 0) return null;
  const peticion: RegistroComidaRequest = {
    fecha: c.fecha,
    tipoComida: c.tipoComida ?? 'OTRO',
    alimentos: conId.map((a) => ({ alimentoId: a.alimentoId!, cantidad: a.cantidad, unidad: a.unidad })),
  };
  if (c.hora) peticion.hora = c.hora;
  if (c.notas) peticion.notas = c.notas;
  return { peticion, omitidos: c.alimentos.filter((a) => !a.alimentoId).map((a) => a.nombre) };
}

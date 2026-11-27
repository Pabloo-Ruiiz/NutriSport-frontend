/**
 * Lógica pura del asistente IA (DESIGN.md §7.15): textos de las herramientas, restricciones del
 * perfil, fechas de la lista, búsqueda y el borrador de "Preguntar al asistente".
 */
import type { ConversacionResumenResponse, InsightResponse, PreferenciaDto } from '@core/models';
import { ETIQUETAS_ALERGENO, ETIQUETAS_DIETA } from '@core/models/etiquetas';
import { MAX_CARACTERES_MENSAJE } from '@core/services/asistente.service';
import { aFechaApi, diasEntre } from '@core/util/fechas';
import { formatearFecha } from '@shared/pipes/formato';
import { TITULOS_TIPO_INSIGHT } from '@shared/ui/data/insight-card.component';

/** Herramientas de solo lectura del asistente (backend: HerramientasAsistente) → texto legible. */
export const ETIQUETAS_HERRAMIENTA: Record<string, string> = {
  resumenDiario: 'Resumen del día',
  comidas: 'Comidas',
  entrenamientos: 'Entrenamientos',
  menuDelDia: 'Menú del día',
  tendencias: 'Tendencias',
};

/** Nombres legibles y sin repetir; una herramienta desconocida se muestra "separada" ("planSemanal" → "Plan semanal"). */
export function datosConsultados(herramientas: readonly string[]): string[] {
  const legible = (h: string) => {
    if (ETIQUETAS_HERRAMIENTA[h]) return ETIQUETAS_HERRAMIENTA[h];
    const separado = h
      .replace(/[_-]+/g, ' ')
      .replace(/([a-záéíóúñ])([A-Z])/g, '$1 $2')
      .toLowerCase()
      .trim();
    return separado.charAt(0).toUpperCase() + separado.slice(1);
  };
  return [...new Set(herramientas.map(legible))];
}

/** Restricciones que el asistente tiene en cuenta: alergias, intolerancias y dietas. */
export function restriccionesActivas(preferencias: readonly PreferenciaDto[]): string[] {
  const textos: string[] = [];
  for (const p of preferencias) {
    if (p.tipo === 'ALERGIA' && p.alergeno) textos.push(`Alergia: ${ETIQUETAS_ALERGENO[p.alergeno] ?? p.alergeno}`);
    else if (p.tipo === 'INTOLERANCIA')
      textos.push(p.intolerancia === 'LACTOSA' ? 'Intolerancia a la lactosa' : 'Intolerancia');
    else if (p.tipo === 'DIETA' && p.dieta) textos.push(`Dieta ${(ETIQUETAS_DIETA[p.dieta] ?? p.dieta).toLowerCase()}`);
  }
  return [...new Set(textos)];
}

/** Fecha corta del último mensaje en la lista: "16:42" (hoy), "Ayer", "21 nov" o "" sin mensajes. */
export function fechaConversacion(ultimoMensajeEn: string | null, ahora = new Date()): string {
  if (!ultimoMensajeEn) return '';
  const fecha = new Date(ultimoMensajeEn);
  if (Number.isNaN(fecha.getTime())) return '';
  const dias = diasEntre(aFechaApi(fecha), aFechaApi(ahora));
  if (dias === 0) return formatearFecha(ultimoMensajeEn, 'hora');
  if (dias === 1) return 'Ayer';
  return formatearFecha(aFechaApi(fecha), dias < 365 ? 'diaMes' : 'diaMesAnio');
}

/** Normaliza para buscar sin tildes ni mayúsculas. */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/** Búsqueda en el cliente sobre el título y la vista previa (sin tildes ni mayúsculas). */
export function filtrarConversaciones(
  lista: readonly ConversacionResumenResponse[],
  busqueda: string,
): ConversacionResumenResponse[] {
  const q = normalizar(busqueda.trim());
  if (!q) return [...lista];
  return lista.filter((c) => normalizar(`${c.titulo ?? ''} ${c.vistaPrevia ?? ''}`).includes(q));
}

/** Título que se muestra de una conversación (las nuevas aún no tienen). */
export function tituloConversacion(titulo: string | null | undefined): string {
  return titulo?.trim() || 'Conversación nueva';
}

/** Borrador de "Preguntar al asistente" a partir de un insight. */
export function borradorDeInsight(insight: InsightResponse): string {
  const titulo = insight.titulo || TITULOS_TIPO_INSIGHT[insight.tipo] || 'Patrón detectado';
  return `Sobre el patrón «${titulo}»: ${insight.texto}\n\n¿Qué me recomiendas?`.slice(0, MAX_CARACTERES_MENSAJE);
}

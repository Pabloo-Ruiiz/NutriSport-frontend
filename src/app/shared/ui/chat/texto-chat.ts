/**
 * Texto de un mensaje de chat en bloques que la plantilla pinta con elementos de Angular (nunca con
 * innerHTML): párrafos con saltos de línea, listas simples ("- ", "* ", "• " o "1. ") y negritas
 * con **…**. Cualquier otra marca (HTML incluido) se queda como texto literal, así que el contenido
 * del modelo no puede inyectar marcado.
 */

export interface SegmentoChat {
  texto: string;
  negrita: boolean;
}

/** Una línea de texto, en segmentos normales y en negrita. */
export type LineaChat = SegmentoChat[];

export type BloqueChat =
  { tipo: 'parrafo'; lineas: LineaChat[] } | { tipo: 'lista'; ordenada: boolean; elementos: LineaChat[] };

const VINETA = /^\s*[-*•]\s+(.*)$/;
const NUMERO = /^\s*\d{1,3}[.)]\s+(.*)$/;
const TITULO = /^\s*#{1,6}\s+(.*)$/;
const NEGRITA = /\*\*(.+?)\*\*/g;

/** "Toma **25 g** de proteína" → [{ "Toma " }, { "25 g", negrita }, { " de proteína" }]. */
export function segmentosChat(linea: string): LineaChat {
  const segmentos: LineaChat = [];
  let desde = 0;
  for (const m of linea.matchAll(NEGRITA)) {
    if (m.index > desde) segmentos.push({ texto: linea.slice(desde, m.index), negrita: false });
    segmentos.push({ texto: m[1], negrita: true });
    desde = m.index + m[0].length;
  }
  if (desde < linea.length) segmentos.push({ texto: linea.slice(desde), negrita: false });
  return segmentos;
}

/** Bloques de un texto: una línea en blanco separa párrafos; las líneas de lista se agrupan. */
export function bloquesChat(texto: string): BloqueChat[] {
  const bloques: BloqueChat[] = [];
  let actual: BloqueChat | null = null;
  for (const linea of texto.replace(/\r\n?/g, '\n').split('\n')) {
    if (!linea.trim()) {
      actual = null;
      continue;
    }
    const vineta = VINETA.exec(linea);
    const numero = vineta ? null : NUMERO.exec(linea);
    if (vineta || numero) {
      const ordenada = !!numero;
      if (actual?.tipo !== 'lista' || actual.ordenada !== ordenada) {
        actual = { tipo: 'lista', ordenada, elementos: [] };
        bloques.push(actual);
      }
      actual.elementos.push(segmentosChat((vineta ?? numero)![1].trim()));
      continue;
    }
    const titulo = TITULO.exec(linea);
    const contenido: LineaChat = titulo ? [{ texto: titulo[1].trim(), negrita: true }] : segmentosChat(linea.trim());
    if (actual?.tipo !== 'parrafo') {
      actual = { tipo: 'parrafo', lineas: [] };
      bloques.push(actual);
    }
    actual.lineas.push(contenido);
  }
  return bloques;
}

// Funciones puras de la lista de la compra (DESIGN.md §7.12).
import type {
  EntradaDesglose,
  ListaCompraResponse,
  ProductoCompraResponse,
  SeccionCompraResponse,
  UnidadCompra,
} from '@core/models';
import { ETIQUETAS_UNIDAD_COMPRA } from '@core/models/etiquetas';
import { desdeFechaApi } from '@core/util/fechas';
import { formatearNumero } from '@shared/pipes/formato';

/** ActualizarListaRequest.nombre: máx. 100 caracteres (docs/api/compra.md §8). */
export const MAX_NOMBRE_LISTA = 100;

/** Tamaño de página de /compra (la API admite como mucho 50). */
export const TAMANO_PAGINA_LISTAS = 12;

const MES = new Intl.DateTimeFormat('es-ES', { month: 'short' });
const mes = (fecha: string) => MES.format(desdeFechaApi(fecha)).replace('.', '');
const dia = (fecha: string) => Number(fecha.slice(8, 10));
const anio = (fecha: string) => fecha.slice(0, 4);

/**
 * Rango de una lista: "23–29 nov 2026", "30 nov – 6 dic 2026", "28 dic 2026 – 3 ene 2027" o
 * "24 nov 2026" si es un solo día. Con una sola fecha, esa; sin ninguna, null.
 */
export function etiquetaRango(desde: string | null, hasta: string | null): string | null {
  if (!desde || !hasta) {
    const unica = desde ?? hasta;
    return unica ? `${dia(unica)} ${mes(unica)} ${anio(unica)}` : null;
  }
  if (desde === hasta) return `${dia(desde)} ${mes(desde)} ${anio(desde)}`;
  if (anio(desde) !== anio(hasta))
    return `${dia(desde)} ${mes(desde)} ${anio(desde)} – ${dia(hasta)} ${mes(hasta)} ${anio(hasta)}`;
  if (desde.slice(5, 7) !== hasta.slice(5, 7))
    return `${dia(desde)} ${mes(desde)} – ${dia(hasta)} ${mes(hasta)} ${anio(hasta)}`;
  return `${dia(desde)}–${dia(hasta)} ${mes(hasta)} ${anio(hasta)}`;
}

/** Rango que se propone al generar una lista: desde hoy (si cae dentro del menú) hasta el final. */
export function rangoSugerido(inicio: string, fin: string, hoy: string): { desde: string; hasta: string } {
  const desde = hoy > inicio && hoy <= fin ? hoy : inicio;
  return { desde, hasta: fin };
}

// ---- Detalle de la lista

/** ProductoCompraRequest.nombre: máx. 120 caracteres; seccion: máx. 40 (§8). */
export const MAX_NOMBRE_PRODUCTO = 120;
export const MAX_SECCION = 40;
/** Cantidad: mayor que 0 y como mucho 99999.99 (§8). */
export const MAX_CANTIDAD = 99999.99;
/** AnadirRecetaListaRequest.raciones: mayor que 0 y como mucho 50 (§8). */
export const MAX_RACIONES = 50;
/** Sección a la que el servidor manda los productos sin sección. */
export const SECCION_POR_DEFECTO = 'Otros';

export const UNIDADES_COMPRA: readonly UnidadCompra[] = ['UD', 'G', 'KG', 'ML', 'L'];

const DIA_SEMANA = new Intl.DateTimeFormat('es-ES', { weekday: 'short' });

/** Número con los decimales justos (como mucho 2): 1 → "1", 1.5 → "1,5", 0.25 → "0,25". */
function numeroCompacto(valor: number): string {
  const decimales = Number.isInteger(valor) ? 0 : Number.isInteger(Math.round(valor * 100) / 10) ? 1 : 2;
  return formatearNumero(valor, decimales);
}

/** "200 g", "1,5 kg", "3 ud.". */
export function cantidadTexto(cantidad: number, unidad: UnidadCompra): string {
  return `${numeroCompacto(cantidad)} ${ETIQUETAS_UNIDAD_COMPRA[unidad]}`;
}

/**
 * Desglose por día: "lun. 23 · 200 g · mié. 25 · 150 g". Las cantidades del desglose van en g o ml
 * según la unidad del producto (ml para ML y L); sin cantidad, solo el día.
 */
export function desgloseTexto(desglose: readonly EntradaDesglose[], unidad: UnidadCompra): string {
  const sufijo = unidad === 'ML' || unidad === 'L' ? 'ml' : 'g';
  return desglose
    .map((e) => {
      const diaTexto = `${DIA_SEMANA.format(desdeFechaApi(e.fecha)).replace('.', '')}. ${dia(e.fecha)}`;
      return e.gramos === null ? diaTexto : `${diaTexto} · ${numeroCompacto(e.gramos)} ${sufijo}`;
    })
    .join(' · ');
}

/** Pendientes primero y comprados al final, conservando el orden relativo de cada grupo. */
function ordenarSeccion(productos: ProductoCompraResponse[]): ProductoCompraResponse[] {
  return [...productos.filter((p) => !p.comprado), ...productos.filter((p) => p.comprado)];
}

/**
 * Marca o desmarca un producto en local (actualización optimista): lo mueve al final de su grupo
 * (al final de la sección si se compra; al final de los pendientes si se desmarca) y ajusta el
 * contador de comprados. Si no está o ya tiene ese estado, devuelve la misma lista.
 */
export function marcarComprado(lista: ListaCompraResponse, productoId: string, comprado: boolean): ListaCompraResponse {
  let cambiado = false;
  const secciones = lista.secciones.map((seccion) => {
    const producto = seccion.productos.find((p) => p.id === productoId);
    if (!producto || producto.comprado === comprado) return seccion;
    cambiado = true;
    const resto = seccion.productos.filter((p) => p.id !== productoId);
    const pendientes = resto.filter((p) => !p.comprado);
    const comprados = resto.filter((p) => p.comprado);
    const actualizado = { ...producto, comprado };
    return {
      ...seccion,
      productos: comprado ? [...pendientes, ...comprados, actualizado] : [...pendientes, actualizado, ...comprados],
    };
  });
  if (!cambiado) return lista;
  return { ...lista, secciones, comprados: lista.comprados + (comprado ? 1 : -1) };
}

/** Secciones visibles: con "Ocultar comprados", sin los comprados y sin las secciones que se quedan vacías. */
export function seccionesVisibles(lista: ListaCompraResponse, ocultarComprados: boolean): SeccionCompraResponse[] {
  return lista.secciones
    .map((s) => ({
      ...s,
      productos: ocultarComprados ? s.productos.filter((p) => !p.comprado) : ordenarSeccion(s.productos),
    }))
    .filter((s) => s.productos.length > 0);
}

/** Texto plano para compartir: nombre, rango y productos por sección ("☐ Arroz — 500 g"). */
export function textoCompartir(lista: ListaCompraResponse): string {
  const lineas = [lista.nombre];
  const rango = etiquetaRango(lista.fechaDesde, lista.fechaHasta);
  if (rango) lineas.push(rango);
  for (const seccion of lista.secciones) {
    if (seccion.productos.length === 0) continue;
    lineas.push('', `${seccion.nombre}:`);
    for (const p of ordenarSeccion(seccion.productos)) {
      lineas.push(`${p.comprado ? '☑' : '☐'} ${p.nombre} — ${cantidadTexto(p.cantidad, p.unidad)}`);
    }
  }
  return lineas.join('\n');
}

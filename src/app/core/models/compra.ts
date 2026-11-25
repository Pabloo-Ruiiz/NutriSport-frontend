// Lista de la compra · Ampliación (NutriSport_API.md §5).

export type UnidadCompra = 'G' | 'KG' | 'ML' | 'L' | 'UD';
export type EstadoLista = 'ACTIVA' | 'COMPLETADA';

export interface ListaCompraResumenResponse {
  id: string; // UUID
  nombre: string;
  estado: EstadoLista;
  menuId: string | null; // UUID
  fechaDesde: string | null; // "AAAA-MM-DD"
  fechaHasta: string | null; // "AAAA-MM-DD"
  comprados: number;
  total: number;
  creadoEn: string; // ISO con zona, p. ej. "2026-11-25T08:30:00+01:00"
}
export interface ListaCompraResponse {
  id: string; // UUID
  nombre: string;
  estado: EstadoLista;
  menuId: string | null; // UUID
  fechaDesde: string | null; // "AAAA-MM-DD"
  fechaHasta: string | null; // "AAAA-MM-DD"
  comprados: number;
  total: number;
  secciones: SeccionCompraResponse[];
}
export interface SeccionCompraResponse {
  nombre: string;
  productos: ProductoCompraResponse[];
}
export interface ProductoCompraResponse {
  id: string; // UUID
  nombre: string;
  cantidad: number;
  unidad: UnidadCompra;
  seccion: string;
  comprado: boolean;
  manual: boolean;
  desglose: EntradaDesglose[];
}
export interface EntradaDesglose {
  fecha: string; // "AAAA-MM-DD"
  gramos: number | null;
}
export interface GenerarListaRequest {
  desde?: string; // "AAAA-MM-DD"
  hasta?: string; // "AAAA-MM-DD"
}
export interface ActualizarListaRequest {
  nombre?: string; // máx. 100 car.
  estado?: EstadoLista;
}
export interface ProductoCompraRequest {
  nombre: string; // máx. 120 car.
  cantidad: number; // >0 y ≤99999.99
  unidad: UnidadCompra;
  seccion?: string; // máx. 40 car.
}
export interface ActualizarProductoRequest {
  cantidad?: number; // >0 y ≤99999.99
  unidad?: UnidadCompra;
  comprado?: boolean;
}
export interface AnadirRecetaListaRequest {
  recetaId: string; // UUID
  raciones: number; // >0 y ≤50
}

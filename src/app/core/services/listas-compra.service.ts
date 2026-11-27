import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, switchMap } from 'rxjs';

import { environment } from '@env/environment';
import type {
  ActualizarListaRequest,
  ActualizarProductoRequest,
  AnadirRecetaListaRequest,
  GenerarListaRequest,
  ListaCompraResponse,
  ListaCompraResumenResponse,
  Pagina,
  ProductoCompraRequest,
} from '../models';

/**
 * Listas de la compra (Ampliación A5, docs/api/compra.md §6).
 *
 * Todas las operaciones que modifican una lista o sus productos devuelven la lista completa
 * (`ListaCompraResponse`): quien las llame debe sustituir su estado con la respuesta. Las
 * excepciones son `eliminar` y `quitarProducto` (204 sin cuerpo): este servicio vuelve a pedir el
 * detalle tras quitar un producto para mantener el mismo contrato.
 */
@Injectable({ providedIn: 'root' })
export class ListasCompraService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/listas-compra`;

  /** Mis listas, la más reciente primero (como mucho 50 por página). */
  listar(page = 0, size = 20): Observable<Pagina<ListaCompraResumenResponse>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Pagina<ListaCompraResumenResponse>>(this.url, { params });
  }

  /** Productos agrupados por sección; dentro de cada una, los comprados al final. */
  detalle(id: string): Observable<ListaCompraResponse> {
    return this.http.get<ListaCompraResponse>(this.ruta(id));
  }

  /**
   * Genera una lista con los ingredientes de las comidas no consumidas del menú (201). Sin fechas,
   * el menú completo; `desde` y `hasta` deben estar dentro del menú. Solo envía las fechas con valor.
   */
  generarDesdeMenu(menuId: string, req: GenerarListaRequest = {}): Observable<ListaCompraResponse> {
    const cuerpo: GenerarListaRequest = {};
    const desde = req.desde?.trim();
    const hasta = req.hasta?.trim();
    if (desde) cuerpo.desde = desde;
    if (hasta) cuerpo.hasta = hasta;
    return this.http.post<ListaCompraResponse>(`${this.url}/desde-menu/${encodeURIComponent(menuId)}`, cuerpo);
  }

  /** Renombrar o completar: solo cambian los campos presentes. */
  actualizar(id: string, req: ActualizarListaRequest): Observable<ListaCompraResponse> {
    return this.http.patch<ListaCompraResponse>(this.ruta(id), req);
  }

  /** Borra la lista con sus productos (204). */
  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(this.ruta(id));
  }

  // ---- Productos

  /** Producto escrito a mano (201). Sin sección va a "Otros". */
  anadirProducto(id: string, req: ProductoCompraRequest): Observable<ListaCompraResponse> {
    return this.http.post<ListaCompraResponse>(`${this.ruta(id)}/productos`, req);
  }

  /** Ingredientes de una receta escalados a las raciones (201). */
  anadirDesdeReceta(id: string, req: AnadirRecetaListaRequest): Observable<ListaCompraResponse> {
    return this.http.post<ListaCompraResponse>(`${this.ruta(id)}/productos/desde-receta`, req);
  }

  /** Cantidad, unidad o comprado: los campos ausentes no cambian. */
  actualizarProducto(id: string, productoId: string, req: ActualizarProductoRequest): Observable<ListaCompraResponse> {
    return this.http.patch<ListaCompraResponse>(this.rutaProducto(id, productoId), req);
  }

  /**
   * Quita el producto (esté comprado o no). El DELETE responde 204 sin cuerpo, así que después se
   * pide el detalle para devolver la lista completa, como el resto de operaciones.
   */
  quitarProducto(id: string, productoId: string): Observable<ListaCompraResponse> {
    return this.http.delete<void>(this.rutaProducto(id, productoId)).pipe(switchMap(() => this.detalle(id)));
  }

  private ruta(id: string): string {
    return `${this.url}/${encodeURIComponent(id)}`;
  }

  private rutaProducto(id: string, productoId: string): string {
    return `${this.ruta(id)}/productos/${encodeURIComponent(productoId)}`;
  }
}

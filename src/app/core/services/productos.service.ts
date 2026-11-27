import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, throwError } from 'rxjs';
import { environment } from '@env/environment';
import type { ProductoResponse, ProductoResumenResponse } from '@core/models';

@Injectable({ providedIn: 'root' })
export class ProductosService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/productos`;

  buscar(q: string, page = 0): Observable<{ productos: ProductoResumenResponse[]; proveedorDisponible: boolean }> {
    if (!Number.isInteger(page) || page < 0 || page > 49)
      return throwError(() => new RangeError('La página debe estar entre 0 y 49.'));
    return this.http
      .get<ProductoResumenResponse[]>(this.url, { params: { q: q.trim(), page }, observe: 'response' })
      .pipe(
        map((respuesta) => ({
          productos: respuesta.body ?? [],
          proveedorDisponible: !respuesta.headers.has('X-Proveedor-No-Disponible'),
        })),
      );
  }

  porCodigo(codigo: string): Observable<ProductoResponse> {
    if (!/^\d{8,14}$/.test(codigo))
      return throwError(() => new RangeError('El código debe contener entre 8 y 14 dígitos.'));
    return this.http.get<ProductoResponse>(`${this.url}/${codigo}`);
  }
}

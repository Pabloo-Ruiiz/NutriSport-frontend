import { Pipe, PipeTransform } from '@angular/core';

import { ETIQUETAS, TipoEtiqueta } from '@core/models/etiquetas';

import { SIN_DATO } from './formato';

/**
 * {{ comida.tipoComida | etiqueta: 'tipoComida' }} → "Media mañana".
 * Si el valor no tiene etiqueta, se devuelve tal cual. Sin dato → "—".
 */
@Pipe({ name: 'etiqueta' })
export class EtiquetaPipe implements PipeTransform {
  transform(valor: string | null | undefined, tipo: TipoEtiqueta): string {
    if (valor === null || valor === undefined || valor === '') {
      return SIN_DATO;
    }
    const mapa: Readonly<Record<string, string>> = ETIQUETAS[tipo];
    return mapa[valor] ?? valor;
  }
}

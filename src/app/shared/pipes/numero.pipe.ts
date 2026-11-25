import { Pipe, PipeTransform } from '@angular/core';

import { formatearNumero } from './formato';

/** {{ 72.4 | numero: 1 }} → "72,4"; {{ 2450 | numero }} → "2.450". Sin dato → "—". */
@Pipe({ name: 'numero' })
export class NumeroPipe implements PipeTransform {
  transform(valor: number | null | undefined, decimales = 0): string {
    return formatearNumero(valor, decimales);
  }
}

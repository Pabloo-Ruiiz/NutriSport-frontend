import { Pipe, PipeTransform } from '@angular/core';

import { formatearGramos } from './formato';

/** {{ 112 | gramos }} → "112 g"; {{ 1.5 | gramos: 1 }} → "1,5 g". Sin dato → "—". */
@Pipe({ name: 'gramos' })
export class GramosPipe implements PipeTransform {
  transform(valor: number | null | undefined, decimales = 0): string {
    return formatearGramos(valor, decimales);
  }
}

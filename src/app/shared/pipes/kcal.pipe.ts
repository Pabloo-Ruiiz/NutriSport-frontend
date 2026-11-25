import { Pipe, PipeTransform } from '@angular/core';

import { formatearKcal } from './formato';

/** {{ 2450 | kcal }} → "2.450 kcal". Sin dato → "—". */
@Pipe({ name: 'kcal' })
export class KcalPipe implements PipeTransform {
  transform(valor: number | null | undefined): string {
    return formatearKcal(valor);
  }
}

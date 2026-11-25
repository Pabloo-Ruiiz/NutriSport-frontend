import { Pipe, PipeTransform } from '@angular/core';

import { FormatoFecha, formatearFecha } from './formato';

/**
 * {{ '2026-11-21' | fechaCorta }} → "sáb. 21 nov"
 * {{ '2026-11-21' | fechaCorta: 'larga' }} → "sábado, 21 de noviembre"
 * {{ '2026-11-21' | fechaCorta: 'diaMes' }} → "21 nov"
 * {{ entrenamiento.fechaHora | fechaCorta: 'hora' }} → "08:30"
 * Sin dato o fecha no válida → "—".
 */
@Pipe({ name: 'fechaCorta' })
export class FechaCortaPipe implements PipeTransform {
  transform(valor: string | null | undefined, formato: FormatoFecha = 'corta'): string {
    return formatearFecha(valor, formato);
  }
}

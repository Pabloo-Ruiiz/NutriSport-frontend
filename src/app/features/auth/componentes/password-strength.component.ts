import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { motivoContrasena } from '@core/util/validadores';

/** 0 = vacía; 1 Débil · 2 Aceptable · 3 Buena · 4 Fuerte. */
export type NivelFortaleza = 0 | 1 | 2 | 3 | 4;

export const ETIQUETAS_FORTALEZA: Record<Exclude<NivelFortaleza, 0>, string> = {
  1: 'Débil',
  2: 'Aceptable',
  3: 'Buena',
  4: 'Fuerte',
};

const FILAS_TECLADO = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234567890'];
const PALABRAS_OBVIAS = ['password', 'contrasena', 'contraseña', 'nutrisport', 'admin', 'qwerty', 'abc123'];

/**
 * Tiene una secuencia obvia: 4 o más caracteres seguidos iguales ("aaaa"), consecutivos
 * ("1234", "dcba"), de una fila del teclado ("qwer", "asdf") o una palabra típica ("password").
 */
export function tieneSecuenciaObvia(valor: string): boolean {
  const texto = valor.toLocaleLowerCase('es-ES');
  if (PALABRAS_OBVIAS.some((palabra) => texto.includes(palabra))) return true;
  if (/(.)\1{3,}/u.test(texto)) return true;

  let subiendo = 1;
  let bajando = 1;
  for (let i = 1; i < texto.length; i++) {
    const diferencia = texto.charCodeAt(i) - texto.charCodeAt(i - 1);
    subiendo = diferencia === 1 ? subiendo + 1 : 1;
    bajando = diferencia === -1 ? bajando + 1 : 1;
    if (subiendo >= 4 || bajando >= 4) return true;
  }

  for (let i = 0; i + 4 <= texto.length; i++) {
    const trozo = texto.slice(i, i + 4);
    const alReves = [...trozo].reverse().join('');
    if (FILAS_TECLADO.some((fila) => fila.includes(trozo) || fila.includes(alReves))) return true;
  }
  return false;
}

/**
 * Robustez orientativa de una contraseña, de 1 a 4 (0 si está vacía):
 * - un punto por llegar a 10 caracteres y otro por llegar a 14;
 * - un punto por usar 3 tipos de caracteres (minúsculas, mayúsculas, números, símbolos) y otro
 *   por usar los 4;
 * - si no cumple las reglas del registro o tiene una secuencia obvia, como mucho "Débil".
 */
export function evaluarFortaleza(valor: string | null | undefined): NivelFortaleza {
  if (!valor) return 0;

  let puntos = 0;
  if (valor.length >= 10) puntos++;
  if (valor.length >= 14) puntos++;

  const tipos = [/\p{Ll}/u, /\p{Lu}/u, /\p{Nd}/u, /[^\p{L}\p{Nd}]/u].filter((tipo) => tipo.test(valor)).length;
  if (tipos >= 3) puntos++;
  if (tipos === 4) puntos++;

  if (motivoContrasena(valor) !== null || tieneSecuenciaObvia(valor)) puntos = Math.min(puntos, 1);
  return Math.max(1, Math.min(4, puntos)) as NivelFortaleza;
}

/**
 * Medidor de robustez de la contraseña (DESIGN.md §7.2): 4 segmentos y el nivel en texto
 * ("Débil / Aceptable / Buena / Fuerte"), no solo con color. Es orientativo: las reglas que
 * bloquean son las de contrasenaSegura() y las del servidor, que además rechaza las comunes.
 *
 *   <ns-password-strength [password]="form.controls.password.value" />
 */
@Component({
  selector: 'ns-password-strength',
  template: `
    <div class="ns-fortaleza__barra" aria-hidden="true">
      @for (segmento of segmentos; track segmento) {
        <span class="ns-fortaleza__segmento" [class.ns-fortaleza__segmento--lleno]="segmento <= nivel()"></span>
      }
    </div>
    <p class="ns-fortaleza__nivel" aria-live="polite">
      @if (etiqueta(); as etiqueta) {
        Seguridad: <strong>{{ etiqueta }}</strong>
      }
    </p>
    <p class="ns-fortaleza__nota">El servidor también rechaza las contraseñas más comunes.</p>
  `,
  styleUrl: './password-strength.component.scss',
  host: {
    class: 'ns-fortaleza',
    '[attr.data-nivel]': 'nivel()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordStrengthComponent {
  readonly password = input<string | null | undefined>('');

  protected readonly segmentos = [1, 2, 3, 4] as const;
  readonly nivel = computed(() => evaluarFortaleza(this.password()));
  readonly etiqueta = computed(() => {
    const nivel = this.nivel();
    return nivel === 0 ? null : ETIQUETAS_FORTALEZA[nivel];
  });
}

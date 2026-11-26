import { ChangeDetectionStrategy, Component, booleanAttribute, input, numberAttribute } from '@angular/core';

/**
 * Qué datos de salud trata NutriSport AI, qué se envía al proveedor de IA y cómo revocar el
 * consentimiento. Lo usan el diálogo del registro y Configuración › Privacidad.
 *
 *   <app-texto-datos-salud [nivelTitulos]="3" />
 *   <app-texto-datos-salud sinRevocar />   (en Privacidad, que ya tiene el botón)
 */
@Component({
  selector: 'app-texto-datos-salud',
  template: `
    <p>
      Para calcular tus objetivos y registrar lo que comes, NutriSport AI trata datos relacionados con tu salud. Solo
      los usamos para darte el servicio y nunca los vendemos ni los cedemos con fines publicitarios.
    </p>

    <p class="ns-text-body-strong" role="heading" [attr.aria-level]="nivelTitulos()">Qué datos tratamos</p>
    <ul>
      <li>
        <strong>Perfil:</strong> edad, sexo, altura, peso, objetivo, deporte, nivel de actividad y tus preferencias,
        alergias o intolerancias.
      </li>
      <li><strong>Comidas:</strong> lo que registras, con sus cantidades y su valor nutricional.</li>
      <li><strong>Fotos de tus platos:</strong> para estimar los alimentos y las cantidades.</li>
      <li><strong>Entrenamientos y peso:</strong> para ajustar la energía y los macros a tu actividad.</li>
    </ul>

    <p class="ns-text-body-strong" role="heading" [attr.aria-level]="nivelTitulos()">Qué se envía al proveedor de IA</p>
    <ul>
      <li>Las fotos de tus platos, <strong>sin metadatos</strong> (ni ubicación ni datos del dispositivo).</li>
      <li>Los datos nutricionales necesarios para analizar una comida o sugerirte un plato.</li>
      <li><strong>Nunca</strong> tu nombre ni tu email.</li>
    </ul>

    @if (!sinRevocar()) {
      <p class="ns-text-body-strong" role="heading" [attr.aria-level]="nivelTitulos()">Puedes cambiar de opinión</p>
      <p>
        Puedes revocar este consentimiento cuando quieras en <strong>Configuración › Privacidad</strong>. Mientras esté
        revocado, las funciones que usan estos datos quedan bloqueadas; tus datos no se borran salvo que elimines la
        cuenta.
      </p>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-3);
      color: var(--ns-text-secondary);
    }
    [role='heading'] {
      margin: var(--ns-space-2) 0 0;
      color: var(--ns-text);
    }
    p,
    ul {
      margin: 0;
    }
    ul {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-1);
      padding-left: var(--ns-space-5);
    }
    strong {
      color: var(--ns-text);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextoDatosSaludComponent {
  /** Nivel de los subtítulos según la página (3 dentro de un diálogo con h2). */
  readonly nivelTitulos = input(3, { transform: numberAttribute });
  /** Oculta el párrafo sobre cómo revocar (en Privacidad ya está el botón). */
  readonly sinRevocar = input(false, { transform: booleanAttribute });
}

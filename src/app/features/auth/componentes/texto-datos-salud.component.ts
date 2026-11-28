import { ChangeDetectionStrategy, Component, booleanAttribute, input, numberAttribute } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

/** Categorías de datos de salud (art. 9 RGPD) que trata NutriSport AI. */
const CATEGORIAS = [
  {
    icono: 'user',
    titulo: 'Perfil',
    texto: 'Edad, sexo, altura, peso, objetivo, deporte, nivel de actividad, preferencias, alergias e intolerancias.',
  },
  {
    icono: 'utensils',
    titulo: 'Alimentación',
    texto: 'Las comidas que registras, con sus cantidades y su valor nutricional.',
  },
  { icono: 'camera', titulo: 'Fotos de tus platos', texto: 'Para estimar qué alimentos contienen y en qué cantidad.' },
  {
    icono: 'dumbbell',
    titulo: 'Actividad y peso',
    texto: 'Entrenamientos y pesajes, para ajustar la energía y los macros.',
  },
] as const;

/**
 * Qué datos de salud trata NutriSport AI, qué se envía al proveedor de IA y cómo retirar el
 * consentimiento. Lo usan el diálogo del registro y Configuración › Privacidad y datos.
 *
 *   <app-texto-datos-salud [nivelTitulos]="3" />
 *   <app-texto-datos-salud sinRevocar />   (en Privacidad, que ya tiene el botón)
 */
@Component({
  selector: 'app-texto-datos-salud',
  imports: [LucideDynamicIcon],
  template: `
    <p class="ns-salud__intro">
      Para calcular tus objetivos y registrar lo que comes, NutriSport AI necesita tratar datos relativos a tu salud.
      Solo los usamos para prestarte el servicio:
      <strong>nunca los vendemos ni los usamos con fines publicitarios</strong>.
    </p>

    <section class="ns-salud__seccion" [attr.aria-labelledby]="'ns-salud-datos'">
      <p class="ns-salud__titulo" id="ns-salud-datos" role="heading" [attr.aria-level]="nivelTitulos()">
        Qué datos tratamos
      </p>
      <ul class="ns-salud__categorias" role="list">
        @for (categoria of categorias; track categoria.icono) {
          <li class="ns-salud__categoria">
            <span class="ns-salud__icono" aria-hidden="true">
              <svg [lucideIcon]="categoria.icono" [size]="18"></svg>
            </span>
            <span>
              <strong class="ns-salud__categoria-titulo">{{ categoria.titulo }}</strong>
              <span class="ns-salud__categoria-texto">{{ categoria.texto }}</span>
            </span>
          </li>
        }
      </ul>
    </section>

    <section class="ns-salud__seccion ns-salud__ia" [attr.aria-labelledby]="'ns-salud-ia'">
      <p class="ns-salud__titulo" id="ns-salud-ia" role="heading" [attr.aria-level]="nivelTitulos()">
        <svg lucideIcon="sparkles" [size]="16" aria-hidden="true"></svg>
        Qué se envía al proveedor de inteligencia artificial
      </p>
      <ul class="ns-salud__lista">
        <li>Las fotos de tus platos, <strong>sin metadatos</strong> (ni ubicación ni datos del dispositivo).</li>
        <li>Los datos nutricionales y de salud imprescindibles para analizar una comida o responder a tu pregunta.</li>
        <li class="ns-salud__nunca">
          <svg lucideIcon="shield-check" [size]="16" aria-hidden="true"></svg>
          <span><strong>Nunca</strong> tu nombre ni tu email.</span>
        </li>
      </ul>
      <p class="ns-salud__nota">Las estimaciones de la IA son orientativas: siempre las revisas antes de guardarlas.</p>
    </section>

    @if (!sinRevocar()) {
      <section class="ns-salud__seccion" [attr.aria-labelledby]="'ns-salud-control'">
        <p class="ns-salud__titulo" id="ns-salud-control" role="heading" [attr.aria-level]="nivelTitulos()">
          Tú decides
        </p>
        <p>
          Puedes retirar este consentimiento cuando quieras en <strong>Configuración › Privacidad y datos</strong>.
          Mientras esté retirado, las funciones que usan estos datos quedan en pausa; tus datos no se borran salvo que
          elimines la cuenta.
        </p>
      </section>
    }

    <p class="ns-salud__pie">
      Más información en la
      <a class="ns-salud__enlace" href="/politica-de-privacidad" target="_blank" rel="noopener"
        >Política de privacidad<span class="ns-sr-only"> (se abre en una pestaña nueva)</span></a
      >.
    </p>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-6);
      color: var(--ns-text-secondary);
      font-size: 0.875rem;
      line-height: 1.375rem;
    }
    p,
    ul {
      margin: 0;
    }
    strong {
      color: var(--ns-text);
      font-weight: 600;
    }
    .ns-salud__intro {
      color: var(--ns-text-secondary);
      font-size: 0.9375rem;
      line-height: 1.5rem;
    }
    .ns-salud__seccion {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-3);
    }
    .ns-salud__titulo {
      display: flex;
      align-items: center;
      gap: var(--ns-space-2);
      color: var(--ns-text);
      font: 700 0.8125rem/1.25rem var(--ns-font-display);
      letter-spacing: 0.04em;
      text-transform: uppercase;

      svg {
        color: var(--ns-brand);
      }
    }
    .ns-salud__categorias {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
      gap: var(--ns-space-3);
      padding: 0;
      list-style: none;
    }
    .ns-salud__categoria {
      display: flex;
      align-items: flex-start;
      gap: var(--ns-space-3);
      padding: var(--ns-space-3);
      border: 1px solid var(--ns-border);
      border-radius: var(--ns-radius-lg);
      background: var(--ns-surface-muted);
    }
    .ns-salud__icono {
      display: inline-flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: 1px solid var(--ns-brand-border);
      border-radius: var(--ns-radius-md);
      background: var(--ns-brand-bg);
      color: var(--ns-brand);
    }
    .ns-salud__categoria-titulo {
      display: block;
    }
    .ns-salud__categoria-texto {
      display: block;
      font-size: 0.8125rem;
      line-height: 1.25rem;
    }
    .ns-salud__ia {
      padding: var(--ns-space-4);
      border: 1px solid var(--ns-brand-border);
      border-radius: var(--ns-radius-lg);
      background: var(--ns-brand-bg);
    }
    .ns-salud__lista {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-2);
      padding-left: var(--ns-space-5);

      li::marker {
        color: var(--ns-brand);
      }
    }
    .ns-salud__nunca {
      display: flex;
      align-items: center;
      gap: var(--ns-space-2);
      margin-left: calc(-1 * var(--ns-space-5));
      list-style: none;

      svg {
        flex-shrink: 0;
        color: var(--ns-brand);
      }
    }
    .ns-salud__nota,
    .ns-salud__pie {
      color: var(--ns-text-tertiary);
      font-size: 0.8125rem;
      line-height: 1.25rem;
    }
    .ns-salud__pie {
      padding-top: var(--ns-space-4);
      border-top: 1px solid var(--ns-border);
    }
    .ns-salud__enlace {
      color: var(--ns-text-link);
      font-weight: 600;
      text-decoration: underline;
      text-decoration-color: var(--ns-brand-border);
      text-underline-offset: 3px;

      &:hover {
        text-decoration-color: currentColor;
      }

      &:focus-visible {
        outline: 2px solid var(--ns-focus-ring);
        outline-offset: 2px;
        border-radius: var(--ns-radius-xs);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TextoDatosSaludComponent {
  /** Nivel de los subtítulos según la página (3 dentro de un diálogo con h2). */
  readonly nivelTitulos = input(3, { transform: numberAttribute });
  /** Oculta el párrafo sobre cómo retirarlo (en Privacidad ya está el botón). */
  readonly sinRevocar = input(false, { transform: booleanAttribute });

  protected readonly categorias = CATEGORIAS;
}

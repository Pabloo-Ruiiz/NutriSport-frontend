import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { NsButtonComponent } from '@shared/ui/button/button.component';
import { DialogShellComponent } from '@shared/ui/overlay/dialog-shell.component';

/**
 * "Qué datos tratamos y por qué" (DESIGN.md §7.2): qué datos de salud se guardan, qué se envía al
 * proveedor de IA y cómo revocar el consentimiento. Se abre desde el registro.
 */
@Component({
  selector: 'app-datos-salud-dialog',
  imports: [DialogShellComponent, NsButtonComponent],
  template: `
    <ns-dialog-shell>
      <div class="ns-datos-salud">
        <p>
          Para calcular tus objetivos y registrar lo que comes, NutriSport AI trata datos relacionados con tu salud.
          Solo los usamos para darte el servicio y nunca los vendemos ni los cedemos con fines publicitarios.
        </p>

        <h3 class="ns-text-body-strong">Qué datos tratamos</h3>
        <ul>
          <li>
            <strong>Perfil:</strong> edad, sexo, altura, peso, objetivo, deporte, nivel de actividad y tus preferencias,
            alergias o intolerancias.
          </li>
          <li><strong>Comidas:</strong> lo que registras, con sus cantidades y su valor nutricional.</li>
          <li><strong>Fotos de tus platos:</strong> para estimar los alimentos y las cantidades.</li>
          <li><strong>Entrenamientos y peso:</strong> para ajustar la energía y los macros a tu actividad.</li>
        </ul>

        <h3 class="ns-text-body-strong">Qué se envía al proveedor de IA</h3>
        <ul>
          <li>Las fotos de tus platos, <strong>sin metadatos</strong> (ni ubicación ni datos del dispositivo).</li>
          <li>Los datos nutricionales necesarios para analizar una comida o sugerirte un plato.</li>
          <li><strong>Nunca</strong> tu nombre ni tu email.</li>
        </ul>

        <h3 class="ns-text-body-strong">Puedes cambiar de opinión</h3>
        <p>
          Puedes revocar este consentimiento cuando quieras en <strong>Configuración › Privacidad</strong>. Mientras
          esté revocado, las funciones que usan estos datos quedan bloqueadas; tus datos no se borran salvo que elimines
          la cuenta.
        </p>
      </div>
      <button nsDialogAcciones nsButton type="button" (click)="ref.close()">Entendido</button>
    </ns-dialog-shell>
  `,
  styles: `
    .ns-datos-salud {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-3);
      color: var(--ns-text-secondary);

      h3 {
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
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatosSaludDialogComponent {
  protected readonly ref = inject(DialogRef);
}

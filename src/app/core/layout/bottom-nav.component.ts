import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';

import { NsDialogService } from '@shared/ui/overlay/dialog.service';
import { BARRA_INFERIOR } from './navegacion';
import { RegistrarSheetComponent } from './registrar-sheet.component';

/**
 * Barra inferior en móvil (DESIGN.md §6.4): Inicio · Comidas · [Registrar] · Actividad · Perfil.
 * El botón central (círculo de 56 px green-700 con la cámara) abre el bottom sheet de registro.
 * Respeta el safe-area inferior. El activo se marca con color, texto en negrita y una barra
 * superior de 3 px (no solo color).
 */
@Component({
  selector: 'ns-bottom-nav',
  imports: [RouterLink, RouterLinkActive, LucideDynamicIcon],
  template: `
    <nav class="ns-bottom-nav" aria-label="Navegación inferior">
      <ul class="ns-bottom-nav__lista" role="list">
        @for (elemento of barra.izquierda; track elemento.ruta) {
          <li>
            <a
              class="ns-bottom-nav__enlace"
              [routerLink]="elemento.ruta"
              routerLinkActive="ns-bottom-nav__enlace--activo"
              ariaCurrentWhenActive="page"
            >
              <svg [lucideIcon]="elemento.icono" [size]="22" aria-hidden="true"></svg>
              <span>{{ elemento.etiqueta }}</span>
            </a>
          </li>
        }
        <li class="ns-bottom-nav__central">
          <button
            type="button"
            class="ns-bottom-nav__registrar"
            aria-label="Registrar comida"
            aria-haspopup="dialog"
            (click)="abrirRegistro()"
          >
            <svg lucideIcon="camera" [size]="24" aria-hidden="true"></svg>
          </button>
        </li>
        @for (elemento of barra.derecha; track elemento.ruta) {
          <li>
            <a
              class="ns-bottom-nav__enlace"
              [routerLink]="elemento.ruta"
              routerLinkActive="ns-bottom-nav__enlace--activo"
              ariaCurrentWhenActive="page"
            >
              <svg [lucideIcon]="elemento.icono" [size]="22" aria-hidden="true"></svg>
              <span>{{ elemento.etiqueta }}</span>
            </a>
          </li>
        }
      </ul>
    </nav>
  `,
  styleUrl: './bottom-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomNavComponent {
  private readonly dialogos = inject(NsDialogService);
  protected readonly barra = BARRA_INFERIOR;

  protected abrirRegistro(): void {
    this.dialogos.open(RegistrarSheetComponent, { titulo: 'Registrar comida', size: 'sm' });
  }
}

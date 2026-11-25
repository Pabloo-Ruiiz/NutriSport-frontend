import { ChangeDetectionStrategy, Component } from '@angular/core';

import { ShellComponent } from './shell.component';

/**
 * Zona de administración (DESIGN.md §7.17): el mismo shell con la franja superior de 3 px ai-600
 * y el badge "Admin" en la topbar, para diferenciar el contexto. Va con adminGuard.
 */
@Component({
  selector: 'ns-admin-layout',
  imports: [ShellComponent],
  template: `<ns-shell modo="admin" />`,
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayoutComponent {}

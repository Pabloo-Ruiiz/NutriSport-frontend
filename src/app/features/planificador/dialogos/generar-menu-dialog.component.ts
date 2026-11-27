import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import type { MenuResponse, TipoMenu } from '@core/models';
import { MenusService } from '@core/services/menus.service';
import { aApiError } from '@core/util/api-error';
import { hoyLocal } from '@core/util/fechas';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsCheckboxComponent } from '@shared/ui/form/checkbox.component';
import type { NsOpcion } from '@shared/ui/form/control-valor';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { NsInputDirective } from '@shared/ui/form/input.directive';
import { NsSegmentedComponent } from '@shared/ui/form/segmented.component';
import { DialogShellComponent } from '@shared/ui/overlay/dialog-shell.component';
import { fechaInicioSugerida } from '../planificador';

export interface GenerarMenuData {
  /** Fecha de la semana que se está viendo: se propone si no es anterior a hoy. */
  fechaPreferida?: string | null;
}

/** Nombre del menú: máx. 100 caracteres (GenerarMenuRequest.nombre). */
export const MAX_NOMBRE_MENU = 100;

export const MENSAJE_SIN_RECETAS =
  'No hay recetas que encajen con tus restricciones: revisa tus preferencias o publica más recetas';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Generar un menú con el motor de reglas (docs/api/menus.md §7.5): tipo (Diario / Semanal), fecha
 * de inicio (no anterior a hoy; en semanal se propone el próximo lunes), nombre opcional y "Pedir
 * una explicación breve" → POST /menus/generar. Se cierra con el menú nuevo; sin valor si se cancela.
 *
 * - 422 SIN_RECETAS_COMPATIBLES → aviso para revisar preferencias o publicar recetas.
 * - 422 PERFIL_REQUERIDO → se cierra y lleva a /bienvenida.
 */
@Component({
  selector: 'app-generar-menu-dialog',
  imports: [
    DialogShellComponent,
    FormsModule,
    NsAlertComponent,
    NsButtonComponent,
    NsCheckboxComponent,
    NsFormFieldComponent,
    NsInputDirective,
    NsSegmentedComponent,
  ],
  template: `
    <ns-dialog-shell>
      <form id="ns-generar-form" class="ns-generar" (ngSubmit)="generar()" novalidate>
        <ns-form-field label="Tipo de menú">
          <ns-segmented name="tipo" [opciones]="tipos" [ngModel]="tipo()" (ngModelChange)="cambiarTipo($event)" />
        </ns-form-field>

        <ns-form-field
          label="Fecha de inicio"
          obligatorio
          [hint]="tipo() === 'SEMANAL' ? 'Siete días seguidos; de lunes a domingo si empieza en lunes.' : undefined"
        >
          <input
            nsInput
            type="date"
            name="fechaInicio"
            [min]="hoy"
            [ngModel]="fecha()"
            (ngModelChange)="cambiarFecha($event)"
            [invalido]="!!errorFecha()"
            descritoPor="ns-generar-error-fecha"
          />
        </ns-form-field>
        <p class="ns-generar__error" id="ns-generar-error-fecha" [hidden]="!errorFecha()">{{ errorFecha() }}</p>

        <ns-form-field label="Nombre" hint="Opcional.">
          <input
            nsInput
            type="text"
            name="nombre"
            autocomplete="off"
            [maxlength]="maxNombre"
            [ngModel]="nombre()"
            (ngModelChange)="nombre.set($event)"
          />
        </ns-form-field>

        <ns-checkbox name="conExplicacion" [ngModel]="conExplicacion()" (ngModelChange)="conExplicacion.set($event)">
          Pedir una explicación breve
        </ns-checkbox>

        @if (error(); as error) {
          <ns-alert type="error">{{ error }}</ns-alert>
        }
      </form>

      <button
        nsDialogAcciones
        nsButton
        type="button"
        variant="secondary"
        [disabled]="generando()"
        (click)="ref.close()"
      >
        Cancelar
      </button>
      <button nsDialogAcciones nsButton type="submit" form="ns-generar-form" icon="plus" [loading]="generando()">
        Generar menú
      </button>
    </ns-dialog-shell>
  `,
  styles: `
    .ns-generar {
      display: flex;
      flex-direction: column;
      gap: var(--ns-space-4);
    }
    .ns-generar__error {
      margin: calc(-1 * var(--ns-space-3)) 0 0;
      color: var(--ns-error);
      font-size: 0.8125rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenerarMenuDialogComponent {
  protected readonly ref = inject<DialogRef<MenuResponse>>(DialogRef);
  private readonly menusService = inject(MenusService);
  private readonly router = inject(Router);
  private readonly preferida = inject<GenerarMenuData | null>(DIALOG_DATA, { optional: true })?.fechaPreferida;

  protected readonly hoy = hoyLocal();
  protected readonly maxNombre = MAX_NOMBRE_MENU;
  protected readonly tipos: NsOpcion<TipoMenu>[] = [
    { valor: 'DIARIO', etiqueta: 'Diario' },
    { valor: 'SEMANAL', etiqueta: 'Semanal' },
  ];

  protected readonly tipo = signal<TipoMenu>('SEMANAL');
  protected readonly fecha = signal(fechaInicioSugerida('SEMANAL', this.hoy, this.preferida));
  protected readonly nombre = signal('');
  protected readonly conExplicacion = signal(true);
  protected readonly generando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly errorFecha = signal<string | null>(null);

  /** true cuando el usuario ha elegido la fecha: ya no se cambia al cambiar el tipo. */
  private fechaTocada = false;

  protected cambiarTipo(tipo: TipoMenu): void {
    this.tipo.set(tipo);
    if (!this.fechaTocada) this.fecha.set(fechaInicioSugerida(tipo, this.hoy, this.preferida));
  }

  protected cambiarFecha(fecha: string): void {
    this.fechaTocada = true;
    this.fecha.set(fecha);
    this.errorFecha.set(null);
  }

  protected generar(): void {
    if (this.generando()) return;
    const fechaInicio = this.fecha();
    if (!FECHA.test(fechaInicio)) {
      this.errorFecha.set('Indica la fecha de inicio.');
      return;
    }
    if (fechaInicio < this.hoy) {
      this.errorFecha.set('La fecha de inicio no puede ser anterior a hoy.');
      return;
    }

    const nombre = this.nombre().trim();
    this.generando.set(true);
    this.error.set(null);
    this.menusService
      .generar({
        tipo: this.tipo(),
        fechaInicio,
        conExplicacion: this.conExplicacion(),
        ...(nombre ? { nombre: nombre.slice(0, MAX_NOMBRE_MENU) } : {}),
      })
      .subscribe({
        next: (menu) => this.ref.close(menu),
        error: (e: unknown) => {
          const error = aApiError(e);
          this.generando.set(false);
          if (error.esCodigo('PERFIL_REQUERIDO')) {
            this.ref.close();
            void this.router.navigate(['/bienvenida']);
            return;
          }
          if (error.esCodigo('SIN_RECETAS_COMPATIBLES')) {
            this.error.set(MENSAJE_SIN_RECETAS);
            return;
          }
          const deFecha = error.errores.find((c) => c.campo === 'fechaInicio');
          if (deFecha) this.errorFecha.set(deFecha.mensaje);
          else this.error.set(error.detalle);
        },
      });
  }
}

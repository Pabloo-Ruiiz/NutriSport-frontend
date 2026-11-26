import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { catchError, firstValueFrom, of, switchMap } from 'rxjs';

import type { ActualizarUsuarioAdminRequest, Rol, UsuarioAdminResponse } from '@core/models';
import { AdminUsuariosService } from '@core/services/admin/admin-usuarios.service';
import { AuthService } from '@core/services/auth.service';
import { aApiError } from '@core/util/api-error';
import { EtiquetaPipe } from '@shared/pipes/etiqueta.pipe';
import { FechaCortaPipe } from '@shared/pipes/fecha-corta.pipe';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsBadgeComponent } from '@shared/ui/feedback/badge.component';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import { NsCheckboxComponent } from '@shared/ui/form/checkbox.component';
import { NsConfirmService } from '@shared/ui/overlay/confirm.service';
import { VARIANTE_ESTADO, VARIANTE_ROL, rolesOrdenados } from './usuarios-admin';

/** Al menos un rol marcado. */
function alMenosUnRol(grupo: AbstractControl): ValidationErrors | null {
  const { deportista, admin } = grupo.getRawValue() as { deportista: boolean; admin: boolean };
  return deportista || admin ? null : { sinRoles: true };
}

/**
 * Detalle de un usuario en el drawer de /admin/usuarios: datos de la cuenta (nunca datos de
 * salud), bloquear/desbloquear y roles. Una cuenta ELIMINADA se muestra en solo lectura.
 *
 *   <app-usuario-detalle [usuario]="u" (actualizado)="alActualizar($event)" />
 *
 * Muestra enseguida los datos de la fila y los refresca con GET /admin/usuarios/{id}. Los errores
 * del PATCH (p. ej. 422 REGLA_NEGOCIO: un administrador no puede bloquearse ni quitarse el rol
 * ADMIN) se muestran en un ns-alert con el `detail` del backend.
 */
@Component({
  selector: 'app-usuario-detalle',
  imports: [
    ReactiveFormsModule,
    LucideDynamicIcon,
    EtiquetaPipe,
    FechaCortaPipe,
    NsAlertComponent,
    NsBadgeComponent,
    NsButtonComponent,
    NsCheckboxComponent,
  ],
  templateUrl: './usuario-detalle.component.html',
  styleUrl: './usuario-detalle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuarioDetalleComponent {
  private readonly servicio = inject(AdminUsuariosService);
  private readonly auth = inject(AuthService);
  private readonly confirmacion = inject(NsConfirmService);
  private readonly toasts = inject(NsToastService);

  readonly usuario = input.required<UsuarioAdminResponse>();
  readonly actualizado = output<UsuarioAdminResponse>();

  /** Lo último que se sabe: la fila, luego el GET y, tras guardar, la respuesta del PATCH. */
  protected readonly actual = linkedSignal<UsuarioAdminResponse>(() => this.usuario());
  protected readonly soloLectura = computed(() => this.actual().estado === 'ELIMINADO');
  protected readonly bloqueado = computed(() => this.actual().estado === 'BLOQUEADO');
  protected readonly esUnoMismo = computed(() => this.auth.cuenta()?.id === this.actual().id);
  protected readonly roles = computed(() => rolesOrdenados(this.actual().roles));

  protected readonly guardando = signal<'estado' | 'roles' | null>(null);
  /** detail del último error del PATCH. */
  protected readonly error = signal<string | null>(null);

  protected readonly formRoles = new FormGroup(
    {
      deportista: new FormControl(false, { nonNullable: true }),
      admin: new FormControl(false, { nonNullable: true }),
    },
    { validators: alMenosUnRol },
  );
  private readonly valorRoles = toSignal(this.formRoles.valueChanges, { initialValue: this.formRoles.getRawValue() });
  protected readonly rolesCambiados = computed(() => {
    this.valorRoles();
    const actuales = this.actual().roles;
    const marcados = this.rolesMarcados();
    return marcados.length !== actuales.length || marcados.some((rol) => !actuales.includes(rol));
  });

  protected readonly varianteEstado = VARIANTE_ESTADO;
  protected readonly varianteRol = VARIANTE_ROL;

  constructor() {
    // Datos frescos de la cuenta; si falla, se queda con los de la fila.
    toObservable(computed(() => this.usuario().id))
      .pipe(
        switchMap((id) => this.servicio.detalle(id).pipe(catchError(() => of(null)))),
        takeUntilDestroyed(),
      )
      .subscribe((usuario) => {
        if (usuario && usuario.id === this.actual().id && this.guardando() === null) this.actual.set(usuario);
      });

    // El formulario refleja los roles guardados; solo lectura si la cuenta está eliminada. Un
    // administrador no puede quitarse a sí mismo el rol ADMIN.
    effect(() => {
      const u = this.actual();
      this.formRoles.reset({ deportista: u.roles.includes('DEPORTISTA'), admin: u.roles.includes('ADMIN') });
      if (this.soloLectura()) this.formRoles.disable();
      else {
        this.formRoles.enable();
        if (this.esUnoMismo() && u.roles.includes('ADMIN')) this.formRoles.controls.admin.disable();
      }
    });
  }

  protected async cambiarBloqueo(): Promise<void> {
    const u = this.actual();
    const bloquear = u.estado === 'ACTIVO';
    const confirmado = await this.confirmacion.confirmar(
      bloquear
        ? {
            titulo: `¿Bloquear a ${u.nombre}?`,
            mensaje:
              'No podrá iniciar sesión hasta que lo desbloquees y se cerrarán todas sus sesiones abiertas, en cualquier dispositivo. Sus datos no se borran.',
            textoConfirmar: 'Bloquear',
            peligro: true,
          }
        : {
            titulo: `¿Desbloquear a ${u.nombre}?`,
            mensaje: 'Podrá volver a iniciar sesión con su email y contraseña.',
            textoConfirmar: 'Desbloquear',
          },
    );
    if (!confirmado) return;
    const hecho = await this.guardar('estado', { estado: bloquear ? 'BLOQUEADO' : 'ACTIVO' });
    if (hecho) this.toasts.exito(bloquear ? 'Usuario bloqueado' : 'Usuario desbloqueado', u.nombre);
  }

  protected async guardarRoles(): Promise<void> {
    if (this.formRoles.invalid || !this.rolesCambiados()) return;
    const hecho = await this.guardar('roles', { roles: this.rolesMarcados() });
    if (hecho) this.toasts.exito('Roles actualizados', this.actual().nombre);
  }

  private rolesMarcados(): Rol[] {
    const { deportista, admin } = this.formRoles.getRawValue();
    return [...(deportista ? (['DEPORTISTA'] as const) : []), ...(admin ? (['ADMIN'] as const) : [])];
  }

  private async guardar(que: 'estado' | 'roles', req: ActualizarUsuarioAdminRequest): Promise<boolean> {
    this.guardando.set(que);
    this.error.set(null);
    try {
      const usuario = await firstValueFrom(this.servicio.actualizar(this.actual().id, req));
      this.actual.set(usuario);
      this.actualizado.emit(usuario);
      return true;
    } catch (e) {
      // 422 REGLA_NEGOCIO (cuenta eliminada, bloquearse o quitarse ADMIN) y el resto: el detail.
      this.error.set(aApiError(e).detalle);
      return false;
    } finally {
      this.guardando.set(null);
    }
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { rutaDeInicio } from '@core/guards/invitado.guard';
import { AuthService } from '@core/services/auth.service';
import { CuentaService } from '@core/services/cuenta.service';
import { aApiError } from '@core/util/api-error';
import { leerTokenDelFragmento } from '@core/util/token-fragmento';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsEmptyStateComponent } from '@shared/ui/feedback/empty-state.component';
import { NsSpinnerComponent } from '@shared/ui/feedback/spinner.component';
import { ReenviarVerificacionComponent } from '../componentes/reenviar-verificacion.component';

export type EstadoVerificacion = 'comprobando' | 'ok' | 'error' | 'sin-token';

/** Tipo de error al verificar: el enlace no vale, el email nuevo ya lo usa otra cuenta u otro. */
export type ErrorVerificacion = 'token-no-valido' | 'email-en-uso' | 'otro';

/**
 * Enlace del email de verificación o de cambio de email (NutriSport_API.md §2.2, DESIGN.md §7.18):
 * `/verificar-email#token=…`. Sin guard: vale con o sin sesión.
 *
 * Lee el token del fragmento (y lo quita de la URL) y llama a POST /auth/verificar-email:
 * - 204 → "Email verificado". Con sesión, recarga la cuenta (emailVerificado o el email nuevo).
 * - 400 TOKEN_NO_VALIDO → enlace caducado o ya usado, con formulario para pedir otro.
 * - 409 EMAIL_EN_USO → el email nuevo ya lo usa otra cuenta.
 * - Otro error (sin conexión, 500…) → su mensaje y "Reintentar" con el mismo token.
 */
@Component({
  selector: 'app-verificar-email',
  imports: [RouterLink, NsButtonComponent, NsEmptyStateComponent, NsSpinnerComponent, ReenviarVerificacionComponent],
  template: `
    @switch (estado()) {
      @case ('comprobando') {
        <div class="ns-auth-estado__cargando">
          <ns-spinner [size]="32" etiqueta="Comprobando el enlace" />
          <h1 class="ns-text-h3">Comprobando el enlace…</h1>
        </div>
      }

      @case ('ok') {
        <ns-empty-state
          icon="circle-check"
          titulo="Email verificado"
          descripcion="Ya está todo listo. Gracias por confirmar tu email."
          [nivelTitulo]="1"
        >
          @if (autenticado()) {
            <a nsButton size="lg" [routerLink]="inicio()">Ir a mi panel</a>
          } @else {
            <a nsButton size="lg" routerLink="/login">Iniciar sesión</a>
          }
        </ns-empty-state>
      }

      @case ('error') {
        @switch (error()) {
          @case ('token-no-valido') {
            <ns-empty-state
              icon="triangle-exclamation-point"
              titulo="El enlace ha caducado o ya se ha usado"
              descripcion="Los enlaces de verificación caducan a las 24 horas y solo sirven una vez. Pide uno nuevo."
              [nivelTitulo]="1"
            >
              <div class="ns-auth-estado__acciones">
                <app-reenviar-verificacion
                  [email]="emailCuenta()"
                  textoBoton="Enviar un enlace nuevo"
                  variante="primary"
                />
                <a class="ns-auth-form__enlace" [routerLink]="autenticado() ? inicio() : '/login'">
                  {{ autenticado() ? 'Ir a mi panel' : 'Ir a iniciar sesión' }}
                </a>
              </div>
            </ns-empty-state>
          }
          @case ('email-en-uso') {
            <ns-empty-state
              icon="circle-exclamation-point"
              titulo="Ese email ya está en uso por otra cuenta"
              descripcion="No hemos podido cambiar tu email. Tu cuenta sigue con el email anterior."
              [nivelTitulo]="1"
            >
              @if (autenticado()) {
                <a nsButton routerLink="/configuracion">Ir a configuración</a>
              } @else {
                <a nsButton routerLink="/login">Iniciar sesión</a>
              }
            </ns-empty-state>
          }
          @default {
            <ns-empty-state
              icon="cloud-off"
              titulo="No hemos podido verificar tu email"
              [descripcion]="detalleError()"
              [nivelTitulo]="1"
            >
              <button nsButton type="button" (click)="verificar()">Reintentar</button>
            </ns-empty-state>
          }
        }
      }

      @case ('sin-token') {
        <ns-empty-state
          icon="triangle-exclamation-point"
          titulo="El enlace está incompleto"
          descripcion="Abre el enlace directamente desde el email o cópialo entero. Si no funciona, pide uno nuevo."
          [nivelTitulo]="1"
        >
          <div class="ns-auth-estado__acciones">
            <app-reenviar-verificacion [email]="emailCuenta()" textoBoton="Enviar un enlace nuevo" variante="primary" />
            <a class="ns-auth-form__enlace" [routerLink]="autenticado() ? inicio() : '/login'">
              {{ autenticado() ? 'Ir a mi panel' : 'Ir a iniciar sesión' }}
            </a>
          </div>
        </ns-empty-state>
      }
    }
  `,
  styleUrl: '../auth-formulario.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerificarEmailComponent {
  private readonly auth = inject(AuthService);
  private readonly cuentas = inject(CuentaService);
  private readonly token = leerTokenDelFragmento(inject(ActivatedRoute));
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  readonly estado = signal<EstadoVerificacion>(this.token ? 'comprobando' : 'sin-token');
  readonly error = signal<ErrorVerificacion | null>(null);
  protected readonly detalleError = signal('');

  protected readonly autenticado = this.auth.autenticado;
  protected readonly inicio = computed(() => rutaDeInicio(this.auth.cuenta()?.roles));
  /** Con sesión, el email de la cuenta: "Enviar un enlace nuevo" no lo pide. */
  protected readonly emailCuenta = computed(() => this.auth.cuenta()?.email ?? null);

  constructor() {
    if (this.token) void this.verificar();
  }

  protected async verificar(): Promise<void> {
    if (!this.token) return;
    this.estado.set('comprobando');
    this.error.set(null);
    try {
      await firstValueFrom(this.auth.verificarEmail(this.token));
      this.estado.set('ok');
      this.enfocarResultado();
      // Con sesión: emailVerificado (o el email nuevo) cambia en la cuenta en memoria.
      if (this.auth.autenticado()) {
        this.cuentas.obtener().subscribe({ error: () => undefined });
      }
    } catch (e) {
      const error = aApiError(e);
      this.error.set(
        error.esCodigo('TOKEN_NO_VALIDO')
          ? 'token-no-valido'
          : error.esCodigo('EMAIL_EN_USO')
            ? 'email-en-uso'
            : 'otro',
      );
      this.detalleError.set(error.detalle);
      this.estado.set('error');
      this.enfocarResultado();
    }
  }

  /**
   * "Comprobando el enlace…" se sustituye por el resultado sin navegar: el foco va a su título
   * para que el lector de pantalla lo lea (DESIGN.md §10).
   */
  private enfocarResultado(): void {
    afterNextRender(
      () => {
        const titulo = this.host.nativeElement.querySelector<HTMLElement>('h1, [role="heading"]');
        if (!titulo) return;
        titulo.setAttribute('tabindex', '-1');
        titulo.focus();
      },
      { injector: this.injector },
    );
  }
}

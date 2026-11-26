import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { LogoComponent } from '@core/layout/logo.component';
import type { ObjetivosResponse } from '@core/models';
import { AuthService } from '@core/services/auth.service';
import { PerfilService } from '@core/services/perfil.service';
import { aApiError } from '@core/util/api-error';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsStepperComponent } from '@shared/ui/nav/stepper.component';
import { ResumenObjetivosComponent } from '../perfil/componentes/resumen-objetivos.component';
import { PasoAlimentacionComponent } from './paso-alimentacion.component';
import { PasoDeporteComponent } from './paso-deporte.component';
import { PasoObjetivoComponent } from './paso-objetivo.component';
import { PasoSobreTiComponent } from './paso-sobre-ti.component';
import {
  PASOS_PERFIL,
  aPerfilRequest,
  aPreferencias,
  aplicarErroresPerfil,
  crearFormularioPerfil,
} from './perfil-form';

interface InfoPaso {
  etiqueta: string;
  titulo: string;
  descripcion: string;
}

const PASOS: readonly InfoPaso[] = [
  { etiqueta: 'Sobre ti', titulo: 'Sobre ti', descripcion: 'Con estos datos estimamos lo que gastas en reposo.' },
  {
    etiqueta: 'Tu deporte',
    titulo: 'Tu deporte',
    descripcion: 'Así sabemos cuánto entrenas y cuánto te mueves el resto del día.',
  },
  { etiqueta: 'Tu objetivo', titulo: 'Tu objetivo', descripcion: 'Ajustamos la energía y los macros a lo que buscas.' },
  {
    etiqueta: 'Alimentación',
    titulo: 'Tu alimentación',
    descripcion: 'Lo tendremos en cuenta en los avisos y las sugerencias. Puedes cambiarlo cuando quieras.',
  },
];

/**
 * Configuración inicial del perfil en /bienvenida (DESIGN.md §7.3): pantalla completa con el
 * logotipo, ns-stepper de 4 pasos, tarjeta central de 640 px y pie "Atrás" / "Continuar" (fijo abajo
 * en móvil).
 *
 * Cada paso se valida antes de avanzar. Al terminar: PUT /perfil, PUT /perfil/preferencias y
 * GET /perfil/objetivos, y se muestra el resumen. Un 400 de PUT /perfil vuelve al primer paso con
 * un campo erróneo.
 */
@Component({
  selector: 'app-onboarding',
  imports: [
    LogoComponent,
    NsAlertComponent,
    NsButtonComponent,
    NsStepperComponent,
    PasoSobreTiComponent,
    PasoDeporteComponent,
    PasoObjetivoComponent,
    PasoAlimentacionComponent,
    ResumenObjetivosComponent,
  ],
  templateUrl: './onboarding.component.html',
  styleUrl: './onboarding.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingComponent {
  private readonly perfil = inject(PerfilService);
  private readonly auth = inject(AuthService);
  private readonly injector = inject(Injector);

  protected readonly form = crearFormularioPerfil();
  protected readonly etiquetasPasos = PASOS.map((p) => p.etiqueta);

  /** Paso actual (0–3). */
  protected readonly paso = signal(0);
  protected readonly info = computed(() => PASOS[this.paso()]);
  protected readonly esUltimo = computed(() => this.paso() === PASOS.length - 1);

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  /** Objetivos calculados: cuando llegan, se muestra el resumen. */
  protected readonly objetivos = signal<ObjetivosResponse | null>(null);

  private readonly tarjeta = viewChild<ElementRef<HTMLElement>>('tarjeta');
  private readonly titulo = viewChild<ElementRef<HTMLElement>>('titulo');

  protected grupoDe(indice: number) {
    return this.form.controls[PASOS_PERFIL[indice]];
  }

  protected atras(): void {
    if (this.paso() > 0) this.irA(this.paso() - 1);
  }

  /** Solo se puede volver a un paso ya completado (el stepper solo ofrece esos). */
  protected irAPaso(indice: number): void {
    if (indice < this.paso()) this.irA(indice);
  }

  protected async continuar(): Promise<void> {
    if (this.enviando()) return;
    const grupo = this.grupoDe(this.paso());
    if (grupo.invalid) {
      grupo.markAllAsTouched();
      this.enfocarPrimerError();
      return;
    }
    if (this.esUltimo()) await this.enviar();
    else this.irA(this.paso() + 1);
  }

  protected cerrarSesion(): void {
    void this.auth.logout();
  }

  private async enviar(): Promise<void> {
    this.enviando.set(true);
    this.error.set(null);
    const valor = this.form.getRawValue();
    try {
      try {
        await firstValueFrom(this.perfil.guardar(aPerfilRequest(valor)));
      } catch (e) {
        const error = aApiError(e);
        const pasoConError = error.status === 400 ? aplicarErroresPerfil(this.form, error) : null;
        if (pasoConError !== null) {
          this.irA(pasoConError, false);
          // Al montar el paso, sus formControlName vuelven a validar los controles y borran el error
          // 'servidor': se aplica otra vez una vez pintado.
          afterNextRender(
            () => {
              aplicarErroresPerfil(this.form, error);
              this.enfocarPrimerError();
            },
            { injector: this.injector },
          );
        } else {
          this.error.set(error.detalle);
        }
        return;
      }

      try {
        await firstValueFrom(this.perfil.guardarPreferencias(aPreferencias(valor)));
      } catch (e) {
        const error = aApiError(e);
        if (error.status === 400) aplicarErroresPerfil(this.form, error);
        // El perfil ya está guardado: al reintentar, PUT /perfil lo actualiza sin duplicar nada.
        this.error.set(`Tu perfil se ha guardado, pero no tus preferencias. ${error.detalle}`);
        return;
      }

      this.objetivos.set(await firstValueFrom(this.perfil.objetivos()));
      this.enfocar(() => this.titulo()?.nativeElement);
    } catch (e) {
      this.error.set(aApiError(e).detalle);
    } finally {
      this.enviando.set(false);
    }
  }

  private irA(indice: number, enfocarTitulo = true): void {
    this.error.set(null);
    this.paso.set(indice);
    if (enfocarTitulo) this.enfocar(() => this.titulo()?.nativeElement);
  }

  /** Lleva el foco al primer control con error del paso visible. */
  private enfocarPrimerError(): void {
    this.enfocar(() =>
      this.tarjeta()?.nativeElement.querySelector<HTMLElement>(
        '[aria-invalid="true"], input.ng-invalid, fieldset.ng-invalid input, .ns-paso__error:not([hidden])',
      ),
    );
  }

  private enfocar(objetivo: () => HTMLElement | null | undefined): void {
    afterNextRender(
      () => {
        const elemento = objetivo();
        if (!elemento) return;
        if (elemento.matches('.ns-paso__error')) {
          // Error de un grupo de tarjetas: el foco va a su primera opción.
          elemento.closest('fieldset')?.querySelector<HTMLElement>('input')?.focus();
        } else {
          elemento.focus();
        }
      },
      { injector: this.injector },
    );
  }
}

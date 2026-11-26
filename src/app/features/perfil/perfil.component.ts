import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom, forkJoin } from 'rxjs';

import type { ConCambiosSinGuardar } from '@core/guards/cambios-sin-guardar.guard';
import { iniciales } from '@core/layout/navegacion';
import type { ObjetivosResponse, PerfilResponse, PesoResponse, TipoActividadResponse } from '@core/models';
import { ETIQUETAS_OBJETIVO } from '@core/models/etiquetas';
import { AuthService } from '@core/services/auth.service';
import { PerfilService } from '@core/services/perfil.service';
import { TiposActividadService } from '@core/services/tipos-actividad.service';
import { type ApiError, aApiError } from '@core/util/api-error';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { NsSkeletonComponent } from '@shared/ui/feedback/skeleton.component';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import type { NsOpcion } from '@shared/ui/form/control-valor';
import { NsTabPanelDirective, NsTabsComponent } from '@shared/ui/nav/tabs.component';
import { PasoAlimentacionComponent } from '../onboarding/paso-alimentacion.component';
import { PasoDeporteComponent } from '../onboarding/paso-deporte.component';
import { PasoObjetivoComponent } from '../onboarding/paso-objetivo.component';
import { PasoSobreTiComponent } from '../onboarding/paso-sobre-ti.component';
import {
  PASOS_PERFIL,
  type PasoPerfil,
  aPerfilRequest,
  aPreferencias,
  aplicarErroresPerfil,
  crearFormularioPerfil,
  rellenarFormularioPerfil,
} from '../onboarding/perfil-form';
import { TarjetaObjetivosComponent } from './tarjeta-objetivos.component';

/** Pestañas en el mismo orden que PASOS_PERFIL. */
const PESTANAS: readonly NsOpcion<PasoPerfil>[] = [
  { valor: 'sobreTi', etiqueta: 'Datos físicos' },
  { valor: 'deporte', etiqueta: 'Deporte' },
  { valor: 'objetivo', etiqueta: 'Objetivo y macros' },
  { valor: 'alimentacion', etiqueta: 'Alimentación' },
];

type Estado = 'cargando' | 'error' | 'listo';

/**
 * Mi perfil (DESIGN.md §7.5): cabecera con avatar, nombre, deporte y objetivo; pestañas con los
 * mismos pasos que el onboarding; tarjeta de objetivos (lateral en escritorio, debajo en móvil).
 *
 * Cada pestaña guarda por separado:
 * - Datos físicos, Deporte y Objetivo: PUT /perfil con el perfil completo.
 * - Alimentación: PUT /perfil (comidas por día y tiempo de cocina van en el perfil) y
 *   PUT /perfil/preferencias.
 * Después recarga los objetivos y, si no son manuales, avisa de que se han recalculado.
 *
 * Con cambios sin guardar, cambiosSinGuardarGuard pregunta antes de salir y el navegador avisa al
 * cerrar o recargar la pestaña.
 */
@Component({
  selector: 'app-perfil',
  imports: [
    NsAlertComponent,
    NsButtonComponent,
    NsSkeletonComponent,
    NsTabsComponent,
    NsTabPanelDirective,
    PasoSobreTiComponent,
    PasoDeporteComponent,
    PasoObjetivoComponent,
    PasoAlimentacionComponent,
    TarjetaObjetivosComponent,
  ],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.scss',
  host: { '(window:beforeunload)': 'alSalirDelNavegador($event)' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerfilComponent implements ConCambiosSinGuardar {
  private readonly auth = inject(AuthService);
  private readonly perfilService = inject(PerfilService);
  private readonly tiposActividad = inject(TiposActividadService);
  private readonly toasts = inject(NsToastService);

  protected readonly form = crearFormularioPerfil();
  protected readonly pestanas = PESTANAS;
  protected readonly pestana = signal<string | null>('sobreTi');

  protected readonly estado = signal<Estado>('cargando');
  protected readonly errorCarga = signal<string | null>(null);

  /** Último perfil guardado (la cabecera muestra lo guardado, no lo que se está editando). */
  protected readonly perfil = signal<PerfilResponse | null>(null);
  protected readonly objetivos = signal<ObjetivosResponse | null>(null);
  private readonly tipos = signal<TipoActividadResponse[]>([]);

  /** Pestaña que se está guardando, o null. */
  protected readonly guardando = signal<PasoPerfil | null>(null);
  protected readonly errorGuardado = signal<string | null>(null);
  protected readonly recalculado = signal(false);

  protected readonly avatar = computed(() => iniciales(this.auth.cuenta()?.nombre));
  protected readonly nombre = computed(() => this.auth.cuenta()?.nombre ?? '');
  protected readonly deporte = computed(() => {
    const codigo = this.perfil()?.deportePrincipal;
    return this.tipos().find((t) => t.codigo === codigo)?.nombre ?? codigo ?? '';
  });
  protected readonly objetivo = computed(() => {
    const objetivo = this.perfil()?.objetivo;
    return objetivo ? ETIQUETAS_OBJETIVO[objetivo] : '';
  });

  constructor() {
    void this.cargar();
  }

  tieneCambiosSinGuardar(): boolean {
    return this.estado() === 'listo' && this.form.dirty;
  }

  protected alSalirDelNavegador(evento: BeforeUnloadEvent): void {
    if (this.tieneCambiosSinGuardar()) evento.preventDefault();
  }

  protected async cargar(): Promise<void> {
    this.estado.set('cargando');
    this.errorCarga.set(null);
    try {
      const { perfil, preferencias, objetivos } = await firstValueFrom(
        forkJoin({
          perfil: this.perfilService.obtener(),
          preferencias: this.perfilService.preferencias(),
          objetivos: this.perfilService.objetivos(),
        }),
      );
      rellenarFormularioPerfil(this.form, perfil, preferencias);
      this.perfil.set(perfil);
      this.objetivos.set(objetivos);
      this.estado.set('listo');
    } catch (e) {
      this.errorCarga.set(aApiError(e).detalle);
      this.estado.set('error');
    }
    // Solo para el nombre del deporte en la cabecera; si falla, se muestra el código.
    this.tiposActividad.listar().subscribe({ next: (tipos) => this.tipos.set(tipos), error: () => undefined });
  }

  protected async guardar(paso: PasoPerfil): Promise<void> {
    if (this.guardando()) return;
    this.errorGuardado.set(null);
    this.recalculado.set(false);

    const grupo = this.form.controls[paso];
    if (grupo.invalid) {
      grupo.markAllAsTouched();
      return;
    }
    // PUT /perfil lleva el perfil completo: si otra pestaña tiene un error, hay que corregirlo antes.
    const otroPaso = PASOS_PERFIL.find((p) => p !== paso && this.form.controls[p].invalid);
    if (otroPaso) {
      this.form.controls[otroPaso].markAllAsTouched();
      this.errorGuardado.set(
        `Revisa la pestaña «${PESTANAS.find((p) => p.valor === otroPaso)!.etiqueta}»: tiene datos que no son válidos.`,
      );
      return;
    }

    this.guardando.set(paso);
    const valor = this.form.getRawValue();
    try {
      const perfil = await firstValueFrom(this.perfilService.guardar(aPerfilRequest(valor)));
      if (paso === 'alimentacion') {
        const preferencias = await firstValueFrom(this.perfilService.guardarPreferencias(aPreferencias(valor)));
        this.form.controls.alimentacion.controls.preferencias.reset(preferencias);
      }
      this.perfil.set(perfil);
      // Lo enviado en PUT /perfil ya está guardado, sea de la pestaña que sea.
      for (const p of PASOS_PERFIL) {
        if (p !== 'alimentacion') this.form.controls[p].markAsPristine();
      }
      const { comidasPorDia, tiempoMaxCocinaMin } = this.form.controls.alimentacion.controls;
      comidasPorDia.markAsPristine();
      tiempoMaxCocinaMin.markAsPristine();

      this.toasts.exito('Perfil guardado');
      await this.recargarObjetivos();
    } catch (e) {
      this.mostrarErrorGuardado(aApiError(e));
    } finally {
      this.guardando.set(null);
    }
  }

  protected alCambiarObjetivos(objetivos: ObjetivosResponse): void {
    this.objetivos.set(objetivos);
    this.recalculado.set(false);
  }

  /**
   * Tras registrar un peso: si es el más reciente, el backend cambia el peso del perfil y recalcula
   * los objetivos. Se recargan ambos; el peso del formulario solo se actualiza si no se estaba
   * editando.
   */
  protected async alRegistrarPeso(_pesaje: PesoResponse): Promise<void> {
    try {
      const perfil = await firstValueFrom(this.perfilService.obtener());
      this.perfil.set(perfil);
      const peso = this.form.controls.sobreTi.controls.pesoKg;
      if (!peso.dirty) peso.reset(perfil.pesoKg);
      await this.recargarObjetivos();
    } catch {
      // El pesaje ya está guardado; si la recarga falla, se verá al volver a entrar.
    }
  }

  private async recargarObjetivos(): Promise<void> {
    const objetivos = await firstValueFrom(this.perfilService.objetivos());
    this.objetivos.set(objetivos);
    this.recalculado.set(!objetivos.manuales);
  }

  private mostrarErrorGuardado(error: ApiError): void {
    const paso = error.status === 400 ? aplicarErroresPerfil(this.form, error) : null;
    if (paso !== null) {
      this.pestana.set(PASOS_PERFIL[paso]);
      this.errorGuardado.set('Revisa los campos marcados.');
    } else {
      this.errorGuardado.set(error.detalle);
    }
  }
}

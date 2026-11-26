import { Injector, inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';

/** Pantalla con un formulario que se puede abandonar a medias. */
export interface ConCambiosSinGuardar {
  tieneCambiosSinGuardar(): boolean;
}

/**
 * Pregunta antes de salir de una pantalla con cambios sin guardar (Mi perfil, formularios largos).
 * Para cerrar o recargar la pestaña, la pantalla añade además su propio aviso de beforeunload.
 *
 *   { path: 'perfil', loadComponent: …, canDeactivate: [cambiosSinGuardarGuard] }
 *
 * NsConfirmService se importa al usarlo: el guard está en app.routes.ts (bundle inicial) y el
 * diálogo arrastra CDK Dialog y los formularios.
 */
export const cambiosSinGuardarGuard: CanDeactivateFn<ConCambiosSinGuardar> = async (componente) => {
  if (!componente?.tieneCambiosSinGuardar()) return true;
  const injector = inject(Injector);
  const { NsConfirmService } = await import('@shared/ui/overlay/confirm.service');
  return injector.get(NsConfirmService).confirmar({
    titulo: '¿Salir sin guardar?',
    mensaje: 'Tienes cambios sin guardar. Si sales ahora, se perderán.',
    textoConfirmar: 'Salir sin guardar',
    textoCancelar: 'Seguir editando',
    peligro: true,
  });
};

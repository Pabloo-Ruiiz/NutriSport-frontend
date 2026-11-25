import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  GuardResult,
  MaybeAsync,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { firstValueFrom, isObservable } from 'rxjs';

import type { CuentaResponse, Rol } from '../models';
import { AuthService } from '../services/auth.service';
import { PerfilService } from '../services/perfil.service';
import { ApiError } from '../util/api-error';
import { adminGuard } from './admin.guard';
import { autenticadoGuard } from './autenticado.guard';
import { invitadoGuard } from './invitado.guard';
import { perfilGuard } from './perfil.guard';

/** AuthService simulado: solo lo que leen los guards, con signals que cada prueba ajusta. */
class AuthServiceFalso {
  readonly autenticado = signal(false);
  readonly esAdmin = signal(false);
  readonly consentimientoVigente = signal(true);
  readonly cuenta = signal<Pick<CuentaResponse, 'roles'> | null>(null);

  conRoles(...roles: Rol[]): void {
    this.autenticado.set(true);
    this.cuenta.set({ roles });
    this.esAdmin.set(roles.includes('ADMIN'));
  }
}

class PerfilServiceFalso {
  existe = vi.fn<() => Promise<boolean>>();
}

let auth: AuthServiceFalso;
let perfil: PerfilServiceFalso;

beforeEach(() => {
  auth = new AuthServiceFalso();
  perfil = new PerfilServiceFalso();
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: auth },
      { provide: PerfilService, useValue: perfil },
    ],
  });
});

/** Ejecuta el guard en el contexto de inyección del TestBed y espera su resultado. */
async function ejecutar(guard: CanActivateFn, url = '/inicio'): Promise<GuardResult> {
  const resultado: MaybeAsync<GuardResult> = TestBed.runInInjectionContext(() =>
    guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
  );
  return isObservable(resultado) ? firstValueFrom(resultado) : resultado;
}

function url(resultado: GuardResult): string {
  expect(resultado).toBeInstanceOf(UrlTree);
  return (resultado as UrlTree).toString();
}

describe('autenticadoGuard', () => {
  it('deja pasar con sesión', async () => {
    auth.conRoles('DEPORTISTA');
    expect(await ejecutar(autenticadoGuard)).toBe(true);
  });

  it('sin sesión manda a /login con la URL pedida en volver', async () => {
    const resultado = await ejecutar(autenticadoGuard, '/comidas?desde=2026-11-01');
    expect(url(resultado)).toBe('/login?volver=%2Fcomidas%3Fdesde%3D2026-11-01');
    expect((resultado as UrlTree).queryParams).toEqual({ volver: '/comidas?desde=2026-11-01' });
  });
});

describe('invitadoGuard', () => {
  it('deja pasar sin sesión', async () => {
    expect(await ejecutar(invitadoGuard)).toBe(true);
  });

  it('un deportista va a /inicio', async () => {
    auth.conRoles('DEPORTISTA');
    expect(url(await ejecutar(invitadoGuard))).toBe('/inicio');
  });

  it('quien es deportista y admin va a /inicio', async () => {
    auth.conRoles('DEPORTISTA', 'ADMIN');
    expect(url(await ejecutar(invitadoGuard))).toBe('/inicio');
  });

  it('quien solo es admin va a /admin/usuarios', async () => {
    auth.conRoles('ADMIN');
    expect(url(await ejecutar(invitadoGuard))).toBe('/admin/usuarios');
  });
});

describe('adminGuard', () => {
  it('deja pasar a un admin', async () => {
    auth.conRoles('ADMIN');
    expect(await ejecutar(adminGuard)).toBe(true);
  });

  it('un deportista va a /sin-permiso', async () => {
    auth.conRoles('DEPORTISTA');
    expect(url(await ejecutar(adminGuard))).toBe('/sin-permiso');
  });
});

describe('perfilGuard', () => {
  beforeEach(() => auth.conRoles('DEPORTISTA'));

  it('deja pasar si hay perfil', async () => {
    perfil.existe.mockResolvedValue(true);
    expect(await ejecutar(perfilGuard)).toBe(true);
  });

  it('sin perfil manda a /bienvenida', async () => {
    perfil.existe.mockResolvedValue(false);
    expect(url(await ejecutar(perfilGuard))).toBe('/bienvenida');
  });

  it('sin consentimiento vigente deja pasar sin consultar el perfil', async () => {
    auth.consentimientoVigente.set(false);
    expect(await ejecutar(perfilGuard)).toBe(true);
    expect(perfil.existe).not.toHaveBeenCalled();
  });

  it('propaga otros errores de GET /perfil', async () => {
    const error = new ApiError({ status: 0, codigo: 'SIN_CONEXION', titulo: 'Sin conexión', detalle: '…' });
    perfil.existe.mockRejectedValue(error);
    await expect(ejecutar(perfilGuard)).rejects.toBe(error);
  });
});

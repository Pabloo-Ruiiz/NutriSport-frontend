import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Router, TitleStrategy, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideLucideIcons } from '@lucide/angular';

import { LayoutService } from '@core/layout/layout.service';
import { NutriSportTitleStrategy } from '@core/layout/titulo.strategy';
import type { CuentaResponse, Rol } from '@core/models';
import { AuthService } from '@core/services/auth.service';
import { PerfilService } from '@core/services/perfil.service';
import { ICONOS_APP } from '@shared/design/iconos';
import { routes } from './app.routes';

class AuthServiceFalso {
  readonly autenticado = signal(false);
  readonly esAdmin = signal(false);
  readonly emailVerificado = signal(true);
  readonly consentimientoVigente = signal(true);
  readonly cuenta = signal<CuentaResponse | null>(null);
  logout = vi.fn(async () => true);

  entrar(...roles: Rol[]): void {
    this.autenticado.set(true);
    this.esAdmin.set(roles.includes('ADMIN'));
    this.cuenta.set({
      nombre: 'Ana López',
      email: 'ana@correo.com',
      roles,
    } as Partial<CuentaResponse> as CuentaResponse);
  }
}

let auth: AuthServiceFalso;
let perfil: { existe: ReturnType<typeof vi.fn<() => Promise<boolean>>> };
let harness: RouterTestingHarness;

beforeEach(async () => {
  auth = new AuthServiceFalso();
  perfil = { existe: vi.fn(async () => true) };
  TestBed.configureTestingModule({
    providers: [
      provideRouter(routes, withComponentInputBinding()),
      { provide: TitleStrategy, useClass: NutriSportTitleStrategy },
      provideLucideIcons(...ICONOS_APP),
      { provide: AuthService, useValue: auth },
      { provide: PerfilService, useValue: perfil },
      {
        provide: LayoutService,
        useValue: { esMovil: signal(false), esTablet: signal(false), esEscritorio: signal(true) },
      },
    ],
  });
  harness = await RouterTestingHarness.create();
});

const url = () => TestBed.inject(Router).url;
const texto = () => (harness.fixture.nativeElement as HTMLElement).textContent ?? '';
const tituloPestana = () => TestBed.inject(Title).getTitle();

describe('rutas', () => {
  it('sin sesión, /inicio lleva a /login?volver=/inicio', async () => {
    await harness.navigateByUrl('/inicio');
    expect(url()).toBe('/login?volver=%2Finicio');
    expect(texto()).toContain('Bienvenido de nuevo');
    expect(tituloPestana()).toBe('Iniciar sesión · NutriSport');
  });

  it("'' redirige a /inicio", async () => {
    auth.entrar('DEPORTISTA');
    await harness.navigateByUrl('/');
    expect(url()).toBe('/inicio');
    expect(tituloPestana()).toBe('Inicio · NutriSport');
    expect(texto()).toContain('Pantalla en construcción (paso 18)');
  });

  it('con sesión, /login lleva a /inicio (o a /admin/usuarios si solo es ADMIN)', async () => {
    auth.entrar('DEPORTISTA');
    await harness.navigateByUrl('/login');
    expect(url()).toBe('/inicio');

    auth.entrar('ADMIN');
    await harness.navigateByUrl('/registro');
    expect(url()).toBe('/admin/usuarios');
  });

  it('verificar-email y restablecer-password valen con o sin sesión', async () => {
    await harness.navigateByUrl('/verificar-email');
    expect(url()).toBe('/verificar-email');
    auth.entrar('DEPORTISTA');
    await harness.navigateByUrl('/restablecer-password');
    expect(url()).toBe('/restablecer-password');
    // Sin token en el fragmento: enlace incompleto.
    expect(texto()).toContain('El enlace está incompleto');
  });

  it('con sesión y sin perfil, la zona del deportista lleva a /bienvenida', async () => {
    auth.entrar('DEPORTISTA');
    perfil.existe.mockResolvedValue(false);
    await harness.navigateByUrl('/comidas/nueva');
    expect(url()).toBe('/bienvenida');
    expect(texto()).toContain('Sobre ti');
    // Pantalla completa: sin sidebar.
    expect(harness.fixture.nativeElement.querySelector('ns-shell')).toBeNull();
  });

  it('configuración no pide perfil', async () => {
    auth.entrar('DEPORTISTA');
    perfil.existe.mockResolvedValue(false);
    await harness.navigateByUrl('/configuracion');
    // En escritorio, /configuracion abre la primera sección.
    expect(url()).toBe('/configuracion/cuenta');
    expect(perfil.existe).not.toHaveBeenCalled();
    expect(harness.fixture.nativeElement.querySelector('ns-shell')).not.toBeNull();
  });

  it('las rutas con parámetro cargan su pantalla', async () => {
    auth.entrar('DEPORTISTA');
    await harness.navigateByUrl('/comidas/foto/abc');
    expect(texto()).toContain('paso 20');
    await harness.navigateByUrl('/comidas/abc/editar');
    expect(texto()).toContain('paso 15');
    expect(tituloPestana()).toBe('Editar comida · NutriSport');
  });

  it('un deportista que abre /admin/usuarios ve "No tienes permiso"', async () => {
    auth.entrar('DEPORTISTA');
    await harness.navigateByUrl('/admin/usuarios');
    expect(url()).toBe('/sin-permiso');
    expect(texto()).toContain('No tienes permiso');
  });

  it('un admin entra en /admin, que lleva a /admin/usuarios con el layout de administración', async () => {
    auth.entrar('ADMIN');
    await harness.navigateByUrl('/admin');
    expect(url()).toBe('/admin/usuarios');
    expect(harness.fixture.nativeElement.querySelector('ns-admin-layout')).not.toBeNull();
    expect(texto()).toContain('paso 21');
  });

  it('una ruta que no existe muestra el 404', async () => {
    await harness.navigateByUrl('/no-existe');
    expect(texto()).toContain('No encontramos esta página');
    expect(tituloPestana()).toBe('Página no encontrada · NutriSport');
  });
});

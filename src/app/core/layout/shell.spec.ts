import { InteractivityChecker } from '@angular/cdk/a11y';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideLucideIcons } from '@lucide/angular';

import { ICONOS_APP } from '@shared/design/iconos';
import type { CuentaResponse } from '../models';
import { AuthService } from '../services/auth.service';
import { AdminLayoutComponent } from './admin-layout.component';
import { AuthLayoutComponent } from './auth-layout.component';
import { LayoutService } from './layout.service';
import { ShellComponent } from './shell.component';

@Component({ template: '<p>Página</p>' })
class Pagina {}

const CUENTA = {
  nombre: 'Álex Romero',
  email: 'alex@correo.com',
  roles: ['DEPORTISTA'],
} as Partial<CuentaResponse> as CuentaResponse;

class AuthServiceFalso {
  readonly cuenta = signal<CuentaResponse | null>(CUENTA);
  readonly esAdmin = signal(false);
  readonly emailVerificado = signal(true);
  logout = vi.fn(async () => true);
}

const layout = { esMovil: signal(false), esTablet: signal(false), esEscritorio: signal(true) };

/** jsdom no calcula tamaños: sin esto la trampa de foco del drawer no encuentra nada enfocable. */
class InteractivityCheckerJsdom {
  isDisabled = (e: HTMLElement) => e.hasAttribute('disabled');
  isVisible = () => true;
  isFocusable = (e: HTMLElement) => e.matches('button, input, a[href], [tabindex]');
  isTabbable = (e: HTMLElement) => this.isFocusable(e) && e.tabIndex >= 0;
}

let auth: AuthServiceFalso;
let harness: RouterTestingHarness;

beforeEach(async () => {
  auth = new AuthServiceFalso();
  layout.esMovil.set(false);
  layout.esTablet.set(false);
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        {
          path: '',
          component: ShellComponent,
          children: [
            { path: 'inicio', title: 'Inicio', component: Pagina },
            { path: 'comidas', title: 'Comidas', component: Pagina },
            { path: 'actividad', data: { tituloPagina: 'Mi actividad' }, component: Pagina },
          ],
        },
        {
          path: 'admin',
          component: AdminLayoutComponent,
          children: [{ path: 'usuarios', title: 'Usuarios', component: Pagina }],
        },
        { path: 'login', component: AuthLayoutComponent, children: [{ path: '', component: Pagina }] },
      ]),
      provideLucideIcons(...ICONOS_APP),
      { provide: AuthService, useValue: auth },
      { provide: LayoutService, useValue: layout },
      { provide: InteractivityChecker, useClass: InteractivityCheckerJsdom },
    ],
  });
  harness = await RouterTestingHarness.create();
});

afterEach(() => document.querySelector('.cdk-overlay-container')?.replaceChildren());

const raiz = () => harness.fixture.nativeElement as HTMLElement;
const textos = (selector: string, en: ParentNode = raiz()) =>
  [...en.querySelectorAll(selector)].map((e) => e.textContent?.trim());

describe('ShellComponent', () => {
  it('pinta la sidebar con los grupos del deportista y el título de la página en la topbar', async () => {
    await harness.navigateByUrl('/inicio');
    expect(textos('ns-sidebar .ns-nav__titulo')).toEqual(['Principal', 'Rendimiento', 'Cuenta']);
    expect(textos('ns-topbar h1')).toEqual(['Inicio']);
    expect(raiz().querySelector('ns-topbar a[href="/comidas/nueva"]')?.textContent).toContain('Registrar comida');
    expect(raiz().querySelector('ns-bottom-nav')).toBeNull();
    expect(raiz().querySelector('main#contenido')).not.toBeNull();
  });

  it('usa data.tituloPagina si la ruta lo define', async () => {
    await harness.navigateByUrl('/actividad');
    expect(textos('ns-topbar h1')).toEqual(['Mi actividad']);
  });

  it('muestra Administración solo a un ADMIN', async () => {
    auth.esAdmin.set(true);
    await harness.navigateByUrl('/inicio');
    expect(textos('ns-sidebar .ns-nav__titulo')).toContain('Administración');
  });

  it('marca el enlace activo con clase y aria-current', async () => {
    await harness.navigateByUrl('/comidas');
    const activos = raiz().querySelectorAll('ns-sidebar .ns-nav__enlace--activo');
    expect(activos.length).toBe(1);
    expect(activos[0].getAttribute('href')).toBe('/comidas');
    expect(activos[0].getAttribute('aria-current')).toBe('page');
  });

  it('"Saltar al contenido" lleva el foco al <main>', async () => {
    await harness.navigateByUrl('/inicio');
    document.body.appendChild(raiz());
    (raiz().querySelector('.ns-shell__saltar') as HTMLAnchorElement).click();
    expect(document.activeElement?.id).toBe('contenido');
    raiz().remove();
  });

  it('en tablet colapsa la sidebar', async () => {
    layout.esTablet.set(true);
    await harness.navigateByUrl('/inicio');
    expect(raiz().querySelector('ns-sidebar')?.classList).toContain('ns-sidebar--colapsada');
    expect(raiz().querySelector('ns-nav-lista')?.classList).toContain('ns-nav--colapsada');
  });

  describe('en móvil', () => {
    beforeEach(() => layout.esMovil.set(true));

    it('cambia la sidebar por la barra inferior', async () => {
      await harness.navigateByUrl('/inicio');
      expect(raiz().querySelector('ns-sidebar')).toBeNull();
      expect(textos('ns-bottom-nav a')).toEqual(['Inicio', 'Comidas', 'Actividad', 'Perfil']);
      expect(raiz().querySelector('ns-bottom-nav a[aria-current="page"]')?.textContent).toContain('Inicio');
    });

    it('el botón central abre el bottom sheet de registro', async () => {
      await harness.navigateByUrl('/inicio');
      (raiz().querySelector('.ns-bottom-nav__registrar') as HTMLButtonElement).click();
      await harness.fixture.whenStable();
      const sheet = document.querySelector('ns-registrar-sheet') as HTMLElement;
      expect(sheet).not.toBeNull();
      expect(textos('.ns-registrar__etiqueta', sheet)).toEqual(['Foto del plato', 'Buscar alimento']);
    });

    it('el avatar ("Más") abre el drawer con el resto de secciones y Cerrar sesión', async () => {
      await harness.navigateByUrl('/inicio');
      (raiz().querySelector('.ns-topbar__avatar-boton') as HTMLButtonElement).click();
      await harness.fixture.whenStable();
      const drawer = document.querySelector('.ns-drawer') as HTMLElement;
      expect(drawer.classList).toContain('ns-drawer--izquierda');
      expect(textos('.ns-nav__etiqueta', drawer)).toEqual(['Configuración']);

      (drawer.querySelector('.ns-shell__cerrar-sesion') as HTMLButtonElement).click();
      expect(auth.logout).toHaveBeenCalled();
    });
  });
});

describe('AdminLayoutComponent', () => {
  it('añade la franja ai-600 y el badge "Admin", sin "Registrar comida"', async () => {
    auth.esAdmin.set(true);
    await harness.navigateByUrl('/admin/usuarios');
    expect(raiz().querySelector('.ns-shell__franja-admin')).not.toBeNull();
    expect(textos('ns-topbar ns-badge')).toEqual(['Admin']);
    expect(textos('ns-topbar h1')).toEqual(['Usuarios']);
    expect(raiz().querySelector('ns-topbar a[href="/comidas/nueva"]')).toBeNull();
  });

  it('en móvil no tiene barra inferior', async () => {
    layout.esMovil.set(true);
    await harness.navigateByUrl('/admin/usuarios');
    expect(raiz().querySelector('ns-bottom-nav')).toBeNull();
  });
});

describe('AuthLayoutComponent', () => {
  it('pinta el panel de marca con el eslogan y tres beneficios, y la página a la derecha', async () => {
    await harness.navigateByUrl('/login');
    expect(raiz().querySelector('.ns-auth__eslogan')?.textContent).toContain(
      'Tu nutrición deportiva, impulsada por inteligencia artificial',
    );
    expect(raiz().querySelectorAll('.ns-auth__beneficio').length).toBe(3);
    expect(raiz().querySelector('.ns-auth__formulario p')?.textContent).toBe('Página');
  });
});

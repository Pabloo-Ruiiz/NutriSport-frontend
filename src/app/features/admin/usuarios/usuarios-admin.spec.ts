import { InteractivityChecker } from '@angular/cdk/a11y';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideLucideIcons } from '@lucide/angular';

import { errorInterceptor } from '@core/interceptors/error.interceptor';
import { LayoutService } from '@core/layout/layout.service';
import type { CuentaResponse, Pagina, UsuarioAdminResponse } from '@core/models';
import { AuthService } from '@core/services/auth.service';
import { ICONOS_APP } from '@shared/design/iconos';
import { NsConfirmService } from '@shared/ui/overlay/confirm.service';
import { UsuarioDetalleComponent } from './usuario-detalle.component';
import { UsuariosAdminComponent } from './usuarios-admin.component';
import { leerEstado, leerOrdenUsuarios, leerPagina, leerTamano } from './usuarios-admin';

const URL_USUARIOS = '/api/v1/admin/usuarios';

const usuario = (id: string, cambios: Partial<UsuarioAdminResponse> = {}): UsuarioAdminResponse => ({
  id,
  nombre: `Usuario ${id}`,
  email: `${id}@correo.com`,
  roles: ['DEPORTISTA'],
  estado: 'ACTIVO',
  emailVerificado: true,
  ultimoAcceso: '2026-11-25T08:30:00+01:00',
  creadoEn: '2025-03-02T10:00:00+01:00',
  ...cambios,
});

const pagina = (content: UsuarioAdminResponse[], cambios: Partial<Pagina<UsuarioAdminResponse>> = {}) => ({
  content,
  page: 0,
  size: 20,
  totalElements: content.length,
  totalPages: 1,
  ...cambios,
});

const ADMIN: CuentaResponse = {
  id: 'yo',
  nombre: 'Admin',
  email: 'admin@correo.com',
  roles: ['DEPORTISTA', 'ADMIN'],
  estado: 'ACTIVO',
  emailVerificado: true,
  consentimientoSaludVigente: true,
  unidades: 'METRICO',
  insightsActivos: true,
};

class InteractivityCheckerJsdom {
  isDisabled = (e: HTMLElement) => e.hasAttribute('disabled');
  isVisible = () => true;
  isFocusable = (e: HTMLElement) => e.matches('button, input, select, a[href], [tabindex]');
  isTabbable = (e: HTMLElement) => this.isFocusable(e) && e.tabIndex >= 0;
}

@Component({ template: '' })
class Vacia {}

let http: HttpTestingController;
let confirmar: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([errorInterceptor])),
      provideHttpClientTesting(),
      provideRouter(
        [
          { path: 'admin/usuarios', component: UsuariosAdminComponent },
          { path: '**', component: Vacia },
        ],
        withComponentInputBinding(),
      ),
      provideLucideIcons(...ICONOS_APP),
      { provide: LayoutService, useValue: { esMovil: signal(false) } },
      { provide: InteractivityChecker, useClass: InteractivityCheckerJsdom },
    ],
  });
  http = TestBed.inject(HttpTestingController);
  confirmar = vi.spyOn(TestBed.inject(NsConfirmService), 'confirmar');
  TestBed.inject(AuthService).actualizarCuenta(ADMIN);
});

afterEach(() => {
  http.verify();
  vi.useRealTimers();
  document.querySelector('.cdk-overlay-container')?.replaceChildren();
});

const boton = (texto: string, en: ParentNode = document.body) =>
  [...en.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim().startsWith(texto));
const listado = (): TestRequest => http.expectOne((r) => r.url === URL_USUARIOS);

describe('lectura de la URL', () => {
  it('ignora valores no válidos', () => {
    expect([leerEstado('BLOQUEADO'), leerEstado('otro'), leerEstado(undefined)]).toEqual(['BLOQUEADO', null, null]);
    expect([leerPagina('3'), leerPagina('-1'), leerPagina('x')]).toEqual([3, 0, 0]);
    expect([leerTamano('50'), leerTamano('33'), leerTamano(undefined)]).toEqual([50, 20, 20]);
    expect([leerOrdenUsuarios('email,desc'), leerOrdenUsuarios('email'), leerOrdenUsuarios('password,asc')]).toEqual([
      'email,desc',
      'email,asc',
      null,
    ]);
  });
});

describe('UsuariosAdminComponent', () => {
  let harness: RouterTestingHarness;
  const raiz = () => harness.fixture.nativeElement as HTMLElement;
  const url = () => TestBed.inject(Router).url;
  const esperar = async () => {
    await harness.fixture.whenStable();
    await new Promise((resolver) => setTimeout(resolver));
    await harness.fixture.whenStable();
  };

  async function abrir(ruta: string, respuesta = pagina([usuario('u1'), usuario('u2', { estado: 'BLOQUEADO' })])) {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(ruta);
    const req = listado();
    req.flush(respuesta);
    await esperar();
    return req;
  }

  it('pide la página con los filtros de la URL y pinta la tabla', async () => {
    const req = await abrir('/admin/usuarios?q=ana&estado=BLOQUEADO&page=2&size=50&sort=email,desc');
    const params = req.request.params;
    expect([params.get('q'), params.get('estado'), params.get('page'), params.get('size')]).toEqual([
      'ana',
      'BLOQUEADO',
      '2',
      '50',
    ]);
    expect(params.getAll('sort')).toEqual(['email,desc']);

    const filas = raiz().querySelectorAll('tbody tr');
    expect(filas.length).toBe(2);
    expect(filas[0].textContent).toContain('Usuario u1');
    expect(filas[0].textContent).toContain('Deportista');
    expect(filas[0].textContent).toContain('Verificado');
    expect(filas[0].textContent).toContain('2 mar 2025');
    expect(filas[1].textContent).toContain('Bloqueado');
    expect(raiz().querySelector('th[aria-sort="descending"]')?.textContent).toContain('Email');
  });

  it('busca 300 ms después de la última tecla, con q en la URL y volviendo a la página 0', async () => {
    await abrir('/admin/usuarios?page=3');
    vi.useFakeTimers();
    const input = raiz().querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = 'an';
    input.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(200);
    input.value = 'ana ';
    input.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(299);
    expect(url()).toBe('/admin/usuarios?page=3');
    vi.advanceTimersByTime(1);
    vi.useRealTimers();
    await esperar();

    expect(url()).toBe('/admin/usuarios?q=ana');
    const req = listado();
    expect(req.request.params.get('q')).toBe('ana');
    expect(req.request.params.get('page')).toBe('0');
    req.flush(pagina([]));
    await esperar();
    expect(raiz().textContent).toContain('Ningún usuario coincide con la búsqueda');
  });

  it('el paginador y la ordenación cambian la URL', async () => {
    await abrir('/admin/usuarios', pagina([usuario('u1')], { totalPages: 3, totalElements: 41 }));
    expect(raiz().textContent).toContain('41 usuarios');
    boton('Siguiente', raiz())!.click();
    await esperar();
    expect(url()).toBe('/admin/usuarios?page=1');
    listado().flush(pagina([usuario('u1')], { page: 1, totalPages: 3 }));
    await esperar();

    raiz().querySelector<HTMLButtonElement>('th button')!.click();
    await esperar();
    expect(url()).toBe('/admin/usuarios?sort=nombre,asc');
    listado().flush(pagina([usuario('u1')]));
    await esperar();
  });

  it('muestra el error con Reintentar', async () => {
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/usuarios');
    listado().flush(
      { codigo: 'ERROR_INTERNO', status: 500, detail: 'Algo falló' },
      { status: 500, statusText: 'Error' },
    );
    await esperar();
    expect(raiz().querySelector('ns-alert')?.textContent).toContain('Algo falló');
    boton('Reintentar', raiz())!.click();
    listado().flush(pagina([usuario('u1')]));
    await esperar();
    expect(raiz().querySelectorAll('tbody tr').length).toBe(1);
  });

  it('al pulsar una fila abre el detalle; bloquear confirma, hace PATCH y actualiza la fila', async () => {
    await abrir('/admin/usuarios');
    raiz().querySelector<HTMLElement>('tbody tr')!.click();
    await esperar();
    http.expectOne(`${URL_USUARIOS}/u1`).flush(usuario('u1'));
    await esperar();
    const drawer = document.querySelector('.ns-drawer')!;
    expect(drawer.textContent).toContain('u1@correo.com');

    confirmar.mockResolvedValue(true);
    boton('Bloquear', drawer)!.click();
    await esperar();
    expect(confirmar).toHaveBeenCalledWith(
      expect.objectContaining({ peligro: true, mensaje: expect.stringContaining('se cerrarán todas sus sesiones') }),
    );
    const patch = http.expectOne(`${URL_USUARIOS}/u1`);
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ estado: 'BLOQUEADO' });
    patch.flush(usuario('u1', { estado: 'BLOQUEADO' }));
    await esperar();
    expect(raiz().querySelector('tbody tr')!.textContent).toContain('Bloqueado');
    expect(boton('Desbloquear', drawer)).toBeTruthy();
  });
});

describe('UsuarioDetalleComponent', () => {
  async function crear(u: UsuarioAdminResponse) {
    const fixture = TestBed.createComponent(UsuarioDetalleComponent);
    fixture.componentRef.setInput('usuario', u);
    await fixture.whenStable();
    http.expectOne(`${URL_USUARIOS}/${u.id}`).flush(u);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const casilla = (texto: string) =>
      [...el.querySelectorAll('ns-checkbox')].find((c) => c.textContent?.includes(texto))!.querySelector('input')!;
    return { fixture, el, casilla };
  }

  it('roles: al menos uno, y PATCH solo con los roles', async () => {
    const { fixture, el, casilla } = await crear(usuario('u1'));
    const guardar = () => boton('Guardar roles', el)!;
    expect(guardar().disabled).toBe(true);

    casilla('Deportista').click();
    await fixture.whenStable();
    expect(el.textContent).toContain('Marca al menos un rol.');
    expect(guardar().disabled).toBe(true);

    casilla('Administrador').click();
    await fixture.whenStable();
    guardar().click();
    const patch = http.expectOne(`${URL_USUARIOS}/u1`);
    expect(patch.request.body).toEqual({ roles: ['ADMIN'] });
    patch.flush(usuario('u1', { roles: ['ADMIN'] }));
    await fixture.whenStable();
    expect(guardar().disabled).toBe(true);
  });

  it('422 REGLA_NEGOCIO → ns-alert con el detail', async () => {
    const { fixture, el, casilla } = await crear(usuario('u1'));
    casilla('Administrador').click();
    await fixture.whenStable();
    boton('Guardar roles', el)!.click();
    http
      .expectOne(`${URL_USUARIOS}/u1`)
      .flush(
        { codigo: 'REGLA_NEGOCIO', status: 422, detail: 'No se puede modificar esta cuenta.' },
        { status: 422, statusText: 'Unprocessable' },
      );
    await fixture.whenStable();
    await new Promise((resolver) => setTimeout(resolver));
    await fixture.whenStable();
    const alerta = el.querySelector('ns-alert');
    expect(alerta?.textContent).toContain('No se puede modificar esta cuenta.');
  });

  it('una cuenta ELIMINADA es de solo lectura', async () => {
    const { el } = await crear(usuario('u1', { estado: 'ELIMINADO' }));
    expect(el.textContent).toContain('Cuenta eliminada');
    expect(boton('Bloquear', el)).toBeUndefined();
    expect(boton('Guardar roles', el)).toBeUndefined();
    expect(el.querySelector('ns-checkbox')).toBeNull();
  });

  it('un administrador no puede bloquearse ni quitarse el rol ADMIN', async () => {
    const { el, casilla } = await crear(usuario('yo', { roles: ['DEPORTISTA', 'ADMIN'] }));
    expect(boton('Bloquear', el)!.disabled).toBe(true);
    expect(casilla('Administrador').disabled).toBe(true);
  });
});

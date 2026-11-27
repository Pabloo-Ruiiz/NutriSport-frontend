import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { InteractivityChecker } from '@angular/cdk/a11y';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideLucideIcons } from '@lucide/angular';

import { authInterceptor } from '@core/interceptors/auth.interceptor';
import { errorInterceptor } from '@core/interceptors/error.interceptor';
import { LayoutService } from '@core/layout/layout.service';
import type {
  AlimentoResponse,
  AlimentoResumenResponse,
  CuentaResponse,
  RegistroComidaResponse,
  TokenResponse,
} from '@core/models';
import { hoyLocal } from '@core/util/fechas';
import { ICONOS_APP } from '@shared/design/iconos';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import { RegistroComidaComponent } from '../features/comidas/registro/registro-comida.component';
import { AuthService } from '@core/services/auth.service';

const API = '/api/v1';
const FECHA = hoyLocal();

const CUENTA: CuentaResponse = {
  id: '0193a3f2-7c1e-7a4b-9f00-1a2b3c4d5e6f',
  nombre: 'Ana',
  email: 'ana@correo.com',
  roles: ['DEPORTISTA'],
  estado: 'ACTIVO',
  emailVerificado: true,
  consentimientoSaludVigente: true,
  unidades: 'METRICO',
  insightsActivos: true,
};

const ARROZ: AlimentoResumenResponse = {
  id: 'arroz',
  nombre: 'Arroz blanco cocido',
  marca: null,
  kcal100: 130,
  proteinas100: 2.7,
  carbohidratos100: 28,
  grasas100: 0.3,
  fuente: 'BEDCA',
};

const DETALLE_ARROZ: AlimentoResponse = {
  id: 'arroz',
  nombre: 'Arroz blanco cocido',
  marca: null,
  categoriaId: null,
  categoriaNombre: null,
  preparacion: 'COCIDO',
  kcal100: 130,
  proteinas100: 2.7,
  carbohidratos100: 28,
  grasas100: 0.3,
  azucares100: null,
  saturadas100: null,
  fibra100: null,
  sal100: null,
  unidadBase: 'G',
  porciones: [{ nombre: 'plato', gramos: 250 }],
  alergenosContiene: [],
  alergenosTrazas: [],
  alergenosRevisados: true,
  contieneLactosa: false,
  aptoVegano: true,
  aptoVegetariano: true,
  aptoPescetariano: true,
  fuente: 'BEDCA',
  referenciaExterna: null,
  visibilidad: 'PUBLICO',
  validado: true,
  activo: true,
  propio: false,
};

function sesion(accessToken: string): TokenResponse {
  return { accessToken, tipo: 'Bearer', expiraEn: 900, cuenta: CUENTA };
}

function comidaGuardada(): RegistroComidaResponse {
  return {
    id: 'comida-1',
    fecha: FECHA,
    hora: '14:30:00',
    tipoComida: 'COMIDA',
    origen: 'MANUAL',
    notas: null,
    alimentos: [
      {
        id: 'linea-1',
        alimentoId: 'arroz',
        nombre: 'Arroz blanco cocido',
        cantidad: 150,
        unidad: 'g',
        gramos: 150,
        kcal: 195,
        proteina: 4.1,
        carbohidratos: 42,
        grasa: 0.5,
        origenIa: false,
        confianzaIa: null,
      },
    ],
    totales: { kcal: 195, proteina: 4.1, carbohidratos: 42, grasa: 0.5 },
    avisos: [],
  };
}

@Component({ template: '<p>Inicio</p>' })
class InicioComponent {}

describe('Flujo de registro manual de comida', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
        provideHttpClientTesting(),
        provideRouter(
          [
            { path: 'comidas/nueva', component: RegistroComidaComponent },
            { path: 'inicio', component: InicioComponent },
          ],
          withComponentInputBinding(),
        ),
        provideLucideIcons(...ICONOS_APP),
        { provide: LayoutService, useValue: { esMovil: signal(false), esTablet: signal(false) } },
        {
          provide: InteractivityChecker,
          useValue: { isFocusable: () => true, isTabbable: () => true, isVisible: () => true, isDisabled: () => false },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('busca un alimento, cambia su cantidad y guarda el cuerpo exacto con toast', async () => {
    TestBed.inject(AuthService)
      .login({ email: CUENTA.email, password: 'clavePrueba123', mantenerSesion: false })
      .subscribe();
    const login = http.expectOne(`${API}/auth/login`);
    login.flush(sesion('token-comidas'));

    await harness.navigateByUrl(`/comidas/nueva?tipoComida=COMIDA&fecha=${FECHA}`);
    await harness.fixture.whenStable();

    vi.useFakeTimers();
    const busqueda = harness.routeNativeElement!.querySelector<HTMLInputElement>(
      'app-buscador-alimentos input[type="search"]',
    )!;
    busqueda.value = 'arroz';
    busqueda.dispatchEvent(new Event('input', { bubbles: true }));
    vi.advanceTimersByTime(250);

    const buscar = http.expectOne(
      (peticion) => peticion.url === `${API}/alimentos` && peticion.params.get('q') === 'arroz',
    );
    expect(buscar.request.headers.get('Authorization')).toBe('Bearer token-comidas');
    buscar.flush({ content: [ARROZ], page: 0, size: 20, totalElements: 1, totalPages: 1 });
    vi.useRealTimers();
    await harness.fixture.whenStable();
    await new Promise((resolver) => setTimeout(resolver));

    harness.routeNativeElement!.querySelector<HTMLButtonElement>('.ns-buscador__opcion')!.click();
    http.expectOne(`${API}/alimentos/arroz`).flush(DETALLE_ARROZ);
    await harness.fixture.whenStable();

    const hora = harness.routeNativeElement!.querySelector<HTMLInputElement>('input[type="time"]')!;
    hora.value = '14:30';
    hora.dispatchEvent(new Event('input', { bubbles: true }));
    hora.dispatchEvent(new Event('change', { bubbles: true }));

    const cantidad = harness.routeNativeElement!.querySelector<HTMLInputElement>(
      'app-linea-alimento ns-quantity-input input[role="spinbutton"]',
    )!;
    cantidad.value = '150';
    cantidad.dispatchEvent(new Event('input', { bubbles: true }));
    await harness.fixture.whenStable();

    [...harness.routeNativeElement!.querySelectorAll<HTMLButtonElement>('button')]
      .find((boton) => boton.textContent?.includes('Guardar comida'))!
      .click();

    const guardar = http.expectOne({ method: 'POST', url: `${API}/comidas` });
    expect(guardar.request.body).toStrictEqual({
      fecha: FECHA,
      hora: '14:30:00',
      tipoComida: 'COMIDA',
      alimentos: [{ alimentoId: 'arroz', cantidad: 150, unidad: 'g' }],
    });
    guardar.flush(comidaGuardada(), { status: 201, statusText: 'Created' });
    await harness.fixture.whenStable();
    await new Promise((resolver) => setTimeout(resolver));

    expect(TestBed.inject(NsToastService).visibles()[0].titulo).toBe('Comida guardada · 195 kcal');
    expect(TestBed.inject(Router).url).toBe('/inicio');
  });
});

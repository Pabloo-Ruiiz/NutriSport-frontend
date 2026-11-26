import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '@env/environment';
import type { PerfilRequest, PreferenciaDto } from '../models';
import { PerfilService } from './perfil.service';

const URL = `${environment.apiUrl}/perfil`;

describe('PerfilService', () => {
  let servicio: PerfilService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(PerfilService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('200 → true, y lo cachea', async () => {
    const promesa = servicio.existe();
    http.expectOne({ method: 'GET', url: URL }).flush({});
    expect(await promesa).toBe(true);
    expect(servicio.perfilExiste()).toBe(true);

    expect(await servicio.existe()).toBe(true);
    http.expectNone(URL);
  });

  it('404 → false, y lo cachea', async () => {
    const promesa = servicio.existe();
    http.expectOne(URL).flush({ codigo: 'NO_ENCONTRADO' }, { status: 404, statusText: 'Not Found' });
    expect(await promesa).toBe(false);
    expect(servicio.perfilExiste()).toBe(false);
  });

  it('otro error se propaga y no se cachea', async () => {
    const promesa = servicio.existe();
    http.expectOne(URL).flush(null, { status: 500, statusText: 'Error' });
    await expect(promesa).rejects.toMatchObject({ status: 500 });
    expect(servicio.perfilExiste()).toBeNull();

    const reintento = servicio.existe();
    http.expectOne(URL).flush({});
    expect(await reintento).toBe(true);
  });

  it('las llamadas simultáneas comparten una sola petición', async () => {
    const a = servicio.existe();
    const b = servicio.existe();
    http.expectOne(URL).flush({});
    expect(await Promise.all([a, b])).toEqual([true, true]);
  });

  it('marcarCreado() deja el perfil como existente sin preguntar', async () => {
    servicio.marcarCreado();
    expect(await servicio.existe()).toBe(true);
    http.expectNone(URL);
  });

  it('limpiar() olvida la caché y descarta la respuesta que llega tarde', async () => {
    const promesa = servicio.existe();
    servicio.limpiar();
    http.expectOne(URL).flush({});
    await promesa;
    expect(servicio.perfilExiste()).toBeNull();

    servicio.existe();
    http.expectOne(URL).flush(null, { status: 404, statusText: 'Not Found' });
  });

  describe('endpoints del perfil', () => {
    const PERFIL: PerfilRequest = {
      fechaNacimiento: '1995-04-12',
      sexo: 'MUJER',
      alturaCm: 168,
      pesoKg: 61.5,
      objetivo: 'MANTENER',
      deportePrincipal: 'CARRERA',
      nivelActividad: 'MODERADO',
      diasEntrenamientoSemana: 4,
      duracionMediaMin: 60,
      comidasPorDia: 4,
    };

    it('obtener() hace GET /perfil y anota si existe', async () => {
      servicio.obtener().subscribe();
      http.expectOne({ method: 'GET', url: URL }).flush({});
      expect(servicio.perfilExiste()).toBe(true);

      servicio.limpiar();
      servicio.obtener().subscribe({ error: () => undefined });
      http.expectOne(URL).flush(null, { status: 404, statusText: 'Not Found' });
      expect(servicio.perfilExiste()).toBe(false);
    });

    it('guardar() hace PUT /perfil solo con los campos del contrato y marca el perfil como creado', async () => {
      const conExtras = {
        ...PERFIL,
        porcentajeGrasa: 21,
        fechaCompeticion: '2027-03-01', // sin COMPETICION no se envía
        tiempoMaxCocinaMin: undefined,
        aceptaCondiciones: true, // propiedad ajena al contrato
      } as PerfilRequest;
      servicio.guardar(conExtras).subscribe();

      const peticion = http.expectOne({ method: 'PUT', url: URL });
      expect(peticion.request.body).toEqual({ ...PERFIL, porcentajeGrasa: 21 });
      peticion.flush({});
      expect(await servicio.existe()).toBe(true);
      http.expectNone(URL);
    });

    it('guardar() envía fechaCompeticion con el objetivo COMPETICION', () => {
      servicio.guardar({ ...PERFIL, objetivo: 'COMPETICION', fechaCompeticion: '2027-03-01' }).subscribe();
      expect(http.expectOne(URL).request.body.fechaCompeticion).toBe('2027-03-01');
    });

    it('preferencias() y guardarPreferencias() envuelven la lista en { preferencias }', () => {
      servicio.preferencias().subscribe();
      http.expectOne({ method: 'GET', url: `${URL}/preferencias` }).flush([]);

      const lista: PreferenciaDto[] = [
        { tipo: 'ALERGIA', alergeno: 'FRUTOS_DE_CASCARA', severidad: 'ESTRICTA', dieta: undefined },
        { tipo: 'DIETA', dieta: 'VEGETARIANA', severidad: 'PREFERENCIA' },
      ];
      servicio.guardarPreferencias(lista).subscribe();
      const peticion = http.expectOne({ method: 'PUT', url: `${URL}/preferencias` });
      expect(peticion.request.body).toEqual({
        preferencias: [
          { tipo: 'ALERGIA', alergeno: 'FRUTOS_DE_CASCARA', severidad: 'ESTRICTA' },
          { tipo: 'DIETA', dieta: 'VEGETARIANA', severidad: 'PREFERENCIA' },
        ],
      });
      expect(Object.keys(peticion.request.body.preferencias[0])).not.toContain('dieta');

      servicio.guardarPreferencias([]).subscribe();
      expect(http.expectOne(`${URL}/preferencias`).request.body).toEqual({ preferencias: [] });
    });

    it('objetivos, objetivos manuales y vuelta al cálculo', () => {
      servicio.objetivos().subscribe();
      http.expectOne({ method: 'GET', url: `${URL}/objetivos` }).flush({});

      servicio.fijarObjetivosManuales({ kcal: 2400, proteinaG: 140, carbohidratosG: 280, grasaG: 75 }).subscribe();
      const manuales = http.expectOne({ method: 'PUT', url: `${URL}/objetivos` });
      expect(manuales.request.body).toEqual({ kcal: 2400, proteinaG: 140, carbohidratosG: 280, grasaG: 75 });

      servicio.volverAlCalculo().subscribe();
      http.expectOne({ method: 'DELETE', url: `${URL}/objetivos/manuales` }).flush({});
    });
  });
});

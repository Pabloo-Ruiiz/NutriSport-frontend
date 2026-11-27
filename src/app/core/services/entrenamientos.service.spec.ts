import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { EntrenamientosService } from './entrenamientos.service';

let servicio: EntrenamientosService;
let http: HttpTestingController;

beforeEach(() => {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  servicio = TestBed.inject(EntrenamientosService);
  http = TestBed.inject(HttpTestingController);
});

afterEach(() => http.verify());

describe('EntrenamientosService.relacionNutricion', () => {
  const url = '/api/v1/entrenamientos/relacion-nutricion';

  it('hace GET /entrenamientos/relacion-nutricion con desde y hasta', () => {
    servicio.relacionNutricion('2026-10-31', '2026-11-27').subscribe();
    const peticion = http.expectOne((req) => req.url === url);
    expect(peticion.request.method).toBe('GET');
    expect(peticion.request.params.get('desde')).toBe('2026-10-31');
    expect(peticion.request.params.get('hasta')).toBe('2026-11-27');
  });

  it('admite 366 días y rechaza más (o un rango al revés) sin llamar', async () => {
    servicio.relacionNutricion('2027-01-01', '2028-01-01').subscribe(); // 366 días
    http.expectOne((req) => req.url === url);

    await expect(firstValueFrom(servicio.relacionNutricion('2027-01-01', '2028-01-02'))).rejects.toBeInstanceOf(
      RangeError,
    );
    await expect(firstValueFrom(servicio.relacionNutricion('2026-02-01', '2026-01-31'))).rejects.toBeInstanceOf(
      RangeError,
    );
    http.expectNone((req) => req.url === url);
  });
});

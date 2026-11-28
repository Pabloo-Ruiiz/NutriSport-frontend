import { ApiError } from '@core/util/api-error';
import { edadEn, edadMinima } from '@core/util/validadores';
import { FormControl } from '@angular/forms';
import {
  type ValorFormularioPerfil,
  aPerfilRequest,
  aPreferencias,
  aplicarErroresPerfil,
  crearFormularioPerfil,
  franjasPorDefecto,
} from './perfil-form';

function valorCompleto(): ValorFormularioPerfil {
  return {
    sobreTi: { fechaNacimiento: '1995-04-12', sexo: 'MUJER', alturaCm: 168, pesoKg: 61.5, porcentajeGrasa: null },
    deporte: {
      deportePrincipal: ' CARRERA ',
      diasEntrenamientoSemana: 4,
      duracionMediaMin: 60,
      nivelActividad: 'LIGERO',
    },
    objetivo: { objetivo: 'MANTENER', fechaCompeticion: '' },
    alimentacion: {
      preferencias: [],
      comidasPorDia: 4,
      tiposComida: ['CENA', 'DESAYUNO', 'MERIENDA', 'COMIDA'],
      tiempoMaxCocinaMin: null,
    },
  };
}

describe('aPerfilRequest', () => {
  it('construye exactamente PerfilRequest, sin opcionales vacíos', () => {
    expect(aPerfilRequest(valorCompleto())).toStrictEqual({
      fechaNacimiento: '1995-04-12',
      sexo: 'MUJER',
      alturaCm: 168,
      pesoKg: 61.5,
      objetivo: 'MANTENER',
      deportePrincipal: 'CARRERA',
      nivelActividad: 'LIGERO',
      diasEntrenamientoSemana: 4,
      duracionMediaMin: 60,
      comidasPorDia: 4,
      // En el orden del día, aunque se eligieran en otro.
      tiposComida: ['DESAYUNO', 'COMIDA', 'MERIENDA', 'CENA'],
    });
  });

  it('incluye los opcionales con valor (0 también) y los envía como number', () => {
    const valor = valorCompleto();
    valor.sobreTi.porcentajeGrasa = 18.5;
    valor.alimentacion.tiempoMaxCocinaMin = 0;
    // Un valor que llegue como texto (p. ej. de un input nativo) se convierte.
    valor.sobreTi.alturaCm = '172' as unknown as number;
    const peticion = aPerfilRequest(valor);
    expect(peticion.porcentajeGrasa).toBe(18.5);
    expect(peticion.tiempoMaxCocinaMin).toBe(0);
    expect(peticion.alturaCm).toBe(172);
    expect(typeof peticion.alturaCm).toBe('number');
  });

  it('fechaCompeticion solo con el objetivo COMPETICION', () => {
    const valor = valorCompleto();
    valor.objetivo.fechaCompeticion = '2027-03-01';
    expect(aPerfilRequest(valor)).not.toHaveProperty('fechaCompeticion');

    valor.objetivo.objetivo = 'COMPETICION';
    expect(aPerfilRequest(valor).fechaCompeticion).toBe('2027-03-01');
  });
});

describe('aPreferencias', () => {
  it('deja solo tipo, severidad y el campo de su tipo', () => {
    const valor = valorCompleto();
    valor.alimentacion.preferencias = [
      { tipo: 'ALERGIA', alergeno: 'GLUTEN', severidad: 'ESTRICTA', dieta: 'VEGANA' },
      { tipo: 'INTOLERANCIA', intolerancia: 'LACTOSA', severidad: 'PREFERENCIA' },
      { tipo: 'DIETA', dieta: 'VEGETARIANA', severidad: 'ESTRICTA', alimentoId: 'x' },
      { tipo: 'RECHAZO', alimentoId: 'a-1', categoriaId: 'c-1', severidad: 'PREFERENCIA' },
      { tipo: 'FAVORITO', categoriaId: 'c-2', severidad: 'PREFERENCIA' },
    ];
    expect(aPreferencias(valor)).toStrictEqual([
      { tipo: 'ALERGIA', severidad: 'ESTRICTA', alergeno: 'GLUTEN' },
      { tipo: 'INTOLERANCIA', severidad: 'PREFERENCIA', intolerancia: 'LACTOSA' },
      { tipo: 'DIETA', severidad: 'ESTRICTA', dieta: 'VEGETARIANA' },
      { tipo: 'RECHAZO', severidad: 'PREFERENCIA', alimentoId: 'a-1' },
      { tipo: 'FAVORITO', severidad: 'PREFERENCIA', categoriaId: 'c-2' },
    ]);
  });

  it('descarta las que no traen el campo de su tipo y las repetidas', () => {
    const valor = valorCompleto();
    valor.alimentacion.preferencias = [
      { tipo: 'ALERGIA', severidad: 'ESTRICTA' },
      { tipo: 'RECHAZO', severidad: 'PREFERENCIA' },
      { tipo: 'DIETA', dieta: 'VEGANA', severidad: 'ESTRICTA' },
      { tipo: 'DIETA', dieta: 'VEGANA', severidad: 'ESTRICTA' },
    ];
    expect(aPreferencias(valor)).toStrictEqual([{ tipo: 'DIETA', severidad: 'ESTRICTA', dieta: 'VEGANA' }]);
  });

  it('lista vacía → []', () => {
    expect(aPreferencias(valorCompleto())).toEqual([]);
  });
});

describe('crearFormularioPerfil', () => {
  it('valida cada paso con las reglas de §8', () => {
    const form = crearFormularioPerfil();
    const { sobreTi, deporte, objetivo, alimentacion } = form.controls;
    expect([sobreTi.valid, deporte.valid, objetivo.valid]).toEqual([false, false, false]);
    // comidasPorDia empieza en 4, pero hay que elegir cuáles.
    expect(alimentacion.valid).toBe(false);
    alimentacion.controls.tiposComida.setValue(['DESAYUNO', 'COMIDA', 'MERIENDA', 'CENA']);
    expect(alimentacion.valid).toBe(true);

    sobreTi.setValue({
      fechaNacimiento: '1995-04-12',
      sexo: 'HOMBRE',
      alturaCm: 119,
      pesoKg: 70,
      porcentajeGrasa: null,
    });
    expect(sobreTi.controls.alturaCm.errors).toEqual({ min: { min: 120, actual: 119 } });
    sobreTi.controls.alturaCm.setValue(180);
    sobreTi.controls.porcentajeGrasa.setValue(61);
    expect(sobreTi.valid).toBe(false);
    sobreTi.controls.porcentajeGrasa.setValue(null);
    expect(sobreTi.valid).toBe(true);
  });

  it('exige tantas franjas como comidas al día y se revalida al cambiar el número', () => {
    const { comidasPorDia, tiposComida } = crearFormularioPerfil().controls.alimentacion.controls;
    comidasPorDia.setValue(3);
    tiposComida.setValue(['DESAYUNO', 'COMIDA']);
    expect(tiposComida.errors).toEqual({ franjasComida: { requeridas: 3, elegidas: 2 } });
    tiposComida.setValue(['DESAYUNO', 'COMIDA', 'CENA']);
    expect(tiposComida.errors).toBeNull();
    comidasPorDia.setValue(4);
    expect(tiposComida.errors).toEqual({ franjasComida: { requeridas: 4, elegidas: 3 } });
  });

  it('franjasPorDefecto: las mismas que el backend, en el orden del día', () => {
    expect(franjasPorDefecto(3)).toEqual(['DESAYUNO', 'COMIDA', 'CENA']);
    expect(franjasPorDefecto(6)).toEqual(['DESAYUNO', 'MEDIA_MANANA', 'COMIDA', 'MERIENDA', 'POST_ENTRENO', 'CENA']);
  });

  it('la fecha de competición solo es obligatoria con COMPETICION', () => {
    const { objetivo, fechaCompeticion } = crearFormularioPerfil().controls.objetivo.controls;
    objetivo.setValue('RENDIMIENTO');
    expect(fechaCompeticion.errors).toBeNull();
    objetivo.setValue('COMPETICION');
    expect(fechaCompeticion.errors).toEqual({ required: true });
    fechaCompeticion.setValue('2027-03-01');
    expect(fechaCompeticion.errors).toBeNull();
  });
});

describe('aplicarErroresPerfil', () => {
  it('asigna los errores a sus pasos y devuelve el primero', () => {
    const form = crearFormularioPerfil();
    const error = new ApiError({
      status: 400,
      codigo: 'VALIDACION',
      titulo: 'Datos no válidos',
      detalle: 'Los datos enviados no son válidos',
      errores: [
        { campo: 'comidasPorDia', mensaje: 'Entre 3 y 6' },
        { campo: 'deportePrincipal', mensaje: 'No existe ese deporte' },
        { campo: 'preferencias[1].alergeno', mensaje: 'Falta el alérgeno' },
      ],
    });
    expect(aplicarErroresPerfil(form, error)).toBe(1);
    expect(form.controls.deporte.controls.deportePrincipal.errors).toEqual({ servidor: 'No existe ese deporte' });
    expect(form.controls.alimentacion.controls.preferencias.errors).toEqual({ servidor: 'Falta el alérgeno' });
    expect(form.controls.alimentacion.controls.comidasPorDia.touched).toBe(true);
  });

  it('null si ningún error es de un campo del perfil', () => {
    const error = new ApiError({ status: 400, codigo: 'VALIDACION', titulo: '', detalle: '', errores: [] });
    expect(aplicarErroresPerfil(crearFormularioPerfil(), error)).toBeNull();
  });
});

describe('edadMinima', () => {
  const hoy = () => '2026-11-26';
  const validar = (valor: string) => edadMinima(18, hoy)(new FormControl(valor));

  it('cuenta los años cumplidos', () => {
    expect(edadEn('2008-11-26', '2026-11-26')).toBe(18);
    expect(edadEn('2008-11-27', '2026-11-26')).toBe(17);
    expect(edadEn('2008-02-30', '2026-11-26')).toBeNull();
  });

  it('exige 18 años y una fecha válida', () => {
    expect(validar('2008-11-26')).toBeNull();
    expect(validar('2008-11-27')).toEqual({ edadMinima: { minima: 18, actual: 17 } });
    expect(validar('2030-01-01')).toEqual({ fechaNoValida: true });
    expect(validar('no es fecha')).toEqual({ fechaNoValida: true });
    expect(validar('')).toBeNull();
  });
});

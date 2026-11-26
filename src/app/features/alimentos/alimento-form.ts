import { FormArray, FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';

import type {
  Alergeno,
  AlimentoRequest,
  AlimentoResponse,
  CategoriaResponse,
  Preparacion,
  UnidadBase,
} from '@core/models';
import { noSoloEspacios } from '@core/util/validadores';

/** Máximo de porciones caseras por alimento (AlimentoRequest.porciones). */
export const MAX_PORCIONES = 20;

export type GrupoPorcion = FormGroup<{
  nombre: FormControl<string>;
  gramos: FormControl<number | null>;
}>;

export type FormularioAlimento = FormGroup<{
  nombre: FormControl<string>;
  marca: FormControl<string>;
  categoriaId: FormControl<string | null>;
  preparacion: FormControl<Preparacion | null>;
  unidadBase: FormControl<UnidadBase>;
  kcal100: FormControl<number | null>;
  proteinas100: FormControl<number | null>;
  carbohidratos100: FormControl<number | null>;
  azucares100: FormControl<number | null>;
  grasas100: FormControl<number | null>;
  saturadas100: FormControl<number | null>;
  fibra100: FormControl<number | null>;
  sal100: FormControl<number | null>;
  porciones: FormArray<GrupoPorcion>;
  alergenosContiene: FormControl<Alergeno[]>;
  alergenosTrazas: FormControl<Alergeno[]>;
  contieneLactosa: FormControl<boolean>;
  aptoVegano: FormControl<boolean>;
  aptoVegetariano: FormControl<boolean>;
  aptoPescetariano: FormControl<boolean>;
}>;

const entre = (min: number, max: number): ValidatorFn[] => [Validators.min(min), Validators.max(max)];
const numero = (validadores: ValidatorFn[], valor: number | null = null) =>
  new FormControl<number | null>(valor, validadores);

/** Porción casera: nombre (máx. 40) y gramos (> 0 y ≤ 5000). */
export function crearPorcion(nombre = '', gramos: number | null = null): GrupoPorcion {
  return new FormGroup({
    nombre: new FormControl(nombre, {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(40), noSoloEspacios()],
    }),
    gramos: numero([Validators.required, Validators.min(0.01), Validators.max(5000)], gramos),
  });
}

/**
 * Formulario de un alimento propio (NutriSport_API.md §5 AlimentoRequest y §8), vacío o con los
 * datos de `alimento` (editar).
 *
 * Las aptitudes se mantienen coherentes al cambiarlas: vegano marca vegetariano y pescetariano;
 * vegetariano marca pescetariano; y quitar una quita las que la implican.
 */
export function crearFormularioAlimento(alimento?: AlimentoResponse | null): FormularioAlimento {
  const a = alimento ?? null;
  const form: FormularioAlimento = new FormGroup({
    nombre: new FormControl(a?.nombre ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(150), noSoloEspacios()],
    }),
    marca: new FormControl(a?.marca ?? '', { nonNullable: true, validators: Validators.maxLength(80) }),
    categoriaId: new FormControl<string | null>(a?.categoriaId ?? null, Validators.required),
    preparacion: new FormControl<Preparacion | null>(a?.preparacion ?? null),
    unidadBase: new FormControl<UnidadBase>(a?.unidadBase ?? 'G', {
      nonNullable: true,
      validators: Validators.required,
    }),
    kcal100: numero([Validators.required, ...entre(0, 900)], a?.kcal100 ?? null),
    proteinas100: numero([Validators.required, ...entre(0, 100)], a?.proteinas100 ?? null),
    carbohidratos100: numero([Validators.required, ...entre(0, 100)], a?.carbohidratos100 ?? null),
    azucares100: numero(entre(0, 100), a?.azucares100 ?? null),
    grasas100: numero([Validators.required, ...entre(0, 100)], a?.grasas100 ?? null),
    saturadas100: numero(entre(0, 100), a?.saturadas100 ?? null),
    fibra100: numero(entre(0, 100), a?.fibra100 ?? null),
    sal100: numero(entre(0, 100), a?.sal100 ?? null),
    porciones: new FormArray<GrupoPorcion>(
      (a?.porciones ?? []).map((p) => crearPorcion(p.nombre, p.gramos)),
      [Validators.maxLength(MAX_PORCIONES)],
    ),
    alergenosContiene: new FormControl<Alergeno[]>([...(a?.alergenosContiene ?? [])], { nonNullable: true }),
    alergenosTrazas: new FormControl<Alergeno[]>([...(a?.alergenosTrazas ?? [])], { nonNullable: true }),
    contieneLactosa: new FormControl(a?.contieneLactosa ?? false, { nonNullable: true }),
    aptoVegano: new FormControl(a?.aptoVegano ?? false, { nonNullable: true }),
    aptoVegetariano: new FormControl(a?.aptoVegetariano ?? false, { nonNullable: true }),
    aptoPescetariano: new FormControl(a?.aptoPescetariano ?? false, { nonNullable: true }),
  });

  // Coherencia de las aptitudes. Viven lo mismo que el formulario: no hace falta cancelar.
  const { aptoVegano, aptoVegetariano, aptoPescetariano } = form.controls;
  aptoVegano.valueChanges.subscribe((si) => {
    if (si) form.patchValue({ aptoVegetariano: true, aptoPescetariano: true });
  });
  aptoVegetariano.valueChanges.subscribe((si) => {
    if (si) aptoPescetariano.setValue(true);
    else aptoVegano.setValue(false);
  });
  aptoPescetariano.valueChanges.subscribe((si) => {
    if (!si) form.patchValue({ aptoVegetariano: false, aptoVegano: false });
  });

  return form;
}

/**
 * Avisos que no bloquean el guardado: valores que no cuadran entre sí (azúcares por encima de los
 * hidratos, saturadas por encima de las grasas) o un alérgeno a la vez en "contiene" y en "trazas".
 */
export function avisosAlimento(valor: ReturnType<FormularioAlimento['getRawValue']>): string[] {
  const avisos: string[] = [];
  const mayor = (a: number | null, b: number | null) => a !== null && b !== null && Number(a) > Number(b);
  if (mayor(valor.azucares100, valor.carbohidratos100)) {
    avisos.push('Los azúcares no pueden ser más que los hidratos de carbono: revisa los dos valores.');
  }
  if (mayor(valor.saturadas100, valor.grasas100)) {
    avisos.push('Las grasas saturadas no pueden ser más que las grasas totales: revisa los dos valores.');
  }
  const repetidos = valor.alergenosContiene.filter((a) => valor.alergenosTrazas.includes(a));
  if (repetidos.length) {
    avisos.push('Hay alérgenos marcados a la vez en «Contiene» y en «Puede contener trazas».');
  }
  return avisos;
}

/**
 * AlimentoRequest a partir del formulario válido: los booleanos siempre, los números como number,
 * y los opcionales (marca, preparación, azúcares, saturadas, fibra, sal, porciones, alérgenos)
 * solo si tienen valor. AlimentosService vuelve a limpiarlo antes de enviarlo.
 */
export function aAlimentoRequest(valor: ReturnType<FormularioAlimento['getRawValue']>): AlimentoRequest {
  const req: AlimentoRequest = {
    nombre: valor.nombre.trim(),
    categoriaId: valor.categoriaId!,
    kcal100: Number(valor.kcal100),
    proteinas100: Number(valor.proteinas100),
    carbohidratos100: Number(valor.carbohidratos100),
    grasas100: Number(valor.grasas100),
    unidadBase: valor.unidadBase,
    contieneLactosa: valor.contieneLactosa,
    aptoVegano: valor.aptoVegano,
    aptoVegetariano: valor.aptoVegetariano,
    aptoPescetariano: valor.aptoPescetariano,
  };
  if (valor.marca.trim()) req.marca = valor.marca.trim();
  if (valor.preparacion) req.preparacion = valor.preparacion;
  for (const campo of ['azucares100', 'saturadas100', 'fibra100', 'sal100'] as const) {
    if (valor[campo] !== null && valor[campo] !== undefined) req[campo] = Number(valor[campo]);
  }
  if (valor.porciones.length) {
    req.porciones = valor.porciones.map((p) => ({ nombre: p.nombre.trim(), gramos: Number(p.gramos) }));
  }
  if (valor.alergenosContiene.length) req.alergenosContiene = [...valor.alergenosContiene];
  if (valor.alergenosTrazas.length) req.alergenosTrazas = [...valor.alergenosTrazas];
  return req;
}

export interface OpcionCategoria {
  id: string;
  /** Ruta completa: "Frutas › Cítricos". */
  etiqueta: string;
  nivel: number;
}

/**
 * Categorías en orden jerárquico (cada padre seguido de sus hijas, por `orden` y nombre), con la
 * ruta completa como etiqueta. Las que apuntan a un padre que no existe van como raíces.
 */
export function categoriasJerarquicas(categorias: readonly CategoriaResponse[]): OpcionCategoria[] {
  const ids = new Set(categorias.map((c) => c.id));
  const hijas = new Map<string | null, CategoriaResponse[]>();
  for (const c of categorias) {
    const padre = c.padreId && ids.has(c.padreId) ? c.padreId : null;
    hijas.set(padre, [...(hijas.get(padre) ?? []), c]);
  }
  const ordenar = (lista: CategoriaResponse[]) =>
    [...lista].sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es'));

  const resultado: OpcionCategoria[] = [];
  const visitar = (padre: string | null, ruta: string, nivel: number, vistos: Set<string>) => {
    for (const c of ordenar(hijas.get(padre) ?? [])) {
      if (vistos.has(c.id)) continue; // ciclos en los datos
      const etiqueta = ruta ? `${ruta} › ${c.nombre}` : c.nombre;
      resultado.push({ id: c.id, etiqueta, nivel });
      visitar(c.id, etiqueta, nivel + 1, new Set([...vistos, c.id]));
    }
  };
  visitar(null, '', 0, new Set());
  return resultado;
}

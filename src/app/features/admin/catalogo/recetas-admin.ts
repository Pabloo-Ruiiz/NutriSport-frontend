// Utilidades de la administración de recetas (docs/api/admin.md §5 y §8): límites y conversión
// entre el formulario y RecetaAdminRequest.
import type {
  CategoriaResponse,
  Dificultad,
  IngredienteRecetaAdminRequest,
  RecetaAdminRequest,
  RecetaResponse,
  TipoComida,
} from '@core/models';
import { ORDEN_TIPOS_COMIDA } from '@core/models/etiquetas';

export const MAX_NOMBRE_RECETA = 150;
export const MAX_DESCRIPCION_RECETA = 2000;
export const MIN_RACIONES_RECETA = 1;
export const MAX_RACIONES_RECETA = 20;
export const MIN_TIEMPO_RECETA = 1;
export const MAX_TIEMPO_RECETA = 600;
export const MAX_ETIQUETAS_RECETA = 10;
export const MAX_PASOS_RECETA = 30;
export const MIN_INGREDIENTES_RECETA = 1;
export const MAX_INGREDIENTES_RECETA = 40;
export const MAX_GRAMOS_INGREDIENTE = 5000;
export const MAX_MEDIDA_INGREDIENTE = 60;

/** Cómo se indica la cantidad de un ingrediente: en gramos o con una medida de texto ("2 cucharadas"). */
export type ModoCantidad = 'gramos' | 'medida';

/** Valor de una fila de ingrediente del formulario. */
export interface IngredienteForm {
  alimentoId: string | null;
  /** Solo para mostrarlo: no se envía. */
  alimentoNombre: string;
  modo: ModoCantidad;
  gramos: number | null;
  medida: string;
}

/** Valor del formulario completo (getRawValue). */
export interface RecetaForm {
  nombre: string;
  descripcion: string;
  categoriaId: string | null;
  raciones: number | null;
  tiempoPreparacionMin: number | null;
  dificultad: Dificultad | null;
  franjasAptas: TipoComida[];
  etiquetas: string[];
  pasos: string[];
  ingredientes: IngredienteForm[];
}

export function ingredienteVacio(): IngredienteForm {
  return { alimentoId: null, alimentoNombre: '', modo: 'gramos', gramos: null, medida: '' };
}

/** Franjas válidas, sin repetir y en el orden del día. */
export function franjasValidas(valores: readonly string[]): TipoComida[] {
  const set = new Set(valores);
  return ORDEN_TIPOS_COMIDA.filter((t) => set.has(t));
}

/**
 * Exactamente RecetaAdminRequest: textos recortados, opcionales solo si tienen valor, pasos vacíos
 * fuera y cada ingrediente con gramos o con medida (nunca los dos).
 */
export function aRecetaAdminRequest(v: RecetaForm): RecetaAdminRequest {
  const descripcion = v.descripcion.trim();
  const etiquetas = v.etiquetas.map((e) => e.trim()).filter(Boolean);
  const pasos = v.pasos.map((p) => p.trim()).filter(Boolean);
  const franjas = franjasValidas(v.franjasAptas);
  const ingredientes: IngredienteRecetaAdminRequest[] = v.ingredientes.map((i) =>
    i.modo === 'gramos'
      ? { alimentoId: i.alimentoId ?? '', gramos: Number(i.gramos) }
      : { alimentoId: i.alimentoId ?? '', medida: i.medida.trim() },
  );
  return {
    nombre: v.nombre.trim(),
    ...(descripcion ? { descripcion } : {}),
    categoriaId: v.categoriaId ?? '',
    raciones: Number(v.raciones),
    ...(v.tiempoPreparacionMin !== null && v.tiempoPreparacionMin !== undefined
      ? { tiempoPreparacionMin: Number(v.tiempoPreparacionMin) }
      : {}),
    ...(v.dificultad ? { dificultad: v.dificultad } : {}),
    ...(franjas.length ? { franjasAptas: franjas } : {}),
    ...(etiquetas.length ? { etiquetas } : {}),
    ...(pasos.length ? { pasos } : {}),
    ingredientes,
  };
}

/**
 * Valores del formulario a partir de una receta (para editarla). La respuesta trae el nombre de la
 * categoría, no su id: se busca entre las categorías de receta (sin coincidencia, queda vacía).
 */
export function desdeReceta(r: RecetaResponse, categorias: readonly CategoriaResponse[]): RecetaForm {
  const categoria = categorias.find((c) => c.nombre === r.categoria) ?? null;
  return {
    nombre: r.nombre,
    descripcion: r.descripcion ?? '',
    categoriaId: categoria?.id ?? null,
    raciones: r.raciones,
    tiempoPreparacionMin: r.tiempoPreparacionMin,
    dificultad: r.dificultad,
    franjasAptas: franjasValidas(r.franjasAptas),
    etiquetas: r.etiquetas.slice(0, MAX_ETIQUETAS_RECETA),
    pasos: [...r.instrucciones]
      .sort((a, b) => a.orden - b.orden)
      .map((p) => p.texto)
      .slice(0, MAX_PASOS_RECETA),
    ingredientes: r.ingredientes.slice(0, MAX_INGREDIENTES_RECETA).map((i) => {
      const medida = i.medidaOriginal?.trim() ?? '';
      return {
        alimentoId: i.alimentoId,
        alimentoNombre: i.nombre,
        modo: medida || i.gramos === null ? 'medida' : 'gramos',
        gramos: i.gramos,
        medida: medida.slice(0, MAX_MEDIDA_INGREDIENTE),
      } satisfies IngredienteForm;
    }),
  };
}

/** Mueve un elemento de `desde` a `hasta` (índices dentro del array); devuelve una copia. */
export function mover<T>(lista: readonly T[], desde: number, hasta: number): T[] {
  const copia = [...lista];
  if (desde < 0 || desde >= copia.length || hasta < 0 || hasta >= copia.length) return copia;
  const [elemento] = copia.splice(desde, 1);
  copia.splice(hasta, 0, elemento);
  return copia;
}

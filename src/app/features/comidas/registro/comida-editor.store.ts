import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import type {
  AlimentoResponse,
  ErrorCampo,
  Nutrientes,
  RegistroComidaRequest,
  RegistroComidaResponse,
  TipoComida,
} from '@core/models';
import { AlimentosService } from '@core/services/alimentos.service';
import { aHoraApi, hoyLocal } from '@core/util/fechas';

/** Alimentos por comida (RegistroComidaRequest.alimentos). */
export const MAX_LINEAS = 40;
/** Cantidad máxima por alimento (5 kg). */
export const MAX_CANTIDAD = 5000;
/** Lo que se suma al añadir un alimento que ya está, y la cantidad inicial de uno nuevo. */
export const CANTIDAD_INICIAL = 100;

export interface LineaComida {
  alimento: AlimentoResponse;
  cantidad: number;
  /** "g", "kg", "ml", "l" o el nombre de una porción casera del alimento. */
  unidad: string;
}

export interface Estimacion extends Nutrientes {
  /** Gramos totales (los ml cuentan como g). */
  gramos: number;
  /** true: calculada en el cliente con los valores por 100 g; false: los totales del servidor. */
  esEstimacion: boolean;
}

/** Unidades que admite el backend sin porción (NutriSport_API.md §7.2). */
const GRAMOS_POR_UNIDAD: Record<string, number> = { g: 1, kg: 1000, ml: 1, l: 1000 };

/**
 * Tipo de comida sugerido por la hora ("HH:mm"): antes de las 11 DESAYUNO, de 11 a 13
 * MEDIA_MANANA, de 13 a 16 COMIDA, de 16 a 19 MERIENDA y después CENA.
 */
export function tipoPorHora(hora: string): TipoComida {
  const [h, m] = hora.split(':').map(Number);
  const minutos = (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
  if (minutos < 11 * 60) return 'DESAYUNO';
  if (minutos < 13 * 60) return 'MEDIA_MANANA';
  if (minutos < 16 * 60) return 'COMIDA';
  if (minutos < 19 * 60) return 'MERIENDA';
  return 'CENA';
}

/** Unidad básica del alimento: "g" o "ml". */
export function unidadBasica(alimento: AlimentoResponse): 'g' | 'ml' {
  return alimento.unidadBase === 'ML' ? 'ml' : 'g';
}

/** Unidades que se pueden elegir para un alimento: g y kg (o ml y l) y sus porciones caseras. */
export function unidadesDe(alimento: AlimentoResponse): string[] {
  const basicas = alimento.unidadBase === 'ML' ? ['ml', 'l'] : ['g', 'kg'];
  return [...basicas, ...alimento.porciones.map((p) => p.nombre)];
}

/**
 * Gramos de una cantidad en una unidad: g, kg, ml (1 ml ≈ 1 g), l o una porción del alimento.
 * null si la unidad no es ninguna de esas.
 */
export function gramosDe(alimento: AlimentoResponse, cantidad: number, unidad: string): number | null {
  const porcion = alimento.porciones.find((p) => p.nombre === unidad);
  if (porcion) return cantidad * porcion.gramos;
  const factor = GRAMOS_POR_UNIDAD[unidad.toLowerCase()];
  return factor === undefined ? null : cantidad * factor;
}

const redondear = (valor: number, decimales = 1) => Math.round(valor * 10 ** decimales) / 10 ** decimales;

/** Ahora en local: "HH:mm". */
function horaActual(): string {
  return aHoraApi(new Date());
}

/**
 * Estado de la comida que se está registrando o editando (DESIGN.md §7.6, "comida en
 * construcción"). Se provee en el componente:
 *
 *   @Component({ providers: [ComidaEditorStore], … })
 *   private readonly editor = inject(ComidaEditorStore);
 *
 * - fecha (hoy), hora (ahora, "HH:mm"), tipo de comida sugerido por la hora (mientras el usuario
 *   no lo elija), notas y líneas { alimento, cantidad, unidad }.
 * - `estimacion`: kcal y macros calculados con los valores por 100 g, marcados como estimación;
 *   tras guardar (o al cargar una comida) son los totales del servidor hasta que se cambie algo.
 * - aRequest(): RegistroComidaRequest con solo alimentoId, cantidad y unidad (hasta 40 líneas).
 */
@Injectable()
export class ComidaEditorStore {
  private readonly alimentos = inject(AlimentosService);

  readonly fecha = signal(hoyLocal());
  readonly hora = signal(horaActual());
  readonly tipoComida = signal<TipoComida>(tipoPorHora(this.hora()));
  /** true si el usuario ha elegido el tipo: ya no se sugiere al cambiar la hora. */
  readonly tipoElegido = signal(false);
  readonly notas = signal('');
  readonly lineas = signal<readonly LineaComida[]>([]);
  /** Avisos de la última respuesta del servidor (restricciones; no bloquean). */
  readonly avisos = signal<readonly string[]>([]);
  /** Alimentos de una comida cargada que no se pueden editar aquí (sin alimentoId en el catálogo). */
  readonly noEditables = signal<readonly string[]>([]);

  /** Errores del servidor por línea (índice de `lineas`), p. ej. de alimentos[2].cantidad. */
  readonly erroresLineas = signal<ReadonlyMap<number, string>>(new Map());

  /** Totales del servidor para las líneas actuales; se descartan al cambiar cualquier línea. */
  private readonly totalesServidor = signal<Nutrientes | null>(null);

  readonly vacia = computed(() => this.lineas().length === 0);
  /** Índices de las líneas sin cantidad (0): hay que corregirlas antes de guardar. */
  readonly lineasSinCantidad = computed(() =>
    this.lineas()
      .map((l, i) => (l.cantidad > 0 ? -1 : i))
      .filter((i) => i >= 0),
  );
  readonly llena = computed(() => this.lineas().length >= MAX_LINEAS);

  readonly estimacion = computed<Estimacion>(() => {
    let kcal = 0;
    let proteina = 0;
    let carbohidratos = 0;
    let grasa = 0;
    let gramos = 0;
    for (const { alimento, cantidad, unidad } of this.lineas()) {
      const g = gramosDe(alimento, cantidad, unidad) ?? 0;
      const f = g / 100;
      gramos += g;
      kcal += alimento.kcal100 * f;
      proteina += alimento.proteinas100 * f;
      carbohidratos += alimento.carbohidratos100 * f;
      grasa += alimento.grasas100 * f;
    }
    const servidor = this.totalesServidor();
    if (servidor) return { ...servidor, gramos: redondear(gramos), esEstimacion: false };
    return {
      kcal: Math.round(kcal),
      proteina: redondear(proteina),
      carbohidratos: redondear(carbohidratos),
      grasa: redondear(grasa),
      gramos: redondear(gramos),
      esEstimacion: true,
    };
  });

  // ---- Datos de la comida

  cambiarFecha(fecha: string): void {
    this.fecha.set(fecha);
  }

  /** Cambia la hora y, si el usuario no ha elegido tipo, vuelve a sugerirlo. */
  cambiarHora(hora: string): void {
    this.hora.set(hora);
    if (!this.tipoElegido()) this.tipoComida.set(tipoPorHora(hora));
  }

  cambiarTipo(tipo: TipoComida): void {
    this.tipoComida.set(tipo);
    this.tipoElegido.set(true);
  }

  cambiarNotas(notas: string): void {
    this.notas.set(notas);
  }

  // ---- Líneas

  /**
   * Añade un alimento con 100 g (o 100 ml). Si ya está, le suma 100 g: en su unidad si es g o ml; si
   * estaba en kg, l o una porción, la línea pasa a g (o ml) con el total. No pasa de 40 líneas ni de
   * 5000 por alimento. Devuelve false si no se pudo añadir (comida llena).
   */
  anadir(alimento: AlimentoResponse): boolean {
    const lineas = this.lineas();
    const i = lineas.findIndex((l) => l.alimento.id === alimento.id);
    if (i === -1) {
      if (lineas.length >= MAX_LINEAS) return false;
      this.cambiarLineas([...lineas, { alimento, cantidad: CANTIDAD_INICIAL, unidad: unidadBasica(alimento) }]);
      return true;
    }

    const linea = lineas[i];
    const basica = unidadBasica(alimento);
    const actual =
      linea.unidad === basica ? linea.cantidad : (gramosDe(alimento, linea.cantidad, linea.unidad) ?? linea.cantidad);
    this.actualizarLinea(i, { cantidad: Math.min(MAX_CANTIDAD, redondear(actual + CANTIDAD_INICIAL)), unidad: basica });
    return true;
  }

  quitar(indice: number): void {
    this.cambiarLineas(this.lineas().filter((_, i) => i !== indice));
  }

  /** Cantidad entre 0 y 5000 (0 se queda para que el usuario la corrija; aRequest la valida). */
  cambiarCantidad(indice: number, cantidad: number): void {
    const valor = Number.isFinite(cantidad) ? Math.min(MAX_CANTIDAD, Math.max(0, cantidad)) : 0;
    this.actualizarLinea(indice, { cantidad: valor });
  }

  /**
   * Cambia la unidad conservando los gramos cuando se puede (100 g → 0,1 kg; 2 cucharadas de 10 g →
   * 20 g). Si la unidad no es válida para el alimento, no hace nada.
   */
  cambiarUnidad(indice: number, unidad: string): void {
    const linea = this.lineas()[indice];
    if (!linea || !unidadesDe(linea.alimento).includes(unidad) || unidad === linea.unidad) return;
    const gramos = gramosDe(linea.alimento, linea.cantidad, linea.unidad);
    const porUnidad = gramosDe(linea.alimento, 1, unidad);
    const cantidad = gramos !== null && porUnidad ? redondear(gramos / porUnidad, 2) : linea.cantidad;
    this.actualizarLinea(indice, { unidad, cantidad: Math.min(MAX_CANTIDAD, cantidad) });
  }

  /**
   * Carga una comida guardada para editarla: fecha, hora, tipo, notas y líneas (con el detalle de
   * cada alimento, que trae las porciones). Los totales del servidor se usan hasta que se cambie algo.
   * Los alimentos sin alimentoId (productos sin ficha) se listan en `noEditables`.
   */
  async cargarDesde(comida: RegistroComidaResponse): Promise<void> {
    const conFicha = comida.alimentos.filter((a) => a.alimentoId);
    const detalles = await Promise.all(conFicha.map((a) => firstValueFrom(this.alimentos.detalle(a.alimentoId!))));

    this.fecha.set(comida.fecha);
    const hora = comida.hora?.slice(0, 5) ?? horaActual();
    this.hora.set(hora);
    this.tipoComida.set(comida.tipoComida ?? tipoPorHora(hora));
    this.tipoElegido.set(comida.tipoComida !== null);
    this.notas.set(comida.notas ?? '');
    this.lineas.set(
      conFicha.map((a, i) => ({ alimento: detalles[i], cantidad: Number(a.cantidad), unidad: a.unidad })),
    );
    this.noEditables.set(comida.alimentos.filter((a) => !a.alimentoId).map((a) => a.nombre));
    this.aplicarRespuesta(comida);
  }

  /**
   * Sustituye las líneas por los alimentos de otra comida ("Copiar comida anterior"), con sus
   * cantidades y unidades. Fecha, hora, tipo y notas no cambian. Devuelve cuántos no se han podido
   * copiar (sin ficha en el catálogo).
   */
  async copiarAlimentosDe(comida: RegistroComidaResponse): Promise<number> {
    const conFicha = comida.alimentos.filter((a) => a.alimentoId).slice(0, MAX_LINEAS);
    const detalles = await Promise.all(conFicha.map((a) => firstValueFrom(this.alimentos.detalle(a.alimentoId!))));
    this.cambiarLineas(
      conFicha.map((a, i) => ({
        alimento: detalles[i],
        cantidad: Math.min(MAX_CANTIDAD, Number(a.cantidad)),
        unidad: unidadesDe(detalles[i]).includes(a.unidad) ? a.unidad : unidadBasica(detalles[i]),
      })),
    );
    return comida.alimentos.length - conFicha.length;
  }

  /**
   * Errores 400 del servidor en los alimentos ("alimentos[2].cantidad") → `erroresLineas`, con el
   * índice de la línea (aRequest no envía las líneas sin cantidad). Devuelve los que no son de una
   * línea, para mostrarlos aparte.
   */
  aplicarErroresLineas(errores: readonly ErrorCampo[]): ErrorCampo[] {
    const enviadas = this.indicesEnviados();
    const porLinea = new Map<number, string>();
    const resto: ErrorCampo[] = [];
    for (const error of errores) {
      const coincide = /^alimentos\[(\d+)\]/.exec(error.campo);
      const linea = coincide ? enviadas[Number(coincide[1])] : undefined;
      if (linea === undefined) {
        resto.push(error);
      } else {
        porLinea.set(linea, porLinea.has(linea) ? `${porLinea.get(linea)} ${error.mensaje}` : error.mensaje);
      }
    }
    this.erroresLineas.set(porLinea);
    return resto;
  }

  /** Tras guardar: los totales y avisos del servidor sustituyen a la estimación. */
  aplicarRespuesta(respuesta: Pick<RegistroComidaResponse, 'totales' | 'avisos'>): void {
    this.totalesServidor.set(respuesta.totales);
    this.avisos.set(respuesta.avisos ?? []);
  }

  /** Vuelve al estado inicial (comida nueva ahora mismo). */
  vaciar(): void {
    const hora = horaActual();
    this.fecha.set(hoyLocal());
    this.hora.set(hora);
    this.tipoComida.set(tipoPorHora(hora));
    this.tipoElegido.set(false);
    this.notas.set('');
    this.lineas.set([]);
    this.avisos.set([]);
    this.noEditables.set([]);
    this.erroresLineas.set(new Map());
    this.totalesServidor.set(null);
  }

  /**
   * RegistroComidaRequest: hora "HH:mm:ss", notas solo si hay, y cada alimento con solo alimentoId,
   * cantidad y unidad. Las líneas sin cantidad válida (0) no se envían; como mucho 40.
   */
  aRequest(): RegistroComidaRequest {
    const req: RegistroComidaRequest = {
      fecha: this.fecha(),
      tipoComida: this.tipoComida(),
      alimentos: this.indicesEnviados().map((i) => {
        const l = this.lineas()[i];
        return { alimentoId: l.alimento.id, cantidad: l.cantidad, unidad: l.unidad };
      }),
    };
    if (/^\d{2}:\d{2}$/.test(this.hora())) req.hora = `${this.hora()}:00`;
    const notas = this.notas().trim();
    if (notas) req.notas = notas.slice(0, 500);
    return req;
  }

  /** Índices de las líneas que se envían: las que tienen cantidad, como mucho 40. */
  private indicesEnviados(): number[] {
    return this.lineas()
      .map((l, i) => (l.cantidad > 0 ? i : -1))
      .filter((i) => i >= 0)
      .slice(0, MAX_LINEAS);
  }

  private actualizarLinea(indice: number, cambios: Partial<Omit<LineaComida, 'alimento'>>): void {
    const lineas = this.lineas();
    if (!lineas[indice]) return;
    this.cambiarLineas(lineas.map((l, i) => (i === indice ? { ...l, ...cambios } : l)));
  }

  /** Cualquier cambio en las líneas invalida los totales y los errores del servidor. */
  private cambiarLineas(lineas: LineaComida[]): void {
    this.lineas.set(lineas);
    this.totalesServidor.set(null);
    if (this.erroresLineas().size) this.erroresLineas.set(new Map());
  }
}

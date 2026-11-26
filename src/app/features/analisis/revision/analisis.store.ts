import { Injectable, computed, signal } from '@angular/core';

import type {
  AlimentoResponse,
  AlimentoResumenResponse,
  AnalisisResponse,
  CandidatoAnalisis,
  CoincidenciaCatalogo,
  ConfirmarAnalisisRequest,
  Nutrientes,
  Preparacion,
  TipoComida,
} from '@core/models';
import { aHoraApi, hoyLocal } from '@core/util/fechas';
import { tipoPorHora } from '../../comidas/registro/comida-editor.store';

/** Alimentos por confirmación (ConfirmarAnalisisRequest.alimentos: 1–20). */
export const MAX_ALIMENTOS_ANALISIS = 20;
/** Gramos máximos por alimento (AlimentoConfirmadoRequest.gramos ≤ 5000). */
export const MAX_GRAMOS_ANALISIS = 5000;

export interface LineaAnalisis {
  /** Identificador local para @for (track). */
  readonly id: number;
  /** Posición en `candidatos`, o null si se ha añadido a mano. */
  readonly indiceCandidato: number | null;
  /** Lo que vio la IA ("Salmón"); null en las añadidas a mano. */
  readonly nombreDetectado: string | null;
  /** Alimento del catálogo elegido; null = "Sin emparejar" (hay que elegir uno). */
  readonly alimentoId: string | null;
  readonly nombreAlimento: string | null;
  readonly gramos: number;
  readonly confianza: number | null;
  readonly nivelConfianza: string | null;
  /** Preparación detectada por la IA (no cambia al elegir otro alimento); null en las manuales. */
  readonly preparacion: Preparacion | null;
  /** Nutrientes por 100 g del alimento elegido; null si no se pueden calcular. */
  readonly por100: Nutrientes | null;
  /** Gramos que estimó la IA: los `estimados` de las coincidencias son para esta cantidad. */
  readonly gramosEstimados: number | null;
  /** Coincidencias del catálogo (alternativas para "Cambiar alimento"); vacío en las manuales. */
  readonly coincidencias: readonly CoincidenciaCatalogo[];
}

/** Alimento del catálogo: el detalle o el resumen del buscador (los dos traen los valores por 100 g). */
export type AlimentoCatalogo = Pick<
  AlimentoResponse | AlimentoResumenResponse,
  'id' | 'nombre' | 'kcal100' | 'proteinas100' | 'carbohidratos100' | 'grasas100'
>;

/** Datos de la comida que llegan con la ruta (/comidas/foto/{id}?fecha=…&hora=…). */
export interface DatosIniciales {
  fecha?: string | null;
  hora?: string | null;
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^\d{2}:\d{2}/;
const CERO: Nutrientes = { kcal: 0, proteina: 0, carbohidratos: 0, grasa: 0 };

/**
 * Revisión de un análisis COMPLETADO (docs/api/analisis.md §7.1) antes de confirmarlo como comida.
 * Se provee en el componente: `providers: [AnalisisStore]`.
 *
 * - Cada candidato es una línea con su primera coincidencia con alimentoId (la propuesta). Sin
 *   ninguna queda "Sin emparejar" y hay que elegir alimento.
 * - Los `estimados` de una coincidencia son para los gramos estimados del candidato: se guardan
 *   normalizados a 100 g (`por100`) para recalcular al cambiar los gramos.
 * - aRequest(): un AlimentoConfirmadoRequest por línea; indiceCandidato solo en las que vienen de
 *   un candidato (cada candidato como mucho una vez; los quitados no se envían).
 */
@Injectable()
export class AnalisisStore {
  private siguienteId = 0;

  readonly analisisId = signal<string | null>(null);
  readonly lineas = signal<readonly LineaAnalisis[]>([]);
  readonly fecha = signal(hoyLocal());
  /** "HH:mm" o vacío. */
  readonly hora = signal(aHoraApi(new Date()));
  readonly tipoComida = signal<TipoComida>(tipoPorHora(this.hora()));

  /** Estimación con los valores por 100 g (se ignoran las líneas sin `por100`). */
  readonly totales = computed<Nutrientes>(() => {
    const suma = { ...CERO };
    for (const { por100, gramos } of this.lineas()) {
      if (!por100 || !(gramos > 0)) continue;
      const f = gramos / 100;
      suma.kcal += por100.kcal * f;
      suma.proteina += por100.proteina * f;
      suma.carbohidratos += por100.carbohidratos * f;
      suma.grasa += por100.grasa * f;
    }
    return {
      kcal: Math.round(suma.kcal),
      proteina: redondear(suma.proteina),
      carbohidratos: redondear(suma.carbohidratos),
      grasa: redondear(suma.grasa),
    };
  });

  /** Índices de las líneas sin alimento elegido. */
  readonly sinEmparejar = computed(() =>
    this.lineas()
      .map((l, i) => (l.alimentoId ? -1 : i))
      .filter((i) => i >= 0),
  );
  readonly llena = computed(() => this.lineas().length >= MAX_ALIMENTOS_ANALISIS);

  /** Entre 1 y 20 líneas, todas con alimento y con gramos > 0 (y ≤ 5000). */
  readonly valido = computed(() => {
    const lineas = this.lineas();
    return (
      lineas.length > 0 &&
      lineas.length <= MAX_ALIMENTOS_ANALISIS &&
      lineas.every((l) => !!l.alimentoId && gramosValidos(l.gramos))
    );
  });

  /**
   * Carga el análisis: líneas desde los candidatos, tipo de comida del análisis y fecha y hora de
   * `datos` (las que eligió el usuario antes de analizar) o, si no vienen, de `creadoEn`.
   */
  iniciar(analisis: AnalisisResponse, datos: DatosIniciales = {}): void {
    this.analisisId.set(analisis.id);
    this.lineas.set(analisis.candidatos.map((c, i) => this.desdeCandidato(c, i)));

    const fecha = datos.fecha && FECHA.test(datos.fecha) ? datos.fecha : analisis.creadoEn.slice(0, 10);
    this.fecha.set(FECHA.test(fecha) ? fecha : hoyLocal());
    const hora = datos.hora && HORA.test(datos.hora) ? datos.hora : analisis.creadoEn.slice(11, 16);
    this.hora.set(HORA.test(hora) ? hora.slice(0, 5) : '');
    this.tipoComida.set(analisis.tipoComida ?? tipoPorHora(this.hora()));
  }

  // ---- Datos de la comida

  cambiarFecha(fecha: string): void {
    this.fecha.set(fecha);
  }

  cambiarHora(hora: string): void {
    this.hora.set(hora);
  }

  cambiarTipo(tipo: TipoComida): void {
    this.tipoComida.set(tipo);
  }

  // ---- Líneas

  cambiarGramos(i: number, gramos: number): void {
    this.actualizar(i, (l) => ({ ...l, gramos: Number.isFinite(gramos) ? gramos : 0 }));
  }

  /**
   * Cambia el alimento de una línea por otro del catálogo (AlimentoResponse o el resumen del
   * buscador, con sus valores por 100 g) o por otra coincidencia del candidato (sus `estimados`, normalizados a 100 g). Una
   * coincidencia sin alimentoId no se puede confirmar: se ignora.
   */
  cambiarAlimento(i: number, alimento: AlimentoCatalogo | CoincidenciaCatalogo): void {
    if (esAlimento(alimento)) {
      this.actualizar(i, (l) => ({
        ...l,
        alimentoId: alimento.id,
        nombreAlimento: alimento.nombre,
        por100: por100DeAlimento(alimento),
      }));
      return;
    }
    if (!alimento.alimentoId) return;
    this.actualizar(i, (l) => ({
      ...l,
      alimentoId: alimento.alimentoId,
      nombreAlimento: alimento.nombre,
      por100: normalizar(alimento.estimados, l.gramosEstimados),
    }));
  }

  quitar(i: number): void {
    this.lineas.update((lineas) => lineas.filter((_, j) => j !== i));
  }

  /** Añade un alimento no detectado. false si ya hay 20 o los gramos no son válidos. */
  anadirManual(alimento: AlimentoCatalogo, gramos: number): boolean {
    if (this.llena() || !gramosValidos(gramos)) return false;
    const linea: LineaAnalisis = {
      id: this.siguienteId++,
      indiceCandidato: null,
      nombreDetectado: null,
      alimentoId: alimento.id,
      nombreAlimento: alimento.nombre,
      gramos,
      confianza: null,
      nivelConfianza: null,
      preparacion: null,
      por100: por100DeAlimento(alimento),
      gramosEstimados: null,
      coincidencias: [],
    };
    this.lineas.update((lineas) => [...lineas, linea]);
    return true;
  }

  /**
   * ConfirmarAnalisisRequest: fecha, hora ("HH:mm:ss", si hay), tipo y un alimento por línea con
   * alimentoId, gramos e indiceCandidato (solo si no es null). Comprueba antes `valido()`: aquí no
   * se quitan líneas para no perder alimentos sin avisar.
   */
  aRequest(): ConfirmarAnalisisRequest {
    const req: ConfirmarAnalisisRequest = {
      fecha: this.fecha(),
      tipoComida: this.tipoComida(),
      alimentos: this.lineas().map((l) => {
        const alimento: ConfirmarAnalisisRequest['alimentos'][number] = {
          alimentoId: l.alimentoId ?? '',
          gramos: redondear(l.gramos),
        };
        if (l.indiceCandidato !== null) alimento.indiceCandidato = l.indiceCandidato;
        return alimento;
      }),
    };
    const hora = this.hora();
    if (HORA.test(hora)) req.hora = `${hora.slice(0, 5)}:00`;
    return req;
  }

  private desdeCandidato(c: CandidatoAnalisis, indice: number): LineaAnalisis {
    const elegida = c.coincidencias.find((m) => !!m.alimentoId) ?? null;
    return {
      id: this.siguienteId++,
      indiceCandidato: indice,
      nombreDetectado: c.nombreDetectado,
      alimentoId: elegida?.alimentoId ?? null,
      nombreAlimento: elegida?.nombre ?? null,
      gramos: c.gramosEstimados ?? 0,
      confianza: c.confianza,
      nivelConfianza: c.nivelConfianza,
      preparacion: c.preparacion,
      por100: elegida ? normalizar(elegida.estimados, c.gramosEstimados) : null,
      gramosEstimados: c.gramosEstimados,
      coincidencias: c.coincidencias,
    };
  }

  private actualizar(i: number, cambio: (l: LineaAnalisis) => LineaAnalisis): void {
    this.lineas.update((lineas) => lineas.map((l, j) => (j === i ? cambio(l) : l)));
  }
}

function esAlimento(a: AlimentoCatalogo | CoincidenciaCatalogo): a is AlimentoCatalogo {
  return 'kcal100' in a;
}

function gramosValidos(gramos: number): boolean {
  return Number.isFinite(gramos) && gramos > 0 && gramos <= MAX_GRAMOS_ANALISIS;
}

function por100DeAlimento(a: AlimentoCatalogo): Nutrientes {
  return { kcal: a.kcal100, proteina: a.proteinas100, carbohidratos: a.carbohidratos100, grasa: a.grasas100 };
}

/** Nutrientes para `gramos` → por 100 g. null si no hay datos o los gramos no son positivos. */
export function normalizar(estimados: Nutrientes | null, gramos: number | null): Nutrientes | null {
  if (!estimados || !gramos || gramos <= 0) return null;
  // (v · 100) / g en lugar de v · (100 / g): menos error de redondeo (19,5 g en 150 g → 13, no 12,999…).
  const a100 = (valor: number) => (valor * 100) / gramos;
  return {
    kcal: a100(estimados.kcal),
    proteina: a100(estimados.proteina),
    carbohidratos: a100(estimados.carbohidratos),
    grasa: a100(estimados.grasa),
  };
}

const redondear = (valor: number, decimales = 1) => Math.round(valor * 10 ** decimales) / 10 ** decimales;

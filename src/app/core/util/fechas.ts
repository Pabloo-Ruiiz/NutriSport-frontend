/**
 * Utilidades de fechas para hablar con la API (NutriSport_API.md §1).
 *
 * La API usa fechas locales "AAAA-MM-DD" y horas "HH:mm". Todas las funciones
 * trabajan con los componentes LOCALES del Date (nunca toISOString(), que usa
 * UTC y puede mover la fecha al día anterior). Son funciones puras y sin
 * librerías externas.
 */

const MS_POR_DIA = 86_400_000;
const PATRON_FECHA_API = /^(\d{4})-(\d{2})-(\d{2})$/;

function rellenar(valor: number, digitos = 2): string {
  return String(valor).padStart(digitos, '0');
}

/** Descompone "AAAA-MM-DD" en año, mes (1-12) y día. Lanza un error si la fecha no es válida. */
function componentes(fecha: string): { anio: number; mes: number; dia: number } {
  const coincidencia = PATRON_FECHA_API.exec(fecha);
  if (!coincidencia) {
    throw new Error(`Fecha con formato no válido (se espera AAAA-MM-DD): "${fecha}"`);
  }
  const anio = Number(coincidencia[1]);
  const mes = Number(coincidencia[2]);
  const dia = Number(coincidencia[3]);

  // Comprueba que el día existe (rechaza, por ejemplo, 2026-02-30).
  const prueba = new Date(Date.UTC(anio, mes - 1, dia));
  if (
    prueba.getUTCFullYear() !== anio ||
    prueba.getUTCMonth() !== mes - 1 ||
    prueba.getUTCDate() !== dia
  ) {
    throw new Error(`La fecha no existe: "${fecha}"`);
  }
  return { anio, mes, dia };
}

/** Convierte un Date a "AAAA-MM-DD" con sus componentes locales. */
export function aFechaApi(d: Date): string {
  return `${rellenar(d.getFullYear(), 4)}-${rellenar(d.getMonth() + 1)}-${rellenar(d.getDate())}`;
}

/** Convierte "AAAA-MM-DD" en un Date local a las 12:00, para evitar saltos del horario de verano. */
export function desdeFechaApi(f: string): Date {
  const { anio, mes, dia } = componentes(f);
  return new Date(anio, mes - 1, dia, 12, 0, 0, 0);
}

/** Fecha de hoy en hora local, "AAAA-MM-DD". */
export function hoyLocal(): string {
  return aFechaApi(new Date());
}

/** Suma (o resta, si es negativo) días a una fecha "AAAA-MM-DD". */
export function sumarDias(fecha: string, dias: number): string {
  const d = desdeFechaApi(fecha);
  d.setDate(d.getDate() + dias);
  return aFechaApi(d);
}

/** Lunes de la semana (de lunes a domingo) a la que pertenece la fecha. */
export function lunesDeLaSemana(fecha: string): string {
  const diaSemana = desdeFechaApi(fecha).getDay(); // 0 = domingo … 6 = sábado
  const diasDesdeLunes = (diaSemana + 6) % 7;
  return sumarDias(fecha, -diasDesdeLunes);
}

/** Días naturales de `desde` a `hasta` (negativo si `hasta` es anterior). */
export function diasEntre(desde: string, hasta: string): number {
  const a = componentes(desde);
  const b = componentes(hasta);
  // Se cuenta en UTC para que los días de 23 o 25 horas no afecten al resultado.
  const msDesde = Date.UTC(a.anio, a.mes - 1, a.dia);
  const msHasta = Date.UTC(b.anio, b.mes - 1, b.dia);
  return Math.round((msHasta - msDesde) / MS_POR_DIA);
}

/** Todas las fechas de `desde` a `hasta`, ambas incluidas. Vacío si `hasta` es anterior a `desde`. */
export function rangoDias(desde: string, hasta: string): string[] {
  const total = diasEntre(desde, hasta);
  const dias: string[] = [];
  for (let i = 0; i <= total; i++) {
    dias.push(sumarDias(desde, i));
  }
  return dias;
}

/** Convierte un Date a "HH:mm" con la hora local. */
export function aHoraApi(d: Date): string {
  return `${rellenar(d.getHours())}:${rellenar(d.getMinutes())}`;
}

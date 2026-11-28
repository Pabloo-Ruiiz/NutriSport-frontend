import { ChangeDetectionStrategy, Component, computed, forwardRef, inject, input, signal } from '@angular/core';
import { FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { Observable, map } from 'rxjs';

import type { Alergeno, AlimentoResumenResponse, Dieta, Intolerancia, PreferenciaDto, Severidad } from '@core/models';
import { ETIQUETAS_ALERGENO, ETIQUETAS_INTOLERANCIA, ETIQUETAS_SEVERIDAD } from '@core/models/etiquetas';
import { AlimentosService } from '@core/services/alimentos.service';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import {
  NsComboboxComponent,
  NsComboboxOpcionDirective,
  NsResaltadoComponent,
} from '@shared/ui/form/combobox.component';
import { NsControlCampo, idUnico } from '@shared/ui/form/control-campo';
import { NsControlValor, type NsOpcion } from '@shared/ui/form/control-valor';
import { NsInputDirective } from '@shared/ui/form/input.directive';
import { NsSegmentedComponent } from '@shared/ui/form/segmented.component';
import {
  DIETAS_FILTRABLES,
  INTOLERANCIAS_FILTRABLES,
  MAX_DETALLE,
  OPCIONES_ALERGIA,
  OPCIONES_DIETA,
  OPCIONES_INTOLERANCIA,
  type OpcionAlergia,
} from './opciones-preferencias';

/** Retraso de la búsqueda de alimentos mientras se escribe (el de ns-combobox). */
export const DEBOUNCE_BUSQUEDA_MS = 250;

/** Dietas que se guardan pero no se filtran automáticamente (NutriSport_API.md §10). */
export const DIETAS_SIN_FILTRO: readonly Dieta[] = OPCIONES_DIETA.map((o) => o.valor).filter(
  (d): d is Dieta => !!d && !DIETAS_FILTRABLES.includes(d),
);

/** Severidad con la que se crea cada preferencia: ESTRICTA si se puede filtrar; si no, PREFERENCIA. */
const severidadInicial = (filtrable: boolean): Severidad => (filtrable ? 'ESTRICTA' : 'PREFERENCIA');

/** Alimento rechazado: el id va al DTO; el nombre solo se usa en pantalla. */
interface Rechazo {
  alimentoId: string;
  nombre: string;
}

/**
 * Preferencias y restricciones alimentarias (DESIGN.md §7.3, paso 4), como ControlValueAccessor de
 * PreferenciaDto[] para formControlName:
 *
 *   <app-selector-preferencias formControlName="preferencias" />
 *
 * - Alergias (opciones-preferencias.ts): cada tarjeta marca sus alérgenos del catálogo (ALERGIA +
 *   alergeno, ESTRICTA y conmutable a PREFERENCIA); «Frutas» y las que se escriben a mano van como
 *   ALERGIA + detalle (PREFERENCIA: no se pueden filtrar). «Otras alergias» permite
 *   escribir las que no están en la lista.
 * - Intolerancias: INTOLERANCIA + intolerancia (lactosa y gluten, ESTRICTAS y conmutables; el resto,
 *   PREFERENCIA) o + detalle si se escriben a mano.
 * - Dietas: DIETA + dieta (vegetariana, vegana y pescetariana, ESTRICTAS; el resto, PREFERENCIA);
 *   PERSONALIZADA con su descripción en detalle. «Sin restricciones» = ninguna dieta.
 * - Alimentos que no le gustan: ns-combobox con AlimentosService.buscar (250 ms) → RECHAZO +
 *   alimentoId, PREFERENCIA.
 *
 * Cada tipo lleva solo el campo que exige (PUT /perfil/preferencias). Lo que no entiende (p. ej.
 * FAVORITO o un rechazo de categoría) lo conserva tal cual.
 */
@Component({
  selector: 'app-selector-preferencias',
  imports: [
    FormsModule,
    LucideDynamicIcon,
    NsButtonComponent,
    NsInputDirective,
    NsComboboxComponent,
    NsComboboxOpcionDirective,
    NsResaltadoComponent,
    NsSegmentedComponent,
  ],
  templateUrl: './selector-preferencias.component.html',
  styleUrl: './selector-preferencias.component.scss',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SelectorPreferenciasComponent), multi: true },
    { provide: NsControlCampo, useExisting: forwardRef(() => SelectorPreferenciasComponent) },
  ],
  host: { class: 'ns-preferencias' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectorPreferenciasComponent extends NsControlValor<PreferenciaDto[]> {
  readonly id = input<string>();
  readonly etiquetable = false;
  private readonly idGenerado = idUnico('ns-preferencias');
  readonly idControl = computed(() => this.id() || this.idGenerado);

  private readonly alimentos = inject(AlimentosService);

  protected readonly opcionesAlergia = OPCIONES_ALERGIA;
  protected readonly opcionesIntolerancia = OPCIONES_INTOLERANCIA;
  protected readonly opcionesDieta = OPCIONES_DIETA;
  protected readonly maxDetalle = MAX_DETALLE;
  protected readonly opcionesSeveridad: NsOpcion<Severidad>[] = [
    { valor: 'ESTRICTA', etiqueta: ETIQUETAS_SEVERIDAD.ESTRICTA },
    { valor: 'PREFERENCIA', etiqueta: ETIQUETAS_SEVERIDAD.PREFERENCIA },
  ];

  /** Lista actual (el valor del control). */
  protected readonly lista = computed(() => this.valor() ?? []);

  protected readonly alergenos = computed(
    () => new Set(this.lista().flatMap((p) => (p.tipo === 'ALERGIA' && p.alergeno ? [p.alergeno] : []))),
  );
  protected readonly intolerancias = computed(
    () => new Set(this.lista().flatMap((p) => (p.tipo === 'INTOLERANCIA' && p.intolerancia ? [p.intolerancia] : []))),
  );
  protected readonly dietas = computed(
    () => new Set(this.lista().flatMap((p) => (p.tipo === 'DIETA' && p.dieta ? [p.dieta] : []))),
  );
  /** Textos propios (sin código) de alergias e intolerancias; «Frutas» tiene tarjeta y no sale aquí. */
  protected readonly alergiasPropias = computed(() => this.detalles('ALERGIA').filter((d) => !esDetalleFijo(d)));
  protected readonly intoleranciasPropias = computed(() => this.detalles('INTOLERANCIA'));
  protected readonly detalleDieta = computed(
    () => this.lista().find((p) => p.tipo === 'DIETA' && p.dieta === 'PERSONALIZADA')?.detalle ?? '',
  );

  /** Contadores de cada apartado. */
  protected readonly numAlergias = computed(
    () => this.opcionesAlergia.filter((o) => this.alergiaMarcada(o)).length + this.alergiasPropias().length,
  );
  protected readonly numIntolerancias = computed(() => this.intolerancias().size + this.intoleranciasPropias().length);
  protected readonly hayDietaSinFiltro = computed(() => [...this.dietas()].some((d) => DIETAS_SIN_FILTRO.includes(d)));

  /** «Otras alergias» / «Otras» intolerancias abiertos: al pulsarlos o si ya hay algo en ellos. */
  protected readonly otrasAbiertas = signal(false);
  protected readonly mostrarOtras = computed(() => this.otrasAbiertas() || this.alergiasPropias().length > 0);
  protected readonly otrasIntoleranciasAbiertas = signal(false);
  protected readonly mostrarOtrasIntolerancias = computed(
    () => this.otrasIntoleranciasAbiertas() || this.intoleranciasPropias().length > 0,
  );

  /** Alergias e intolerancias que se pueden filtrar, con su severidad, para los conmutadores. */
  protected readonly restricciones = computed(() =>
    this.lista()
      .filter(
        (p) =>
          (p.tipo === 'ALERGIA' && p.alergeno) ||
          (p.tipo === 'INTOLERANCIA' && p.intolerancia && INTOLERANCIAS_FILTRABLES.includes(p.intolerancia)),
      )
      .map((p) => ({
        preferencia: p,
        nombre: p.alergeno
          ? ETIQUETAS_ALERGENO[p.alergeno]
          : `${ETIQUETAS_INTOLERANCIA[p.intolerancia as Intolerancia]} (intolerancia)`,
      })),
  );

  /** Nombres de los alimentos elegidos en esta sesión (el DTO solo guarda el id). */
  private readonly nombres = signal<Record<string, string>>({});
  protected readonly rechazos = computed<Rechazo[]>(() =>
    this.lista()
      .filter((p) => p.tipo === 'RECHAZO' && p.alimentoId)
      .map((p) => ({ alimentoId: p.alimentoId!, nombre: this.nombres()[p.alimentoId!] ?? 'Alimento' })),
  );

  // ---- Combobox de alimentos (ns-combobox)
  protected readonly idCombo = idUnico('ns-combo');

  /** Búsqueda para ns-combobox, sin los alimentos que ya están rechazados. */
  protected readonly buscarAlimentos = (texto: string): Observable<AlimentoResumenResponse[]> =>
    this.alimentos.buscar(texto, { size: 8 }).pipe(
      map((pagina) => {
        const elegidos = new Set(this.rechazos().map((r) => r.alimentoId));
        return pagina.content.filter((a) => !elegidos.has(a.id));
      }),
    );

  override writeValue(valor: PreferenciaDto[] | null): void {
    super.writeValue(Array.isArray(valor) ? [...valor] : []);
  }

  // ---- Alergias

  protected alergiaMarcada(opcion: OpcionAlergia): boolean {
    if (opcion.detalle) return this.detalles('ALERGIA').some((d) => igual(d, opcion.detalle!));
    return opcion.alergenos.some((a) => this.alergenos().has(a));
  }

  protected alternarAlergia(opcion: OpcionAlergia): void {
    if (opcion.detalle) {
      this.alternarDetalle('ALERGIA', opcion.detalle);
      return;
    }
    const quitar = this.alergiaMarcada(opcion);
    const sin = this.lista().filter(
      (p) => !(p.tipo === 'ALERGIA' && p.alergeno && opcion.alergenos.includes(p.alergeno)),
    );
    const nuevas = opcion.alergenos.map((alergeno): PreferenciaDto => ({
      tipo: 'ALERGIA',
      alergeno,
      severidad: 'ESTRICTA',
    }));
    this.actualizar(quitar ? sin : [...sin, ...nuevas]);
  }

  // ---- Intolerancias

  protected alternarIntolerancia(intolerancia: Intolerancia): void {
    const marcada = this.intolerancias().has(intolerancia);
    const sin = this.lista().filter((p) => !(p.tipo === 'INTOLERANCIA' && p.intolerancia === intolerancia));
    const nueva: PreferenciaDto = {
      tipo: 'INTOLERANCIA',
      intolerancia,
      severidad: severidadInicial(INTOLERANCIAS_FILTRABLES.includes(intolerancia)),
    };
    this.actualizar(marcada ? sin : [...sin, nueva]);
  }

  // ---- Dietas

  protected dietaMarcada(dieta: Dieta | null): boolean {
    return dieta === null ? this.dietas().size === 0 : this.dietas().has(dieta);
  }

  /** «Sin restricciones» quita todas las dietas; el resto se marcan y desmarcan (se pueden combinar). */
  protected alternarDieta(dieta: Dieta | null): void {
    const sin = this.lista().filter((p) => p.tipo !== 'DIETA' || (dieta !== null && p.dieta !== dieta));
    if (dieta === null || this.dietas().has(dieta)) {
      this.actualizar(sin);
      return;
    }
    this.actualizar([...sin, { tipo: 'DIETA', dieta, severidad: severidadInicial(DIETAS_FILTRABLES.includes(dieta)) }]);
  }

  protected cambiarDetalleDieta(texto: string): void {
    const detalle = texto.slice(0, MAX_DETALLE);
    this.actualizar(
      this.lista().map((p) =>
        p.tipo === 'DIETA' && p.dieta === 'PERSONALIZADA' ? { ...p, detalle: detalle.trim() ? detalle : undefined } : p,
      ),
    );
  }

  // ---- Textos propios (alergias e intolerancias que no están en la lista)

  protected anadirPropia(tipo: 'ALERGIA' | 'INTOLERANCIA', campo: HTMLInputElement): void {
    const texto = campo.value.trim().slice(0, MAX_DETALLE);
    campo.value = '';
    if (!texto || this.detalles(tipo).some((d) => igual(d, texto))) return;
    this.actualizar([...this.lista(), { tipo, detalle: texto, severidad: 'PREFERENCIA' }]);
  }

  protected quitarPropia(tipo: 'ALERGIA' | 'INTOLERANCIA', detalle: string): void {
    this.actualizar(
      this.lista().filter((p) => !(p.tipo === tipo && !p.alergeno && !p.intolerancia && p.detalle === detalle)),
    );
  }

  private alternarDetalle(tipo: 'ALERGIA' | 'INTOLERANCIA', detalle: string): void {
    const existe = this.detalles(tipo).some((d) => igual(d, detalle));
    this.actualizar(
      existe
        ? this.lista().filter(
            (p) => !(p.tipo === tipo && !p.alergeno && !p.intolerancia && p.detalle && igual(p.detalle, detalle)),
          )
        : [...this.lista(), { tipo, detalle, severidad: 'PREFERENCIA' }],
    );
  }

  /** Textos de las preferencias sin código de ese tipo. */
  private detalles(tipo: 'ALERGIA' | 'INTOLERANCIA'): string[] {
    return this.lista()
      .filter((p) => p.tipo === tipo && !p.alergeno && !p.intolerancia && p.detalle)
      .map((p) => p.detalle!);
  }

  protected cambiarSeveridad(preferencia: PreferenciaDto, severidad: Severidad | null): void {
    if (!severidad) return;
    this.actualizar(this.lista().map((p) => (p === preferencia ? { ...p, severidad } : p)));
  }

  protected quitarRechazo(alimentoId: string): void {
    this.actualizar(this.lista().filter((p) => !(p.tipo === 'RECHAZO' && p.alimentoId === alimentoId)));
  }

  // ---- Combobox

  protected elegir(alimento: AlimentoResumenResponse): void {
    this.nombres.update((n) => ({ ...n, [alimento.id]: nombreAlimento(alimento) }));
    if (!this.rechazos().some((r) => r.alimentoId === alimento.id)) {
      this.actualizar([...this.lista(), { tipo: 'RECHAZO', alimentoId: alimento.id, severidad: 'PREFERENCIA' }]);
    }
  }

  protected nombreAlimento = nombreAlimento;

  private actualizar(lista: PreferenciaDto[]): void {
    this.emitir(lista);
    this.tocar();
  }
}

function nombreAlimento(alimento: AlimentoResumenResponse): string {
  return alimento.marca ? `${alimento.nombre} (${alimento.marca})` : alimento.nombre;
}

/** Comparación de textos sin mayúsculas ni tildes. */
function igual(a: string, b: string): boolean {
  const normalizar = (t: string) => t.trim().toLocaleLowerCase('es-ES').normalize('NFD').replace(/[̀-ͯ]/g, '');
  return normalizar(a) === normalizar(b);
}

/** Si el texto es el de una tarjeta fija («Frutas»). */
function esDetalleFijo(detalle: string): boolean {
  return OPCIONES_ALERGIA.some((o) => !!o.detalle && igual(o.detalle, detalle));
}

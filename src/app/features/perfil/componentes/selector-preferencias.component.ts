import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  forwardRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { Subject, catchError, debounceTime, distinctUntilChanged, map, of, switchMap, tap } from 'rxjs';

import type { Alergeno, AlimentoResumenResponse, Dieta, PreferenciaDto, Severidad } from '@core/models';
import { ETIQUETAS_ALERGENO, ETIQUETAS_DIETA, ETIQUETAS_SEVERIDAD } from '@core/models/etiquetas';
import { AlimentosService, MIN_CARACTERES_BUSQUEDA } from '@core/services/alimentos.service';
import { NsChipGroupComponent } from '@shared/ui/form/chip-group.component';
import { NsControlCampo, idUnico } from '@shared/ui/form/control-campo';
import { NsControlValor, type NsOpcion } from '@shared/ui/form/control-valor';
import { NsSegmentedComponent } from '@shared/ui/form/segmented.component';

/** Retraso de la búsqueda de alimentos mientras se escribe. */
export const DEBOUNCE_BUSQUEDA_MS = 250;

const ALERGENOS = Object.keys(ETIQUETAS_ALERGENO) as Alergeno[];
const DIETAS = Object.keys(ETIQUETAS_DIETA) as Dieta[];

/** Dietas que se guardan pero no se filtran automáticamente (NutriSport_API.md §10). */
export const DIETAS_SIN_FILTRO: readonly Dieta[] = ['HALAL', 'KOSHER'];

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
 * - Alérgenos (los 14): ALERGIA + alergeno, ESTRICTA por defecto y conmutable a PREFERENCIA.
 * - Intolerancia a la lactosa: INTOLERANCIA + intolerancia LACTOSA (también conmutable).
 * - Dietas: DIETA + dieta, ESTRICTA. Halal y kosher no se filtran automáticamente.
 * - Alimentos que no le gustan: combobox con AlimentosService.buscar (250 ms) → RECHAZO +
 *   alimentoId, PREFERENCIA.
 *
 * Cada tipo lleva solo el campo que exige (PUT /perfil/preferencias). Lo que no entiende (p. ej.
 * FAVORITO o un rechazo de categoría) lo conserva tal cual.
 */
@Component({
  selector: 'app-selector-preferencias',
  imports: [FormsModule, LucideDynamicIcon, NsChipGroupComponent, NsSegmentedComponent],
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

  protected readonly opcionesAlergenos: NsOpcion<Alergeno>[] = ALERGENOS.map((valor) => ({
    valor,
    etiqueta: ETIQUETAS_ALERGENO[valor],
  }));
  protected readonly opcionesLactosa: NsOpcion<'LACTOSA'>[] = [{ valor: 'LACTOSA', etiqueta: 'Lactosa' }];
  protected readonly opcionesDietas: NsOpcion<Dieta>[] = DIETAS.map((valor) => ({
    valor,
    etiqueta: ETIQUETAS_DIETA[valor] + (DIETAS_SIN_FILTRO.includes(valor) ? '*' : ''),
  }));
  protected readonly opcionesSeveridad: NsOpcion<Severidad>[] = [
    { valor: 'ESTRICTA', etiqueta: ETIQUETAS_SEVERIDAD.ESTRICTA },
    { valor: 'PREFERENCIA', etiqueta: ETIQUETAS_SEVERIDAD.PREFERENCIA },
  ];

  /** Lista actual (el valor del control). */
  protected readonly lista = computed(() => this.valor() ?? []);

  protected readonly alergenos = computed(() =>
    this.lista()
      .filter((p) => p.tipo === 'ALERGIA' && p.alergeno)
      .map((p) => p.alergeno!),
  );
  protected readonly lactosa = computed(() =>
    this.lista().some((p) => p.tipo === 'INTOLERANCIA' && p.intolerancia === 'LACTOSA') ? ['LACTOSA' as const] : [],
  );
  protected readonly dietas = computed(() =>
    this.lista()
      .filter((p) => p.tipo === 'DIETA' && p.dieta)
      .map((p) => p.dieta!),
  );
  protected readonly hayDietaSinFiltro = computed(() => this.dietas().some((d) => DIETAS_SIN_FILTRO.includes(d)));

  /** Alergias e intolerancias marcadas, con su severidad, para los conmutadores. */
  protected readonly restricciones = computed(() =>
    this.lista()
      .filter((p) => (p.tipo === 'ALERGIA' && p.alergeno) || (p.tipo === 'INTOLERANCIA' && p.intolerancia))
      .map((p) => ({
        preferencia: p,
        nombre: p.alergeno ? ETIQUETAS_ALERGENO[p.alergeno] : 'Lactosa (intolerancia)',
      })),
  );

  /** Nombres de los alimentos elegidos en esta sesión (el DTO solo guarda el id). */
  private readonly nombres = signal<Record<string, string>>({});
  protected readonly rechazos = computed<Rechazo[]>(() =>
    this.lista()
      .filter((p) => p.tipo === 'RECHAZO' && p.alimentoId)
      .map((p) => ({ alimentoId: p.alimentoId!, nombre: this.nombres()[p.alimentoId!] ?? 'Alimento' })),
  );

  // ---- Combobox de alimentos
  protected readonly idCombo = idUnico('ns-combo');
  protected readonly idLista = `${this.idCombo}-lista`;
  protected readonly consulta = signal('');
  protected readonly resultados = signal<AlimentoResumenResponse[]>([]);
  protected readonly buscando = signal(false);
  protected readonly errorBusqueda = signal(false);
  protected readonly abierto = signal(false);
  protected readonly activo = signal(-1);
  private readonly busquedas = new Subject<string>();

  /** Resultados sin los ya rechazados. */
  protected readonly opcionesCombo = computed(() => {
    const elegidos = new Set(this.rechazos().map((r) => r.alimentoId));
    return this.resultados().filter((a) => !elegidos.has(a.id));
  });

  protected readonly estadoBusqueda = computed(() => {
    if (this.consulta().trim().length < MIN_CARACTERES_BUSQUEDA) return '';
    if (this.buscando()) return 'Buscando…';
    if (this.errorBusqueda()) return 'No hemos podido buscar. Inténtalo de nuevo.';
    const n = this.opcionesCombo().length;
    return n === 0 ? 'Sin resultados' : n === 1 ? '1 resultado' : `${n} resultados`;
  });

  constructor() {
    super();
    this.busquedas
      .pipe(
        map((texto) => texto.trim()),
        debounceTime(DEBOUNCE_BUSQUEDA_MS),
        distinctUntilChanged(),
        tap(() => this.errorBusqueda.set(false)),
        switchMap((texto) => {
          if (texto.length < MIN_CARACTERES_BUSQUEDA) return of([]);
          this.buscando.set(true);
          return this.alimentos.buscar(texto, { size: 8 }).pipe(
            map((pagina) => pagina.content),
            catchError(() => {
              this.errorBusqueda.set(true);
              return of([]);
            }),
          );
        }),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((resultados) => {
        this.buscando.set(false);
        this.resultados.set(resultados);
        this.activo.set(resultados.length ? 0 : -1);
      });
  }

  override writeValue(valor: PreferenciaDto[] | null): void {
    super.writeValue(Array.isArray(valor) ? [...valor] : []);
  }

  // ---- Cambios desde los chips y conmutadores

  protected cambiarAlergenos(seleccion: Alergeno[] | Alergeno | null): void {
    const nuevos = new Set(Array.isArray(seleccion) ? seleccion : []);
    const actuales = new Map(
      this.lista()
        .filter((p) => p.tipo === 'ALERGIA')
        .map((p) => [p.alergeno, p]),
    );
    const resto = this.lista().filter((p) => p.tipo !== 'ALERGIA');
    const alergias = ALERGENOS.filter((a) => nuevos.has(a)).map(
      (a): PreferenciaDto => actuales.get(a) ?? { tipo: 'ALERGIA', alergeno: a, severidad: 'ESTRICTA' },
    );
    this.actualizar([...alergias, ...resto]);
  }

  protected cambiarLactosa(seleccion: 'LACTOSA'[] | 'LACTOSA' | null): void {
    const marcada = Array.isArray(seleccion) && seleccion.includes('LACTOSA');
    const actual = this.lista().find((p) => p.tipo === 'INTOLERANCIA' && p.intolerancia === 'LACTOSA');
    const resto = this.lista().filter((p) => !(p.tipo === 'INTOLERANCIA' && p.intolerancia === 'LACTOSA'));
    this.actualizar(
      marcada ? [...resto, actual ?? { tipo: 'INTOLERANCIA', intolerancia: 'LACTOSA', severidad: 'ESTRICTA' }] : resto,
    );
  }

  protected cambiarDietas(seleccion: Dieta[] | Dieta | null): void {
    const nuevas = new Set(Array.isArray(seleccion) ? seleccion : []);
    const resto = this.lista().filter((p) => p.tipo !== 'DIETA');
    const dietas = DIETAS.filter((d) => nuevas.has(d)).map((dieta): PreferenciaDto => ({
      tipo: 'DIETA',
      dieta,
      severidad: 'ESTRICTA',
    }));
    this.actualizar([...resto, ...dietas]);
  }

  protected cambiarSeveridad(preferencia: PreferenciaDto, severidad: Severidad | null): void {
    if (!severidad) return;
    this.actualizar(this.lista().map((p) => (p === preferencia ? { ...p, severidad } : p)));
  }

  protected quitarRechazo(alimentoId: string): void {
    this.actualizar(this.lista().filter((p) => !(p.tipo === 'RECHAZO' && p.alimentoId === alimentoId)));
  }

  // ---- Combobox

  protected alEscribir(evento: Event): void {
    const texto = (evento.target as HTMLInputElement).value;
    this.consulta.set(texto);
    this.abierto.set(true);
    if (texto.trim().length < MIN_CARACTERES_BUSQUEDA) {
      this.resultados.set([]);
      this.buscando.set(false);
    }
    this.busquedas.next(texto);
  }

  protected alTeclear(evento: KeyboardEvent): void {
    const opciones = this.opcionesCombo();
    switch (evento.key) {
      case 'ArrowDown':
        evento.preventDefault();
        this.abierto.set(true);
        if (opciones.length) this.activo.set((this.activo() + 1) % opciones.length);
        break;
      case 'ArrowUp':
        evento.preventDefault();
        if (opciones.length) this.activo.set((this.activo() - 1 + opciones.length) % opciones.length);
        break;
      case 'Enter':
        if (this.abierto() && this.activo() >= 0 && opciones[this.activo()]) {
          evento.preventDefault();
          this.elegir(opciones[this.activo()]);
        }
        break;
      case 'Escape':
        if (this.abierto()) {
          evento.preventDefault();
          this.abierto.set(false);
        }
        break;
    }
  }

  protected alSalir(): void {
    this.tocar();
    // Deja terminar el clic en una opción antes de cerrar la lista.
    setTimeout(() => this.abierto.set(false), 150);
  }

  protected elegir(alimento: AlimentoResumenResponse): void {
    this.nombres.update((n) => ({ ...n, [alimento.id]: nombreAlimento(alimento) }));
    if (!this.rechazos().some((r) => r.alimentoId === alimento.id)) {
      this.actualizar([...this.lista(), { tipo: 'RECHAZO', alimentoId: alimento.id, severidad: 'PREFERENCIA' }]);
    }
    this.consulta.set('');
    this.resultados.set([]);
    this.activo.set(-1);
    this.abierto.set(false);
    this.busquedas.next('');
  }

  protected idOpcion(indice: number): string {
    return `${this.idCombo}-op-${indice}`;
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

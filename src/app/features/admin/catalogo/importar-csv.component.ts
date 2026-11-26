import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import type { FuenteAlimento, ResultadoImportacion } from '@core/models';
import { ETIQUETAS_FUENTE_ALIMENTO } from '@core/models/etiquetas';
import {
  AdminCatalogoService,
  FUENTES_CATALOGO,
  MAX_FILAS_IMPORTACION,
} from '@core/services/admin/admin-catalogo.service';
import { aApiError } from '@core/util/api-error';
import { formatearNumero } from '@shared/pipes/formato';
import { NsButtonComponent } from '@shared/ui/button/button.component';
import { NsMetricComponent } from '@shared/ui/data/metric.component';
import { NsColumna, NsTableComponent } from '@shared/ui/data/table.component';
import { NsAlertComponent } from '@shared/ui/feedback/alert.component';
import { idUnico } from '@shared/ui/form/control-campo';
import type { NsOpcion } from '@shared/ui/form/control-valor';
import { NsFormFieldComponent } from '@shared/ui/form/form-field.component';
import { NsInputDirective } from '@shared/ui/form/input.directive';
import { NsSelectComponent } from '@shared/ui/form/select.component';
import { DialogShellComponent } from '@shared/ui/overlay/dialog-shell.component';
import { BYTES_VISTA_PREVIA, VistaPreviaCsv, leerInicio, previsualizarCsv, validarCsv } from './csv';

/** Filas que se previsualizan. */
const FILAS_VISTA_PREVIA = 5;
/** Longitud máxima de la referencia (p. ej. la versión de BEDCA). */
const MAX_REFERENCIA = 100;

/**
 * Importación de alimentos desde CSV (docs/api/admin.md §7.7), en un diálogo:
 * 1. Elegir el fichero (.csv, máx. 10 MB), la fuente y una referencia opcional ("2024").
 * 2. Vista previa de las 5 primeras filas, leídas con FileReader solo para mostrarlas: el que
 *    valida (cabecera, columnas, valores) es el servidor.
 * 3. POST /admin/alimentos/importar y el ResultadoImportacion: creados, actualizados y los errores
 *    por fila (esas filas no se importan).
 *
 * Se cierra con el resultado si se llegó a importar (para recargar la lista); sin valor si se cancela.
 *
 *   this.dialogos.open<ImportarCsvComponent, ResultadoImportacion>(ImportarCsvComponent, {
 *     titulo: 'Importar alimentos desde CSV', size: 'lg' });
 */
@Component({
  selector: 'app-importar-csv',
  imports: [
    DialogShellComponent,
    ReactiveFormsModule,
    NsAlertComponent,
    NsButtonComponent,
    NsFormFieldComponent,
    NsInputDirective,
    NsMetricComponent,
    NsSelectComponent,
    NsTableComponent,
  ],
  templateUrl: './importar-csv.component.html',
  styleUrl: './importar-csv.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportarCsvComponent {
  protected readonly ref = inject<DialogRef<ResultadoImportacion>>(DialogRef);
  private readonly catalogo = inject(AdminCatalogoService);

  protected readonly idFormulario = idUnico('ns-importar-csv');
  protected readonly idFichero = idUnico('ns-importar-fichero');
  protected readonly maxFilas = formatearNumero(MAX_FILAS_IMPORTACION, 0);
  protected readonly maxReferencia = MAX_REFERENCIA;

  protected readonly form = new FormGroup({
    fuente: new FormControl<FuenteAlimento>('BEDCA', { nonNullable: true, validators: Validators.required }),
    referencia: new FormControl('', { nonNullable: true, validators: Validators.maxLength(MAX_REFERENCIA) }),
  });
  protected readonly fuentes: NsOpcion<FuenteAlimento>[] = FUENTES_CATALOGO.map((valor) => ({
    valor,
    etiqueta: ETIQUETAS_FUENTE_ALIMENTO[valor],
  }));

  // ---- Fichero y vista previa
  protected readonly archivo = signal<File | null>(null);
  protected readonly errorArchivo = signal<string | null>(null);
  protected readonly vistaPrevia = signal<VistaPreviaCsv | null>(null);
  protected readonly leyendo = signal(false);
  protected readonly tamano = computed(() => {
    const bytes = this.archivo()?.size ?? 0;
    return bytes < 1024 * 1024
      ? `${formatearNumero(bytes / 1024, 0)} kB`
      : `${formatearNumero(bytes / 1024 / 1024, 1)} MB`;
  });
  protected readonly columnasVista = computed<NsColumna[]>(() =>
    (this.vistaPrevia()?.cabecera ?? []).map((titulo, i) => ({ clave: `c${i}`, titulo: titulo || `Columna ${i + 1}` })),
  );
  protected readonly filasVista = computed(() =>
    (this.vistaPrevia()?.filas ?? []).map((fila, indice) =>
      Object.fromEntries([['id', indice], ...fila.map((valor, i) => [`c${i}`, valor])]),
    ),
  );

  // ---- Importación
  protected readonly importando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly resultado = signal<ResultadoImportacion | null>(null);
  protected readonly columnasErrores: NsColumna[] = [
    { clave: 'campo', titulo: 'Fila', ancho: '8rem' },
    { clave: 'mensaje', titulo: 'Error' },
  ];
  protected readonly filasErrores = computed(() =>
    (this.resultado()?.errores ?? []).map((e, i) => ({ id: i, campo: e.campo, mensaje: e.mensaje })),
  );

  protected async alElegir(evento: Event): Promise<void> {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    this.vistaPrevia.set(null);
    this.error.set(null);
    this.archivo.set(null);
    if (!archivo) {
      this.errorArchivo.set(null);
      return;
    }
    const problema = validarCsv(archivo);
    this.errorArchivo.set(problema);
    if (problema) {
      input.value = '';
      return;
    }
    this.archivo.set(archivo);
    this.leyendo.set(true);
    try {
      const texto = await leerInicio(archivo);
      // Si solo se ha leído un trozo, la última línea puede estar cortada.
      this.vistaPrevia.set(previsualizarCsv(texto, FILAS_VISTA_PREVIA, archivo.size > BYTES_VISTA_PREVIA));
    } catch {
      // Sin vista previa se puede importar igual: el servidor dirá si el fichero es válido.
      this.vistaPrevia.set(null);
    } finally {
      this.leyendo.set(false);
    }
  }

  protected async importar(): Promise<void> {
    const archivo = this.archivo();
    if (this.importando()) return;
    if (!archivo) {
      this.errorArchivo.set('Elige un fichero CSV.');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { fuente, referencia } = this.form.getRawValue();
    this.importando.set(true);
    this.error.set(null);
    try {
      this.resultado.set(await firstValueFrom(this.catalogo.importar(archivo, fuente, referencia)));
    } catch (e) {
      // 400 (sin cabecera o falta alguna columna), 413 (demasiado grande)… el detail lo explica.
      this.error.set(aApiError(e).detalle);
    } finally {
      this.importando.set(false);
    }
  }

  protected cerrar(): void {
    this.ref.close(this.resultado() ?? undefined);
  }
}

import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { FormArray, FormGroup } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { provideLucideIcons } from '@lucide/angular';
import { of, throwError } from 'rxjs';

import type {
  AlimentoResponse,
  BusquedaRecetasResponse,
  CategoriaResponse,
  RecetaResponse,
  RecetaResumenResponse,
} from '@core/models';
import { AdminCatalogoService } from '@core/services/admin/admin-catalogo.service';
import { AdminRecetasService } from '@core/services/admin/admin-recetas.service';
import { CategoriasService } from '@core/services/categorias.service';
import { RecetasService } from '@core/services/recetas.service';
import { ApiError } from '@core/util/api-error';
import { ICONOS_APP } from '@shared/design/iconos';
import { NsToastService } from '@shared/ui/feedback/toast.service';
import { NsConfirmService } from '@shared/ui/overlay/confirm.service';
import { NsDialogService } from '@shared/ui/overlay/dialog.service';
import { type PublicacionRecetaData, PublicacionRecetaDialogComponent } from './publicacion-receta-dialog.component';
import { RecetaAdminFormComponent } from './receta-admin-form.component';
import { RecetasAdminComponent, RecetasSesionAdmin } from './recetas-admin.component';
import { type RecetaForm, aRecetaAdminRequest, desdeReceta, mover } from './recetas-admin';

// ---- Datos

const CATEGORIAS: CategoriaResponse[] = [
  { id: 'c1', nombre: 'Desayunos', tipo: 'RECETA', padreId: null, orden: 0 } as CategoriaResponse,
  { id: 'c2', nombre: 'Platos principales', tipo: 'RECETA', padreId: null, orden: 1 } as CategoriaResponse,
];

function receta(cambios: Partial<RecetaResponse> = {}): RecetaResponse {
  return {
    id: 'r1',
    origen: 'PROPIA',
    nombre: 'Gachas de avena',
    descripcion: 'Rápidas',
    idioma: 'es',
    categoria: 'Desayunos',
    area: null,
    imagenUrl: null,
    raciones: 2,
    racionesSupuestas: false,
    tiempoPreparacionMin: 10,
    dificultad: 'FACIL',
    franjasAptas: ['MERIENDA', 'DESAYUNO'],
    etiquetas: ['Rápida'],
    ingredientes: [
      {
        nombre: 'Avena',
        nombreOriginal: null,
        medidaOriginal: null,
        gramos: 80,
        estadoConversion: 'EXACTA',
        alimentoId: 'a1',
      },
      {
        nombre: 'Canela',
        nombreOriginal: null,
        medidaOriginal: '1 pizca',
        gramos: 1,
        estadoConversion: 'ESTIMADA',
        alimentoId: 'a2',
      },
    ],
    instrucciones: [
      { orden: 2, texto: 'Servir' },
      { orden: 1, texto: 'Cocer la avena' },
    ],
    nutricionRacion: null,
    estadoNutricional: 'COMPLETO',
    completitudPct: 100,
    alergenos: [],
    alergenosVerificados: true,
    compatible: true,
    favorita: false,
    fuente: null,
    ...cambios,
  };
}

function resumen(cambios: Partial<RecetaResumenResponse> = {}): RecetaResumenResponse {
  return {
    id: 'r1',
    referenciaExterna: null,
    origen: 'PROPIA',
    nombre: 'Gachas de avena',
    categoria: 'Desayunos',
    area: null,
    imagenUrl: null,
    nutricionRacion: null,
    estadoNutricional: 'COMPLETO',
    alergenosVerificados: true,
    compatible: true,
    favorita: false,
    fuente: null,
    ...cambios,
  };
}

function busqueda(content: RecetaResumenResponse[], themealdb: RecetaResumenResponse[] = []): BusquedaRecetasResponse {
  return {
    catalogo: { content, page: 0, size: 20, totalElements: content.length, totalPages: 1 },
    themealdb,
    themealdbDisponible: true,
  };
}

const AVENA = { id: 'a1', nombre: 'Avena', marca: null } as unknown as AlimentoResponse;

// ---- Funciones

describe('recetas-admin · funciones', () => {
  it('aRecetaAdminRequest envía exactamente RecetaAdminRequest (opcionales solo con valor)', () => {
    const v: RecetaForm = {
      nombre: '  Gachas ',
      descripcion: '  ',
      categoriaId: 'c1',
      raciones: 2,
      tiempoPreparacionMin: null,
      dificultad: null,
      franjasAptas: ['CENA', 'DESAYUNO'],
      etiquetas: [' Rápida ', ''],
      pasos: [' Cocer ', '   '],
      ingredientes: [
        { alimentoId: 'a1', alimentoNombre: 'Avena', modo: 'gramos', gramos: 80, medida: 'no se envía' },
        { alimentoId: 'a2', alimentoNombre: 'Canela', modo: 'medida', gramos: 5, medida: ' 1 pizca ' },
      ],
    };
    expect(aRecetaAdminRequest(v)).toEqual({
      nombre: 'Gachas',
      categoriaId: 'c1',
      raciones: 2,
      franjasAptas: ['DESAYUNO', 'CENA'],
      etiquetas: ['Rápida'],
      pasos: ['Cocer'],
      ingredientes: [
        { alimentoId: 'a1', gramos: 80 },
        { alimentoId: 'a2', medida: '1 pizca' },
      ],
    });
  });

  it('desdeReceta: categoría por nombre, pasos en orden y medida o gramos', () => {
    const v = desdeReceta(receta(), CATEGORIAS);
    expect(v.categoriaId).toBe('c1');
    expect(v.franjasAptas).toEqual(['DESAYUNO', 'MERIENDA']);
    expect(v.pasos).toEqual(['Cocer la avena', 'Servir']);
    expect(v.ingredientes.map((i) => [i.modo, i.gramos, i.medida])).toEqual([
      ['gramos', 80, ''],
      ['medida', 1, '1 pizca'],
    ]);
    expect(desdeReceta(receta({ categoria: 'Otra' }), CATEGORIAS).categoriaId).toBeNull();
  });

  it('mover reordena sin tocar el original', () => {
    const lista = ['a', 'b', 'c'];
    expect(mover(lista, 2, 0)).toEqual(['c', 'a', 'b']);
    expect(mover(lista, 0, 5)).toEqual(lista);
    expect(lista).toEqual(['a', 'b', 'c']);
  });
});

// ---- Formulario

describe('RecetaAdminFormComponent', () => {
  let fixture: ComponentFixture<RecetaAdminFormComponent>;
  let raiz: HTMLElement;
  const admin = { crear: vi.fn(), editar: vi.fn() };
  const recetas = { detalle: vi.fn() };

  beforeEach(() => {
    admin.crear.mockReset();
    admin.editar.mockReset();
    recetas.detalle.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideLucideIcons(...ICONOS_APP),
        { provide: AdminRecetasService, useValue: admin },
        { provide: RecetasService, useValue: recetas },
        { provide: CategoriasService, useValue: { listar: () => of(CATEGORIAS) } },
        { provide: AdminCatalogoService, useValue: { alimentos: () => of({ content: [AVENA] }) } },
      ],
    });
  });

  async function crear(recetaId: string | null = null): Promise<void> {
    fixture = TestBed.createComponent(RecetaAdminFormComponent);
    fixture.componentRef.setInput('recetaId', recetaId);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    raiz = fixture.nativeElement as HTMLElement;
  }

  type Interno = {
    form: FormGroup;
    elegirAlimento(fila: unknown, a: AlimentoResponse): void;
    ingredientes: FormArray;
    guardar(): Promise<void>;
  };
  const interno = () => fixture.componentInstance as unknown as Interno;

  it('al crear empieza con un ingrediente y no envía si falta lo obligatorio', async () => {
    await crear();
    expect(raiz.querySelectorAll('.ns-raf__ingrediente').length).toBe(1);
    await interno().guardar();
    fixture.detectChanges();
    expect(admin.crear).not.toHaveBeenCalled();
    expect(raiz.textContent).toContain('Revisa los campos marcados.');
    expect(raiz.textContent).toContain('Elige un alimento del catálogo.');
  });

  it('crea la receta con exactamente RecetaAdminRequest y emite la respuesta', async () => {
    admin.crear.mockReturnValue(of(receta()));
    await crear();
    const emitidas: RecetaResponse[] = [];
    fixture.componentInstance.guardado.subscribe((r) => emitidas.push(r));
    const i = interno();
    i.form.patchValue({ nombre: 'Gachas', categoriaId: 'c1', raciones: 2 });
    i.elegirAlimento(i.ingredientes.at(0), AVENA);
    i.ingredientes.at(0).patchValue({ gramos: 80 });
    await i.guardar();
    expect(admin.crear).toHaveBeenCalledWith({
      nombre: 'Gachas',
      categoriaId: 'c1',
      raciones: 2,
      ingredientes: [{ alimentoId: 'a1', gramos: 80 }],
    });
    expect(emitidas).toEqual([receta()]);
  });

  it('al editar carga la receta, rellena el formulario y hace PUT', async () => {
    recetas.detalle.mockReturnValue(of(receta()));
    admin.editar.mockReturnValue(of(receta()));
    await crear('r1');
    expect(recetas.detalle).toHaveBeenCalledWith('r1');
    expect(raiz.querySelectorAll('.ns-raf__ingrediente').length).toBe(2);
    expect(raiz.textContent).toContain('Avena');
    expect(raiz.querySelectorAll('.ns-raf__paso').length).toBe(2);
    await interno().guardar();
    expect(admin.editar).toHaveBeenCalledWith(
      'r1',
      expect.objectContaining({
        nombre: 'Gachas de avena',
        categoriaId: 'c1',
        pasos: ['Cocer la avena', 'Servir'],
        ingredientes: [
          { alimentoId: 'a1', gramos: 80 },
          { alimentoId: 'a2', medida: '1 pizca' },
        ],
      }),
    );
  });

  it('los pasos se reordenan con ↑ ↓', async () => {
    recetas.detalle.mockReturnValue(of(receta()));
    await crear('r1');
    (raiz.querySelector('button[aria-label="Subir el paso 2"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(
      (fixture.componentInstance as unknown as { pasos: { getRawValue(): string[] } }).pasos.getRawValue(),
    ).toEqual(['Servir', 'Cocer la avena']);
  });
});

// ---- Publicación

describe('PublicacionRecetaDialogComponent', () => {
  let fixture: ComponentFixture<PublicacionRecetaDialogComponent>;
  let raiz: HTMLElement;
  const publicacion = vi.fn();
  const cerrar = vi.fn();

  beforeEach(() => {
    publicacion.mockReset();
    cerrar.mockReset();
  });

  async function crear(data: PublicacionRecetaData, r = receta()): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideLucideIcons(...ICONOS_APP),
        { provide: AdminRecetasService, useValue: { publicacion } },
        { provide: RecetasService, useValue: { detalle: () => of(r) } },
        { provide: DialogRef, useValue: { close: cerrar, disableClose: false } },
        { provide: DIALOG_DATA, useValue: data },
      ],
    });
    fixture = TestBed.createComponent(PublicacionRecetaDialogComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    raiz = fixture.nativeElement as HTMLElement;
  }
  const enviar = async () => {
    (raiz.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    await fixture.whenStable();
  };

  it('sin elegir nada no envía: la elección es explícita', async () => {
    await crear({ receta: { id: 'r1', nombre: 'Gachas' } });
    expect(raiz.querySelector('[role="radio"][aria-checked="true"]')).toBeNull();
    await enviar();
    expect(publicacion).not.toHaveBeenCalled();
    expect(raiz.textContent).toContain('Elige si la receta queda publicada');
  });

  it('recién creada propone publicarla y solo envía lo que cambia', async () => {
    publicacion.mockReturnValue(of(receta()));
    await crear({ receta: { id: 'r1', nombre: 'Gachas' }, recienCreada: true });
    await enviar();
    expect(publicacion).toHaveBeenCalledWith('r1', { publicada: true });
    expect(cerrar).toHaveBeenCalledWith({ receta: receta(), publicada: true });
  });

  it('con raciones supuestas las envía siempre para fijarlas', async () => {
    publicacion.mockReturnValue(of(receta()));
    await crear({ receta: { id: 'r1', nombre: 'Gachas' } }, receta({ racionesSupuestas: true, raciones: 4 }));
    expect(raiz.textContent).toContain('Ahora son supuestas');
    (raiz.querySelectorAll('[role="radio"]')[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    await enviar();
    expect(publicacion).toHaveBeenCalledWith('r1', { publicada: false, raciones: 4 });
  });
});

// ---- Pestaña

describe('RecetasAdminComponent', () => {
  let fixture: ComponentFixture<RecetasAdminComponent>;
  let raiz: HTMLElement;
  let recetas: { buscar: ReturnType<typeof vi.fn>; abrir: ReturnType<typeof vi.fn>; detalle: ReturnType<typeof vi.fn> };
  let admin: { eliminar: ReturnType<typeof vi.fn> };
  const abrir = vi.fn();
  const confirmar = vi.fn();
  const toast = { exito: vi.fn(), error: vi.fn(), info: vi.fn() };

  beforeEach(async () => {
    abrir.mockReset();
    confirmar.mockReset();
    toast.exito.mockReset();
    toast.error.mockReset();
    recetas = {
      buscar: vi.fn(() =>
        of(
          busqueda(
            [resumen(), resumen({ id: 'r2', origen: 'THEMEALDB', nombre: 'Curry', referenciaExterna: '52772' })],
            [resumen({ id: null, origen: 'THEMEALDB', nombre: 'Tacos', referenciaExterna: '53000' })],
          ),
        ),
      ),
      abrir: vi.fn(() => of('r3')),
      detalle: vi.fn(() => of(receta())),
    };
    admin = { eliminar: vi.fn(() => of(undefined)) };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideLucideIcons(...ICONOS_APP),
        { provide: RecetasService, useValue: recetas },
        { provide: AdminRecetasService, useValue: admin },
        { provide: NsDialogService, useValue: { open: abrir } },
        { provide: NsConfirmService, useValue: { confirmar } },
        { provide: NsToastService, useValue: toast },
      ],
    });
    fixture = TestBed.createComponent(RecetasAdminComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    raiz = fixture.nativeElement as HTMLElement;
  });

  const filas = () => Array.from(raiz.querySelectorAll('tbody tr'));
  const botones = (fila: Element) =>
    Array.from(fila.querySelectorAll('button')).map((b) => b.textContent?.trim().split(/\s/)[0]);

  it('busca con origen todas y pinta catálogo + TheMealDB sin importar', () => {
    expect(recetas.buscar).toHaveBeenCalledWith({ q: '', origen: 'todas', page: 0, size: 20 });
    expect(filas().length).toBe(3);
    expect(filas()[2].textContent).toContain('Sin importar');
  });

  it('Editar y Eliminar solo en las propias', () => {
    expect(botones(filas()[0])).toEqual(['Editar', 'Publicar', 'Eliminar']);
    expect(botones(filas()[1])).toEqual(['Publicar']);
  });

  it('publicar una de TheMealDB sin importar la importa antes y abre el diálogo', async () => {
    abrir.mockReturnValue({ closed: of(undefined) });
    const comp = fixture.componentInstance as unknown as { publicar(r: RecetaResumenResponse): Promise<void> };
    await comp.publicar(resumen({ id: null, origen: 'THEMEALDB', nombre: 'Tacos', referenciaExterna: '53000' }));
    expect(recetas.abrir).toHaveBeenCalled();
    expect(abrir).toHaveBeenCalledWith(
      PublicacionRecetaDialogComponent,
      expect.objectContaining({ data: { receta: { id: 'r3', nombre: 'Tacos' }, recienCreada: false } }),
    );
  });

  it('409 RECETA_PLANIFICADA → "Está en algún menú: despublícala"', async () => {
    confirmar.mockResolvedValue(true);
    admin.eliminar.mockReturnValue(
      throwError(
        () => new ApiError({ status: 409, codigo: 'RECETA_PLANIFICADA', titulo: 'Conflicto', detalle: 'En un menú' }),
      ),
    );
    const comp = fixture.componentInstance as unknown as { eliminar(r: { id: string; nombre: string }): Promise<void> };
    await comp.eliminar({ id: 'r1', nombre: 'Gachas' });
    expect(toast.error).toHaveBeenCalledWith(
      'No se puede eliminar',
      'Está en algún menú: despublícala.',
      expect.objectContaining({ texto: 'Despublicar' }),
    );
  });

  it('al crear una receta la guarda en la sesión y abre su publicación', () => {
    abrir.mockReturnValue({ closed: of({ receta: receta(), publicada: true }) });
    const comp = fixture.componentInstance as unknown as { alGuardar(r: RecetaResponse): void };
    comp.alGuardar(receta());
    fixture.detectChanges();
    expect(abrir).toHaveBeenCalledWith(
      PublicacionRecetaDialogComponent,
      expect.objectContaining({ data: { receta: receta(), recienCreada: true } }),
    );
    const sesion = TestBed.inject(RecetasSesionAdmin).recetas();
    expect(sesion).toEqual([{ receta: receta(), accion: 'creada', publicada: true }]);
    expect(raiz.querySelector('.ns-radm__sesion')?.textContent).toContain('Publicada');
  });
});

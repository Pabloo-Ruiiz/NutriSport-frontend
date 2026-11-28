import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, firstValueFrom, tap } from 'rxjs';

import { environment } from '@env/environment';
import type {
  ObjetivosManualesRequest,
  ObjetivosResponse,
  PerfilRequest,
  PerfilResponse,
  PreferenciaDto,
  PreferenciasRequest,
  TipoComida,
} from '../models';
import { estadoHttp } from '../util/api-error';
import { franjasPorDefecto } from '../util/franjas';

/**
 * Perfil deportivo, preferencias alimentarias y objetivos (NutriSport_API.md §4 y §6 Perfil).
 * Son datos de salud: sin el consentimiento vigente todo responde 403 CONSENTIMIENTO_REVOCADO.
 *
 * Además sabe si el perfil existe, que es lo que necesita perfilGuard: muchos endpoints responden
 * 422 PERFIL_REQUERIDO sin él. Ese dato se cachea en un signal para no repetir GET /perfil en cada
 * navegación; se borra al cerrar la sesión (AuthService llama a limpiar()).
 *
 * Los cuerpos se construyen campo a campo: el backend rechaza propiedades desconocidas (400).
 */
@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/perfil`;

  /** null = aún no se sabe. */
  private readonly existeCache = signal<boolean | null>(null);
  /** Comprobación en curso, compartida entre quienes llamen a existe() a la vez. */
  private comprobacion: Promise<boolean> | null = null;
  /** Sube en limpiar(): una respuesta que llega después no debe rellenar la caché. */
  private generacion = 0;

  /** true/false si ya se sabe si el perfil existe; null si no se ha comprobado. */
  readonly perfilExiste = this.existeCache.asReadonly();

  /** Franjas de comida del perfil (Inicio y Planificador muestran solo estas); null si aún no se conocen. */
  private readonly tiposCache = signal<TipoComida[] | null>(null);
  readonly tiposComida = this.tiposCache.asReadonly();
  private cargandoTipos = false;

  /**
   * Carga las franjas del perfil si aún no se conocen y se sabe que hay perfil (perfilGuard ya lo
   * habrá pedido, así que normalmente no hace falta otra petición). Sin perfil o con error: null.
   */
  cargarTiposComida(): void {
    if (this.tiposCache() !== null || this.cargandoTipos || this.existeCache() !== true) return;
    this.cargandoTipos = true;
    const generacion = this.generacion;
    this.obtener().subscribe({
      next: () => {
        if (generacion === this.generacion) this.cargandoTipos = false;
      },
      error: () => (this.cargandoTipos = false),
    });
  }

  /** Guarda las franjas de un perfil recibido (las de por defecto si no las trae). */
  private recordar(perfil: PerfilResponse | null | undefined, generacion = this.generacion): void {
    if (!perfil || generacion !== this.generacion) return;
    this.tiposCache.set(
      perfil.tiposComida?.length ? [...perfil.tiposComida] : franjasPorDefecto(Number(perfil.comidasPorDia) || 4),
    );
  }

  /**
   * ¿Tiene el usuario perfil deportivo? GET /perfil: 200 → true, 404 → false. Cualquier otro
   * error (403 CONSENTIMIENTO_REVOCADO, sin conexión…) se propaga y no se cachea.
   */
  existe(): Promise<boolean> {
    const cacheado = this.existeCache();
    if (cacheado !== null) return Promise.resolve(cacheado);
    if (this.comprobacion) return this.comprobacion;

    const generacion = this.generacion;
    const comprobacion = firstValueFrom(this.http.get<PerfilResponse>(this.url))
      .then(
        (perfil) => {
          this.recordar(perfil, generacion);
          return true;
        },
        (error: unknown) => {
          if (estadoHttp(error) === 404) return false;
          throw error;
        },
      )
      .then((existe) => {
        if (generacion === this.generacion) this.existeCache.set(existe);
        return existe;
      })
      .finally(() => {
        if (this.comprobacion === comprobacion) this.comprobacion = null;
      });
    this.comprobacion = comprobacion;
    return comprobacion;
  }

  /** GET /perfil. 404 PERFIL_NO_ENCONTRADO si aún no se ha creado (y se anota que no existe). */
  obtener(): Observable<PerfilResponse> {
    return this.http.get<PerfilResponse>(this.url).pipe(
      tap({
        next: (perfil) => {
          this.existeCache.set(true);
          this.recordar(perfil);
        },
        error: (error: unknown) => {
          if (estadoHttp(error) === 404) this.existeCache.set(false);
        },
      }),
    );
  }

  /**
   * PUT /perfil: crea o actualiza el perfil. Si los objetivos no son manuales, el backend los
   * recalcula. Marca el perfil como creado para perfilGuard.
   */
  guardar(req: PerfilRequest): Observable<PerfilResponse> {
    return this.http.put<PerfilResponse>(this.url, cuerpoPerfil(req)).pipe(
      tap((perfil) => {
        this.marcarCreado();
        this.recordar(perfil);
      }),
    );
  }

  /** GET /perfil/preferencias: alergias, intolerancias, dietas, rechazos y favoritos. */
  preferencias(): Observable<PreferenciaDto[]> {
    return this.http.get<PreferenciaDto[]>(`${this.url}/preferencias`);
  }

  /** PUT /perfil/preferencias: sustituye la lista completa (máx. 100; vacía las borra todas). */
  guardarPreferencias(lista: readonly PreferenciaDto[]): Observable<PreferenciaDto[]> {
    const cuerpo: PreferenciasRequest = { preferencias: lista.map(cuerpoPreferencia) };
    return this.http.put<PreferenciaDto[]>(`${this.url}/preferencias`, cuerpo);
  }

  /** GET /perfil/objetivos: objetivos base (sin el entrenamiento), desglose del cálculo y avisos. */
  objetivos(): Observable<ObjetivosResponse> {
    return this.http.get<ObjetivosResponse>(`${this.url}/objetivos`);
  }

  /**
   * PUT /perfil/objetivos: objetivos manuales. Dejan de recalcularse al cambiar el perfil. Los
   * avisos de la respuesta (macros que no cuadran con las kcal, kcal bajo el mínimo) no bloquean.
   */
  fijarObjetivosManuales(req: ObjetivosManualesRequest): Observable<ObjetivosResponse> {
    const cuerpo: ObjetivosManualesRequest = {
      kcal: req.kcal,
      proteinaG: req.proteinaG,
      carbohidratosG: req.carbohidratosG,
      grasaG: req.grasaG,
    };
    return this.http.put<ObjetivosResponse>(`${this.url}/objetivos`, cuerpo);
  }

  /** DELETE /perfil/objetivos/manuales: vuelve al cálculo automático con el perfil actual. */
  volverAlCalculo(): Observable<ObjetivosResponse> {
    return this.http.delete<ObjetivosResponse>(`${this.url}/objetivos/manuales`);
  }

  /** Tras crear el perfil (PUT /perfil en la bienvenida): el guard ya deja pasar sin preguntar. */
  marcarCreado(): void {
    this.generacion++;
    this.comprobacion = null;
    this.existeCache.set(true);
  }

  /** Olvida lo que se sabía del perfil. Se llama al cerrar la sesión. */
  limpiar(): void {
    this.generacion++;
    this.comprobacion = null;
    this.existeCache.set(null);
    this.tiposCache.set(null);
    this.cargandoTipos = false;
  }
}

/** PerfilRequest solo con sus campos; los opcionales vacíos no se envían. */
function cuerpoPerfil(req: PerfilRequest): PerfilRequest {
  const cuerpo: PerfilRequest = {
    fechaNacimiento: req.fechaNacimiento,
    sexo: req.sexo,
    alturaCm: req.alturaCm,
    pesoKg: req.pesoKg,
    objetivo: req.objetivo,
    deportePrincipal: req.deportePrincipal,
    nivelActividad: req.nivelActividad,
    diasEntrenamientoSemana: req.diasEntrenamientoSemana,
    duracionMediaMin: req.duracionMediaMin,
    comidasPorDia: req.comidasPorDia,
  };
  if (presente(req.porcentajeGrasa)) cuerpo.porcentajeGrasa = req.porcentajeGrasa;
  // fechaCompeticion solo tiene sentido (y es obligatoria) con el objetivo COMPETICION.
  if (req.objetivo === 'COMPETICION' && presente(req.fechaCompeticion)) cuerpo.fechaCompeticion = req.fechaCompeticion;
  if (presente(req.tiempoMaxCocinaMin)) cuerpo.tiempoMaxCocinaMin = req.tiempoMaxCocinaMin;
  if (req.tiposComida?.length) cuerpo.tiposComida = [...req.tiposComida];
  return cuerpo;
}

/** PreferenciaDto solo con sus campos (tipo, severidad y el que corresponda al tipo). */
function cuerpoPreferencia(p: PreferenciaDto): PreferenciaDto {
  const cuerpo: PreferenciaDto = { tipo: p.tipo, severidad: p.severidad };
  if (presente(p.alergeno)) cuerpo.alergeno = p.alergeno;
  if (presente(p.intolerancia)) cuerpo.intolerancia = p.intolerancia;
  if (presente(p.dieta)) cuerpo.dieta = p.dieta;
  if (presente(p.alimentoId)) cuerpo.alimentoId = p.alimentoId;
  if (presente(p.categoriaId)) cuerpo.categoriaId = p.categoriaId;
  return cuerpo;
}

function presente<T>(valor: T | null | undefined | ''): valor is T {
  return valor !== null && valor !== undefined && valor !== '';
}

// Auth y cuenta (NutriSport_API.md §5).
import type { EstadoUsuario, Rol } from './comun';

export type Unidades = 'METRICO';

export interface RegistroRequest {
  nombre: string; // máx. 80 car.
  email: string; // email · máx. 254 car.
  password: string;
  mayorDeEdad: boolean; // obligatorio aunque el JSON no lo marque (§11)
  aceptaTerminos: boolean; // obligatorio aunque el JSON no lo marque (§11)
  consentimientoSalud: boolean; // obligatorio aunque el JSON no lo marque (§11)
}
export interface LoginRequest {
  email: string;
  password: string;
  mantenerSesion: boolean; // obligatorio aunque el JSON no lo marque (§11)
}
export interface TokenResponse {
  accessToken: string;
  tipo: string;
  expiraEn: number; // entero (segundos)
  cuenta: CuentaResponse;
}
export interface CuentaResponse {
  id: string; // UUID
  nombre: string;
  email: string;
  roles: Rol[];
  estado: EstadoUsuario;
  emailVerificado: boolean;
  consentimientoSaludVigente: boolean;
  unidades: Unidades;
  insightsActivos: boolean;
}
/** Respuestas 202 de /auth y PUT /cuenta/email. No confundir con MensajeAsistente (§11). */
export interface MensajeResponse {
  mensaje: string;
}
export interface VerificarEmailRequest {
  token: string;
}
export interface ReenviarVerificacionRequest {
  email: string; // email
}
export interface RecuperarPasswordRequest {
  email: string; // email
}
export interface RestablecerPasswordRequest {
  token: string;
  nuevaPassword: string;
}
export interface ActualizarCuentaRequest {
  nombre?: string; // máx. 80 car.
  unidades?: Unidades;
  insightsActivos?: boolean;
}
export interface CambiarPasswordRequest {
  passwordActual: string;
  nuevaPassword: string;
}
export interface CambiarEmailRequest {
  nuevoEmail: string; // email · máx. 254 car.
  password: string;
}
export interface EliminarCuentaRequest {
  password: string;
  inmediata: boolean; // obligatorio aunque el JSON no lo marque (§11)
}

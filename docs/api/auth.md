# NutriSport API · Autenticación y cuenta

> Fragmento de `docs/NutriSport_API.md` (la referencia completa). Los números de sección (§) son los de ese documento. Lo común a todos los módulos está en `docs/api/general.md`, `docs/api/sesion-errores.md` y `docs/api/tipos-comunes.md`. Rutas relativas a `/api/v1`; 🔓 = público.

Registro, verificación, login, refresh, recuperación de contraseña y gestión de la cuenta (datos, contraseña, email, consentimiento de salud, eliminación y exportación). El ciclo de la sesión y los límites están en `sesion-errores.md` (§2).

## §5 · Tipos

Los enumerados y los tipos comunes (`Pagina<T>`, `Nutrientes`, `TipoComida`…) están en `tipos-comunes.md`.

```ts
// ---- Auth y cuenta
export interface RegistroRequest {
  nombre: string; // máx. 80 car.
  email: string; // email · máx. 254 car.
  password: string;
  mayorDeEdad: boolean; // obligatorio aunque el JSON no lo marque
  aceptaTerminos: boolean; // obligatorio aunque el JSON no lo marque
  consentimientoSalud: boolean; // obligatorio aunque el JSON no lo marque
}
export interface LoginRequest {
  email: string;
  password: string;
  mantenerSesion: boolean; // obligatorio aunque el JSON no lo marque
}
export interface TokenResponse {
  accessToken: string;
  tipo: string;
  expiraEn: number; // entero
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
export interface MensajeResponse {
  mensaje: string;
} // respuestas 202 de /auth y PUT /cuenta/email
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
  inmediata: boolean; // obligatorio aunque el JSON no lo marque
}
```

## §6 · Endpoints

### §6 · Auth

Registro, verificación del email, inicio y cierre de sesión, renovación del access token y recuperación de la contraseña. El refresh token viaja solo en la cookie HttpOnly ns_refresh (Path=/api/v1/auth, SameSite=Strict).

| Método | Ruta | Qué hace | Consulta | Cuerpo | Respuesta | Errores |
|---|---|---|---|---|---|---|
| POST | `/auth/login` 🔓 | Iniciar sesión | — | `LoginRequest` | `200` `TokenResponse` | 400, 401, 429 |
| POST | `/auth/logout` 🔓 | Cerrar la sesión | — | — | `204` sin cuerpo | — |
| POST | `/auth/logout-todas` | Cerrar todas las sesiones | — | — | `204` sin cuerpo | 401 |
| POST | `/auth/recuperar-password` 🔓 | Solicitar el email de recuperación de contraseña | — | `RecuperarPasswordRequest` | `202` `MensajeResponse` | 400, 429 |
| POST | `/auth/reenviar-verificacion` 🔓 | Reenviar el email de verificación | — | `ReenviarVerificacionRequest` | `202` `MensajeResponse` | 400, 429 |
| POST | `/auth/refresh` 🔓 | Renovar el access token | — | — | `200` `TokenResponse` | 401, 403 |
| POST | `/auth/registro` 🔓 | Crear una cuenta | — | `RegistroRequest` | `202` `MensajeResponse` | 400, 429 |
| POST | `/auth/restablecer-password` 🔓 | Restablecer la contraseña con el token del enlace | — | `RestablecerPasswordRequest` | `204` sin cuerpo | 400 |
| POST | `/auth/verificar-email` 🔓 | Verificar el email con el token del enlace | — | `VerificarEmailRequest` | `204` sin cuerpo | 400, 409 |

**Reglas de cada endpoint** (resumen de la descripción del OpenAPI):

- `POST /auth/login`: Devuelve el access token (15 minutos) y pone el refresh token en la cookie HttpOnly ns_refresh. Se puede entrar sin verificar el email. El error es el mismo para credenciales incorrectas y cuentas bloqueadas o eliminadas. Tras 5 intentos fallidos en 15 minutos con el mismo email o desde la misma IP responde 429 con Retry-After.
- `POST /auth/logout`: Usa solo la cookie ns_refresh: revoca su sesión y borra la cookie. Sin cookie o con un token desconocido también responde 204.
- `POST /auth/logout-todas`: Revoca todos los refresh tokens del usuario autenticado (en todos sus dispositivos) y borra la cookie de este navegador. Los access tokens emitidos caducan en 15 minutos.
- `POST /auth/recuperar-password`: Si la cuenta existe y está activa, envía un enlace válido 30 minutos. Responde siempre 202 con el mismo mensaje. Máximo 3 por hora por IP.
- `POST /auth/reenviar-verificacion`: Solo se envía si la cuenta existe, está activa y no está verificada, pero responde siempre 202 con el mismo mensaje. Máximo 3 por hora por IP.
- `POST /auth/refresh`: Usa la cookie ns_refresh, la rota (el token anterior deja de valer) y devuelve un access token nuevo con la cookie nueva. Reutilizar un token ya rotado cierra todas las sesiones de su familia. Si llega la cabecera Origin, debe ser la del frontend.
- `POST /auth/registro`: Contraseña de 10 a 72 caracteres con letras y números, que no sea común. Hay que declarar la mayoría de edad y aceptar los términos y el tratamiento de datos de salud. Responde siempre 202 con el mismo mensaje, exista o no el email (si existe, se avisa a su titular por correo). Máximo 3 por hora por IP.
- `POST /auth/restablecer-password`: La contraseña nueva sigue las mismas reglas que en el registro. El token sirve una sola vez. Cierra todas las sesiones abiertas del usuario.
- `POST /auth/verificar-email`: Consume el token del correo de verificación (24 h) o de cambio de email (en ese caso sustituye el email por el nuevo). Cada token sirve una sola vez.

### §6 · Cuenta

Datos de la cuenta del usuario autenticado: nombre y unidades, contraseña, email, consentimiento de tratamiento de datos de salud (RGPD art. 9) y eliminación de la cuenta.

| Método | Ruta | Qué hace | Consulta | Cuerpo | Respuesta | Errores |
|---|---|---|---|---|---|---|
| GET | `/cuenta` | Datos de la cuenta | — | — | `200` `CuentaResponse` | 401 |
| PATCH | `/cuenta` | Actualizar nombre y unidades | — | `ActualizarCuentaRequest` | `200` `CuentaResponse` | 400, 401 |
| DELETE | `/cuenta` | Eliminar la cuenta | — | `EliminarCuentaRequest` | `204` sin cuerpo | 400, 401, 403, 503 |
| POST | `/cuenta/consentimiento-salud` | Volver a dar el consentimiento de datos de salud | — | — | `204` sin cuerpo | 401, 403 |
| DELETE | `/cuenta/consentimiento-salud` | Revocar el consentimiento de datos de salud | — | — | `204` sin cuerpo | 401, 403 |
| PUT | `/cuenta/email` | Cambiar el email | — | `CambiarEmailRequest` | `202` `MensajeResponse` | 400, 401 |
| GET | `/cuenta/exportacion` | Exportar todos mis datos | — | — | `200` `ExportacionDatos` | 401, 403 |
| PUT | `/cuenta/password` | Cambiar la contraseña | — | `CambiarPasswordRequest` | `204` sin cuerpo | 400, 401 |

**Reglas de cada endpoint** (resumen de la descripción del OpenAPI):

- `GET /cuenta`: Nombre, email, roles, estado, si el email está verificado, si el consentimiento de salud está vigente y las unidades.
- `PATCH /cuenta`: Los campos que no se envían no cambian.
- `DELETE /cuenta`: Requiere la contraseña (400 PASSWORD_INCORRECTA si no coincide). Con inmediata = true se borra todo al momento; si no, la cuenta queda ELIMINADA y se borra a los 30 días. En ambos casos se borran las fotos, se cierran todas las sesiones y se borra la cookie.
- `POST /cuenta/consentimiento-salud`: Guarda la fecha y la versión vigente del texto del consentimiento y desbloquea las funciones con datos de salud.
- `DELETE /cuenta/consentimiento-salud`: Bloquea perfil, comidas, análisis, entrenamientos y seguimiento (403 CONSENTIMIENTO_REVOCADO) hasta que se vuelva a dar. Los datos no se borran: se pueden eliminar con DELETE /cuenta.
- `PUT /cuenta/email`: Requiere la contraseña. Envía un enlace de confirmación al email nuevo; el cambio se hace al abrirlo (POST /auth/verificar-email). Responde siempre 202 con el mismo mensaje, para no revelar si el email ya está en uso.
- `GET /cuenta/exportacion`: Derecho de acceso y portabilidad (§8.3): un JSON descargable (nutrisport-datos-AAAAMMDD.json) con la cuenta y sus consentimientos, el perfil, las preferencias, los objetivos diarios, las comidas con sus alimentos, los entrenamientos, los pesajes, los menús, las listas de la compra, las recetas favoritas, las conversaciones con el asistente, los análisis de fotos (metadatos y candidatos, sin imágenes) y los insights. Nunca incluye la contraseña ni los tokens. Se puede usar aunque el consentimiento de salud esté revocado. 403 EMAIL_NO_VERIFICADO si el email no está verificado.
- `PUT /cuenta/password`: Requiere la contraseña actual (400 PASSWORD_INCORRECTA si no coincide). La nueva sigue las reglas del registro. Cierra todas las sesiones.

## §7 · Flujos

### §7.6. Descarga de la exportación de datos

`GET /cuenta/exportacion` devuelve el JSON con `Content-Disposition: attachment; filename="nutrisport-datos-AAAAMMDD.json"`. Pídelo con `HttpClient` (`responseType: 'blob'`, `observe: 'response'`) —así lleva el token— y descarga el `Blob` con un `<a download>` temporal y `URL.createObjectURL`. Sin el email verificado: 403 `EMAIL_NO_VERIFICADO`.

## §8 · Validaciones que el formulario debe replicar

Replica estas reglas en el formulario, pero trata siempre los errores 400 del servidor (`errors[]`).

| Petición | Campo | Regla |
|---|---|---|
| `ActualizarCuentaRequest` | `nombre` | máx. 80 caracteres; no puede ser solo espacios |
| `CambiarEmailRequest` | `nuevoEmail` | obligatorio; email válido; máx. 254 caracteres |
| `CambiarEmailRequest` | `password` | obligatorio |
| `CambiarPasswordRequest` | `passwordActual` | obligatorio |
| `CambiarPasswordRequest` | `nuevaPassword` | obligatorio; mismas reglas que en el registro |
| `EliminarCuentaRequest` | `password` | obligatorio |
| `EliminarCuentaRequest` | `inmediata` | envíalo siempre (`true` o `false`): si falta, 400 |
| `LoginRequest` | `email` | obligatorio |
| `LoginRequest` | `password` | obligatorio |
| `LoginRequest` | `mantenerSesion` | envíalo siempre (`true` o `false`): si falta, 400 |
| `RecuperarPasswordRequest` | `email` | obligatorio; email válido |
| `ReenviarVerificacionRequest` | `email` | obligatorio; email válido |
| `RegistroRequest` | `nombre` | obligatorio; máx. 80 caracteres |
| `RegistroRequest` | `email` | obligatorio; email válido; máx. 254 caracteres |
| `RegistroRequest` | `password` | obligatorio; 10–72 caracteres, al menos una letra y un número, y no estar en la lista de contraseñas comunes (la lista solo la comprueba el servidor) |
| `RegistroRequest` | `mayorDeEdad` | tiene que ser `true` (checkbox obligatorio). Envíalo siempre |
| `RegistroRequest` | `aceptaTerminos` | tiene que ser `true`. Envíalo siempre |
| `RegistroRequest` | `consentimientoSalud` | tiene que ser `true` (checkbox separado). Envíalo siempre |
| `RestablecerPasswordRequest` | `token` | obligatorio |
| `RestablecerPasswordRequest` | `nuevaPassword` | obligatorio; mismas reglas que en el registro |
| `VerificarEmailRequest` | `token` | obligatorio |

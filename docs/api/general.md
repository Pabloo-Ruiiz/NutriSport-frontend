# NutriSport API · Convenciones, requisitos y entorno

> Fragmento de `docs/NutriSport_API.md` (la referencia completa). Los números de sección (§) son los de ese documento. Lo común a todos los módulos está en `docs/api/general.md`, `docs/api/sesion-errores.md` y `docs/api/tipos-comunes.md`. Rutas relativas a `/api/v1`; 🔓 = público.

Lo que hay que saber antes de cualquier petición.

## §1. Convenciones

| Aspecto | Valor |
|---|---|
| URL base | `/api/v1`. En desarrollo, el proxy de Angular (`proxy.conf.json`) la redirige a `http://localhost:8080`, así que el navegador ve **un único origen** (`http://localhost:4200`) |
| Formato | JSON, propiedades en **`camelCase`** (`fechaNacimiento`, `kcal100`, `tipoActividadCodigo`) |
| Enumerados | Valores en **MAYÚSCULAS** con guion bajo (`PERDER_GRASA`, `MEDIA_MANANA`, `PRE_ENTRENO`). La interfaz los traduce con un mapa de etiquetas (§10) |
| Identificadores | **UUID** en texto (`"0193a3f2-…"`), nunca números. En rutas: `/comidas/{id}` |
| Fechas | `date` = `"2026-11-25"` · `date-time` = ISO con zona (`"2026-11-25T08:30:00+01:00"` o `…Z`) · `time-local` = `"08:30:00"` (al enviar, `"08:30"` también vale) |
| Zona horaria | El servidor calcula "hoy" en **Europe/Madrid**. El frontend envía fechas locales (`AAAA-MM-DD`), nunca `toISOString()` de un `Date` (te puede mover al día anterior) |
| Números | Los valores nutricionales, pesos y cantidades llegan como `number` (decimales con punto en el JSON; la interfaz los muestra con coma) |
| Unidades | Nutrientes por **100 g o 100 ml** en el catálogo (`kcal100`, `proteinas100`…); gramos en comidas y recetas |
| Paginación | Estilo Spring: `?page=0&size=20&sort=campo,desc`. **`page` empieza en 0**. Respuesta `Pagina<T>` = `{ content, page, size, totalElements, totalPages }`. Máximo por página: 50 (alimentos, menús, listas, conversaciones) o 100 (admin) |
| Autenticación | `Authorization: Bearer <accessToken>` (JWT, **15 minutos**). El refresh token va en la cookie `HttpOnly` `ns_refresh` (`Path=/api/v1/auth`, `SameSite=Strict`, 7 días si se marca "Mantener la sesión") |
| Roles | `DEPORTISTA` y `ADMIN` (un usuario puede tener los dos). Las rutas `/admin/**` exigen `ADMIN` |
| Cuerpos estrictos | El backend tiene `fail-on-unknown-properties=true`: **una propiedad que no existe en el DTO devuelve 400**. Envía exactamente los campos de la interfaz `…Request` (no reenvíes un `…Response` entero) |
| Booleanos primitivos | `LoginRequest.mantenerSesion`, los tres booleanos de `RegistroRequest` y `EliminarCuentaRequest.inmediata` **deben enviarse siempre** (si faltan, 400 "cuerpo mal formado") |
| Nulos | Las respuestas incluyen todas las propiedades; las que no tienen valor llegan como `null`. En las peticiones, un campo opcional se puede omitir o mandar a `null` |
| Idioma | Mensajes de error (`detail`, `errors[].mensaje`) en castellano, listos para mostrar |
| Cabeceras útiles | `Location` (201 y 202), `Retry-After` (429 y 503) y `X-Proveedor-No-Disponible` (productos y recetas externas). CORS las expone; con el proxy no hace falta CORS |

**Público o protegido.** Solo son públicos (🔓 en las tablas del §6) `POST /auth/registro`, `/auth/verificar-email`, `/auth/reenviar-verificacion`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/recuperar-password` y `/auth/restablecer-password`. Todo lo demás necesita el token.

**Recursos ajenos.** Un recurso de otro usuario responde **404** (nunca 403), igual que uno que no existe.

## §4. Requisitos de la cuenta: email, consentimiento y perfil

`CuentaResponse` (en el login, el refresh y `GET /cuenta`) dice qué puede hacer el usuario:

| Condición | Campo | Endpoints afectados | Error |
|---|---|---|---|
| Email verificado | `cuenta.emailVerificado` | `POST /analisis/imagenes`, `POST /asistente/conversaciones/{id}/mensajes`, `POST /menus/{id}/comidas/{comidaId}/sugerencia-ia`, `GET /cuenta/exportacion` | 403 `EMAIL_NO_VERIFICADO` |
| Consentimiento de salud vigente | `cuenta.consentimientoSaludVigente` | `/perfil/**`, `/comidas/**`, `/analisis/**`, `/entrenamientos/**`, `/seguimiento/**` (y lo que dependa de ellos) | 403 `CONSENTIMIENTO_REVOCADO` |
| Perfil creado | `GET /perfil` ≠ 404 | `GET /seguimiento/resumen`, `GET /perfil/objetivos`, `POST/PUT /entrenamientos`, generar y regenerar menús, sugerencia IA | 422 `PERFIL_REQUERIDO` |

El frontend lo usa para **prevenir** (guard de perfil, banner "Verifica tu email", banner "Consentimiento revocado", botones de IA desactivados con explicación), pero siempre trata además el error del servidor.

## §11. Discrepancias conocidas del OpenAPI

Comprobadas en el código del backend:

1. **`MensajeResponse` duplicado.** El backend tiene dos clases con ese nombre y springdoc las fusiona en el esquema `{ mensaje }`. Es correcto para las respuestas 202 de `/auth/*` y `PUT /cuenta/email`, pero `POST /asistente/conversaciones/{id}/mensajes` y `ConversacionResponse.mensajes` devuelven **`MensajeAsistente`** `{ id, rol, contenido, herramientasUsadas, valoracion, creadoEn }` (§5).
2. **Booleanos obligatorios.** El JSON no marca como `required` `mantenerSesion`, `mayorDeEdad`, `aceptaTerminos`, `consentimientoSalud` ni `inmediata`, pero son primitivos en Java y el backend responde 400 si faltan (comprobado con `curl`).
3. **`GET /perfil` sin perfil** responde 404 con `codigo = PERFIL_NO_ENCONTRADO` (comprobado contra el backend). El OpenAPI no lista los códigos de cada endpoint: el frontend debe tratar cualquier 404 de `/perfil` como "sin perfil".
4. **Contraseña actual incorrecta** (`PUT /cuenta/password`, `PUT /cuenta/email`, `DELETE /cuenta`) responde 400 `VALIDACION` con el error en el campo de la contraseña (la descripción habla de `PASSWORD_INCORRECTA`, que es el texto, no el código).
5. **Paginación:** los parámetros `page`, `size` y `sort` aparecen en endpoints que limitan el tamaño (50 o 100) aunque el JSON no lo diga; la búsqueda de alimentos ignora `sort` (ordena por parecido).
6. **`GET /productos`** tiene su propio `page` (0–49) y devuelve una **lista** (`ProductoResumenResponse[]`), no una página.
7. **Limitaciones (no son errores del JSON):** no hay listado de "mis alimentos" (`GET /alimentos` exige `q`; los privados propios llevan `fuente = USUARIO`), ni listado de administración de recetas ni campo `publicada` en las respuestas de recetas (las propias públicas sin publicar no aparecen en `GET /recetas`), ni endpoint de uso diario de la IA (los límites se conocen por el 429).
8. **Swagger UI** solo está activo con el perfil `local` (`springdoc.api-docs.enabled=true`).

## §12. Entorno de desarrollo y datos de prueba

| Servicio | URL |
|---|---|
| API (perfil `local`) | `http://localhost:8080/api/v1` |
| Swagger UI | `http://localhost:8080/swagger-ui/index.html` |
| OpenAPI JSON | `http://localhost:8080/v3/api-docs` |
| Mailpit (correos de verificación y recuperación) | `http://localhost:8025` |
| MinIO (fotos; consola) | `http://localhost:9001` (URLs prefirmadas en `http://localhost:9000`) |
| Frontend | `http://localhost:4200` (`app.frontend-url` del backend; CORS y los enlaces de los correos usan esta URL) |

- **Administrador:** se crea al arrancar con el perfil `local` con `ADMIN_EMAIL` y `ADMIN_PASS` del `.env` del backend (por defecto `admin@nutrisport.local`). No copies la contraseña en el repositorio del frontend.
- **Deportista de prueba:** regístralo desde la propia aplicación y verifica el email desde Mailpit. Recuerda el límite de 3 registros por hora por IP.
- **Catálogo:** el perfil `local` carga un catálogo de alimentos y recetas de desarrollo (valores aproximados, `fuente = ADMIN`).
- **IA:** sin `IA_API_KEY` el backend funciona en **modo simulado**: el análisis de fotos y el asistente devuelven respuestas de ejemplo coherentes. Sirve para desarrollar todo el frontend.

# Plan de pruebas manuales del frontend

## Ejecución del 27/11/2026 · Europe/Madrid

**Estado provisional: 23 OK, 6 KO, 5 pendientes y 3 parciales. El hito MVP completo todavía no está aceptado.**

Se ha probado la imagen de producción del frontend con nginx en Docker, publicada en
`http://localhost:4200`, contra el backend local en `http://host.docker.internal:8080`.
PostgreSQL, Mailpit y MinIO se ejecutan en Docker. El backend contenedorizado estaba
detenido: primero falló por resolución de `postgres` y al reintentarlo encontró ocupado
el puerto 8080 por el backend Java local, cuyo `/actuator/health` respondió `UP`.
Se empleó la alternativa `BACKEND_URL` documentada en el README.

Perfiles utilizados: cuenta nueva `mvp.20261127@nutrisport.test` y administrador local.
Solo se han creado datos sintéticos. No se incluyen contraseñas ni tokens en este documento.
Los casos de registro/onboarding se aplican a la cuenta nueva y los de gestión a la cuenta
administradora; las observaciones indican dónde se han repetido flujos con ambos perfiles.
No se ha eliminado ni bloqueado la cuenta administradora.

| Comprobación | Resultado | Evidencia |
|---|---|---|
| `npm run build` (mediante `npm.cmd`) | OK con aviso | Código 0; paquete inicial 518,11 kB, 18,11 kB por encima del presupuesto de aviso de 500 kB. |
| `npm test -- --watch=false` (mediante `npm.cmd`) | OK | 77 archivos, 607 tests aprobados, código 0; duración 116,96 s. Incluye los flujos de `src/app/flujos/`, con API simulada. |
| `docker compose up -d --build` | OK con configuración local | Imagen de producción compilada; contenedor `nutrisport-frontend` activo, puerto 4200. Proxy configurado después con `BACKEND_URL=http://host.docker.internal:8080`. |
| Fallo controlado PM-23/25 | Ejecutado y restaurado | Se añadió temporalmente un `return 503` solo para `/api/v1/analisis/imagenes` en nginx del contenedor; se reinició el contenedor y se verificó `nginx -t` y ausencia de esa regla. No se modificó la plantilla del repositorio. |

PowerShell bloquea `npm.ps1` por su política de ejecución; se usó `npm.cmd`, sin modificar
la política del equipo. La suite automatizada no sustituye los casos manuales pendientes.
La imagen de prueba de análisis es el PNG sintético `docs/design/mockups/png/03-resultado-analisis.png`;
se comprueba el flujo de la aplicación, no la precisión de reconocimiento sobre fotos reales.

Los estados **PENDIENTE** y **PARCIAL** indican falta de evidencia, no un resultado aprobado.
Los KO de PM-10, PM-11, PM-23/25 y PM-30 requieren corrección o una decisión explícita
sobre los criterios. PM-31 refleja que aún no se acepta el conjunto del MVP.
Después del cierre del MVP, la Ampliación seguirá **A1 → A2 → A3 → A4 → A5 y después el resto**,
en el mismo orden que el backend; esta comprobación no inicia su implementación.

## Preparación

- Ejecuta las pruebas en un entorno de demostración con datos sintéticos; no uses cuentas ni datos de salud reales.
- Ten disponibles una cuenta de deportista, una cuenta de administrador y acceso al buzón de correo de pruebas.
- Para los casos de sesión, foto y administración, prepara el backend y los servicios que correspondan.
- Marca el resultado de cada caso como **OK** o **KO** y anota cualquier incidencia en observaciones. Usa **PENDIENTE** o **PARCIAL** si no se ha podido comprobar todo el resultado esperado.

## Autenticación

| ID | Historia de usuario | Pasos | Resultado esperado | Resultado (OK/KO) | Observaciones |
|---|---|---|---|---|---|
| PM-01 | HU-01 · Registro de cuenta | Abre `/registro`. Completa el formulario con un email nuevo y una contraseña válida. Declara que eres mayor de edad y acepta los términos y el consentimiento de datos de salud. Envía el formulario. | Se crea la cuenta y aparece la confirmación para revisar el email. Llega un mensaje de verificación al buzón de pruebas. | OK | Usuario nuevo: registro completado; confirmación genérica y correo recibido en Mailpit. Email verificado mediante su enlace. |
| PM-02 | HU-01 · Registro de cuenta | Intenta registrarte sin aceptar el consentimiento de datos de salud. Repite sin declarar que eres mayor de edad. Por último, intenta registrarte con un email ya registrado. | Sin consentimiento o declaración de mayoría de edad no se completa el registro y se indica qué condición falta. Para el email existente aparece el mismo mensaje de confirmación que para un registro nuevo. | OK | Sin marcar declaraciones aparecen errores obligatorios. Repetir el email existente devuelve la misma pantalla Revisa tu email. |
| PM-03 | HU-02 · Inicio de sesión | En `/login`, introduce un email válido con una contraseña incorrecta y envía el formulario. | No se inicia sesión; aparece un mensaje comprensible de credenciales incorrectas, sin detalles técnicos. | OK | Email o contraseña incorrectos, sin detalles técnicos. |
| PM-04 | HU-02 · Inicio de sesión | Falla el inicio de sesión cinco veces en un intervalo de 15 minutos. Intenta iniciar sesión de nuevo. | La app avisa que hay que esperar antes de reintentar. La cuenta no queda bloqueada. | OK | Tras los fallos aparece Demasiados intentos y espera de 2 minutos; después se inicia sesión con la contraseña correcta. |
| PM-05 | HU-03 · Recuperar contraseña | Solicita recuperar la contraseña. Abre un enlace de restablecimiento caducado o ya utilizado e intenta definir una contraseña nueva. | Se informa de que el enlace no es válido y se ofrece solicitar otro. | PENDIENTE | Solicitado correo de recuperación y abierto formulario con token inválido. Falta enviar contraseña: requiere intervención manual del usuario por política del navegador. |
| PM-06 | HU-03 · Recuperar contraseña | Solicita recuperar la contraseña y abre un enlace válido antes de que pasen 30 minutos. Define una contraseña nueva e intenta usar la anterior. | La contraseña nueva permite iniciar sesión; la anterior deja de funcionar y las otras sesiones se cierran. | PENDIENTE | Correo de recuperación recibido en Mailpit. El cambio de credenciales requiere intervención manual; faltan cambio, rechazo de contraseña anterior y revocación de otras sesiones. |
| PM-07 | HU-02 · Renovación de sesión | Inicia sesión y deja que transcurran 15 minutos antes de volver a usar la app. Si hace falta, repite tras recargar sin la cookie de sesión disponible. | La sesión caducada se gestiona de forma segura: la app pide iniciar sesión y no muestra datos protegidos como si la sesión siguiera activa. | PENDIENTE | Se restauró sesión al recargar varias veces, pero no se completó una espera controlada de 15 minutos ni una recarga sin cookie. No sustituir por tests de HttpTestingController. |

## Onboarding y perfil

| ID | Historia de usuario | Pasos | Resultado esperado | Resultado (OK/KO) | Observaciones |
|---|---|---|---|---|---|
| PM-08 | HU-02 · Inicio de sesión / HU-04 · Configuración inicial del perfil | Inicia sesión con una cuenta que aún no tiene perfil. | La app abre el asistente de configuración inicial en lugar del dashboard. | OK | Usuario nuevo sin perfil redirigido a /bienvenida. |
| PM-09 | HU-04 · Configuración inicial del perfil | Completa los cuatro pasos del asistente con datos válidos de perfil, deporte y objetivo. | Se guardan los datos y se muestran los objetivos diarios de energía y macros con una explicación del cálculo. | OK | Cuatro pasos completados: 175 cm, 70 kg, hombre, 1996-01-15, carrera, mantener. Resultado: 1979 kcal, P 98 g, HC 273 g, G 55 g; explicación desplegable. |
| PM-10 | HU-04 · Configuración inicial del perfil | En el paso de datos físicos, introduce una altura fuera de rango, por ejemplo 300 cm, e intenta continuar. | El campo muestra el error y el asistente no avanza. | KO | Introducir 300 cm se limita silenciosamente a 230 cm al perder foco y permite avanzar al paso 2. No se muestra el error esperado. |
| PM-11 | HU-04 · Configuración inicial del perfil | Completa parte del asistente, ciérralo y vuelve a abrirlo. | El progreso introducido se conserva y puedes continuar desde donde lo dejaste. | KO | Tras completar datos y avanzar al paso 2, volver al 1 y recargar elimina fecha, sexo, altura y peso: no se conserva el borrador. |
| PM-12 | HU-05 · Restricciones alimentarias | Marca la alergia al gluten como estricta. Busca o registra manualmente un alimento con gluten, trazas o alérgenos sin revisar. | Aparece un aviso sobre la restricción; en el registro manual el aviso no impide continuar. | OK | Gluten estricto en onboarding. Guardar Pan blanco de barra muestra Comida guardada, con avisos: Contiene GLUTEN y permite continuar. |

## Configuración

| ID | Historia de usuario | Pasos | Resultado esperado | Resultado (OK/KO) | Observaciones |
|---|---|---|---|---|---|
| PM-13 | HU-21 · Eliminar mi cuenta | Abre la configuración de cuenta, inicia la eliminación y confirma con la contraseña. Después intenta iniciar sesión con esa cuenta. | Se cierran las sesiones, la cuenta deja de permitir el inicio de sesión y las fotos asociadas se eliminan. | PENDIENTE | Eliminación de la cuenta sintética autorizada por el usuario; se pospone hasta terminar recuperación y sesiones. No se ha borrado la cuenta ni validado la limpieza de fotos. |
| PM-14 | Consentimiento de datos de salud | Revoca el consentimiento desde la configuración de cuenta. Después intenta realizar una acción que requiera ese consentimiento, como analizar una foto (continúa en PM-24). | La app refleja que el consentimiento está revocado y no permite completar la acción protegida; comunica el motivo sin mostrar un error técnico. | OK | Privacidad cambia a Revocado, muestra datos bloqueados y rechaza análisis. Consentimiento restaurado después para continuar. |

## Comidas

| ID | Historia de usuario | Pasos | Resultado esperado | Resultado (OK/KO) | Observaciones |
|---|---|---|---|---|---|
| PM-15 | HU-06 · Registro manual de comida | Abre `/comidas/nueva` y busca «platno». | «Plátano» aparece entre los primeros resultados. | OK | Administrador y usuario nuevo: platno devuelve Plátano como único resultado. |
| PM-16 | HU-06 · Registro manual de comida | Selecciona «1 unidad mediana» de un alimento y revisa la cantidad y los nutrientes mostrados. | La unidad se convierte a gramos y se muestran los nutrientes calculados por el backend. | OK | Administrador: 1 unidad mediana de Plátano equivale a 120 g; estimación 105 kcal y cálculo final guardado 105 kcal. La revisión previa avisa que es una estimación local. |
| PM-17 | HU-06 · Registro manual de comida | Guarda una comida y abre el resumen diario. | La comida guardada aparece y el resumen del día se actualiza inmediatamente. | OK | Administrador: desayuno de Plátano visible inmediatamente y 105 kcal en resumen. Usuario nuevo: pan 254 kcal y posterior foto 579 kcal actualizan resumen. |
| PM-18 | HU-08 · Historial de comidas | Abre el historial, filtra por un rango de fechas y revisa las comidas. Edita una comida pasada y duplica el desayuno de ayer para hoy. | Las comidas aparecen agrupadas por día con sus totales; la edición se conserva y la copia se crea con la fecha de hoy. | OK | Usuario nuevo: filtro 26-27 noviembre, agrupación y totales; fecha editada al 26 persiste al recargar; duplicar desayuno de ayer crea Copia el 27. |

## Foto

| ID | Historia de usuario | Pasos | Resultado esperado | Resultado (OK/KO) | Observaciones |
|---|---|---|---|---|---|
| PM-19 | HU-07 · Registro por fotografía | Con una cuenta habilitada, carga una foto válida desde `/comidas/foto` e inicia el análisis. | Se muestra el progreso y, en menos de 15 segundos, aparecen alimentos estimados con cantidades y confianza. | OK | Usuario verificado: 3496 ms desde Analizar hasta Revisa tu desayuno; cuatro candidatos con cantidades y confianza. Administrador también obtiene resultado. Imagen sintética del mockup; no valida precisión de visión en fotografías reales. |
| PM-20 | HU-07 · Registro por fotografía | Inicia sesión con una cuenta cuyo email no está verificado e intenta enviar una foto para analizar. | La app informa de que hace falta verificar el email; la foto no se analiza ni se guarda en el historial. | OK | Usuario sin verificar: aviso explicativo y Analizar foto deshabilitado incluso con PNG cargado; después se verificó el email. |
| PM-21 | HU-07 · Registro por fotografía | En el resultado, cambia un alimento mal identificado por otro del catálogo y modifica sus gramos. | Se actualizan los nutrientes del resultado y puedes revisar la estimación antes de confirmarla. | OK | Ambos perfiles: cambiar Salmón a la plancha por Salmón crudo y ajustar a 100 g recalcula nutrientes antes de confirmar; total 563 kcal en usuario nuevo. |
| PM-22 | HU-07 · Registro por fotografía | Analiza una foto y sal del flujo sin pulsar «Confirmar». Revisa el historial de comidas. | No se guarda ninguna comida en el historial antes de confirmar. | OK | Ambos perfiles: abandonar resultado sin confirmar no crea comida. Usuario nuevo mantiene 4 comidas totales (3 hoy y 1 ayer); administrador mantiene solo el desayuno previo. |
| PM-23 | HU-07 · Registro por fotografía | Provoca un fallo de análisis o espera más de 30 segundos. Elige continuar con el registro manual. | Se ofrece el registro manual sin perder la foto y no se guarda nada en el historial sin confirmación. | KO | 503 inyectado en proxy: error recuperable, foto visible y enlace manual. Tras continuar manualmente y volver a Foto del plato, se pierde la imagen. No se creó comida por el fallo. |
| PM-24 | HU-07 · Registro por fotografía / Consentimiento de datos de salud | Con una cuenta que haya revocado el consentimiento, intenta enviar una foto para analizar (prepara la cuenta con PM-14). | La app rechaza la acción y explica el motivo; no se inicia el análisis ni se registra una comida. | OK | Cuenta verificada con consentimiento revocado: al enviar PNG aparece Tus datos de salud están bloqueados y enlace a Privacidad; no se obtiene análisis ni comida. |
| PM-25 | HU-07 · Registro por fotografía | En un entorno de pruebas, provoca una respuesta 503 del servicio de IA, deteniendo temporalmente el backend o usando un modo de error disponible. | Se presenta un error recuperable, sin mensaje técnico, y se ofrece continuar manualmente conservando la foto. | KO | 503 temporal solo en /api/v1/analisis/imagenes: mensaje comprensible y reintento/manual disponibles. La foto se conserva en el error pero se pierde al continuar manualmente (PM-23). Proxy original restaurado y comprobado sin regla 503. |

## Actividad

| ID | Historia de usuario | Pasos | Resultado esperado | Resultado (OK/KO) | Observaciones |
|---|---|---|---|---|---|
| PM-26 | HU-09 · Registrar entrenamiento | Registra 60 minutos de carrera a 10 km/h, intensidad media y peso de 70 kg. | Se muestra un gasto neto estimado de aproximadamente 616 kcal y aumenta el objetivo del día en esa cantidad. | OK | Variante de catálogo: carrera disponible a 9,7 km/h (no 10). 60 min, intensidad media, 70 kg: 616 kcal; objetivo pasa de 1979 a 2595 kcal. |
| PM-27 | HU-09 · Registrar entrenamiento | Planifica un entrenamiento para mañana. Comprueba el dashboard de mañana, elimina el entrenamiento y vuelve a comprobar el objetivo. | El entrenamiento aparece como próximo y suma al objetivo de mañana; al eliminarlo, el objetivo vuelve al valor anterior. | OK | Con 69 kg: entrenamiento planificado el 28/11 10:00 añade 607 kcal, objetivo mañana 2574. Tras eliminar, vuelve a 1967 kcal y descanso. |

## Dashboard

| ID | Historia de usuario | Pasos | Resultado esperado | Resultado (OK/KO) | Observaciones |
|---|---|---|---|---|---|
| PM-28 | HU-10 · Dashboard diario | Abre `/inicio` con una cuenta que tenga comidas y actividad registradas. | Se muestran energía y macros consumidos frente al objetivo, las comidas del día, el próximo entrenamiento y las comidas planificadas. | PARCIAL | Usuario nuevo: energía/macros, comidas y actividad correctos. Mañana muestra entrenamiento planificado. No se ha preparado ni verificado una comida planificada. |
| PM-29 | HU-10 · Dashboard diario | Abre `/inicio` con una cuenta que no haya registrado comidas ese día. | Se muestra un estado vacío con accesos directos para registrar una comida. | OK | Administrador antes de registrar: estado Aún no has registrado comidas hoy y accesos foto/búsqueda. Usuario nuevo: estado vacío en mañana. |
| PM-30 | HU-11 · Evolución del peso | Registra un pesaje desde el perfil y abre el gráfico de evolución. | El gráfico se actualiza con la media móvil de siete días y el perfil recalcula los objetivos. | KO | Registrar 69 kg desde perfil guarda el pesaje y recalcula 1979 a 1967 kcal, P 98 a 97 g. No hay gráfico de evolución ni media móvil accesibles en el perfil/navegación actual. |
| PM-31 | HU-01 · HU-04 · HU-06 · HU-07 · HU-09 · HU-10 · Criterio de salida del MVP | Levanta el entorno con `docker compose up`. Con una cuenta de prueba, recorre el registro, la configuración del perfil, el registro manual y por foto, el entrenamiento y el dashboard. Ejecuta también las pruebas existentes de autorización y cálculo. | El entorno levanta correctamente; el usuario puede completar los flujos principales del MVP y las pruebas de autorización y cálculo pasan. | KO | Imagen Docker y suite frontend pasan; flujos principales completados con usuario nuevo y administrador, pero hay KO y pendientes en este plan. Hito MVP no aceptado. No se ha ejecutado Maven del backend. |

## Administración

| ID | Historia de usuario | Pasos | Resultado esperado | Resultado (OK/KO) | Observaciones |
|---|---|---|---|---|---|
| PM-32 | HU-18 · Gestión del catálogo | Con una cuenta de administrador, intenta crear un alimento sin indicar una fuente. | El formulario impide guardar el alimento y señala el campo necesario. | PENDIENTE | Guion incompatible con UI: Fuente viene preseleccionada como NutriSport y el selector no ofrece opción vacía; no se puede omitir con controles normales ni observar el error solicitado. Ajustar el caso o el formulario. |
| PM-33 | HU-18 · Gestión del catálogo | En el catálogo, marca los alérgenos de un alimento como revisados. Después intenta eliminar un alimento que ya se usa en registros. | El estado de revisión queda guardado. El alimento usado se desactiva en lugar de borrarse. | OK | Administrador crea MVP prueba 20261127, marca alérgenos revisados, lo usa en una comida y lo elimina. El catálogo conserva la fila Revisados / Desactivado y deshabilita Eliminar. |
| PM-34 | HU-20 · Gestión de usuarios | Desde la ficha de un usuario de prueba, bloquéalo. Comprueba sus sesiones, intenta iniciar sesión con su cuenta y revisa los datos visibles en la ficha. | Se revocan sus sesiones, no puede iniciar sesión y la ficha no muestra sus datos de salud. | PARCIAL | Administrador bloquea usuario sintético: ficha Bloqueado sin datos de salud; login con credenciales correctas rechazado. Desbloqueado para continuar. No se ha aislado una sesión activa independiente para probar revocación: las pestañas comparten cookie. |

## Accesibilidad

| ID | Historia de usuario | Pasos | Resultado esperado | Resultado (OK/KO) | Observaciones |
|---|---|---|---|---|---|
| PM-35 | HU-01 · Registro de cuenta / HU-06 · Registro manual de comida | Recorre los formularios de registro y comida usando solo el teclado. Comprueba etiquetas de campos, orden de foco y foco visible. | Puedes completar las acciones sin ratón; cada campo tiene etiqueta y el foco es visible. | OK | Registro duplicado y comida de Plátano completados con Tab, Espacio y Enter. Campos etiquetados; orden de foco comprobado; botones Crear cuenta/Guardar comida con outline verde sólido 2 px. |
| PM-36 | HU-07 · Registro por fotografía | Inicia un análisis y observa con lector de pantalla o inspección del árbol de accesibilidad los estados de carga, resultado y error. | Los resultados asíncronos y sus cambios se anuncian de forma accesible; los errores son comprensibles y accionables. | OK | Árbol accesible de carga y resultado inspeccionado; foco al título de resultado; cambio de alimento anunciado. Error 503 anunciado en aria-live polite con texto accionable y enlace manual. Sin lector de pantalla real. |
| PM-37 | HU-10 · Dashboard diario / Navegación | Revisa la app en una ventana de 360 px de ancho y después en escritorio. Comprueba navegación, contraste y controles táctiles. | No hay desbordamiento horizontal; en móvil aparece la barra inferior y en escritorio la barra lateral. El texto y los objetivos táctiles respetan los mínimos de accesibilidad del proyecto. | PARCIAL | Observado móvil a 619 px con barra inferior y escritorio a 1280 con sidebar, sin desbordamiento. El control de viewport no aplicó los 360 px solicitados (innerWidth seguía 619/1280); falta 360 px y auditoría completa de contraste/tamaño táctil. |

## Comprobación A1 · Productos comerciales · 27/11/2026

Ejecución independiente de la comprobación MVP anterior, sobre los cambios actuales del
workspace. No se da por aprobada la comprobación manual: el control de Chrome se detuvo
porque no pudo determinar con suficiente confianza la URL actual. No se añadieron comidas
durante esta ejecución ni se obtuvo una captura del panel Network.

| Caso solicitado | Estado | Evidencia y límites |
|---|---|---|
| Buscar «yogur griego», mostrar primero catálogo y abrir un producto comercial mediante el botón | PENDIENTE manual | La plantilla y el componente consultan alimentos al escribir y productos al pulsar. La suite automatizada comprueba esta separación con el texto «yogur» y API simulada; no prueba resultados reales para «yogur griego». |
| Añadir el producto a la merienda | PENDIENTE manual | Los tests de registro por `alimentoId` y por `codigoBarras` pasan, pero no se ha guardado ni comprobado una merienda real desde el navegador. |
| Buscar un código conocido en `/productos` | PENDIENTE manual | No se ha consultado un código real. No se considera evidencia el código ficticio `12345678` de los tests. |
| Verificar en Network que escribir no consulta `/productos` | PENDIENTE Network / OK automatizado | `productos.spec.ts` exige ausencia de petición a `/api/v1/productos` al escribir y su presencia solo tras pulsar el botón. No se pudo inspeccionar Network en Chrome. |
| `npm run build` mediante `npm.cmd` | OK con aviso | Código 0; paquete inicial 518,24 kB (18,24 kB sobre el presupuesto de aviso de 500 kB). |
| `npm test -- --watch=false` mediante `npm.cmd` | OK tras corrección | 620 tests aprobados en 79 archivos, código 0, duración 73,78 s. Se actualizó la expectativa del menú móvil para incluir «Productos», se comprobó su enlace a `/productos` y se esperó a estabilizar el cierre de sesión. No aparece NG0953 en esta ejecución. |

La primera ejecución de tests dentro del sandbox falló en la compilación por rutas de
fuentes inválidas que combinaban el directorio virtual del sandbox y la ruta absoluta `D:`.
Se repitió fuera del sandbox: compiló y ejecutó los 620 tests, inicialmente con un fallo de
expectativa del menú (619 OK y 1 KO). Tras corregir `shell.spec.ts`, la suite completa pasa.
No se modificó el código de la aplicación para ocultar el fallo. Las comprobaciones manuales
pendientes de navegador siguen pendientes.

## Comprobación del escáner · 27/11/2026

Frontend reconstruido con `docker compose up -d --build` y backend local mediante
`BACKEND_URL=http://host.docker.internal:8080`. La imagen anterior no reconocía `/escaner`;
la reconstruida abre la ruta después del login con la cuenta administradora de pruebas.

| Comprobación | Resultado | Evidencia |
|---|---|---|
| `npm run build` mediante `npm.cmd` | OK con aviso | Código 0; paquete inicial 518,36 kB, 18,36 kB sobre el presupuesto de aviso. La imagen de producción también compila. |
| `npm test -- --watch=false` mediante `npm.cmd` | OK tras corrección | 629 tests en 81 archivos aprobados; código 0, duración 97,41 s. |
| Menú móvil de registro | Corregido | La primera suite tuvo 628 OK y 1 KO: esperaba dos opciones y faltaba Escanear código. Se actualizó `shell.spec.ts` y se comprobó el enlace `/escaner`. |
| Introducción manual en `/escaner` | OK en navegador | Introducir código retira el visor y muestra formulario. `123` muestra el error de 8–14 dígitos; `3017624010701` devuelve Nutella, 539 kcal/100 g, con ficha, alérgenos y formulario para añadir a comida. No se guardó ninguna comida en esta comprobación. |
| Permiso denegado | OK automatizado / PENDIENTE real | Tests simulan `NotAllowedError`, comprueban permiso-denegado, retirada del lector, aviso y formulario manual. No se pudo accionar el aviso real de permiso desde el navegador integrado. |
| Webcam con código físico | No ejecutado | Se eligió la alternativa manual autorizada. El visor del navegador integrado no reprodujo vídeo; no se considera evidencia de lectura física. |

La denegación simulada no sustituye la comprobación del permiso en un navegador real.
Durante `npm ci` de Docker aparece un aviso de motor: `@zxing/library@0.23.0` declara
Node >=24 y la imagen usa Node 22. La instalación y la compilación terminaron con código 0;
queda registrada la discrepancia de versiones.

## Comprobación A2–A3 · Recetas · 27/11/2026

Prueba sobre el frontend de producción actualizado en Docker, con administrador local.

| Caso | Resultado | Evidencia |
|---|---|---|
| Buscar chicken y seleccionar Pollo | OK tras corrección | La API rechazaba `categoria=Pollo`: requiere UUID. Se cambió el valor del chip de `nombre` a `id`, conservando la etiqueta visible. Tests verifican ID en la URL y en la petición. |
| ≤ 600 kcal y recarga con filtros | OK | `/recetas?q=chicken&categoria=c0000000-0000-0000-0001-000000000007&maxKcal=600` conserva texto, Pollo seleccionado y 600 al recargar. Respuesta sin resultados; no error 400. |
| Importar una de TheMealDB y marcar favorita | OK sin filtro calórico | Chicken Handi (TheMealDB 52795) pasa de cálculo pendiente a detalle local `c0a8e001-a21b-1f4d-81a2-1c2309f80013`. Favorita permanece activa tras recargar y volver al listado. No se pudo hacer esta secuencia manteniendo ≤600: las recetas externas pendientes no tienen nutrición para cumplir el filtro. |
| Cálculo incompleto y motivo de acciones desactivadas | OK | Chicken Handi muestra 82 % de la masa, 12 de 16 ingredientes resueltos. Registrar como comida y Añadir al plan están deshabilitados y enlazados por `aria-describedby` al motivo visible. |
| Ver cómo se calcula | OK en receta incompleta | Abre diálogo con gramos, conversión y fuente por ingrediente. No se consideran validados los totales de una receta completa. |
| Cambiar a 2 raciones | OK en receta propia incompleta | Pollo a la plancha con arroz y brócoli cambia pollo 150→300 g, arroz 180→360 g, brócoli 150→300 g y aceite 10→20 g. Sigue incompleta. |
| Receta completa, registro y origen Receta en historial | OK con receta sintética autorizada | Creada mediante API local tras autorización explícita: Comprobacion A3 platano 20261127 (`c0a8e001-a21b-1f4d-81a2-1c27fcc0002e`), 100 g de plátano y una ración base, estado COMPLETO y 100 %. En navegador: 2 raciones muestran 200 g, desglose con fuente ADMIN y 88 kcal/ración. En el diálogo se seleccionan también 2 raciones y Merienda; el historial muestra origen Receta y 175 kcal. |
| `npm run build` mediante `npm.cmd` | OK con aviso | Tras la corrección, código 0; inicial 519,38 kB, 19,38 kB sobre presupuesto de aviso. Imagen Docker reconstruida y arrancada correctamente. |
| `npm test -- --watch=false` mediante `npm.cmd` | OK | Suite tras corregir categoría: 670 tests aprobados en 86 archivos, código 0; 94,30 s. |

La receta propia examinada muestra cuatro ingredientes resueltos pero completitud de masa
0 % y estado incompleto. Se registra como incidencia de datos/cálculo del entorno, sin
forzar su estado a completo ni modificar el backend. Los tests con API simulada cubren el
registro con origen de receta. El caso real se completó después con la receta sintética autorizada.

## Comprobación · Paso 31 · 27/11/2026

**Automatizada: OK. Manual: pendiente por indisponibilidad del control del navegador.**
La apertura de `/planificador` falló antes de devolver una pestaña: timeout de `service_info`.
Se reintentó y se reinició la sesión de control; el intento posterior también agotó el tiempo.
No se pudo observar ni modificar un menú real. No se consideran aprobados los casos manuales
por el hecho de que existan tests con respuestas simuladas.

| Comprobación | Resultado | Evidencia |
|---|---|---|
| Añadir una receta a una franja vacía | PENDIENTE manual | Tests de drawer, búsqueda y POST pasan; falta ejecutar y comprobar persistencia en un menú real. |
| Sustituir por una alternativa | PENDIENTE manual | Test de hasta tres alternativas y sustitución mediante PUT pasa; falta elección y persistencia reales. |
| Arrastrar una comida a otro día | PENDIENTE manual | Tests de evento de CDK drop, actualización optimista y reversión pasan. No se realizó un arrastre físico en navegador. |
| Bloquear dos comidas y regenerar conservándolas | PENDIENTE manual | Tests de bloqueo PUT y aplicación de respuesta de regeneración pasan. El test usa un servicio simulado: no demuestra por sí solo que el backend conserve dos comidas concretas. |
| Pedir y aplicar sugerencia IA | PENDIENTE manual | Tests de petición, aplicación válida y errores pasan con API simulada; no se pidió ni aplicó una sugerencia real. |
| Registrar una comida de hoy desde planificador | PENDIENTE manual | Tests de diálogo, hora, registro, aviso y recarga pasan. No se creó una comida real en esta comprobación. |
| Registrar otra comida de hoy desde dashboard | PENDIENTE manual | No se pudo abrir y operar el dashboard para verificar el registro real y sus totales. |
| `npm run build` mediante `npm.cmd` | OK con avisos | Código 0. Inicial 521,31 kB (presupuesto de aviso 500 kB). `buscador-productos.component.scss`: 5,01 kB (presupuesto 4 kB). |
| `npm test -- --watch=false` mediante `npm.cmd` | OK | 752 tests aprobados en 91 archivos, código 0, duración 124,74 s. |
| `docker compose up -d --build` | OK con avisos | Imagen actual compilada y contenedor recreado y arrancado, con proxy al backend local mediante `BACKEND_URL=http://host.docker.internal:8080`. |

No se modificó el código de la aplicación ni los tests durante esta ejecución: la suite ya
pasaba. La aceptación manual del paso 31 sigue pendiente hasta recuperar el navegador.

## Ampliación · Plan de casos manuales (paso 36)

**Estado: 36 casos nuevos (PM-38 a PM-73), todos PENDIENTES de ejecución manual.**

Los bloques siguientes amplían el plan con los módulos de la Ampliación. Se ejecutan como en el
paso 25: imagen Docker del frontend (`docker compose up -d --build`) contra el backend completo,
con una **cuenta nueva** (verificada y, donde se indica, sin verificar) y con el **administrador
local**. Antes de marcar un caso como OK hay que verlo en el navegador. Los tests con API simulada
(columna *Observaciones*) muestran que la lógica está cubierta, pero no cuentan como evidencia
manual (criterio ya aplicado en las comprobaciones A1, A2–A3 y Paso 31).

**Cómo provocar los fallos de proveedor y los límites** (en el entorno de pruebas, y
deshaciéndolo después como en PM-23/25):

- **Open Food Facts o TheMealDB no disponibles:** cortar la salida a Internet del backend (por
  ejemplo, `docker network disconnect` de la red con salida, o arrancarlo sin red) y repetir la
  búsqueda **sin caché**: el backend guarda Open Food Facts 1 hora, así que hay que buscar un texto
  nuevo. La respuesta esperada es **200** con la cabecera `X-Proveedor-No-Disponible`: lista vacía
  en `GET /productos` y `themealdbDisponible = false` en `GET /recetas`. `GET /productos/{código}`
  y la importación de TheMealDB responden **503**.
- **429:** los límites son por día o por hora (docs/api/sesion-errores.md §2.3). El asistente
  admite 50 mensajes al día y el reenvío de verificación 3 por hora. Para no esperar, se puede
  bajar el límite en la configuración local del backend, si la tiene, o inyectar un `return 429`
  con `Retry-After` en el nginx del contenedor, solo para la ruta probada.
- **Email sin verificar:** registrar una cuenta nueva y no abrir el enlace de Mailpit.

## Productos y escáner

| ID | Historia de usuario | Pasos | Resultado esperado | Resultado (OK/KO) | Observaciones |
|---|---|---|---|---|---|
| PM-38 | HU-22 · Buscar productos comerciales | Abre `/productos` y escribe «yogur griego». Con DevTools › Network abierto, espera a que salgan los resultados y pulsa después **Buscar en productos comerciales**. | Mientras se escribe solo se consulta el catálogo (`/alimentos`), en ningún caso `/productos`. Al pulsar el botón aparece la lista de Open Food Facts, con imagen, marca y kcal/100 g, y **Ver más productos** si hay más de 20. | PENDIENTE | Automatizado: `productos.spec.ts` comprueba que no se pide `/productos` al escribir. Pendiente de la A1: falta la búsqueda real y la captura de Network. |
| PM-39 | HU-22 · Ficha y registro de un producto | Elige un producto de la lista. Revisa la ficha y añádelo a la **Merienda** con 125 g. Abre el historial. | La ficha muestra los nutrientes por 100 g, la ración, los ingredientes, los alérgenos (con aviso si chocan con tus restricciones) y la atribución «Datos de Open Food Facts (ODbL)» con enlace. La comida se guarda y en el historial aparece el producto. | PENDIENTE | Pendiente de la A1. |
| PM-40 | HU-22 · RF-45 · Open Food Facts no disponible | Corta la salida a Internet del backend (ver «Cómo provocar…»). En `/productos`, busca un texto nuevo y pulsa **Buscar en productos comerciales**. Comprueba la respuesta en Network. | La respuesta es 200 con `X-Proveedor-No-Disponible` y lista vacía. Sale el aviso informativo «Productos comerciales no disponibles ahora mismo. Puedes seguir usando tu catálogo.», no un error. No se ofrece «Ver más». El catálogo sigue buscando al escribir. | PENDIENTE | La cabecera la lee `ProductosService.buscar` (`proveedorDisponible`). Devolver la red del backend al terminar. |
| PM-41 | HU-23 · Código de barras manual | Abre `/escaner` → **Introducir el código**. Escribe `123` y después `3017624010701`. Añade el producto a una comida. | Con `123` sale el error de 8 a 14 dígitos y no se hace la petición. Con el código válido sale la ficha compacta con la atribución de Open Food Facts y el formulario para añadirlo a una comida. La comida se guarda. | PENDIENTE | La comprobación del escáner del 27/11 vio la ficha de Nutella, pero no guardó la comida. |
| PM-42 | HU-23 · Producto inexistente | En `/escaner`, introduce un código válido que no exista (por ejemplo, `00000000`). | Aparece «No encontramos este producto», con las opciones de buscarlo por nombre o crear un alimento propio. No se guarda nada. | PENDIENTE | — |
| PM-43 | HU-23 · Cámara | En un móvil o un portátil con cámara, abre `/escaner`. Deniega el permiso una vez y, después, concédelo y enfoca un código de barras real. | Si se deniega, se explica cómo activar el permiso y se pasa a la introducción manual. Con permiso, el visor lee el código y abre la ficha sin pulsar nada más. | PENDIENTE | Automatizado: `escaner.component.spec.ts` simula `NotAllowedError`. Pendiente del 27/11: lectura física y permiso real. |
| PM-44 | HU-23 · RF-45 · Escáner sin proveedor | Con la red del backend cortada, introduce en `/escaner` un código que **no** esté en el catálogo. | Respuesta 503 (`PROVEEDOR_NO_DISPONIBLE`): sale un mensaje comprensible y, si llega `Retry-After`, el tiempo de espera («Inténtalo de nuevo en…»). Un código que ya está en el catálogo sigue encontrándose. | PENDIENTE | — |

## Recetas

| ID | Historia de usuario | Pasos | Resultado esperado | Resultado (OK/KO) | Observaciones |
|---|---|---|---|---|---|
| PM-45 | HU-24 · Explorar recetas | En `/recetas`, busca «chicken», elige la categoría Pollo y pon un máximo de 600 kcal. Recarga la página y vuelve atrás. | Los filtros viajan en la URL y se conservan al recargar y al volver. Aparecen los bloques «Nuestro catálogo» y «De TheMealDB». Al pie, la atribución «Recetas e imágenes de TheMealDB». | PENDIENTE | La comprobación A2–A3 dio OK tras la corrección del filtro de categoría. Repetir con la imagen final. |
| PM-46 | HU-24 · Importar y favoritas | Abre una receta de TheMealDB que no esté importada. Márcala como favorita y abre la pestaña **Favoritas**. | Durante la importación, la tarjeta muestra un spinner. El detalle muestra el badge «Receta original en inglés», las raciones supuestas y la atribución «Receta e imagen: TheMealDB». La favorita aparece en su pestaña y sigue ahí después de recargar. | PENDIENTE | La comprobación A2–A3 lo vio con Chicken Handi. |
| PM-47 | HU-24 · Cálculo y raciones | En una receta con cálculo **incompleto**, revisa los botones. Pulsa **Ver cómo se calcula**. Cambia a 2 raciones en una receta completa. | Con el cálculo incompleto, «Registrar como comida» y «Añadir al plan» están desactivados y su motivo se ve en pantalla. El desglose muestra los gramos, la conversión y la fuente (catálogo o USDA) de cada ingrediente, con la nota de USDA FoodData Central. Las cantidades se duplican. | PENDIENTE | — |
| PM-48 | HU-24 · RF-45 · TheMealDB no disponible | Con la red del backend cortada, busca en `/recetas` un texto que no se haya buscado antes. Abre después una receta de TheMealDB que no esté importada. | La búsqueda responde 200 con `themealdbDisponible = false`: sale el aviso «TheMealDB no está disponible ahora: mostramos solo nuestras recetas» y el catálogo propio se ve con normalidad. Al abrir una receta externa sin importar, sale el toast «TheMealDB no está disponible ahora» y no se navega. | PENDIENTE | Mismo aviso en Registrar comida › Recetas y en Admin › Recetas (PM-61). |
| PM-49 | HU-25 · Registrar una receta | Desde el detalle de una receta completa, pulsa **Registrar como comida**, elige 2 raciones y Cena. Abre el historial. | La comida se crea con el origen «Receta» y las kcal de 2 raciones. | PENDIENTE | La comprobación A2–A3 lo vio con una receta sintética. |

## Planificador

| ID | Historia de usuario | Pasos | Resultado esperado | Resultado (OK/KO) | Observaciones |
|---|---|---|---|---|---|
| PM-50 | HU-12 · Generar menú | Con una alergia estricta (gluten) en el perfil, abre `/planificador` en una semana vacía y pulsa **Generar menú**. | Se genera la semana con recetas aptas para cada franja, que respetan la alergia. «Por qué este menú» explica los criterios. La semana va en la URL (`?semana=`) y se conserva al recargar. | PENDIENTE | — |
| PM-51 | HU-13 · Añadir y sustituir | Añade una receta a una franja vacía desde el drawer. Después, en otra comida, pulsa **Sustituir** y elige una alternativa. | El drawer solo muestra recetas compatibles y, si alguna es de TheMealDB, la atribución al pie. Los cambios se guardan y se conservan al recargar. | PENDIENTE | Pendiente del Paso 31. |
| PM-52 | HU-13 · Mover y bloquear | Arrastra una comida a otro día. Mueve otra con el teclado usando **Mover a…**. Bloquea dos comidas y pulsa **Regenerar**. | Los dos métodos mueven la comida y el cambio persiste. Al regenerar se conservan las dos comidas bloqueadas. | PENDIENTE | Pendiente del Paso 31. |
| PM-53 | HU-13 · Sugerencia IA | En una comida, pulsa **Pedir sugerencia IA**, escribe una preferencia y aplícala. | La tarjeta «Sugerencia IA» muestra el ajuste con las cifras calculadas por NutriSport. Al aplicarla, la comida pasa a usar una receta propia derivada. | PENDIENTE | — |
| PM-54 | HU-13 · Sugerencia sin email verificado | Con una cuenta **sin verificar**, pide una sugerencia IA. | Sale el aviso de verificar el email con **Reenviar**, y no la tarjeta de error. Al reenviar llega el correo a Mailpit. | PENDIENTE | Automatizado: `planificador-ia.spec.ts`. |
| PM-55 | HU-13 · IA no disponible | Provoca un 503 en `/sugerencia-ia`, deteniendo la IA o inyectándolo en nginx. | Sale «La IA no está disponible ahora» y el menú sigue siendo editable. | PENDIENTE | — |
| PM-56 | HU-13 · Registrar desde el plan | En el menú ⋯ de una comida de hoy, pulsa **Registrar como consumida** y confirma la hora. Abre `/inicio`. | La comida se registra con su hora y el dashboard suma sus kcal. En el plan queda marcada como consumida y su menú ya no ofrece volver a registrarla. | PENDIENTE | Pendiente del Paso 31. |

## Lista de la compra

| ID | Historia de usuario | Pasos | Resultado esperado | Resultado (OK/KO) | Observaciones |
|---|---|---|---|---|---|
| PM-57 | HU-14 · Generar lista | En el planificador, pulsa **Lista de la compra**, elige un rango de 3 días y genera la lista. | Se abre `/compra/:id` con los ingredientes sumados y agrupados por sección, y con el rango del menú de origen. | PENDIENTE | — |
| PM-58 | HU-14 · Marcar y editar | Marca 3 productos como comprados, oculta los comprados, añade un producto a mano en «Otros» y renombra la lista. Recarga. | Marcar un producto lo tacha y lo baja al final al momento. El progreso «3 / N» se actualiza. Los cambios se conservan al recargar. | PENDIENTE | — |
| PM-59 | HU-25 · Receta a la lista | Desde el detalle de una receta, añade sus ingredientes a una lista que ya exista. | Los ingredientes se suman a los productos que ya había y no se duplican. | PENDIENTE | — |
| PM-60 | HU-14 · Completar y compartir | Pulsa **Completar** y, después, **Compartir**, en un móvil y en un escritorio. Elimina otra lista desde `/compra`. | La lista lleva el badge «Completada». En el móvil se abre la hoja de compartir del sistema; en el escritorio se copia el texto. Al eliminar se pide confirmación. | PENDIENTE | — |

## Administración de recetas

| ID | Historia de usuario | Pasos | Resultado esperado | Resultado (OK/KO) | Observaciones |
|---|---|---|---|---|---|
| PM-61 | HU-18 · Recetas del catálogo | Con el administrador, abre `/admin/catalogo/recetas` y busca «chicken». Repite con la red del backend cortada. | La tabla mezcla las recetas propias con las de TheMealDB («Sin importar»), con la atribución de TheMealDB al pie. Sin red sale el aviso «TheMealDB no está disponible ahora: se muestran solo las recetas del catálogo». | PENDIENTE | — |
| PM-62 | HU-18 · Crear y publicar | Crea una receta propia con 3 ingredientes y 2 pasos. Deja un gramo vacío para ver el error y después corrígelo. Publícala con 2 raciones y las franjas Comida y Cena. | El error aparece junto al campo del ingrediente. La receta se guarda y se publica, y aparece en `/recetas` y en el drawer del planificador para esas franjas. | PENDIENTE | — |
| PM-63 | HU-18 · Emparejar ingredientes | En `/admin/ingredientes`, filtro Pendientes, empareja un ingrediente con un alimento del catálogo. | Un toast indica las recetas recalculadas y el ingrediente sale de la cola. Los emparejamientos con confianza menor de 0,6 llevan aviso. La atribución de TheMealDB se ve al pie. | PENDIENTE | — |
| PM-64 | HU-18 · Permisos | Con la cuenta de deportista, abre `/admin/catalogo/recetas` y `/admin/ingredientes`. | Se redirige a «Sin permiso» y no se hace ninguna petición de administración. | PENDIENTE | — |

## Estadísticas

| ID | Historia de usuario | Pasos | Resultado esperado | Resultado (OK/KO) | Observaciones |
|---|---|---|---|---|---|
| PM-65 | HU-15 · Periodo y comparación | En `/estadisticas`, cambia a 4 semanas con agrupación Semana y activa **Comparar con el periodo anterior**. Recarga. | Los KPIs muestran su variación. Los gráficos de energía, macros, peso, adherencia y reparto se actualizan. Los filtros viajan en la URL y se conservan al recargar. | PENDIENTE | — |
| PM-66 | HU-15 · Rango personalizado | Elige un rango personalizado de 400 días y luego uno con la fecha de fin anterior a la de inicio. | Se muestra el error junto a las fechas (máximo 366 días, sin fechas futuras, fin igual o posterior al inicio) y no se pide nada hasta corregirlo. | PENDIENTE | — |
| PM-67 | HU-15 · Actividad e insights | Con entrenamientos y comidas en varios días, revisa «Entreno frente a descanso», «Alimentos más consumidos» e insights. Pulsa **Preguntar al asistente** en un insight. | La comparación muestra las dos columnas. La tabla de alimentos lleva el badge de fuente de cada uno y, si alguno es de USDA u Open Food Facts, la atribución al pie. El insight abre el asistente con la pregunta en el borrador. Con los insights desactivados en la cuenta, no se piden. | PENDIENTE | — |
| PM-68 | HU-15 · Sin datos | Abre `/estadisticas` con una cuenta sin registros. | Sale el estado vacío «Aún no hay suficientes datos» con el botón **Registrar comida** y sin errores. | PENDIENTE | — |

## Asistente

| ID | Historia de usuario | Pasos | Resultado esperado | Resultado (OK/KO) | Observaciones |
|---|---|---|---|---|---|
| PM-69 | HU-16 · Conversar | En `/asistente`, pulsa una sugerencia y después pregunta «¿Cuántas proteínas llevo hoy?». Renombra la conversación y archívala. | El primer mensaje crea la conversación y cambia la URL a `/asistente/:id`. La respuesta usa tus datos y se anuncia en la región `aria-live`. El aviso orientativo está siempre visible. El título y el archivado persisten. | PENDIENTE | — |
| PM-70 | HU-16 · RF-32 · Respuesta segura | Pregunta por una dosis de un medicamento o por una conducta de riesgo. | La respuesta es segura, deriva a un profesional y no da instrucciones. | PENDIENTE | — |
| PM-71 | HU-16 · Límite y email | (a) Con una cuenta sin verificar, intenta escribir. (b) Supera el límite diario (o inyecta un 429 con `Retry-After`). (c) Provoca un 503. | (a) El compositor está desactivado, con «Verifica tu email» y **Reenviar**. (b) «Has llegado al límite de 50 mensajes de hoy» con el tiempo de espera, y el compositor desactivado mientras dura. (c) El mensaje queda marcado con **Reintentar** y, al reintentar, no se duplica. | PENDIENTE | Automatizado: `asistente.spec.ts` y `asistente.store.spec.ts`. |

## Exportación

| ID | Historia de usuario | Pasos | Resultado esperado | Resultado (OK/KO) | Observaciones |
|---|---|---|---|---|---|
| PM-72 | HU-21 · RF-05 · Exportar mis datos | En **Configuración › Privacidad**, pulsa **Exportar mis datos**. Abre el JSON y busca `password` y `token`. Revoca el consentimiento y exporta de nuevo. | El botón muestra loading y se descarga `nutrisport-datos-AAAAMMDD.json`, con la cuenta y los consentimientos, el perfil, las comidas, los entrenamientos, los pesos, los menús, las listas, las favoritas, las conversaciones, los análisis (sin imágenes) y los insights. No hay contraseñas ni tokens. Con el consentimiento revocado también funciona. | PENDIENTE | Automatizado: `descarga.spec.ts`, `cuenta.service.spec.ts` y `configuracion.spec.ts`. |
| PM-73 | HU-21 · Exportar sin email verificado | Con una cuenta sin verificar, abre Privacidad. Pulsa **Reenviar** cuatro veces seguidas. | En lugar de la descarga sale «Verifica tu email» con **Reenviar**, y el botón de exportar está desactivado. El cuarto envío en una hora devuelve 429: el aviso «Demasiados envíos» muestra la espera y desactiva el botón. Si la cuenta en memoria estaba desfasada y el servidor responde 403 `EMAIL_NO_VERIFICADO`, el aviso aparece igualmente. | PENDIENTE | El 403 llega como Blob; lo convierten `aApiErrorAsync` y `errorInterceptor` (test en `interceptors.spec.ts`). |

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

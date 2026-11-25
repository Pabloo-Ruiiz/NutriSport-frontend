# NutriSport API · Pantallas, rutas y etiquetas

> Fragmento de `docs/NutriSport_API.md` (la referencia completa). Los números de sección (§) son los de ese documento. Lo común a todos los módulos está en `docs/api/general.md`, `docs/api/sesion-errores.md` y `docs/api/tipos-comunes.md`. Rutas relativas a `/api/v1`; 🔓 = público.

Mapa de rutas del frontend con sus endpoints y etiquetas en castellano de los enumerados.

## §9. Pantallas, rutas y endpoints

Pantallas de `docs/DESIGN.md` §7. Las rutas son las que fija la guía del frontend.

| Ruta | Pantalla (`DESIGN.md`) | Rol | Endpoints principales | Alcance |
|---|---|---|---|---|
| `/login` | 7.1 Login | público | `POST /auth/login` | MVP |
| `/registro`, `/registro/revisa-tu-email` | 7.2 Registro | público | `POST /auth/registro`, `POST /auth/reenviar-verificacion` | MVP |
| `/verificar-email` | 7.18 Verificar email | público | `POST /auth/verificar-email` | MVP |
| `/recuperar-password`, `/restablecer-password` | 7.18 Recuperar contraseña | público | `POST /auth/recuperar-password`, `POST /auth/restablecer-password` | MVP |
| `/bienvenida` | 7.3 Configuración inicial | deportista | `GET /entrenamientos/tipos`, `GET /categorias?tipo=ALIMENTO`, `GET /alimentos`, `PUT /perfil`, `PUT /perfil/preferencias`, `GET /perfil/objetivos`, `PUT /perfil/objetivos` | MVP |
| `/inicio` | 7.4 Dashboard | deportista | `GET /seguimiento/resumen`, `GET /seguimiento/peso`, `GET /comidas?desde=&hasta=`, `PUT /entrenamientos/{id}`, `GET /seguimiento/insights` (Ampliación) | MVP |
| `/perfil` | 7.5 Mi perfil | deportista | `/perfil`, `/perfil/preferencias`, `/perfil/objetivos`, `DELETE /perfil/objetivos/manuales`, `POST /seguimiento/peso` | MVP |
| `/comidas/nueva`, `/comidas/:id/editar` | 7.6 Registro de comidas | deportista | `GET /alimentos`, `/alimentos/recientes`, `/alimentos/frecuentes`, `GET /alimentos/{id}`, `POST /comidas`, `PUT /comidas/{id}`, `POST /alimentos` | MVP |
| `/comidas` | 7.9 Historial | deportista | `GET /comidas`, `GET /comidas/{id}`, `POST /comidas/{id}/duplicar`, `DELETE /comidas/{id}` | MVP |
| `/comidas/foto`, `/comidas/foto/:id` | 7.7 y 7.8 Foto y resultado | deportista | `POST /analisis/imagenes`, `GET /analisis/{id}`, `GET /analisis/{id}/imagen`, `POST /analisis/{id}/confirmar`, `POST /analisis/{id}/descartar` | MVP |
| `/mis-alimentos` | (7.6 "Mis alimentos") | deportista | `POST/PUT/DELETE /alimentos`, `GET /categorias?tipo=ALIMENTO` | MVP |
| `/actividad` | 7.13 Actividad | deportista | `/entrenamientos`, `/entrenamientos/tipos`, `/entrenamientos/relacion-nutricion` (Ampliación) | MVP |
| `/configuracion/...` | 7.16 Configuración | deportista | `/cuenta`, `/cuenta/password`, `/cuenta/email`, `/cuenta/consentimiento-salud`, `DELETE /cuenta`, `POST /auth/logout-todas`, `GET /cuenta/exportacion` (Ampliación) | MVP |
| `/admin/usuarios` | 7.17 Usuarios | admin | `/admin/usuarios` | MVP |
| `/admin/catalogo/...` | 7.17 Catálogo | admin | `/admin/alimentos`, `/admin/alimentos/importar`, `/admin/categorias` | MVP |
| `/productos` | 7.19 Buscador de productos | deportista | `GET /alimentos`, `GET /productos`, `GET /productos/{codigoBarras}`, `POST /comidas` | Ampliación |
| `/escaner` | 7.20 Escáner | deportista | `GET /productos/{codigoBarras}`, `POST /comidas` | Ampliación |
| `/recetas`, `/recetas/:id` | 7.21 y 7.22 Recetas | deportista | `/recetas`, `/recetas/categorias`, `/recetas/{id}`, `/recetas/{id}/nutricion`, `/recetas/{id}/relacionadas`, `/recetas/{id}/favorita`, `/recetas/externas/themealdb/{idMeal}`, `POST /comidas/desde-receta` | Ampliación |
| `/planificador` | 7.10 y 7.23 Planificador | deportista | `/menus/**`, `GET /menus/recetas-disponibles` | Ampliación |
| `/compra`, `/compra/:id` | 7.12 Lista de la compra | deportista | `/listas-compra/**` | Ampliación |
| `/estadisticas` | 7.14 Estadísticas | deportista | `/seguimiento/estadisticas`, `/seguimiento/comparativa`, `/seguimiento/peso`, `/seguimiento/insights`, `/entrenamientos/relacion-nutricion` | Ampliación |
| `/asistente`, `/asistente/:id` | 7.15 Asistente IA | deportista | `/asistente/**` | Ampliación |
| `/admin/recetas`, `/admin/ingredientes` | 7.17 Catálogo (recetas) | admin | `/admin/recetas`, `/admin/mapeos-ingredientes` | Ampliación |

## §10. Textos y etiquetas de los enumerados

Los valores viajan en MAYÚSCULAS; la interfaz muestra estas etiquetas (mapas `Record<Enum, string>` en `core/models/etiquetas.ts`):

| Enumerado | Etiquetas |
|---|---|
| `TipoComida` | DESAYUNO Desayuno · MEDIA_MANANA Media mañana · COMIDA Comida · MERIENDA Merienda · CENA Cena · PRE_ENTRENO Pre-entreno · POST_ENTRENO Post-entreno · OTRO Otro |
| `ObjetivoDeportivo` | PERDER_GRASA Perder grasa · MANTENER Mantener · GANAR_MUSCULO Ganar músculo · RENDIMIENTO Rendimiento · COMPETICION Preparar una competición |
| `NivelActividad` (fuera del entreno) | SEDENTARIO Sedentario · LIGERO Ligero · MODERADO Moderado · ALTO Alto |
| `Sexo` | HOMBRE Hombre · MUJER Mujer |
| `Intensidad` | BAJA Baja · MEDIA Media · ALTA Alta |
| `EstadoEntrenamiento` | PLANIFICADO Planificado · REALIZADO Realizado · OMITIDO Omitido |
| `OrigenComida` | MANUAL Manual · FOTO Foto · PLAN Plan · RECETA Receta · COPIA Copia · CODIGO_BARRAS Código de barras |
| `Alergeno` (14 de declaración obligatoria) | GLUTEN Gluten · CRUSTACEOS Crustáceos · HUEVOS Huevos · PESCADO Pescado · CACAHUETES Cacahuetes · SOJA Soja · LACTEOS Lácteos · FRUTOS_DE_CASCARA Frutos de cáscara · APIO Apio · MOSTAZA Mostaza · SESAMO Sésamo · SULFITOS Sulfitos · ALTRAMUCES Altramuces · MOLUSCOS Moluscos |
| `Dieta` | VEGETARIANA Vegetariana · VEGANA Vegana · PESCETARIANA Pescetariana · HALAL Halal · KOSHER Kosher (estas dos no se filtran automáticamente) |
| `TipoPreferencia` | ALERGIA Alergia · INTOLERANCIA Intolerancia · DIETA Dieta · RECHAZO No me gusta · FAVORITO Favorito |
| `Severidad` | ESTRICTA Estricta (avisa y excluye) · PREFERENCIA Preferencia |
| `Preparacion` | CRUDO Crudo · COCIDO Cocido · PLANCHA A la plancha · FRITO Frito · HORNO Al horno · ENVASADO Envasado · OTRA Otra |
| `FuenteAlimento` | BEDCA BEDCA · USDA USDA · OPEN_FOOD_FACTS Open Food Facts · ADMIN NutriSport · USUARIO Propio · OCR Etiqueta |
| `EstadoAnalisis` | PENDIENTE En cola · PROCESANDO Analizando · COMPLETADO Listo para revisar · FALLIDO No se pudo analizar · CONFIRMADO Guardado · DESCARTADO Descartado |
| `EstadoNutricional` | COMPLETO Cálculo completo · APROXIMADO Cálculo aproximado · INCOMPLETO Cálculo incompleto |
| `EstadoConversion` | EXACTA exacta · ESTIMADA estimada · DESPRECIABLE despreciable · SIN_DATOS sin datos |
| `EstadoMenu` | BORRADOR Borrador · ACTIVO Activo · ARCHIVADO Archivado |
| `UnidadCompra` | G g · KG kg · ML ml · L l · UD ud. |
| `Rol` · `EstadoUsuario` | DEPORTISTA Deportista · ADMIN Administrador · ACTIVO Activo · BLOQUEADO Bloqueado · ELIMINADO Eliminado |
| `SeveridadInsight` | INFO Información · POSITIVO Bien hecho · ADVERTENCIA A revisar |

Convenciones de formato (`DESIGN.md` §11): decimales con coma (`1,5 kg`), miles con punto (`2.450 kcal`), fechas `sáb. 21 nov`, horas de 24 h, unidad separada por un espacio (`112 g`). En pantalla, los carbohidratos se llaman **"Hidratos"** ("HC" solo en espacios compactos).

import {
  LucideActivity,
  LucideApple,
  LucideBot,
  LucideCalendar,
  LucideCamera,
  LucideChartColumn,
  LucideCheck,
  LucideChevronDown,
  LucideChevronLeft,
  LucideChevronRight,
  LucideChevronsUpDown,
  LucideCircleCheck,
  LucideCloudOff,
  LucideCircleExclamationPoint,
  LucideCoffee,
  LucideCopy,
  LucideDatabase,
  LucideDumbbell,
  LucideDownload,
  LucideEllipsis,
  LucideEye,
  LucideEyeOff,
  LucideHouse,
  LucideInfo,
  LucideLibrary,
  LucideLock,
  LucideLogOut,
  LucideMailCheck,
  LucideMenu,
  LucideMinus,
  LucideMoon,
  LucidePencil,
  LucidePlus,
  LucideScale,
  LucideScanBarcode,
  LucideSearch,
  LucideSettings,
  LucideShieldCheck,
  LucideShoppingBasket,
  LucideSparkles,
  LucideStar,
  LucideTrash,
  LucideTriangleExclamationPoint,
  LucideUser,
  LucideUsers,
  LucideUtensils,
  LucideX,
  LucideZap,
  lucideLegacyIcon,
} from '@lucide/angular';

/**
 * Iconos de Lucide que usa la aplicación (DESIGN.md §4). Se registran una vez en app.config.ts con
 * provideLucideIcons y se pintan por nombre: <svg lucideIcon="coffee" aria-hidden="true"></svg>.
 * Solo se incluyen en el bundle los iconos de esta lista. Para usar uno nuevo, añádelo aquí.
 *
 * En @lucide/angular, trash-2, triangle-alert y circle-alert se llaman trash, triangle-exclamation-point
 * y circle-exclamation-point; los nombres antiguos siguen funcionando como alias.
 */
export const ICONOS_APP = [
  // Dominio (DESIGN.md §4)
  LucideCoffee,
  LucideUtensils,
  LucideMoon,
  LucideApple,
  LucideZap,
  LucideDumbbell,
  LucideCamera,
  LucideSparkles,
  LucideScanBarcode,
  LucideShoppingBasket,
  LucideScale,
  LucideActivity,
  LucideShieldCheck,
  LucideMailCheck,
  // Interfaz
  LucidePlus,
  LucideX,
  LucideCheck,
  LucideChevronDown,
  LucideChevronLeft,
  LucideChevronRight,
  LucideMenu,
  LucideMinus,
  LucideLogOut,
  LucideUser,
  LucideSettings,
  LucideHouse,
  LucideChartColumn,
  LucideBot,
  LucideCalendar,
  LucideTrash,
  LucidePencil,
  LucideCopy,
  LucideDownload,
  LucideSearch,
  LucideInfo,
  LucideTriangleExclamationPoint,
  LucideCircleExclamationPoint,
  LucideCircleCheck,
  LucideCloudOff,
  LucideEye,
  LucideEyeOff,
  LucideLock,
  LucideStar,
  LucideEllipsis,
  // Navegación (core/layout/navegacion.ts)
  LucideUsers,
  LucideLibrary,
  LucideChevronsUpDown,
  // Procedencia de los datos (ns-source-badge)
  LucideDatabase,
  // Registro con foto (ns-dropzone y features/analisis). Como datos con lucideLegacyIcon: cada
  // componente Lucide* compila su propia plantilla (~4 kB en el bundle inicial); así son ~200 bytes.
  lucideLegacyIcon('upload', [
    ['path', { d: 'M12 3v12' }],
    ['path', { d: 'm17 8-5-5-5 5' }],
    ['path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }],
  ]),
  lucideLegacyIcon('refresh-cw', [
    ['path', { d: 'M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8' }],
    ['path', { d: 'M21 3v5h-5' }],
    ['path', { d: 'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16' }],
    ['path', { d: 'M8 16H3v5' }],
  ]),
  lucideLegacyIcon('circle-dashed', [
    ['path', { d: 'M10.1 2.182a10 10 0 0 1 3.8 0' }],
    ['path', { d: 'M13.9 21.818a10 10 0 0 1-3.8 0' }],
    ['path', { d: 'M17.609 3.721a10 10 0 0 1 2.69 2.7' }],
    ['path', { d: 'M2.182 13.9a10 10 0 0 1 0-3.8' }],
    ['path', { d: 'M20.279 17.609a10 10 0 0 1-2.7 2.69' }],
    ['path', { d: 'M21.818 10.1a10 10 0 0 1 0 3.8' }],
    ['path', { d: 'M3.721 6.391a10 10 0 0 1 2.7-2.69' }],
    ['path', { d: 'M6.391 20.279a10 10 0 0 1-2.69-2.7' }],
  ]),
  lucideLegacyIcon('sun', [
    ['circle', { cx: '12', cy: '12', r: '4' }],
    ['path', { d: 'M12 2v2' }],
    ['path', { d: 'M12 20v2' }],
    ['path', { d: 'm4.93 4.93 1.41 1.41' }],
    ['path', { d: 'm17.66 17.66 1.41 1.41' }],
    ['path', { d: 'M2 12h2' }],
    ['path', { d: 'M20 12h2' }],
    ['path', { d: 'm6.34 17.66-1.41 1.41' }],
    ['path', { d: 'm19.07 4.93-1.41 1.41' }],
  ]),
  lucideLegacyIcon('focus', [
    ['circle', { cx: '12', cy: '12', r: '3' }],
    ['path', { d: 'M3 7V5a2 2 0 0 1 2-2h2' }],
    ['path', { d: 'M17 3h2a2 2 0 0 1 2 2v2' }],
    ['path', { d: 'M21 17v2a2 2 0 0 1-2 2h-2' }],
    ['path', { d: 'M7 21H5a2 2 0 0 1-2-2v-2' }],
  ]),
  lucideLegacyIcon('image', [
    ['rect', { width: '18', height: '18', x: '3', y: '3', rx: '2', ry: '2' }],
    ['circle', { cx: '9', cy: '9', r: '2' }],
    ['path', { d: 'm21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21' }],
  ]),
  // Recetas (navegación y filtros del catálogo)
  lucideLegacyIcon('chef-hat', [
    [
      'path',
      {
        d: 'M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z',
      },
    ],
    ['path', { d: 'M6 17h12' }],
  ]),
  lucideLegacyIcon('funnel', [
    [
      'path',
      {
        d: 'M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z',
      },
    ],
  ]),
  // Detalle de receta: tiempo y desglose del cálculo
  lucideLegacyIcon('clock', [
    ['circle', { cx: '12', cy: '12', r: '10' }],
    ['path', { d: 'M12 6v6l4 2' }],
  ]),
  lucideLegacyIcon('list', [
    ['path', { d: 'M3 12h.01' }],
    ['path', { d: 'M3 18h.01' }],
    ['path', { d: 'M3 6h.01' }],
    ['path', { d: 'M8 12h13' }],
    ['path', { d: 'M8 18h13' }],
    ['path', { d: 'M8 6h13' }],
  ]),
  // Planificador: archivar un menú
  lucideLegacyIcon('archive', [
    ['rect', { width: '20', height: '5', x: '2', y: '3', rx: '1' }],
    ['path', { d: 'M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8' }],
    ['path', { d: 'M10 12h4' }],
  ]),
  // Lista de la compra: compartir
  lucideLegacyIcon('share-2', [
    ['circle', { cx: '18', cy: '5', r: '3' }],
    ['circle', { cx: '6', cy: '12', r: '3' }],
    ['circle', { cx: '18', cy: '19', r: '3' }],
    ['line', { x1: '8.59', x2: '15.42', y1: '13.51', y2: '17.49' }],
    ['line', { x1: '15.41', x2: '8.59', y1: '6.51', y2: '10.49' }],
  ]),
  // Recetas favoritas (ns-recipe-card)
  lucideLegacyIcon('heart', [
    [
      'path',
      {
        d: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z',
      },
    ],
  ]),
  // Ordenación de columnas (ns-table, DESIGN.md §5.9)
  // Asistente IA (features/asistente y shared/ui/chat).
  lucideLegacyIcon('send', [
    [
      'path',
      {
        d: 'M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z',
      },
    ],
    ['path', { d: 'm21.854 2.147-10.94 10.939' }],
  ]),
  lucideLegacyIcon('thumbs-up', [
    ['path', { d: 'M7 10v12' }],
    [
      'path',
      {
        d: 'M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z',
      },
    ],
  ]),
  lucideLegacyIcon('thumbs-down', [
    ['path', { d: 'M17 14V2' }],
    [
      'path',
      {
        d: 'M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z',
      },
    ],
  ]),
  lucideLegacyIcon('message-square', [
    ['path', { d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' }],
  ]),
  lucideLegacyIcon('arrow-up-down', [
    ['path', { d: 'm21 16-4 4-4-4' }],
    ['path', { d: 'M17 20V4' }],
    ['path', { d: 'm3 8 4-4 4 4' }],
    ['path', { d: 'M7 4v16' }],
  ]),
  lucideLegacyIcon('arrow-up', [
    ['path', { d: 'm5 12 7-7 7 7' }],
    ['path', { d: 'M12 19V5' }],
  ]),
  lucideLegacyIcon('arrow-down', [
    ['path', { d: 'M12 5v14' }],
    ['path', { d: 'm19 12-7 7-7-7' }],
  ]),
];

/** Nombres de los iconos registrados (para la página de muestra /dev/estilos). */
export const NOMBRES_ICONOS: string[] = ICONOS_APP.map((icono) => ('icon' in icono ? icono.icon : icono).name);

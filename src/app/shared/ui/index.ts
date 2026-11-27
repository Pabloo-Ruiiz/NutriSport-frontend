// Componentes del sistema de diseño (DESIGN.md §5 y §9.5).
// Uso: import { NsButtonComponent, NsFormFieldComponent } from '@shared/ui';
// En código de carga inicial (app.ts, app.config.ts) importa el fichero concreto: el barril no se
// depura bien y añade ~150 kB al bundle inicial. En las features (carga perezosa) no importa.
export * from './button';
export * from './card';
export * from './data';
export * from './feedback';
export * from './form';
export * from './nav';
export * from './overlay';
export * from './chat';

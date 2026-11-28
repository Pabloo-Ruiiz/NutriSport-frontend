import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, afterNextRender, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';

import { NOMBRES_ICONOS } from '@shared/design/iconos';

interface Muestra {
  token: string;
  uso: string;
}

interface Paleta {
  titulo: string;
  muestras: Muestra[];
}

interface Estado {
  nombre: string;
  texto: string;
  fondo: string;
  borde: string;
}

interface EstiloTexto {
  clase: string;
  especificacion: string;
  ejemplo: string;
}

/**
 * Guía visual de los tokens y estilos globales (solo en desarrollo: ruta /dev/estilos).
 * Las muestras usan los tokens --ns-*; el valor que se muestra se lee del CSS en tiempo real.
 */
@Component({
  selector: 'app-estilos',
  imports: [LucideDynamicIcon, RouterLink],
  templateUrl: './estilos.component.html',
  styleUrl: './estilos.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EstilosComponent {
  private readonly documento = inject(DOCUMENT);

  /** Valor calculado de cada token (p. ej. "#087A50"), leído tras el primer render. */
  protected readonly valores = signal<Record<string, string>>({});

  protected readonly paletas: Paleta[] = [
    {
      titulo: 'Lienzo y acromáticos',
      muestras: [
        { token: '--ns-void', uso: 'Void Black: lienzo de la página' },
        { token: '--ns-void-raised', uso: 'Paneles opacos (diálogos, menús)' },
        { token: '--ns-ghost', uso: 'Ghost White: texto principal' },
        { token: '--ns-mist', uso: 'Pale Mist: texto secundario y enlaces' },
        { token: '--ns-fog', uso: 'Fog: contornos de controles' },
        { token: '--ns-smoke', uso: 'Smoke: bordes apagados' },
        { token: '--ns-ash', uso: 'Ash Border: líneas finas' },
      ],
    },
    {
      titulo: 'Acento · Dusk Violet',
      muestras: [
        { token: '--ns-dusk', uso: 'Relleno de la acción principal' },
        { token: '--ns-dusk-hover', uso: 'Hover de la acción principal' },
        { token: '--ns-dusk-active', uso: 'Pressed de la acción principal' },
        { token: '--ns-dusk-light', uso: 'Indicadores, bordes y texto de acento' },
        { token: '--ns-frost', uso: 'Frosted Glass: hover de los botones fantasma' },
      ],
    },
    {
      titulo: 'Datos',
      muestras: [
        { token: '--ns-data-kcal', uso: 'Energía (kcal)' },
        { token: '--ns-data-protein', uso: 'Proteínas' },
        { token: '--ns-data-carbs', uso: 'Hidratos' },
        { token: '--ns-data-fat', uso: 'Grasas' },
        { token: '--ns-data-activity', uso: 'Actividad' },
        { token: '--ns-data-weight', uso: 'Peso' },
      ],
    },
  ];

  protected readonly estados: Estado[] = [
    { nombre: 'Éxito', texto: '--ns-success', fondo: '--ns-success-bg', borde: '--ns-success-border' },
    { nombre: 'Advertencia', texto: '--ns-warning', fondo: '--ns-warning-bg', borde: '--ns-warning-border' },
    { nombre: 'Error', texto: '--ns-error', fondo: '--ns-error-bg', borde: '--ns-error-border' },
    { nombre: 'Información', texto: '--ns-info', fondo: '--ns-info-bg', borde: '--ns-info-border' },
    { nombre: 'IA / estimación', texto: '--ns-accent', fondo: '--ns-ai-bg', borde: '--ns-ai-border' },
  ];

  protected readonly escala: EstiloTexto[] = [
    { clase: 'ns-text-display', especificacion: 'Inter · 36/44 · 800', ejemplo: '2.450 kcal' },
    { clase: 'ns-text-h1', especificacion: 'Inter · 28/36 · 700', ejemplo: 'Tu día de hoy' },
    { clase: 'ns-text-h2', especificacion: 'Inter · 22/30 · 700', ejemplo: 'Comidas de hoy' },
    { clase: 'ns-text-h3', especificacion: 'Inter · 18/26 · 700', ejemplo: 'Entrenamiento' },
    { clase: 'ns-text-card-title', especificacion: 'Inter · 16/24 · 700', ejemplo: 'Desayuno' },
    { clase: 'ns-text-h4', especificacion: 'Inter · 16/24 · 600', ejemplo: 'Añadir alimento' },
    { clase: 'ns-text-metric-xl', especificacion: 'Inter · 32/40 · 800', ejemplo: '1.840' },
    { clase: 'ns-text-metric-lg', especificacion: 'Inter · 24/32 · 700', ejemplo: '112 g' },
    {
      clase: 'ns-text-body-lg',
      especificacion: 'Times · 16/30 · 400',
      ejemplo: 'Hoy vas 320 kcal por debajo de tu objetivo.',
    },
    {
      clase: 'ns-text-body',
      especificacion: 'Inter · 14/20 · 400',
      ejemplo: 'Revisa las cantidades antes de guardar.',
    },
    { clase: 'ns-text-body-strong', especificacion: 'Inter · 14/20 · 600', ejemplo: 'Pechuga de pollo a la plancha' },
    {
      clase: 'ns-text-body-sm',
      especificacion: 'Inter · 13/18 · 400',
      ejemplo: 'Calculado con tu peso y tu actividad.',
    },
    { clase: 'ns-text-caption', especificacion: 'Inter · 12/16 · 500', ejemplo: 'sáb. 21 nov · 08:30' },
    { clase: 'ns-text-overline', especificacion: 'Inter · 12/16 · 600 · mayúsculas', ejemplo: 'Seguimiento' },
    { clase: 'ns-text-label', especificacion: 'Inter · 13/18 · 500', ejemplo: 'Cantidad en gramos' },
  ];

  protected readonly radios = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', 'full'].map((r) => `--ns-radius-${r}`);

  /** Iconos registrados en app.config.ts (shared/design/iconos.ts). */
  protected readonly iconos = NOMBRES_ICONOS;

  protected readonly sombras = ['xs', 'sm', 'md', 'lg', 'xl', 'focus'].map((s) => `--ns-shadow-${s}`);

  constructor() {
    afterNextRender(() => {
      const estilos = getComputedStyle(this.documento.documentElement);
      const tokens = [...this.paletas.flatMap((p) => p.muestras.map((m) => m.token)), ...this.radios, ...this.sombras];
      this.valores.set(Object.fromEntries(tokens.map((t) => [t, estilos.getPropertyValue(t).trim()])));
    });
  }

  protected variable(token: string): string {
    return `var(${token})`;
  }
}

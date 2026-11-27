import { TestBed } from '@angular/core/testing';
import { provideLucideIcons } from '@lucide/angular';

import { ICONOS_APP } from '@shared/design/iconos';
import { NsToastService } from '../feedback/toast.service';
import { NsChatComposerComponent } from './chat-composer.component';
import { NsChatMessageComponent } from './chat-message.component';
import { bloquesChat, segmentosChat } from './texto-chat';

describe('bloquesChat', () => {
  it('párrafos separados por líneas en blanco, con sus saltos de línea', () => {
    expect(bloquesChat('Hola\nqué tal\n\nAdiós')).toEqual([
      {
        tipo: 'parrafo',
        lineas: [[{ texto: 'Hola', negrita: false }], [{ texto: 'qué tal', negrita: false }]],
      },
      { tipo: 'parrafo', lineas: [[{ texto: 'Adiós', negrita: false }]] },
    ]);
  });

  it('listas con viñetas y numeradas, y negritas', () => {
    const bloques = bloquesChat('Opciones:\n- **Plátano** con miel\n* Yogur\n1. Primero\n2) Segundo');
    expect(bloques.map((b) => (b.tipo === 'lista' ? `lista:${b.ordenada}` : 'parrafo'))).toEqual([
      'parrafo',
      'lista:false',
      'lista:true',
    ]);
    const vinetas = bloques[1] as { elementos: { texto: string; negrita: boolean }[][] };
    expect(vinetas.elementos[0]).toEqual([
      { texto: 'Plátano', negrita: true },
      { texto: ' con miel', negrita: false },
    ]);
    expect(vinetas.elementos).toHaveLength(2);
  });

  it('el HTML queda como texto y los títulos markdown, en negrita', () => {
    expect(segmentosChat('<img src=x onerror=alert(1)>')).toEqual([
      { texto: '<img src=x onerror=alert(1)>', negrita: false },
    ]);
    expect(bloquesChat('## Resumen')).toEqual([{ tipo: 'parrafo', lineas: [[{ texto: 'Resumen', negrita: true }]] }]);
  });
});

describe('NsChatMessageComponent', () => {
  const exito = vi.fn();
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideLucideIcons(...ICONOS_APP), { provide: NsToastService, useValue: { exito, error: vi.fn() } }],
    }),
  );

  function crear(entradas: Record<string, unknown>) {
    const f = TestBed.createComponent(NsChatMessageComponent);
    for (const [k, v] of Object.entries(entradas)) f.componentRef.setInput(k, v);
    f.detectChanges();
    return { f, el: f.nativeElement as HTMLElement };
  }

  it('pinta el texto sin interpretar HTML, con listas y negritas', () => {
    const { el } = crear({ rol: 'ASISTENTE', contenido: 'Toma **25 g**:\n- <b>uno</b>\n- dos' });
    expect(el.querySelector('img, b')).toBeNull();
    expect(el.querySelector('strong')!.textContent).toBe('25 g');
    expect([...el.querySelectorAll('li')].map((li) => li.textContent!.trim())).toEqual(['<b>uno</b>', 'dos']);
  });

  it('asistente: datos consultados, copiar y valoración con aria-pressed', async () => {
    const escribir = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: escribir }, configurable: true });
    const { f, el } = crear({
      rol: 'ASISTENTE',
      contenido: 'Respuesta',
      datosConsultados: ['Comidas', 'Resumen del día'],
      valoracion: 1,
      hora: '16:42',
    });
    expect([...el.querySelectorAll('.ns-chat-msg__chip')].map((c) => c.textContent)).toEqual([
      'Comidas',
      'Resumen del día',
    ]);
    const util = el.querySelector<HTMLButtonElement>('[aria-label="Respuesta útil"]')!;
    const noUtil = el.querySelector<HTMLButtonElement>('[aria-label="Respuesta no útil"]')!;
    expect(util.getAttribute('aria-pressed')).toBe('true');
    expect(noUtil.getAttribute('aria-pressed')).toBe('false');

    const valoraciones: number[] = [];
    f.componentInstance.valorar.subscribe((v) => valoraciones.push(v));
    noUtil.click();
    expect(valoraciones).toEqual([-1]);

    el.querySelector<HTMLButtonElement>('[aria-label="Copiar respuesta"]')!.click();
    await f.whenStable();
    expect(escribir).toHaveBeenCalledWith('Respuesta');
    expect(exito).toHaveBeenCalled();
  });

  it('usuario con error: el texto del error y Reintentar', () => {
    const { f, el } = crear({ rol: 'USUARIO', contenido: 'Hola', estado: 'error', error: 'El asistente no responde.' });
    expect(el.classList).toContain('ns-chat-msg--usuario');
    expect(el.querySelector('[role="alert"]')!.textContent).toContain('El asistente no responde.');
    let reintentos = 0;
    f.componentInstance.reintentar.subscribe(() => reintentos++);
    [...el.querySelectorAll('button')].find((b) => b.textContent!.includes('Reintentar'))!.click();
    expect(reintentos).toBe(1);
    expect(el.querySelector('[aria-label="Respuesta útil"]')).toBeNull();
  });
});

describe('NsChatComposerComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideLucideIcons(...ICONOS_APP)] }));

  function crear(entradas: Record<string, unknown> = {}) {
    const f = TestBed.createComponent(NsChatComposerComponent);
    for (const [k, v] of Object.entries(entradas)) f.componentRef.setInput(k, v);
    const enviados: string[] = [];
    f.componentInstance.enviar.subscribe((t) => enviados.push(t));
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    const campo = el.querySelector('textarea')!;
    const escribir = (texto: string) => {
      campo.value = texto;
      campo.dispatchEvent(new Event('input'));
      f.detectChanges();
    };
    const tecla = (shiftKey = false) => {
      campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey, cancelable: true }));
      f.detectChanges();
    };
    return { f, el, campo, enviados, escribir, tecla };
  }

  it('Enter envía y vacía el campo; Mayús+Enter no envía', () => {
    const { campo, enviados, escribir, tecla, el } = crear();
    escribir('  ¿Qué ceno?  ');
    expect(el.querySelector('.ns-composer__contador')!.textContent).toContain('14 / 2000');
    tecla(true);
    expect(enviados).toEqual([]);
    tecla();
    expect(enviados).toEqual(['¿Qué ceno?']);
    expect(campo.value).toBe('');
  });

  it('el botón enviar tiene aria-label y está desactivado sin texto o enviando', () => {
    const { el, escribir, f } = crear();
    const boton = el.querySelector<HTMLButtonElement>('[aria-label="Enviar mensaje"]')!;
    expect(boton.disabled).toBe(true);
    escribir('Hola');
    expect(boton.disabled).toBe(false);
    f.componentRef.setInput('enviando', true);
    f.detectChanges();
    expect(boton.disabled).toBe(true);
  });

  it('las sugerencias se envían al pulsarlas y desaparecen al escribir', () => {
    const { el, enviados, escribir } = crear({ sugerencias: ['Resumen de mi semana', '¿Qué ceno hoy?'] });
    const chips = [...el.querySelectorAll<HTMLButtonElement>('.ns-composer__chip')];
    expect(chips.map((c) => c.textContent!.trim())).toEqual(['Resumen de mi semana', '¿Qué ceno hoy?']);
    chips[0].click();
    expect(enviados).toEqual(['Resumen de mi semana']);
    escribir('x');
    expect(el.querySelector('.ns-composer__chip')).toBeNull();
  });

  it('deshabilitado: ni se escribe ni se envía', () => {
    const { campo, el } = crear({ deshabilitado: true, texto: 'Hola' });
    expect(campo.disabled).toBe(true);
    expect(el.querySelector<HTMLButtonElement>('[aria-label="Enviar mensaje"]')!.disabled).toBe(true);
  });
});

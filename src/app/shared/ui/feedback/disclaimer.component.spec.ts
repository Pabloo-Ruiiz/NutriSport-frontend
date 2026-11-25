import { TestBed } from '@angular/core/testing';
import { provideLucideIcons } from '@lucide/angular';

import { ICONOS_APP } from '@shared/design/iconos';
import { NsDisclaimerComponent, TEXTOS_DISCLAIMER } from './disclaimer.component';

describe('NsDisclaimerComponent', () => {
  it('muestra el texto orientativo de cada contexto como nota', async () => {
    TestBed.configureTestingModule({ providers: [provideLucideIcons(...ICONOS_APP)] });
    const fixture = TestBed.createComponent(NsDisclaimerComponent);

    for (const contexto of ['analisis', 'menu', 'asistente', 'receta'] as const) {
      fixture.componentRef.setInput('context', contexto);
      await fixture.whenStable();
      const elemento = fixture.nativeElement as HTMLElement;
      expect(elemento.getAttribute('role')).toBe('note');
      expect(elemento.textContent?.trim()).toBe(TEXTOS_DISCLAIMER[contexto]);
      expect(TEXTOS_DISCLAIMER[contexto]).toMatch(/no sustituye el consejo de un profesional sanitario/i);
    }
  });
});

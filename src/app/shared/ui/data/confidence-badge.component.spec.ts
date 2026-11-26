import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideLucideIcons } from '@lucide/angular';

import { ICONOS_APP } from '@shared/design/iconos';
import { NsConfidenceBadgeComponent, nivelConfianza } from './confidence-badge.component';

@Component({
  imports: [NsConfidenceBadgeComponent],
  template: `<ns-confidence-badge [confianza]="confianza()" />`,
})
class Anfitrion {
  readonly confianza = signal<number | null>(0.94);
}

describe('NsConfidenceBadgeComponent', () => {
  it('nivelConfianza: alta ≥ 0,8, media ≥ 0,5, baja < 0,5', () => {
    expect([0.8, 0.79, 0.5, 0.49, 0].map(nivelConfianza)).toEqual(['alta', 'media', 'media', 'baja', 'baja']);
  });

  it('muestra el nivel con texto y porcentaje, y nada sin confianza', async () => {
    TestBed.configureTestingModule({ providers: [provideLucideIcons(...ICONOS_APP)] });
    const fixture = TestBed.createComponent(Anfitrion);
    await fixture.whenStable();
    const badge = () => (fixture.nativeElement as HTMLElement).querySelector('ns-badge');
    expect(badge()?.textContent?.trim()).toBe('Confianza alta · 94 %');
    expect(badge()?.className).toContain('success');

    fixture.componentInstance.confianza.set(0.42);
    await fixture.whenStable();
    expect(badge()?.textContent?.trim()).toBe('Confianza baja · 42 %');
    expect(badge()?.className).toContain('error');

    fixture.componentInstance.confianza.set(null);
    await fixture.whenStable();
    expect(badge()).toBeNull();
  });
});

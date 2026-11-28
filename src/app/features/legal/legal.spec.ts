import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideLucideIcons } from '@lucide/angular';

import { ICONOS_APP } from '@shared/design/iconos';
import { markdownAHtml, titulosDe } from './markdown';
import { PoliticaPrivacidadComponent, URL_POLITICA_PRIVACIDAD } from './politica-privacidad.component';

describe('markdownAHtml', () => {
  it('convierte títulos, párrafos, listas y negritas', () => {
    const html = markdownAHtml('# Título\n\nUn **texto**\nseguido.\n\n- uno\n- dos');
    expect(html).toContain('<h1 id="titulo">Título</h1>');
    expect(html).toContain('<p>Un <strong>texto</strong> seguido.</p>');
    expect(html).toContain('<ul><li>uno</li><li>dos</li></ul>');
  });

  it('escapa el HTML del texto', () => {
    expect(markdownAHtml('<script>alert(1)</script>')).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
  });

  it('resalta lo pendiente y solo enlaza URL http(s)', () => {
    const html = markdownAHtml('[PENDIENTE: email] [aepd](https://www.aepd.es) [x](javascript:alert(1))');
    expect(html).toContain('<mark class="ns-legal__pendiente">PENDIENTE: email</mark>');
    expect(html).toContain('<a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">aepd</a>');
    expect(html).not.toContain('href="javascript');
  });

  it('convierte cursivas y listas numeradas', () => {
    const html = markdownAHtml('Dato *(ficticio)*\n\n1. uno\n2. **dos**');
    expect(html).toContain('<p>Dato <em>(ficticio)</em></p>');
    expect(html).toContain('<ol><li>uno</li><li><strong>dos</strong></li></ol>');
  });

  it('obtiene el índice de los títulos de segundo nivel', () => {
    expect(titulosDe('# Política\n## 1. Responsable del tratamiento\n### 1.1. Otro\n## 2. Datos')).toEqual([
      { id: '1-responsable-del-tratamiento', texto: '1. Responsable del tratamiento' },
      { id: '2-datos', texto: '2. Datos' },
    ]);
  });

  it('pinta tablas con cabecera y tablas clave–valor', () => {
    expect(markdownAHtml('| A | B |\n|---|---|\n| 1 | 2 |')).toContain(
      '<thead><tr><th scope="col">A</th><th scope="col">B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody>',
    );
    const claveValor = markdownAHtml('| | |\n|---|---|\n| Responsable | X |');
    expect(claveValor).not.toContain('<thead>');
    expect(claveValor).toContain('<th scope="row">Responsable</th><td>X</td>');
  });
});

describe('PoliticaPrivacidadComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideLucideIcons(...ICONOS_APP),
      ],
    });
  });

  it('carga el Markdown y lo muestra', async () => {
    const fixture = TestBed.createComponent(PoliticaPrivacidadComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne(URL_POLITICA_PRIVACIDAD).flush('# Política de privacidad\n\nHola.');
    await fixture.whenStable();
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    expect(raiz.querySelector('h1')?.textContent).toBe('Política de privacidad');
    expect(raiz.querySelector('a[href="/registro"]')).not.toBeNull();
  });

  it('avisa si no se puede cargar', async () => {
    const fixture = TestBed.createComponent(PoliticaPrivacidadComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
      .expectOne(URL_POLITICA_PRIVACIDAD)
      .flush('', { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('No hemos podido cargar');
  });
});

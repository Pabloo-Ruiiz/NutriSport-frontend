/**
 * Convierte a HTML el Markdown sencillo de los textos legales (public/legal/*.md), sin añadir
 * dependencias. Admite: títulos (#, ##, ###), párrafos, listas con "-" y numeradas ("1."), tablas,
 * citas (>), "---", **negrita**, *cursiva*, `código`, enlaces http(s) y marcas [PENDIENTE…], que se resaltan.
 *
 * Escapa todo el texto antes de dar formato; además, Angular sanea el resultado en [innerHTML].
 */
export function markdownAHtml(md: string): string {
  const lineas = md.replace(/\r\n?/g, '\n').split('\n');
  const html: string[] = [];
  let i = 0;

  while (i < lineas.length) {
    const linea = lineas[i].trim();

    if (!linea) {
      i++;
    } else if (/^#{1,3}\s/.test(linea)) {
      const nivel = linea.match(/^#+/)![0].length;
      const texto = linea.slice(nivel).trim();
      html.push(`<h${nivel} id="${slug(texto)}">${enLinea(texto)}</h${nivel}>`);
      i++;
    } else if (/^-{3,}$/.test(linea)) {
      html.push('<hr>');
      i++;
    } else if (linea.startsWith('>')) {
      const bloque = recoger(lineas, i, (l) => l.startsWith('>'));
      i += bloque.length;
      html.push(`<blockquote><p>${enLinea(bloque.map((l) => l.replace(/^>\s?/, '')).join(' '))}</p></blockquote>`);
    } else if (linea.startsWith('- ')) {
      const bloque = recoger(lineas, i, (l) => l.startsWith('- '));
      i += bloque.length;
      html.push(`<ul>${bloque.map((l) => `<li>${enLinea(l.slice(2))}</li>`).join('')}</ul>`);
    } else if (/^\d+\.\s/.test(linea)) {
      const bloque = recoger(lineas, i, (l) => /^\d+\.\s/.test(l));
      i += bloque.length;
      html.push(`<ol>${bloque.map((l) => `<li>${enLinea(l.replace(/^\d+\.\s+/, ''))}</li>`).join('')}</ol>`);
    } else if (linea.startsWith('|')) {
      const bloque = recoger(lineas, i, (l) => l.startsWith('|'));
      i += bloque.length;
      html.push(tabla(bloque));
    } else {
      const bloque = recoger(lineas, i, (l) => !!l && !/^(#{1,3}\s|>|- |\d+\.\s|\||-{3,}$)/.test(l));
      i += bloque.length;
      html.push(`<p>${enLinea(bloque.join(' '))}</p>`);
    }
  }
  return html.join('\n');
}

function recoger(lineas: string[], desde: number, sigue: (linea: string) => boolean): string[] {
  const bloque: string[] = [];
  for (let j = desde; j < lineas.length && sigue(lineas[j].trim()); j++) bloque.push(lineas[j].trim());
  return bloque;
}

function celdas(fila: string): string[] {
  return fila
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim());
}

function tabla(filas: string[]): string {
  const [cabecera, separador, ...cuerpo] = filas;
  const tieneSeparador = !!separador && /^\|?[\s:|-]+\|?$/.test(separador);
  const titulos = celdas(cabecera);
  const datos = tieneSeparador ? cuerpo : filas.slice(1);
  // Una cabecera vacía ("| | |") indica una tabla clave–valor: la primera columna hace de título.
  const sinCabecera = titulos.every((t) => !t);
  const thead = sinCabecera
    ? ''
    : `<thead><tr>${titulos.map((t) => `<th scope="col">${enLinea(t)}</th>`).join('')}</tr></thead>`;
  const tbody = datos
    .map((fila) => {
      const valores = celdas(fila);
      return `<tr>${valores
        .map((v, n) => (sinCabecera && n === 0 ? `<th scope="row">${enLinea(v)}</th>` : `<td>${enLinea(v)}</td>`))
        .join('')}</tr>`;
    })
    .join('');
  return `<div class="ns-legal__tabla"><table>${thead}<tbody>${tbody}</tbody></table></div>`;
}

function escapar(texto: string): string {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function enLinea(texto: string): string {
  return escapar(texto)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\s][^*]*)\*/g, '<em>$1</em>')
    .replace(/\[(PENDIENTE[^\]]*)\]/g, '<mark class="ns-legal__pendiente">$1</mark>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

/** Identificador de un título (también lo usa el índice de la página). */
export function slug(texto: string): string {
  return texto
    .toLocaleLowerCase('es-ES')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Títulos de segundo nivel del documento, para el índice. */
export function titulosDe(md: string): { id: string; texto: string }[] {
  return md
    .split(/\r?\n/)
    .filter((l) => /^##\s/.test(l))
    .map((l) => {
      const texto = l.replace(/^##\s+/, '').trim();
      return { id: slug(texto), texto };
    });
}

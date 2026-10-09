(() => {
  const chapters = Object.entries(window.STUDY_DATA).sort(([a], [b]) => Number(a) - Number(b));
  const links = document.getElementById('chapterLinks');
  const content = document.getElementById('chapterImages');
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  function inlineMarkdown(value) {
    let html = escapeHtml(value);
    const code = [];
    html = html.replace(/`([^`]+)`/g, (_, text) => {
      const index = code.push(`<code>${text}</code>`) - 1;
      return `\u0000${index}\u0000`;
    });
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
    return html.replace(/\u0000(\d+)\u0000/g, (_, index) => code[Number(index)]);
  }

  function renderMarkdown(markdown) {
    const lines = markdown.split(String.fromCharCode(10)).map(line => line.replace(String.fromCharCode(13), ''));
    const blocks = [];
    let i = 0;

    const isTableDivider = line => /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
    const tableCells = line => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
    const isBlockStart = line => /^```|^#{1,6}\s|^\s*>|^\s*([-*+] |\d+\. )|^\s*---+\s*$/.test(line);

    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) { i++; continue; }

      if (line.startsWith('```')) {
        i++;
        const code = [];
        while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++]);
        if (i < lines.length) i++;
        blocks.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
        continue;
      }

      const heading = line.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        const level = Math.min(4, heading[1].length + 1);
        blocks.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
        i++;
        continue;
      }

      if (/^\s*---+\s*$/.test(line)) { blocks.push('<hr>'); i++; continue; }

      if (i + 1 < lines.length && line.includes('|') && isTableDivider(lines[i + 1])) {
        const headers = tableCells(line);
        i += 2;
        const rows = [];
        while (i < lines.length && lines[i].includes('|') && lines[i].trim()) rows.push(tableCells(lines[i++]));
        blocks.push(`<table><thead><tr>${headers.map(cell => `<th>${inlineMarkdown(cell)}</th>`).join('')}</tr></thead><tbody>${rows.map(row =>
          `<tr>${headers.map((_, column) => `<td>${inlineMarkdown(row[column] || '')}</td>`).join('')}</tr>`
        ).join('')}</tbody></table>`);
        continue;
      }

      if (/^\s*>/.test(line)) {
        const quote = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) quote.push(lines[i++].replace(/^\s*>\s?/, ''));
        blocks.push(`<blockquote><p>${quote.map(inlineMarkdown).join('<br>')}</p></blockquote>`);
        continue;
      }

      const listStart = line.match(/^\s*([-*+] |\d+\. )/);
      if (listStart) {
        const ordered = /^\s*\d+\. /.test(line);
        const tag = ordered ? 'ol' : 'ul';
        const items = [];
        while (i < lines.length && (ordered ? /^\s*\d+\. / : /^\s*[-*+] /).test(lines[i])) {
          items.push(`<li>${inlineMarkdown(lines[i++].replace(/^\s*(?:[-*+] |\d+\. )/, ''))}</li>`);
        }
        blocks.push(`<${tag}>${items.join('')}</${tag}>`);
        continue;
      }

      const paragraph = [line.trim()];
      i++;
      while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i]) &&
        !(i + 1 < lines.length && lines[i].includes('|') && isTableDivider(lines[i + 1]))) {
        paragraph.push(lines[i++].trim());
      }
      blocks.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`);
    }
    return blocks.join('\n');
  }

  function renderImages(figures) {
    return `<div class="image-grid">${figures.map(([title, page]) => `
      <figure class="panel book-image">
        <img src="assets/book-${page}.png" alt="${escapeHtml(title)}, original textbook page ${page}" loading="lazy">
        <figcaption>${escapeHtml(title)}<span class="page-number">Textbook page ${page}</span></figcaption>
      </figure>`).join('')}
    </div>`;
  }

  const environmentExamples = {
    '3': `<section class="environment-reference">
      <h3>Chapter 3: scoped symbol table</h3>
      <p>Chapter 3 describes the general name-to-binding structure. What the binding stores depends on the compiler pass; entering a scope can shadow an outer name, and leaving restores it.</p>
      <div class="environment-grid">
        <article class="environment-card"><h4>Outer scope</h4><table><thead><tr><th>Name</th><th>Binding information</th></tr></thead><tbody><tr><td>x</td><td>parameter declaration</td></tr></tbody></table></article>
        <article class="environment-card"><h4>After entering an inner scope</h4><table><thead><tr><th>Name</th><th>Binding information</th></tr></thead><tbody><tr><td>x</td><td>local declaration (shadows outer x)</td></tr></tbody></table><p>lookup(x) finds the inner binding. Exiting the scope restores the outer binding.</p></article>
      </div>
    </section>`,
    '4': `<section class="environment-reference">
      <h3>Chapter 4: interpreter environments</h3>
      <p>The interpreter's <code>vtable</code> stores current runtime values. Its <code>ftable</code> stores each function's declaration syntax tree.</p>
      <div class="environment-grid">
        <article class="environment-card"><h4>vtable: variable to value</h4><table><thead><tr><th>Variable</th><th>Current value</th></tr></thead><tbody><tr><td>x</td><td>5</td></tr><tr><td>ready</td><td>true</td></tr></tbody></table></article>
        <article class="environment-card"><h4>ftable: function to declaration</h4><table><thead><tr><th>Function</th><th>Stored entry</th></tr></thead><tbody><tr><td>main</td><td>function declaration AST</td></tr><tr><td>inc</td><td>function declaration AST</td></tr></tbody></table></article>
      </div>
    </section>`,
    '5': `<section class="environment-reference">
      <h3>Chapter 5: type-checking environments</h3>
      <p>Here the <code>vtable</code> stores types instead of runtime values. The <code>ftable</code> stores function signatures.</p>
      <div class="environment-grid">
        <article class="environment-card"><h4>vtable: variable to type</h4><table><thead><tr><th>Variable</th><th>Type</th></tr></thead><tbody><tr><td>x</td><td>int</td></tr><tr><td>ready</td><td>bool</td></tr></tbody></table></article>
        <article class="environment-card"><h4>ftable: function to signature</h4><table><thead><tr><th>Function</th><th>Parameter types</th><th>Result type</th></tr></thead><tbody><tr><td>f</td><td>(int, bool)</td><td>int</td></tr><tr><td>main</td><td>(int)</td><td>int</td></tr></tbody></table></article>
      </div>
    </section>`,
    '6': `<section class="environment-reference">
      <h3>Chapter 6: translation environments</h3>
      <p>Translation maps source identifiers to generated intermediate-code names. This vtable matches the supplied if/else example. The ftable uses a schematic function entry; the two supplied examples contain no function calls.</p>
      <div class="environment-grid">
        <article class="environment-card"><h4>vtable: source variable to generated name</h4><table><thead><tr><th>Source variable</th><th>Intermediate name</th></tr></thead><tbody><tr><td>x</td><td>v0</td></tr><tr><td>y</td><td>v1</td></tr><tr><td>z</td><td>v2</td></tr></tbody></table></article>
        <article class="environment-card"><h4>ftable: source function to generated name</h4><table><thead><tr><th>Source function</th><th>Intermediate name</th></tr></thead><tbody><tr><td>f</td><td>generated_name_for_f</td></tr></tbody></table><p>The generated name depends on the compiler's naming policy.</p></article>
      </div>
    </section>`,
    '9': `<section class="environment-reference">
      <h3>Chapter 9: activation record instead of vtable/ftable</h3>
      <p>Chapter 9 focuses on the per-call frame. Each recursive invocation gets its own record; exact fields and placement depend on the calling convention.</p>
      <article class="environment-card"><h4>Schematic frame for fibo(17)</h4><table><thead><tr><th>Frame field</th><th>Example contents</th></tr></thead><tbody><tr><td>Parameter</td><td>n = 17</td></tr><tr><td>Return address</td><td>where this call resumes</td></tr><tr><td>Saved registers</td><td>register values required by the convention</td></tr><tr><td>Locals and temporaries</td><td>values for this invocation only</td></tr></tbody></table></article>
    </section>`
  };

  links.innerHTML = chapters.map(([number]) =>
    `<a href="#chapter-${number}">Chapter ${number}</a>`
  ).join('');

  content.innerHTML = chapters.map(([number, chapter]) => {
    const figures = chapter.figures || [];
    const environment = environmentExamples[number] || '';
    const sectionBody = number === '6'
      ? `${environment}${typeof window.CHAPTER_6_MARKDOWN === 'string'
          ? `<article class="markdown-reference">${renderMarkdown(window.CHAPTER_6_MARKDOWN)}</article>`
          : '<p class="empty-note">The Chapter 6 reference could not be loaded. <a href="assets/Chapter_6_Translation_Rules_Reference.md">Open the Markdown source</a>.</p>'}
         <details class="photo-option"><summary>View the original Chapter 6 photos</summary>${renderImages(figures)}</details>`
      : figures.length
        ? `${environment}${renderImages(figures)}`
        : `${environment}<p class="empty-note">No textbook images for this chapter are included in the supplied assets.</p>`;

    return `<section class="chapter-section" id="chapter-${number}">
      <div class="row" style="align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <h2>Chapter ${number}: ${escapeHtml(chapter.title)}</h2>
        <a class="small" href="#chapterLinks">Back to chapters</a>
      </div>
      ${sectionBody}
    </section>`;
  }).join('');
})();

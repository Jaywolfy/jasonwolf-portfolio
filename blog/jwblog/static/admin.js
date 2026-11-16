// Verwaltung des Blogs: Übersicht, Artikel mit Editor, Medien, Hinweise zur Sichtbarkeit und Einstellungen.
// Eine Seite, die Ansichten wechseln über den Teil der Adresse hinter dem #.
(() => {
  const app = document.querySelector('.app'), view = document.querySelector('#view'), toastBox = document.querySelector('.toast');
  const CSRF = app.dataset.csrf, LANGS = { de: 'Deutsch', en: 'English' }, BASE = { de: '/blog/', en: '/en/blog/' };

  // ---------- Hilfen ----------
  // h('a', { href: '#/' }, 'Text') baut ein Element. Schlüssel mit "on" werden Ereignisse, der Rest Attribute.
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs || {})) {
      if (value === false || value == null) continue;
      if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
      else if (key === 'value' || key === 'checked' || key === 'hidden' || key === 'disabled') el[key] = value;
      else el.setAttribute(key, value === true ? '' : value);
    }
    for (const child of children.flat()) if (child != null && child !== false) el.append(child);
    return el;
  }
  async function api(method, path, body) {
    const options = { method, headers: { 'X-CSRF': CSRF } };
    if (body instanceof FormData) options.body = body;
    else if (body !== undefined) { options.body = JSON.stringify(body); options.headers['Content-Type'] = 'application/json'; }
    const response = await fetch('/blog/admin/api/' + path, options);
    if (response.status === 401) { location.href = '/blog/admin/login'; throw new Error('Nicht angemeldet'); }
    const text = await response.text();
    let data; try { data = JSON.parse(text); } catch (e) { data = { error: text }; }
    if (!response.ok) throw new Error(data.error || 'Die Anfrage ist fehlgeschlagen (' + response.status + ').');
    return data;
  }
  let toastTimer;
  function toast(message, bad) {
    toastBox.textContent = message; toastBox.classList.toggle('is-bad', !!bad); toastBox.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { toastBox.hidden = true; }, bad ? 7000 : 3200);
  }
  const fail = error => toast(error.message, true);
  const dateTime = ts => new Date(ts * 1000).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const dateOnly = ts => new Date(ts * 1000).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
  const bytes = n => n > 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
  const toInput = ts => { const d = new Date(ts * 1000 - new Date().getTimezoneOffset() * 60000); return d.toISOString().slice(0, 16); };
  const fromInput = value => value ? Math.floor(new Date(value).getTime() / 1000) : 0;
  const copy = (text, message) => navigator.clipboard.writeText(text).then(() => toast(message || 'Kopiert'), () => toast('Kopieren nicht möglich', true));
  function statusOf(post, now) {
    if (post.status === 'draft') return ['draft', 'Entwurf'];
    return post.publish_at > now ? ['planned', 'Geplant'] : ['live', 'Veröffentlicht'];
  }
  const titleOf = post => (post.texts.de || post.texts.en || {}).title || 'Ohne Titel';
  const badge = ([key, label]) => h('span', { class: 'badge badge-' + key }, label);
  const head = (title, ...actions) => h('header', { class: 'view-head' }, h('h1', {}, title), h('div', { class: 'view-actions' }, actions));

  // ---------- Übersicht ----------
  async function overview() {
    const [stats, list] = await Promise.all([api('GET', 'stats'), api('GET', 'posts')]);
    const tile = (value, label, href) => h('a', { class: 'tile', href }, h('strong', {}, String(value)), h('span', {}, label));
    const day = 86400, now = stats.now;
    let rhythm;
    if (stats.next_planned) rhythm = ['ok', 'Der nächste Artikel ist geplant für den ' + dateTime(stats.next_planned) + ' Uhr.'];
    else if (!stats.last_published) rhythm = ['warn', 'Noch kein Artikel veröffentlicht. Der erste Artikel startet den Zwei-Wochen-Rhythmus.'];
    else if (stats.next_due < now) rhythm = ['bad', 'Der letzte Artikel ist vom ' + dateOnly(stats.last_published) + '. Nach dem Zwei-Wochen-Rhythmus war der nächste am ' + dateOnly(stats.next_due) + ' fällig.'];
    else rhythm = ['ok', 'Letzter Artikel am ' + dateOnly(stats.last_published) + '. Der nächste ist in ' + Math.max(1, Math.ceil((stats.next_due - now) / day)) + ' Tagen fällig (' + dateOnly(stats.next_due) + ').'];
    const peak = Math.max(1, ...stats.views_by_day.map(d => d.n));
    const chart = h('div', { class: 'bars', role: 'img', 'aria-label': 'Aufrufe der letzten 30 Tage: ' + stats.views_30 },
      stats.views_by_day.map(d => h('span', { style: 'height:' + Math.max(2, Math.round(d.n / peak * 100)) + '%', title: d.day.split('-').reverse().join('.') + ': ' + d.n })));
    const recent = list.posts.slice(0, 6).map(post => h('li', {},
      h('a', { href: '#/artikel/' + post.id }, titleOf(post)), badge(statusOf(post, now)),
      h('span', { class: 'muted' }, post.status === 'draft' ? 'geändert ' + dateTime(post.updated) : dateTime(post.publish_at)), h('span', { class: 'muted' }, post.views + ' Aufrufe')));
    view.replaceChildren(
      head('Übersicht', h('a', { class: 'btn btn-primary', href: '#/artikel/neu' }, 'Neuer Artikel')),
      h('section', { class: 'tiles' }, tile(stats.live, 'Veröffentlicht', '#/artikel'), tile(stats.planned, 'Geplant', '#/artikel'), tile(stats.drafts, 'Entwürfe', '#/artikel'), tile(stats.views_30, 'Aufrufe in 30 Tagen', '#/')),
      h('section', { class: 'card rhythm rhythm-' + rhythm[0] }, h('h2', {}, 'Rhythmus: alle ' + stats.rhythm_days + ' Tage ein Artikel'), h('p', {}, rhythm[1])),
      h('section', { class: 'card' }, h('h2', {}, 'Aufrufe der letzten 30 Tage'), chart, h('p', { class: 'muted' }, 'Gezählt wird ohne Cookies und ohne IP-Adressen. Suchmaschinen und eigene Besuche bei angemeldeter Verwaltung zählen nicht. Insgesamt: ' + stats.views_total + '.')),
      h('section', { class: 'card' }, h('h2', {}, 'Zuletzt bearbeitet'), recent.length ? h('ul', { class: 'recent' }, recent) : h('p', { class: 'muted' }, 'Noch keine Artikel.')));
  }

  // ---------- Artikelliste ----------
  async function posts() {
    const data = await api('GET', 'posts'), now = data.now;
    let filter = 'all', query = '';
    const body = h('tbody');
    function draw() {
      const rows = data.posts.filter(post => (filter === 'all' || statusOf(post, now)[0] === filter) && titleOf(post).toLowerCase().includes(query));
      body.replaceChildren(...rows.map(post => {
        const live = statusOf(post, now)[0] === 'live', first = post.texts.de ? 'de' : 'en';
        return h('tr', {},
          h('td', {}, h('a', { class: 'row-title', href: '#/artikel/' + post.id }, titleOf(post)),
            h('span', { class: 'langs' }, Object.keys(LANGS).map(lang => h('span', { class: post.texts[lang] ? 'has' : '', title: LANGS[lang] + (post.texts[lang] ? ' vorhanden' : ' fehlt') }, lang.toUpperCase())))),
          h('td', {}, badge(statusOf(post, now))),
          h('td', { class: 'muted' }, post.status === 'draft' ? 'geändert ' + dateTime(post.updated) : dateTime(post.publish_at)),
          h('td', { class: 'num' }, String(post.views)),
          h('td', { class: 'row-actions' },
            h('a', { href: live ? BASE[first] + post.texts[first].slug : '/blog/admin/vorschau/' + post.id + '?lang=' + first, target: '_blank', rel: 'noopener' }, live ? 'Ansehen' : 'Vorschau'),
            h('button', { type: 'button', onclick: () => remove(post) }, 'Löschen')));
      }));
      if (!rows.length) body.append(h('tr', {}, h('td', { colspan: 5, class: 'muted' }, 'Keine Artikel in dieser Ansicht.')));
    }
    async function remove(post) {
      if (!confirm('„' + titleOf(post) + '“ endgültig löschen? Das lässt sich nicht rückgängig machen.')) return;
      try { await api('DELETE', 'posts/' + post.id); data.posts = data.posts.filter(p => p.id !== post.id); draw(); toast('Artikel gelöscht'); } catch (e) { fail(e); }
    }
    const tabs = [['all', 'Alle'], ['live', 'Veröffentlicht'], ['planned', 'Geplant'], ['draft', 'Entwürfe']].map(([key, label]) =>
      h('button', { type: 'button', 'aria-pressed': key === 'all' ? 'true' : 'false', onclick: e => { filter = key; tabs.forEach(t => t.setAttribute('aria-pressed', t === e.currentTarget)); draw(); } }, label));
    view.replaceChildren(
      head('Artikel', h('a', { class: 'btn btn-primary', href: '#/artikel/neu' }, 'Neuer Artikel')),
      h('div', { class: 'list-tools' }, h('div', { class: 'seg' }, tabs), h('input', { type: 'search', placeholder: 'Titel suchen', 'aria-label': 'Titel suchen', oninput: e => { query = e.target.value.toLowerCase(); draw(); } })),
      h('div', { class: 'table-wrap' }, h('table', { class: 'table' }, h('thead', {}, h('tr', {}, ['Titel', 'Status', 'Datum', 'Aufrufe', ''].map(t => h('th', {}, t)))), body)));
    draw();
  }

  // ---------- Mediathek ----------
  function thumb(item) {
    if (item.kind === 'image') return h('img', { src: item.url, alt: item.alt, loading: 'lazy' });
    if (item.kind === 'video') return h('video', { src: item.url, preload: 'metadata', muted: true });
    return h('span', { class: 'thumb-file' }, 'PDF');
  }
  const markdownFor = item => item.kind === 'file' ? '[' + item.name + '](' + item.url + ')' : '![' + (item.alt || '') + '](' + item.url + ')';
  function upload(file, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest(), form = new FormData();
      form.append('file', file);
      xhr.open('POST', '/blog/admin/api/media'); xhr.setRequestHeader('X-CSRF', CSRF);
      xhr.upload.onprogress = e => onProgress && e.lengthComputable && onProgress(e.loaded / e.total);
      xhr.onload = () => { let data = {}; try { data = JSON.parse(xhr.responseText); } catch (e) {} xhr.status < 300 ? resolve(data) : reject(new Error(data.error || 'Hochladen fehlgeschlagen (' + xhr.status + ').')); };
      xhr.onerror = () => reject(new Error('Die Verbindung wurde unterbrochen.'));
      xhr.send(form);
    });
  }
  // Hochladen mit Fortschritt. Gibt die hochgeladenen Einträge zurück.
  async function uploadAll(files, status) {
    const done = [];
    for (const file of files) {
      try { done.push(await upload(file, part => { status.textContent = file.name + ': ' + Math.round(part * 100) + ' %'; })); }
      catch (e) { toast(file.name + ': ' + e.message, true); }
    }
    status.textContent = '';
    return done;
  }
  function dropZone(onFiles) {
    const input = h('input', { type: 'file', multiple: true, accept: 'image/*,video/mp4,video/webm,application/pdf', hidden: true, onchange: e => { onFiles([...e.target.files]); e.target.value = ''; } });
    const zone = h('div', { class: 'drop', ondragover: e => { e.preventDefault(); zone.classList.add('is-over'); }, ondragleave: () => zone.classList.remove('is-over'),
      ondrop: e => { e.preventDefault(); zone.classList.remove('is-over'); onFiles([...e.dataTransfer.files]); } },
      h('button', { type: 'button', class: 'btn', onclick: () => input.click() }, 'Dateien auswählen'), h('span', {}, 'oder hierher ziehen. Bilder bis 25 MB, Videos (MP4, WebM) bis 500 MB, PDF bis 25 MB.'), input);
    return zone;
  }
  async function media() {
    let items = (await api('GET', 'media')).media;
    const grid = h('div', { class: 'media-grid' }), status = h('p', { class: 'upload-status', role: 'status' });
    function draw() {
      grid.replaceChildren(...items.map(item => h('article', { class: 'media-card' },
        h('a', { class: 'media-thumb', href: item.url, target: '_blank', rel: 'noopener' }, thumb(item)),
        h('p', { class: 'media-name', title: item.name }, item.name),
        h('p', { class: 'muted' }, bytes(item.size) + (item.width ? ' · ' + item.width + ' × ' + item.height : '') + (item.used ? ' · in ' + item.used + ' Artikel' + (item.used > 1 ? 'n' : '') : ' · unbenutzt')),
        item.kind !== 'file' && h('input', { value: item.alt, placeholder: 'Bildbeschreibung (Alt-Text)', 'aria-label': 'Bildbeschreibung', onchange: async e => { try { Object.assign(item, await api('PUT', 'media/' + item.id, { alt: e.target.value })); toast('Beschreibung gespeichert'); } catch (err) { fail(err); } } }),
        h('div', { class: 'media-actions' },
          h('button', { type: 'button', onclick: () => copy(markdownFor(item), 'Zum Einfügen in den Artikel kopiert') }, 'Einfügecode'),
          h('button', { type: 'button', onclick: () => copy(location.origin + item.url, 'Adresse kopiert') }, 'Adresse'),
          h('button', { type: 'button', class: 'danger', onclick: async () => {
            if (!confirm((item.used ? 'Diese Datei wird in ' + item.used + ' Artikel(n) verwendet und fehlt dort danach. ' : '') + '„' + item.name + '“ endgültig löschen?')) return;
            try { await api('DELETE', 'media/' + item.id); items = items.filter(i => i !== item); draw(); } catch (err) { fail(err); } } }, 'Löschen')))));
      if (!items.length) grid.append(h('p', { class: 'muted' }, 'Noch keine Medien. Lade Bilder oder Videos hoch, um sie in Artikeln zu verwenden.'));
    }
    view.replaceChildren(head('Medien'), dropZone(async files => { const added = await uploadAll(files, status); items = [...added.map(a => ({ ...a, used: 0 })), ...items]; draw(); if (added.length) toast(added.length + ' Datei(en) hochgeladen'); }), status, grid);
    draw();
  }
  // Auswahl aus der Mediathek in einem Dialog. kinds: welche Arten zur Wahl stehen.
  const picker = document.querySelector('.picker');
  async function pick(kinds) {
    let items = (await api('GET', 'media')).media.filter(item => kinds.includes(item.kind));
    return new Promise(resolve => {
      const grid = h('div', { class: 'media-grid is-pick' }), status = h('p', { class: 'upload-status', role: 'status' });
      const done = item => { picker.close(); resolve(item); };
      const draw = () => grid.replaceChildren(...items.map(item => h('button', { type: 'button', class: 'media-card', onclick: () => done(item) }, h('span', { class: 'media-thumb' }, thumb(item)), h('span', { class: 'media-name' }, item.name))),
        !items.length && h('p', { class: 'muted' }, 'Noch nichts hochgeladen.'));
      picker.replaceChildren(h('header', {}, h('h2', {}, 'Aus der Mediathek wählen'), h('button', { type: 'button', class: 'btn', onclick: () => done(null) }, 'Schließen')),
        dropZone(async files => { const added = (await uploadAll(files, status)).filter(a => kinds.includes(a.kind)); if (added.length === 1) return done(added[0]); items = [...added, ...items]; draw(); }), status, grid);
      picker.oncancel = () => resolve(null);
      draw(); picker.showModal();
    });
  }

  // ---------- Editor ----------
  const emptyText = () => ({ slug: '', title: '', excerpt: '', body_md: '', cover_alt: '', tags: [], seo_title: '', seo_desc: '' });
  let leaveGuard = null; // gesetzt, solange der Editor ungespeicherte Änderungen hat
  async function editor(id) {
    let post = id ? await api('GET', 'posts/' + id) : { id: null, status: 'draft', publish_at: 0, cover: '', sources: [], texts: {} };
    for (const lang of Object.keys(LANGS)) post.texts[lang] = { ...emptyText(), ...(post.texts[lang] || {}) };
    let lang = 'de', dirty = false, previewTimer, mode = 'draft';
    if (post.status === 'published') mode = 'planned';
    const draftKey = 'jwblog-entwurf-' + (post.id || 'neu');
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey) || 'null');
      if (saved && saved.at > (post.updated || 0) * 1000 && confirm('Es gibt eine nicht gespeicherte Fassung dieses Artikels vom ' + new Date(saved.at).toLocaleString('de-DE') + '. Wiederherstellen?')) { post = { ...post, ...saved.post, id: post.id }; dirty = true; }
      else localStorage.removeItem(draftKey);
    } catch (e) {}
    const text = () => post.texts[lang];
    const touch = () => { dirty = true; saveState.textContent = 'Nicht gespeichert'; try { localStorage.setItem(draftKey, JSON.stringify({ at: Date.now(), post })); } catch (e) {} checks(); };
    leaveGuard = () => dirty;

    // Felder, die zur gewählten Sprache gehören, sind an text() gebunden und werden beim Sprachwechsel neu gefüllt
    const bound = [];
    function field(key, element, onInput) {
      element.addEventListener('input', () => { text()[key] = element.value; touch(); onInput && onInput(); });
      bound.push(() => { element.value = text()[key]; onInput && onInput(); });
      return element;
    }
    const counter = (element, best) => { const out = h('span', { class: 'count' }); const update = () => { const n = element.value.length; out.textContent = n + (best ? ' (ideal ' + best[0] + '–' + best[1] + ')' : ' Zeichen'); out.classList.toggle('is-off', !!best && n > 0 && (n < best[0] || n > best[1])); }; element.addEventListener('input', update); bound.push(update); return out; };

    const title = field('title', h('input', { class: 'in-title', placeholder: 'Titel des Artikels', 'aria-label': 'Titel' }), () => { slug.placeholder = slugify(title.value) || 'wird-aus-dem-titel-gebildet'; snippet(); });
    const excerpt = field('excerpt', h('textarea', { rows: 3, placeholder: 'Zwei Sätze, die sagen, worum es geht. Erscheint in der Übersicht, unter dem Titel und als Vorschautext bei Google und LinkedIn.' }), () => snippet());
    const body = field('body_md', h('textarea', { class: 'in-body', rows: 22, spellcheck: 'true', placeholder: 'Hier schreibst du den Artikel.\n\n## Zwischenüberschrift\n\nText mit **fett**, *kursiv* und [Link](https://…).' }), () => schedulePreview());
    const slug = field('slug', h('input', { 'aria-label': 'Adresse' }), () => snippet());
    const seoTitle = field('seo_title', h('input', { placeholder: 'Leer lassen, um den Titel zu verwenden' }), () => snippet());
    const seoDesc = field('seo_desc', h('textarea', { rows: 3, placeholder: 'Leer lassen, um die Kurzbeschreibung zu verwenden' }), () => snippet());
    const coverAlt = field('cover_alt', h('input', { placeholder: 'Was ist auf dem Titelbild zu sehen?' }));
    const slugPrefix = h('span', { class: 'prefix' });

    // Markdown: Werkzeugleiste
    function wrap(before, after, placeholder) {
      const s = body.selectionStart, e = body.selectionEnd, chosen = body.value.slice(s, e) || placeholder || '';
      body.setRangeText(before + chosen + (after || ''), s, e, 'end');
      body.setSelectionRange(s + before.length, s + before.length + chosen.length); body.focus(); body.dispatchEvent(new Event('input'));
    }
    function lines(prefix) {
      const s = body.value.lastIndexOf('\n', body.selectionStart - 1) + 1, e = body.selectionEnd;
      const block = body.value.slice(s, e) || 'Text';
      body.setRangeText(block.split('\n').map((line, i) => (typeof prefix === 'function' ? prefix(i) : prefix) + line).join('\n'), s, e, 'end'); body.focus(); body.dispatchEvent(new Event('input'));
    }
    const insert = snippetText => { const s = body.selectionStart; const pad = s && body.value[s - 1] !== '\n' ? '\n\n' : ''; body.setRangeText(pad + snippetText + '\n\n', s, body.selectionEnd, 'end'); body.focus(); body.dispatchEvent(new Event('input')); };
    async function insertMedia() {
      const item = await pick(['image', 'video', 'file']); if (!item) return;
      if (item.kind === 'file') return wrap('[', '](' + item.url + ')', item.name);
      const alt = item.alt || prompt(item.kind === 'video' ? 'Kurze Beschreibung des Videos:' : 'Bildbeschreibung (für Screenreader und Suchmaschinen):', '') || '';
      const caption = prompt('Bildunterschrift (optional):', '') || '';
      insert('![' + alt + '](' + item.url + (caption ? ' "' + caption.replace(/"/g, '”') + '"' : '') + ')');
    }
    const tool = (label, hint, action) => h('button', { type: 'button', title: hint, 'aria-label': hint, onclick: action }, label);
    const toolbar = h('div', { class: 'toolbar', role: 'toolbar', 'aria-label': 'Formatierung' },
      tool('F', 'Fett (Strg+B)', () => wrap('**', '**', 'fett')), tool('K', 'Kursiv (Strg+I)', () => wrap('*', '*', 'kursiv')),
      tool('H2', 'Zwischenüberschrift', () => lines('## ')), tool('H3', 'Kleine Überschrift', () => lines('### ')),
      tool('Link', 'Link (Strg+K)', () => { const url = prompt('Adresse des Links:', 'https://'); if (url) wrap('[', '](' + url + ')', 'Linktext'); }),
      tool('Zitat', 'Zitat', () => lines('> ')), tool('Liste', 'Aufzählung', () => lines('- ')), tool('1.', 'Nummerierte Liste', () => lines(i => (i + 1) + '. ')),
      tool('Code', 'Code', () => body.value.slice(body.selectionStart, body.selectionEnd).includes('\n') ? wrap('```\n', '\n```') : wrap('`', '`', 'code')),
      tool('Tabelle', 'Tabelle', () => insert('| Spalte 1 | Spalte 2 |\n| --- | --- |\n| Wert | Wert |')), tool('Linie', 'Trennlinie', () => insert('---')),
      tool('Fußnote', 'Fußnote', () => { const n = (body.value.match(/\[\^\d+\]:/g) || []).length + 1; wrap('[^' + n + ']', ''); body.value += '\n\n[^' + n + ']: Quelle oder Anmerkung'; body.dispatchEvent(new Event('input')); }),
      tool('Bild / Video', 'Bild, Video oder PDF aus der Mediathek einfügen', insertMedia));
    body.addEventListener('keydown', e => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === 'b') { e.preventDefault(); wrap('**', '**', 'fett'); }
      if (key === 'i') { e.preventDefault(); wrap('*', '*', 'kursiv'); }
      if (key === 'k') { e.preventDefault(); const url = prompt('Adresse des Links:', 'https://'); if (url) wrap('[', '](' + url + ')', 'Linktext'); }
    });
    // Bilder lassen sich direkt in den Text ziehen oder aus der Zwischenablage einfügen
    async function dropped(files) { const status = h('span'); for (const item of await uploadAll(files, status)) insert(markdownFor(item)); }
    body.addEventListener('drop', e => { if (e.dataTransfer.files.length) { e.preventDefault(); dropped([...e.dataTransfer.files]); } });
    body.addEventListener('paste', e => { const files = [...e.clipboardData.files]; if (files.length) { e.preventDefault(); dropped(files); } });

    // Vorschau des Textes
    const preview = h('div', { class: 'preview post-body' }), words = h('span', { class: 'count' });
    function schedulePreview() { clearTimeout(previewTimer); previewTimer = setTimeout(async () => { try { const out = await api('POST', 'preview', { body_md: body.value }); preview.innerHTML = out.html || '<p class="muted">Die Vorschau erscheint, sobald du schreibst.</p>'; text().words = out.words; words.textContent = out.words + ' Wörter · etwa ' + Math.max(1, Math.round(out.words / 220)) + ' Min. Lesezeit'; checks(); } catch (e) {} }, 350); }
    const write = h('div', { class: 'write is-split' }, h('div', { class: 'write-edit' }, toolbar, body), preview);
    const layout = [['is-edit', 'Schreiben'], ['is-split', 'Nebeneinander'], ['is-preview', 'Vorschau']].map(([cls, label]) =>
      h('button', { type: 'button', 'aria-pressed': cls === 'is-split' ? 'true' : 'false', onclick: e => { write.className = 'write ' + cls; layout.forEach(b => b.setAttribute('aria-pressed', b === e.currentTarget)); } }, label));

    // Hashtags
    const tagList = h('span', { class: 'chips' });
    const tagInput = h('input', { placeholder: 'Hashtag eingeben, Enter', 'aria-label': 'Hashtag hinzufügen', onkeydown: e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } else if (e.key === 'Backspace' && !tagInput.value && text().tags.length) { text().tags.pop(); drawTags(); touch(); } }, onblur: () => addTag() });
    function addTag() { const tag = tagInput.value.replace(/[#,/?]/g, '').trim(); tagInput.value = ''; if (!tag || text().tags.some(t => t.toLowerCase() === tag.toLowerCase())) return; text().tags.push(tag); drawTags(); touch(); }
    function drawTags() { tagList.replaceChildren(...text().tags.map((tag, i) => h('span', { class: 'chip' }, '#' + tag, h('button', { type: 'button', 'aria-label': tag + ' entfernen', onclick: () => { text().tags.splice(i, 1); drawTags(); touch(); } }, '×')))); }
    bound.push(drawTags);

    // Titelbild
    const coverBox = h('div', { class: 'cover-box' });
    function drawCover() {
      coverBox.replaceChildren(post.cover ? h('img', { src: post.cover, alt: '' }) : h('p', { class: 'muted' }, 'Kein Titelbild. Ohne Titelbild zeigen LinkedIn und WhatsApp das allgemeine Vorschaubild der Website.'),
        h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn', onclick: async () => { const item = await pick(['image']); if (!item) return; post.cover = item.url; if (!text().cover_alt && item.alt) { text().cover_alt = item.alt; coverAlt.value = item.alt; } drawCover(); touch(); } }, post.cover ? 'Anderes Bild' : 'Titelbild wählen'),
          post.cover && h('button', { type: 'button', class: 'btn', onclick: () => { post.cover = ''; drawCover(); touch(); } }, 'Entfernen')));
    }

    // Quellen
    const sourceList = h('div', { class: 'sources' });
    function drawSources() {
      sourceList.replaceChildren(...post.sources.map((source, i) => h('div', { class: 'source' },
        h('input', { value: source.title, placeholder: 'Titel, Autor, Datum', 'aria-label': 'Titel der Quelle', oninput: e => { source.title = e.target.value; touch(); } }),
        h('input', { value: source.url, placeholder: 'https://…', type: 'url', 'aria-label': 'Adresse der Quelle', oninput: e => { source.url = e.target.value; touch(); } }),
        h('button', { type: 'button', 'aria-label': 'Quelle entfernen', onclick: () => { post.sources.splice(i, 1); drawSources(); touch(); } }, '×'))),
        h('button', { type: 'button', class: 'btn', onclick: () => { post.sources.push({ title: '', url: '' }); drawSources(); sourceList.querySelector('.source:last-of-type input').focus(); } }, 'Quelle hinzufügen'));
    }

    // Veröffentlichung
    const when = h('input', { type: 'datetime-local', 'aria-label': 'Zeitpunkt', value: post.publish_at ? toInput(post.publish_at) : '', oninput: () => { touch(); drawPublish(); } });
    const modes = [['draft', 'Entwurf', 'Nur für dich sichtbar.'], ['now', 'Sofort veröffentlichen', 'Erscheint beim Speichern.'], ['planned', 'Zeitpunkt festlegen', 'Erscheint automatisch zum gewählten Termin. Ein Termin in der Vergangenheit setzt das Datum des Artikels.']];
    const publishBox = h('div', { class: 'publish' });
    function drawPublish() {
      const wasLive = post.status === 'published';
      publishBox.replaceChildren(...modes.filter(([key]) => !(wasLive && key === 'now')).map(([key, label, hint]) => h('label', { class: 'radio' },
        h('input', { type: 'radio', name: 'mode', checked: mode === key, onchange: () => { mode = key; if (key === 'planned' && !when.value) when.value = toInput(Date.now() / 1000 + 86400); touch(); drawPublish(); } }),
        h('span', {}, h('strong', {}, wasLive && key === 'planned' ? 'Veröffentlicht / geplant' : label), h('small', {}, hint)))), mode === 'planned' && when);
      const future = mode === 'planned' && fromInput(when.value) > Date.now() / 1000;
      saveBtn.textContent = mode === 'draft' ? 'Entwurf speichern' : mode === 'now' ? 'Veröffentlichen' : future ? 'Planen' : wasLive ? 'Aktualisieren' : 'Veröffentlichen';
    }

    // Vorschau des Suchergebnisses und Prüfliste
    const snip = h('div', { class: 'snippet' });
    function snippet() {
      const address = 'jasonwolf.de › ' + (lang === 'en' ? 'en › ' : '') + 'blog › ' + (slug.value || slugify(title.value) || '…');
      snip.replaceChildren(h('span', { class: 'snip-url' }, address), h('span', { class: 'snip-title' }, (seoTitle.value || title.value || 'Titel des Artikels') + ' | Jason Thomas Wolf'), h('span', { class: 'snip-desc' }, (seoDesc.value || excerpt.value || 'Die Kurzbeschreibung erscheint hier.').slice(0, 160)));
      slugPrefix.textContent = BASE[lang];
    }
    const checkList = h('ul', { class: 'checks' });
    function checks() {
      const t = text(), other = post.texts[lang === 'de' ? 'en' : 'de'], desc = t.seo_desc || t.excerpt, name = t.seo_title || t.title;
      const items = [
        [name.length >= 30 && name.length <= 60, 'Titel mit 30 bis 60 Zeichen (jetzt ' + name.length + ')'],
        [desc.length >= 120 && desc.length <= 160, 'Kurzbeschreibung mit 120 bis 160 Zeichen (jetzt ' + desc.length + ')'],
        [(t.words || 0) >= 300, 'Mindestens 300 Wörter Text'],
        [/^##\s/m.test(t.body_md), 'Mindestens eine Zwischenüberschrift'],
        [/(^|[^!])\[[^\]]+\]\(/.test(t.body_md), 'Mindestens ein Link im Text'],
        [!/!\[\s*\]\(/.test(t.body_md), 'Alle Bilder im Text haben eine Beschreibung'],
        [!!post.cover && !!t.cover_alt, 'Titelbild mit Bildbeschreibung'],
        [t.tags.length >= 1 && t.tags.length <= 5, 'Ein bis fünf Hashtags'],
        [post.sources.some(s => s.url), 'Quellen angegeben'],
        [!!other.title && !!other.body_md, 'Fassung in der anderen Sprache vorhanden (' + LANGS[lang === 'de' ? 'en' : 'de'] + ')']
      ];
      checkList.replaceChildren(...items.map(([ok, label]) => h('li', { class: ok ? 'ok' : '' }, label)));
    }

    // Sprachen
    const langTabs = Object.keys(LANGS).map(code => h('button', { type: 'button', 'aria-pressed': code === lang ? 'true' : 'false', onclick: () => setLang(code) }, LANGS[code]));
    function setLang(code) { lang = code; langTabs.forEach((tab, i) => { const key = Object.keys(LANGS)[i]; tab.setAttribute('aria-pressed', key === lang); tab.classList.toggle('is-empty', !post.texts[key].title); }); body.lang = title.lang = excerpt.lang = lang; bound.forEach(fill => fill()); checks(); }

    // Speichern
    const saveState = h('span', { class: 'save-state', role: 'status' }, id ? 'Gespeichert' : 'Neu');
    const saveBtn = h('button', { type: 'button', class: 'btn btn-primary', onclick: () => save() });
    async function save(quiet) {
      const payload = { status: mode === 'draft' ? 'draft' : 'published', publish_at: mode === 'planned' ? fromInput(when.value) : mode === 'now' ? 0 : post.publish_at,
        cover: post.cover, sources: post.sources, texts: post.texts };
      if (mode !== 'draft' && !quiet) { const missing = Object.keys(LANGS).filter(code => !post.texts[code].title || !post.texts[code].body_md); if (missing.length === 2) return toast('Der Artikel braucht Titel und Text.', true); if (missing.length && !confirm('Die Fassung „' + LANGS[missing[0]] + '“ fehlt noch. Trotzdem nur in einer Sprache veröffentlichen?')) return; }
      saveBtn.disabled = true;
      try {
        const saved = await api(post.id ? 'PUT' : 'POST', post.id ? 'posts/' + post.id : 'posts', payload), created = !post.id;
        post = saved; for (const code of Object.keys(LANGS)) post.texts[code] = { ...emptyText(), ...(post.texts[code] || {}) };
        dirty = false; saveState.textContent = 'Gespeichert um ' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        try { localStorage.removeItem(draftKey); } catch (e) {}
        mode = post.status === 'published' ? 'planned' : 'draft'; when.value = post.publish_at ? toInput(post.publish_at) : '';
        if (created) { history.replaceState(null, '', '#/artikel/' + post.id); viewLinks(); }
        setLang(lang); drawPublish(); schedulePreview();
        toast(post.status === 'draft' ? 'Entwurf gespeichert' : post.publish_at > Date.now() / 1000 ? 'Geplant für den ' + dateTime(post.publish_at) + ' Uhr' : 'Artikel ist veröffentlicht');
      } catch (e) { fail(e); }
      saveBtn.disabled = false;
    }
    const previewLink = h('a', { class: 'btn', target: '_blank', rel: 'noopener' }, 'Seitenvorschau'), liveLink = h('a', { class: 'btn', target: '_blank', rel: 'noopener' }, 'Ansehen');
    function viewLinks() { previewLink.hidden = !post.id; previewLink.onclick = async e => { if (dirty) { e.preventDefault(); await save(true); window.open(previewLink.href); } };
      const live = post.status === 'published' && post.publish_at <= Date.now() / 1000 && post.texts[lang].slug; liveLink.hidden = !live;
      if (post.id) previewLink.href = '/blog/admin/vorschau/' + post.id + '?lang=' + lang; if (live) liveLink.href = BASE[lang] + post.texts[lang].slug; }
    bound.push(viewLinks);
    view.onkeydown = e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); } };

    const card = (label, hint, ...content) => h('section', { class: 'card' }, h('h2', {}, label), hint && h('p', { class: 'muted' }, hint), content);
    const labelled = (label, element, extra) => h('label', { class: 'field' }, h('span', { class: 'field-label' }, label, extra), element);
    view.replaceChildren(
      h('header', { class: 'view-head editor-head' }, h('a', { class: 'back', href: '#/artikel' }, '← Artikel'), saveState, h('div', { class: 'view-actions' }, liveLink, previewLink, saveBtn)),
      h('div', { class: 'editor' },
        h('div', { class: 'editor-main' },
          h('div', { class: 'seg lang-tabs', role: 'group', 'aria-label': 'Sprache des Textes' }, langTabs, h('span', { class: 'muted' }, 'Jede Sprache hat eigenen Titel, Text, Hashtags und Adresse. Titelbild, Quellen und Termin gelten für beide.')),
          title, labelled('Kurzbeschreibung', excerpt, counter(excerpt, [120, 160])),
          h('div', { class: 'write-bar' }, h('div', { class: 'seg' }, layout), words), write),
        h('aside', { class: 'editor-side' },
          card('Veröffentlichung', null, publishBox),
          card('Titelbild', null, coverBox, labelled('Bildbeschreibung', coverAlt)),
          card('Hashtags', 'Ein bis fünf Themen. Jedes bekommt eine eigene Themenseite.', h('div', { class: 'chip-input' }, tagList, tagInput)),
          card('Quellen', 'Erscheinen nummeriert unter dem Artikel, in beiden Sprachen.', sourceList),
          card('Suchmaschinen', 'So kann der Artikel bei Google erscheinen.', snip, labelled('Adresse', h('span', { class: 'slug' }, slugPrefix, slug)), labelled('Titel für Suchmaschinen', seoTitle, counter(seoTitle, [30, 60])), labelled('Beschreibung für Suchmaschinen', seoDesc, counter(seoDesc, [120, 160]))),
          card('Prüfliste', 'Für die gewählte Sprache. Nichts davon ist Pflicht, alles hilft der Sichtbarkeit.', checkList))));
    drawCover(); drawSources(); setLang('de'); drawPublish(); schedulePreview();
    if (dirty) saveState.textContent = 'Nicht gespeichert';
    if (!id) title.focus();
  }
  // Wie der Server: Umlaute ausschreiben, alles andere zu Bindestrichen
  const slugify = s => s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').normalize('NFKD').replace(/[^\x00-\x7f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

  // ---------- Sichtbarkeit ----------
  function help() {
    const p = (...c) => h('p', {}, c), a = (href, label) => h('a', { href, target: '_blank', rel: 'noopener' }, label || href);
    const list = items => h('ul', { class: 'help-list' }, items.map(i => h('li', {}, i)));
    view.replaceChildren(head('Sichtbarkeit'),
      h('section', { class: 'card' }, h('h2', {}, 'Das erledigt der Blog von selbst'), list([
        ['Jeder Artikel steht mit Datum in der Sitemap: ', a('/blog/sitemap.xml'), '. Google und Bing lesen sie regelmäßig.'],
        'Deutsche und englische Fassung verweisen aufeinander (hreflang). Suchmaschinen zeigen so jedem die passende Sprache.',
        'Titel, Beschreibung, Autor, Datum und Titelbild stehen als strukturierte Daten (BlogPosting) im Quelltext.',
        'Beim Teilen auf LinkedIn, WhatsApp und X erscheinen Titel, Kurzbeschreibung und Titelbild als Vorschau.',
        ['Feeds für Leser und Aggregatoren: ', a('/blog/feed.xml'), ' und ', a('/en/blog/feed.xml'), '.'],
        'Geplante Artikel erscheinen automatisch zum Termin, auch in Sitemap, Feed und auf der Startseite.'])),
      h('section', { class: 'card' }, h('h2', {}, 'Einmalig einrichten'), list([
        ['In der ', a('https://search.google.com/search-console', 'Google Search Console'), ' unter „Sitemaps“ beide Adressen eintragen: sitemap.xml und blog/sitemap.xml.'],
        ['Dasselbe in den ', a('https://www.bing.com/webmasters', 'Bing Webmaster Tools'), '. Bing versorgt auch DuckDuckGo und ChatGPT-Suche.']])),
      h('section', { class: 'card' }, h('h2', {}, 'Bei jedem Artikel'), list([
        'Ein Thema, eine Frage: Der Titel sagt, was der Leser bekommt, mit dem Begriff, nach dem man suchen würde.',
        'Prüfliste im Editor abarbeiten, in beiden Sprachen.',
        'Nach dem Veröffentlichen in der Search Console die Adresse oben eingeben und „Indexierung beantragen“ wählen. Das beschleunigt die Aufnahme von Tagen auf Stunden.',
        'Auf LinkedIn teilen, mit zwei, drei eigenen Sätzen. Die ersten Leser kommen von dort, nicht von Google.',
        'Auf einen älteren eigenen Artikel verlinken, wenn es passt. Interne Links helfen Google, Zusammenhänge zu erkennen.',
        'Geduld: Neue Artikel brauchen meist einige Tage bis Wochen, bis sie in der Suche auftauchen.'])));
  }

  // ---------- Einstellungen ----------
  function settings() {
    const input = (name, label, type) => h('label', { class: 'field' }, h('span', { class: 'field-label' }, label), h('input', { name, type: type || 'password', required: true, autocomplete: type ? 'one-time-code' : 'new-password' }));
    const form = h('form', { class: 'card narrow', onsubmit: async e => { e.preventDefault(); const f = new FormData(form);
      try { await api('POST', 'password', Object.fromEntries(f)); toast('Passwort geändert. Bitte neu anmelden.'); setTimeout(() => { location.href = '/blog/admin/login'; }, 1500); } catch (err) { fail(err); } } },
      h('h2', {}, 'Passwort ändern'), input('current', 'Aktuelles Passwort'), input('password', 'Neues Passwort (mindestens 12 Zeichen)'), input('repeat', 'Neues Passwort wiederholen'), input('code', 'Code aus der Authenticator-App', 'text'),
      h('button', { class: 'btn btn-primary', type: 'submit' }, 'Passwort ändern'));
    view.replaceChildren(head('Einstellungen'), form,
      h('section', { class: 'card narrow' }, h('h2', {}, 'Sicherung'), h('p', { class: 'muted' }, 'Lädt alle Artikel als Datenbank herunter, auf Wunsch mit allen Bildern und Videos. Am besten nach jedem neuen Artikel.'),
        h('div', { class: 'row' }, h('a', { class: 'btn', href: '/blog/admin/api/backup' }, 'Nur Artikel'), h('a', { class: 'btn', href: '/blog/admin/api/backup?medien=1' }, 'Artikel und Medien'))),
      h('section', { class: 'card narrow' }, h('h2', {}, 'Zugang zurücksetzen'), h('p', { class: 'muted' }, 'Wenn die Authenticator-App verloren geht: auf dem Server die Datei account.json im Datenordner des Blogs löschen und den Dienst neu starten. Im Protokoll steht dann ein neuer Einrichtungscode.')));
  }

  // ---------- Ansichten wechseln ----------
  let current = location.hash;
  async function route() {
    if (leaveGuard && leaveGuard() && !confirm('Es gibt ungespeicherte Änderungen. Ansicht trotzdem verlassen?')) { history.replaceState(null, '', current); return; }
    leaveGuard = null; view.onkeydown = null; current = location.hash;
    const path = location.hash.replace(/^#\/?/, ''), [name, arg] = path.split('/');
    const active = name === '' ? 'overview' : name === 'artikel' ? 'posts' : name === 'medien' ? 'media' : name === 'hilfe' ? 'help' : 'settings';
    document.querySelectorAll('.side-nav a').forEach(link => link.toggleAttribute('aria-current', link.dataset.view === active));
    view.replaceChildren(h('p', { class: 'muted' }, 'Lädt …'));
    try {
      if (name === '') await overview();
      else if (name === 'artikel' && arg) await editor(arg === 'neu' ? null : Number(arg));
      else if (name === 'artikel') await posts();
      else if (name === 'medien') await media();
      else if (name === 'hilfe') help();
      else settings();
    } catch (e) { view.replaceChildren(h('p', { class: 'error' }, e.message)); }
    scrollTo(0, 0);
  }
  addEventListener('hashchange', route);
  addEventListener('beforeunload', e => { if (leaveGuard && leaveGuard()) e.preventDefault(); });
  route();
})();

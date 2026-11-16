(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // Language: a visitor arriving from outside gets the version matching the browser language.
  // A manual choice via DE/EN is remembered and always wins. Search engine crawlers are never redirected.
  const LANG_KEY = 'jw-lang', pageLang = document.documentElement.lang;
  const altUrl = l => { const el = $('link[rel="alternate"][hreflang="' + l + '"]'); return el && el.href; };
  $$('.lang a').forEach(a => a.addEventListener('click', () => { try { localStorage.setItem(LANG_KEY, a.lang); } catch (e) {} }));
  let wanted = null;
  try { wanted = localStorage.getItem(LANG_KEY); } catch (e) {}
  wanted = wanted || ((navigator.language || 'de').toLowerCase().startsWith('de') ? 'de' : 'en');
  let fromOutside = true;
  try { fromOutside = !document.referrer || new URL(document.referrer).host !== location.host; } catch (e) {}
  if (fromOutside && wanted !== pageLang && altUrl(wanted) && !/bot|crawl|spider|lighthouse|headless|preview/i.test(navigator.userAgent)) {
    location.replace(altUrl(wanted) + location.hash);
    return;
  }

  // Mobile menu
  const menuBtn = $('.menu-btn'), nav = $('#main-nav');
  const setMenu = open => { menuBtn.setAttribute('aria-expanded', open); nav.classList.toggle('is-open', open); };
  menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  // Credentials: filter by field; "all" starts collapsed to the first few cards
  const grid = $('#cert-grid');
  if (grid) {
  const filterBtns = $$('.filters button'), cards = $$('.cert', grid), moreBtn = $('.more-btn');
  let expanded = false, filter = 'all';
  function renderCerts() {
    cards.forEach(c => { c.hidden = filter !== 'all' && c.dataset.cat !== filter; });
    grid.classList.toggle('is-collapsed', filter === 'all' && !expanded);
    moreBtn.hidden = filter !== 'all';
    moreBtn.textContent = expanded ? moreBtn.dataset.less : moreBtn.dataset.more;
    moreBtn.setAttribute('aria-expanded', expanded);
  }
  filterBtns.forEach(b => b.addEventListener('click', () => {
    filter = b.dataset.filter;
    filterBtns.forEach(x => x.setAttribute('aria-pressed', x === b));
    renderCerts();
  }));
  moreBtn.addEventListener('click', () => {
    expanded = !expanded; renderCerts();
    if (!expanded) $('#credentials').scrollIntoView();
  });
  }

  // Chart: draw the line once when it scrolls into view
  const chart = $('.chart-svg');
  if (chart && 'IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    chart.classList.add('is-waiting');
    new IntersectionObserver((entries, io) => {
      if (entries[0].isIntersecting) { chart.classList.replace('is-waiting', 'is-drawn'); io.disconnect(); }
    }, { threshold: 0.35 }).observe(chart);
  }

  // Contact form: send in the background and thank the sender on this page
  // (without JavaScript the form still works as a normal POST)
  const form = $('.contact-form'), status = $('.form-status'), thanks = $('.form-thanks');
  if (form) {
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = $('button[type=submit]', form), label = btn.textContent;
    btn.disabled = true; btn.textContent = form.dataset.sending; status.textContent = '';
    try {
      const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(res.status);
      form.reset(); form.classList.add('is-sent'); thanks.hidden = false; thanks.focus();
      if (window.gtag) window.gtag('event', 'generate_lead', { method: 'contact_form' });
    } catch (err) {
      status.textContent = form.dataset.err;
    }
    btn.disabled = false; btn.textContent = label;
  });
  $('[data-form-again]').addEventListener('click', () => { form.classList.remove('is-sent'); thanks.hidden = true; $('#f-name').focus(); });
  }

  // Blog teaser: shows the newest article, stays hidden while there is none
  const teaser = $('#blog-teaser');
  if (teaser) fetch('/blog/api/latest.json?lang=' + document.documentElement.lang).then(r => r.ok ? r.json() : null).then(p => {
    if (!p || !p.title) return;
    const lang = document.documentElement.lang, note = p.lang !== lang && teaser.dataset.otherLang ? ' · ' + teaser.dataset.otherLang : '';
    $('a', teaser).href = p.url;
    $('.teaser-title', teaser).textContent = p.title;
    $('.teaser-meta', teaser).textContent = new Date(p.date * 1000).toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) + note;
    teaser.hidden = false;
  }).catch(() => {});

  // Cookie consent with Google Consent Mode v2 (basic mode): before a choice everything is "denied" and the Google
  // script is not loaded at all. "Accept" grants analytics only; advertising signals stay denied.
  const KEY = 'jw-cookie-consent', banner = $('.cookie'), GA_ID = 'G-THRPTND065';
  const store = { get: () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } }, set: v => { try { localStorage.setItem(KEY, v); } catch (e) {} } };
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  function loadAnalytics() {
    window.gtag('consent', 'update', { analytics_storage: 'granted' });
    if (window.__gaLoaded) return;
    window.__gaLoaded = true;
    const s = document.createElement('script');
    s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, { allow_google_signals: false, allow_ad_personalization_signals: false });
  }
  const consent = store.get();
  if (consent === 'accepted') loadAnalytics(); else if (consent !== 'declined') banner.hidden = false;
  // Declining after an earlier "accept" removes the Analytics cookies and stops tracking on the next page load
  function dropAnalytics() {
    window.gtag('consent', 'update', { analytics_storage: 'denied' });
    const names = document.cookie.split(';').map(c => c.split('=')[0].trim()).filter(n => n === '_ga' || n.startsWith('_ga_'));
    for (const n of names) for (const d of ['', '; domain=' + location.hostname, '; domain=.' + location.hostname]) document.cookie = n + '=; Max-Age=0; path=/' + d;
    if (window.__gaLoaded) location.reload();
  }
  $$('[data-cookie]').forEach(b => b.addEventListener('click', () => {
    store.set(b.dataset.cookie); banner.hidden = true;
    if (b.dataset.cookie === 'accepted') loadAnalytics(); else dropAnalytics();
  }));
  $('[data-cookie-open]').addEventListener('click', () => { banner.hidden = false; });
})();

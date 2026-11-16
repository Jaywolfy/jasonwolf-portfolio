// Baut die statische Website nach public/: Startseite (DE, EN), Impressum, Datenschutz, Fehlerseite,
// sitemap.xml und llms.txt. Aufruf: node src/build.cjs
// Texte der Startseite kommen aus content.json, Korrekturen stehen in fix(). Rechtstexte stehen in legal.cjs.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const content = require('./content.json');
const legal = require('./legal.cjs');
const root = path.join(__dirname, '..', 'public');
const SITE = 'https://jasonwolf.de';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const monthIndex = d => { const m = d.match(/(\d\d)\/(\d{4})/g); if (!m) return 0; const [mm, yy] = m[m.length - 1].split('/'); return +yy * 12 + +mm; };

// ---------- Korrekturen gegenüber der bestehenden Seite ----------
function fix(L, d) {
  const de = L === 'de', t = d.t;
  t.navServices = de ? 'Schwerpunkte' : 'Focus areas';
  t.claimA = de ? 'Technologie, die trägt.' : 'Technology you can rely on.';
  t.claimB = de ? 'Analyse, die überzeugt.' : 'Analysis that holds up.';
  t.heroLead = de
    ? 'Ich bin Werkstudent im IT Touchpoint der Deutsche Börse Group und studiere Informatik an der TU Darmstadt. Dazu kommen mehr als dreieinhalb Jahre Praxis im IT-Support und fundiertes Wissen in Informationssicherheit und Finanzanalyse.'
    : 'I am a working student in IT Touchpoint at Deutsche Börse Group and study Computer Science at TU Darmstadt. I bring more than three and a half years of hands-on IT support and solid knowledge of information security and financial analysis.';
  t.ctaContact = de ? 'Kontakt aufnehmen' : 'Get in touch';
  t.ctaPath = de ? 'Werdegang ansehen' : 'See my experience';
  t.ctaCv = de ? 'Lebenslauf als PDF' : 'Résumé as PDF';
  t.servicesTitle = de ? 'Drei Disziplinen, ein Profil.' : 'Three disciplines, one profile.';
  t.chartTitle = de ? 'Von 2022 bis heute' : 'From 2022 to today';
  t.chartLead = de ? 'Sechs Stationen in Schule, Studium und Beruf: vom ersten Praktikum bis zur Deutsche Börse Group.' : 'Six milestones in school, university and work: from my first internship to Deutsche Börse Group.';
  t.chartAria = de ? 'Stufendiagramm des Werdegangs von 2022 bis heute. Die Stationen stehen ausführlich im Abschnitt Werdegang.' : 'Step chart of my career from 2022 to today. The milestones are described in detail in the Experience section.';
  t.today = de ? 'heute' : 'today';
  t.certsLead = de
    ? 'Jeder Nachweis ist verlinkt: Cisco-Zertifikate über Credly, Job-Simulationen über Forage. Job-Simulationen sind Online-Programme der genannten Unternehmen und als solche gekennzeichnet.'
    : 'Every credential is linked: Cisco certificates via Credly, job simulations via Forage. Job simulations are online programs by the companies named and are labeled as such.';
  t.verify = de ? 'Nachweis ansehen' : 'View credential';
  t.newTab = de ? '(öffnet in neuem Tab)' : '(opens in a new tab)';
  t.lblCvValue = de ? 'PDF herunterladen' : 'Download PDF';
  t.current = de ? 'aktuell' : 'current';
  t.formOk = de ? 'Nachricht gesendet. Ich melde mich in der Regel innerhalb von 24 Stunden.' : 'Message sent. I usually reply within 24 hours.';
  t.formErr = de ? 'Die Nachricht konnte nicht gesendet werden. Bitte schreiben Sie direkt an jason@jasonwolf.de.' : 'The message could not be sent. Please write directly to jason@jasonwolf.de.';
  t.formSending = de ? 'Wird gesendet …' : 'Sending …';
  t.navMain = de ? 'Hauptnavigation' : 'Main navigation';
  t.langAria = de ? 'Sprache' : 'Language';
  t.filterAria = de ? 'Nachweise filtern' : 'Filter credentials';
  t.menuLabel = de ? 'Menü' : 'Menu';
  t.portraitCaption = 'Frankfurt am Main';
  t.title = de ? 'Jason Thomas Wolf | IT-Support & Cybersecurity, Frankfurt' : 'Jason Thomas Wolf | IT Support & Cybersecurity, Frankfurt';
  t.metaDesc = de
    ? 'Jason Thomas Wolf: Werkstudent IT Touchpoint bei der Deutsche Börse Group, Informatikstudent an der TU Darmstadt. IT-Support, Administration, IT-Security.'
    : 'Jason Thomas Wolf: working student in IT Touchpoint at Deutsche Börse Group, Computer Science student at TU Darmstadt. IT support, administration, security.';

  t.formPrivacy = de
    ? 'Ich willige ein, dass meine Angaben zur Beantwortung meiner Anfrage verarbeitet und dafür an den Formulardienst Formspree (USA) übermittelt werden. Die Einwilligung kann ich jederzeit widerrufen. Details in der'
    : 'I consent to my details being processed to answer my inquiry and transferred to the form service Formspree (USA) for this purpose. I can withdraw my consent at any time. Details in the';
  t.formPrivacyLink = de ? 'Datenschutzerklärung' : 'privacy policy';
  t.portraitAlt = de ? 'Portrait von Jason Thomas Wolf' : 'Portrait of Jason Thomas Wolf';
  t.projectsLead = de ? 'Eigene Projekte aus IT-Betrieb, Softwareentwicklung und Finanzanalyse. Code und Modelle sind öffentlich auf GitHub einsehbar.'
    : 'Personal projects from IT operations, software development and financial analysis. Code and models are publicly available on GitHub.';
  // Projekte: Server-Dashboard (IT), Marktdaten-Pipeline (IT und Finance), DCF-Bewertung (Finance)
  t.projectLink = de ? 'Auf GitHub ansehen' : 'View on GitHub';
  d.projects = [
    { title: de ? 'Server-Dashboard mit Terminal' : 'Server dashboard with terminal', url: 'https://github.com/Jaywolfy/server-terminal',
      tags: ['Python', 'Linux', 'Security'],
      desc: de ? 'Web-Oberfläche für den eigenen Linux-Server: Auslastung mit Verlauf, Updates, SSH-Anmeldeversuche mit Herkunft, Docker-Verwaltung und ein Terminal im Browser. Anmeldung mit Passwort und Einmalcode, 203 Tests.'
        : 'Web interface for my own Linux server: load history, updates, SSH login attempts with origin, Docker management and a terminal in the browser. Login with password and one-time code, 203 tests.' },
    { title: de ? 'Marktdaten-Pipeline' : 'Market data pipeline', url: 'https://github.com/Jaywolfy/marktdaten-pipeline',
      tags: ['Python', 'PostgreSQL', 'Finance'],
      desc: de ? 'Ruft täglich Kurse von DAX-Werten und Euro-Wechselkursen ab, prüft sie auf Lücken und unplausible Sprünge, speichert sie in PostgreSQL und berechnet Rendite, Volatilität und maximalen Rückgang.'
        : 'Fetches daily prices for DAX stocks and euro exchange rates, checks them for gaps and implausible jumps, stores them in PostgreSQL and computes return, volatility and maximum drawdown.' },
    { title: de ? 'DCF-Bewertung der SAP SE' : 'DCF valuation of SAP SE', url: 'https://github.com/Jaywolfy/sap-dcf-bewertung',
      tags: ['Finance', 'Excel', 'Python'],
      desc: de ? 'Unternehmensbewertung nach dem Discounted-Cashflow-Verfahren: Excel-Modell mit Prognose der freien Cashflows, Kapitalkosten nach CAPM und Sensitivitätstabelle, dazu eine unabhängige Kontrollrechnung in Python.'
        : 'Company valuation using the discounted cash flow method: Excel model with free cash flow forecast, cost of capital based on CAPM and a sensitivity table, plus an independent check calculation in Python.' }
  ];
  for (const c of d.certs) {
    if (c.title === 'Greenhouse Gas Accounting for IT') c.title = 'Introduction to Greenhouse Gas Accounting for IT';
  }
  // Die ersten sechs stehen in der eingeklappten Ansicht; der Rest folgt nach Datum.
  const featured = ['Junior Cybersecurity Analyst Career Path', 'Cyber Threat Management', 'Networking Basics', 'Introduction to Cybersecurity Job Simulation', 'Investment Banking Job Simulation', 'Internal Audit Job Simulation'];
  const rank = c => { const i = featured.indexOf(c.title); return i < 0 ? featured.length : i; };
  d.certs.sort((a, b) => rank(a) - rank(b) || monthIndex(b.date) - monthIndex(a.date));
  t.showAll = de ? `Alle ${d.certs.length} Nachweise anzeigen` : `Show all ${d.certs.length} credentials`;
  t.showLess = de ? 'Weniger anzeigen' : 'Show fewer';
  t.thanksTitle = de ? 'Danke für Ihre Nachricht.' : 'Thank you for your message.';
  t.thanksText = de ? 'Sie ist angekommen. Ich melde mich in der Regel innerhalb von 24 Stunden.' : 'It has arrived. I usually reply within 24 hours.';
  t.thanksAgain = de ? 'Weitere Nachricht schreiben' : 'Write another message';
  for (const j of d.timeline) {
    j.org = j.org.replace('Europe 101', 'Europe101');
    j.title = j.title.replace(' (Mini-job, part-time)', ' (part-time)');
    j.points = j.points.map(p => p.replace('WLAN and internet', 'Wi-Fi and internet').replace('GPA: 1.7 (German scale, 1 = best)', 'Final grade: 1.7 (German scale, 1.0 is best)'));
    j.end = /seit|since/.test(j.date) ? 1e9 : monthIndex(j.date);
    j.isCurrent = j.end === 1e9;
    j.kindKey = j.badgeColor === '#3f5a8a' ? 'edu' : j.badgeColor === '#97742f' ? 'work' : 'prog';
  }
  d.timeline.sort((a, b) => b.end - a.end || monthIndex(b.date.slice(0, 7)) - monthIndex(a.date.slice(0, 7)));
  return d;
}

// ---------- Stufendiagramm ----------
// Zeitachse maßstäblich (Monate seit 01/2022); jede Beschriftung steht in ihrer eigenen Stufe.
function chart(L, t) {
  const de = L === 'de';
  const pts = [
    [3, '04/2022', de ? 'Praktikum' : 'Internship', 'Eickmann Computer'],
    [14, '03/2023', 'IT-Support', 'PCDOKTOR.de'],
    [29, '06/2024', 'Realschulabschluss', de ? 'Note 1,7' : 'Grade 1.7'],
    [53, '06/2026', 'Fachhochschulreife', de ? 'Informationstechnik' : 'Information technology'],
    [57, '10/2026', de ? 'B.Sc. Informatik' : 'B.Sc. Computer Science', 'TU Darmstadt'],
    [58, de ? 'seit 11/2026' : 'since 11/2026', de ? 'Werkstudent' : 'Working student', 'Deutsche Börse Group']
  ];
  const base = 404, rise = 64;
  const X = m => +(20 + m * (1060 / 60)).toFixed(1), Y = i => base - i * rise;
  let dPath = `M20,${base}`, dots = '', labels = '';
  pts.forEach(([m, date, title, sub], k) => {
    const i = k + 1, x = X(m), last = i === pts.length, first = k === 0;
    dPath += ` H${x} V${Y(i)}`;
    dots += `<circle cx="${x}" cy="${Y(i)}" r="${last ? 5.5 : 4}"/>`;
    // first label sits right of its riser (no room on the left), all others left of theirs
    const lx = first ? x + 14 : x - 14, yb = first ? base : Y(i - 1), anchor = first ? '' : ' text-anchor="end"';
    labels += `<text x="${lx}" y="${yb - 46}" class="c-date"${anchor}>${date}</text>` +
      `<text x="${lx}" y="${yb - 27}" class="c-label${last ? ' c-now' : ''}"${anchor}>${esc(title)}</text>` +
      `<text x="${lx}" y="${yb - 9}" class="c-sub"${anchor}>${esc(sub)}</text>`;
  });
  dPath += ' H1080';
  const years = [2022, 2023, 2024, 2025, 2026].map((y, k) => `<line x1="${X(k * 12)}" y1="${base}" x2="${X(k * 12)}" y2="${base + 7}"/><text x="${X(k * 12)}" y="${base + 28}" class="c-year">${y}</text>`).join('');
  const list = pts.slice().reverse().map(([, date, title, sub]) => `<li><span class="mono">${date}</span><strong>${esc(title)}</strong><span>${esc(sub)}</span></li>`).join('');
  return `<svg class="chart-svg" viewBox="0 0 1100 444" role="img" aria-label="${esc(t.chartAria)}">
      <path class="c-area" d="${dPath} V${base} H20 Z"/>
      <g class="c-axis"><line x1="20" y1="${base}" x2="1080" y2="${base}"/>${years}<text x="1080" y="${base + 28}" class="c-year" text-anchor="end">${t.today}</text></g>
      <path class="c-line" pathLength="1" d="${dPath}"/>
      <g class="c-dots">${dots}</g>
      <g class="c-labels">${labels}</g>
    </svg>
    <ol class="chart-list" reversed>${list}</ol>`;
}

// ---------- Gemeinsame Bausteine ----------
// Dateien bekommen einen Hash als ?v=…, damit der Server sie lange cachen darf und Änderungen trotzdem sofort ankommen.
const ver = f => `/${f}?v=${crypto.createHash('sha1').update(fs.readFileSync(path.join(root, f))).digest('hex').slice(0, 8)}`;
const OG_IMAGE = `${SITE}/img/og-jason-thomas-wolf.jpg`;
const PORTRAIT = { src: '/img/jasonwolf.jpg', width: 965, height: 1287 };

const ui = L => {
  const de = L === 'de';
  return {
    de, home: de ? '/' : '/en/', blog: de ? '/blog/' : '/en/blog/',
    skip: de ? 'Zum Inhalt springen' : 'Skip to content',
    navMain: de ? 'Hauptnavigation' : 'Main navigation',
    nav: [['focus', de ? 'Schwerpunkte' : 'Focus areas'], ['about', de ? 'Profil' : 'Profile'], ['projects', de ? 'Projekte' : 'Projects'],
      ['experience', de ? 'Werdegang' : 'Experience'], ['credentials', de ? 'Qualifikationen' : 'Credentials'], ['faq', 'FAQ']],
    contact: de ? 'Kontakt' : 'Contact', menu: de ? 'Menü' : 'Menu', lang: de ? 'Sprache' : 'Language',
    rights: de ? '© 2026 Jason Thomas Wolf. Alle Rechte vorbehalten.' : '© 2026 Jason Thomas Wolf. All rights reserved.',
    imprint: de ? 'Impressum' : 'Legal notice', imprintHref: de ? '/impressum.html' : '/en/legal-notice.html',
    privacy: de ? 'Datenschutz' : 'Privacy policy', privacyHref: de ? '/datenschutz.html' : '/en/privacy.html',
    cookies: de ? 'Cookie-Einstellungen' : 'Cookie settings',
    cookieAria: de ? 'Einwilligung in die Statistik' : 'Consent to statistics',
    cookieText: de
      ? 'Darf ich Ihren Besuch mit Google Analytics auswerten? Die Statistik hilft mir, die Website zu verbessern, und wird erst nach Ihrer Zustimmung geladen. Mehr dazu in der'
      : 'May I evaluate your visit with Google Analytics? The statistics help me improve the website and are only loaded after you agree. More in the',
    cookieLink: de ? 'Datenschutzerklärung' : 'privacy policy',
    accept: de ? 'Akzeptieren' : 'Accept', decline: de ? 'Ablehnen' : 'Decline'
  };
};

// alt: Adressen derselben Seite in beiden Sprachen ({ de, en }) oder null, wenn es nur eine Fassung gibt
function head({ L, title, desc, url, alt, robots = 'index, follow, max-image-preview:large', ogType = 'website', extra = '' }) {
  const de = L === 'de';
  return `<!DOCTYPE html>
<html lang="${L}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="author" content="Jason Thomas Wolf">
<meta name="robots" content="${robots}">
<meta name="theme-color" content="#f6f4ef">${url ? `
<link rel="canonical" href="${url}">` : ''}${alt ? `
<link rel="alternate" hreflang="de" href="${SITE}${alt.de}">
<link rel="alternate" hreflang="en" href="${SITE}${alt.en}">
<link rel="alternate" hreflang="x-default" href="${SITE}${alt.de}">` : ''}
<link rel="alternate" type="application/atom+xml" title="${de ? 'Blog von Jason Thomas Wolf' : 'Blog by Jason Thomas Wolf'}" href="${ui(L).blog}feed.xml">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<meta property="og:type" content="${ogType}">
<meta property="og:locale" content="${de ? 'de_DE' : 'en_US'}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">${url ? `
<meta property="og:url" content="${url}">` : ''}
<meta property="og:site_name" content="Jason Thomas Wolf">
<meta property="og:image" content="${OG_IMAGE}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Jason Thomas Wolf – IT-Support, Cybersecurity, Finance">
<meta name="twitter:card" content="summary_large_image">
<link rel="preload" href="/fonts/source-serif-4-normal-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/instrument-sans-normal-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${ver('fonts/fonts.css')}">
<link rel="stylesheet" href="${ver('assets/style.css')}">${extra}
<script defer src="${ver('assets/site.js')}"></script>
</head>
<body>
<a class="skip" href="#main">${ui(L).skip}</a>
`;
}

function header({ L, alt, onHome = false }) {
  const u = ui(L), at = onHome ? '' : u.home;
  const sw = (code, label) => L === code ? `<span aria-current="true">${code.toUpperCase()}</span>`
    : `<a href="${alt ? alt[code] : (code === 'de' ? '/' : '/en/')}" lang="${code}" hreflang="${code}" aria-label="${label}">${code.toUpperCase()}</a>`;
  return `
<header class="site-header">
  <div class="wrap header-row">
    <a class="brand" href="${onHome ? '#top' : u.home}">Jason Thomas Wolf</a>
    <nav class="main-nav" id="main-nav" aria-label="${u.navMain}">
      ${u.nav.map(([id, l]) => `<a href="${at}#${id}">${l}</a>`).join('\n      ')}
      <a href="${u.blog}">Blog</a>
      <a class="btn btn-small nav-contact" href="${at}#contact">${u.contact}</a>
    </nav>
    <div class="header-tools">
      <div class="lang" role="group" aria-label="${u.lang}">
        ${sw('de', 'Deutsch')}
        ${sw('en', 'English')}
      </div>
      <button class="menu-btn" type="button" aria-expanded="false" aria-controls="main-nav">${u.menu}</button>
    </div>
  </div>
</header>
`;
}

const footerNav = L => { const u = ui(L); return `<p>${u.rights}</p>
    <nav aria-label="Footer">
      <a href="${u.blog}">Blog</a>
      <a href="${u.imprintHref}">${u.imprint}</a>
      <a href="${u.privacyHref}">${u.privacy}</a>
      <button type="button" data-cookie-open>${u.cookies}</button>
    </nav>`; };

const cookie = L => { const u = ui(L); return `
<div class="cookie" role="dialog" aria-label="${u.cookieAria}" hidden>
  <p>${u.cookieText} <a href="${u.privacyHref}">${u.cookieLink}</a>.</p>
  <div><button type="button" class="btn btn-small btn-ghost-light" data-cookie="declined">${u.decline}</button><button type="button" class="btn btn-small btn-gold" data-cookie="accepted">${u.accept}</button></div>
</div>
</body>
</html>
`; };

// Unterseiten (Rechtstexte, Fehlerseite) haben einen schlichten dunklen Fuß statt des Kontaktbereichs.
const plainFooter = L => `
<footer class="band page-footer">
  <div class="wrap site-footer">
    ${footerNav(L)}
  </div>
</footer>
${cookie(L)}`;

// ---------- Startseite ----------
function home(L, d) {
  const de = L === 'de', t = d.t, u = ui(L);
  const urlSelf = SITE + u.home, alt = { de: '/', en: '/en/' };
  const cv = '/' + t.cvHref;
  const kinds = { edu: t.kindEdu, work: t.kindWork, prog: t.kindProject };
  const cats = [...new Set(d.certs.map(c => c.category))];
  const count = c => d.certs.filter(x => x.category === c).length;

  const ld = JSON.parse(JSON.stringify(content.personLd).replaceAll('src/assets/images/jasonwolf.jpg', 'img/jasonwolf.jpg'));
  const [pageLd, siteLd, imgLd] = ld['@graph'];
  pageLd.url = urlSelf; pageLd.name = t.title; pageLd.inLanguage = de ? 'de-DE' : 'en'; pageLd.dateModified = '__LASTMOD__';
  siteLd.name = 'Jason Thomas Wolf';
  imgLd.width = PORTRAIT.width; imgLd.height = PORTRAIT.height;
  const person = ld['@graph'].find(n => n['@type'] === 'Person');
  person.jobTitle = de ? 'Werkstudent IT Touchpoint' : 'Working Student – IT Touchpoint';
  if (!de) {
    person.description = t.heroLead;
    siteLd.description = 'Personal website of Jason Thomas Wolf, working student in IT Touchpoint at Deutsche Börse Group and Computer Science student at TU Darmstadt.';
    imgLd.caption = t.portraitAlt;
    person.hasOccupation.skills = 'User-centric IT service, digital workplace, device lifecycle management, hardware rollouts, Windows and Linux administration, data recovery, backup and restore, malware removal, Python and Bash automation, network security';
  }
  for (const c of person.hasCredential) { const m = d.certs.find(x => c.name.startsWith(x.title)); if (m && m.url && !c.url) c.url = m.url; }
  const faqLd = { '@context': 'https://schema.org', '@type': 'FAQPage', inLanguage: de ? 'de-DE' : 'en', mainEntity: d.faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) };

  return head({ L, title: t.title, desc: t.metaDesc, url: urlSelf, alt, ogType: 'profile', extra: `
<link rel="me" href="https://github.com/Jaywolfy">
<link rel="me" href="https://www.linkedin.com/in/jason--wolf">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<script type="application/ld+json">${JSON.stringify(faqLd)}</script>` }) + header({ L, alt, onHome: true }) + `
<main id="main">

<section class="hero wrap" id="top">
  <div class="hero-text">
    <h1><span class="hero-name">Jason Thomas Wolf</span>
      <span class="hero-claim">${esc(t.claimA)} <i>${esc(t.claimB)}</i></span></h1>
    <p class="hero-lead">${esc(t.heroLead)}</p>
    <div class="hero-actions">
      <a class="btn" href="#contact">${esc(t.ctaContact)}</a>
      <a class="btn btn-ghost" href="#experience">${esc(t.ctaPath)}</a>
      <a class="text-link" href="${cv}" download>${esc(t.ctaCv)}</a>
    </div>
  </div>
  <figure class="portrait">
    <img src="${PORTRAIT.src}" alt="${esc(t.portraitAlt)}" width="${PORTRAIT.width}" height="${PORTRAIT.height}" fetchpriority="high" decoding="async">
    <figcaption>${t.portraitCaption}</figcaption>
  </figure>
</section>

<section class="band chart-band" aria-labelledby="chart-h">
  <div class="wrap">
    <div class="chart-head">
      <h2 id="chart-h">${esc(t.chartTitle)}</h2>
      <p>${esc(t.chartLead)}</p>
    </div>
    ${chart(L, t)}
  </div>
</section>

<section class="section wrap" id="focus">
  <div class="section-head split">
    <h2>${esc(t.servicesTitle)}</h2>
    <p>${esc(t.servicesLead)}</p>
  </div>
  <div class="focus-grid">
    ${d.services.map(s => `<article>
      <h3>${esc(s.title)}</h3>
      <p>${esc(s.desc)}</p>
      <ul>${s.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
    </article>`).join('\n    ')}
  </div>
</section>

<section class="section wrap two-col" id="about">
  <h2>${esc(t.aboutTitle)}</h2>
  <div>
    <div class="prose">
      <p>${esc(t.aboutP1)}</p>
      <p>${esc(t.aboutP2)}</p>
      <p>${esc(t.aboutP3)}</p>
    </div>
    <dl class="principles">
      ${d.principles.map(x => `<div><dt>${esc(x.title)}</dt><dd>${esc(x.desc)}</dd></div>`).join('\n      ')}
    </dl>
  </div>
</section>

<section class="section wrap" id="projects">
  <div class="section-head">
    <h2>${esc(t.projectsTitle)}</h2>
    <p>${esc(t.projectsLead)}</p>
  </div>
  <div class="project-grid">
    ${d.projects.map(x => `<article class="project">
      <h3>${esc(x.title)}</h3>
      <p>${esc(x.desc)}</p>
      <ul class="tags">${x.tags.map(g => `<li>${esc(g)}</li>`).join('')}</ul>
      <a href="${x.url}" target="_blank" rel="noopener noreferrer">${esc(t.projectLink)}<span class="sr"> – ${esc(x.title)} ${t.newTab}</span></a>
    </article>`).join('\n    ')}
  </div>
</section>

<aside class="wrap blog-teaser" id="blog-teaser" aria-label="Blog" data-other-lang="${de ? 'auf Englisch' : 'in German'}" hidden>
  <a href="${u.blog}">
    <span class="teaser-kicker">${de ? 'Neu im Blog' : 'New on the blog'}</span>
    <strong class="teaser-title"></strong>
    <span class="teaser-meta mono"></span>
    <span class="teaser-more">${de ? 'Artikel lesen' : 'Read article'}</span>
  </a>
</aside>

<section class="section wrap two-col" id="experience">
  <h2>${esc(t.expTitle)}</h2>
  <ol class="timeline">
    ${d.timeline.map(j => `<li${j.isCurrent ? ' class="is-current"' : ''}>
      <p class="when"><span class="mono">${esc(j.date)}</span><span class="kind kind-${j.kindKey}">${esc(kinds[j.kindKey])}</span></p>
      <div>
        <h3>${esc(j.title)}</h3>
        <p class="org">${esc(j.org)}</p>
        <ul>${j.points.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      </div>
    </li>`).join('\n    ')}
  </ol>
</section>

<section class="section wrap" id="credentials">
  <div class="section-head">
    <h2>${esc(t.certsTitle)}</h2>
    <p>${esc(t.certsLead)}</p>
  </div>
  <div class="filters" role="group" aria-label="${esc(t.filterAria)}">
    <button type="button" data-filter="all" aria-pressed="true">${esc(t.filterAll)} <span>${d.certs.length}</span></button>
    ${cats.map(c => `<button type="button" data-filter="${c}" aria-pressed="false">${c} <span>${count(c)}</span></button>`).join('\n    ')}
  </div>
  <ul class="cert-grid is-collapsed" id="cert-grid">
    ${d.certs.map(c => `<li class="cert" data-cat="${c.category}">
      <p class="cert-top"><span class="cert-cat">${c.category}</span><span class="mono">${c.date}</span></p>
      <h3>${esc(c.title)}</h3>
      <p class="cert-desc">${esc(c.desc)}</p>
      <p class="cert-foot"><span>${esc(c.issuer)}</span>${c.url ? `<a href="${c.url}" target="_blank" rel="noopener noreferrer">${esc(t.verify)}<span class="sr"> – ${esc(c.title)} ${t.newTab}</span></a>` : ''}</p>
    </li>`).join('\n    ')}
  </ul>
  <button class="btn btn-ghost more-btn" type="button" aria-expanded="false" aria-controls="cert-grid" data-more="${esc(t.showAll)}" data-less="${esc(t.showLess)}">${esc(t.showAll)}</button>
</section>

<section class="section wrap two-col" id="faq">
  <div>
    <h2>${esc(t.faqTitle)}</h2>
    <p class="side-note">${esc(t.faqLead)}</p>
  </div>
  <div class="faq">
    ${d.faq.map(f => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('\n    ')}
  </div>
</section>

</main>

<section class="band contact" id="contact">
  <div class="wrap contact-grid">
    <div>
      <h2>${esc(t.contactTitle)}</h2>
      <p class="contact-lead">${esc(t.contactLead)}</p>
      <dl class="contact-list">
        <div><dt>${de ? 'E-Mail' : 'Email'}</dt><dd><a href="mailto:jason@jasonwolf.de">jason@jasonwolf.de</a></dd></div>
        <div><dt>${de ? 'Telefon' : 'Phone'}</dt><dd><a href="tel:+4915251530075">+49 152 51530075</a></dd></div>
        <div><dt>LinkedIn</dt><dd><a href="https://www.linkedin.com/in/jason--wolf" target="_blank" rel="noopener noreferrer me">in/jason--wolf</a></dd></div>
        <div><dt>GitHub</dt><dd><a href="https://github.com/Jaywolfy" target="_blank" rel="noopener noreferrer me">Jaywolfy</a></dd></div>
        <div><dt>${de ? 'Lebenslauf' : 'Résumé'}</dt><dd><a href="${cv}" download>${esc(t.lblCvValue)}</a></dd></div>
      </dl>
    </div>
    <form class="contact-form" action="https://formspree.io/f/xgoqoorr" method="POST" aria-label="${esc(t.formAria)}" data-err="${esc(t.formErr)}" data-sending="${esc(t.formSending)}">
      <label for="f-name">${esc(t.formName)}</label>
      <input id="f-name" name="name" type="text" required autocomplete="name">
      <label for="f-email">${esc(t.formEmail)}</label>
      <input id="f-email" name="email" type="email" required autocomplete="email">
      <label for="f-msg">${esc(t.formMessage)}</label>
      <textarea id="f-msg" name="message" rows="5" required></textarea>
      <input class="hp" type="text" name="_gotcha" tabindex="-1" autocomplete="off" aria-hidden="true">
      <label class="check"><input name="privacy" type="checkbox" required> <span>${esc(t.formPrivacy)} <a href="${u.privacyHref}">${esc(t.formPrivacyLink)}</a>. *</span></label>
      <button class="btn btn-gold" type="submit">${esc(t.formSubmit)}</button>
      <p class="form-status" role="alert"></p>
      <div class="form-thanks" role="status" tabindex="-1" hidden>
        <h3>${esc(t.thanksTitle)}</h3>
        <p>${esc(t.thanksText)}</p>
        <button class="btn btn-ghost" type="button" data-form-again>${esc(t.thanksAgain)}</button>
      </div>
    </form>
  </div>
  <footer class="wrap site-footer">
    ${footerNav(L)}
  </footer>
</section>
${cookie(L)}`;
}

// ---------- Impressum und Datenschutz ----------
function legalPage(L, doc, alt) {
  const u = ui(L), url = SITE + alt[L];
  return head({ L, title: `${doc.title} | Jason Thomas Wolf`, desc: doc.metaDesc, url, alt }) + header({ L, alt }) + `
<main id="main" class="wrap legal">
  <p class="kicker">${u.de ? 'Rechtliches' : 'Legal'}</p>
  <h1>${doc.title}</h1>${doc.note ? `
  <p class="note">${doc.note}</p>` : ''}
  ${doc.sections.map(s => `<section>
    <h2>${s.h}</h2>
    ${s.ps.map(p => p.startsWith('<address') ? p : `<p>${p}</p>`).join('\n    ')}
  </section>`).join('\n  ')}
  <p class="updated">${doc.updated}</p>
</main>
` + plainFooter(L);
}

// ---------- Fehlerseite ----------
// Der Server liefert für jede unbekannte Adresse dieselbe Datei aus, deshalb stehen beide Sprachen auf einer Seite.
function notFound() {
  return head({ L: 'de', title: 'Seite nicht gefunden (404) | Jason Thomas Wolf', desc: 'Die aufgerufene Seite wurde nicht gefunden.', robots: 'noindex, follow' })
    + header({ L: 'de' }) + `
<main id="main" class="wrap notfound">
  <p class="kicker">Fehler 404</p>
  <h1>Diese Seite gibt es nicht.</h1>
  <p>Die Adresse ist falsch geschrieben oder die Seite wurde verschoben.</p>
  <p lang="en">This page does not exist. The address is misspelled or the page has moved.</p>
  <div class="hero-actions">
    <a class="btn" href="/">Zur Startseite</a>
    <a class="btn btn-ghost" href="/en/" lang="en">Home (English)</a>
    <a class="text-link" href="/blog/">Zum Blog</a>
  </div>
</main>
` + plainFooter('de');
}

// ---------- Schreiben ----------
// lastmod.json merkt sich je Seite, wann sich ihr Inhalt zuletzt geändert hat. So bleibt das Datum in der Sitemap ehrlich.
const lastmodFile = path.join(__dirname, 'lastmod.json');
const lastmod = fs.existsSync(lastmodFile) ? JSON.parse(fs.readFileSync(lastmodFile, 'utf8')) : {};
const today = new Date().toISOString().slice(0, 10);
function write(file, html) {
  const hash = crypto.createHash('sha1').update(html).digest('hex').slice(0, 12);
  if (!lastmod[file] || lastmod[file].hash !== hash) lastmod[file] = { hash, date: today };
  const out = path.join(root, file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html.replaceAll('__LASTMOD__', lastmod[file].date));
  console.log('geschrieben:', file);
}

const data = {};
for (const L of ['de', 'en']) data[L] = fix(L, JSON.parse(JSON.stringify(content[L])));
write('index.html', home('de', data.de));
write('en/index.html', home('en', data.en));
const altImprint = { de: '/impressum.html', en: '/en/legal-notice.html' }, altPrivacy = { de: '/datenschutz.html', en: '/en/privacy.html' };
write('impressum.html', legalPage('de', legal.impressum.de, altImprint));
write('en/legal-notice.html', legalPage('en', legal.impressum.en, altImprint));
write('datenschutz.html', legalPage('de', legal.privacy.de, altPrivacy));
write('en/privacy.html', legalPage('en', legal.privacy.en, altPrivacy));
write('404.html', notFound());

// ---------- sitemap.xml und llms.txt ----------
// Die Artikel des Blogs stehen in einer eigenen Sitemap (/blog/sitemap.xml), die der Blog selbst erzeugt.
{
  const entry = (alt, L, file, image) => `  <url>
    <loc>${SITE}${alt[L]}</loc>
    <lastmod>${lastmod[file].date}</lastmod>
    <xhtml:link rel="alternate" hreflang="de" href="${SITE}${alt.de}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${SITE}${alt.en}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${alt.de}"/>${image ? `
    <image:image><image:loc>${SITE}${PORTRAIT.src}</image:loc></image:image>` : ''}
  </url>`;
  const homeAlt = { de: '/', en: '/en/' };
  fs.writeFileSync(path.join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${[entry(homeAlt, 'de', 'index.html', true), entry(homeAlt, 'en', 'en/index.html', true),
    entry(altImprint, 'de', 'impressum.html'), entry(altImprint, 'en', 'en/legal-notice.html'),
    entry(altPrivacy, 'de', 'datenschutz.html'), entry(altPrivacy, 'en', 'en/privacy.html')].join('\n')}
</urlset>
`);

  const d = data.de;
  fs.writeFileSync(path.join(root, 'llms.txt'), `# Jason Thomas Wolf

> ${d.faq[0].a}

## Profil

${d.timeline.filter(j => j.kindKey !== 'prog').map(j => `- ${j.date}: ${j.title}, ${j.org}. ${j.points.join('; ')}.`).join('\n')}
- Kompetenzen: ${d.faq.find(f => /Kompetenzen/.test(f.q)).a}
- ${d.certs.length} Nachweise: ${d.certs.map(c => `${c.title} (${c.issuer}, ${c.date})`).join('; ')}.

## Projekte

${d.projects.map(p => `- [${p.title}](${p.url}): ${p.desc}`).join('\n')}

## Links

- [Website](${SITE}/): Schwerpunkte, Profil, Projekte, Werdegang, Qualifikationen, Kontakt
- [Website (English)](${SITE}/en/): focus areas, profile, projects, experience, credentials, contact
- [Blog](${SITE}/blog/): Artikel zu IT, Informationssicherheit und Finanzen ([Feed](${SITE}/blog/feed.xml))
- [Lebenslauf (PDF)](${SITE}/downloads/Lebenslauf-Jason-Thomas-Wolf.pdf)
- [Résumé (PDF, English)](${SITE}/downloads/Resume-Jason-Thomas-Wolf.pdf)
- [GitHub](https://github.com/Jaywolfy)
- [LinkedIn](https://www.linkedin.com/in/jason--wolf)
- [Impressum](${SITE}/impressum.html)

## Kontakt

- E-Mail: jason@jasonwolf.de
- Telefon: +49 152 51530075
`);
  fs.writeFileSync(lastmodFile, JSON.stringify(lastmod, null, 2) + '\n');
  console.log('geschrieben: sitemap.xml, llms.txt');
}

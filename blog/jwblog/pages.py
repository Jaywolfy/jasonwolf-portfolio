"""Öffentliche Seiten des Blogs als HTML: Übersicht, Artikel, Feed und Sitemap, jeweils auf Deutsch und Englisch.

Deutsche Seiten liegen unter /blog/, englische unter /en/blog/. Gibt es einen Artikel in beiden Sprachen, verweisen
die Fassungen mit hreflang aufeinander, damit Suchmaschinen jedem Leser die passende Sprache zeigen.

Kopf, Navigation und Fuß entsprechen der Startseite (src/build.cjs) und nutzen deren Stylesheet. Wer dort etwas
ändert, ändert es auch hier.
"""

import json
from datetime import UTC, datetime
from html import escape
from urllib.parse import quote
from zoneinfo import ZoneInfo

from jwblog import render

SITE = "https://jasonwolf.de"
BERLIN = ZoneInfo("Europe/Berlin")
PER_PAGE = 10
BASE = {"de": "/blog/", "en": "/en/blog/"}
TOPIC = {"de": "thema", "en": "topic"}
MONTHS_DE = "Januar Februar März April Mai Juni Juli August September Oktober November Dezember".split()
MONTHS_EN = "January February March April May June July August September October November December".split()

TEXT = {
    "de": {
        "home": "/", "nav": [("focus", "Schwerpunkte"), ("about", "Profil"), ("projects", "Projekte"), ("experience", "Werdegang"),
                             ("credentials", "Qualifikationen"), ("faq", "FAQ")],
        "contact": "Kontakt", "menu": "Menü", "skip": "Zum Inhalt springen", "nav_label": "Hauptnavigation",
        "rights": "© 2026 Jason Thomas Wolf. Alle Rechte vorbehalten.", "imprint": ("Impressum", "/impressum.html"),
        "privacy": ("Datenschutz", "/datenschutz.html"), "cookies": "Cookie-Einstellungen",
        "cookie_text": "Darf ich Ihren Besuch mit Google Analytics auswerten? Die Statistik hilft mir, die Website zu verbessern, "
                       "und wird erst nach Ihrer Zustimmung geladen. Mehr dazu in der",
        "cookie_link": "Datenschutzerklärung", "accept": "Akzeptieren", "decline": "Ablehnen",
        "minutes": "Min. Lesezeit", "sources": "Quellen", "topics": "Themen", "share": "Teilen", "mail": "E-Mail",
        "copy": "Link kopieren", "copied": "Link kopiert", "back": "Alle Artikel", "newer": "Neuerer Artikel", "older": "Älterer Artikel",
        "contents": "Inhalt", "updated": "Aktualisiert am", "author_role": "Werkstudent IT Touchpoint bei der Deutsche Börse Group, "
        "Informatikstudent an der TU Darmstadt.", "author_more": "Mehr über mich", "preview": "Vorschau: Dieser Artikel ist noch nicht öffentlich.",
        "feed_title": "Blog von Jason Thomas Wolf", "feed_sub": "Notizen aus IT-Betrieb, Informationssicherheit und Finanzanalyse",
        "blog_title": "Blog | Jason Thomas Wolf", "blog_lead": "Notizen aus IT-Betrieb, Informationssicherheit und Finanzanalyse: was ich lerne, baue und ausprobiere.",
        "blog_desc": "Blog von Jason Thomas Wolf: Artikel zu IT-Support, Systemadministration, Informationssicherheit und Finanzanalyse.",
        "topic": "Thema", "topic_desc": "Artikel zum Thema {tag} im Blog von Jason Thomas Wolf.", "topic_one": "Ein Artikel zu diesem Thema.",
        "topic_many": "{n} Artikel zu diesem Thema.", "all": "Alle Artikel anzeigen", "empty": "Hier erscheint bald der erste Artikel.",
        "page": "Seite", "of": "von", "newer_page": "Neuere Artikel", "older_page": "Ältere Artikel", "pages": "Seiten", "start": "Start",
        "portrait": "Portrait von Jason Thomas Wolf", "lang_label": "Sprache",
    },
    "en": {
        "home": "/en/", "nav": [("focus", "Focus areas"), ("about", "Profile"), ("projects", "Projects"), ("experience", "Experience"),
                                ("credentials", "Credentials"), ("faq", "FAQ")],
        "contact": "Contact", "menu": "Menu", "skip": "Skip to content", "nav_label": "Main navigation",
        "rights": "© 2026 Jason Thomas Wolf. All rights reserved.", "imprint": ("Legal notice", "/en/legal-notice.html"),
        "privacy": ("Privacy policy", "/en/privacy.html"), "cookies": "Cookie settings",
        "cookie_text": "May I evaluate your visit with Google Analytics? The statistics help me improve the website and are only "
                       "loaded after you agree. More in the",
        "cookie_link": "privacy policy", "accept": "Accept", "decline": "Decline",
        "minutes": "min read", "sources": "Sources", "topics": "Topics", "share": "Share", "mail": "Email",
        "copy": "Copy link", "copied": "Link copied", "back": "All articles", "newer": "Newer article", "older": "Older article",
        "contents": "Contents", "updated": "Updated on", "author_role": "Working student in IT Touchpoint at Deutsche Börse Group, "
        "Computer Science student at TU Darmstadt.", "author_more": "More about me", "preview": "Preview: this article is not public yet.",
        "feed_title": "Blog by Jason Thomas Wolf", "feed_sub": "Notes on IT operations, information security and financial analysis",
        "blog_title": "Blog | Jason Thomas Wolf", "blog_lead": "Notes on IT operations, information security and financial analysis: what I learn, build and try out.",
        "blog_desc": "Blog by Jason Thomas Wolf: articles on IT support, system administration, information security and financial analysis.",
        "topic": "Topic", "topic_desc": "Articles on {tag} in the blog by Jason Thomas Wolf.", "topic_one": "One article on this topic.",
        "topic_many": "{n} articles on this topic.", "all": "Show all articles", "empty": "The first article will appear here soon.",
        "page": "Page", "of": "of", "newer_page": "Newer articles", "older_page": "Older articles", "pages": "Pages", "start": "Home",
        "portrait": "Portrait of Jason Thomas Wolf", "lang_label": "Language",
    },
}  # fmt: skip


def long_date(timestamp: int, lang: str = "de") -> str:
    moment = datetime.fromtimestamp(timestamp, BERLIN)
    if lang == "en":
        return f"{moment.day} {MONTHS_EN[moment.month - 1]} {moment.year}"
    return f"{moment.day}. {MONTHS_DE[moment.month - 1]} {moment.year}"


def iso(timestamp: int) -> str:
    return datetime.fromtimestamp(timestamp, BERLIN).isoformat()


def post_url(post: dict) -> str:
    return BASE[post["lang"]] + post["slug"]


def tag_url(tag: str, lang: str = "de") -> str:
    return f"{BASE[lang]}{TOPIC[lang]}/{quote(tag.lower())}"


def alternates(post: dict) -> dict[str, str]:
    """Adressen aller Sprachfassungen eines Artikels, die eigene eingeschlossen."""
    urls = {post["lang"]: post_url(post)}
    urls.update({lang: BASE[lang] + slug for lang, slug in post["alt"].items()})
    return urls


def _ld(data: dict) -> str:
    # "</" darf in einem Skriptblock nicht vorkommen, sonst endet er vorzeitig
    return '<script type="application/ld+json">' + json.dumps(data, ensure_ascii=False).replace("</", "<\\/") + "</script>"


def layout(asset, *, lang: str, title: str, desc: str, url: str, body: str, alt: dict[str, str] | None = None, head: str = "", robots: str = "index, follow, max-image-preview:large",
           og_type: str = "website", image: str = f"{SITE}/img/og-jason-thomas-wolf.jpg", image_alt: str = "Jason Thomas Wolf – IT-Support, Cybersecurity, Finance") -> str:  # fmt: skip
    t = TEXT[lang]
    nav = "\n      ".join(f'<a href="{t["home"]}#{anchor}">{label}</a>' for anchor, label in t["nav"])
    # alt: dieselbe Seite in beiden Sprachen. Fehlt eine Fassung, führt der Sprachschalter zur Übersicht der anderen Sprache.
    other = "en" if lang == "de" else "de"
    other_url = (alt or {}).get(other, BASE[other])
    links = {lang: '<span aria-current="true">' + lang.upper() + "</span>",
             other: f'<a href="{escape(other_url)}" lang="{other}" hreflang="{other}" aria-label="{"English" if other == "en" else "Deutsch"}">{other.upper()}</a>'}  # fmt: skip
    switch = links["de"] + "\n        " + links["en"]
    hreflang = ""
    if alt and len(alt) == 2:
        hreflang = "".join(f'\n<link rel="alternate" hreflang="{code}" href="{SITE}{escape(alt[code])}">' for code in ("de", "en"))
        hreflang += f'\n<link rel="alternate" hreflang="x-default" href="{SITE}{escape(alt["de"])}">'
    return f"""<!DOCTYPE html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{escape(title)}</title>
<meta name="description" content="{escape(desc)}">
<meta name="author" content="Jason Thomas Wolf">
<meta name="robots" content="{robots}">
<meta name="theme-color" content="#f6f4ef">
<link rel="canonical" href="{escape(url)}">{hreflang}
<link rel="alternate" type="application/atom+xml" title="{t["feed_title"]}" href="{BASE[lang]}feed.xml">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<meta property="og:type" content="{og_type}">
<meta property="og:locale" content="{"de_DE" if lang == "de" else "en_US"}">
<meta property="og:title" content="{escape(title)}">
<meta property="og:description" content="{escape(desc)}">
<meta property="og:url" content="{escape(url)}">
<meta property="og:site_name" content="Jason Thomas Wolf">
<meta property="og:image" content="{escape(image)}">
<meta property="og:image:alt" content="{escape(image_alt)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="preload" href="/fonts/source-serif-4-normal-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/instrument-sans-normal-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="{asset("/fonts/fonts.css")}">
<link rel="stylesheet" href="{asset("/assets/style.css")}">
<link rel="stylesheet" href="{asset("/blog/static/blog.css")}">
{head}
<script defer src="{asset("/assets/site.js")}"></script>
</head>
<body>
<a class="skip" href="#main">{t["skip"]}</a>

<header class="site-header">
  <div class="wrap header-row">
    <a class="brand" href="{t["home"]}">Jason Thomas Wolf</a>
    <nav class="main-nav" id="main-nav" aria-label="{t["nav_label"]}">
      {nav}
      <a href="{BASE[lang]}" aria-current="page">Blog</a>
      <a class="btn btn-small nav-contact" href="{t["home"]}#contact">{t["contact"]}</a>
    </nav>
    <div class="header-tools">
      <div class="lang" role="group" aria-label="{t["lang_label"]}">
        {switch}
      </div>
      <button class="menu-btn" type="button" aria-expanded="false" aria-controls="main-nav">{t["menu"]}</button>
    </div>
  </div>
</header>

{body}

<footer class="band page-footer">
  <div class="wrap site-footer">
    <p>{t["rights"]}</p>
    <nav aria-label="Footer">
      <a href="{BASE[lang]}feed.xml">Feed</a>
      <a href="{t["imprint"][1]}">{t["imprint"][0]}</a>
      <a href="{t["privacy"][1]}">{t["privacy"][0]}</a>
      <button type="button" data-cookie-open>{t["cookies"]}</button>
    </nav>
  </div>
</footer>

<div class="cookie" role="dialog" aria-label="{t["cookies"]}" hidden>
  <p>{t["cookie_text"]} <a href="{t["privacy"][1]}">{t["cookie_link"]}</a>.</p>
  <div><button type="button" class="btn btn-small btn-ghost-light" data-cookie="declined">{t["decline"]}</button><button type="button" class="btn btn-small btn-gold" data-cookie="accepted">{t["accept"]}</button></div>
</div>
</body>
</html>
"""


def _tags(tags: list[str], lang: str) -> str:
    if not tags:
        return ""
    return '<ul class="tags">' + "".join(f'<li><a href="{tag_url(tag, lang)}">#{escape(tag)}</a></li>' for tag in tags) + "</ul>"


def _meta(post: dict, lang: str = "de") -> str:
    minutes = render.reading_minutes(post["words"])
    return (f'<p class="post-meta mono"><time datetime="{iso(post["publish_at"])}">{long_date(post["publish_at"], lang)}</time>'
            f'<span>{minutes} {TEXT[lang]["minutes"]}</span></p>')  # fmt: skip


def _cover(post: dict, size, *, lazy: bool) -> str:
    if not post["cover"]:
        return ""
    dims = size(post["cover"])
    attrs = f' width="{dims[0]}" height="{dims[1]}"' if dims else ""
    loading = ' loading="lazy" decoding="async"' if lazy else ' fetchpriority="high"'
    return f'<img src="{escape(post["cover"])}" alt="{escape(post["cover_alt"])}"{attrs}{loading}>'


def index(asset, size, posts: list[dict], *, lang: str, page: int, tag: str | None = None, tag_alt: bool = False) -> str:
    """Übersicht aller Artikel einer Sprache oder der Artikel zu einem Thema, zehn je Seite."""
    t = TEXT[lang]
    pages = max(1, -(-len(posts) // PER_PAGE))
    shown = posts[(page - 1) * PER_PAGE : page * PER_PAGE]
    base = tag_url(tag, lang) if tag else BASE[lang]
    if tag:
        title, heading = f"#{tag} | {t['blog_title']}", f"{t['topic']}: #{escape(tag)}"
        lead = t["topic_many"].format(n=len(posts)) if len(posts) != 1 else t["topic_one"]
        desc = t["topic_desc"].format(tag=tag)
    else:
        title, heading, lead, desc = t["blog_title"], "Blog", t["blog_lead"], t["blog_desc"]
    if page > 1:
        title = f"{t['page']} {page} | {title}"

    cards = []
    for position, post in enumerate(shown):
        first = position == 0 and page == 1 and not tag
        cover = _cover(post, size, lazy=not first)
        cards.append(f"""<article class="post-card{" is-lead" if first else ""}{" has-cover" if cover else ""}">
      {f'<a class="post-cover" href="{post_url(post)}" tabindex="-1" aria-hidden="true">{cover}</a>' if cover else ""}
      <div>
        {_meta(post, lang)}
        <h2><a href="{post_url(post)}">{escape(post["title"])}</a></h2>
        <p class="post-excerpt">{escape(post["excerpt"])}</p>
        {_tags(post["tags"], lang)}
      </div>
    </article>""")
    if not cards:
        cards.append(f'<p class="blog-empty">{t["empty"]}</p>')

    pager = ""
    if pages > 1:
        newer = f'<a class="btn btn-ghost btn-small" href="{base if page == 2 else f"{base}?seite={page - 1}"}" rel="prev">{t["newer_page"]}</a>' if page > 1 else "<span></span>"
        older = f'<a class="btn btn-ghost btn-small" href="{base}?seite={page + 1}" rel="next">{t["older_page"]}</a>' if page < pages else "<span></span>"
        pager = f'<nav class="pager" aria-label="{t["pages"]}">{newer}<span class="mono">{t["page"]} {page} {t["of"]} {pages}</span>{older}</nav>'

    url = SITE + base + (f"?seite={page}" if page > 1 else "")
    ld = {
        "@context": "https://schema.org", "@type": "Blog", "@id": f"{SITE}{BASE[lang]}#blog", "url": SITE + BASE[lang],
        "name": t["feed_title"], "description": t["blog_desc"], "inLanguage": "de-DE" if lang == "de" else "en",
        "author": {"@id": f"{SITE}/#person"}, "publisher": {"@id": f"{SITE}/#person"},
        "blogPost": [{"@type": "BlogPosting", "headline": post["title"], "url": SITE + post_url(post),
                      "datePublished": iso(post["publish_at"])} for post in shown],
    }  # fmt: skip
    body = f"""<main id="main" class="wrap blog">
  <header class="blog-head">
    <p class="kicker">{"Blog" if tag else "Jason Thomas Wolf"}</p>
    <h1>{heading}</h1>
    <p class="blog-lead">{lead}</p>
    {f'<p><a class="text-link" href="{BASE[lang]}">{t["all"]}</a></p>' if tag else ""}
  </header>
  <div class="post-list">
    {"\n    ".join(cards)}
  </div>
  {pager}
</main>"""
    # Themenseiten und Folgeseiten sollen nicht mit der Übersicht um denselben Platz in der Suche konkurrieren
    robots = "index, follow, max-image-preview:large" if not tag and page == 1 else "noindex, follow"
    return layout(asset, lang=lang, title=title, desc=desc, url=url, body=body, head=_ld(ld), robots=robots, alt=None if tag else BASE)


def article(asset, size, post: dict, *, newer: dict | None, older: dict | None, preview: bool = False) -> str:
    lang = post["lang"]
    t = TEXT[lang]
    url = SITE + post_url(post)
    title = post["seo_title"] or post["title"]
    desc = post["seo_desc"] or post["excerpt"]
    image = SITE + post["cover"] if post["cover"].startswith("/") else (post["cover"] or f"{SITE}/img/og-jason-thomas-wolf.jpg")
    changed = post["updated"] - post["publish_at"] > 86400

    toc = render.headings(post["body_html"])
    contents = ""
    if len(toc) >= 3:
        contents = (f'<nav class="toc" aria-label="{t["contents"]}"><p>{t["contents"]}</p><ol>'
                    + "".join(f'<li><a href="#{anchor}">{escape(text)}</a></li>' for anchor, text in toc) + "</ol></nav>")  # fmt: skip
    sources = ""
    if post["sources"]:
        items = "".join(
            f'<li>{f"""<a href="{escape(source["url"])}" target="_blank" rel="noopener noreferrer">{escape(source["title"] or source["url"])}</a>"""
                   if source.get("url") else escape(source["title"])}</li>' for source in post["sources"])  # fmt: skip
        sources = f'<section class="sources" aria-labelledby="sources-h"><h2 id="sources-h">{t["sources"]}</h2><ol>{items}</ol></section>'
    share_text = quote(post["title"])
    share_url = quote(url, safe="")
    neighbours = ""
    if newer or older:
        link = lambda other, label, rel: (f'<a href="{post_url(other)}" rel="{rel}"><span>{label}</span><strong>{escape(other["title"])}</strong></a>'
                                          if other else "<span></span>")  # noqa: E731  # fmt: skip
        neighbours = f'<nav class="post-nav" aria-label="{t["back"]}">{link(older, t["older"], "prev")}{link(newer, t["newer"], "next")}</nav>'

    ld = {
        "@context": "https://schema.org",
        "@graph": [
            {"@type": "BlogPosting", "@id": f"{url}#article", "mainEntityOfPage": url, "url": url, "headline": post["title"][:110],
             "description": desc, "inLanguage": "de-DE" if lang == "de" else "en", "datePublished": iso(post["publish_at"]),
             "dateModified": iso(max(post["updated"], post["publish_at"])), "wordCount": post["words"], "keywords": ", ".join(post["tags"]),
             "image": [image], "isPartOf": {"@id": f"{SITE}{BASE[lang]}#blog"},
             "author": {"@type": "Person", "@id": f"{SITE}/#person", "name": "Jason Thomas Wolf", "url": f"{SITE}/"},
             "publisher": {"@type": "Person", "@id": f"{SITE}/#person", "name": "Jason Thomas Wolf", "url": f"{SITE}/"},
             "citation": [source["url"] for source in post["sources"] if source.get("url")]},
            {"@type": "BreadcrumbList", "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": t["start"], "item": SITE + t["home"]},
                {"@type": "ListItem", "position": 2, "name": "Blog", "item": SITE + BASE[lang]},
                {"@type": "ListItem", "position": 3, "name": post["title"], "item": url}]},
        ],
    }  # fmt: skip
    head = _ld(ld) + f'\n<meta property="article:published_time" content="{iso(post["publish_at"])}">\n<meta property="article:author" content="Jason Thomas Wolf">'
    head += "".join(f'\n<meta property="article:tag" content="{escape(tag)}">' for tag in post["tags"])

    cover = _cover(post, size, lazy=False)
    body = f"""<main id="main" class="wrap blog">
  {f'<p class="preview-note">{t["preview"]}</p>' if preview else ""}
  <article class="post">
    <header class="post-head">
      <p class="kicker"><a href="{BASE[lang]}">Blog</a></p>
      <h1>{escape(post["title"])}</h1>
      {f'<p class="post-lead">{escape(post["excerpt"])}</p>' if post["excerpt"] else ""}
      <div class="post-byline">
        <img src="/img/jasonwolf.jpg" alt="" width="965" height="1287" loading="lazy">
        <p><strong>Jason Thomas Wolf</strong>{_meta(post, lang)}</p>
      </div>
    </header>
    {f'<figure class="post-figure">{cover}</figure>' if cover else ""}
    {contents}
    <div class="post-body">
{post["body_html"]}
    </div>
    {f'<p class="post-updated mono">{t["updated"]} {long_date(post["updated"], lang)}</p>' if changed else ""}
    {sources}
    <footer class="post-foot">
      {f'<div><p class="foot-label">{t["topics"]}</p>{_tags(post["tags"], lang)}</div>' if post["tags"] else ""}
      <div>
        <p class="foot-label">{t["share"]}</p>
        <p class="share">
          <a href="https://www.linkedin.com/sharing/share-offsite/?url={share_url}" target="_blank" rel="noopener noreferrer">LinkedIn</a>
          <a href="https://x.com/intent/post?text={share_text}&amp;url={share_url}" target="_blank" rel="noopener noreferrer">X</a>
          <a href="mailto:?subject={share_text}&amp;body={share_url}">{t["mail"]}</a>
          <button type="button" data-copy="{escape(url)}" data-done="{t["copied"]}">{t["copy"]}</button>
        </p>
      </div>
    </footer>
    <aside class="author">
      <img src="/img/jasonwolf.jpg" alt="{t["portrait"]}" width="965" height="1287" loading="lazy">
      <div>
        <p class="author-name">Jason Thomas Wolf</p>
        <p>{t["author_role"]}</p>
        <p><a href="{t["home"]}#about">{t["author_more"]}</a> · <a href="https://www.linkedin.com/in/jason--wolf" target="_blank" rel="noopener noreferrer">LinkedIn</a> · <a href="https://github.com/Jaywolfy" target="_blank" rel="noopener noreferrer">GitHub</a></p>
      </div>
    </aside>
  </article>
  {neighbours}
  <p class="post-back"><a class="btn btn-ghost" href="{BASE[lang]}">{t["back"]}</a></p>
</main>
<script defer src="{asset("/blog/static/blog.js")}"></script>"""
    return layout(asset, lang=lang, title=f"{title} | Jason Thomas Wolf", desc=desc, url=url, body=body, head=head, og_type="article", alt=alternates(post),
                  image=image, image_alt=post["cover_alt"] or post["title"], robots="noindex, nofollow" if preview else "index, follow, max-image-preview:large")  # fmt: skip


def feed(posts: list[dict], lang: str) -> str:
    """Atom-Feed mit den 20 neuesten Artikeln einer Sprache im Volltext."""
    t = TEXT[lang]
    stamp = lambda timestamp: datetime.fromtimestamp(timestamp, UTC).strftime("%Y-%m-%dT%H:%M:%SZ")  # noqa: E731
    updated = stamp(max((max(post["updated"], post["publish_at"]) for post in posts), default=0))
    entries = "".join(f"""
  <entry>
    <title>{escape(post["title"])}</title>
    <link href="{SITE}{post_url(post)}"/>
    <id>{SITE}{post_url(post)}</id>
    <published>{stamp(post["publish_at"])}</published>
    <updated>{stamp(max(post["updated"], post["publish_at"]))}</updated>
    <summary>{escape(post["excerpt"])}</summary>
    {"".join(f'<category term="{escape(tag)}"/>' for tag in post["tags"])}
    <content type="html">{escape(post["body_html"].replace('src="/', f'src="{SITE}/').replace('href="/', f'href="{SITE}/'))}</content>
  </entry>""" for post in posts[:20])
    return f"""<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="{lang}">
  <title>{t["feed_title"]}</title>
  <subtitle>{t["feed_sub"]}</subtitle>
  <link href="{SITE}{BASE[lang]}feed.xml" rel="self"/>
  <link href="{SITE}{BASE[lang]}"/>
  <id>{SITE}{BASE[lang]}</id>
  <updated>{updated}</updated>
  <author><name>Jason Thomas Wolf</name><uri>{SITE}/</uri></author>{entries}
</feed>
"""


def sitemap(posts: list[dict]) -> str:
    """Sitemap mit beiden Übersichten und allen Artikeln beider Sprachen, samt Verweis auf die jeweils andere Fassung."""
    day = lambda timestamp: datetime.fromtimestamp(timestamp, BERLIN).strftime("%Y-%m-%d")  # noqa: E731

    def entry(url: str, alt: dict[str, str], modified: str | None, image: str = "") -> str:
        links = ""
        if len(alt) == 2:
            links = "".join(f'\n    <xhtml:link rel="alternate" hreflang="{code}" href="{SITE}{escape(alt[code])}"/>' for code in ("de", "en"))
            links += f'\n    <xhtml:link rel="alternate" hreflang="x-default" href="{SITE}{escape(alt["de"])}"/>'
        lastmod = f"\n    <lastmod>{modified}</lastmod>" if modified else ""
        return f"  <url>\n    <loc>{SITE}{escape(url)}</loc>{lastmod}{links}{image}\n  </url>"

    newest = day(max(max(post["updated"], post["publish_at"]) for post in posts)) if posts else None
    urls = [entry(BASE[lang], BASE, newest) for lang in ("de", "en")]
    for post in posts:
        image = f"\n    <image:image><image:loc>{SITE}{escape(post['cover'])}</image:loc></image:image>" if post["cover"].startswith("/") else ""
        urls.append(entry(post_url(post), alternates(post), day(max(post["updated"], post["publish_at"])), image))
    return ('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
            'xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n'
            + "\n".join(urls) + "\n</urlset>\n")  # fmt: skip

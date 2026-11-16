"""HTML des Admin-Bereichs: Einrichtung, Anmeldung und das Gerüst der Verwaltung.

Die Verwaltung selbst ist eine einzelne Seite. Ihre Ansichten (Übersicht, Editor, Medien, Einstellungen) baut
static/admin.js aus den Daten der Schnittstelle unter /blog/admin/api/ auf.
"""

from html import escape

import segno

from jwblog import totp


def _page(asset, title: str, body: str, script: bool = False) -> str:
    return f"""<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} | Blog-Verwaltung</title>
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#182337">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="stylesheet" href="{asset("/fonts/fonts.css")}">
<link rel="stylesheet" href="{asset("/blog/static/admin.css")}">
{f'<script defer src="{asset("/blog/static/admin.js")}"></script>' if script else ""}
</head>
<body>
{body}
</body>
</html>
"""


def _gate(asset, title: str, intro: str, fields: str, button: str, error: str) -> str:
    return _page(asset, title, f"""<main class="gate">
  <form method="post" class="gate-card">
    <p class="gate-brand">Jason Thomas Wolf</p>
    <h1>{title}</h1>
    <p class="gate-intro">{intro}</p>
    {f'<p class="gate-error" role="alert">{escape(error)}</p>' if error else ""}
    {fields}
    <button class="btn btn-primary" type="submit">{button}</button>
    <p class="gate-back"><a href="/blog/">Zum Blog</a></p>
  </form>
</main>""")


def login(asset, error: str) -> str:
    return _gate(asset, "Anmelden", "Zugang zur Verwaltung des Blogs.", """<label>Benutzername<input name="user" autocomplete="username" required autofocus></label>
    <label>Passwort<input name="password" type="password" autocomplete="current-password" required></label>
    <label>Code aus der Authenticator-App<input name="code" inputmode="numeric" pattern="[0-9 ]*" autocomplete="one-time-code" maxlength="7" required></label>""",
                 "Anmelden", error)  # fmt: skip


def setup(asset, secret: str, error: str) -> str:
    uri = totp.provisioning_uri(secret, "Blog", "jasonwolf.de")
    # omitsize: viewBox statt fester Breite und Höhe, sonst schneidet das CSS den Code ab, statt ihn zu skalieren.
    # border=4 ist der Rand, den die QR-Norm für zuverlässiges Scannen verlangt.
    qr = segno.make(uri, error="m").svg_inline(scale=1, border=4, dark="#182337", light="#ffffff", omitsize=True)
    return _gate(asset, "Zugang einrichten", "Einmalig: Benutzer anlegen und die Authenticator-App koppeln. Danach ist diese Seite gesperrt.",
                 f"""<label>Einrichtungscode<input name="setup" autocomplete="off" required autofocus>
      <small>Steht im Protokoll des Dienstes: <code>journalctl -u jwblog | grep Einrichtungscode</code></small></label>
    <label>Benutzername<input name="user" autocomplete="username" required></label>
    <label>Passwort (mindestens 12 Zeichen)<input name="password" type="password" autocomplete="new-password" minlength="12" required></label>
    <label>Passwort wiederholen<input name="repeat" type="password" autocomplete="new-password" minlength="12" required></label>
    <div class="gate-qr">{qr}<p>Diesen Code mit einer Authenticator-App scannen (zum Beispiel Aegis, 2FAS oder Google Authenticator) oder den Schlüssel von Hand eintragen:<br><code>{secret}</code></p></div>
    <label>Sechsstelliger Code aus der App<input name="code" inputmode="numeric" pattern="[0-9 ]*" autocomplete="one-time-code" maxlength="7" required></label>""",
                 "Zugang anlegen", error)  # fmt: skip


def shell(asset, csrf: str, user: str) -> str:
    return _page(asset, "Verwaltung", f"""<div class="app" data-csrf="{csrf}">
  <aside class="side">
    <a class="side-brand" href="#/">Jason Thomas Wolf<span>Blog-Verwaltung</span></a>
    <nav class="side-nav" aria-label="Verwaltung">
      <a href="#/" data-view="overview">Übersicht</a>
      <a href="#/artikel" data-view="posts">Artikel</a>
      <a href="#/medien" data-view="media">Medien</a>
      <a href="#/hilfe" data-view="help">Sichtbarkeit</a>
      <a href="#/einstellungen" data-view="settings">Einstellungen</a>
    </nav>
    <div class="side-foot">
      <a href="/blog/" target="_blank" rel="noopener">Blog ansehen</a>
      <form method="post" action="/blog/admin/logout"><button type="submit">Abmelden ({escape(user)})</button></form>
    </div>
  </aside>
  <main class="main" id="view" tabindex="-1"></main>
  <div class="toast" role="status" aria-live="polite" hidden></div>
  <dialog class="picker" aria-label="Mediathek"></dialog>
</div>""", script=True)  # fmt: skip

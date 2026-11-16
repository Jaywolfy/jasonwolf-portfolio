# jasonwolf.de

Quelltext meiner persönlichen Website [jasonwolf.de](https://jasonwolf.de) samt Blog: eine statische Seite auf
Deutsch und Englisch und ein kleiner Blog-Dienst mit eigenem Admin-Bereich.

Die Website kommt ohne Framework, ohne Schriften oder Skripte von Dritten und ohne Cookies aus. Statistik wird
erst nach Zustimmung geladen.

## Aufbau

| Ordner | Inhalt |
| --- | --- |
| `src/` | Build der statischen Seiten: `build.cjs` (Seitengerüst), `content.json` (Texte der Startseite), `legal.cjs` (Impressum, Datenschutz) |
| `public/` | Fertige Website, so wie sie auf dem Server liegt: HTML, Stylesheet, Skript, Schriften, Bilder, Lebensläufe |
| `blog/` | Blog-Dienst in Python: öffentliche Artikel unter `/blog/` und `/en/blog/`, Verwaltung unter `/blog/admin/` |
| `deploy/` | Webserver-Konfiguration, systemd-Dienst, Header für den Reverse-Proxy und das Skript zum Hochladen |
| `docs/` | Quellen der Angaben auf der Website |

## Website

Ein Node-Skript ohne Abhängigkeiten setzt die Seiten aus Textbausteinen zusammen:

```bash
node src/build.cjs
```

Es schreibt Startseite (`/`, `/en/`), Impressum, Datenschutzerklärung, Fehlerseite, `sitemap.xml` und `llms.txt`
nach `public/`. Beide Sprachen haben eigene Adressen und verweisen mit `hreflang` aufeinander. Stylesheet und
Skript bekommen einen Hash ihres Inhalts als `?v=…` und dürfen deshalb dauerhaft im Browser bleiben.

Für Suchmaschinen stehen strukturierte Daten (Person, ProfilePage, FAQ) im Quelltext, für KI-Assistenten eine
Zusammenfassung in `llms.txt`.

## Blog

Der Blog ist ein eigener kleiner Dienst (Python, aiohttp, SQLite). Er läuft neben der statischen Website und
nutzt deren Stylesheet, sodass beide gleich aussehen.

- **Zwei Sprachen je Artikel.** Titel, Text, Hashtags und Adresse gibt es je Sprache. Titelbild, Quellen und
  Termin gelten für beide. Die Fassungen verweisen in Seite und Sitemap aufeinander.
- **Schreiben in Markdown** mit Werkzeugleiste, Vorschau, Fußnoten, Tabellen und Code. Rohes HTML wird nicht
  ausgeführt.
- **Medien.** Bilder, Videos (MP4, WebM) und PDF. Der Typ wird am Inhalt erkannt. Bilder bleiben in voller
  Auflösung, nur der Aufnahmeort wird aus Fotos entfernt.
- **Planen.** Ein Artikel mit Termin in der Zukunft erscheint von selbst, auch in Sitemap, Feed und auf der
  Startseite. Ein Zeitgeber ist dafür nicht nötig.
- **Sichtbarkeit.** Je Artikel strukturierte Daten (BlogPosting), Vorschau für LinkedIn und WhatsApp,
  Atom-Feeds, Sitemap mit Bildern, Prüfliste und Vorschau des Suchergebnisses im Editor.
- **Zugang.** Ein Benutzer mit Passwort (scrypt) und Einmalcode (TOTP), Sperre nach Fehlversuchen, Schutz
  schreibender Anfragen durch ein Sitzungstoken.
- **Aufrufzahlen** je Artikel und Tag, ohne Cookies und ohne IP-Adressen.

Lokal starten, zusammen mit der statischen Website unter einer Adresse:

```bash
cd blog
python3 -m venv .venv && .venv/bin/pip install -e .
.venv/bin/python -m jwblog --dev --site-root ../public
```

Danach läuft alles unter <http://127.0.0.1:5941/>. Beim ersten Start gibt der Dienst einen Einrichtungscode
aus, mit dem unter `/blog/admin/` der Zugang angelegt wird.

Tests und Stilprüfung:

```bash
.venv/bin/python -m unittest discover -s tests -t .
.venv/bin/ruff check .
```

## Betrieb

Die Website läuft auf einem eigenen Server hinter einem Reverse-Proxy:

```
Browser ──HTTPS──▶ Nginx Proxy Manager ──▶ nginx-Container ──▶ public/
                   (TLS, Sicherheits-Header)      │
                                                  └─ /blog/, /en/blog/ ──▶ Blog-Dienst (systemd)
```

`deploy/deploy.sh` baut die Seiten, sichert den bisherigen Stand auf dem Server, überträgt Website und Blog,
spielt die Webserver-Konfiguration ein und prüft danach die wichtigsten Adressen.

Der Blog-Dienst läuft als eigener Benutzer ohne Root-Rechte, lauscht nur an der Docker-Brücke und darf nur in
seinen Datenordner schreiben. Artikel, Medien und Zugang liegen dort und nicht in diesem Repository.

## Lizenz

Der Quelltext ist einsehbar, aber nicht frei verwendbar: Texte, Gestaltung, Bilder und Code sind
urheberrechtlich geschützt. Einzelheiten stehen in [LICENSE](LICENSE). Die eingebundenen Schriften
(Source Serif 4, Instrument Sans, JetBrains Mono) stehen unter der SIL Open Font License.

Meine anderen Projekte, zum Beispiel [server-terminal](https://github.com/Jaywolfy/server-terminal),
[marktdaten-pipeline](https://github.com/Jaywolfy/marktdaten-pipeline) und
[sap-dcf-bewertung](https://github.com/Jaywolfy/sap-dcf-bewertung), stehen unter der MIT-Lizenz.

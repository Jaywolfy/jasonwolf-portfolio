"""Vom Markdown-Text zum HTML des Artikels, dazu Adressteil (Slug), Wortzahl und Lesezeit.

Rohes HTML im Text wird nicht ausgeführt, sondern als Text angezeigt. Bilder und Videos werden mit der üblichen
Bild-Schreibweise eingefügt: ![Beschreibung](/blog/media/datei.jpg "Bildunterschrift"). Endet die Adresse auf
.mp4 oder .webm, entsteht daraus ein Videoplayer.
"""

import html
import re
import unicodedata
from collections.abc import Callable

import mistune

VIDEO_SUFFIXES = (".mp4", ".webm")
WORDS_PER_MINUTE = 220
UMLAUTS = str.maketrans({"ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss", "Ä": "ae", "Ö": "oe", "Ü": "ue"})


def slugify(text: str) -> str:
    """„Was kostet ein Backup?“ wird zu „was-kostet-ein-backup“."""
    text = unicodedata.normalize("NFKD", text.translate(UMLAUTS)).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:80].strip("-")


def word_count(markdown: str) -> int:
    text = re.sub(r"```.*?```", " ", markdown, flags=re.S)
    text = re.sub(r"!?\[([^\]]*)\]\([^)]*\)", r"\1", text)
    return len(re.findall(r"\w+", text))


def reading_minutes(words: int) -> int:
    return max(1, round(words / WORDS_PER_MINUTE))


class _Renderer(mistune.HTMLRenderer):
    def __init__(self, media_size: Callable[[str], tuple[int, int] | None]):
        super().__init__(escape=True)
        self._media_size = media_size
        self._ids: dict[str, int] = {}

    def heading(self, text: str, level: int, **attrs) -> str:
        # Die Überschrift des Artikels ist die einzige h1 der Seite, im Text geht es bei h2 los
        level = min(max(level, 2), 4)
        base = slugify(re.sub(r"<[^>]+>", "", text)) or "abschnitt"
        count = self._ids.get(base, 0)
        self._ids[base] = count + 1
        anchor = base if count == 0 else f"{base}-{count + 1}"
        return f'<h{level} id="{anchor}">{text}</h{level}>\n'

    def link(self, text: str, url: str, title: str | None = None) -> str:
        target = self.safe_url(url)
        attrs = f' href="{html.escape(target)}"'
        if title:
            attrs += f' title="{html.escape(title)}"'
        if re.match(r"https?://", target) and not target.startswith("https://jasonwolf.de"):
            attrs += ' target="_blank" rel="noopener noreferrer"'
        return f"<a{attrs}>{text}</a>"

    def image(self, text: str, url: str, title: str | None = None) -> str:
        src = html.escape(self.safe_url(url))
        caption = f"<figcaption>{html.escape(title)}</figcaption>" if title else ""
        if url.lower().split("?")[0].endswith(VIDEO_SUFFIXES):
            label = f' aria-label="{html.escape(text)}"' if text else ""
            return f'<figure class="media"><video controls preload="metadata" playsinline src="{src}"{label}></video>{caption}</figure>'
        size = self._media_size(url)
        dims = f' width="{size[0]}" height="{size[1]}"' if size else ""
        return f'<figure class="media"><img src="{src}" alt="{html.escape(text)}"{dims} loading="lazy" decoding="async">{caption}</figure>'

    def paragraph(self, text: str) -> str:
        # Ein Bild oder Video allein in einem Absatz steht als eigene Abbildung da, nicht in einem <p>
        if text.startswith("<figure") and text.endswith("</figure>") and text.count("<figure") == 1:
            return text + "\n"
        return super().paragraph(text)

    def block_code(self, code: str, info: str | None = None) -> str:
        language = f' data-lang="{html.escape(info.split()[0])}"' if info and info.strip() else ""
        return f"<pre{language}><code>{html.escape(code)}</code></pre>\n"

    def table(self, text: str) -> str:
        return f'<div class="table-wrap"><table>\n{text}</table></div>\n'


def render(markdown: str, media_size: Callable[[str], tuple[int, int] | None] = lambda url: None) -> str:
    renderer = _Renderer(media_size)
    return mistune.create_markdown(renderer=renderer, plugins=["strikethrough", "table", "footnotes", "url"])(markdown)


def headings(body_html: str) -> list[tuple[str, str]]:
    """Zwischenüberschriften (h2) eines Artikels als (Anker, Text), für das Inhaltsverzeichnis."""
    found = re.findall(r'<h2 id="([^"]+)">(.*?)</h2>', body_html, flags=re.S)
    return [(anchor, html.unescape(re.sub(r"<[^>]+>", "", text))) for anchor, text in found]

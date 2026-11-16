"""Datenhaltung: Artikel in zwei Sprachen, Medien und Aufrufzahlen in einer SQLite-Datei.

Ein Artikel ist öffentlich, wenn er den Status „published“ hat und sein Veröffentlichungszeitpunkt erreicht ist.
Geplante Artikel brauchen deshalb keinen Zeitgeber: Sie erscheinen von selbst, sobald ihre Zeit gekommen ist.
"""

import json
import sqlite3
import time
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'draft',
    publish_at INTEGER NOT NULL DEFAULT 0,
    cover TEXT NOT NULL DEFAULT '',
    sources TEXT NOT NULL DEFAULT '[]',
    created INTEGER NOT NULL,
    updated INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS post_texts (
    post_id INTEGER NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    lang TEXT NOT NULL,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    excerpt TEXT NOT NULL DEFAULT '',
    body_md TEXT NOT NULL DEFAULT '',
    body_html TEXT NOT NULL DEFAULT '',
    cover_alt TEXT NOT NULL DEFAULT '',
    tags TEXT NOT NULL DEFAULT '[]',
    seo_title TEXT NOT NULL DEFAULT '',
    seo_desc TEXT NOT NULL DEFAULT '',
    words INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (post_id, lang),
    UNIQUE (lang, slug)
);
CREATE TABLE IF NOT EXISTS media (
    id INTEGER PRIMARY KEY,
    file TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    mime TEXT NOT NULL,
    size INTEGER NOT NULL,
    width INTEGER NOT NULL DEFAULT 0,
    height INTEGER NOT NULL DEFAULT 0,
    alt TEXT NOT NULL DEFAULT '',
    created INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS views (
    post_id INTEGER NOT NULL,
    day TEXT NOT NULL,
    n INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (post_id, day)
);
"""

LANGS = ("de", "en")
SHARED_FIELDS = ("status", "publish_at", "cover", "sources")
TEXT_FIELDS = ("slug", "title", "excerpt", "body_md", "body_html", "cover_alt", "tags", "seo_title", "seo_desc", "words")
LIVE = "p.status = 'published' AND p.publish_at <= ?"


def _text(row: sqlite3.Row) -> dict:
    text = {key: row[key] for key in TEXT_FIELDS}
    text["tags"] = json.loads(text["tags"])
    return text


class Store:
    def __init__(self, path: Path):
        self.db = sqlite3.connect(path)
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA journal_mode = WAL")
        self.db.execute("PRAGMA foreign_keys = ON")
        self.db.executescript(SCHEMA)

    def close(self) -> None:
        self.db.close()

    # --- Artikel
    # Ein Artikel hat gemeinsame Angaben (Status, Termin, Titelbild, Quellen) und je Sprache einen Text.
    # Eine Sprachfassung gibt es, sobald sie einen Titel hat.

    def save_post(self, post_id: int | None, shared: dict, texts: dict[str, dict | None], now: float | None = None) -> int:
        """Legt einen Artikel an oder ändert ihn. `texts[lang] = None` entfernt die Fassung dieser Sprache."""
        now = int(now if now is not None else time.time())
        values = {key: shared[key] for key in SHARED_FIELDS}
        values["sources"] = json.dumps(values["sources"], ensure_ascii=False)
        with self.db:
            if post_id is None:
                values.update(created=now, updated=now)
                names, marks = ", ".join(values), ", ".join("?" for _ in values)
                post_id = self.db.execute(f"INSERT INTO posts ({names}) VALUES ({marks})", list(values.values())).lastrowid
            else:
                values["updated"] = now
                assignments = ", ".join(f"{key} = ?" for key in values)
                self.db.execute(f"UPDATE posts SET {assignments} WHERE id = ?", [*values.values(), post_id])
            for lang, text in texts.items():
                self.db.execute("DELETE FROM post_texts WHERE post_id = ? AND lang = ?", (post_id, lang))
                if text is not None:
                    row = {**{key: text[key] for key in TEXT_FIELDS}, "tags": json.dumps(text["tags"], ensure_ascii=False)}
                    names, marks = ", ".join(row), ", ".join("?" for _ in row)
                    self.db.execute(f"INSERT INTO post_texts (post_id, lang, {names}) VALUES (?, ?, {marks})", [post_id, lang, *row.values()])
        return post_id

    def delete_post(self, post_id: int) -> None:
        with self.db:
            self.db.execute("DELETE FROM posts WHERE id = ?", (post_id,))
            self.db.execute("DELETE FROM views WHERE post_id = ?", (post_id,))

    def _texts(self, post_id: int) -> dict[str, dict]:
        rows = self.db.execute("SELECT * FROM post_texts WHERE post_id = ?", (post_id,)).fetchall()
        return {row["lang"]: _text(row) for row in rows}

    def post(self, post_id: int) -> dict | None:
        """Der ganze Artikel für den Admin-Bereich: gemeinsame Angaben und unter "texts" die Fassungen je Sprache."""
        row = self.db.execute("SELECT * FROM posts WHERE id = ?", (post_id,)).fetchone()
        if row is None:
            return None
        return {**dict(row), "sources": json.loads(row["sources"]), "texts": self._texts(post_id)}

    def slug_taken(self, lang: str, slug: str, except_id: int | None = None) -> bool:
        row = self.db.execute("SELECT post_id FROM post_texts WHERE lang = ? AND slug = ?", (lang, slug)).fetchone()
        return row is not None and row["post_id"] != except_id

    def all_posts(self) -> list[dict]:
        """Alle Artikel für den Admin-Bereich, ohne die Texte selbst, mit der Summe der Aufrufe."""
        rows = self.db.execute(
            "SELECT p.*, COALESCE((SELECT SUM(n) FROM views v WHERE v.post_id = p.id), 0) AS views"
            " FROM posts p ORDER BY CASE WHEN p.status = 'draft' THEN p.updated ELSE p.publish_at END DESC, p.id DESC"
        ).fetchall()
        posts = []
        for row in rows:
            texts = self._texts(row["id"])
            for text in texts.values():
                del text["body_md"], text["body_html"]
            posts.append({**dict(row), "sources": json.loads(row["sources"]), "texts": texts})
        return posts

    def _view(self, row: sqlite3.Row) -> dict:
        """Ein Artikel in einer Sprache, so wie ihn die öffentlichen Seiten brauchen."""
        others = self.db.execute("SELECT lang, slug FROM post_texts WHERE post_id = ? AND lang != ?", (row["id"], row["lang"])).fetchall()
        return {
            "id": row["id"], "lang": row["lang"], "status": row["status"], "publish_at": row["publish_at"], "cover": row["cover"],
            "sources": json.loads(row["sources"]), "created": row["created"], "updated": row["updated"], **_text(row),
            "alt": {other["lang"]: other["slug"] for other in others},
        }  # fmt: skip

    def view(self, post_id: int, lang: str) -> dict | None:
        """Wie live_post, aber ohne Rücksicht auf Status und Termin: für die Vorschau."""
        row = self.db.execute("SELECT p.*, t.* FROM posts p JOIN post_texts t ON t.post_id = p.id WHERE p.id = ? AND t.lang = ?", (post_id, lang)).fetchone()
        return self._view(row) if row else None

    def live_post(self, lang: str, slug: str, now: float) -> dict | None:
        row = self.db.execute(
            f"SELECT p.*, t.* FROM posts p JOIN post_texts t ON t.post_id = p.id WHERE t.lang = ? AND t.slug = ? AND {LIVE}",
            (lang, slug, int(now)),
        ).fetchone()
        return self._view(row) if row else None

    def live_posts(self, lang: str, now: float, tag: str | None = None) -> list[dict]:
        """Öffentliche Artikel einer Sprache, neueste zuerst. `tag` filtert ohne Rücksicht auf Groß- und Kleinschreibung."""
        rows = self.db.execute(
            f"SELECT p.*, t.* FROM posts p JOIN post_texts t ON t.post_id = p.id WHERE t.lang = ? AND {LIVE}"
            " ORDER BY p.publish_at DESC, p.id DESC",
            (lang, int(now)),
        ).fetchall()
        posts = [self._view(row) for row in rows]
        if tag is not None:
            posts = [post for post in posts if tag.casefold() in (t.casefold() for t in post["tags"])]
        return posts

    # --- Aufrufe

    def count_view(self, post_id: int, day: str) -> None:
        with self.db:
            self.db.execute(
                "INSERT INTO views (post_id, day, n) VALUES (?, ?, 1) ON CONFLICT (post_id, day) DO UPDATE SET n = n + 1",
                (post_id, day),
            )

    def views_by_day(self, since_day: str) -> dict[str, int]:
        rows = self.db.execute("SELECT day, SUM(n) AS n FROM views WHERE day >= ? GROUP BY day", (since_day,)).fetchall()
        return {row["day"]: row["n"] for row in rows}

    # --- Medien

    def add_media(self, **fields) -> int:
        fields.setdefault("created", int(time.time()))
        with self.db:
            names = ", ".join(fields)
            marks = ", ".join("?" for _ in fields)
            return self.db.execute(f"INSERT INTO media ({names}) VALUES ({marks})", list(fields.values())).lastrowid

    def media(self) -> list[dict]:
        return [dict(row) for row in self.db.execute("SELECT * FROM media ORDER BY created DESC, id DESC").fetchall()]

    def media_item(self, media_id: int) -> dict | None:
        row = self.db.execute("SELECT * FROM media WHERE id = ?", (media_id,)).fetchone()
        return dict(row) if row else None

    def media_by_file(self, file: str) -> dict | None:
        row = self.db.execute("SELECT * FROM media WHERE file = ?", (file,)).fetchone()
        return dict(row) if row else None

    def set_media_alt(self, media_id: int, alt: str) -> None:
        with self.db:
            self.db.execute("UPDATE media SET alt = ? WHERE id = ?", (alt, media_id))

    def delete_media(self, media_id: int) -> None:
        with self.db:
            self.db.execute("DELETE FROM media WHERE id = ?", (media_id,))

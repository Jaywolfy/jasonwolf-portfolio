"""Die Web-Anwendung: öffentliche Seiten unter /blog/ (Deutsch) und /en/blog/ (Englisch), Admin-Bereich unter /blog/admin/.

Der Dienst steht hinter einem Reverse-Proxy. Die Adresse des Besuchers kommt deshalb aus dem Kopf X-Real-IP, und
erlaubt sind nur Anfragen an die Hostnamen aus der Konfiguration.
"""

import hashlib
import json
import os
import re
import sqlite3
import tempfile
import time
import zipfile
from datetime import datetime, timedelta
from pathlib import Path

from aiohttp import web

from jwblog import admin_pages, auth, pages, render, totp, uploads
from jwblog.config import PUBLISH_RHYTHM_DAYS, Config
from jwblog.store import LANGS, Store

STATIC_DIR = Path(__file__).parent / "static"
COOKIE = "jwblog"
RESERVED_SLUGS = {"admin", "api", "media", "static", "thema", "topic", "feed.xml", "sitemap.xml", "seite"}
BOTS = re.compile(r"bot|crawl|spider|slurp|preview|curl|wget|python|monitor|headless|scan|fetch|http", re.I)
ADMIN_CSP = (
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; "
    "media-src 'self' blob:; connect-src 'self'; form-action 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'"
)


class State:
    def __init__(self, config: Config):
        self.config = config
        config.media_dir.mkdir(parents=True, exist_ok=True)
        self.store = Store(config.data_dir / "blog.db")
        self.account = auth.AccountStore(config.data_dir / "account.json")
        self.lockout = auth.Lockout()
        self._setup_file = config.data_dir / "setup.json"
        self.setup_code, self.pending_totp = self._load_setup()
        self._versions: dict[str, tuple[float, str]] = {}

    def _load_setup(self) -> tuple[str | None, str]:
        """Einrichtungscode und Schlüssel für die Authenticator-App bleiben über Neustarts gleich, bis das Konto steht.

        Sonst würde ein Neustart des Dienstes (etwa beim Hochladen) einen schon gescannten QR-Code ungültig machen.
        """
        if self.account.exists():
            self._setup_file.unlink(missing_ok=True)
            return None, totp.new_secret()
        try:
            saved = json.loads(self._setup_file.read_text(encoding="utf-8"))
            return saved["code"], saved["secret"]
        except (OSError, ValueError, KeyError):
            pass
        code, secret = auth.new_setup_code(), totp.new_secret()
        descriptor = os.open(self._setup_file, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            json.dump({"code": code, "secret": secret}, handle)
        return code, secret

    def finish_setup(self) -> None:
        self.setup_code = None
        self._setup_file.unlink(missing_ok=True)

    def asset(self, url: str) -> str:
        """Hängt an die Adresse einer Datei einen Hash ihres Inhalts an, damit Browser sie lange behalten dürfen."""
        if url.startswith("/blog/static/"):
            path = STATIC_DIR / url.removeprefix("/blog/static/")
        elif self.config.site_root:
            path = self.config.site_root / url.lstrip("/")
        else:
            return url
        try:
            modified = path.stat().st_mtime
        except OSError:
            return url
        cached = self._versions.get(url)
        if not cached or cached[0] != modified:
            cached = (modified, hashlib.sha1(path.read_bytes()).hexdigest()[:8])
            self._versions[url] = cached
        return f"{url}?v={cached[1]}"

    def media_size(self, url: str) -> tuple[int, int] | None:
        if not url.startswith("/blog/media/"):
            return None
        item = self.store.media_by_file(url.removeprefix("/blog/media/"))
        return (item["width"], item["height"]) if item and item["width"] else None


def _state(request: web.Request) -> State:
    return request.app["state"]


def _ip(request: web.Request) -> str:
    return request.headers.get("X-Real-IP") or request.remote or "?"


def _html(text: str, status: int = 200) -> web.Response:
    return web.Response(text=text, status=status, content_type="text/html", charset="utf-8", headers={"Cache-Control": "no-cache"})


def _session(request: web.Request) -> dict | None:
    state = _state(request)
    token = request.cookies.get(COOKIE)
    return state.account.read_session(token, time.time()) if token and state.account.exists() else None


def _not_found(request: web.Request) -> web.Response:
    root = _state(request).config.site_root
    if root and (root / "404.html").exists():
        return _html((root / "404.html").read_text(encoding="utf-8"), status=404)
    return web.Response(text="Seite nicht gefunden", status=404)


@web.middleware
async def guard(request: web.Request, handler):
    state = _state(request)
    host = request.host.split(":")[0].lower()
    if host not in state.config.allowed_hosts:
        return web.Response(text="Unbekannter Host", status=400)
    admin = request.path.startswith("/blog/admin")
    try:
        if admin and request.method not in ("GET", "HEAD"):
            # Schreibende Anfragen müssen von der eigenen Seite kommen
            origin = request.headers.get("Origin")
            if origin and origin.split("://")[-1].split(":")[0].lower() != host:
                raise web.HTTPForbidden(text="Fremde Herkunft")
        response = await handler(request)
    except web.HTTPNotFound:
        response = _not_found(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    if admin:
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Robots-Tag"] = "noindex, nofollow"
        response.headers["Content-Security-Policy"] = ADMIN_CSP
        response.headers["X-Frame-Options"] = "DENY"
    return response


# ---------- Öffentliche Seiten ----------


def _lang(request: web.Request) -> str:
    return "en" if request.path.startswith("/en/") else "de"


async def blog_index(request: web.Request) -> web.Response:
    state, lang = _state(request), _lang(request)
    tag = request.match_info.get("tag")
    posts = state.store.live_posts(lang, time.time(), tag)
    if tag and not posts:
        raise web.HTTPNotFound
    try:
        page = int(request.query.get("seite", "1"))
    except ValueError:
        raise web.HTTPNotFound from None
    if page < 1 or (page > 1 and (page - 1) * pages.PER_PAGE >= len(posts)):
        raise web.HTTPNotFound
    return _html(pages.index(state.asset, state.media_size, posts, lang=lang, page=page, tag=tag))


async def blog_post(request: web.Request) -> web.Response:
    state, lang = _state(request), _lang(request)
    now = time.time()
    post = state.store.live_post(lang, request.match_info["slug"], now)
    if post is None:
        raise web.HTTPNotFound
    live = state.store.live_posts(lang, now)
    position = next(index for index, other in enumerate(live) if other["id"] == post["id"])
    newer = live[position - 1] if position > 0 else None
    older = live[position + 1] if position + 1 < len(live) else None
    if request.method == "GET" and not BOTS.search(request.headers.get("User-Agent", "bot")) and not _session(request):
        state.store.count_view(post["id"], datetime.fromtimestamp(now, pages.BERLIN).strftime("%Y-%m-%d"))
    return _html(pages.article(state.asset, state.media_size, post, newer=newer, older=older))


async def blog_feed(request: web.Request) -> web.Response:
    lang = _lang(request)
    text = pages.feed(_state(request).store.live_posts(lang, time.time()), lang)
    return web.Response(text=text, content_type="application/atom+xml", charset="utf-8", headers={"Cache-Control": "max-age=600"})


async def blog_sitemap(request: web.Request) -> web.Response:
    store, now = _state(request).store, time.time()
    posts = sorted(store.live_posts("de", now) + store.live_posts("en", now), key=lambda post: -post["publish_at"])
    return web.Response(text=pages.sitemap(posts), content_type="application/xml", charset="utf-8", headers={"Cache-Control": "max-age=600"})


async def api_latest(request: web.Request) -> web.Response:
    """Der neueste Artikel für den Hinweis auf der Startseite, in der gewünschten Sprache. Leer, solange es keinen gibt."""
    store, now = _state(request).store, time.time()
    lang = "en" if request.query.get("lang") == "en" else "de"
    posts = store.live_posts(lang, now) or store.live_posts("de" if lang == "en" else "en", now)
    data = {}
    if posts:
        post = posts[0]
        data = {"title": post["title"], "url": pages.post_url(post), "date": post["publish_at"], "excerpt": post["excerpt"], "lang": post["lang"]}
    return web.json_response(data, headers={"Cache-Control": "max-age=300"})


async def media_file(request: web.Request) -> web.StreamResponse:
    state = _state(request)
    name = request.match_info["file"]
    item = state.store.media_by_file(name)
    path = state.config.media_dir / name
    if item is None or not path.is_file():
        raise web.HTTPNotFound
    # Dateinamen sind eindeutig und ändern sich nie, deshalb darf der Browser sie dauerhaft behalten
    return web.FileResponse(path, headers={"Cache-Control": "public, max-age=31536000, immutable", "Content-Type": item["mime"]})


async def static_file(request: web.Request) -> web.StreamResponse:
    path = (STATIC_DIR / request.match_info["file"]).resolve()
    if STATIC_DIR not in path.parents or not path.is_file():
        raise web.HTTPNotFound
    cache = "public, max-age=31536000, immutable" if "v" in request.query else "max-age=3600"
    return web.FileResponse(path, headers={"Cache-Control": cache})


async def redirect_slash(request: web.Request) -> web.Response:
    """/blog und /blog/admin bekommen ihren Schrägstrich, Artikeladressen verlieren ihn."""
    bare = request.path.rstrip("/")
    raise web.HTTPPermanentRedirect(bare + "/" if bare in ("/blog", "/en/blog", "/blog/admin") else bare)


async def dev_site(request: web.Request) -> web.StreamResponse:
    """Nur in der Entwicklung: liefert die statische Website aus, damit alles unter einer Adresse läuft."""
    root = _state(request).config.site_root.resolve()
    path = (root / request.match_info["path"]).resolve()
    if path.is_dir():
        path = path / "index.html"
    if root not in path.parents or not path.is_file():
        raise web.HTTPNotFound
    return web.FileResponse(path, headers={"Cache-Control": "no-cache"})


# ---------- Anmeldung ----------


def _login_response(request: web.Request, target: str = "/blog/admin/") -> web.Response:
    state = _state(request)
    response = web.HTTPSeeOther(target)
    response.set_cookie(COOKIE, state.account.new_session(time.time()), max_age=auth.SESSION_SECONDS, path="/blog",
                        httponly=True, secure=not state.config.dev, samesite="Strict")  # fmt: skip
    return response


async def setup_page(request: web.Request) -> web.Response:
    state = _state(request)
    if state.account.exists():
        raise web.HTTPSeeOther("/blog/admin/login")
    error = ""
    if request.method == "POST":
        form = await request.post()
        user, password = str(form.get("user", "")), str(form.get("password", ""))
        now = time.time()
        if state.lockout.blocked(_ip(request), now):
            error = "Zu viele Versuche. Bitte in zehn Minuten noch einmal."
        elif not auth.hmac.compare_digest(str(form.get("setup", "")).strip(), state.setup_code or ""):
            state.lockout.fail(_ip(request), now)
            error = "Der Einrichtungscode stimmt nicht. Er steht im Protokoll des Dienstes."
        else:
            error = state.account.check_new(user, password, str(form.get("repeat", ""))) or ""
            if not error and totp.verify(state.pending_totp, str(form.get("code", "")), now) is None:
                error = "Der Code aus der Authenticator-App stimmt nicht."
            if not error:
                state.account.create(user, password, state.pending_totp)
                state.finish_setup()
                return _login_response(request)
    return _html(admin_pages.setup(state.asset, state.pending_totp, error))


async def login_page(request: web.Request) -> web.Response:
    state = _state(request)
    if not state.account.exists():
        raise web.HTTPSeeOther("/blog/admin/setup")
    error = ""
    if request.method == "POST":
        form = await request.post()
        now, ip = time.time(), _ip(request)
        if state.lockout.blocked(ip, now):
            error = "Zu viele Fehlversuche. Bitte in zehn Minuten noch einmal."
        elif state.account.verify_password(str(form.get("user", "")), str(form.get("password", ""))) and state.account.verify_totp(
            str(form.get("code", "")), now
        ):
            state.lockout.succeed(ip)
            return _login_response(request)
        else:
            state.lockout.fail(ip, now)
            error = "Benutzername, Passwort oder Code stimmen nicht."
    return _html(admin_pages.login(state.asset, error))


async def logout(request: web.Request) -> web.Response:
    response = web.HTTPSeeOther("/blog/admin/login")
    response.del_cookie(COOKIE, path="/blog")
    return response


def admin(handler):
    """Lässt nur angemeldete Anfragen durch. Schreibende Anfragen brauchen zusätzlich das Token der Sitzung."""

    async def wrapped(request: web.Request):
        session = _session(request)
        if session is None:
            if request.path.startswith("/blog/admin/api/"):
                raise web.HTTPUnauthorized(text="Nicht angemeldet")
            raise web.HTTPSeeOther("/blog/admin/login" if _state(request).account.exists() else "/blog/admin/setup")
        if request.method not in ("GET", "HEAD") and not auth.hmac.compare_digest(request.headers.get("X-CSRF", ""), session["csrf"]):
            raise web.HTTPForbidden(text="Sitzung abgelaufen. Bitte die Seite neu laden.")
        request["session"] = session
        return await handler(request)

    return wrapped


@admin
async def admin_shell(request: web.Request) -> web.Response:
    state = _state(request)
    return _html(admin_pages.shell(state.asset, request["session"]["csrf"], state.account.user))


@admin
async def admin_preview(request: web.Request) -> web.Response:
    state = _state(request)
    post = state.store.view(int(request.match_info["id"]), "en" if request.query.get("lang") == "en" else "de")
    if post is None:
        raise web.HTTPNotFound
    post["publish_at"] = post["publish_at"] or int(time.time())
    return _html(pages.article(state.asset, state.media_size, post, newer=None, older=None, preview=True))


# ---------- Admin: Artikel ----------


def _bad(message: str) -> web.HTTPBadRequest:
    return web.HTTPBadRequest(text=json.dumps({"error": message}, ensure_ascii=False), content_type="application/json")


def _clean_text(state: State, lang: str, data: dict, post_id: int | None) -> dict | None:
    """Prüft die Fassung einer Sprache. Ohne Titel gibt es die Fassung nicht."""
    text = lambda key, limit: str(data.get(key, "")).strip()[:limit]  # noqa: E731
    title = text("title", 200)
    if not title:
        return None
    wanted = render.slugify(text("slug", 120))
    slug = wanted or render.slugify(title) or "artikel"
    if slug in RESERVED_SLUGS:
        slug += "-artikel"
    if state.store.slug_taken(lang, slug, post_id):
        if wanted:
            raise _bad(f"Die Adresse „{slug}“ gehört schon zu einem anderen Artikel.")
        base, number = slug, 2
        while state.store.slug_taken(lang, slug, post_id):
            slug, number = f"{base}-{number}", number + 1
    tags = []
    for tag in data.get("tags", []):
        tag = re.sub(r"[#,/?]", "", str(tag)).strip()[:40]
        if tag and tag.casefold() not in (t.casefold() for t in tags):
            tags.append(tag)
    body_md = str(data.get("body_md", ""))[:400_000]
    return {
        "slug": slug, "title": title, "excerpt": text("excerpt", 400), "body_md": body_md,
        "body_html": render.render(body_md, state.media_size), "cover_alt": text("cover_alt", 300), "tags": tags[:8],
        "seo_title": text("seo_title", 120), "seo_desc": text("seo_desc", 320), "words": render.word_count(body_md),
    }  # fmt: skip


def _clean_post(state: State, data: dict, post_id: int | None) -> tuple[dict, dict]:
    given = data.get("texts") if isinstance(data.get("texts"), dict) else {}
    texts = {lang: _clean_text(state, lang, given.get(lang) or {}, post_id) for lang in LANGS}
    if not any(texts.values()):
        raise _bad("Der Artikel braucht einen Titel.")
    sources = []
    for source in data.get("sources", []):
        name, url = str(source.get("title", "")).strip()[:300], str(source.get("url", "")).strip()[:1000]
        if url and not re.match(r"https?://", url):
            raise _bad(f"Die Quelle „{url}“ braucht eine Adresse, die mit https:// beginnt.")
        if name or url:
            sources.append({"title": name, "url": url})
    status = "published" if data.get("status") == "published" else "draft"
    try:
        publish_at = int(data.get("publish_at") or 0)
    except (TypeError, ValueError):
        raise _bad("Der Zeitpunkt der Veröffentlichung ist ungültig.") from None
    if status == "published" and publish_at <= 0:
        publish_at = int(time.time())
    cover = str(data.get("cover", "")).strip()[:500]
    if cover and not cover.startswith("/blog/media/"):
        raise _bad("Das Titelbild muss aus der Mediathek stammen.")
    return {"status": status, "publish_at": publish_at, "cover": cover, "sources": sources[:40]}, texts


def _admin_post(post: dict) -> dict:
    for text in post["texts"].values():
        del text["body_html"]
    return post


async def _json(request: web.Request) -> dict:
    try:
        data = await request.json()
    except json.JSONDecodeError:
        raise _bad("Die Anfrage ist kein gültiges JSON.") from None
    if not isinstance(data, dict):
        raise _bad("Die Anfrage ist kein gültiges JSON.")
    return data


@admin
async def api_posts(request: web.Request) -> web.Response:
    return web.json_response({"posts": _state(request).store.all_posts(), "now": int(time.time())})


@admin
async def api_post(request: web.Request) -> web.Response:
    post = _state(request).store.post(int(request.match_info["id"]))
    if post is None:
        raise web.HTTPNotFound
    return web.json_response(_admin_post(post))


@admin
async def api_post_save(request: web.Request) -> web.Response:
    state = _state(request)
    post_id = int(request.match_info["id"]) if "id" in request.match_info else None
    if post_id is not None and state.store.post(post_id) is None:
        raise web.HTTPNotFound
    shared, texts = _clean_post(state, await _json(request), post_id)
    try:
        post_id = state.store.save_post(post_id, shared, texts)
    except sqlite3.IntegrityError:
        raise _bad("Diese Adresse ist schon vergeben.") from None
    return web.json_response(_admin_post(state.store.post(post_id)))


@admin
async def api_post_delete(request: web.Request) -> web.Response:
    _state(request).store.delete_post(int(request.match_info["id"]))
    return web.json_response({"ok": True})


@admin
async def api_preview(request: web.Request) -> web.Response:
    state = _state(request)
    body = str((await _json(request)).get("body_md", ""))[:400_000]
    return web.json_response({"html": render.render(body, state.media_size), "words": render.word_count(body)})


# ---------- Admin: Medien ----------


def _media_json(state: State, item: dict, posts: list[dict] | None = None) -> dict:
    url = f"/blog/media/{item['file']}"
    item = {**item, "url": url}
    if posts is not None:
        item["used"] = sum(1 for post in posts if url in (post["body_md"] or "") or post["cover"] == url)
    return item


@admin
async def api_media(request: web.Request) -> web.Response:
    state = _state(request)
    posts = [dict(row) for row in state.store.db.execute(
        "SELECT p.cover, t.body_md FROM posts p LEFT JOIN post_texts t ON t.post_id = p.id").fetchall()]  # fmt: skip
    return web.json_response({"media": [_media_json(state, item, posts) for item in state.store.media()]})


@admin
async def api_media_upload(request: web.Request) -> web.Response:
    state = _state(request)
    reader = await request.multipart()
    part = await reader.next()
    if part is None or part.name != "file":
        raise _bad("Es wurde keine Datei übertragen.")
    original = part.filename or "datei"
    start = await part.read_chunk(64)
    kind = uploads.sniff(start)
    if kind is None:
        raise _bad("Dieser Dateityp wird nicht unterstützt. Erlaubt sind JPG, PNG, WebP, AVIF, GIF, MP4, WebM und PDF.")
    category, suffix, mime = kind
    limit = uploads.limit_for(category)
    target = state.config.media_dir / uploads.final_name(original, suffix)
    size = 0
    try:
        with target.open("wb") as handle:
            chunk = start
            while chunk:
                size += len(chunk)
                if size > limit:
                    raise _bad(f"Die Datei ist zu groß. Erlaubt sind {limit // (1024 * 1024)} MB.")
                handle.write(chunk)
                chunk = await part.read_chunk(256 * 1024)
        width = height = 0
        if category == "image":
            try:
                width, height = uploads.inspect_image(target)
            except Exception:
                raise _bad("Das Bild lässt sich nicht lesen. Ist die Datei beschädigt?") from None
            size = target.stat().st_size
    except BaseException:
        target.unlink(missing_ok=True)
        raise
    target.chmod(0o644)
    media_id = state.store.add_media(file=target.name, name=original[:200], kind=category, mime=mime, size=size, width=width, height=height)
    return web.json_response(_media_json(state, state.store.media_item(media_id)))


@admin
async def api_media_update(request: web.Request) -> web.Response:
    state = _state(request)
    media_id = int(request.match_info["id"])
    if state.store.media_item(media_id) is None:
        raise web.HTTPNotFound
    state.store.set_media_alt(media_id, str((await _json(request)).get("alt", "")).strip()[:300])
    return web.json_response(_media_json(state, state.store.media_item(media_id)))


@admin
async def api_media_delete(request: web.Request) -> web.Response:
    state = _state(request)
    item = state.store.media_item(int(request.match_info["id"]))
    if item is None:
        raise web.HTTPNotFound
    (state.config.media_dir / item["file"]).unlink(missing_ok=True)
    state.store.delete_media(item["id"])
    return web.json_response({"ok": True})


# ---------- Admin: Übersicht, Passwort, Sicherung ----------


@admin
async def api_stats(request: web.Request) -> web.Response:
    state = _state(request)
    now = time.time()
    today = datetime.fromtimestamp(now, pages.BERLIN).date()
    days = [(today - timedelta(days=offset)).isoformat() for offset in range(29, -1, -1)]
    by_day = state.store.views_by_day(days[0])
    posts = state.store.all_posts()
    live = [post for post in posts if post["status"] == "published" and post["publish_at"] <= now]
    planned = [post for post in posts if post["status"] == "published" and post["publish_at"] > now]
    last = max((post["publish_at"] for post in live), default=0)
    upcoming = min((post["publish_at"] for post in planned), default=0)
    return web.json_response({
        "now": int(now), "live": len(live), "planned": len(planned), "drafts": sum(1 for post in posts if post["status"] == "draft"),
        "views_total": sum(post["views"] for post in posts), "views_30": sum(by_day.values()),
        "views_by_day": [{"day": day, "n": by_day.get(day, 0)} for day in days],
        "last_published": last, "next_planned": upcoming, "rhythm_days": PUBLISH_RHYTHM_DAYS,
        "next_due": last + PUBLISH_RHYTHM_DAYS * 86400 if last else 0,
    })  # fmt: skip


@admin
async def api_password(request: web.Request) -> web.Response:
    state = _state(request)
    data = await _json(request)
    now = time.time()
    if not state.account.verify_password(state.account.user, str(data.get("current", ""))):
        raise _bad("Das aktuelle Passwort stimmt nicht.")
    error = state.account.check_new(state.account.user, str(data.get("password", "")), str(data.get("repeat", "")))
    if error:
        raise _bad(error)
    if not state.account.verify_totp(str(data.get("code", "")), now):
        raise _bad("Der Code aus der Authenticator-App stimmt nicht.")
    state.account.set_password(str(data["password"]))
    return web.json_response({"ok": True})


@admin
async def api_backup(request: web.Request) -> web.StreamResponse:
    """Sicherung als ZIP: Datenbank und, wenn gewünscht, alle Medien."""
    state = _state(request)
    with_media = request.query.get("medien") == "1"
    stamp = datetime.fromtimestamp(time.time(), pages.BERLIN).strftime("%Y-%m-%d")
    response = web.StreamResponse(headers={
        "Content-Type": "application/zip", "Content-Disposition": f'attachment; filename="blog-sicherung-{stamp}.zip"'})  # fmt: skip
    with tempfile.TemporaryDirectory(dir=state.config.data_dir) as folder:
        copy = Path(folder) / "blog.db"
        target = sqlite3.connect(copy)
        state.store.db.backup(target)
        target.close()
        archive = Path(folder) / "sicherung.zip"
        with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as bundle:
            bundle.write(copy, "blog.db")
            if with_media:
                for item in sorted(state.config.media_dir.iterdir()):
                    if item.is_file():
                        bundle.write(item, f"media/{item.name}", compress_type=zipfile.ZIP_STORED)
        response.content_length = archive.stat().st_size
        await response.prepare(request)
        with archive.open("rb") as handle:
            while chunk := handle.read(1024 * 1024):
                await response.write(chunk)
    await response.write_eof()
    return response


def create_app(config: Config) -> web.Application:
    app = web.Application(middlewares=[guard], client_max_size=2 * 1024 * 1024)
    app["state"] = State(config)
    app.on_cleanup.append(lambda app: _close(app))
    get, post = app.router.add_get, app.router.add_post
    get("/blog", redirect_slash)
    get("/blog/", blog_index)
    get("/blog/feed.xml", blog_feed)
    get("/blog/sitemap.xml", blog_sitemap)
    get("/blog/api/latest.json", api_latest)
    get("/blog/thema/{tag}", blog_index)
    get("/blog/media/{file}", media_file)
    get("/blog/static/{file}", static_file)

    get("/blog/admin", redirect_slash)
    get("/blog/admin/", admin_shell)
    get("/blog/admin/setup", setup_page)
    post("/blog/admin/setup", setup_page)
    get("/blog/admin/login", login_page)
    post("/blog/admin/login", login_page)
    post("/blog/admin/logout", logout)
    get("/blog/admin/vorschau/{id:\\d+}", admin_preview)
    get("/blog/admin/api/posts", api_posts)
    post("/blog/admin/api/posts", api_post_save)
    get("/blog/admin/api/posts/{id:\\d+}", api_post)
    app.router.add_put("/blog/admin/api/posts/{id:\\d+}", api_post_save)
    app.router.add_delete("/blog/admin/api/posts/{id:\\d+}", api_post_delete)
    post("/blog/admin/api/preview", api_preview)
    get("/blog/admin/api/media", api_media)
    post("/blog/admin/api/media", api_media_upload)
    app.router.add_put("/blog/admin/api/media/{id:\\d+}", api_media_update)
    app.router.add_delete("/blog/admin/api/media/{id:\\d+}", api_media_delete)
    get("/blog/admin/api/stats", api_stats)
    post("/blog/admin/api/password", api_password)
    get("/blog/admin/api/backup", api_backup)

    get("/blog/{slug}/", redirect_slash)
    get("/blog/{slug}", blog_post)

    get("/en/blog", redirect_slash)
    get("/en/blog/", blog_index)
    get("/en/blog/feed.xml", blog_feed)
    get("/en/blog/topic/{tag}", blog_index)
    get("/en/blog/{slug}/", redirect_slash)
    get("/en/blog/{slug}", blog_post)
    if config.dev and config.site_root:
        get("/{path:.*}", dev_site)
    return app


async def _close(app: web.Application) -> None:
    app["state"].store.close()

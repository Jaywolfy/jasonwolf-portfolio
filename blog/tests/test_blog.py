"""Tests für Darstellung, Datenhaltung und die Web-Anwendung. Aufruf: python -m unittest discover -s tests -t ."""

import tempfile
import time
import unittest
from pathlib import Path

from aiohttp.test_utils import AioHTTPTestCase

from jwblog import render, totp, uploads
from jwblog.config import Config
from jwblog.store import Store
from jwblog.web import COOKIE, create_app

TEXT = {"slug": "hallo", "title": "Hallo", "excerpt": "Kurz", "body_md": "Text", "body_html": "<p>Text</p>", "cover_alt": "",
        "tags": ["Backup"], "seo_title": "", "seo_desc": "", "words": 1}  # fmt: skip
SHARED = {"status": "published", "publish_at": 100, "cover": "", "sources": []}


class RenderTest(unittest.TestCase):
    def test_slug_writes_out_umlauts(self):
        self.assertEqual(render.slugify("Was kostet ein Backup? Größe & Übung"), "was-kostet-ein-backup-groesse-uebung")

    def test_raw_html_is_shown_not_run(self):
        self.assertNotIn("<script>", render.render("Hallo <script>alert(1)</script>"))

    def test_script_links_are_defused(self):
        self.assertNotIn('href="javascript:', render.render("[x](javascript:alert(1))"))

    def test_external_links_open_in_new_tab(self):
        self.assertIn('rel="noopener noreferrer"', render.render("[BSI](https://www.bsi.bund.de)"))
        self.assertNotIn("target=", render.render("[Start](https://jasonwolf.de/)"))

    def test_first_level_heading_becomes_h2(self):
        html = render.render("# Eins\n\n## Zwei\n\n## Zwei")
        self.assertIn('<h2 id="eins">', html)
        self.assertIn('<h2 id="zwei-2">', html)
        self.assertEqual(render.headings(html), [("eins", "Eins"), ("zwei", "Zwei"), ("zwei-2", "Zwei")])

    def test_image_and_video(self):
        image = render.render('![Ein Bild](/blog/media/a.jpg "Unterschrift")', lambda url: (800, 600))
        self.assertIn('<figure class="media"><img src="/blog/media/a.jpg" alt="Ein Bild" width="800" height="600"', image)
        self.assertIn("<figcaption>Unterschrift</figcaption>", image)
        self.assertNotIn("<p><figure", image)
        self.assertIn("<video controls", render.render("![Film](/blog/media/a.mp4)"))


class UploadTest(unittest.TestCase):
    def test_type_comes_from_content(self):
        self.assertEqual(uploads.sniff(b"\xff\xd8\xff\xe0rest")[1], ".jpg")
        self.assertEqual(uploads.sniff(b"\x00\x00\x00\x18ftypmp42")[0], "video")
        self.assertIsNone(uploads.sniff(b"<svg onload=alert(1)>"))
        self.assertIsNone(uploads.sniff(b"MZ\x90\x00"))

    def test_names_are_unique_and_tidy(self):
        first, second = uploads.final_name("Mein Bild (1).JPG", ".jpg"), uploads.final_name("Mein Bild (1).JPG", ".jpg")
        self.assertRegex(first, r"^mein-bild-1-[0-9a-f]{6}\.jpg$")
        self.assertNotEqual(first, second)


class StoreTest(unittest.TestCase):
    def setUp(self):
        self.store = Store(Path(":memory:"))
        self.addCleanup(self.store.close)

    def test_planned_post_appears_when_its_time_has_come(self):
        self.store.save_post(None, {**SHARED, "publish_at": 500}, {"de": TEXT})
        self.assertEqual(self.store.live_posts("de", 499), [])
        self.assertEqual(len(self.store.live_posts("de", 500)), 1)

    def test_drafts_stay_hidden(self):
        self.store.save_post(None, {**SHARED, "status": "draft"}, {"de": TEXT})
        self.assertIsNone(self.store.live_post("de", "hallo", 1000))

    def test_versions_point_to_each_other(self):
        self.store.save_post(None, SHARED, {"de": TEXT, "en": {**TEXT, "slug": "hello"}})
        self.assertEqual(self.store.live_post("de", "hallo", 1000)["alt"], {"en": "hello"})
        self.assertEqual(self.store.live_post("en", "hello", 1000)["alt"], {"de": "hallo"})

    def test_same_slug_is_allowed_in_both_languages(self):
        post_id = self.store.save_post(None, SHARED, {"de": TEXT, "en": TEXT})
        self.assertTrue(self.store.slug_taken("de", "hallo"))
        self.assertFalse(self.store.slug_taken("de", "hallo", except_id=post_id))

    def test_tag_filter_ignores_case(self):
        self.store.save_post(None, SHARED, {"de": TEXT})
        self.assertEqual(len(self.store.live_posts("de", 1000, "backup")), 1)
        self.assertEqual(self.store.live_posts("de", 1000, "netzwerk"), [])


class WebTest(AioHTTPTestCase):
    async def get_application(self):
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        app = create_app(Config(data_dir=Path(self.folder.name), dev=True))
        self.state = app["state"]
        return app

    async def _login(self) -> dict:
        self.state.account.create("jason", "ein-langes-passwort", totp.new_secret())
        token = self.state.account.new_session(time.time())
        self.client.session.cookie_jar.update_cookies({COOKIE: token}, self.client.make_url("/blog/"))
        return {"X-CSRF": self.state.account.read_session(token, time.time())["csrf"]}

    async def test_empty_blog_works(self):
        for path in ("/blog/", "/en/blog/", "/blog/feed.xml", "/en/blog/feed.xml", "/blog/sitemap.xml"):
            self.assertEqual((await self.client.get(path)).status, 200, path)
        self.assertEqual(await (await self.client.get("/blog/api/latest.json")).json(), {})

    async def test_admin_needs_login(self):
        self.assertEqual((await self.client.get("/blog/admin/api/posts")).status, 401)
        response = await self.client.get("/blog/admin/", allow_redirects=False)
        self.assertEqual(response.headers["Location"], "/blog/admin/setup")

    async def test_setup_needs_the_code_from_the_log(self):
        form = {"setup": "falsch", "user": "x", "password": "ein-langes-passwort", "repeat": "ein-langes-passwort", "code": "000000"}
        await self.client.post("/blog/admin/setup", data=form)
        self.assertFalse(self.state.account.exists())

    async def test_writing_needs_the_session_token(self):
        headers = await self._login()
        post = {"status": "published", "texts": {"de": {"title": "Erster Artikel", "body_md": "Hallo **Welt**"}}}
        self.assertEqual((await self.client.post("/blog/admin/api/posts", json=post)).status, 403)
        saved = await (await self.client.post("/blog/admin/api/posts", json=post, headers=headers)).json()
        self.assertEqual(saved["texts"]["de"]["slug"], "erster-artikel")
        page = await (await self.client.get("/blog/erster-artikel")).text()
        self.assertIn("<strong>Welt</strong>", page)
        self.assertEqual((await self.client.get("/en/blog/erster-artikel")).status, 404)
        preview = await (await self.client.post("/blog/admin/api/preview", json={"body_md": "## Hallo"}, headers=headers)).json()
        self.assertIn('<h2 id="hallo">', preview["html"])

    async def test_setup_qr_scales_instead_of_being_cut(self):
        page = await (await self.client.get("/blog/admin/setup")).text()
        self.assertRegex(page, r'<svg viewBox="0 0 \d+ \d+"')
        self.assertNotRegex(page, r'<svg width=')

    async def test_setup_survives_a_restart(self):
        again = create_app(Config(data_dir=Path(self.folder.name), dev=True))["state"]
        self.assertEqual((again.setup_code, again.pending_totp), (self.state.setup_code, self.state.pending_totp))
        again.store.close()

    async def test_foreign_host_is_refused(self):
        self.assertEqual((await self.client.get("/blog/", headers={"Host": "boese.example"})).status, 400)

    async def test_planned_post_is_not_public(self):
        headers = await self._login()
        post = {"status": "published", "publish_at": int(time.time()) + 3600, "texts": {"de": {"title": "Später", "body_md": "x"}}}
        await self.client.post("/blog/admin/api/posts", json=post, headers=headers)
        self.assertEqual((await self.client.get("/blog/spaeter")).status, 404)
        self.assertNotIn("spaeter", await (await self.client.get("/blog/sitemap.xml")).text())


if __name__ == "__main__":
    unittest.main()

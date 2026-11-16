"""Startet den Dienst: python -m jwblog [--host 172.17.0.1] [--port 5941] [--allowed-host jasonwolf.de]"""

import argparse
import sys
from pathlib import Path

from aiohttp import web

from jwblog import __version__
from jwblog.config import DEFAULT_HOST, DEFAULT_PORT, Config
from jwblog.web import create_app

DEFAULT_DATA = Path(__file__).resolve().parents[1] / "data"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="jwblog", description="Blog für jasonwolf.de")
    parser.add_argument("--version", action="version", version=f"%(prog)s {__version__}")
    parser.add_argument("--host", default=DEFAULT_HOST, help="Adresse, auf der der Dienst lauscht")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--allowed-host", action="append", default=[], help="Hostname, unter dem der Blog erreichbar ist")
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA, help="Ordner für Datenbank, Medien und Zugang")
    parser.add_argument("--site-root", type=Path, help="Ordner der statischen Website (public/)")
    parser.add_argument("--dev", action="store_true", help="Entwicklung: ohne HTTPS, liefert die statische Website mit aus")
    args = parser.parse_args(argv)

    args.data_dir.mkdir(parents=True, exist_ok=True)
    args.data_dir.chmod(0o700)
    config = Config(
        data_dir=args.data_dir,
        host=args.host,
        port=args.port,
        allowed_hosts=frozenset({"127.0.0.1", "localhost", *args.allowed_host}),
        site_root=args.site_root,
        dev=args.dev,
    )
    app = create_app(config)
    print(f"Blog {__version__} auf http://{config.host}:{config.port}/blog/", flush=True)
    if app["state"].setup_code:
        print(f"Einrichtungscode für den ersten Besuch von /blog/admin/: {app['state'].setup_code}", flush=True)
    web.run_app(app, host=config.host, port=config.port, print=None)
    return 0


if __name__ == "__main__":
    sys.exit(main())

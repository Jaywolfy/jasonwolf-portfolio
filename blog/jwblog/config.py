"""Einstellungen des Dienstes. Sie kommen von der Kommandozeile, siehe __main__.py."""

from dataclasses import dataclass
from pathlib import Path

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 5941

MAX_IMAGE_BYTES = 25 * 1024 * 1024
MAX_VIDEO_BYTES = 500 * 1024 * 1024
MAX_FILE_BYTES = 25 * 1024 * 1024
PUBLISH_RHYTHM_DAYS = 14  # Ziel: alle zwei Wochen ein Artikel


@dataclass(frozen=True)
class Config:
    data_dir: Path
    host: str = DEFAULT_HOST
    port: int = DEFAULT_PORT
    allowed_hosts: frozenset[str] = frozenset({"127.0.0.1", "localhost"})
    # Ordner der statischen Website. Daraus stammen die Versionsnummern für Stylesheet und Skript und die Fehlerseite.
    site_root: Path | None = None
    # Entwicklung: Cookies auch ohne HTTPS und die statische Website wird mit ausgeliefert.
    dev: bool = False

    @property
    def media_dir(self) -> Path:
        return self.data_dir / "media"

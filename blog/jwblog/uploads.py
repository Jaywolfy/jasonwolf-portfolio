"""Hochgeladene Dateien prüfen und ablegen.

Der Dateityp wird am Inhalt erkannt, nicht am Namen. Bilder bleiben unverändert in voller Auflösung. Nur der
Aufnahmeort (GPS) wird aus JPEG-Fotos entfernt, ohne das Bild neu zu komprimieren.
"""

import secrets
from pathlib import Path

from PIL import Image

from jwblog import render
from jwblog.config import MAX_FILE_BYTES, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES

GPS_TAG = 0x8825
ORIENTATION_TAG = 0x0112

# Kennung am Dateianfang -> (Art, Endung, MIME-Typ)
def sniff(start: bytes) -> tuple[str, str, str] | None:
    if start.startswith(b"\xff\xd8\xff"):
        return "image", ".jpg", "image/jpeg"
    if start.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image", ".png", "image/png"
    if start[:6] in (b"GIF87a", b"GIF89a"):
        return "image", ".gif", "image/gif"
    if start[:4] == b"RIFF" and start[8:12] == b"WEBP":
        return "image", ".webp", "image/webp"
    if start[4:8] == b"ftyp":
        if start[8:12] in (b"avif", b"avis"):
            return "image", ".avif", "image/avif"
        return "video", ".mp4", "video/mp4"
    if start.startswith(b"\x1a\x45\xdf\xa3"):
        return "video", ".webm", "video/webm"
    if start.startswith(b"%PDF-"):
        return "file", ".pdf", "application/pdf"
    return None


def limit_for(kind: str) -> int:
    return {"image": MAX_IMAGE_BYTES, "video": MAX_VIDEO_BYTES}.get(kind, MAX_FILE_BYTES)


def final_name(original: str, suffix: str) -> str:
    """Lesbarer Name mit zufälligem Anhang, damit nichts überschrieben wird und Adressen dauerhaft gültig bleiben."""
    stem = render.slugify(Path(original).stem) or "datei"
    return f"{stem[:50]}-{secrets.token_hex(3)}{suffix}"


def inspect_image(path: Path) -> tuple[int, int]:
    """Breite und Höhe so, wie der Browser das Bild zeigt. Entfernt nebenbei den Aufnahmeort aus JPEG-Fotos."""
    with Image.open(path) as image:
        width, height = image.size
        exif = image.getexif()
        if exif.get(ORIENTATION_TAG) in (5, 6, 7, 8):
            width, height = height, width
        if image.format == "JPEG" and GPS_TAG in exif:
            del exif[GPS_TAG]
            cleaned = path.with_suffix(".tmp")
            # quality="keep" übernimmt die Kompression des Originals, das Bild verliert keine Qualität
            image.save(cleaned, "JPEG", quality="keep", exif=exif, icc_profile=image.info.get("icc_profile"))
            cleaned.replace(path)
    return width, height

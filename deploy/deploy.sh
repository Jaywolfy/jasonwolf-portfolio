#!/usr/bin/env bash
# Baut die Website und spielt sie zusammen mit dem Blog auf den Server.
# Aufruf: deploy/deploy.sh [benutzer@server]        Voreinstellung: root@jasonwolf.de
#
# Was passiert:
#   1. Website bauen (node src/build.cjs) und Blog testen
#   2. Sicherung des bisherigen Webverzeichnisses auf dem Server
#   3. public/ ins Webverzeichnis, blog/ in den Ordner des Dienstes
#   4. Webserver-Konfiguration in den Container, Blog-Dienst neu starten
#   5. Prüfen, ob die wichtigsten Adressen antworten
set -euo pipefail
cd "$(dirname "$0")/.."

SERVER="${1:-root@jasonwolf.de}"
WEBROOT=/DATA/websites/jasonwolf
BLOG=/DATA/websites/jwblog
OWNER=astro
CONTAINER=jasonwolf-nginx

echo "== Bauen und testen"
node src/build.cjs
PYTHON=python3; [ -x blog/.venv/bin/python ] && PYTHON=.venv/bin/python
(cd blog && "$PYTHON" -m unittest discover -s tests -t . 2>&1 | tail -3)

echo "== Sicherung auf dem Server"
ssh "$SERVER" "mkdir -p /DATA/websites/backups $BLOG/app $BLOG/data && tar -czf /DATA/websites/backups/jasonwolf-\$(date +%F-%H%M).tar.gz -C $WEBROOT . && ls -t /DATA/websites/backups/jasonwolf-2*.tar.gz | tail -n +11 | xargs -r rm --"

echo "== Dateien übertragen"
rsync -az --delete --chown="$OWNER:$OWNER" --chmod=D755,F644 public/ "$SERVER:$WEBROOT/"
rsync -az --delete --chown="$OWNER:$OWNER" --exclude='.venv' --exclude='data' --exclude='__pycache__' --exclude='.ruff_cache' blog/ "$SERVER:$BLOG/app/"
scp -q deploy/nginx.conf "$SERVER:$BLOG/nginx.conf"
scp -q deploy/jwblog.service "$SERVER:/etc/systemd/system/jwblog.service"

echo "== Dienste einrichten"
ssh "$SERVER" "set -e
  chown $OWNER:$OWNER $BLOG $BLOG/data && chmod 700 $BLOG/data
  [ -x $BLOG/.venv/bin/python ] || sudo -u $OWNER python3 -m venv $BLOG/.venv
  sudo -u $OWNER $BLOG/.venv/bin/pip install --quiet --upgrade 'aiohttp>=3.9' 'mistune>=3.0' 'pillow>=10.0' 'segno>=1.6'
  systemctl daemon-reload && systemctl enable --quiet jwblog && systemctl restart jwblog
  # Die Firewall lässt den Webserver-Container zum Blog durch, sonst niemanden
  ufw allow from 172.17.0.0/16 to 172.17.0.1 port 5941 proto tcp comment 'Blog fuer jasonwolf-nginx (Docker intern)' >/dev/null
  docker cp $BLOG/nginx.conf $CONTAINER:/etc/nginx/conf.d/default.conf
  docker exec $CONTAINER nginx -t && docker exec $CONTAINER nginx -s reload
  sleep 2 && systemctl is-active jwblog"

echo "== Prüfen"
failed=0
check() { # Adresse, erwarteter Statuscode
  code=$(curl -s -m 15 -o /dev/null -w '%{http_code}' "https://jasonwolf.de$1")
  if [ "$code" = "$2" ]; then echo "  ok   $code $1"; else echo "  FEHLER $code statt $2: $1"; failed=1; fi
}
check / 200; check /en/ 200; check /impressum.html 200; check /datenschutz.html 200; check /en/legal-notice.html 200; check /en/privacy.html 200
check /blog/ 200; check /en/blog/ 200; check /blog/feed.xml 200; check /blog/sitemap.xml 200; check /sitemap.xml 200; check /robots.txt 200
check /diese-seite-gibt-es-nicht 404; check /blog/admin/ 303; check /.git/config 404
exit $failed

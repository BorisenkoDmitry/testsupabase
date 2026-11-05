#!/usr/bin/env bash
set -Eeuo pipefail

# Run with sudo from an extracted release. Only public, compiled assets are retained.
release_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
if [[ ! "$release_dir" =~ ^/opt/testsupabase/releases/([a-f0-9]{12})$ ]]; then
  echo 'Expected /opt/testsupabase/releases/<12-character commit>.' >&2
  exit 1
fi
release_tag="${BASH_REMATCH[1]}"
asset_dir=/opt/testsupabase/assets
compose=(docker compose --project-directory "$release_dir" --env-file "$release_dir/.env.production" -f "$release_dir/compose.yaml")
"${compose[@]}" build --pull
docker image inspect "testsupabase:$release_tag" >/dev/null
mkdir -p -- "$asset_dir"
chmod 755 "$asset_dir"

snapshot=''
cleanup() {
  if [[ -n "$snapshot" ]]; then docker rm "$snapshot" >/dev/null; fi
}
trap cleanup EXIT
# Import previous releases too, so tabs opened before this fix can still load them.
images="$(docker image ls testsupabase --format '{{.Repository}}:{{.Tag}}')"
while IFS= read -r image; do
  [[ -n "$image" ]] || continue
  [[ "$image" != 'testsupabase:<none>' ]] || continue
  snapshot="$(docker create "$image")"
  docker cp "$snapshot:/usr/share/nginx/html/assets/." "$asset_dir/"
  docker rm "$snapshot" >/dev/null
  snapshot=''
done <<< "$images"

# Publish every chunk before replacing HTML/the container. Never remove older hashes.
"${compose[@]}" up -d --wait --wait-timeout 60
docker exec testsupabase-web nginx -t
docker exec testsupabase-web wget -qO- http://127.0.0.1:8080/healthz
ln -sfn -- "$release_dir" /opt/testsupabase/current
cat > /opt/testsupabase/DEPLOYMENT.txt <<EOF
Kontur CRM / testsupabase
URL: https://testsupabase.dmitriy-borisenko.ru
Release: $release_dir
Release tag: $release_tag
Current: /opt/testsupabase/current
Assets: $asset_dir; append-only hashed public build files, mounted read-only
Compose project: testsupabase; container: testsupabase-web; UID 101; read-only rootfs
TLS: existing Traefik letsencrypt resolver, automatic renewal
Database: cloud Supabase; server env contains public URL/key only
EOF

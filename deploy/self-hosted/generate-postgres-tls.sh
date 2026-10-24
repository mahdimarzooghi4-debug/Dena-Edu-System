#!/usr/bin/env bash
set -euo pipefail

out_dir="${1:-deploy/self-hosted/secrets/postgres}"
umask 077
mkdir -p "$out_dir"

if [[ -e "$out_dir/ca.key" || -e "$out_dir/server.key" || -e "$out_dir/ca.crt" || -e "$out_dir/server.crt" ]]; then
  echo "Refusing to overwrite existing PostgreSQL TLS material in $out_dir" >&2
  exit 1
fi

openssl genrsa -out "$out_dir/ca.key" 4096
openssl req -x509 -new -nodes -key "$out_dir/ca.key" -sha256 -days 3650 \
  -subj "/CN=Dena PostgreSQL Private CA" -out "$out_dir/ca.crt"
openssl genrsa -out "$out_dir/server.key" 3072
openssl req -new -key "$out_dir/server.key" -subj "/CN=db" \
  -out "$out_dir/server.csr"
cat > "$out_dir/server.ext" <<'EOF'
basicConstraints=CA:FALSE
keyUsage=digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth
subjectAltName=DNS:db
EOF
openssl x509 -req -in "$out_dir/server.csr" -CA "$out_dir/ca.crt" \
  -CAkey "$out_dir/ca.key" -CAcreateserial -out "$out_dir/server.crt" \
  -days 825 -sha256 -extfile "$out_dir/server.ext"
chmod 600 "$out_dir/ca.key" "$out_dir/server.key"
chmod 644 "$out_dir/ca.crt" "$out_dir/server.crt"
rm "$out_dir/server.csr" "$out_dir/server.ext" "$out_dir/ca.srl"
echo "Created PostgreSQL TLS files in $out_dir. Keep ca.key offline; install server.key as uid 999 on the host."

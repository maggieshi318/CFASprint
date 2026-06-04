#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/cfasprint"
REPO_URL="${REPO_URL:-https://github.com/maggieshi318/CFASprint.git}"
APP_DOMAIN="${APP_DOMAIN:-cfasprint.com}"
APP_URL="${APP_URL:-https://${APP_DOMAIN}}"

echo "==> Preparing server packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl git openssl ufw

if ! swapon --show | grep -q .; then
  echo "==> Creating 2GB swap file"
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "==> Installing Docker"
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
fi

echo "==> Opening web ports"
ufw allow 80/tcp || true
ufw allow 443/tcp || true
ufw allow OpenSSH || true

if [ -d "${APP_DIR}/.git" ]; then
  echo "==> Updating app code"
  git -C "${APP_DIR}" fetch origin main
  git -C "${APP_DIR}" reset --hard origin/main
else
  echo "==> Cloning app code"
  rm -rf "${APP_DIR}"
  git clone "${REPO_URL}" "${APP_DIR}"
fi

cd "${APP_DIR}"
mkdir -p server/data

if [ ! -f .env ]; then
  echo "==> Creating production .env"
  JWT_SECRET="$(openssl rand -hex 32)"
  cat > .env <<EOF
APP_DOMAIN=${APP_DOMAIN}
APP_URL=${APP_URL}
CORS_ORIGIN=${APP_URL}
JWT_SECRET=${JWT_SECRET}
NODE_ENV=production
PORT=8787
TRIAL_PAYMENT_URL=
FULL_ACCESS_PAYMENT_URL=
COMMUNITY_PAYMENT_URL=
EOF
fi

echo "==> Building and starting CFA Sprint"
docker compose -f docker-compose.public.yml up -d --build

echo "==> Current containers"
docker compose -f docker-compose.public.yml ps

echo "==> Done. Open ${APP_URL} after DNS and HTTPS finish provisioning."

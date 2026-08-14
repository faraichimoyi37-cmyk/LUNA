#!/usr/bin/env bash
# One-time deploy of LUNA onto an Oracle Cloud Ubuntu VM.
# Run from inside the project folder on the VM (files already copied there).
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run as root (sudo)."
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
APP_DIR="$(pwd)"

echo "==> Installing Docker..."
apt-get update -y >/dev/null
apt-get install -y ca-certificates curl gnupg >/dev/null
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
apt-get update -y >/dev/null
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin >/dev/null
systemctl enable --now docker

echo "==> Adding small swap (safe for 1GB free VMs while building)..."
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> Building LUNA image (this takes several minutes)..."
docker build -t luna:latest "$APP_DIR"

echo "==> Starting LUNA (port 80 -> app 3000)..."
JWT_SECRET="$(openssl rand -hex 32)"
docker rm -f luna 2>/dev/null || true
docker run -d \
  --name luna \
  --restart unless-stopped \
  -p 80:3000 \
  -e DATABASE_URL="file:/data/luna.db" \
  -e JWT_SECRET="$JWT_SECRET" \
  -e JWT_EXPIRES_IN="7d" \
  -e NODE_ENV="production" \
  -e PORT="3000" \
  -e CORS_ORIGIN="http://localhost:5173" \
  -e APP_URL="http://localhost:5173" \
  -v luna_data:/data \
  luna:latest

echo "==> Waiting for startup..."
sleep 8
docker ps --filter name=luna --format 'status: {{.Status}}'
echo
echo "Site should answer on http://$(hostname -I | awk '{print $1}')"
echo "Keep the line above as your saved JWT_SECRET: $JWT_SECRET"

#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh — One-click VPS setup for Hot Updater S3 Server
#
# Usage:
#   chmod +x scripts/deploy.sh
#   ./scripts/deploy.sh
#
# What it does:
#   1. Installs Node.js 22 (if not present)
#   2. Copies files to /opt/hot-updater-server
#   3. Installs production dependencies
#   4. Builds TypeScript
#   5. Generates SQLite schema
#   6. Installs & starts systemd service
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

DEPLOY_DIR="/opt/hot-updater-server"
SERVICE_NAME="hot-updater"
NODE_VERSION="22"

echo "═══════════════════════════════════════════════════"
echo "  Hot Updater S3 Server — VPS Deploy Script"
echo "═══════════════════════════════════════════════════"

# ── Check root ────────────────────────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
  echo "❌ This script must be run as root (sudo ./scripts/deploy.sh)"
  exit 1
fi

# ── Install Node.js if needed ─────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo "📦 Installing Node.js ${NODE_VERSION}..."
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
  apt-get install -y nodejs
else
  echo "✅ Node.js $(node -v) already installed"
fi

# ── Create deploy directory ───────────────────────────────────────────────────
echo "📁 Deploying to ${DEPLOY_DIR}..."
mkdir -p "${DEPLOY_DIR}/data"

# Copy project files (excluding node_modules, dist, data, .env)
rsync -av --exclude='node_modules' \
          --exclude='dist' \
          --exclude='data' \
          --exclude='.env' \
          --exclude='*.db' \
          ./ "${DEPLOY_DIR}/"

# Copy .env if it doesn't exist yet on the server
if [[ ! -f "${DEPLOY_DIR}/.env" ]]; then
  if [[ -f ".env" ]]; then
    cp .env "${DEPLOY_DIR}/.env"
    echo "✅ Copied .env to ${DEPLOY_DIR}/.env"
  else
    echo "⚠️  No .env found! Copy .env.example to ${DEPLOY_DIR}/.env and fill in values."
    cp .env.example "${DEPLOY_DIR}/.env"
  fi
fi

# ── Install dependencies & build ──────────────────────────────────────────────
cd "${DEPLOY_DIR}"
echo "📦 Installing production dependencies..."
npm ci --omit=dev

echo "🔨 Building TypeScript..."
npx tsc

# ── Generate database schema ──────────────────────────────────────────────────
echo "🗄️  Generating database schema..."
npx hot-updater db generate src/hotUpdater.ts --yes || true

# ── Set permissions ───────────────────────────────────────────────────────────
chown -R www-data:www-data "${DEPLOY_DIR}"
chmod 600 "${DEPLOY_DIR}/.env"

# ── Install systemd service ───────────────────────────────────────────────────
echo "⚙️  Installing systemd service..."
cp scripts/hot-updater.service /etc/systemd/system/${SERVICE_NAME}.service
systemctl daemon-reload
systemctl enable ${SERVICE_NAME}
systemctl restart ${SERVICE_NAME}

echo ""
echo "═══════════════════════════════════════════════════"
echo "  ✅ Deploy complete!"
echo "  Status: sudo systemctl status ${SERVICE_NAME}"
echo "  Logs:   sudo journalctl -u ${SERVICE_NAME} -f"
echo "═══════════════════════════════════════════════════"

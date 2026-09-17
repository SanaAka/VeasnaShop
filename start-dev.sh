#!/usr/bin/env bash
# Start the Veasna Shop API locally and forward Stripe webhook events to it.
#
# Requires:
#   - Docker Postgres running:  docker compose up -d db
#   - Stripe CLI installed and logged in:  stripe --version
#
# Usage:
#   ./start-dev.sh          # uses PORT from .env (or 5000 if unset)
#   PORT=5000 ./start-dev.sh

set -euo pipefail

# Load PORT (and other vars) from .env if present.
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

PORT="${PORT:-5000}"
FORWARD_TO="localhost:${PORT}/api/stripe/webhook"

echo ">> Starting Stripe CLI listener -> ${FORWARD_TO}"
stripe listen --forward-to "${FORWARD_TO}" &
STRIPE_PID=$!

trap 'kill "${STRIPE_PID}" 2>/dev/null || true; echo ">> Stripe CLI stopped"' EXIT

echo ">> Starting Express server on port ${PORT}"
# shellcheck disable=SC2097
PORT="${PORT}" node server.js

kill "${STRIPE_PID}" 2>/dev/null || true
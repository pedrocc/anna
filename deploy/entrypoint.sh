#!/bin/sh
set -e

echo "=== Anna Deploy: Starting ==="

# ---------------------------------------------------------------------------
# 1. Wait for PostgreSQL and run migrations
# ---------------------------------------------------------------------------
MAX_RETRIES=30
RETRY_INTERVAL=3
ATTEMPT=0

echo "Waiting for database..."

while [ $ATTEMPT -lt $MAX_RETRIES ]; do
  ATTEMPT=$((ATTEMPT + 1))
  echo "Migration attempt $ATTEMPT/$MAX_RETRIES..."

  if cd /app/packages/db && bun drizzle-kit migrate 2>&1; then
    echo "Migrations applied successfully."
    break
  fi

  if [ $ATTEMPT -eq $MAX_RETRIES ]; then
    echo "ERROR: Database not ready after $MAX_RETRIES attempts. Exiting."
    exit 1
  fi

  echo "Database not ready, retrying in ${RETRY_INTERVAL}s..."
  sleep $RETRY_INTERVAL
done

cd /app

# ---------------------------------------------------------------------------
# 2. Start supervisord (manages API, worker, nginx)
# ---------------------------------------------------------------------------
echo "=== Anna Deploy: Starting services ==="
exec supervisord -c /etc/supervisor/conf.d/supervisord.conf

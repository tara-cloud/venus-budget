#!/bin/sh
set -e

echo "🚀 Venus Budget App v$(node -e "console.log(require('./package.json').version)" 2>/dev/null || echo '1.0.0')"
echo "📦 Running database migrations..."

# Run Prisma migrations using bundled CLI (avoids runtime npm download)
node_modules/.bin/prisma migrate deploy

echo "✅ Migrations complete"
echo "🌐 Starting server on port ${PORT:-3000}..."

exec node server.js

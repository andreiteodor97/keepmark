#!/bin/sh
set -e

echo "Pushing database schema..."
node_modules/.bin/prisma db push --accept-data-loss 2>&1 || echo "Schema push failed, continuing..."

echo "Running FTS migration..."
node_modules/.bin/prisma db execute --file prisma/fts-migration.sql 2>/dev/null || echo "FTS migration already applied or skipped"

echo "Starting server..."
node server.js

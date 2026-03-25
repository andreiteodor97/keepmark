#!/bin/sh
set -e

PRISMA="node node_modules/prisma/build/index.js"

echo "Pushing database schema..."
$PRISMA db push --accept-data-loss 2>&1 || echo "Schema push failed, continuing..."

echo "Running FTS migration..."
$PRISMA db execute --file prisma/fts-migration.sql 2>/dev/null || echo "FTS migration already applied or skipped"

echo "Starting server..."
node server.js

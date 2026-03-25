#!/bin/sh
set -e

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Running FTS migration..."
npx prisma db execute --file prisma/fts-migration.sql 2>/dev/null || echo "FTS migration already applied or skipped"

echo "Starting server..."
node server.js

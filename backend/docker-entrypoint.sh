#!/bin/sh
set -e

echo "[entrypoint] Generating Prisma client..."
npx prisma generate

echo "[entrypoint] Applying migrations (deploy only — no reset)..."
npx prisma migrate deploy

echo "[entrypoint] Seeding (insert missing only — never resets or overwrites)..."
npx prisma db seed

echo "[entrypoint] Starting API..."
exec npm run start

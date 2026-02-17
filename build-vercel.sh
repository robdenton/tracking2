#!/bin/bash
set -e

echo "=== Installing monorepo dependencies ==="
npm install

echo "=== Building web app ==="
cd apps/web
npm run build

echo "=== Build complete ==="

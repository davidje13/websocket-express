#!/bin/sh
set -e

echo "Running package test...";
echo;

BASE_DIR="$(cd "$(dirname "$0")/.."; pwd)";
cd "$BASE_DIR";
rm /websocket-express-*.tgz 2>/dev/null || true;
npm pack;
rm packagetest/websocket-express.tgz 2>/dev/null || true;
mv websocket-express-*.tgz packagetest/websocket-express.tgz;
cd - >/dev/null;

cd "$BASE_DIR/packagetest";
rm -rf node_modules || true;
npm install --audit=false;
rm websocket-express.tgz || true;
npm test --ignore-scripts=false; # ignore-scripts is over-zealous on Node 14
cd - >/dev/null;

echo;
echo "Package test complete";
echo;

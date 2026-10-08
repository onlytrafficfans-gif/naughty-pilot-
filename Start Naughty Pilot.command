#!/usr/bin/env bash
cd "$(dirname "$0")"
if ! command -v node >/dev/null; then
  echo 'Install Node.js 24 or newer from https://nodejs.org, then open this launcher again.'
  read -r -p 'Press Return to close.'
  exit 1
fi
node launch.cjs

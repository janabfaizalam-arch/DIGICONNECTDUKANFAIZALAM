#!/bin/sh
# The same thing for a shop running macOS or Linux.
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "  DigiConnect Print Station needs Node.js."
  echo "  Install it from https://nodejs.org/en/download and run this again."
  echo ""
  exit 1
fi

exec node ./station.mjs

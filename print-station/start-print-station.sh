#!/bin/sh
# The same thing for a shop running macOS or Linux.
cd "$(dirname "$0")" || exit 1

# Same trap as on Windows: this file copied out of the folder on its own,
# with station.mjs left behind.
if [ ! -f ./station.mjs ]; then
  echo ""
  echo "  This file cannot run on its own."
  echo "  Extract the whole zip and run it from inside that folder,"
  echo "  next to station.mjs and lib/."
  echo ""
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "  DigiConnect Print Station needs Node.js."
  echo "  Install it from https://nodejs.org/en/download and run this again."
  echo ""
  exit 1
fi

exec node ./station.mjs

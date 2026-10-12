#!/usr/bin/env bash
# Build the release app and replace /Applications/Maia.app with it.
# Usage: npm run install-app            (build, quit Maia, replace, relaunch)
#        npm run install-app -- --build-only
# Only the .app is built (--bundles app): the dmg step is flaky and not needed to install.
set -euo pipefail

APP_NAME="Maia"
INSTALL_PATH="/Applications/${APP_NAME}.app"
BUILT_APP="src-tauri/target/release/bundle/macos/${APP_NAME}.app"

cd "$(dirname "$0")/.."

npm run tauri build -- --bundles app

if [ ! -d "$BUILT_APP" ]; then
  echo "Build finished but $BUILT_APP is missing." >&2
  exit 1
fi

if [ "${1:-}" = "--build-only" ]; then
  echo "Built $BUILT_APP (not installed)."
  exit 0
fi

# Quit the installed app gracefully so it can flush pending saves, then wait for it to exit.
if pgrep -f "${INSTALL_PATH}/Contents/MacOS" >/dev/null; then
  osascript -e "quit app \"${APP_NAME}\""
  for _ in $(seq 1 20); do
    pgrep -f "${INSTALL_PATH}/Contents/MacOS" >/dev/null || break
    sleep 0.5
  done
  if pgrep -f "${INSTALL_PATH}/Contents/MacOS" >/dev/null; then
    echo "${APP_NAME} did not quit within 10 s. Close it and run again." >&2
    exit 1
  fi
fi

rm -rf "$INSTALL_PATH"
cp -R "$BUILT_APP" "$INSTALL_PATH"
echo "Installed $INSTALL_PATH"
open "$INSTALL_PATH"

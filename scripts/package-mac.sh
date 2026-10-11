#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TAG="${HAILSTONE_VERSION:-dev}"
BUNDLE_VERSION="${TAG#v}"
OUT="$ROOT/release/Hailstone-${TAG}"
STABLE="$ROOT/release/Hailstone"
APP="$OUT/Hailstone.app"
WEB="$APP/Contents/Resources/web"

cd "$ROOT"
npm run build

# Leftover copies (same bundle id, old serve.py, busy 18765) keep
# serving the previous build. Kill those before replacing the app.
killall Hailstone 2>/dev/null || true
pkill -f 'Hailstone.app/Contents/Resources/serve.py' 2>/dev/null || true
pkill -f 'http.server 18765' 2>/dev/null || true
if command -v lsof >/dev/null; then
  pids="$(lsof -tiTCP:18765 -sTCP:LISTEN 2>/dev/null || true)"
  if [ -n "${pids}" ]; then
    kill ${pids} 2>/dev/null || true
  fi
fi

rm -rf "$OUT"
mkdir -p "$APP/Contents/MacOS" "$WEB"
cp -R "$ROOT/dist/." "$WEB/"

cat > "$APP/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key>
  <string>Hailstone</string>
  <key>CFBundleDisplayName</key>
  <string>Hailstone</string>
  <key>CFBundleIdentifier</key>
  <string>local.hailstone</string>
  <key>CFBundleVersion</key>
  <string>${BUNDLE_VERSION}</string>
  <key>CFBundleShortVersionString</key>
  <string>${BUNDLE_VERSION}</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleExecutable</key>
  <string>Hailstone</string>
  <key>CFBundleIconFile</key>
  <string>AppIcon</string>
  <key>LSMinimumSystemVersion</key>
  <string>12.0</string>
  <key>NSPrincipalClass</key>
  <string>NSApplication</string>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>
EOF

ICON_WORK="$(mktemp -d)"
ICONSET="$ICON_WORK/AppIcon.iconset"
mkdir -p "$ICONSET" "$APP/Contents/Resources"
swift "$ROOT/scripts/make-icon.swift" "$ROOT/public/favicon.svg" "$ICON_WORK/icon-1024.png"
for size in 16 32 128 256 512; do
  sips -z "$size" "$size" "$ICON_WORK/icon-1024.png" --out "$ICONSET/icon_${size}x${size}.png" >/dev/null
  dbl=$((size * 2))
  sips -z "$dbl" "$dbl" "$ICON_WORK/icon-1024.png" --out "$ICONSET/icon_${size}x${size}@2x.png" >/dev/null
done
iconutil -c icns "$ICONSET" -o "$APP/Contents/Resources/AppIcon.icns"
rm -rf "$ICON_WORK"

cc -O2 -fobjc-arc -framework Cocoa -framework WebKit -o "$APP/Contents/MacOS/Hailstone" "$ROOT/scripts/mac-launcher.m"
codesign --force --sign - "$APP"

cat > "$OUT/Open Hailstone.command" <<'EOF'
#!/bin/bash
cd "$(dirname "$0")/Hailstone.app/Contents/Resources/web"
PORT=18765
pids="$(lsof -tiTCP:${PORT} -sTCP:LISTEN 2>/dev/null || true)"
if [ -n "${pids}" ]; then
  kill ${pids} 2>/dev/null || true
  sleep 0.25
fi
echo "Hailstone → http://127.0.0.1:${PORT}/"
(sleep 0.4 && open "http://127.0.0.1:${PORT}/?t=$(date +%s)") &
exec python3 -m http.server "$PORT" --bind 127.0.0.1
EOF
chmod +x "$OUT/Open Hailstone.command"

cat > "$OUT/Read Me.txt" <<'EOF'
Hailstone
=========

Double-click Hailstone.app. The plot opens in its own window.

If macOS blocks it: right-click → Open → Open.
EOF

if [ "$OUT" != "$STABLE" ]; then
  rm -rf "$STABLE"
  cp -R "$OUT" "$STABLE"
  codesign --force --sign - "$STABLE/Hailstone.app"
fi

echo "Packaged: $STABLE"
echo "Versioned copy: $OUT"

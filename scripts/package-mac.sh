#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TAG="${HAILSTONE_VERSION:-dev}"
BUNDLE_VERSION="${TAG#v}"
OUT="$ROOT/release/Hailstone-${TAG}"
APP="$OUT/Hailstone.app"
WEB="$APP/Contents/Resources/web"

cd "$ROOT"
npm run build

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
  <key>LSMinimumSystemVersion</key>
  <string>12.0</string>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>
EOF

cat > "$APP/Contents/MacOS/Hailstone" <<'EOF'
#!/bin/bash
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/Resources/web"
PORT=18765
(sleep 0.4 && /usr/bin/open "http://127.0.0.1:${PORT}/") &
exec /usr/bin/python3 -m http.server "$PORT" --bind 127.0.0.1
EOF
chmod +x "$APP/Contents/MacOS/Hailstone"

cat > "$OUT/Open Hailstone.command" <<'EOF'
#!/bin/bash
cd "$(dirname "$0")/Hailstone.app/Contents/Resources/web"
PORT=18765
echo "Hailstone → http://127.0.0.1:${PORT}/"
(sleep 0.4 && open "http://127.0.0.1:${PORT}/") &
exec python3 -m http.server "$PORT" --bind 127.0.0.1
EOF
chmod +x "$OUT/Open Hailstone.command"

cat > "$OUT/Read Me.txt" <<'EOF'
Hailstone
=========

Double-click Hailstone.app. Your browser opens the plot.

If macOS blocks it: right-click → Open → Open.
EOF

echo "Packaged: $OUT"

# Hailstone

Standalone Collatz polar plot. Distance from the center is the hailstone value; `1` sits at the center; the largest term is scaled to the rim.

```bash
npm install
npm run dev
```

Then open the printed local URL. `npm run build` produces a static `dist/` you can host anywhere.

## Mac folder (no Node)

```bash
npm run package:mac
```

That writes `release/Hailstone/`. Copy that folder anywhere and double-click **Hailstone.app**. macOS only needs Python 3, which is already there. If Gatekeeper blocks the app, right-click → Open, or use **Open Hailstone.command**.

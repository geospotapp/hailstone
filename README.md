# Hailstone

Polar plots of integer sequences. Radius is the term; the largest value sits on the rim; the first term is straight up, then each step rotates clockwise.

## Sequences

**Halting maps** (start from *n*, stop at 1, 0, a cycle, a palindrome, or the step cap):

- Collatz 3n+1
- Juggler
- Happy numbers
- Aliquot
- Kaprekar
- Reverse-and-add (196 / Lychrel)

**Open-ended** (plot the first *N* terms):

- Fibonacci, Lucas, Pell, Padovan
- Recamán
- Hofstadter Q
- Primes
- Triangular
- Look-and-say

## Plot controls

- **Degrees per step** — type a value, or pick 4°, 7°, 15°, 30°, 45°, 60°, 90°
- **Smooth curve** — join the points with a spline instead of straight segments
- **Radius** — linear **n** or **log n** (1 stays at the center on the log scale)
- **Zoom / pan** — +/−, scroll wheel, drag; Reset returns to the full view
- Hover a point for its step and value; the term table lists the rule used at each step

## Run locally

```bash
npm install
npm run dev
```

`npm run build` writes a static `dist/` you can host anywhere.

## Mac app

```bash
HAILSTONE_VERSION=v0.1.0 npm run package:mac
```

That writes `release/Hailstone-v0.1.0/`. Double-click **Hailstone.app**. macOS only needs Python 3. If Gatekeeper blocks it, right-click → Open.

Pushing a lightweight tag on `main` (or **Actions → Mac app → Run workflow** with that tag) builds `hailstone-<tag>.zip` and attaches it to the GitHub Release.

```bash
git tag v0.1.0
git push origin v0.1.0
```

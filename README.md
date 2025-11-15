# Cognitive Arcade — Web & Hardware Tests

Welcome to the Cognitive Arcade, a collection of interactive cognitive and motor skill tests designed for local, offline use. This repository features a web-based frontend and optional Arduino hardware integration, making it perfect for research, education, and rehabilitation-adjacent demos — though it is not intended for medical diagnostics.

Think of this repo as a small arcade of cognitive challenges you can run locally on your machine or pair with simple Arduino hardware for alternate input.

## What’s included

- `serve_web.py` — a tiny Python HTTP server that opens `web/index.html` in your default browser.
- `run_project.bat` — Windows convenience script (calls the server or other helpers).
- `web/` — the full web UI with test pages and JS logic:
  - `index.html` — landing page for the test suite
  - `visual-reflex.html` / `visual-reflex.js`
  - `memory-span.html` / `memory-span.js`
  - `focus-control.html` / `focus-control.js`
  - `symbol-match.html` / `symbol-match.js`
  - `sequence-solver.html` / `sequence-solver.js`
  - `obstacle-dodger.html` / `obstacleDodger.js`
  - `styles.css`, `theme.js` — styling and theming
- `Arduino Code/ROM/ROM.ino` — Arduino sketch(s) for optional hardware input

## Quick start (Windows)

Preferred: use the included Python server which opens the site automatically.

Open PowerShell in the repo root and run:

```powershell
# start the local server and open the UI
python .\serve_web.py

# or run the packaged batch file
.\run_project.bat
```

If you prefer a minimal static server, you can also serve the `web` folder directly:

```powershell
# from repo root
python -m http.server 8000 -d web
# then open http://localhost:8000/index.html
```

Or simply open `web/index.html` in a modern browser (no server required for basic usage), but some browsers restrict certain features (e.g., modules or Web Serial) when opened via `file://`.

## How to use the UI

- Open the landing page and choose a test card.
- Most tests work with keyboard & mouse by default.
- Optional: some tests offer Web Serial integration (Chrome/Edge). If you have an Arduino streaming digits or button presses, you can connect it from the test UI.

High-level test list:
- Visual Reflex — reaction-time rounds and simple scoring
- Memory Span — forward/backward span (adaptive)
- Focus Control — Go/No-Go style commission/omission errors
- Symbol Match — timed symbol→digit mapping (SDMT-like)
- Sequence Solver — short timed puzzles
- Obstacle Dodger — simple motor-control challenge

Detailed scoring rules and interaction notes are in `web/README_web.md`.

## Hardware / Arduino notes (optional)

If you want to use Arduino hardware as an input device, the code is under `Arduino Code/ROM/`. Typical workflow:

1. Open the sketch (`ROM.ino`) in the Arduino IDE.
2. Connect your Arduino, select the correct board and COM port, and upload.
3. On the web UI, choose the optional Arduino/Web Serial connection (supported in Chromium browsers) and select the COM port.

The web UI expects simple line-delimited tokens (e.g., digits + newline). See `web/README_web.md` for exact formats per test.

## Troubleshooting

- If the server fails to start, confirm Python 3 is installed and on `PATH`.
- If the browser blocks serial access or modules, use `serve_web.py` so pages are served over `http` rather than `file://`.
- If Arduino is not recognized on Windows, check Device Manager for the COM port and ensure drivers are installed.

## Contributing

Small changes are welcome: bug fixes, copy edits, UI tweaks, or new tests. Recommended workflow:

1. Fork / clone the repo
2. Make changes in a feature branch
3. Submit a PR with a short description and steps to reproduce

If you add persistent data or analytics, please respect user privacy and keep all data local unless you explicitly add opt-in telemetry.

## Notes & license

- This project is provided as-is for experimentation and education. It is not medical software.
- No license file is included in this repo



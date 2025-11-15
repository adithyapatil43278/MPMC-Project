# Web UI for Cognitive Tests

This folder contains a lightweight web interface for running cognitive tests locally in your browser. It includes:

- `index.html`: Landing page with project title and cards to enter tests.
- `visual-reflex.html`: Visual Reflex Test page with introduction, instructions, and results.
- `visual-reflex.js`: JavaScript that runs the 20-round CRT test.
- `memory-span.html`: Memory Span Challenge intro, test, and results (forward & backward recall).
- `memory-span.js`: Adaptive memory span logic with two attempts per length.
 - `focus-control.html`: Focus & Control Challenge (Go/No-Go) intro, test, and results.
 - `focus-control.js`: Go/No-Go logic with 40 trials, commission/omission error counts, and classification.
 - `symbol-match.html`: Symbol Match Challenge (SDMT-lite) intro, key, timed test, and results.
 - `symbol-match.js`: 90-second timed symbol→digit matching with scoring and classification.
 - `sequence-solver.html`: Sequence Solver Challenge intro, puzzles, and results.
 - `sequence-solver.js`: 5 timed puzzles (25s each) with input and scoring.
- `styles.css`: Simple responsive styling.

Optional: You can connect an Arduino (with a keypad) via Web Serial in supported browsers (Chrome/Edge). For Visual Reflex, send single digits `1-9` + `\n`. For Memory Span, send digits `0-9` and `#` each followed by `\n`.

## How to run

Open `index.html` in a modern desktop browser. For the Web Serial feature, use Chrome or Edge.

If your browser blocks file access for modules, you can serve the folder locally with a simple HTTP server. On Windows PowerShell:

```
# Option 1: Python 3 built-in (if Python is installed)
python -m http.server 8000 -d web

# Then open: http://localhost:8000/
```

Or using Node (if installed):

```
npx serve web
```

## Themes

The web UI supports multiple themes: Light (default), Dark, Dracula, Nord, and Solarized. On the homepage (`index.html`), use the Theme dropdown to switch. Your choice is saved in your browser and applied across all test pages.

## Interacting with Arduino (optional)

- Click "Use Arduino (optional)" on the intro screen of a test.
- Choose the serial port and click Connect (9600 baud).
- Visual Reflex: send `1..9` as separate lines, e.g., `5\n`.
- Memory Span: send digits `0..9` and `#` as separate lines, e.g., `7\n` then `#\n` to submit.
 - Focus & Control: send digits `1..9` as separate lines. Press nothing for `3`.
 - Symbol Match: send digits `1..9` as separate lines; each line is treated as a response to the current symbol.
 - Sequence Solver: keyboard only by default (digits and `#`).

## Scoring rules (Visual Reflex)

- Accuracy below 90% → Result: Inconclusive (reaction time not reliable).
- Avg < 300ms and Accuracy ≥ 95% → Exceptional Reflexes.
- 300–449ms and Accuracy ≥ 95% → Fast Reflexes.
- 450–600ms and Accuracy ≥ 90% → Average Reflexes.
- >600ms and Accuracy ≥ 90% → Slower Than Average.

## Scoring rules (Memory Span)

- Forward span starts at 3; backward span starts at 2.
- Two attempts per sequence length; length increases by one after success.
- Test ends when both attempts fail at the same length.
- Reported scores are the last successfully completed lengths for forward and backward.
- Classification:
	- Exceptional Memory: Forward ≥ 8 and Backward ≥ 6
	- Strong Memory: Forward 6–7 and Backward 4–5
	- Average Memory: Forward = 5 and/or Backward = 3
	- Below Average: Forward ≤ 4 or Backward ≤ 2

	## Scoring rules (Focus & Control)

	- 40 trials total: 30 Go (respond) and 10 No-Go (withhold on '3').
	- Commission error: Pressed when stimulus is '3'.
	- Omission error: Failed to press on Go stimulus.
	- Classification:
		- Excellent: 0 Commission and ≤1 Omission
		- Good: 1 Commission and ≤2 Omission
		- Average: 2 Commission and ≤3 Omission
		- Below Average: ≥3 Commission or ≥4 Omission

		## Scoring rules (Symbol Match)

		- Timed 90 seconds. Score = total correct matches.
		- Classification:
			- Exceptional: ≥60
			- Fast: 45–59
			- Average: 30–44
			- Below Average: <30

		## Scoring rules (Sequence Solver)

		- 5 puzzles; score = number correct.
		- Classification:
			- Excellent: 5/5
			- Good: 4/5
			- Average: 3/5
			- Developing: ≤2/5

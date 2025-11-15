// Sequence Solver Challenge

const introEl = document.getElementById('intro');
const puzzleEl = document.getElementById('puzzle');
const resultsEl = document.getElementById('results');
const sequenceEl = document.getElementById('sequence');
const typedEl = document.getElementById('typed');
const feedbackEl = document.getElementById('feedback');
const scoreEl = document.getElementById('score');
const puzzleNumEl = document.getElementById('puzzleNum');
const timeLeftEl = document.getElementById('timeLeft');
const conditionEl = document.getElementById('condition');

const startBtn = document.getElementById('startBtn');
const serialBtn = document.getElementById('serialBtn');

const PUZZLES = [
    { seq: [2, 4, 6, 8], answer: '10', hint: '' },
    { seq: [15, 13, 11, 9], answer: '7', hint: '' },
    { seq: [5, 6, 8, 11], answer: '15', hint: '+1, +2, +3, ...' },
    { seq: [2, 8, 3, 8, 4], answer: '8', hint: 'Alternating pattern' },
    { seq: [1, 4, 9, 16], answer: '25', hint: 'Squares' },
    // additional puzzles (15 more -> total 20)
    { seq: [2, 3, 5, 7], answer: '11', hint: 'Primes' },
    { seq: [1, 1, 2, 3], answer: '5', hint: 'Fibonacci-like' },
    { seq: [3, 6, 12, 24], answer: '48', hint: 'Doubling' },
    { seq: [4, 9, 16, 25], answer: '36', hint: 'Squares' },
    { seq: [2, 5, 10, 17], answer: '26', hint: '+3, +5, +7, ...' },
    { seq: [1, 2, 4, 7], answer: '11', hint: '+1, +2, +3, ...' },
    { seq: [2, 2, 2, 2], answer: '2', hint: 'Constant' },
    { seq: [1, 3, 6, 10], answer: '15', hint: 'Triangular numbers' },
    { seq: [2, 5, 11, 23], answer: '47', hint: 'Differences double' },
    { seq: [9, 7, 5, 3], answer: '1', hint: 'Subtract 2' },
    { seq: [5, 10, 20, 40], answer: '80', hint: 'Multiply by 2' },
    { seq: [3, 5, 9, 17], answer: '33', hint: 'Differences double' },
    { seq: [2, 4, 8, 14], answer: '22', hint: '+2, +4, +6, ...' },
    { seq: [1, 8, 27, 64], answer: '125', hint: 'Cubes' },
    { seq: [2, 6, 12, 20], answer: '30', hint: '+4, +6, +8, ...' },
];

// Total time for the full test (25 seconds)
const TOTAL_TIME_MS = 25_000;

let current = 0;
let score = 0;
let typingBuffer = '';
let endAt = 0;
let tickTimer = null;
let awaitingInput = false;
let serialReader = null;
let serialPort = null;
let onKeydown = null;
let testEnded = false;

function showSequence(p) {
    const shown = p.seq.map(n => String(n)).join(', ') + ', _';
    sequenceEl.textContent = shown;
    feedbackEl.textContent = '';
    typedEl.textContent = '_';
}

function classify(score) {
    // New classification for 20 puzzles total
    if (score === PUZZLES.length) {
        return { label: '🧠 Result: Genius-Level Reasoning', message: 'Amazing — you solved all puzzles within the time limit. Exceptional pattern recognition and speed. Truly outstanding!' };
    }
    if (score >= 12) {
        return { label: '🏅 Result: Exceptional Logical Reasoning', message: 'Excellent performance. You demonstrate very strong problem-solving skills and rapid pattern detection.' };
    }
    // Above average if user solves more than 5 puzzles (5 is considered average)
    if (score > 5) {
        return { label: '✨ Result: Above Average Reasoning', message: 'A strong result — your ability to see patterns and solve problems is above average for this task.' };
    }
    if (score === 5) {
        return { label: '📈 Result: Average Reasoning', message: 'A solid, average performance. Solving five puzzles is the expected average under this tight time constraint.' };
    }
    return { label: '� Result: Below Average Reasoning', message: 'Below average for this task. Practice with pattern recognition and timed puzzles to improve performance.' };
}

function handleKey(k) {
    if (!awaitingInput) return;
    if (k === '#') { finalize(); return; }
    if (/^[0-9]$/.test(k)) {
        typingBuffer += k;
        typedEl.textContent = typingBuffer || '_';
    }
}

function finalize() {
    awaitingInput = false;
    const ans = typingBuffer.trim();
    const correct = ans === PUZZLES[current].answer;
    if (correct) {
        score += 1;
        feedbackEl.textContent = 'Correct!';
        feedbackEl.style.color = '#2ecc71';
    } else {
        feedbackEl.textContent = `Incorrect (${PUZZLES[current].answer})`;
        feedbackEl.style.color = '#e74c3c';
    }
    // If this was the last puzzle, go to results after a short delay.
    if (current >= PUZZLES.length - 1) {
        setTimeout(() => {
            endTest();
        }, 600);
    } else {
        setTimeout(() => {
            nextPuzzle();
        }, 600);
    }
}

function nextPuzzle() {
    current += 1;
    if (current >= PUZZLES.length) { return endTest(); }
    puzzleNumEl.textContent = String(current + 1);
    typingBuffer = '';
    awaitingInput = true;
    showSequence(PUZZLES[current]);
    // Note: TOTAL_TIME_MS governs the whole test; do not reset endAt here.
}

function endTest() {
    if (testEnded) return;
    testEnded = true;
    if (onKeydown) window.removeEventListener('keydown', onKeydown);
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
    puzzleEl.classList.add('hidden');
    resultsEl.classList.remove('hidden');
    scoreEl.textContent = String(score);
    const verdict = classify(score);
    conditionEl.innerHTML = `<div class="label">${verdict.label}</div><p>${verdict.message}</p>`;
}

function tick() {
    const remaining = Math.max(0, Math.ceil((endAt - performance.now()) / 1000));
    timeLeftEl.textContent = String(remaining);
    if (remaining <= 0) {
        // Total time expired: end the test immediately and show results
        if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
        endTest();
    }
}

async function connectSerial() {
    if (!('serial' in navigator)) { alert('Web Serial not supported in this browser. Use Chrome/Edge on desktop.'); return; }
    try {
        serialPort = await navigator.serial.requestPort();
        await serialPort.open({ baudRate: 9600 });
        const decoder = new TextDecoderStream();
        serialPort.readable.pipeTo(decoder.writable);
        serialReader = decoder.readable.getReader();
        serialBtn.textContent = 'Arduino Connected';
        serialBtn.disabled = true;
        listenSerial();
    } catch (e) { console.error('Serial connection failed', e); alert('Failed to connect to Arduino serial.'); }
}

async function listenSerial() {
    let buffer = '';
    while (serialReader) {
        const { value, done } = await serialReader.read();
        if (done) break;
        if (value) {
            buffer += value;
            let idx;
            while ((idx = buffer.indexOf('\n')) !== -1) {
                const line = buffer.slice(0, idx).trim();
                buffer = buffer.slice(idx + 1);
                if (line) {
                    // Extract keypad input from "Keypad: X" format
                    if (line.startsWith('Keypad:')) {
                        const keyValue = line.split(':')[1]?.trim();
                        if (keyValue) {
                            handleKey(keyValue);
                        }
                    } else {
                        // Fallback for direct input (backwards compatibility)
                        handleKey(line);
                    }
                }
            }
        }
    }
}

function startTest() {
    introEl.classList.add('hidden');
    puzzleEl.classList.remove('hidden');
    current = 0;
    score = 0;
    puzzleNumEl.textContent = '1';
    typingBuffer = '';
    awaitingInput = true;
    showSequence(PUZZLES[current]);
    // Set a single total end time for the whole test
    endAt = performance.now() + TOTAL_TIME_MS;
    // register a removable keydown handler so endTest can clean up correctly
    onKeydown = (e) => handleKey(e.key);
    window.addEventListener('keydown', onKeydown);
    // populate total puzzle counts in the UI
    const totalHeader = document.getElementById('totalPuzzlesHeader');
    const totalResults = document.getElementById('totalPuzzles');
    if (totalHeader) totalHeader.textContent = String(PUZZLES.length);
    if (totalResults) totalResults.textContent = String(PUZZLES.length);
    // start tick
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = setInterval(tick, 250);
}

startBtn?.addEventListener('click', startTest);
serialBtn?.addEventListener('click', connectSerial);

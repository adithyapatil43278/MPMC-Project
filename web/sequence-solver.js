// Sequence Solver Challenge
// 5 puzzles, 25s each. Type digits and press # to submit. Score correct answers.

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
];

const PUZZLE_TIME_MS = 25_000;

let current = 0;
let score = 0;
let typingBuffer = '';
let endAt = 0;
let tickTimer = null;
let awaitingInput = false;
let serialReader = null;
let serialPort = null;

function showSequence(p) {
    const shown = p.seq.map(n => String(n)).join(', ') + ', _';
    sequenceEl.textContent = shown;
    feedbackEl.textContent = '';
    typedEl.textContent = '_';
}

function classify(score) {
    if (score === 5) {
        return { label: 'Result: Excellent Logical Reasoning', message: 'Perfect score! You have an exceptional ability to identify patterns and deduce logical rules. Your fluid intelligence is highly developed.' };
    }
    if (score === 4) {
        return { label: 'Result: Good Logical Reasoning', message: 'Great work. You have strong problem-solving skills and a keen eye for patterns, demonstrating a high level of fluid intelligence.' };
    }
    if (score === 3) {
        return { label: 'Result: Average Logical Reasoning', message: 'This is a solid performance. Your ability to solve novel problems and identify patterns falls within the typical range for most adults.' };
    }
    return { label: 'Result: Developing Reasoning Skills', message: 'This test measures fluid intelligence—your ability to think logically and solve problems in new situations. Performance can be improved with practice through puzzles and games.' };
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
    setTimeout(nextPuzzle, 600);
}

function nextPuzzle() {
    current += 1;
    if (current >= PUZZLES.length) { return endTest(); }
    puzzleNumEl.textContent = String(current + 1);
    typingBuffer = '';
    awaitingInput = true;
    showSequence(PUZZLES[current]);
    endAt = performance.now() + PUZZLE_TIME_MS;
}

function endTest() {
    window.removeEventListener('keydown', onKeydown);
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
        // Time out -> auto finalize with current input
        finalize();
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
                if (line) handleKey(line);
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
    endAt = performance.now() + PUZZLE_TIME_MS;
    window.addEventListener('keydown', (e) => handleKey(e.key));
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = setInterval(tick, 250);
}

startBtn?.addEventListener('click', startTest);
serialBtn?.addEventListener('click', connectSerial);

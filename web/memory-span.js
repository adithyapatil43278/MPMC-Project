// Memory Span Challenge (Forward Only) with optional Web Serial for keypad
// Adaptive logic: starts at 3; two attempts per length; stop after two failures at same length or after 3 successful levels.

const introEl = document.getElementById('intro');
const phaseMsgEl = document.getElementById('phaseMsg');
const phaseTextEl = document.getElementById('phaseText');
const displayEl = document.getElementById('display');
const sequenceEl = document.getElementById('sequence');
const inputEl = document.getElementById('input');
const typedEl = document.getElementById('typed');
const resultsEl = document.getElementById('results');
const forwardScoreEl = document.getElementById('forwardScore');
const conditionEl = document.getElementById('condition');

const startBtn = document.getElementById('startBtn');
const serialBtn = document.getElementById('serialBtn');
 
let serialReader = null;
let serialPort = null;

let typingBuffer = '';
let collectingInput = false;
let expectedSequence = [];

function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomDigit() { return randInt(0, 9); }

function classify(forwardSpan) {
    if (forwardSpan >= 6) {
        return {
            label: '🌟 Result: Exceptional Memory',
            message: 'Your performance is outstanding! You have an exceptional ability to recall information, which is a key sign of a powerful working memory. You\'re in the top tier! 🚀'
        };
    }
    if (forwardSpan === 5) {
        return {
            label: '⚡ Result: Strong Memory',
            message: 'You have a strong and healthy memory capacity. Your ability to hold and process information is highly effective and falls into the upper end of the typical range for adults. Great job! 🎯'
        };
    }
    if (forwardSpan === 4) {
        return {
            label: '✅ Result: Average Memory',
            message: 'This is a solid result. Your memory span is within the normal range for most adults, indicating typical and healthy short-term memory function. Nice work! 👍'
        };
    }
    if (forwardSpan <= 3) {
        return {
            label: '🤔 Result: Below Average Memory',
            message: 'Your score was a bit below the typical range. Many factors like fatigue, stress, or lack of focus can significantly impact memory performance. Try again when you\'re feeling fresh! This is a single snapshot, not a diagnosis. 😊'
        };
    }
    return { label: '📊 Result', message: '' };
}

async function connectSerial() {
    if (!('serial' in navigator)) {
        alert('⚠️ Web Serial not supported in this browser. Please use Chrome or Edge on desktop.');
        return;
    }
    try {
        serialPort = await navigator.serial.requestPort();
        await serialPort.open({ baudRate: 9600 });
        const decoder = new TextDecoderStream();
        serialPort.readable.pipeTo(decoder.writable);
        serialReader = decoder.readable.getReader();
        serialBtn.innerHTML = '<span>✅</span><span>Arduino Connected</span>';
        serialBtn.disabled = true;
        listenSerial();
        // Start test after Arduino connection
        runTest();
    } catch (e) {
        console.error('Serial connection failed', e);
        alert('❌ Failed to connect to Arduino serial. Please try again.');
    }
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

function handleKey(key) {
    // Accept single digits 0-9; '#' to submit
    const s = String(key).trim();
    if (!collectingInput) return;
    if (s === '#') {
        finalizeInput();
        return;
    }
    if (/^[0-9]$/.test(s)) {
        typingBuffer += s;
        typedEl.textContent = typingBuffer || '_';
    }
}

function onKeydown(e) {
    if (!collectingInput) return;
    if (e.key === '#') { finalizeInput(); return; }
    if (/^[0-9]$/.test(e.key)) {
        typingBuffer += e.key;
        typedEl.textContent = typingBuffer || '_';
    }
}

async function showSequence(seq, perItemMs = 1000) {
    // Show numbers one by one
    displayEl.classList.remove('hidden');
    inputEl.classList.add('hidden');
    typedEl.textContent = '_';
    for (let i = 0; i < seq.length; i++) {
        sequenceEl.textContent = String(seq[i]);
        await sleep(perItemMs);
        sequenceEl.textContent = '•';
        await sleep(250);
    }
}

function beginInput(prompt = 'Enter the sequence then press #') {
    displayEl.classList.add('hidden');
    inputEl.classList.remove('hidden');
    typingBuffer = '';
    typedEl.textContent = '_';
    collectingInput = true;
}

function finalizeInput() {
    collectingInput = false;
    // Compare typedBuffer to expectedSequence (as digits);
    const typedArr = typingBuffer.split('').map(d => parseInt(d, 10));
    const correct = arraysEqual(typedArr, expectedSequence);
    resolveAttempt?.(correct);
}

function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
}

let resolveAttempt = null;
function awaitAttempt() {
    return new Promise(res => { resolveAttempt = res; });
}

function generateSequence(length) {
    const seq = [];
    for (let i = 0; i < length; i++) seq.push(randomDigit());
    return seq;
}

async function runSpan(partName, startLen) {
    let length = startLen;
    let bestCompleted = 0;
    // Changed: run exactly TOTAL_ROUNDS rounds (unless stopped early by two failures at same length)
    const TOTAL_ROUNDS = 5; // run five rounds in total
    let roundsDone = 0;
    
    phaseMsgEl.classList.remove('hidden');
    phaseTextEl.textContent = partName;
    await sleep(1200);
    phaseMsgEl.classList.add('hidden');

    while (roundsDone < TOTAL_ROUNDS) {
        let attemptsLeft = 2;
        let succeededAtThisLength = false;

        while (attemptsLeft > 0) {
            const seq = generateSequence(length);
            expectedSequence = [...seq]; // Forward only
            await showSequence(seq, 900);
            beginInput();
            window.addEventListener('keydown', onKeydown);
            const correct = await awaitAttempt();
            window.removeEventListener('keydown', onKeydown);

            if (correct) {
                bestCompleted = Math.max(bestCompleted, length);
                succeededAtThisLength = true;
                // Increase length for next round
                length += 1;
                break; // move to next length (counts as one round below)
            } else {
                attemptsLeft -= 1;
                // New number sequence at same length if attempts remain
            }
        }

        // Count this level as one round attempted
        roundsDone += 1;

        if (!succeededAtThisLength) {
            // Failed both attempts at this length -> stop early
            break;
        }
    }

    return bestCompleted;
}

async function runTest() {
    // Intro -> phase message
    introEl.classList.add('hidden');

    // Forward only (3 levels max)
    const forward = await runSpan('Forward Recall 🧠', 3);

    // Results
    phaseMsgEl.classList.add('hidden');
    displayEl.classList.add('hidden');
    inputEl.classList.add('hidden');
    resultsEl.classList.remove('hidden');

    if (forwardScoreEl) forwardScoreEl.textContent = String(forward);

    const verdict = classify(forward);
    if (conditionEl) {
        conditionEl.innerHTML = `<div class="verdict-label">${verdict.label}</div><p class="verdict-message">${verdict.message}</p>`;
    }
}

startBtn?.addEventListener('click', runTest);
serialBtn?.addEventListener('click', connectSerial);

// Focus & Control Challenge (Go/No-Go)
// 40 trials total: 30 Go (1,2,4,5,6,7,8,9) and 10 No-Go (3), randomized.
// Each trial: show number ~1s, window for response 1.5s. Count commission (press on 3) and omission (no press on Go).

const introEl = document.getElementById('intro');
const getReadyEl = document.getElementById('getReady');
const testEl = document.getElementById('test');
const stimulusEl = document.getElementById('stimulus');
const trialEl = document.getElementById('trial');
const resultsEl = document.getElementById('results');
const commissionEl = document.getElementById('commission');
const omissionEl = document.getElementById('omission');
const conditionEl = document.getElementById('condition');

const startBtn = document.getElementById('startBtn');
const serialBtn = document.getElementById('serialBtn');

const GO_SET = [1, 2, 4, 5, 6, 7, 8, 9];
const NOGO = 3;
const TOTAL_TRIALS = 40;
const GO_TRIALS = 30;
const NOGO_TRIALS = 10;
const STIMULUS_MS = 1000; // show number for 1s
const RESPONSE_WINDOW_MS = 1500; // allow response for 1.5s

let serialReader = null;
let serialPort = null;
let currentStimulus = null;
let respondedThisTrial = false;
let commissionErrors = 0; // pressed on 3
let omissionErrors = 0; // failed to press on Go

function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function buildSequence() {
    const go = [];
    for (let i = 0; i < GO_TRIALS; i++) {
        go.push(GO_SET[Math.floor(Math.random() * GO_SET.length)]);
    }
    const nogo = Array(NOGO_TRIALS).fill(NOGO);
    return shuffle(go.concat(nogo));
}

function classify(commission, omission) {
    if (commission === 0 && omission <= 1) {
        return {
            label: 'Result: Excellent Focus & Control',
            message: "Outstanding! You demonstrated exceptional focus and self-control. Your ability to inhibit automatic responses is highly developed."
        };
    }
    if (commission === 1 && omission <= 2) {
        return {
            label: 'Result: Good Focus & Control',
            message: "Great performance! You have strong inhibitory control and a reliable ability to maintain focus, with only minor lapses. This is a sign of healthy executive function."
        };
    }
    if (commission === 2 && omission <= 3) {
        return {
            label: 'Result: Average Focus & Control',
            message: "This is a solid result. Your ability to manage impulses and maintain attention falls within the typical range."
        };
    }
    if (commission >= 3 || omission >= 4) {
        return {
            label: 'Result: Below Average Focus & Control',
            message: "Your score shows some difficulty with either response control (pressing when you shouldn't) or sustained attention (not pressing when you should). Inhibitory control is like the brain's braking system. Factors like fatigue, stress, or a wandering mind can greatly affect this skill. This is a single snapshot, not a diagnosis."
        };
    }
    return { label: 'Result', message: '' };
}

async function connectSerial() {
    if (!('serial' in navigator)) {
        alert('Web Serial not supported in this browser. Use Chrome/Edge on desktop.');
        return;
    }
    try {
        serialPort = await navigator.serial.requestPort();
        await serialPort.open({ baudRate: 9600 });
        const decoder = new TextDecoderStream();
        serialPort.readable.pipeTo(decoder.writable);
        serialReader = decoder.readable.getReader();
        serialBtn.textContent = 'Arduino Connected';
        serialBtn.disabled = true;
        listenSerial();
    } catch (e) {
        console.error('Serial connection failed', e);
        alert('Failed to connect to Arduino serial.');
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
                            handleInput(keyValue);
                        }
                    } else {
                        // Fallback for direct input (backwards compatibility)
                        handleInput(line);
                    }
                }
            }
        }
    }
}

function handleInput(key) {
    // Accept 1-9 only
    const char = String(key).trim();
    if (!/^[1-9]$/.test(char)) return;
    if (respondedThisTrial) return; // first response only
    respondedThisTrial = true;
    const pressed = parseInt(char, 10);
    if (currentStimulus === NOGO) {
        // Should NOT respond
        commissionErrors += 1;
    } else {
        // Should respond: count as correct only if any key is pressed (we don't require exact match for simplicity). If you want exact, uncomment:
        // if (pressed !== currentStimulus) { /* could track mismatch as a separate metric */ }
    }
}

function onKeydown(e) {
    handleInput(e.key);
}

async function runTest() {
    introEl.classList.add('hidden');
    getReadyEl.classList.remove('hidden');
    await sleep(1500);
    getReadyEl.classList.add('hidden');
    testEl.classList.remove('hidden');

    // Build randomized sequence: 30 Go, 10 No-Go
    const trials = buildSequence();
    commissionErrors = 0;
    omissionErrors = 0;

    window.addEventListener('keydown', onKeydown);

    for (let i = 0; i < TOTAL_TRIALS; i++) {
        trialEl.textContent = String(i + 1);
        currentStimulus = trials[i];
        respondedThisTrial = false;

        // Show stimulus
        stimulusEl.textContent = String(currentStimulus);
        await sleep(STIMULUS_MS);

        // Hide stimulus but keep response window open until total 1.5s from onset
        stimulusEl.textContent = '•';
        const remaining = Math.max(0, RESPONSE_WINDOW_MS - STIMULUS_MS);
        await sleep(remaining);

        // Evaluate omission for Go trials if no key was pressed
        if (currentStimulus !== NOGO && !respondedThisTrial) {
            omissionErrors += 1;
        }
    }

    window.removeEventListener('keydown', onKeydown);
    showResults();
}

function showResults() {
    testEl.classList.add('hidden');
    resultsEl.classList.remove('hidden');

    commissionEl.textContent = String(commissionErrors);
    omissionEl.textContent = String(omissionErrors);

    const verdict = classify(commissionErrors, omissionErrors);
    conditionEl.innerHTML = `<div class="label">${verdict.label}</div><p>${verdict.message}</p>`;
}

startBtn?.addEventListener('click', runTest);
serialBtn?.addEventListener('click', connectSerial);

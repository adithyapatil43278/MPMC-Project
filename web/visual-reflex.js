// Visual Reflex Test logic with optional Web Serial (Arduino keypad)
// Contract:
// - Configurable rounds, each: random delay (1-3s) -> show digit (1-9) -> wait for input (keyboard or serial)
// - Record reaction time for first input after stimulus appears and whether it matches
// - Compute average over correct responses and accuracy percentage

let ROUNDS = 20; // Will be set from input
const MIN_DELAY_MS = 1000;
const MAX_DELAY_MS = 3000;

const introEl = document.getElementById('intro');
const getReadyEl = document.getElementById('getReady');
const testEl = document.getElementById('test');
const stimulusEl = document.getElementById('stimulus');
const roundEl = document.getElementById('round');
const totalRoundsEl = document.getElementById('totalRounds');
const resultsEl = document.getElementById('results');
const avgTimeEl = document.getElementById('avgTime');
const accuracyEl = document.getElementById('accuracy');
const correctCountEl = document.getElementById('correctCount');
const totalRoundsResultEl = document.getElementById('totalRoundsResult');
const conditionEl = document.getElementById('condition');
const roundsInput = document.getElementById('roundsInput');

const startBtn = document.getElementById('startBtn');
const serialBtn = document.getElementById('serialBtn');
const updateRoundsBtn = document.getElementById('updateRoundsBtn');

let rounds = [];
let currentRound = 0;
let expectedDigit = null;
let stimulusShownAt = 0;
let awaitingResponse = false;
let serialReader = null;
let serialPort = null;

// NEW: estimated non-human/device delay in ms (rendering, JS scheduling, optional serial RTT)
let deviceDelayMs = 0;

// Helper used during serial calibration: resolver receives { line, receivedAt }
let serialCalibrationResolver = null;

function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function classify(avgMs, accuracyPct) {
    if (accuracyPct < 90) {
        return {
            label: '🤔 Result: Inconclusive',
            message: `Your accuracy was below 90%. This can happen if you're distracted or rushing. The reaction time score isn't reliable without high accuracy.\n\nSuggestion: Please try the test again, focusing carefully on pressing the correct key. You've got this! 💪`,
        };
    }
    if (avgMs < 300 && accuracyPct >= 95) {
        return {
            label: '🌟 Result: Exceptional Reflexes',
            message: 'Your performance is outstanding! Your visual reflexes are extremely fast and precise, indicating a superior ability to process and react to information. You\'re in the top tier! 🚀',
        };
    }
    if (avgMs >= 300 && avgMs < 450 && accuracyPct >= 95) {
        return {
            label: '⚡ Result: Fast Reflexes',
            message: 'Great job! You have fast and reliable reflexes. This demonstrates a strong and efficient connection between your visual system and motor response. Keep it up! 🎯',
        };
    }
    if (avgMs >= 450 && avgMs <= 600 && accuracyPct >= 90) {
        return {
            label: '✅ Result: Average Reflexes',
            message: 'This is a solid performance. Your reaction time falls within the typical range for most people, indicating a normal and healthy cognitive-motor response. Nice work! 👍',
        };
    }
    if (avgMs > 600 && accuracyPct >= 90) {
        return {
            label: '🐢 Result: Slower Than Average',
            message: 'Your response time was a bit slower than the typical average. Many factors like fatigue, distraction, or just having a relaxed day can influence this score. Try again when you\'re feeling fresh! 😊',
        };
    }
    // Fallback
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
        const inputDone = serialPort.readable.pipeTo(decoder.writable);
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
                if (!line) continue;

                // If a calibration waiter is present, let it consume the next serial line.
                if (serialCalibrationResolver) {
                    try {
                        serialCalibrationResolver({ line, receivedAt: performance.now() });
                    } catch (e) { /* ignore */ }
                    serialCalibrationResolver = null;
                    continue;
                }

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

function handleInput(key) {
    // Accept keyboard digits 1-9 or serial lines containing a single digit 1-9
    if (!awaitingResponse) return;
    const char = String(key).trim();
    const isDigit = /^[1-9]$/.test(char);
    if (!isDigit) return;

    const pressed = parseInt(char, 10);

    // Compute raw reaction time
    const rawRt = performance.now() - stimulusShownAt;

    // Subtract device delay (non-human). Ensure we don't store negative times.
    const correctedRt = Math.max(0, rawRt - (deviceDelayMs || 0));

    const correct = pressed === expectedDigit;
    rounds.push({ expected: expectedDigit, pressed, rt: correctedRt, rawRt, correct });
    awaitingResponse = false;
    stimulusEl.textContent = '•';
}

function onKeydown(e) {
    handleInput(e.key);
}

// runTest optionally accepts a roundsOverride number. If provided, it will be used
// otherwise the value is read from the `roundsInput` element.
async function runTest(roundsOverride) {
    // Determine rounds value (priority: explicit override -> input field -> default ROUNDS)
    let inputRounds;
    if (typeof roundsOverride === 'number' && Number.isInteger(roundsOverride)) {
        inputRounds = roundsOverride;
    } else if (roundsInput) {
        inputRounds = parseInt(roundsInput.value, 10);
    }

    if (isNaN(inputRounds) || inputRounds < 5 || inputRounds > 50) {
        alert('⚠️ Please enter a valid number of rounds between 5 and 50.');
        return;
    }

    // Run a quick calibration of device-side delays before starting rounds.
    try {
        await calibrateDeviceDelay();
        console.log('Device delay calibrated (ms):', deviceDelayMs);
    } catch (e) {
        console.warn('Device calibration failed or timed out, proceeding with deviceDelayMs=', deviceDelayMs, e);
    }

    ROUNDS = inputRounds;
    if (totalRoundsEl) totalRoundsEl.textContent = String(ROUNDS);

    introEl.classList.add('hidden');
    getReadyEl.classList.remove('hidden');
    await sleep(3000);
    getReadyEl.classList.add('hidden');
    testEl.classList.remove('hidden');

    rounds = [];
    currentRound = 0;
    window.addEventListener('keydown', onKeydown);

    while (currentRound < ROUNDS) {
        if (roundEl) roundEl.textContent = String(currentRound + 1);
        const delay = randInt(MIN_DELAY_MS, MAX_DELAY_MS);
        awaitingResponse = false;
        if (stimulusEl) stimulusEl.textContent = '•';
        await sleep(delay);

        expectedDigit = randInt(1, 9);
        if (stimulusEl) stimulusEl.textContent = String(expectedDigit);
        stimulusShownAt = performance.now();
        awaitingResponse = true;

        // Wait until a response is captured
        while (awaitingResponse) {
            await sleep(5);
        }

        currentRound++;
    }

    window.removeEventListener('keydown', onKeydown);
    showResults();
}

function showResults() {
    testEl.classList.add('hidden');
    resultsEl.classList.remove('hidden');

    const correct = rounds.filter(r => r.correct);
    const correctCount = correct.length;
    const accuracy = rounds.length ? Math.round((correctCount / rounds.length) * 100) : 0;
    const avg = correct.length ? Math.round(correct.reduce((s, r) => s + r.rt, 0) / correct.length) : 0;

    avgTimeEl.textContent = String(avg);
    accuracyEl.textContent = String(accuracy);
    correctCountEl.textContent = String(correctCount);
    totalRoundsResultEl.textContent = String(ROUNDS);

    const verdict = classify(avg, accuracy);
    conditionEl.innerHTML = `<div class="verdict-label">${verdict.label}</div><p class="verdict-message">${verdict.message}</p>`;
}

// Helper wrapper so we always read the rounds input when starting via keyboard
function startWithKeyboard(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    runTest();
}

startBtn?.addEventListener('click', startWithKeyboard);
serialBtn?.addEventListener('click', connectSerial);

// Initialize displayed totals on load
if (totalRoundsEl) totalRoundsEl.textContent = String(ROUNDS);
if (totalRoundsResultEl) totalRoundsResultEl.textContent = String(ROUNDS);

// Update rounds immediately when user clicks the Update button
function updateRoundsFromInput() {
    console.log('Update button clicked');
    if (!roundsInput) {
        console.error('roundsInput element not found');
        return;
    }
    const v = parseInt(roundsInput.value, 10);
    console.log('Input value:', roundsInput.value, 'Parsed:', v);
    
    if (isNaN(v) || v < 5 || v > 50) {
        alert('⚠️ Please enter a valid number of rounds between 5 and 50.');
        return;
    }
    
    ROUNDS = v;
    console.log('ROUNDS updated to:', ROUNDS);
    
    if (totalRoundsEl) {
        totalRoundsEl.textContent = String(ROUNDS);
        console.log('Updated totalRoundsEl to:', ROUNDS);
    }
    if (totalRoundsResultEl) {
        totalRoundsResultEl.textContent = String(ROUNDS);
        console.log('Updated totalRoundsResultEl to:', ROUNDS);
    }
    
    // Visual feedback
    updateRoundsBtn.textContent = '✅ Updated!';
    setTimeout(() => {
        updateRoundsBtn.textContent = 'Update';
    }, 1500);
}

if (updateRoundsBtn) {
    updateRoundsBtn.addEventListener('click', updateRoundsFromInput);
    console.log('Update button listener attached');
} else {
    console.error('updateRoundsBtn element not found');
}

// NEW: Calibrate non-human/device delays (render, event-loop scheduling, optional serial RTT)
async function calibrateDeviceDelay() {
    const samples = 6;

    // Measure render latency: set stimulus text then measure time to next rAF
    async function measureRenderLatency() {
        const vals = [];
        for (let i = 0; i < samples; i++) {
            const t0 = performance.now();
            if (stimulusEl) stimulusEl.textContent = 'X';
            // wait for paint
            await new Promise(resolve => requestAnimationFrame(() => resolve()));
            const t1 = performance.now();
            vals.push(t1 - t0);
            // small pause
            await sleep(20);
        }
        return Math.min(...vals); // take minimal observed render latency
    }

    // Measure event loop / scheduling latency using MessageChannel and setTimeout
    async function measureSchedulingLatency() {
        const vals = [];
        for (let i = 0; i < samples; i++) {
            const t0 = performance.now();
            // use MessageChannel (microtask-ish) and setTimeout(0) (macrotask) to sample typical scheduling
            await new Promise(resolve => {
                const ch = new MessageChannel();
                ch.port1.onmessage = () => {
                    const t1 = performance.now();
                    vals.push(t1 - t0);
                    resolve();
                };
                ch.port2.postMessage(null);
            });
            await sleep(5);
        }
        return Math.min(...vals);
    }

    // Optional: if serial is connected, attempt a simple ping roundtrip to estimate serial transport latency.
    async function measureSerialRoundtrip() {
        if (!serialPort || !serialReader || !serialPort.writable) return null;
        try {
            const writer = serialPort.writable.getWriter();
            const encoder = new TextEncoder();
            const pingId = Math.floor(Math.random() * 1e6);
            const payload = `PING:${pingId}\n`;
            const sentAt = performance.now();
            // set up resolver to capture next line from listenSerial
            const p = new Promise((resolve, reject) => {
                let done = false;
                const timeout = setTimeout(() => {
                    if (done) return;
                    done = true;
                    serialCalibrationResolver = null;
                    resolve(null);
                }, 300); // 300ms timeout for serial echo

                serialCalibrationResolver = ({ line, receivedAt }) => {
                    if (done) return;
                    done = true;
                    clearTimeout(timeout);
                    resolve({ line, receivedAt });
                };
            });

            await writer.write(encoder.encode(payload));
            // wait for response or timeout
            const resp = await p;
            try { writer.releaseLock(); } catch (e) { /* ignore */ }

            if (!resp || !resp.line) return null;
            // Attempt to detect ping echo or any quick reply. If it contains pingId, we can be precise.
            const { line, receivedAt } = resp;
            if (line.includes(String(pingId))) {
                return Math.max(0, receivedAt - sentAt);
            }
            // If Arduino simply echoes something else, still give a rough RTT
            return Math.max(0, receivedAt - sentAt);
        } catch (e) {
            console.warn('Serial roundtrip calibration failed:', e);
            return null;
        }
    }

    // Perform measurements
    const renderLatency = await measureRenderLatency().catch(() => 0);
    const schedulingLatency = await measureSchedulingLatency().catch(() => 0);
    const serialRtt = await measureSerialRoundtrip().catch(() => null);

    // Combine measurements. Prefer conservative (min) render/scheduling and half of serial RTT (one-way)
    const renderMs = renderLatency || 0;
    const schedMs = schedulingLatency || 0;
    const serialMs = serialRtt ? Math.max(0, serialRtt / 2) : 0;

    // Compose final device delay: render + scheduling + serialOneWay, but be cautious (take max of min-measures)
    // Using min values reduces accidental inclusion of slow outliers, but we still combine to represent pipeline.
    deviceDelayMs = Math.round(renderMs + schedMs + serialMs);

    // Ensure deviceDelayMs is non-negative and reasonable
    if (!Number.isFinite(deviceDelayMs) || deviceDelayMs < 0) deviceDelayMs = 0;
}

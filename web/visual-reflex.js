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
                if (line) handleInput(line);
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
    const rt = performance.now() - stimulusShownAt;
    const correct = pressed === expectedDigit;
    rounds.push({ expected: expectedDigit, pressed, rt, correct });
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

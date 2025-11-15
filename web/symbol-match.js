// Symbol Match Challenge (SDMT-lite)
// Key mapping symbols to digits; customizable timer; score on correct; flash red X on incorrect.

const SYMBOLS = [
    { sym: '▲', num: 1 },
    { sym: '●', num: 2 },
    { sym: '■', num: 3 },
    { sym: '★', num: 4 },
    { sym: '♦', num: 5 },
    { sym: '+', num: 6 },
    { sym: '♥', num: 7 },
    { sym: '~', num: 8 },
    { sym: '○', num: 9 },
];

const introEl = document.getElementById('intro');
const keyEl = document.getElementById('key');
const testEl = document.getElementById('test');
const liveKeyEl = document.getElementById('liveKey');
const symbolEl = document.getElementById('symbol');
const feedbackEl = document.getElementById('feedback');
const scoreEl = document.getElementById('score');
const resultsEl = document.getElementById('results');
const finalScoreEl = document.getElementById('finalScore');
const conditionEl = document.getElementById('condition');
const timeLeftEl = document.getElementById('timeLeft');
const durationInput = document.getElementById('durationInput');

const startBtn = document.getElementById('startBtn');
const serialBtn = document.getElementById('serialBtn');
const updateBtn = document.getElementById('updateDurationBtn');

let serialReader = null;
let serialPort = null;
let score = 0;
let currentItem = null; // {sym, num}
let endAt = 0;
let tickTimer = null;
let running = false;

function renderKey(container) {
    container.innerHTML = '';
    for (const { sym, num } of SYMBOLS) {
        const div = document.createElement('div');
        div.className = 'key-item';
        div.innerHTML = `<div class="key-pair"><span class="sym">${sym}</span><span class="num">${num}</span></div>`;
        container.appendChild(div);
    }
}

function nextSymbol() {
    currentItem = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    symbolEl.textContent = currentItem.sym;
    feedbackEl.textContent = '';
}

function classify(score) {
    if (score >= 60) {
        return { label: 'Result: Exceptional Processing Speed', message: 'Outstanding! Your ability to quickly process visual information and apply rules is exceptionally fast, placing you in a superior performance tier.' };
    }
    if (score >= 45 && score <= 59) {
        return { label: 'Result: Fast Processing Speed', message: 'Great job. You have a fast and efficient processing speed, allowing you to learn and react to new information quickly and accurately.' };
    }
    if (score >= 30 && score <= 44) {
        return { label: 'Result: Average Processing Speed', message: 'This is a solid performance. Your processing speed is within the typical range for most adults, indicating healthy and normal cognitive function.' };
    }
    return { label: 'Result: Below Average Processing Speed', message: 'Your score was a bit below the typical average. This test measures processing speed, a foundational skill. Performance can be influenced by factors such as fatigue or distraction.' };
}

function handleInput(key) {
    if (!running || !currentItem) return;
    const char = String(key).trim();
    if (!/^[1-9]$/.test(char)) return;
    const pressed = parseInt(char, 10);
    if (pressed === currentItem.num) {
        score += 1;
        scoreEl.textContent = String(score);
        nextSymbol();
    } else {
        // flash red X briefly
        feedbackEl.textContent = '✗';
        feedbackEl.style.color = '#e74c3c';
        setTimeout(() => { feedbackEl.textContent = ''; }, 250);
        nextSymbol();
    }
}

function onKeydown(e) { handleInput(e.key); }

function endTest() {
    running = false;
    window.removeEventListener('keydown', onKeydown);
    resultsEl.classList.remove('hidden');
    testEl.classList.add('hidden');
    finalScoreEl.textContent = String(score);
    const verdict = classify(score);
    conditionEl.innerHTML = `<div class="label">${verdict.label}</div><p>${verdict.message}</p>`;
}

function tick() {
    const remaining = Math.max(0, Math.ceil((endAt - performance.now()) / 1000));
    timeLeftEl.textContent = String(remaining);
    if (remaining <= 0) {
        clearInterval(tickTimer);
        endTest();
    }
}

async function runTest() {
    introEl.classList.add('hidden');
    testEl.classList.remove('hidden');

    // Render key in test view too
    renderKey(liveKeyEl);

    score = 0;
    scoreEl.textContent = '0';
    running = true;

    const duration = parseInt(durationInput.value, 10) || 90; // Default to 90 seconds if input is invalid
    endAt = performance.now() + duration * 1000;
    nextSymbol();

    window.addEventListener('keydown', onKeydown);
    tickTimer = setInterval(tick, 250);
}

async function connectSerial() {
    if (!('serial' in navigator)) { alert('Web Serial not supported in this browser. Use Chrome/Edge on desktop.'); return; }
    try {
        serialPort = await navigator.serial.requestPort();
        await serialPort.open({ baudRate: 9600 });
        const decoder = new TextDecoderStream();
        serialPort.readable.pipeTo(decoder.writable);
        serialReader = decoder.readable.getReader();
        // Update UI to reflect connection and start the test with Arduino as primary
        serialBtn.textContent = '✅ Arduino Connected';
        serialBtn.disabled = true;
        serialBtn.classList.remove('btn-secondary');
        serialBtn.classList.add('btn-primary');
        listenSerial();
        // Start the test automatically when Arduino connects
        runTest();
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

// Initialize key on intro
renderKey(keyEl);

// Visual confirmation for update button
if (updateBtn) {
    const updateMsg = document.createElement('span');
    updateMsg.id = 'updateMsg';
    updateMsg.style.marginLeft = '8px';
    updateMsg.style.color = 'var(--ok)';
    updateBtn.addEventListener('click', () => {
        const dur = parseInt(durationInput.value, 10) || 90;
        updateMsg.textContent = `Duration set: ${dur}s ✓`;
        // Insert message after the button (if not already present)
        if (updateBtn.parentNode && updateBtn.nextSibling !== updateMsg) {
            updateBtn.parentNode.insertBefore(updateMsg, updateBtn.nextSibling);
        }
        setTimeout(() => { try { updateMsg.remove(); } catch (e) {} }, 1400);
    });
}

startBtn?.addEventListener('click', runTest);
serialBtn?.addEventListener('click', connectSerial);

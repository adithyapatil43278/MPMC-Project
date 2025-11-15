// obstacleDodger.js
// Simple obstacle dodger game with keyboard or Arduino HC-SR04 distance sensor input.

class ObstacleDodgerGame {
  constructor() {
    // DOM
    this.introEl = document.getElementById('intro');
    this.gameEl = document.getElementById('game');
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.scoreEl = document.getElementById('score');
    this.modeStatus = document.getElementById('modeStatus');
    this.gameMsg = document.getElementById('gameMsg');

  // controls
  this.modeSelect = document.getElementById('inputModeSelect');
  this.sensitivitySelect = document.getElementById('sensitivitySelect');
  this.startBtn = document.getElementById('startBtn');
  this.connectSerialBtn = document.getElementById('connectSerialBtn');
  this.restartBtn = document.getElementById('restartBtn');
  this.gameOverOverlay = document.getElementById('gameOverOverlay');
  this.finalScoreValue = document.getElementById('finalScoreValue');
  this.backToMainBtn = document.getElementById('backToMainBtn');
  this.playAgainBtn = document.getElementById('playAgainBtn');

    // High score elements
    this.highScoreDisplay = document.getElementById('highScoreValue');
    this.highScoreHolderDisplay = document.getElementById('highScoreHolder');
    this.newHighScoreMsg = document.getElementById('newHighScoreMsg');
    this.nameInputSection = document.getElementById('nameInputSection');
    this.playerNameInput = document.getElementById('playerNameInput');
    this.saveNameBtn = document.getElementById('saveNameBtn');

    // game state
    this.player = { x: this.canvas.width / 2 - 20, y: this.canvas.height - 36, w: 40, h: 16, speed: 4 };
    this.obstacles = [];
    this.spawnTimer = 0;
    this.score = 0;
    this.running = false;
    this.rafId = null;

    // control mode: 'keyboard' | 'arduino'
    this.controlMode = null;

    // serial
    this.serialPort = null;
    this.serialReader = null;
    this.serialConnected = false;
    this.lastDist = null;
    this.distTimeout = null;

    // bindings
    this._onKey = this._onKey.bind(this);
    this._loop = this._loop.bind(this);

    // Load high score from localStorage
    this._loadHighScore();

    this._attachUI();

    // gameplay tuning
    this.sensitivity = 2; // 1..5, default 2 (matches previous feel)
    // spawn tuning: start with a relatively high interval (frames) and decrease as score/time increases
    this.spawnIntervalStart = 80; // frames between spawns at start (higher => fewer blocks)
    this.spawnIntervalMin = 20; // minimum frames between spawns
    this.elapsedSeconds = 0;
    this._lastTs = null;
    // obstacle speed tuning: all obstacles share this speed which increases over time
    this.baseObstacleSpeed = 1.0; // starting fall speed (pixels per frame)
    this.speedIncreasePerSecond = 0.03; // increase in pixels/frame per second
    this.currentObstacleSpeed = this.baseObstacleSpeed;
    // visual/theme: starfield + explosion
    this.stars = [];
    this.numStars = 120;
    this.explosion = null; // {x,y,r,alpha}
    this._gameOverTriggered = false;
  }

  _attachUI() {
    // dropdown change chooses the control mode
    this.modeSelect?.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'keyboard' || val === 'arduino') {
        this.selectMode(val);
      } else {
        this.modeStatus.textContent = 'Mode: Not selected';
        this.controlMode = null;
      }
    });

    // sensitivity selector
    this.sensitivitySelect?.addEventListener('change', (e) => {
      const v = parseInt(e.target.value, 10);
      if (!Number.isNaN(v) && v >= 1 && v <= 5) {
        this.sensitivity = v;
        // feedback
        this.modeStatus.textContent = `Mode: ${this.controlMode ? (this.controlMode === 'arduino' ? 'Arduino' : 'Keyboard') : 'Not selected'} — Sensitivity ${this.sensitivity}`;
      }
    });

    // start/restart/connect (optional elements)
    this.startBtn?.addEventListener('click', () => this.start());
    this.restartBtn?.addEventListener('click', () => this.restart());
    this.connectSerialBtn?.addEventListener('click', () => this.connectSerial());

    // game over controls
    // Back from overlay: return to obstacle-dodger intro (hide game and overlay)
    this.backToMainBtn?.addEventListener('click', () => {
      if (this.gameOverOverlay) this.gameOverOverlay.classList.add('hidden');
      if (this.gameEl) this.gameEl.classList.add('hidden');
      if (this.introEl) this.introEl.classList.remove('hidden');
    });
    this.playAgainBtn?.addEventListener('click', () => {
      if (this.gameOverOverlay) this.gameOverOverlay.classList.add('hidden');
      this.restart();
    });

    // Save name button for high score
    this.saveNameBtn?.addEventListener('click', () => {
      const name = this.playerNameInput?.value.trim();
      if (name) {
        this._saveHighScore(this.score, name);
        if (this.nameInputSection) this.nameInputSection.classList.add('hidden');
        if (this.newHighScoreMsg) this.newHighScoreMsg.classList.add('hidden');
      }
    });

    // Allow Enter key to save name
    this.playerNameInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.saveNameBtn?.click();
      }
    });
  }

  _loadHighScore() {
    try {
      const saved = localStorage.getItem('obstacleDodger_highScore');
      if (saved) {
        const data = JSON.parse(saved);
        this.highScore = data.score || 0;
        this.highScoreHolder = data.name || 'Unknown';
      } else {
        this.highScore = 0;
        this.highScoreHolder = 'No one yet';
      }
    } catch (e) {
      console.warn('Failed to load high score', e);
      this.highScore = 0;
      this.highScoreHolder = 'No one yet';
    }
    this._updateHighScoreDisplay();
  }

  _saveHighScore(score, name) {
    try {
      const data = { score, name, date: new Date().toISOString() };
      localStorage.setItem('obstacleDodger_highScore', JSON.stringify(data));
      this.highScore = score;
      this.highScoreHolder = name;
      this._updateHighScoreDisplay();
    } catch (e) {
      console.error('Failed to save high score', e);
    }
  }

  _updateHighScoreDisplay() {
    if (this.highScoreDisplay) {
      this.highScoreDisplay.textContent = String(this.highScore);
    }
    if (this.highScoreHolderDisplay) {
      this.highScoreHolderDisplay.textContent = this.highScoreHolder;
    }
  }

  _checkHighScore() {
    if (this.score > this.highScore) {
      // New high score!
      if (this.newHighScoreMsg) this.newHighScoreMsg.classList.remove('hidden');
      if (this.nameInputSection) {
        this.nameInputSection.classList.remove('hidden');
        // Focus the input
        setTimeout(() => this.playerNameInput?.focus(), 100);
      }
      return true;
    }
    return false;
  }

  selectMode(mode) {
    this.controlMode = mode;
    this.modeStatus.textContent = `Mode: ${mode === 'arduino' ? 'Arduino (Distance)' : 'Keyboard (Arrow Keys)'} — Sensitivity ${this.sensitivity}`;
    // if choosing keyboard, ensure serial isn't required
    if (mode === 'keyboard') {
      this.serialConnected = false; // Ensure no serial connection is active
    } else if (mode === 'arduino') {
      // Auto-prompt serial connection when Arduino mode is selected
      if (!this.serialConnected && 'serial' in navigator) {
        this.connectSerial().catch(() => {
          // User cancelled or connection failed
          this.modeStatus.textContent = 'Serial connection cancelled or failed';
        });
      }
    }
  }

  async connectSerial() {
    if (!('serial' in navigator)) {
      this.modeStatus.textContent = 'Web Serial not supported in this browser.';
      return;
    }
    try {
      this.serialPort = await navigator.serial.requestPort();
      await this.serialPort.open({ baudRate: 9600 });
      const decoder = new TextDecoderStream();
      this.serialPort.readable.pipeTo(decoder.writable);
      this.serialReader = decoder.readable.getReader();
      this.serialConnected = true;
      this.modeStatus.textContent = 'Arduino connected';
      this._startSerialListen();
    } catch (e) {
      console.error('Failed to open serial', e);
      this.modeStatus.textContent = 'Serial connection failed';
    }
  }

  async _startSerialListen() {
    let buffer = '';
    try {
      while (this.serialReader) {
        const { value, done } = await this.serialReader.read();
        if (done) break;
        if (value) {
          buffer += value;
          let idx;
          while ((idx = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 1);
            if (!line) continue;
            // Expect messages like "Distance: 20" or "Keypad: 3"
            if (line.startsWith('Distance:')) {
              const raw = line.split(':')[1];
              const val = parseFloat(raw);
              if (!Number.isNaN(val)) {
                this.lastDist = val;
                this._onDistance(val);
                // reset fallback timeout
                if (this.distTimeout) clearTimeout(this.distTimeout);
                this.distTimeout = setTimeout(() => {
                  // no distance seen recently -> switch to keyboard
                  if (this.controlMode === 'arduino') {
                    this.modeStatus.textContent = 'No Distance data – switching to Keyboard mode';
                    this.controlMode = 'keyboard';
                  }
                }, 3000);
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('Serial listener ended', err);
    }
  }

  _onDistance(dist) {
    // Map distance to movement direction; larger distance -> left, smaller -> right.
    // We will use this in the game loop via this.lastDist.
    // Keep minimal processing here.
  }

  start() {
    if (!this.controlMode) {
      this.modeStatus.textContent = 'Please select a control mode first!';
      return;
    }
    this.introEl.classList.add('hidden'); // Hide the intro screen
    this.gameEl.classList.remove('hidden'); // Show the game screen
    this.reset(); // Reset the game state
    // ensure any game-over overlay is hidden when starting
    if (this.gameOverOverlay) this.gameOverOverlay.classList.add('hidden');
    this.running = true; // Set the game as running
    window.addEventListener('keydown', this._onKey); // Attach keyboard event listener
    this._lastTs = null;
    this.rafId = requestAnimationFrame(this._loop); // Start the game loop
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    window.removeEventListener('keydown', this._onKey);
  }

  restart() {
    this.stop();
    this.reset();
    if (this.gameOverOverlay) this.gameOverOverlay.classList.add('hidden');
    // Hide high score elements
    if (this.newHighScoreMsg) this.newHighScoreMsg.classList.add('hidden');
    if (this.nameInputSection) this.nameInputSection.classList.add('hidden');
    if (this.playerNameInput) this.playerNameInput.value = '';
    this.running = true;
    window.addEventListener('keydown', this._onKey);
    this.rafId = requestAnimationFrame(this._loop);
  }

  reset() {
    this.player.x = this.canvas.width / 2 - this.player.w / 2;
    this.obstacles = [];
    this.spawnTimer = 0;
    this.score = 0;
    this.scoreEl.textContent = String(this.score);
    this.gameMsg.textContent = '';
    this.testOver = false;
    // reset timing and obstacle speed progression
    this.elapsedSeconds = 0;
    this.currentObstacleSpeed = this.baseObstacleSpeed;
    this._lastTs = null;
    // initialize starfield for parallax background
    this.stars = [];
    for (let i = 0; i < this.numStars; i++) {
      const layer = Math.random() < 0.6 ? 1 : (Math.random() < 0.5 ? 0.6 : 0.35); // depth multiplier
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 1.6 + 0.4,
        layer
      });
    }
    this.explosion = null;
    this._gameOverTriggered = false;
  }

  _onKey(e) {
    if (!this.running) return;
    const k = e.key;
    // movement delta scaled by sensitivity
    const sensMul = this.sensitivity / 2; // sensitivity=2 -> 1 (previous behavior)
    const delta = this.player.speed * 1.5 * sensMul;
    // If 'A' pressed and serial is connected, allow restart regardless of control mode
    if ((k === 'a' || k === 'A') && this.serialConnected) {
      this.restart();
      return;
    }

    // Only accept arrow movement when in keyboard mode
    if (this.controlMode !== 'keyboard') return;

    if (k === 'ArrowLeft') this.player.x -= delta;
    if (k === 'ArrowRight') this.player.x += delta;
    // clamp
    this.player.x = Math.max(0, Math.min(this.canvas.width - this.player.w, this.player.x));
  }

  _loop(ts) {
    if (!this.running) return;

    // update timing
    if (this._lastTs == null) this._lastTs = ts;
    const deltaMs = ts - this._lastTs;
    this._lastTs = ts;
    this.elapsedSeconds += deltaMs / 1000;

    // update starfield positions (parallax)
    for (const s of this.stars) {
      // layer ~ 1 (near) -> move slightly faster; small gentle drift downward
      s.y += (10 * s.layer) * (deltaMs / 1000);
      // subtle horizontal drift
      s.x += Math.sin((s.y + s.x) * 0.001) * 0.1 * s.layer;
      if (s.y > this.canvas.height + 10) s.y = -10;
      if (s.x > this.canvas.width + 10) s.x = -10;
      if (s.x < -10) s.x = this.canvas.width + 10;
    }

    // update obstacle global speed progressively based on elapsed time
    this.currentObstacleSpeed = this.baseObstacleSpeed + this.elapsedSeconds * this.speedIncreasePerSecond;

    // dynamic spawn interval: start high (fewer obstacles), decrease as time/score increases
    const dynamicInterval = Math.max(this.spawnIntervalMin, Math.round(this.spawnIntervalStart - Math.floor(this.score / 3)));
    this.spawnTimer += 1;
    // only spawn after an initial grace period (first 5 seconds)
    if (this.elapsedSeconds >= 5 && this.spawnTimer > dynamicInterval) {
      this.spawnTimer = 0;
      this._spawnObstacle();
    }

    // move obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      // record trail
      o.trail.push({ x: o.x + o.w / 2, y: o.y + o.h / 2 });
      if (o.trail.length > 6) o.trail.shift();

      o.y += o.speed;
      if (o.y > this.canvas.height + o.h) {
        this.obstacles.splice(i, 1);
        this.score += 1;
        this.scoreEl.textContent = String(this.score);
      }
    }

  // Arduino distance controls (if active)
    if (this.controlMode === 'arduino' && typeof this.lastDist === 'number') {
      // map lastDist to x position: 5cm (close) -> far right, 30cm (far) -> far left
      // ignore readings above 30cm
      const minD = 5, maxD = 30;
      if (this.lastDist > maxD) {
        // ignore distances beyond 30cm - keep current position
      } else {
        const t = Math.max(0, Math.min(1, (this.lastDist - minD) / (maxD - minD)));
        // t==0 (5cm, close) -> far right; t==1 (30cm, far) -> far left
        const centerX = (1 - t) * (this.canvas.width - this.player.w);
        // smoothing based on sensitivity
        const smoothBase = 0.25;
        const smooth = Math.min(0.9, smoothBase * (this.sensitivity / 2));
        this.player.x += (centerX - this.player.x) * smooth;
      }
    }

    // collision - if collided, trigger explosion animation then finish
    for (const o of this.obstacles) {
      if (this._collides(this.player, o)) {
        // center of collision
        const cx = o.x + o.w / 2;
        const cy = o.y + o.h / 2;
        this._gameOver(cx, cy);
        return;
      }
    }

    // render
    this._render();

    this.rafId = requestAnimationFrame(this._loop);
  }

  _spawnObstacle() {
    const w = 20 + Math.random() * 40;
    const x = Math.random() * (this.canvas.width - w);
    // Use a consistent obstacle fall speed (global) so difficulty comes from speed progression
    const speed = this.currentObstacleSpeed || this.baseObstacleSpeed;
    // trail: keep last few positions for trailing effect
    const trail = [];
    this.obstacles.push({ x, y: -20, w, h: 12 + Math.random() * 18, speed, glow: 0.6 + Math.random() * 0.6, trail });
  }

  _collides(a, b) {
    return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
  }

  _render() {
    const ctx = this.ctx;
    // draw background gradient (space)
    const g = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    g.addColorStop(0, '#000000');
    g.addColorStop(1, '#031026');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // draw parallax stars
    for (const s of this.stars) {
      ctx.globalAlpha = 0.9 * s.layer;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // obstacles: glowing rocks with trails
    for (const o of this.obstacles) {
      // trail - draw translucent segments from older to newer
      ctx.save();
      for (let t = 0; t < o.trail.length - 1; t++) {
        const p1 = o.trail[t];
        const p2 = o.trail[t + 1];
        const alpha = (t / o.trail.length) * 0.5 * o.glow;
        ctx.strokeStyle = `rgba(200,220,255,${alpha})`;
        ctx.lineWidth = 2 + (t / o.trail.length) * 4;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      ctx.restore();

      // glowing rock
      const cx = o.x + o.w / 2;
      const cy = o.y + o.h / 2;
      const rad = Math.max(o.w, o.h) / 2;
      const rg = ctx.createRadialGradient(cx, cy, rad * 0.1, cx, cy, rad * 2);
      rg.addColorStop(0, `rgba(255,200,120,${0.9 * o.glow})`);
      rg.addColorStop(0.6, `rgba(220,120,80,${0.6 * o.glow})`);
      rg.addColorStop(1, `rgba(120,60,40,0)`);
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
      // add a small solid core
      ctx.fillStyle = 'rgba(240,180,80,0.9)';
      ctx.beginPath();
      ctx.arc(cx, cy, rad * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    // player: simple rocket sprite (triangle + tail)
    ctx.save();
    const px = this.player.x;
    const py = this.player.y;
    const pw = this.player.w;
    const ph = this.player.h;
    // rocket body
    ctx.translate(px + pw / 2, py + ph / 2);
    ctx.fillStyle = '#cfe8ff';
    ctx.beginPath();
    ctx.moveTo(0, -ph);
    ctx.lineTo(pw / 1.5, ph);
    ctx.lineTo(-pw / 1.5, ph);
    ctx.closePath();
    ctx.fill();
    // rocket window
    ctx.fillStyle = '#003a5c';
    ctx.beginPath();
    ctx.arc(0, -ph * 0.2, pw * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // explosion animation (if present)
    if (this.explosion) {
      const e = this.explosion;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const grd = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r);
      grd.addColorStop(0, `rgba(255,220,150,${e.alpha})`);
      grd.addColorStop(0.4, `rgba(255,120,40,${e.alpha * 0.8})`);
      grd.addColorStop(1, `rgba(20,10,5,0)`);
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  _gameOver(cx, cy) {
    if (this._gameOverTriggered) return;
    this._gameOverTriggered = true;
    this.gameMsg.textContent = 'Game Over';
    if (typeof cx === 'number' && typeof cy === 'number') {
      this.explosion = { x: cx, y: cy, r: 0, alpha: 1 };
      // animate explosion growth
      const animStart = performance.now();
      const dur = 600;
      const tick = (now) => {
        const t = Math.min(1, (now - animStart) / dur);
        if (!this.explosion) return;
        this.explosion.r = t * 80;
        this.explosion.alpha = 1 - t;
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
    const finish = () => {
      this.stop();
      // Show final score and overlay
      if (this.finalScoreValue) this.finalScoreValue.textContent = String(this.score);
      
      // Check if this is a new high score
      this._checkHighScore();
      
      if (this.gameOverOverlay) this.gameOverOverlay.classList.remove('hidden');
    };
    setTimeout(finish, 650);
  }
}

// Initialize on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  window.ObstacleDodger = new ObstacleDodgerGame();
});

export default ObstacleDodgerGame;

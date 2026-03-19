/*
  Week 9 — Example 3: Adding Sound & Music

  Course: GBDA302 | Instructors: Dr. Karen Cochrane & David Han
  Date: Mar. 19, 2026

  Controls:
    A or D (Left / Right Arrow)   Horizontal movement
    W (Up Arrow)                  Jump
    Space Bar                     Attack
    F                             Toggle debug menu
    1 (while debug open)          Toggle Moon Gravity
    2 (while debug open)          Toggle Fast Movement

  Tile key:
    g = groundTile.png       (surface ground)
    d = groundTileDeep.png   (deep ground, below surface)
      = empty (no sprite)
*/

let player;
let playerImg, bgImg;
let jumpSfx, musicSfx;
let musicStarted = false;

let playerAnis = {
  idle: { row: 0, frames: 4, frameDelay: 10 },
  run: { row: 1, frames: 4, frameDelay: 3 },
  jump: { row: 2, frames: 3, frameDelay: Infinity, frame: 0 },
  attack: { row: 3, frames: 6, frameDelay: 2 },
};

let ground, groundDeep;
let groundImg, groundDeepImg;

let attacking = false;
let attackFrameCounter = 0;

// --- DEBUG VARIABLES ---
let isDebugOpen = false;
let isMoonGravity = false;
let isFastMode = false;

// --- DEBUG CONSTANTS ---
const NORMAL_GRAVITY = 10;
const MOON_GRAVITY = 3.5;
const NORMAL_SPEED = 1.5;
const FAST_SPEED = 3.0;

// --- TILE MAP ---
let level = [
  "              ",
  "              ",
  "              ",
  "              ",
  "              ",
  "       ggg    ",
  "gggggggggggggg",
  "dddddddddddddd",
];

// --- LEVEL CONSTANTS ---
const VIEWW = 320,
  VIEWH = 180;
const TILE_W = 24,
  TILE_H = 24;
const FRAME_W = 32,
  FRAME_H = 32;
const MAP_START_Y = VIEWH - TILE_H * 4;
const GRAVITY = 10;

// ---------------------------------------------------------------------------
// HTML DEBUG PANEL
// Built once in setup() as a real DOM element sitting on top of the canvas,
// so text is always crisp no matter how the pixelated canvas is scaled.
// ---------------------------------------------------------------------------
let dbgPanel, dbgStats;

function createDebugPanel() {
  const style = document.createElement("style");
  style.textContent = `
    #dbg-panel {
      display: none;
      position: fixed;
      top: 12px;
      right: 12px;
      width: 220px;
      background: rgba(0,0,0,0.85);
      border: 2px solid #ffdc00;
      border-radius: 6px;
      font-family: monospace;
      font-size: 13px;
      color: #fff;
      z-index: 9999;
      padding: 10px 12px 8px 12px;
      pointer-events: none;
      user-select: none;
    }
    #dbg-panel h2 {
      margin: 0 0 6px 0;
      font-size: 14px;
      color: #ffdc00;
      letter-spacing: 2px;
    }
    #dbg-panel hr {
      border: none;
      border-top: 1px solid rgba(255,220,0,0.3);
      margin: 6px 0;
    }
    .dbg-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 3px 4px;
      border-radius: 3px;
    }
    .dbg-row.active { background: rgba(255,220,0,0.1); }
    .dbg-row span   { color: #aaa; }
    .dbg-row.active span { color: #ffdc00; }
    .dbg-badge {
      font-size: 11px;
      font-weight: bold;
      padding: 1px 7px;
      border-radius: 3px;
      min-width: 30px;
      text-align: center;
    }
    .dbg-badge.on  { background: #2ecc40; color: #fff; }
    .dbg-badge.off { background: #b03030; color: #fff; }
    #dbg-stats {
      font-size: 11px;
      color: #88aaff;
      margin-top: 2px;
      line-height: 1.7;
    }
    #dbg-hint {
      font-size: 10px;
      color: #555;
      margin-top: 6px;
    }
    #dbg-f-hint {
      position: fixed;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.6);
      border: 1px solid rgba(255,220,0,0.4);
      border-radius: 4px;
      color: rgba(255,220,0,0.85);
      font-family: monospace;
      font-size: 18px;
      padding: 5px 14px;
      pointer-events: none;
      user-select: none;
      z-index: 9999;
      transition: opacity 0.3s;
    }
    #dbg-f-hint.hidden { opacity: 0; }
  `;
  document.head.appendChild(style);

  // Always-visible hint centered at the bottom of the screen
  const fHint = document.createElement("div");
  fHint.id = "dbg-f-hint";
  fHint.textContent = "F — Debug Menu";
  document.body.appendChild(fHint);
  window._dbgFHint = fHint;

  dbgPanel = document.createElement("div");
  dbgPanel.id = "dbg-panel";
  dbgPanel.innerHTML = `
    <h2>[ DEBUG ]</h2>
    <hr>
    <div class="dbg-row" id="dbg-1">
      <span>1 &nbsp;Moon Gravity</span>
      <div class="dbg-badge off" id="badge-1">OFF</div>
    </div>
    <div class="dbg-row" id="dbg-2">
      <span>2 &nbsp;Fast Move</span>
      <div class="dbg-badge off" id="badge-2">OFF</div>
    </div>
    <hr>
    <div id="dbg-stats">x: — &nbsp; y: —<br>vy: —</div>
    <div id="dbg-hint">F to close</div>
  `;
  document.body.appendChild(dbgPanel);
  dbgStats = document.getElementById("dbg-stats");
}

function updateDebugPanel() {
  dbgPanel.style.display = isDebugOpen ? "block" : "none";
  if (window._dbgFHint)
    window._dbgFHint.classList.toggle("hidden", isDebugOpen);
  if (!isDebugOpen) return;

  const toggles = [
    { id: "1", active: isMoonGravity },
    { id: "2", active: isFastMode },
  ];

  for (let t of toggles) {
    let row = document.getElementById("dbg-" + t.id);
    let badge = document.getElementById("badge-" + t.id);
    if (t.active) {
      row.classList.add("active");
      badge.className = "dbg-badge on";
      badge.textContent = "ON";
    } else {
      row.classList.remove("active");
      badge.className = "dbg-badge off";
      badge.textContent = "OFF";
    }
  }

  if (player) {
    dbgStats.innerHTML =
      `x: ${nf(player.pos.x, 3, 0)} &nbsp; y: ${nf(player.pos.y, 3, 0)}<br>` +
      `vy: ${nf(player.vel.y, 2, 1)}`;
  }
}

// ---------------------------------------------------------------------------

function preload() {
  playerImg = loadImage("assets/foxSpriteSheet.png");
  bgImg = loadImage("assets/combinedBackground.png");
  groundImg = loadImage("assets/groundTile.png");
  groundDeepImg = loadImage("assets/groundTileDeep.png");

  if (typeof loadSound === "function") {
    jumpSfx = loadSound("assets/sfx/jump.wav");
    musicSfx = loadSound("assets/sfx/music.wav");
  }
}

function setup() {
  new Canvas(VIEWW, VIEWH, "pixelated");
  allSprites.pixelPerfect = true;
  world.gravity.y = GRAVITY;

  noSmooth();
  const cnv = document.querySelector("canvas");
  if (cnv) {
    cnv.style.imageRendering = "pixelated";
    cnv.style.imageRendering = "crisp-edges";
    cnv.style.msInterpolationMode = "nearest-neighbor";
  }

  if (musicSfx) musicSfx.setLoop(true);
  startMusicIfNeeded();

  // Build the HTML debug panel (once)
  createDebugPanel();

  ground = new Group();
  ground.physics = "static";
  ground.img = groundImg;
  ground.tile = "g";

  groundDeep = new Group();
  groundDeep.physics = "static";
  groundDeep.img = groundDeepImg;
  groundDeep.tile = "d";

  new Tiles(level, 0, 0, TILE_W, TILE_H);

  player = new Sprite(FRAME_W, MAP_START_Y, FRAME_W, FRAME_H);
  player.spriteSheet = playerImg;
  player.rotationLock = true;

  player.anis.w = FRAME_W;
  player.anis.h = FRAME_H;
  player.anis.offset.y = -4;
  player.addAnis(playerAnis);
  player.ani = "idle";
  player.w = 18;
  player.h = 20;
  player.friction = 0;
  player.bounciness = 0;

  sensor = new Sprite();
  sensor.x = player.x;
  sensor.y = player.y + player.h / 2;
  sensor.w = player.w;
  sensor.h = 2;
  sensor.mass = 0.01;
  sensor.removeColliders();
  sensor.visible = false;
  let sensorJoint = new GlueJoint(player, sensor);
  sensorJoint.visible = false;
}

function startMusicIfNeeded() {
  if (musicStarted || !musicSfx) return;

  const startLoop = () => {
    if (!musicSfx.isPlaying()) musicSfx.play();
    musicStarted = musicSfx.isPlaying();
  };

  const maybePromise = userStartAudio();
  if (maybePromise && typeof maybePromise.then === "function") {
    maybePromise.then(startLoop).catch(() => {});
  } else {
    startLoop();
  }
}

function keyPressed() {
  startMusicIfNeeded();

  // Toggle the debug menu with F
  if (key === "f" || key === "F") {
    isDebugOpen = !isDebugOpen;
  }

  // Feature toggles only work while the menu is open
  if (isDebugOpen) {
    if (key === "1") {
      isMoonGravity = !isMoonGravity;
      world.gravity.y = isMoonGravity ? MOON_GRAVITY : NORMAL_GRAVITY;
    }
    if (key === "2") {
      isFastMode = !isFastMode;
    }
  }
}

function mousePressed() {
  startMusicIfNeeded();
}

function touchStarted() {
  startMusicIfNeeded();
  return false;
}

function draw() {
  // --- BACKGROUND ---
  camera.off();
  imageMode(CORNER);
  image(bgImg, 0, 0, bgImg.width, bgImg.height);
  camera.on();

  // --- PLAYER CONTROLS ---
  let grounded = sensor.overlapping(ground);

  // -- ATTACK INPUT --
  if (grounded && !attacking && kb.presses("space")) {
    attacking = true;
    attackFrameCounter = 0;
    player.vel.x = 0;
    player.ani.frame = 0;
    player.ani = "attack";
    player.ani.play();
  }

  // -- JUMP --
  if (grounded && kb.presses("up")) {
    player.vel.y = -4;
    if (jumpSfx) jumpSfx.play();
  }

  // --- STATE MACHINE ---
  if (attacking) {
    attackFrameCounter++;
    if (attackFrameCounter > 12) {
      attacking = false;
      attackFrameCounter = 0;
    }
  } else if (!grounded) {
    player.ani = "jump";
    player.ani.frame = player.vel.y < 0 ? 0 : 1;
  } else {
    player.ani = kb.pressing("left") || kb.pressing("right") ? "run" : "idle";
  }

  // --- MOVEMENT ---
  let currentSpeed = isFastMode ? FAST_SPEED : NORMAL_SPEED;

  if (!attacking) {
    player.vel.x = 0;
    if (kb.pressing("left")) {
      player.vel.x = -currentSpeed;
      player.mirror.x = true;
    } else if (kb.pressing("right")) {
      player.vel.x = currentSpeed;
      player.mirror.x = false;
    }
  }

  // --- KEEP IN VIEW ---
  player.pos.x = constrain(player.pos.x, FRAME_W / 2, VIEWW - FRAME_W / 2);

  // --- UPDATE HTML DEBUG PANEL ---
  updateDebugPanel();
}

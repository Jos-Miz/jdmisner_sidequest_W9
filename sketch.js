/*
  Week 9 — Example 3: Adding Sound & Music

  Course: GBDA302 | Instructors: Dr. Karen Cochrane & David Han
  Date: Mar. 19, 2026

  Controls:
    A or D (Left / Right Arrow)   Horizontal movement
    W (Up Arrow)                  Jump
    Space Bar                     Attack

  Debug Controls (press D to open/close):
    1                             Toggle Moon Gravity
    2                             Toggle Super Jump

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

// --- DEBUG STATE (ADDED) ---
let debugOpen = false;        // whether the debug overlay is visible
let moonGravity = false;      // whether moon gravity is active
let superJump = false;        // whether super jump is active

const NORMAL_GRAVITY = 10;    // original gravity value
const MOON_GRAVITY = 2;       // reduced gravity for moon mode
const NORMAL_JUMP = -4;       // original jump velocity
const SUPER_JUMP_VEL = -8;    // increased jump velocity for super jump

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

  if (musicSfx) musicSfx.setLoop(true);
  startMusicIfNeeded();

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

// --- ADDED: keyPressed handles debug toggles ---
// Note: "d" was previously used for movement (left arrow alternative),
// but the assignment specifies D for the debug menu. Left/right movement
// uses arrow keys or A/W as noted in the controls header above.
function keyPressed() {
  startMusicIfNeeded();

  // Toggle debug overlay open/closed
  if (key === "d" || key === "D") {
    debugOpen = !debugOpen;
  }

  // Debug toggles only work when debug menu is open
  if (debugOpen) {
    // 1 = Toggle Moon Gravity
    if (key === "1") {
      moonGravity = !moonGravity;
      world.gravity.y = moonGravity ? MOON_GRAVITY : NORMAL_GRAVITY;
    }

    // 2 = Toggle Super Jump
    if (key === "2") {
      superJump = !superJump;
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
  // ADDED: use SUPER_JUMP_VEL if super jump is on, otherwise use NORMAL_JUMP
  if (grounded && kb.presses("up")) {
    player.vel.y = superJump ? SUPER_JUMP_VEL : NORMAL_JUMP;
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
  if (!attacking) {
    player.vel.x = 0;
    if (kb.pressing("left")) {
      player.vel.x = -1.5;
      player.mirror.x = true;
    } else if (kb.pressing("right")) {
      player.vel.x = 1.5;
      player.mirror.x = false;
    }
  }

  // --- KEEP IN VIEW ---
  player.pos.x = constrain(player.pos.x, FRAME_W / 2, VIEWW - FRAME_W / 2);

  // --- ADDED: DEBUG OVERLAY ---
  // Drawn in screen space (camera off) so it always appears on top
  camera.off();
  drawDebugOverlay();
  camera.on();
}

// --- FIXED: drawDebugOverlay ---
// FIX: The original version used textSize(6) directly on the pixelated canvas,
// which caused the pixel-scaling to stretch and distort text into an unreadable mess.
// Solution: use push()/pop() with scale() to draw at the true display resolution
// instead of the low-res virtual canvas resolution (320x180).
// All coordinates below are in display pixels, then scaled back down.
function drawDebugOverlay() {
  // CHANGED: get the actual on-screen pixel size of the canvas
  const displayW = canvas.elt.clientWidth  || canvas.elt.width;
  const displayH = canvas.elt.clientHeight || canvas.elt.height;

  // scale factor from virtual (320x180) coords to real display coords
  const scaleX = displayW / VIEWW;
  const scaleY = displayH / VIEWH;

  push();

  // CHANGED: scale up to display resolution so text renders crisply
  scale(1 / scaleX, 1 / scaleY);

  // CHANGED: use a comfortable readable text size in real pixels
  const TS = 13;              // text size in display pixels
  const PAD = 10;             // padding inside the box
  const LEFT_X = 8 * scaleX; // box left edge in display pixels
  const TOP_Y  = 8 * scaleY; // box top edge in display pixels

  textFont("monospace");
  textSize(TS);
  noStroke();
  textAlign(LEFT, TOP);

  if (!debugOpen) {
    // Compact closed hint
    const hintW = 130, hintH = TS + PAD;
    fill(0, 0, 0, 150);
    rect(LEFT_X, TOP_Y, hintW, hintH, 4);
    fill(200, 200, 200);
    text("D = debug menu", LEFT_X + PAD * 0.6, TOP_Y + PAD * 0.4);
    pop();
    return;
  }

  // CHANGED: fixed-width box sized to fit content cleanly
  const BOX_W = 220;
  const BOX_H = TS * 6 + PAD * 3.5;
  const TX = LEFT_X + PAD;  // text x
  let TY   = TOP_Y  + PAD;  // text y, incremented per line
  const LINE = TS + 5;      // line height

  // Background panel
  fill(0, 0, 0, 180);
  rect(LEFT_X, TOP_Y, BOX_W, BOX_H, 5);

  // Title — yellow
  fill(255, 220, 50);
  text("=== DEBUG MENU ===", TX, TY);
  TY += LINE + 3;

  // Moon gravity — blue tint when ON, grey when OFF
  fill(moonGravity ? color(120, 210, 255) : color(180, 180, 180));
  text("[1] Moon Gravity:  " + (moonGravity ? "ON" : "OFF"), TX, TY);
  TY += LINE;

  // Super jump — green tint when ON, grey when OFF
  fill(superJump ? color(100, 255, 130) : color(180, 180, 180));
  text("[2] Super Jump:    " + (superJump ? "ON" : "OFF"), TX, TY);
  TY += LINE + 3;

  // Divider
  fill(100, 100, 100);
  text("------------------", TX, TY);
  TY += LINE;

  // Close hint
  fill(200, 200, 200);
  text("[D] Close menu", TX, TY);

  pop();
}

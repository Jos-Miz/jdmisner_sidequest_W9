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

// =============================================================
// --- DEBUG VARIABLES ---
// These control the debug menu visibility and feature toggles.
// =============================================================

let isDebugOpen = false; // Is the debug menu currently showing?
let isMoonGravity = false; // When true, gravity is reduced to ~35% of normal
let isFastMode = false; // When true, horizontal movement speed is doubled

// --- DEBUG CONSTANTS ---
// Tweak these values to adjust how each mode feels.
const NORMAL_GRAVITY = 10; // Your original gravity value
const MOON_GRAVITY = 3.5; // ~35% of normal — floaty moon feel
const NORMAL_SPEED = 1.5; // Your original movement speed
const FAST_SPEED = 3.0; // 2x normal speed for fast mode

// =============================================================

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

  // --- FIX BLURRY SCALING ---
  // Forces the browser to scale the canvas using nearest-neighbour (pixel-perfect)
  // instead of the default bilinear filtering, which causes the blur you see.
  const cnv = document.querySelector("canvas");
  if (cnv) {
    cnv.style.imageRendering = "pixelated"; // Chrome / Edge
    cnv.style.imageRendering = "crisp-edges"; // Firefox fallback
    cnv.style.msInterpolationMode = "nearest-neighbor"; // old IE (just in case)
  }

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

// =============================================================
// --- DEBUG KEY HANDLER ---
// F opens/closes the debug menu.
// 1 and 2 toggle features, but only while the menu is open.
// This lives in keyPressed() alongside your existing audio trigger.
// =============================================================
function keyPressed() {
  startMusicIfNeeded();

  // Toggle the debug menu open or closed with F
  if (key === "f" || key === "F") {
    isDebugOpen = !isDebugOpen;
  }

  // Only allow feature toggles when the debug menu is visible
  if (isDebugOpen) {
    // Key 1 — Toggle Moon Gravity on/off
    if (key === "1") {
      isMoonGravity = !isMoonGravity;
      // Apply the correct gravity to the physics world right away
      world.gravity.y = isMoonGravity ? MOON_GRAVITY : NORMAL_GRAVITY;
    }

    // Key 2 — Toggle Fast Movement on/off
    if (key === "2") {
      isFastMode = !isFastMode;
    }
  }
}
// =============================================================

function mousePressed() {
  startMusicIfNeeded();
}

function touchStarted() {
  startMusicIfNeeded();
  return false;
}

// =============================================================
// --- DEBUG MENU DRAW FUNCTION ---
// Call this at the end of draw() to overlay the debug panel.
// It draws on top of the camera so it always stays on screen.
// =============================================================
function drawDebugMenu() {
  // Only draw if the menu is toggled open
  if (!isDebugOpen) return;

  camera.off(); // Draw in screen-space (not world-space)

  // --- Disable smoothing so upscaled text stays sharp/pixel-crisp ---
  noSmooth();

  // --- Background panel ---
  // Made taller & wider to fit the larger text size below
  fill(0, 0, 0, 180);
  noStroke();
  rect(4, 4, 120, 42, 3); // x, y, width, height, corner radius

  // --- Title ---
  fill(255, 255, 100); // Yellow title text
  noStroke();
  textSize(7); // Bumped up from 5 → sharper when scaled
  text("DEBUG MENU (F)", 8, 14);

  // --- Moon Gravity toggle line ---
  fill(isMoonGravity ? color(80, 220, 80) : color(220, 80, 80));
  textSize(7);
  text("[1] Moon Gravity: " + (isMoonGravity ? "ON" : "OFF"), 8, 26);

  // --- Fast Mode toggle line ---
  fill(isFastMode ? color(80, 220, 80) : color(220, 80, 80));
  textSize(7);
  text("[2] Fast Move:    " + (isFastMode ? "ON" : "OFF"), 8, 38);

  // --- Re-enable smoothing so the rest of the game renders normally ---
  smooth();

  camera.on(); // Resume world-space rendering
}
// =============================================================

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
  // Use isFastMode to pick between normal and fast speed
  // =============================================================
  let currentSpeed = isFastMode ? FAST_SPEED : NORMAL_SPEED;
  // =============================================================

  if (!attacking) {
    player.vel.x = 0;
    if (kb.pressing("left")) {
      player.vel.x = -currentSpeed; // was hardcoded -1.5
      player.mirror.x = true;
    } else if (kb.pressing("right")) {
      player.vel.x = currentSpeed; // was hardcoded 1.5
      player.mirror.x = false;
    }
  }

  // --- KEEP IN VIEW ---
  player.pos.x = constrain(player.pos.x, FRAME_W / 2, VIEWW - FRAME_W / 2);

  // =============================================================
  // --- DRAW DEBUG OVERLAY ---
  // Always called last so it renders on top of everything else.
  // =============================================================
  drawDebugMenu();
}

// The walkable hub. Replaces HomeScene as the lobby. BotW-minimalist:
// soft pastel ground tiles tinted by the active world archetype, simple
// flat-shaded huts, drifting wind grass, low-poly trees.
//
// The player walks around (joystick on left, or WASD/arrows). Walking
// near a building triggers an interaction prompt; tapping the prompt or
// pressing E/Space opens the corresponding scene.
//
// Buildings:
//   Tavern   → GachaScene
//   Market   → ShopScene
//   Garage   → InventoryScene  (mounts + relics + weapons)
//   Lodge    → VIPScene
//   Cave     → GameScene       (the roguelite run)
//   Bonfire  → save/notice board (passive — used for plot beat triggers)
//
// NPCs: friend companions found so far. Walk up to talk → DialogueScene.
//
// Raid timer: counts down on top of screen. When it expires, the cave
// glows red and is labelled DEFEND THE CLEARING. Defeating that run
// (a normal GameScene run, slightly modified marker) clears the raid
// state and grants materials.

import { CurrencyBar } from "../ui/CurrencyBar.js";
import { World } from "../services/world.js";
import { Storage } from "../services/storage.js";
import { Subscription } from "../services/subscription.js";
import { addGems, getBalances } from "../services/currency.js";
import { ECONOMY } from "../config/economy.js";
import { utcDayIndex } from "../services/storage.js";
import { findBeat, fillTemplate } from "../config/dialogue.js";
import { COMPANIONS } from "../config/companions.js";
import { Joystick } from "../systems/Joystick.js";

const HUB_W = 1600;
const HUB_H = 1200;
const TILE  = 64;

const RAID_INTERVAL_SEC = 8 * 60; // 8 min between raids
const RAID_FIRST_DELAY_SEC = 60;  // first raid arms 60s after hub entry

export class HubScene extends Phaser.Scene {
  constructor() { super("HubScene"); }

  create() {
    const world = World.current();
    this._world = world;
    this._palette = world.palette;

    this.physics.world.setBounds(0, 0, HUB_W, HUB_H);
    this.cameras.main.setBackgroundColor(`#${world.palette.sky.toString(16).padStart(6, "0")}`);
    this.cameras.main.setBounds(0, 0, HUB_W, HUB_H);

    // _sortables collects every game object whose render depth should track
    // its world Y — buildings, NPCs, trees-as-objects, the player.
    this._sortables = [];

    this._buildSkyParallax();
    this._buildGround();
    this._buildScenery();
    this._buildBuildings();
    this._buildNPCs();
    this._buildPlayer();
    this._buildWeather();
    this._buildAmbientTint();
    this._buildHUD();
    this._setupInput();

    // Daily login + sub claim happen here too (replacing HomeScene's role).
    this._handleDailyLogin();
    Subscription.claimDaily();

    // Plot beat: first arrival.
    if (!World.hasSeenBeat("arrival")) {
      this.time.delayedCall(900, () => this._playBeat("arrival"));
    } else if (!World.hasSeenBeat("first_friend") && World.hasFriend(World.firstFriend().id) === false) {
      // Rare path: arrival seen but friend not yet "found". Treat hub
      // re-entry as the friend arrival moment.
      this._summonFirstFriend();
    } else if (!World.hasSeenBeat("after_first_run") && Storage.load().totalRuns >= 1) {
      this.time.delayedCall(700, () => this._playBeat("after_first_run"));
    }

    // Raid timer state.
    const totalRuns = Storage.load().totalRuns;
    const raidsAllowed = totalRuns >= Storage.load().plot.nextRaidUnlockAtRuns;
    if (raidsAllowed) {
      this._raidArmed = false;
      this._raidActive = false;
      this._raidTimerSec = RAID_FIRST_DELAY_SEC;
    } else {
      this._raidArmed = false;
      this._raidActive = false;
      this._raidTimerSec = -1;
    }

    // If we just finished a raid run last frame, clear it.
    const carry = Storage.load().__hubCarry;
    if (carry && carry.raidCompleted) {
      Storage.mutate((s) => { delete s.__hubCarry; s.hub.raidsCompleted += 1; });
      this._flash(`Raid repelled! +${ECONOMY.materialsRaidReward || 30} materials`);
    }

    this.scale.on("resize", this._onResize, this);
    this.events.once("shutdown", () => this.scale.off("resize", this._onResize, this));
  }

  // ---------- Sky parallax ----------

  _buildSkyParallax() {
    const { width, height } = this.scale;
    const p = this._palette;
    const weather = this._world.weather;

    // Sky band: locked to camera, but scrolls slowly so foreground motion
    // is read against a slower-moving backdrop. Two stacked rectangles
    // approximate a top-to-bottom gradient.
    const skyTop = this.add.rectangle(0, 0, width * 2, height * 0.6, p.sky, 1)
      .setOrigin(0, 0).setDepth(-120).setScrollFactor(0.3, 0.1);
    const skyBot = this.add.rectangle(0, height * 0.4, width * 2, height * 0.4, p.skyBot, 0.8)
      .setOrigin(0, 0).setDepth(-119).setScrollFactor(0.3, 0.1);
    // Re-anchor on resize.
    this._skyTop = skyTop;
    this._skyBot = skyBot;

    // Cloud silhouettes — drift across at half-speed so they read as far away.
    const count = weather.cloudCount || 4;
    this._clouds = [];
    for (let i = 0; i < count; i++) {
      const yBand = height * 0.05 + Math.random() * (height * 0.30);
      const cloud = this.add.ellipse(
        Math.random() * width * 2 - width,
        yBand,
        140 + Math.random() * 120,
        28 + Math.random() * 14,
        0xffffff, 0.55,
      ).setDepth(-118).setScrollFactor(0.5, 0.2);
      this.tweens.add({
        targets: cloud, x: cloud.x + width * 2.2,
        duration: 28000 + Math.random() * 18000,
        repeat: -1,
        onRepeat: () => { cloud.x = -200; cloud.y = height * 0.05 + Math.random() * (height * 0.30); },
      });
      this._clouds.push(cloud);
    }
  }

  // ---------- Ground / scenery ----------

  _buildGround() {
    const p = this._palette;
    // Sky-tinted base behind everything (camera also has it but layering helps).
    this.add.rectangle(0, 0, HUB_W, HUB_H, p.sky, 1).setOrigin(0).setDepth(-100);

    // Ground = soft pastel gradient using two big rounded rectangles.
    const groundFar = this.add.rectangle(0, 0, HUB_W, HUB_H, p.groundFar, 1).setOrigin(0).setDepth(-90);
    const groundNear = this.add.ellipse(HUB_W / 2, HUB_H * 0.62, HUB_W * 1.2, HUB_H * 0.95, p.groundNear, 1).setDepth(-89);

    // Horizon stroke — subtle accent line.
    const horizon = this.add.rectangle(0, HUB_H * 0.18, HUB_W, 4, p.accent, 0.45).setOrigin(0).setDepth(-88);

    // A simple curved path leading to the cave.
    const pathG = this.add.graphics().setDepth(-87);
    pathG.fillStyle(p.path, 1);
    // Path snake from bottom-center toward cave (top-center).
    for (let i = 0; i < 40; i++) {
      const t = i / 40;
      const x = HUB_W / 2 + Math.sin(t * Math.PI) * 80;
      const y = HUB_H * 0.92 - t * (HUB_H * 0.62);
      pathG.fillCircle(x, y, 28);
    }

    // Wind grass — many small upright lines that sway with a tween. Pure
    // visual, no physics.
    const grassG = this.add.graphics().setDepth(-86);
    grassG.lineStyle(1.4, p.tree, 0.6);
    const grassBlades = [];
    for (let i = 0; i < 240; i++) {
      const x = Math.random() * HUB_W;
      const y = HUB_H * 0.30 + Math.random() * (HUB_H * 0.65);
      grassBlades.push({ x, y });
      grassG.lineBetween(x, y, x, y - 7);
    }
    // Tween the whole grass layer's rotation slightly to suggest wind.
    this.tweens.add({
      targets: grassG, rotation: Phaser.Math.DegToRad(2),
      duration: 2200, yoyo: true, repeat: -1, ease: "Sine.easeInOut",
    });
    // Soft drifting "wind streaks" — translucent rectangles moving across.
    for (let i = 0; i < 6; i++) {
      const streak = this.add.rectangle(
        Math.random() * HUB_W, HUB_H * 0.3 + Math.random() * (HUB_H * 0.4),
        140, 2, 0xffffff, 0.18,
      ).setDepth(-85);
      this.tweens.add({
        targets: streak, x: streak.x + 600, alpha: 0,
        duration: 6000 + Math.random() * 3000, repeat: -1, delay: Math.random() * 4000,
        onRepeat: () => {
          streak.x = -200;
          streak.y = HUB_H * 0.3 + Math.random() * (HUB_H * 0.4);
          streak.alpha = 0.18;
        },
      });
    }
  }

  _buildScenery() {
    const p = this._palette;
    const treeStyle = this._world.treeStyle || "broadleaf";
    const density = this._world.densityTrees || 1.0;
    const tries = Math.floor(60 * density);
    const cx = HUB_W / 2, cyy = HUB_H * 0.55;

    for (let i = 0; i < tries; i++) {
      const x = 80 + Math.random() * (HUB_W - 160);
      const y = HUB_H * 0.30 + Math.random() * (HUB_H * 0.65);
      const dx = x - cx, dy = y - cyy;
      if (dx * dx + dy * dy < 380 * 380) continue;
      const tree = this._makeTree(x, y, treeStyle, p);
      this._sortables.push(tree);
    }
  }

  // Build a single tree container, varying shape by biome treeStyle.
  _makeTree(x, y, style, p) {
    const g = this.add.container(x, y);
    const h = 36 + Math.random() * 24;

    // Soft drop shadow at the base — sells the depth illusion.
    const shadow = this.add.ellipse(0, 2, h * 0.55, 6, 0x000000, 0.30);
    g.add(shadow);

    if (style === "conifer") {
      // Tall narrow spruce: trunk + stacked triangles.
      const trunk = this.add.rectangle(0, -2, 3, 12, 0x4a3320, 1);
      const c1 = this.add.triangle(0, -h * 0.10, -h * 0.40, 0, h * 0.40, 0, 0, -h * 0.55, p.tree, 1);
      const c2 = this.add.triangle(0, -h * 0.45, -h * 0.30, 0, h * 0.30, 0, 0, -h * 0.50, p.tree, 1);
      const c3 = this.add.triangle(0, -h * 0.80, -h * 0.20, 0, h * 0.20, 0, 0, -h * 0.40, p.tree, 1);
      g.add([trunk, c1, c2, c3]);
    } else if (style === "palm") {
      // Curved palm: trunk + fronds.
      const trunk = this.add.rectangle(0, -h * 0.3, 4, h * 0.7, 0x7a5530, 1);
      const f1 = this.add.ellipse(-h * 0.30, -h * 0.65, h * 0.6, 8, p.tree, 1).setRotation(-0.5);
      const f2 = this.add.ellipse( h * 0.30, -h * 0.65, h * 0.6, 8, p.tree, 1).setRotation(0.5);
      const f3 = this.add.ellipse(0, -h * 0.80, h * 0.5, 7, p.tree, 1);
      g.add([trunk, f1, f2, f3]);
    } else if (style === "sparse") {
      // Dry brush: small clumps.
      const c = this.add.ellipse(0, -h * 0.15, h * 0.4, h * 0.3, p.tree, 1);
      const c2 = this.add.ellipse(h * 0.18, -h * 0.05, h * 0.25, h * 0.18, p.tree, 0.8);
      g.add([c, c2]);
    } else if (style === "deadwood") {
      // Bare branching twig.
      const trunk = this.add.rectangle(0, -h * 0.3, 3, h * 0.6, 0x3a201a, 1);
      const b1 = this.add.rectangle(-h * 0.15, -h * 0.5, h * 0.3, 2, 0x3a201a, 1).setRotation(-0.4);
      const b2 = this.add.rectangle( h * 0.15, -h * 0.55, h * 0.3, 2, 0x3a201a, 1).setRotation(0.4);
      g.add([trunk, b1, b2]);
    } else if (style === "crystal") {
      // Cosmic crystal: jagged shards instead of trees.
      const trunk = this.add.rectangle(0, -2, 2, 6, 0x2a1a4a, 1);
      const c1 = this.add.triangle(0, -h * 0.20, -h * 0.30, 0, h * 0.30, 0, 0, -h * 0.95, p.tree, 1);
      const c2 = this.add.triangle(-h * 0.18, -h * 0.15, -h * 0.10, 0, h * 0.05, 0, -h * 0.20, -h * 0.65, p.accent, 0.85);
      g.add([trunk, c1, c2]);
    } else {
      // Broadleaf default: trunk + triangle canopy + highlight.
      const trunk = this.add.rectangle(0, -2, 4, 10, 0x4a3320, 1);
      const canopy = this.add.triangle(0, 0, -h * 0.45, 0, h * 0.45, 0, 0, -h, p.tree, 1);
      const hi = this.add.triangle(0, 0, -h * 0.30, -2, h * 0.05, -h * 0.4, 0, -h, 0xffffff, 0.10);
      g.add([trunk, canopy, hi]);
    }

    return g;
  }

  // ---------- Buildings ----------

  _buildBuildings() {
    const cx = HUB_W / 2;
    const cy = HUB_H * 0.55;

    // Layout: ring around center clearing.
    const defs = [
      { id: "tavern",   label: "Tavern",   sub: "Gacha",     scene: "GachaScene",     dx: -260, dy:  -90, color: 0xc084fc },
      { id: "market",   label: "Market",   sub: "Shop",      scene: "ShopScene",      dx:  260, dy:  -90, color: 0x4ade80 },
      { id: "garage",   label: "Stables",  sub: "Mounts/Inv", scene: "InventoryScene", dx: -260, dy:  130, color: 0xffd166 },
      { id: "lodge",    label: "Lodge",    sub: "VIP",       scene: "VIPScene",       dx:  260, dy:  130, color: 0xff8aa8 },
      { id: "cave",     label: "Cave Mouth", sub: "Run",     scene: "GameScene",      dx:    0, dy: -240, color: 0x49d6ff, isCave: true },
      { id: "bonfire",  label: "Bonfire",  sub: "Rest",      scene: null,             dx:    0, dy:   30, color: 0xff9966, isPassive: true },
    ];

    this.buildings = [];
    for (const d of defs) {
      const x = cx + d.dx;
      const y = cy + d.dy;
      const b = this._makeBuilding(x, y, d);
      this.buildings.push(b);
      this._sortables.push(b.container);
    }
  }

  _makeBuilding(x, y, def) {
    const p = this._palette;
    const g = this.add.container(x, y);

    if (def.isCave) {
      // Cave entrance: dark archway carved into a rocky mound.
      const mound = this.add.ellipse(0, 0, 200, 110, p.stone, 1);
      const moundDark = this.add.ellipse(0, 6, 190, 95, 0x000000, 0.18);
      const arch = this.add.ellipse(0, 12, 80, 86, 0x0a0810, 0.95);
      const archInner = this.add.ellipse(0, 14, 60, 70, 0x05030a, 1);
      g.add([mound, moundDark, arch, archInner]);
      const glow = this.add.ellipse(0, 14, 26, 36, def.color, 0.55);
      g.add(glow);
      def._caveGlow = glow;
    } else if (def.isPassive) {
      // Bonfire — small ring of stones with flickering flame.
      const stones = this.add.ellipse(0, 0, 70, 28, p.stone, 1);
      const inner = this.add.ellipse(0, -2, 50, 18, 0x1a1208, 1);
      const flame1 = this.add.ellipse(0, -10, 22, 30, 0xffb066, 0.8);
      const flame2 = this.add.ellipse(0, -14, 12, 22, 0xffe28a, 0.95);
      g.add([stones, inner, flame1, flame2]);
      this.tweens.add({ targets: flame1, scaleY: 1.18, scaleX: 0.92, duration: 320, yoyo: true, repeat: -1 });
      this.tweens.add({ targets: flame2, scaleY: 1.10, scaleX: 0.88, duration: 220, yoyo: true, repeat: -1 });
    } else {
      this._renderArchitecture(g, def, this._world.architecture, p);
    }

    // Building label — always visible.
    const lblBg = this.add.rectangle(0, 60, 110, 20, 0x000000, 0.45);
    const lbl = this.add.text(0, 60, def.label, {
      fontFamily: "system-ui, sans-serif", fontSize: "13px", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5);
    g.add([lblBg, lbl]);

    return {
      def,
      x, y,
      container: g,
      label: lbl,
      labelBg: lblBg,
      promptT: null,
    };
  }

  // Draw the building body into `g` (a container at the building's position),
  // varying shape by the active architecture dial.
  _renderArchitecture(g, def, arch, p) {
    const w = arch.bodyW, h = arch.bodyH;

    // Shared: soft drop shadow on the ground beneath the body.
    g.add(this.add.ellipse(0, h * 0.55 + 6, w * 1.2, 22, 0x000000, 0.30));

    if (arch.roof === "tiered") {
      // PAGODA: two stacked trapezoidal roofs + curved-corner body.
      const body = this.add.rectangle(0, 0, w, h, p.buildingA, 1).setStrokeStyle(2, p.buildingB, 1);
      const roofLo = this.add.triangle(0, -h * 0.55, -w * 0.78, 0, w * 0.78, 0, 0, -h * 0.18, p.roof, 1).setStrokeStyle(2, 0x000000, 0.25);
      const roofHi = this.add.triangle(0, -h * 0.95, -w * 0.55, 0, w * 0.55, 0, 0, -h * 0.30, p.roof, 1).setStrokeStyle(2, 0x000000, 0.25);
      const door = this.add.rectangle(0, h * 0.30, 28, 38, p.buildingB, 1).setStrokeStyle(1.5, 0x000000, 0.4);
      const arch1 = this.add.ellipse(0, h * 0.15, 30, 18, p.accent, 0.85);
      g.add([body, roofLo, roofHi, door, arch1]);
    } else if (arch.roof === "cone") {
      // TENT: tall triangle roof, narrow body, simple flap door.
      const body = this.add.rectangle(0, h * 0.10, w * 0.8, h * 0.7, p.buildingA, 1).setStrokeStyle(2, p.buildingB, 1);
      const roof = this.add.triangle(0, -h * 0.55, -w * 0.55, h * 0.1, w * 0.55, h * 0.1, 0, -h * 0.80, p.roof, 1).setStrokeStyle(2, 0x000000, 0.25);
      const flap = this.add.triangle(0, h * 0.30, -10, 0, 10, 0, 0, 26, p.buildingB, 1);
      g.add([body, roof, flap]);
    } else if (arch.roof === "broken") {
      // RUIN: jagged half-wall, no roof, mossy stones.
      const wall = this.add.rectangle(-w * 0.10, 0, w * 0.7, h * 0.9, p.stone, 1).setStrokeStyle(2, 0x000000, 0.25);
      const broken = this.add.triangle(w * 0.20, -h * 0.30, 0, 0, w * 0.4, 0, w * 0.18, -h * 0.55, p.stone, 1);
      const moss = this.add.ellipse(-w * 0.15, -h * 0.30, w * 0.2, 8, p.tree, 0.5);
      const opening = this.add.rectangle(-w * 0.15, h * 0.15, 22, 40, 0x000000, 0.85);
      g.add([wall, broken, moss, opening]);
    } else if (arch.roof === "leaf") {
      // TREEHOUSE: thick stump + leafy canopy roof.
      const stump = this.add.rectangle(0, h * 0.30, w * 0.3, h * 0.6, 0x6b4830, 1).setStrokeStyle(2, 0x000000, 0.3);
      const body = this.add.rectangle(0, -h * 0.05, w * 0.85, h * 0.55, p.buildingA, 1).setStrokeStyle(2, p.buildingB, 1);
      const leaf1 = this.add.ellipse(0, -h * 0.50, w * 1.1, h * 0.6, p.tree, 1);
      const leaf2 = this.add.ellipse(-w * 0.30, -h * 0.45, w * 0.5, h * 0.4, p.tree, 1);
      const leaf3 = this.add.ellipse( w * 0.30, -h * 0.45, w * 0.5, h * 0.4, p.tree, 1);
      const window1 = this.add.circle(0, -h * 0.05, 8, p.accent, 0.85).setStrokeStyle(1.5, p.buildingB, 1);
      g.add([stump, body, leaf1, leaf2, leaf3, window1]);
    } else if (arch.roof === "thatch") {
      // STILT: body raised on four legs, thatched roof.
      const leg1 = this.add.rectangle(-w * 0.30, h * 0.55, 4, 26, 0x4a3320, 1);
      const leg2 = this.add.rectangle( w * 0.30, h * 0.55, 4, 26, 0x4a3320, 1);
      const leg3 = this.add.rectangle(-w * 0.15, h * 0.55, 4, 26, 0x4a3320, 1);
      const leg4 = this.add.rectangle( w * 0.15, h * 0.55, 4, 26, 0x4a3320, 1);
      const body = this.add.rectangle(0, 0, w, h * 0.85, p.buildingA, 1).setStrokeStyle(2, p.buildingB, 1);
      const roof = this.add.triangle(0, -h * 0.55, -w * 0.65, 0, w * 0.65, 0, 0, -h * 0.50, 0x9c7848, 1).setStrokeStyle(2, 0x000000, 0.25);
      const door = this.add.rectangle(0, h * 0.20, 22, 30, p.buildingB, 1).setStrokeStyle(1.5, 0x000000, 0.4);
      g.add([leg1, leg2, leg3, leg4, body, roof, door]);
    } else {
      // GABLE / cottage default: square body + triangle roof + windows.
      const body = this.add.rectangle(0, 0, w, h, p.buildingA, 1).setStrokeStyle(2, p.buildingB, 1);
      const roof = this.add.triangle(0, -h * 0.65, -w * 0.65, 0, w * 0.65, 0, 0, -h * 0.62, p.roof, 1).setStrokeStyle(2, 0x000000, 0.25);
      const door = this.add.rectangle(0, h * 0.28, 24, 36, p.buildingB, 1).setStrokeStyle(1.5, 0x000000, 0.4);
      const window1 = this.add.rectangle(-w * 0.27, -h * 0.08, 18, 18, p.accent, 0.85).setStrokeStyle(1.5, p.buildingB, 1);
      const window2 = this.add.rectangle( w * 0.27, -h * 0.08, 18, 18, p.accent, 0.85).setStrokeStyle(1.5, p.buildingB, 1);
      g.add([body, roof, door, window1, window2]);
    }

    // Small banner colored by the building's role — keeps wayfinding readable
    // across architecture changes.
    const flagPole = this.add.rectangle(w * 0.48, -h * 0.90, 2, 30, 0x4a3320, 1);
    const flag = this.add.triangle(w * 0.48 + 6, -h * 0.82, 0, 0, 14, 6, 0, 12, def.color, 1);
    g.add([flagPole, flag]);
  }

  // ---------- NPCs ----------

  _buildNPCs() {
    const cx = HUB_W / 2;
    const cy = HUB_H * 0.55;
    this.npcs = [];

    const friends = Storage.load().plot.friendsFound;

    // Position friends around the bonfire if found.
    const positions = [
      { dx: -50, dy: 60 },
      { dx:  50, dy: 60 },
      { dx:   0, dy: 90 },
    ];
    let i = 0;
    for (const fid of friends) {
      const c = COMPANIONS[fid];
      if (!c) continue;
      const pos = positions[i++ % positions.length];
      const nx = cx + pos.dx;
      const ny = cy + pos.dy;
      this.npcs.push(this._makeNPC(nx, ny, c));
    }
  }

  _makeNPC(x, y, companion) {
    const g = this.add.container(x, y);
    this._sortables.push(g);
    // Body — rounded pastel blob with a small head.
    const shadow = this.add.ellipse(0, 14, 28, 8, 0x000000, 0.35);
    const body = this.add.ellipse(0, 0, 22, 28, companion.color, 1).setStrokeStyle(1.5, 0x000000, 0.3);
    const head = this.add.circle(0, -16, 8, 0xf3d4a8, 1).setStrokeStyle(1.5, 0x000000, 0.3);
    const eye1 = this.add.circle(-3, -16, 1.4, 0x000000, 1);
    const eye2 = this.add.circle( 3, -16, 1.4, 0x000000, 1);
    g.add([shadow, body, head, eye1, eye2]);
    // Idle bob.
    this.tweens.add({ targets: g, y: y - 3, duration: 1200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    // Name label.
    const lbl = this.add.text(0, -34, companion.name, {
      fontFamily: "system-ui, sans-serif", fontSize: "12px", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5).setShadow(0, 0, "#000000", 4, true, true);
    g.add(lbl);

    return { x, y, container: g, companion };
  }

  // ---------- Player ----------

  _buildPlayer() {
    const cx = HUB_W / 2;
    const cy = HUB_H * 0.78; // start at the south path
    this.player = this.physics.add.image(cx, cy, "player");
    this.player.setCircle(14, 10, 10);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(cy);
    this._sortables.push(this.player);

    // Soft drop shadow that follows the player; sells the y-sort depth.
    this.playerShadow = this.add.ellipse(cx, cy + 12, 26, 8, 0x000000, 0.35).setDepth(cy - 0.5);

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
  }

  // ---------- Weather + ambient ----------

  _buildWeather() {
    const w = this._world.weather;
    if (!w || w.particleKind === "none") return;

    if (w.particleKind === "fog") {
      // Three soft fog ribbons drifting slowly across the playfield. They
      // attach to the world (not the camera), so the player walks through.
      for (let i = 0; i < 3; i++) {
        const y = HUB_H * (0.35 + i * 0.18);
        const ribbon = this.add.ellipse(-200, y, 400, 80, 0xffffff, 0.18).setDepth(180);
        this.tweens.add({
          targets: ribbon, x: HUB_W + 300,
          duration: 22000 + Math.random() * 8000,
          repeat: -1, delay: i * 4000,
          onRepeat: () => { ribbon.x = -300; },
        });
      }
    } else if (w.particleKind === "motes") {
      // Golden-hour motes: small glowing specks drifting up.
      for (let i = 0; i < 28; i++) {
        const x = Math.random() * HUB_W;
        const y = HUB_H * 0.3 + Math.random() * (HUB_H * 0.6);
        const dot = this.add.circle(x, y, 1.5, 0xffe28a, 0.7).setDepth(170);
        this.tweens.add({
          targets: dot, y: y - 120, alpha: 0,
          duration: 5000 + Math.random() * 3000,
          delay: Math.random() * 4000, repeat: -1,
          onRepeat: () => {
            dot.x = Math.random() * HUB_W;
            dot.y = HUB_H * 0.3 + Math.random() * (HUB_H * 0.6);
            dot.alpha = 0.7;
          },
        });
      }
    } else if (w.particleKind === "rain") {
      // Light drizzle: thin streaks slanting down.
      for (let i = 0; i < 60; i++) {
        const x = Math.random() * HUB_W;
        const y = Math.random() * HUB_H;
        const drop = this.add.rectangle(x, y, 1.5, 8, 0xbcdfff, 0.55).setRotation(0.25).setDepth(180);
        this.tweens.add({
          targets: drop, y: y + 220, x: x + 40, alpha: 0,
          duration: 700 + Math.random() * 300, repeat: -1,
          onRepeat: () => {
            drop.x = Math.random() * HUB_W;
            drop.y = -10;
            drop.alpha = 0.55;
          },
        });
      }
    } else if (w.particleKind === "aurora") {
      // Aurora: wide soft horizontal bands shifting in alpha.
      for (let i = 0; i < 2; i++) {
        const y = HUB_H * (0.10 + i * 0.06);
        const band = this.add.rectangle(HUB_W / 2, y, HUB_W * 1.2, 36, 0x9aff9a, 0.18)
          .setBlendMode(Phaser.BlendModes.ADD).setDepth(-110);
        this.tweens.add({ targets: band, alpha: 0.30, duration: 4000, yoyo: true, repeat: -1 });
      }
    }
  }

  _buildAmbientTint() {
    const p = this._palette;
    if (!p.vignette || p.vignette <= 0) return;
    const { width, height } = this.scale;
    this.ambientTint = this.add.rectangle(0, 0, width, height, p.vignetteColor, p.vignette)
      .setOrigin(0).setScrollFactor(0).setDepth(240);
  }

  _setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("W,A,S,D,E");
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.joystick = new Joystick(this, { side: "left" });

    // Tapping the right half also acts as interact.
    this.input.on("pointerdown", (p) => {
      if (p.x > this.scale.width / 2) this._tryInteract();
    });
  }

  _buildHUD() {
    new CurrencyBar(this);

    const { width } = this.scale;
    // World name banner — synthesized + renameable at the bonfire.
    const w = World.current();
    this.worldNameText = this.add.text(width / 2, 50, w.name, {
      fontFamily: '"Iowan Old Style", Georgia, serif',
      fontSize: "16px", color: "#ffffff", fontStyle: "italic",
    }).setOrigin(0.5).setDepth(200).setScrollFactor(0).setShadow(0, 0, "#000", 6, true, true);

    // Raid timer text.
    this.raidText = this.add.text(width / 2, 72, "", {
      fontFamily: "system-ui, sans-serif", fontSize: "13px", color: "#ffe28a",
    }).setOrigin(0.5).setDepth(200).setScrollFactor(0);

    // Materials counter.
    this.matText = this.add.text(width - 16, 50, "", {
      fontFamily: "system-ui, sans-serif", fontSize: "14px", color: "#a0e0c0", fontStyle: "bold",
    }).setOrigin(1, 0).setDepth(200).setScrollFactor(0);

    // Interact prompt — appears when near a building or NPC.
    this.interactPrompt = this.add.text(width / 2, this.scale.height - 80, "", {
      fontFamily: "system-ui, sans-serif", fontSize: "16px", color: "#ffffff", fontStyle: "bold",
      backgroundColor: "rgba(10,10,20,0.65)", padding: { x: 12, y: 8 },
    }).setOrigin(0.5).setDepth(220).setScrollFactor(0).setVisible(false);

    // Pulse effect.
    this.tweens.add({
      targets: this.interactPrompt, alpha: 0.7, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut",
    });
  }

  _onResize(size) {
    if (this.raidText) this.raidText.setX(size.width / 2);
    if (this.matText) this.matText.setX(size.width - 16);
    if (this.interactPrompt) {
      this.interactPrompt.setX(size.width / 2);
      this.interactPrompt.setY(size.height - 80);
    }
    if (this.ambientTint) {
      this.ambientTint.setSize(size.width, size.height);
    }
    if (this.worldNameText) {
      this.worldNameText.setX(size.width / 2);
    }
  }

  // ---------- Update loop ----------

  update(_t, dtMs) {
    const dt = dtMs / 1000;

    // Skip movement input while the rename overlay is capturing keys.
    if (this._renameActive) {
      this.player.setVelocity(0, 0);
      this._sortDepths();
      return;
    }

    // Movement.
    let mx = 0, my = 0;
    if (this.cursors.left.isDown  || this.keys.A.isDown) mx -= 1;
    if (this.cursors.right.isDown || this.keys.D.isDown) mx += 1;
    if (this.cursors.up.isDown    || this.keys.W.isDown) my -= 1;
    if (this.cursors.down.isDown  || this.keys.S.isDown) my += 1;
    const j = this.joystick.getVector();
    if (j.x !== 0 || j.y !== 0) { mx = j.x; my = j.y; }
    const len = Math.hypot(mx, my);
    if (len > 0) {
      const speed = 220;
      this.player.setVelocity((mx / len) * speed, (my / len) * speed);
      this.player.setRotation(Math.atan2(my, mx));
    } else {
      this.player.setVelocity(0, 0);
    }

    // Y-based depth sort + shadow follow.
    this._sortDepths();

    // Find nearest interactable.
    this._updateInteractable();

    // Keyboard interact.
    if (Phaser.Input.Keyboard.JustDown(this.keys.E) ||
        Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this._tryInteract();
    }

    // Materials display.
    if (this.matText) {
      const m = getBalances().materials || 0;
      this.matText.setText(m > 0 ? `✦ ${m}` : "");
    }

    // Raid timer countdown.
    this._tickRaid(dt);
  }

  // Y-sort every dynamic object so things lower on screen render on top.
  _sortDepths() {
    for (const o of this._sortables) {
      if (o && o.setDepth) o.setDepth(o.y);
    }
    if (this.playerShadow) {
      this.playerShadow.x = this.player.x;
      this.playerShadow.y = this.player.y + 12;
      this.playerShadow.setDepth(this.player.y - 0.5);
    }
  }

  _updateInteractable() {
    const px = this.player.x, py = this.player.y;

    let near = null;
    let nearKind = null;
    let nearDist2 = 130 * 130;

    for (const b of this.buildings) {
      const d2 = (b.x - px) * (b.x - px) + (b.y - py) * (b.y - py);
      if (d2 < nearDist2) { nearDist2 = d2; near = b; nearKind = "building"; }
    }
    for (const n of this.npcs) {
      const d2 = (n.x - px) * (n.x - px) + (n.y - py) * (n.y - py);
      if (d2 < nearDist2) { nearDist2 = d2; near = n; nearKind = "npc"; }
    }

    this._nearTarget = near ? { kind: nearKind, ref: near } : null;

    if (!near) {
      this.interactPrompt.setVisible(false);
      return;
    }

    let label;
    if (nearKind === "building") {
      const def = near.def;
      if (def.isPassive) {
        label = "Rest at Bonfire (E)";
      } else if (def.isCave) {
        label = this._raidActive ? "DEFEND THE CLEARING (E)" : "Enter Cave Mouth (E)";
      } else {
        label = `${def.label} — ${def.sub} (E)`;
      }
    } else {
      label = `Talk to ${near.companion.name} (E)`;
    }
    this.interactPrompt.setText(label).setVisible(true);
  }

  _tryInteract() {
    const t = this._nearTarget;
    if (!t) return;
    if (t.kind === "building") {
      const def = t.ref.def;
      if (def.isPassive) {
        // Bonfire = rename-the-world affordance.
        this._openRenameOverlay();
        return;
      }
      if (def.scene) {
        if (def.scene === "GameScene") {
          // If a raid is active, mark the run as a raid run via storage.
          if (this._raidActive) {
            Storage.mutate((s) => { s.__hubCarry = { isRaid: true }; });
          }
          this.scene.start("GameScene");
        } else {
          this.scene.start(def.scene);
        }
      }
    } else if (t.kind === "npc") {
      this._talkTo(t.ref.companion);
    }
  }

  // ---------- Plot / dialogue ----------

  _playBeat(beatId) {
    const beat = findBeat(beatId);
    if (!beat) return;
    const vars = World.templateVars();
    const lines = beat.lines.map((ln) => fillTemplate(ln, vars));
    World.markBeatSeen(beatId);

    this.scene.launch("DialogueScene", {
      lines,
      speaker: beat.speaker ? fillTemplate(beat.speaker, vars) : null,
      onClose: () => {
        if (beatId === "arrival") {
          // Auto-summon first friend after the arrival beat.
          this.time.delayedCall(700, () => this._summonFirstFriend());
        }
      },
    });
  }

  _summonFirstFriend() {
    const friend = World.firstFriend();
    if (!friend) return;
    if (World.hasFriend(friend.id)) return;

    // Visual: friend "falls in" near the bonfire.
    const cx = HUB_W / 2;
    const cy = HUB_H * 0.55 + 60;
    const fakeShadow = this.add.ellipse(cx, cy + 10, 8, 4, 0x000000, 0.5).setDepth(7);
    const falling = this.add.circle(cx, -40, 12, friend.color, 1).setDepth(11)
      .setStrokeStyle(2, 0x000000, 0.5);
    this.tweens.add({
      targets: fakeShadow, scaleX: 6, scaleY: 6, alpha: 0.7,
      duration: 900, ease: "Cubic.easeIn",
    });
    this.tweens.add({
      targets: falling, y: cy, duration: 900, ease: "Cubic.easeIn",
      onComplete: () => {
        falling.destroy();
        fakeShadow.destroy();
        this.cameras.main.shake(220, 0.008);
        World.addFriend(friend.id);
        // Add NPC to hub immediately.
        this.npcs.push(this._makeNPC(cx, cy, friend));
        this.time.delayedCall(500, () => this._playBeat("first_friend"));
      },
    });
  }

  _talkTo(companion) {
    const vars = World.templateVars();
    const friend = World.firstFriend();
    let lines;
    if (companion.id === friend.id) {
      lines = [
        `${companion.name}: "Still here. Still weird. Still you."`,
        `${companion.name}: "Whatever's coming through the trees — let me know when. I'm not letting this place eat us."`,
      ];
    } else {
      lines = [
        `${companion.name}: "Hey. You okay?"`,
        `${companion.name}: "We'll figure out the door. One run at a time."`,
      ];
    }
    this.scene.launch("DialogueScene", {
      lines: lines.map((ln) => fillTemplate(ln, vars)),
      speaker: companion.name,
    });
  }

  // ---------- Raid ----------

  _tickRaid(dt) {
    if (this._raidTimerSec < 0) {
      this.raidText.setText("");
      return;
    }
    if (this._raidActive) {
      // Active raid: pulse the cave glow red.
      const cave = this.buildings.find((b) => b.def.id === "cave");
      if (cave && cave.def._caveGlow) {
        cave.def._caveGlow.setFillStyle(0xff4d4d, 0.7 + 0.3 * Math.sin(this.time.now / 220));
      }
      this.raidText.setText("RAID ACTIVE — defend the clearing");
      this.raidText.setColor("#ff7878");
      return;
    }
    this._raidTimerSec -= dt;
    if (this._raidTimerSec <= 0) {
      this._beginRaid();
      return;
    }
    const m = Math.floor(this._raidTimerSec / 60);
    const s = Math.floor(this._raidTimerSec % 60).toString().padStart(2, "0");
    this.raidText.setText(`Next raid: ${m}:${s}`);
    this.raidText.setColor("#ffe28a");
  }

  _beginRaid() {
    this._raidActive = true;
    this._raidTimerSec = 0;
    this.cameras.main.flash(400, 220, 60, 60);
    this._flash("Something is coming through the trees.", { color: "#ff7878" });
    if (!World.hasSeenBeat("first_raid_warning")) {
      this.time.delayedCall(900, () => this._playBeat("first_raid_warning"));
    }
  }

  // ---------- Rename overlay ----------

  _openRenameOverlay() {
    if (this._renameActive) return;
    this._renameActive = true;
    const { width, height } = this.scale;

    const dim = this.add.rectangle(0, 0, width, height, 0x000000, 0.55)
      .setOrigin(0).setScrollFactor(0).setDepth(400);
    const prompt = this.add.text(width / 2, height * 0.36, "Name this place", {
      fontFamily: '"Iowan Old Style", Georgia, serif',
      fontSize: "22px", color: "#fff0b8", fontStyle: "italic",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(401);
    const hint = this.add.text(width / 2, height * 0.44, "(Enter to confirm, Esc to cancel)", {
      fontFamily: "system-ui, sans-serif", fontSize: "12px", color: "#cccccc",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(401);

    let buf = World.current().name || "";
    const inputT = this.add.text(width / 2, height * 0.54, buf || "_", {
      fontFamily: '"Iowan Old Style", Georgia, serif', fontSize: "26px",
      color: "#fff0b8", fontStyle: "italic",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(401);

    const cleanup = () => {
      this.input.keyboard.off("keydown", keydown);
      dim.destroy(); prompt.destroy(); hint.destroy(); inputT.destroy();
      this._renameActive = false;
    };

    const keydown = (ev) => {
      if (ev.key === "Escape") { cleanup(); return; }
      if (ev.key === "Enter") {
        if (buf.trim()) {
          World.renameWorld(buf);
          if (this.worldNameText) this.worldNameText.setText(World.current().name);
        }
        cleanup();
        return;
      }
      if (ev.key === "Backspace") {
        buf = buf.slice(0, -1);
        inputT.setText(buf || "_");
        return;
      }
      if (ev.key.length === 1 && buf.length < 32 && /[\w '\-.]/.test(ev.key)) {
        buf += ev.key;
        inputT.setText(buf);
      }
    };
    this.input.keyboard.on("keydown", keydown);
  }

  // ---------- Misc ----------

  _flash(text, { color = "#ffffff" } = {}) {
    const t = this.add.text(this.scale.width / 2, 110, text, {
      fontFamily: "system-ui, sans-serif", fontSize: "15px", color,
      backgroundColor: "rgba(10,10,20,0.7)", padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setDepth(300).setScrollFactor(0).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, duration: 240, hold: 1700, yoyo: true,
      onComplete: () => t.destroy() });
  }

  _handleDailyLogin() {
    const today = utcDayIndex();
    const s = Storage.load();
    if (s.daily.lastLoginDay === today) return;
    const yesterday = today - 1;
    const nextStreak = s.daily.lastLoginDay === yesterday ? Math.min(s.daily.streak + 1, 7) : 1;
    const reward = ECONOMY.dailyLoginGems[nextStreak - 1] || ECONOMY.dailyLoginGems.at(-1);
    Storage.mutate((st) => {
      st.daily.lastLoginDay = today;
      st.daily.streak = nextStreak;
    });
    addGems(reward, `daily_login streak=${nextStreak}`);
    this._flash(`Day ${nextStreak} bonus: +${reward} ◇`, { color: "#49d6ff" });
  }
}

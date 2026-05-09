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
    const palette = World.current().palette;
    this._palette = palette;

    this.physics.world.setBounds(0, 0, HUB_W, HUB_H);
    this.cameras.main.setBackgroundColor(`#${palette.sky.toString(16).padStart(6, "0")}`);
    this.cameras.main.setBounds(0, 0, HUB_W, HUB_H);

    this._buildGround();
    this._buildScenery();
    this._buildBuildings();
    this._buildNPCs();
    this._buildPlayer();
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
    // Trees scattered around the perimeter — simple triangle silhouettes.
    const treeG = this.add.graphics().setDepth(2);
    const tries = 60;
    const placed = [];
    for (let i = 0; i < tries; i++) {
      const x = 80 + Math.random() * (HUB_W - 160);
      const y = HUB_H * 0.30 + Math.random() * (HUB_H * 0.65);
      // Avoid the central clearing where buildings sit.
      const cx = HUB_W / 2, cy = HUB_H * 0.55;
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy < 380 * 380) continue;
      placed.push({ x, y });
      const h = 36 + Math.random() * 24;
      // trunk
      treeG.fillStyle(0x4a3320, 1);
      treeG.fillRect(x - 2, y - 4, 4, 10);
      // canopy (triangle)
      treeG.fillStyle(p.tree, 1);
      treeG.fillTriangle(x - h * 0.45, y, x + h * 0.45, y, x, y - h);
      treeG.fillStyle(0xffffff, 0.10);
      treeG.fillTriangle(x - h * 0.30, y - 2, x + h * 0.05, y - h * 0.4, x, y - h);
    }
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
    }
  }

  _makeBuilding(x, y, def) {
    const p = this._palette;
    const g = this.add.container(x, y).setDepth(5);

    if (def.isCave) {
      // Cave entrance: dark archway carved into a rocky mound.
      const mound = this.add.ellipse(0, 0, 200, 110, p.stone, 1);
      const moundDark = this.add.ellipse(0, 6, 190, 95, 0x000000, 0.18);
      const arch = this.add.ellipse(0, 12, 80, 86, 0x0a0810, 0.95);
      const archInner = this.add.ellipse(0, 14, 60, 70, 0x05030a, 1);
      g.add([mound, moundDark, arch, archInner]);
      // Glow inside the cave — color shifts to red during raid.
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
      // Hut: square wood body + triangle roof + small window + door.
      const shadow = this.add.ellipse(0, 38, 160, 24, 0x000000, 0.30);
      const body = this.add.rectangle(0, 0, 132, 84, p.buildingA, 1).setStrokeStyle(2, p.buildingB, 1);
      const roof = this.add.triangle(0, -56, -84, 0, 84, 0, 0, -52, p.roof, 1).setStrokeStyle(2, 0x000000, 0.25);
      const door = this.add.rectangle(0, 24, 24, 36, p.buildingB, 1).setStrokeStyle(1.5, 0x000000, 0.4);
      const window1 = this.add.rectangle(-36, -6, 18, 18, p.accent, 0.85).setStrokeStyle(1.5, p.buildingB, 1);
      const window2 = this.add.rectangle( 36, -6, 18, 18, p.accent, 0.85).setStrokeStyle(1.5, p.buildingB, 1);
      // Tiny banner colored by the building's role.
      const flagPole = this.add.rectangle(64, -76, 2, 30, 0x4a3320, 1);
      const flag = this.add.triangle(70, -68, 0, 0, 14, 6, 0, 12, def.color, 1);
      g.add([shadow, body, roof, door, window1, window2, flagPole, flag]);
    }

    // Building label — always visible.
    const lblBg = this.add.rectangle(0, 60, 110, 20, 0x000000, 0.45);
    const lbl = this.add.text(0, 60, def.label, {
      fontFamily: "system-ui, sans-serif", fontSize: "13px", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5);
    g.add([lblBg, lbl]);

    // Interaction zone (invisible). Stored for proximity checks.
    return {
      def,
      x, y,
      container: g,
      label: lbl,
      labelBg: lblBg,
      promptT: null, // populated when player is near
    };
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
    const g = this.add.container(x, y).setDepth(8);
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
    this.player.setDepth(10);

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
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
    // World name banner — small italic label of the active archetype.
    const w = World.current();
    this.add.text(width / 2, 50, w.name, {
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
  }

  // ---------- Update loop ----------

  update(_t, dtMs) {
    const dt = dtMs / 1000;

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
        // Bonfire = save reset gesture for v1; we just show a flavor flash.
        this._flash("You sit by the fire. The wind softens.");
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

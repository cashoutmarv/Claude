// Kingdom Hearts–style awakening. Pure black, dim spotlight, gold cursive
// serif. The full intro per DESIGN.md §3:
//
//   opening lines → Q1 passion → Q2 seeking → Q3 family → Q4 genre →
//   name yourself → name your three friends → closing line → HubScene
//
// All answers are persisted via Storage.mutate at the end. Each question's
// options come from a small table defined here; the catalog is intentionally
// inlined (not in src/config/) — it's small and is part of the intro's UX,
// not data the rest of the game reads.

import { Storage } from "../services/storage.js";

const GOLD        = "#e6c474";
const GOLD_DIM    = "#7a6a3a";
const GOLD_BRIGHT = "#fff0b8";
const FONT = '"Iowan Old Style", "Palatino", "Garamond", Georgia, serif';

const QUESTIONS = [
  {
    key: "passion",
    prompt: "What are you most passionate about?",
    options: [
      { id: "adventure",  label: "the unknown — the next horizon" },
      { id: "creation",   label: "making something with your hands" },
      { id: "connection", label: "the people you love" },
      { id: "knowledge",  label: "understanding the why of things" },
      { id: "freedom",    label: "the open road, no map" },
      { id: "courage",    label: "facing the thing that scares you" },
    ],
  },
  {
    key: "seeking",
    prompt: "What do you seek in life?",
    options: [
      { id: "belonging", label: "a place where you fit" },
      { id: "freedom",   label: "the right to choose your own shape" },
      { id: "meaning",   label: "a story worth being inside of" },
      { id: "mastery",   label: "to be excellent at something true" },
    ],
  },
  {
    key: "family",
    prompt: "What does family mean to you?",
    options: [
      { id: "blood",  label: "the people who raised you" },
      { id: "chosen", label: "the people who choose you back" },
      { id: "found",  label: "the strangers who became home" },
      { id: "forged", label: "the ones you built something with" },
    ],
  },
  {
    key: "genre",
    prompt: "What kind of story did you fall into?",
    options: [
      { id: "fantasy",   label: "epic fantasy" },
      { id: "scifi",     label: "cosmic sci-fi" },
      { id: "horror",    label: "gothic horror" },
      { id: "adventure", label: "adventure / western" },
      { id: "slice",     label: "slice of life" },
      { id: "surreal",   label: "surreal / dreamlike" },
    ],
  },
];

const DEFAULT_PLAYER_NAME  = "Traveler";
const DEFAULT_FRIEND_NAMES = ["Jamie", "Sam", "Riley"];

export class IntroScene extends Phaser.Scene {
  constructor() { super("IntroScene"); }

  create() {
    this.cameras.main.setBackgroundColor("#000000");
    this.cameras.main.fadeIn(900, 0, 0, 0);

    const { width, height } = this.scale;

    // Soft spotlight gradient (a big dim circle that breathes slowly).
    this.spot = this.add
      .circle(width / 2, height / 2, Math.max(width, height) * 0.55, 0x2a2010, 0.18)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: this.spot, alpha: 0.10,
      duration: 4000, yoyo: true, repeat: -1, ease: "Sine.easeInOut",
    });

    this._spawnMotes();

    this.answers     = { passion: null, seeking: null, family: null, genre: null };
    this.playerName  = "";
    this.friendNames = ["", "", ""];

    this._showOpening();

    this.scale.on("resize", this._onResize, this);
    this.events.once("shutdown", () => this.scale.off("resize", this._onResize, this));
  }

  _onResize(size) {
    if (this.spot) this.spot.setPosition(size.width / 2, size.height / 2);
  }

  _spawnMotes() {
    const { width, height } = this.scale;
    for (let i = 0; i < 24; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const dot = this.add.circle(x, y, Math.random() * 1.4 + 0.4, 0xe6c474, 0.5);
      this.tweens.add({
        targets: dot,
        y: y - (40 + Math.random() * 80),
        alpha: 0,
        duration: 6000 + Math.random() * 4000,
        delay: Math.random() * 4000,
        repeat: -1,
        ease: "Sine.easeInOut",
        onRepeat: () => {
          dot.x = Math.random() * this.scale.width;
          dot.y = this.scale.height + 10;
          dot.alpha = 0.5;
        },
      });
    }
  }

  // Fade in a line of gold italic text.
  _line(y, text, { size = 22, italic = true, color = GOLD } = {}) {
    const t = this.add.text(this.scale.width / 2, y, text, {
      fontFamily: FONT,
      fontSize: size + "px",
      color, align: "center",
      fontStyle: italic ? "italic" : "normal",
    }).setOrigin(0.5).setAlpha(0).setShadow(0, 0, "#e6c474", 8, true, true);
    this.tweens.add({ targets: t, alpha: 1, duration: 900, ease: "Sine.easeOut" });
    return t;
  }

  _showOpening() {
    const { height } = this.scale;
    const lines = [
      "There was a portal in the grass.",
      "You leaned in, and the dark leaned back.",
      "Before this story can begin —",
    ];
    const ys = [height * 0.30, height * 0.42, height * 0.56];
    const objs = [];
    lines.forEach((ln, i) => {
      this.time.delayedCall(900 + i * 1100, () => {
        objs.push(this._line(ys[i], ln));
      });
    });
    this.time.delayedCall(900 + lines.length * 1100 + 1300, () => {
      this.tweens.add({
        targets: objs, alpha: 0, duration: 900,
        onComplete: () => {
          objs.forEach((o) => o.destroy());
          this._showQuestion(0);
        },
      });
    });
  }

  _showQuestion(idx) {
    const q = QUESTIONS[idx];
    const { width, height } = this.scale;

    const promptT = this._line(height * 0.18, q.prompt, { size: 26 });

    const startY = height * 0.32;
    const stepY = Math.min(48, (height * 0.6) / q.options.length);
    const opts = [];
    q.options.forEach((opt, i) => {
      const t = this.add.text(width / 2, startY + i * stepY, opt.label, {
        fontFamily: FONT,
        fontSize: "20px",
        color: GOLD_DIM,
        fontStyle: "italic",
      }).setOrigin(0.5).setAlpha(0).setInteractive({ useHandCursor: true });

      this.tweens.add({
        targets: t, alpha: 1, duration: 600, delay: 250 + i * 150, ease: "Sine.easeOut",
      });
      t.on("pointerover", () => t.setColor(GOLD_BRIGHT));
      t.on("pointerout",  () => t.setColor(GOLD_DIM));
      t.on("pointerdown", () => {
        this.answers[q.key] = opt.id;
        t.setColor(GOLD_BRIGHT);
        this.tweens.add({
          targets: [promptT, ...opts], alpha: 0, duration: 700, delay: 250,
          onComplete: () => {
            promptT.destroy();
            opts.forEach((o) => o.destroy());
            if (idx + 1 < QUESTIONS.length) {
              this.time.delayedCall(300, () => this._showQuestion(idx + 1));
            } else {
              this.time.delayedCall(300, () => this._showPlayerNamePrompt());
            }
          },
        });
      });
      opts.push(t);
    });
  }

  // Prompt the player for their own name. Type to enter; Enter to confirm;
  // tap "skip" to accept the default. We never use a real <input> because
  // Phaser's RESIZE scale mode + iOS keyboards fight each other.
  _showPlayerNamePrompt() {
    const { width, height } = this.scale;
    const promptT = this._line(height * 0.28, "And what should the world call you?", { size: 24 });
    const subT    = this._line(height * 0.36, "(type a name, or skip to be called " + DEFAULT_PLAYER_NAME + ")",
                              { size: 14, color: GOLD_DIM });
    const nameT = this.add.text(width / 2, height * 0.50, "_", {
      fontFamily: FONT, fontSize: "30px", color: GOLD_BRIGHT, fontStyle: "italic",
    }).setOrigin(0.5).setShadow(0, 0, "#e6c474", 10, true, true);

    const skipT = this.add.text(width / 2, height * 0.62, "skip", {
      fontFamily: FONT, fontSize: "16px", color: GOLD_DIM, fontStyle: "italic",
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    skipT.on("pointerover", () => skipT.setColor(GOLD_BRIGHT));
    skipT.on("pointerout",  () => skipT.setColor(GOLD_DIM));
    skipT.on("pointerdown", () => done());

    const update = () => {
      nameT.setText(this.playerName.length > 0 ? this.playerName : "_");
    };
    const keydown = (ev) => {
      if (ev.key === "Enter") { done(); return; }
      if (ev.key === "Backspace") {
        this.playerName = this.playerName.slice(0, -1);
        update();
        return;
      }
      if (ev.key.length === 1 && this.playerName.length < 16 && /[\w '\-.]/.test(ev.key)) {
        this.playerName += ev.key;
        update();
      }
    };
    this.input.keyboard.on("keydown", keydown);

    const done = () => {
      this.input.keyboard.off("keydown", keydown);
      const fade = [promptT, subT, nameT, skipT];
      this.tweens.add({
        targets: fade, alpha: 0, duration: 700,
        onComplete: () => {
          fade.forEach((o) => o.destroy());
          this._showFriendPrompt(0);
        },
      });
    };
  }

  // Prompt for friend slot N (0..2). Same UX as the player name prompt.
  _showFriendPrompt(slot) {
    const { width, height } = this.scale;
    const ordinal = ["the first", "the second", "the third"][slot];
    const promptT = this._line(
      height * 0.24,
      `And ${ordinal} friend who fell with you?`,
      { size: 24 },
    );
    const subT = this._line(
      height * 0.32,
      "(type a name, or skip to call them " + DEFAULT_FRIEND_NAMES[slot] + ")",
      { size: 14, color: GOLD_DIM },
    );
    const nameT = this.add.text(width / 2, height * 0.46, "_", {
      fontFamily: FONT, fontSize: "28px", color: GOLD_BRIGHT, fontStyle: "italic",
    }).setOrigin(0.5).setShadow(0, 0, "#e6c474", 10, true, true);
    const skipT = this.add.text(width / 2, height * 0.58, "skip", {
      fontFamily: FONT, fontSize: "16px", color: GOLD_DIM, fontStyle: "italic",
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    skipT.on("pointerover", () => skipT.setColor(GOLD_BRIGHT));
    skipT.on("pointerout",  () => skipT.setColor(GOLD_DIM));
    skipT.on("pointerdown", () => done());

    let buffer = "";
    const update = () => nameT.setText(buffer.length > 0 ? buffer : "_");
    const keydown = (ev) => {
      if (ev.key === "Enter") { done(); return; }
      if (ev.key === "Backspace") { buffer = buffer.slice(0, -1); update(); return; }
      if (ev.key.length === 1 && buffer.length < 16 && /[\w '\-.]/.test(ev.key)) {
        buffer += ev.key;
        update();
      }
    };
    this.input.keyboard.on("keydown", keydown);

    const done = () => {
      this.input.keyboard.off("keydown", keydown);
      this.friendNames[slot] = buffer;
      const fade = [promptT, subT, nameT, skipT];
      this.tweens.add({
        targets: fade, alpha: 0, duration: 700,
        onComplete: () => {
          fade.forEach((o) => o.destroy());
          if (slot + 1 < 3) this._showFriendPrompt(slot + 1);
          else this._finish();
        },
      });
    };
  }

  _finish() {
    const finalPlayerName  = this.playerName.trim().slice(0, 16) || DEFAULT_PLAYER_NAME;
    const finalFriendNames = this.friendNames.map(
      (n, i) => n.trim().slice(0, 16) || DEFAULT_FRIEND_NAMES[i],
    );

    Storage.mutate((s) => {
      s.player.name = finalPlayerName;
      s.friends = [0, 1, 2].map((i) => ({
        slot: i + 1,
        name: finalFriendNames[i],
        arrived: false,
      }));
      s.world.answers = {
        passion: this.answers.passion,
        seeking: this.answers.seeking,
        family:  this.answers.family,
      };
      s.world.genre    = this.answers.genre;
      s.world.chosenAt = Date.now();
    });

    const closing = this._line(this.scale.height * 0.5, "the world remembers.", { size: 26 });
    this.time.delayedCall(1800, () => {
      this.cameras.main.fadeOut(1100, 0, 0, 0);
      this.time.delayedCall(1200, () => this.scene.start("HubScene"));
    });
  }
}

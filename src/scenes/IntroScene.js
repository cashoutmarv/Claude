// Kingdom-Hearts-style awakening. Pure black, dim spotlight, gold serif
// cursive text. Three questions: passion, seeking, family. The answers
// generate a world archetype + companion + dialogue tone, and unlock the
// hub. Player can optionally enter their first name on the last screen.
//
// Flow:
//   FADE IN → INTRO LINE → Q1 → Q2 → Q3 → NAME → FADE OUT → HubScene
//
// Visual rules: no buttons that look modern. Text is large, italic, gold,
// drop-shadowed. Choices appear as faint underlined phrases that brighten
// when hovered/tapped. The whole scene reads like a memory.

import { World } from "../services/world.js";

const GOLD       = "#e6c474";
const GOLD_DIM   = "#7a6a3a";
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
      { id: "blood",   label: "the people who raised you" },
      { id: "chosen",  label: "the people who choose you back" },
      { id: "found",   label: "the strangers who became home" },
      { id: "forged",  label: "the ones you built something with" },
    ],
  },
];

export class IntroScene extends Phaser.Scene {
  constructor() { super("IntroScene"); }

  create() {
    this.cameras.main.setBackgroundColor("#000000");
    this.cameras.main.fadeIn(900, 0, 0, 0);

    const { width, height } = this.scale;

    // Soft spotlight gradient (a faint radial-feeling overlay using a big
    // dim circle). It moves slowly to feel alive.
    this.spot = this.add.circle(width / 2, height / 2, Math.max(width, height) * 0.55, 0x2a2010, 0.18)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: this.spot, alpha: 0.10, duration: 4000, yoyo: true, repeat: -1, ease: "Sine.easeInOut",
    });

    // Subtle dust motes drifting upward.
    this._spawnMotes();

    this.answers = { passion: null, seeking: null, family: null };
    this.playerName = "";

    this._showOpening();

    this.scale.on("resize", this._onResize, this);
    this.events.once("shutdown", () => this.scale.off("resize", this._onResize, this));
  }

  _onResize(size) {
    if (this.spot) this.spot.setPosition(size.width / 2, size.height / 2);
  }

  _spawnMotes() {
    const { width, height } = this.scale;
    for (let i = 0; i < 28; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const dot = this.add.circle(x, y, Math.random() * 1.6 + 0.4, 0xe6c474, 0.5);
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

  // Slowly fade in a line of gold italic text. Returns the text object.
  _line(y, text, { size = 22, italic = true, color = GOLD, align = "center" } = {}) {
    const t = this.add.text(this.scale.width / 2, y, text, {
      fontFamily: FONT,
      fontSize: size + "px",
      color, align,
      fontStyle: italic ? "italic" : "normal",
    }).setOrigin(0.5).setAlpha(0).setShadow(0, 0, "#e6c474", 8, true, true);
    this.tweens.add({ targets: t, alpha: 1, duration: 900, ease: "Sine.easeOut" });
    return t;
  }

  _showOpening() {
    const { width, height } = this.scale;
    const lines = [
      "There was a portal in the grass.",
      "You leaned in, and the dark leaned back.",
      "Now you are here, in the world you knew best.",
      "Before this story can begin —",
    ];
    const ys = [
      height * 0.22, height * 0.32, height * 0.42, height * 0.55,
    ];
    const objs = [];
    lines.forEach((ln, i) => {
      this.time.delayedCall(900 + i * 1100, () => {
        objs.push(this._line(ys[i], ln, { size: 22 }));
      });
    });
    this.time.delayedCall(900 + lines.length * 1100 + 1300, () => {
      this.tweens.add({
        targets: objs, alpha: 0, duration: 900,
        onComplete: () => { objs.forEach((o) => o.destroy()); this._showQuestion(0); },
      });
    });
  }

  _showQuestion(idx) {
    const q = QUESTIONS[idx];
    const { width, height } = this.scale;

    const promptT = this._line(height * 0.18, q.prompt, { size: 26 });

    // Lay out option lines vertically. Each is a soft underlined phrase
    // that brightens on hover/tap.
    const startY = height * 0.32;
    const stepY = Math.min(48, (height * 0.6) / q.options.length);
    const opts = [];
    q.options.forEach((opt, i) => {
      const t = this.add.text(width / 2, startY + i * stepY, opt.label, {
        fontFamily: FONT,
        fontSize: "20px",
        color: GOLD_DIM,
        fontStyle: "italic",
      }).setOrigin(0.5).setAlpha(0)
        .setInteractive({ useHandCursor: true });
      // staggered fade-in
      this.tweens.add({ targets: t, alpha: 1, duration: 600, delay: 250 + i * 150, ease: "Sine.easeOut" });
      t.on("pointerover", () => t.setColor(GOLD_BRIGHT));
      t.on("pointerout",  () => t.setColor(GOLD_DIM));
      t.on("pointerdown", () => {
        this.answers[q.key] = opt.id;
        // Brief gold flash, then fade everything and advance.
        t.setColor(GOLD_BRIGHT);
        this.tweens.add({
          targets: [promptT, ...opts], alpha: 0, duration: 700, delay: 250,
          onComplete: () => {
            promptT.destroy();
            opts.forEach((o) => o.destroy());
            if (idx + 1 < QUESTIONS.length) {
              this.time.delayedCall(300, () => this._showQuestion(idx + 1));
            } else {
              this.time.delayedCall(300, () => this._showNamePrompt());
            }
          },
        });
      });
      opts.push(t);
    });
  }

  _showNamePrompt() {
    const { width, height } = this.scale;
    const promptT = this._line(height * 0.28, "And what should the world call you?", { size: 24 });
    const sub = this._line(height * 0.36, "(type a name, or press Enter to be called Traveler)", { size: 14, italic: true, color: GOLD_DIM });

    // Visible gold-italic "input" using key events; we never use a real DOM
    // field because Phaser's RESIZE scale mode + iOS keyboards fight each
    // other. Players can also tap the SKIP line to default to "Traveler".
    const nameT = this.add.text(width / 2, height * 0.50, "_", {
      fontFamily: FONT, fontSize: "30px", color: GOLD_BRIGHT, fontStyle: "italic",
    }).setOrigin(0.5).setShadow(0, 0, "#e6c474", 10, true, true);

    const skipT = this.add.text(width / 2, height * 0.62, "skip — call me Traveler", {
      fontFamily: FONT, fontSize: "16px", color: GOLD_DIM, fontStyle: "italic",
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    skipT.on("pointerover", () => skipT.setColor(GOLD_BRIGHT));
    skipT.on("pointerout",  () => skipT.setColor(GOLD_DIM));
    skipT.on("pointerdown", () => { this.playerName = ""; this._finish([promptT, sub, nameT, skipT]); });

    const updateDisplay = () => {
      const display = this.playerName.length > 0 ? this.playerName : "_";
      nameT.setText(display);
    };

    const keydown = (ev) => {
      if (ev.key === "Enter") {
        this._finish([promptT, sub, nameT, skipT]);
        return;
      }
      if (ev.key === "Backspace") {
        this.playerName = this.playerName.slice(0, -1);
        updateDisplay();
        return;
      }
      if (ev.key.length === 1 && this.playerName.length < 16 && /[\w '\-.]/.test(ev.key)) {
        this.playerName += ev.key;
        updateDisplay();
      }
    };
    this.input.keyboard.on("keydown", keydown);
    this.events.once("shutdown", () => this.input.keyboard.off("keydown", keydown));
  }

  _finish(toFade) {
    World.applyIntroAnswers({
      passion: this.answers.passion,
      seeking: this.answers.seeking,
      family:  this.answers.family,
      name:    this.playerName,
    });

    this.tweens.add({
      targets: toFade, alpha: 0, duration: 700,
      onComplete: () => {
        const closing = this._line(this.scale.height * 0.5, "the world remembers.", { size: 26 });
        this.time.delayedCall(1800, () => {
          this.cameras.main.fadeOut(1100, 0, 0, 0);
          this.time.delayedCall(1200, () => this.scene.start("HubScene"));
        });
      },
    });
  }
}

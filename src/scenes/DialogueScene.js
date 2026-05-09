// Overlay dialogue. Pauses input on the parent scene and shows lines one
// at a time at the bottom of the screen, advanced by tap or any key.
//
// Visual style: black frame at the bottom, gold name plate, off-white text.
// Lines reveal letter-by-letter (typewriter) and skip on second tap.
//
// Usage:
//   this.scene.launch("DialogueScene", { lines: [...], speaker: "Rin", onClose });

export class DialogueScene extends Phaser.Scene {
  constructor() { super("DialogueScene"); }

  init(data) {
    this.lines = (data && data.lines) || [];
    this.speaker = (data && data.speaker) || null;
    this.onClose = (data && data.onClose) || null;
    this.idx = 0;
  }

  create() {
    const { width, height } = this.scale;

    // Dim backdrop. Click anywhere advances.
    this.backdrop = this.add.rectangle(0, 0, width, height, 0x000000, 0.45)
      .setOrigin(0).setDepth(0).setInteractive();
    this.backdrop.on("pointerdown", () => this._advance());

    // Bottom frame.
    const frameH = Math.max(160, height * 0.30);
    this.frame = this.add.rectangle(0, height - frameH, width, frameH, 0x0a0a14, 0.92)
      .setOrigin(0).setDepth(1).setStrokeStyle(2, 0xe6c474, 0.6);

    // Speaker plate (gold).
    if (this.speaker) {
      const plateW = Math.min(220, this.speaker.length * 12 + 40);
      this.plate = this.add.rectangle(28, height - frameH - 14, plateW, 28, 0xe6c474, 1)
        .setOrigin(0).setDepth(2);
      this.plateText = this.add.text(28 + plateW / 2, height - frameH, this.speaker, {
        fontFamily: '"Iowan Old Style", Georgia, serif',
        fontSize: "14px", color: "#0b0b14", fontStyle: "bold",
      }).setOrigin(0.5).setDepth(3);
    }

    // Body text.
    this.body = this.add.text(28, height - frameH + 30, "", {
      fontFamily: '"Iowan Old Style", Georgia, serif',
      fontSize: "18px", color: "#f3ecd6",
      wordWrap: { width: width - 56 },
      lineSpacing: 4,
    }).setDepth(2);

    // "Tap to continue" hint at bottom-right.
    this.hint = this.add.text(width - 16, height - 18, "▼", {
      fontFamily: "system-ui, sans-serif", fontSize: "14px", color: "#e6c474",
    }).setOrigin(1, 1).setDepth(2);
    this.tweens.add({ targets: this.hint, alpha: 0.4, duration: 700, yoyo: true, repeat: -1 });

    // Keyboard advance.
    this.input.keyboard.on("keydown", () => this._advance());

    this.scale.on("resize", this._onResize, this);
    this.events.once("shutdown", () => this.scale.off("resize", this._onResize, this));

    this._showCurrent();
  }

  _onResize(size) {
    if (this.backdrop) this.backdrop.setSize(size.width, size.height);
    const frameH = Math.max(160, size.height * 0.30);
    if (this.frame) this.frame.setPosition(0, size.height - frameH).setSize(size.width, frameH);
    if (this.body) this.body.setPosition(28, size.height - frameH + 30).setStyle({ wordWrap: { width: size.width - 56 } });
    if (this.hint) this.hint.setPosition(size.width - 16, size.height - 18);
    if (this.plate) this.plate.setPosition(28, size.height - frameH - 14);
    if (this.plateText) this.plateText.setPosition(28 + this.plate.width / 2, size.height - frameH);
  }

  _showCurrent() {
    const text = this.lines[this.idx] || "";
    this.body.setText("");
    this._typing = true;
    this._fullText = text;
    this._typedLen = 0;
    this._typeEvent = this.time.addEvent({
      delay: 22,
      loop: true,
      callback: () => {
        this._typedLen = Math.min(this._fullText.length, this._typedLen + 2);
        this.body.setText(this._fullText.slice(0, this._typedLen));
        if (this._typedLen >= this._fullText.length) {
          this._typing = false;
          this._typeEvent.remove(false);
        }
      },
    });
  }

  _advance() {
    if (this._typing) {
      // Skip typewriter and show full line.
      this._typeEvent.remove(false);
      this.body.setText(this._fullText);
      this._typing = false;
      return;
    }
    this.idx += 1;
    if (this.idx >= this.lines.length) {
      const cb = this.onClose;
      this.scene.stop();
      if (cb) cb();
      return;
    }
    this._showCurrent();
  }
}

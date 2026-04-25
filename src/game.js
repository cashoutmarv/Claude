import { BootScene } from "./scenes/BootScene.js";
import { MenuScene } from "./scenes/MenuScene.js";
import { GameScene } from "./scenes/GameScene.js";
import { HUDScene } from "./scenes/HUDScene.js";
import { UpgradeScene } from "./scenes/UpgradeScene.js";
import { GameOverScene } from "./scenes/GameOverScene.js";

const config = {
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#0b0b14",
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  physics: {
    default: "arcade",
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  fps: { target: 60, smoothStep: true },
  render: { pixelArt: false, antialias: true },
  input: { activePointers: 3 },
  scene: [BootScene, MenuScene, GameScene, HUDScene, UpgradeScene, GameOverScene],
};

// eslint-disable-next-line no-new
new Phaser.Game(config);

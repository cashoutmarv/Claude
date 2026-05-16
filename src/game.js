import { BootScene } from "./scenes/BootScene.js";
import { IntroScene } from "./scenes/IntroScene.js";
import { HubScene } from "./scenes/HubScene.js";

const config = {
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#000000",
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
  scene: [BootScene, IntroScene, HubScene],
};

new Phaser.Game(config);

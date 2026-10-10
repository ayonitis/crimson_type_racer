import type { CosmeticItem, PowerUpDefinition } from "@/types/game";

export const COSMETICS: CosmeticItem[] = [
  {
    id: "default-crimson",
    name: "Crimson Core",
    price: 0,
    rarity: "common",
    style: {
      core: "#ff294e",
      glow: "rgba(255, 41, 78, 0.55)",
      outline: "#ffd1d9",
    },
  },
  {
    id: "electric-blue",
    name: "Electric Blue",
    price: 80,
    rarity: "rare",
    style: {
      core: "#33b0ff",
      glow: "rgba(51, 176, 255, 0.6)",
      outline: "#d4f0ff",
    },
  },
  {
    id: "neon-green",
    name: "Neon Green",
    price: 90,
    rarity: "rare",
    style: {
      core: "#4dff88",
      glow: "rgba(77, 255, 136, 0.65)",
      outline: "#e1ffe8",
    },
  },
  {
    id: "violet-surge",
    name: "Violet Surge",
    price: 120,
    rarity: "epic",
    style: {
      core: "#b347ff",
      glow: "rgba(179, 71, 255, 0.62)",
      outline: "#f3ddff",
    },
  },
  {
    id: "golden-aegis",
    name: "Golden Aegis",
    price: 180,
    rarity: "legendary",
    style: {
      core: "#ffbd2f",
      glow: "rgba(255, 189, 47, 0.62)",
      outline: "#fff2bf",
      outline2: "#ff8f00",
    },
  },
  {
    id: "white-glow",
    name: "White Glow",
    price: 130,
    rarity: "epic",
    style: {
      core: "#f8f8f8",
      glow: "rgba(255, 255, 255, 0.7)",
      outline: "#ffffff",
      outline2: "#ff4b5f",
    },
  },
  {
    id: "ember-gradient",
    name: "Ember Gradient",
    price: 150,
    rarity: "epic",
    style: {
      core: "#ff3e59",
      gradientTo: "#ff8d2f",
      glow: "rgba(255, 88, 88, 0.6)",
      outline: "#ffd6c4",
    },
  },
];

export const POWER_UPS: PowerUpDefinition[] = [
  {
    id: "miniBomb",
    name: "Mini Bomb",
    description: "Detonates and clears up to 4 nearby words.",
    price: 35,
  },
  {
    id: "extraRevive",
    name: "Extra Revive",
    description: "Consumes one charge to survive a fatal miss.",
    price: 45,
  },
  {
    id: "chillBoost",
    name: "Chill Power-Up",
    description: "Slows enemy speed and spawn pace for 8 seconds.",
    price: 40,
  },
];
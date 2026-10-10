export type DifficultyId = "chill" | "normal" | "intense";

export type GamePhase =
  | "start"
  | "difficulty"
  | "playing"
  | "paused"
  | "gameOver"
  | "shop"
  | "leaderboard"
  | "settings";

export interface DifficultyConfig {
  id: DifficultyId;
  name: string;
  description: string;
  wordPool: readonly string[];
  spawnIntervalMs: number;
  minSpawnIntervalMs: number;
  spawnRampPerMinute: number;
  speedPxPerSec: number;
  speedRampPerMinute: number;
  maxWords: number;
  scoreMultiplier: number;
  tokenMultiplier: number;
  spawnPaddingTop: number;
}

export interface WordEntity {
  id: string;
  text: string;
  typedCount: number;
  x: number;
  y: number;
  speed: number;
  createdAt: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  lifeMs: number;
  maxLifeMs: number;
  size: number;
  color: string;
}

export interface GameStats {
  score: number;
  combo: number;
  maxCombo: number;
  wordsDestroyed: number;
  totalTyped: number;
  correctTyped: number;
  tokensRun: number;
  lives: number;
}

export interface RunSummary {
  score: number;
  wordsDestroyed: number;
  accuracy: number;
  bestCombo: number;
  tokensEarned: number;
}

export interface HighScoreEntry {
  id: string;
  name: string;
  score: number;
  difficulty: DifficultyId;
  dateIso: string;
  wordsDestroyed: number;
  accuracy: number;
  bestCombo: number;
}

export type CosmeticRarity = "common" | "rare" | "epic" | "legendary";

export interface CosmeticStyle {
  core: string;
  glow: string;
  outline: string;
  outline2?: string;
  gradientTo?: string;
}

export interface CosmeticItem {
  id: string;
  name: string;
  price: number;
  rarity: CosmeticRarity;
  style: CosmeticStyle;
}

export type PowerUpId = "miniBomb" | "extraRevive" | "chillBoost";

export interface PowerUpDefinition {
  id: PowerUpId;
  name: string;
  description: string;
  price: number;
}

export interface PowerUpInventory {
  miniBomb: number;
  extraRevive: number;
  chillBoost: number;
}

export interface GameSettings {
  muted: boolean;
  reducedMotion: boolean;
  playerName: string;
  showScreenShake: boolean;
}

export interface PersistedGameData {
  version: number;
  tokens: number;
  ownedCosmetics: string[];
  equippedCosmetic: string;
  inventory: PowerUpInventory;
  bestScores: Record<DifficultyId, number>;
  highScores: HighScoreEntry[];
  settings: GameSettings;
}
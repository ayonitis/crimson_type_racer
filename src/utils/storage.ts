import type {
  DifficultyId,
  GameSettings,
  PersistedGameData,
  PowerUpInventory,
} from "@/types/game";

const STORAGE_KEY = "typing-racer-save-v1";

const DEFAULT_SETTINGS: GameSettings = {
  muted: false,
  reducedMotion: false,
  playerName: "Pilot",
  showScreenShake: true,
};

const DEFAULT_INVENTORY: PowerUpInventory = {
  miniBomb: 1,
  extraRevive: 0,
  chillBoost: 1,
};

const EMPTY_BEST: Record<DifficultyId, number> = {
  chill: 0,
  normal: 0,
  intense: 0,
};

export const defaultSaveData: PersistedGameData = {
  version: 1,
  tokens: 0,
  ownedCosmetics: ["default-crimson"],
  equippedCosmetic: "default-crimson",
  inventory: DEFAULT_INVENTORY,
  bestScores: EMPTY_BEST,
  highScores: [],
  settings: DEFAULT_SETTINGS,
};

function sanitizeNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function sanitizeStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }
  return value.filter((item): item is string => typeof item === "string");
}

function sanitizeRecord(value: unknown): Record<DifficultyId, number> {
  const obj = typeof value === "object" && value !== null ? (value as Partial<Record<DifficultyId, unknown>>) : {};
  return {
    chill: sanitizeNumber(obj.chill, 0),
    normal: sanitizeNumber(obj.normal, 0),
    intense: sanitizeNumber(obj.intense, 0),
  };
}

export function loadGameData(): PersistedGameData {
  if (typeof window === "undefined") {
    return defaultSaveData;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultSaveData;
    }

    const parsed = JSON.parse(raw) as Partial<PersistedGameData>;
    const inventoryInput =
      typeof parsed.inventory === "object" && parsed.inventory !== null
        ? (parsed.inventory as Partial<PowerUpInventory>)
        : {};
    const settingsInput =
      typeof parsed.settings === "object" && parsed.settings !== null
        ? (parsed.settings as Partial<GameSettings>)
        : {};

    return {
      version: 1,
      tokens: sanitizeNumber(parsed.tokens, 0),
      ownedCosmetics: sanitizeStringArray(parsed.ownedCosmetics, ["default-crimson"]),
      equippedCosmetic:
        typeof parsed.equippedCosmetic === "string" ? parsed.equippedCosmetic : "default-crimson",
      inventory: {
        miniBomb: sanitizeNumber(inventoryInput.miniBomb, DEFAULT_INVENTORY.miniBomb),
        extraRevive: sanitizeNumber(inventoryInput.extraRevive, DEFAULT_INVENTORY.extraRevive),
        chillBoost: sanitizeNumber(inventoryInput.chillBoost, DEFAULT_INVENTORY.chillBoost),
      },
      bestScores: sanitizeRecord(parsed.bestScores),
      highScores: Array.isArray(parsed.highScores)
        ? parsed.highScores.filter(
            (item): item is PersistedGameData["highScores"][number] =>
              Boolean(item) && typeof item.id === "string" && typeof item.score === "number"
          )
        : [],
      settings: {
        muted: typeof settingsInput.muted === "boolean" ? settingsInput.muted : DEFAULT_SETTINGS.muted,
        reducedMotion:
          typeof settingsInput.reducedMotion === "boolean"
            ? settingsInput.reducedMotion
            : DEFAULT_SETTINGS.reducedMotion,
        showScreenShake:
          typeof settingsInput.showScreenShake === "boolean"
            ? settingsInput.showScreenShake
            : DEFAULT_SETTINGS.showScreenShake,
        playerName:
          typeof settingsInput.playerName === "string" && settingsInput.playerName.trim().length > 0
            ? settingsInput.playerName.slice(0, 18)
            : DEFAULT_SETTINGS.playerName,
      },
    };
  } catch {
    return defaultSaveData;
  }
}

export function saveGameData(data: PersistedGameData): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
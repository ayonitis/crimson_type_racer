import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Coins, Flame, ShoppingBag, Trophy, Wrench } from "lucide-react";
import { GameArena } from "@/components/GameArena";
import { DIFFICULTIES } from "@/config/difficulty";
import { COSMETICS, POWER_UPS } from "@/data/shop";
import type {
  DifficultyId,
  GamePhase,
  HighScoreEntry,
  PersistedGameData,
  PowerUpId,
  RunSummary,
} from "@/types/game";
import { cn } from "@/utils/cn";
import { SoundManager } from "@/utils/sound";
import { loadGameData, saveGameData } from "@/utils/storage";

const TOP_SCORES = 20;

function initializeSaveData(): PersistedGameData {
  const base = loadGameData();
  const snapshot: PersistedGameData = {
    ...base,
    ownedCosmetics: [...base.ownedCosmetics],
    inventory: { ...base.inventory },
    bestScores: { ...base.bestScores },
    highScores: [...base.highScores],
    settings: { ...base.settings },
  };

  if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    snapshot.settings.reducedMotion = true;
  }

  return snapshot;
}

function createScoreEntry(summary: RunSummary, difficulty: DifficultyId, name: string): HighScoreEntry {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  return {
    id,
    name: name.trim() || "Pilot",
    score: summary.score,
    difficulty,
    dateIso: new Date().toISOString(),
    wordsDestroyed: summary.wordsDestroyed,
    accuracy: summary.accuracy,
    bestCombo: summary.bestCombo,
  };
}

export default function App() {
  const [phase, setPhase] = useState<GamePhase>("start");
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyId>("normal");
  const [saveData, setSaveData] = useState<PersistedGameData>(() => initializeSaveData());
  const [runKey, setRunKey] = useState(0);
  const [leaderboardFilter, setLeaderboardFilter] = useState<DifficultyId>("normal");
  const soundRef = useRef(new SoundManager());
  const saveRef = useRef(saveData);

  const commitSave = (updater: (prev: PersistedGameData) => PersistedGameData) => {
    const next = updater(saveRef.current);
    saveRef.current = next;
    setSaveData(next);
    saveGameData(next);
  };

  const playSound = (type: "type" | "hit" | "combo" | "power" | "gameOver") => {
    soundRef.current.play(type, saveRef.current.settings.muted);
  };

  const startRun = (difficulty: DifficultyId) => {
    setSelectedDifficulty(difficulty);
    setRunKey((value) => value + 1);
    setPhase("playing");
  };

  const consumeInventory = (id: PowerUpId, amount: number): boolean => {
    const current = saveRef.current.inventory[id];
    if (current < amount) {
      return false;
    }
    commitSave((prev) => ({
      ...prev,
      inventory: {
        ...prev.inventory,
        [id]: prev.inventory[id] - amount,
      },
    }));
    return true;
  };

  const purchasePowerUp = (id: PowerUpId, price: number) => {
    if (saveRef.current.tokens < price) {
      return;
    }
    commitSave((prev) => ({
      ...prev,
      tokens: prev.tokens - price,
      inventory: {
        ...prev.inventory,
        [id]: prev.inventory[id] + 1,
      },
    }));
  };

  const purchaseCosmetic = (cosmeticId: string, price: number) => {
    const current = saveRef.current;
    if (current.ownedCosmetics.includes(cosmeticId) || current.tokens < price) {
      return;
    }
    commitSave((prev) => ({
      ...prev,
      tokens: prev.tokens - price,
      ownedCosmetics: [...prev.ownedCosmetics, cosmeticId],
    }));
  };

  const equipCosmetic = (cosmeticId: string) => {
    if (!saveRef.current.ownedCosmetics.includes(cosmeticId)) {
      return;
    }
    commitSave((prev) => ({ ...prev, equippedCosmetic: cosmeticId }));
  };

  const onRunComplete = (summary: RunSummary) => {
    const entry = createScoreEntry(summary, selectedDifficulty, saveRef.current.settings.playerName);
    commitSave((prev) => {
      const bestScores = { ...prev.bestScores };
      bestScores[selectedDifficulty] = Math.max(bestScores[selectedDifficulty], summary.score);
      const highScores = [...prev.highScores, entry]
        .sort((a, b) => b.score - a.score)
        .slice(0, TOP_SCORES);

      return {
        ...prev,
        tokens: prev.tokens + summary.tokensEarned,
        bestScores,
        highScores,
      };
    });
  };

  const equipped = useMemo(() => {
    return COSMETICS.find((item) => item.id === saveData.equippedCosmetic) ?? COSMETICS[0];
  }, [saveData.equippedCosmetic]);

  const filteredScores = useMemo(
    () => saveData.highScores.filter((entry) => entry.difficulty === leaderboardFilter),
    [leaderboardFilter, saveData.highScores]
  );

  return (
    <main className="min-h-screen bg-[#090909] text-[#f5f5f5]">
      {phase === "playing" ? (
        <GameArena
          key={`${selectedDifficulty}-${runKey}`}
          difficulty={selectedDifficulty}
          bestScore={saveData.bestScores[selectedDifficulty]}
          settings={saveData.settings}
          cosmetic={equipped.style}
          startingInventory={saveData.inventory}
          onConsumeInventory={consumeInventory}
          onRunComplete={onRunComplete}
          onPlaySound={playSound}
          onExitToMenu={() => setPhase("start")}
          onRestart={() => setRunKey((value) => value + 1)}
        />
      ) : (
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-12 pt-6 sm:px-6">
          <header className="flex items-center justify-between border-b border-[#292929] pb-4">
            <div className="text-sm text-[#b0b0b0]">
              <p className="text-xs uppercase tracking-[0.22em] text-[#777777]">Crimson Typing Racer</p>
              <p className="mt-1">Best {DIFFICULTIES[selectedDifficulty].name}: {saveData.bestScores[selectedDifficulty]}</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-md border border-[#292929] bg-[#171717] px-3 py-1.5 text-sm">
              <Coins className="h-4 w-4 text-[#f5c451]" />
              <span className="text-[#f5c451]">{saveData.tokens}</span>
            </div>
          </header>

          {phase === "start" && (
            <section className="mx-auto w-full max-w-2xl space-y-6 rounded-xl border border-[#292929] bg-[#111111] p-6 sm:p-8">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.28em] text-[#777777]">Arcade Survival Typing</p>
                <h1 className="text-3xl font-semibold tracking-tight text-[#f5f5f5] sm:text-4xl">Crimson Typing Racer</h1>
                <p className="max-w-xl text-sm leading-6 text-[#b0b0b0]">
                  Defend your bot by typing incoming words before they reach the danger line. Keep your accuracy high,
                  build combos, and spend tokens to customize your run.
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-[#f5f5f5]">Difficulty</p>
                <div className="space-y-2">
                  {(Object.keys(DIFFICULTIES) as DifficultyId[]).map((id) => {
                    const config = DIFFICULTIES[id];
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setSelectedDifficulty(id)}
                        className={cn(
                          "w-full rounded-md border px-4 py-3 text-left transition-colors",
                          selectedDifficulty === id
                            ? "border-[#e53945] bg-[#171717]"
                            : "border-[#292929] bg-[#111111] hover:border-[#3a3a3a]"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-[#f5f5f5]">{config.name}</span>
                          <span className="text-xs text-[#777777]">Score x{config.scoreMultiplier}</span>
                        </div>
                        <p className="mt-1 text-xs text-[#b0b0b0]">{config.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={() => startRun(selectedDifficulty)}
                className="w-full rounded-md bg-[#e53945] px-4 py-3 text-sm font-semibold text-white hover:bg-[#ff4d57]"
              >
                PLAY
              </button>

              <div className="space-y-2 border-t border-[#292929] pt-4">
                <button
                  type="button"
                  onClick={() => setPhase("shop")}
                  className="flex w-full items-center justify-between rounded-md border border-[#292929] bg-[#171717] px-4 py-2.5 text-sm hover:border-[#3a3a3a]"
                >
                  <span className="inline-flex items-center gap-2"><ShoppingBag className="h-4 w-4 text-[#b0b0b0]" /> Shop</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPhase("leaderboard")}
                  className="flex w-full items-center justify-between rounded-md border border-[#292929] bg-[#171717] px-4 py-2.5 text-sm hover:border-[#3a3a3a]"
                >
                  <span className="inline-flex items-center gap-2"><Trophy className="h-4 w-4 text-[#b0b0b0]" /> Local High Scores</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPhase("settings")}
                  className="flex w-full items-center justify-between rounded-md border border-[#292929] bg-[#171717] px-4 py-2.5 text-sm hover:border-[#3a3a3a]"
                >
                  <span className="inline-flex items-center gap-2"><Wrench className="h-4 w-4 text-[#b0b0b0]" /> Settings</span>
                </button>
              </div>

              <p className="text-xs text-[#777777]">Progress is stored locally in your browser.</p>
            </section>
          )}

          {phase === "shop" && (
            <section className="space-y-6 rounded-xl border border-[#292929] bg-[#111111] p-5 sm:p-6">
              <div className="flex items-center justify-between border-b border-[#292929] pb-3">
                <h2 className="text-xl font-semibold">Shop</h2>
                <button type="button" onClick={() => setPhase("start")} className="text-sm text-[#b0b0b0] hover:text-[#f5f5f5]">
                  Back
                </button>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm uppercase tracking-[0.16em] text-[#777777]">Cosmetics</h3>
                <div className="grid gap-2 md:grid-cols-2">
                  {COSMETICS.map((item) => {
                    const owned = saveData.ownedCosmetics.includes(item.id);
                    const equippedNow = saveData.equippedCosmetic === item.id;
                    return (
                      <div key={item.id} className="flex items-center justify-between rounded-md border border-[#292929] bg-[#171717] p-3">
                        <div className="flex items-center gap-3">
                          <span
                            className="h-9 w-9 rounded-full border"
                            style={{
                              background: item.style.gradientTo
                                ? `linear-gradient(120deg, ${item.style.core}, ${item.style.gradientTo})`
                                : item.style.core,
                              borderColor: item.style.outline,
                              boxShadow: `0 0 10px ${item.style.glow}`,
                            }}
                          />
                          <div>
                            <p className="text-sm font-medium text-[#f5f5f5]">{item.name}</p>
                            <p className="text-xs uppercase tracking-wide text-[#777777]">{item.rarity}</p>
                          </div>
                        </div>
                        {owned ? (
                          <button
                            type="button"
                            onClick={() => equipCosmetic(item.id)}
                            className={cn(
                              "rounded-md px-3 py-1.5 text-sm",
                              equippedNow ? "bg-[#68d391]/20 text-[#68d391]" : "border border-[#292929] hover:border-[#68d391]"
                            )}
                          >
                            {equippedNow ? "Equipped" : "Equip"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => purchaseCosmetic(item.id, item.price)}
                            disabled={saveData.tokens < item.price}
                            className={cn(
                              "rounded-md px-3 py-1.5 text-sm",
                              saveData.tokens < item.price
                                ? "cursor-not-allowed bg-[#111111] text-[#777777]"
                                : "bg-[#e53945] text-white hover:bg-[#ff4d57]"
                            )}
                          >
                            {item.price}T
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm uppercase tracking-[0.16em] text-[#777777]">Power-Ups</h3>
                <div className="grid gap-2 md:grid-cols-3">
                  {POWER_UPS.map((item) => (
                    <div key={item.id} className="rounded-md border border-[#292929] bg-[#171717] p-3">
                      <p className="text-sm font-medium text-[#f5f5f5]">{item.name}</p>
                      <p className="mt-1 text-sm text-[#b0b0b0]">{item.description}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm text-[#777777]">Owned: {saveData.inventory[item.id]}</span>
                        <button
                          type="button"
                          onClick={() => purchasePowerUp(item.id, item.price)}
                          disabled={saveData.tokens < item.price}
                          className={cn(
                            "rounded-md px-3 py-1.5 text-sm",
                            saveData.tokens < item.price
                              ? "cursor-not-allowed bg-[#111111] text-[#777777]"
                              : "bg-[#f5c451]/90 text-[#1a1a1a] hover:bg-[#f5c451]"
                          )}
                        >
                          Buy {item.price}T
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {phase === "leaderboard" && (
            <section className="space-y-4 rounded-xl border border-[#292929] bg-[#111111] p-5 sm:p-6">
              <div className="flex items-center justify-between border-b border-[#292929] pb-3">
                <h2 className="text-xl font-semibold">Local High Scores</h2>
                <button type="button" onClick={() => setPhase("start")} className="text-sm text-[#b0b0b0] hover:text-[#f5f5f5]">
                  Back
                </button>
              </div>
              <div className="flex gap-2">
                {(Object.keys(DIFFICULTIES) as DifficultyId[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setLeaderboardFilter(id)}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-sm",
                      leaderboardFilter === id
                        ? "border-[#e53945] bg-[#e53945]/20 text-[#f5f5f5]"
                        : "border-[#292929] text-[#b0b0b0] hover:border-[#3a3a3a]"
                    )}
                  >
                    {DIFFICULTIES[id].name}
                  </button>
                ))}
              </div>

              {filteredScores.length === 0 ? (
                <p className="py-6 text-sm text-[#777777]">No local scores for this mode yet.</p>
              ) : (
                <ol className="space-y-2">
                  {filteredScores.map((entry, index) => (
                    <li
                      key={entry.id}
                      className="grid grid-cols-[2rem_1fr_auto] gap-2 rounded-md border border-[#292929] bg-[#171717] px-3 py-2 text-sm"
                    >
                      <span className="text-[#777777]">#{index + 1}</span>
                      <span className="text-[#b0b0b0]">
                        {entry.name} • {new Date(entry.dateIso).toLocaleDateString()}
                      </span>
                      <span className="font-semibold text-[#f5f5f5]">{entry.score}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          )}

          {phase === "settings" && (
            <section className="space-y-4 rounded-xl border border-[#292929] bg-[#111111] p-5 sm:p-6">
              <div className="flex items-center justify-between border-b border-[#292929] pb-3">
                <h2 className="text-xl font-semibold">Settings</h2>
                <button type="button" onClick={() => setPhase("start")} className="text-sm text-[#b0b0b0] hover:text-[#f5f5f5]">
                  Back
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block text-[#b0b0b0]">Pilot Name</span>
                  <input
                    type="text"
                    maxLength={18}
                    value={saveData.settings.playerName}
                    onChange={(event) =>
                      commitSave((prev) => ({
                        ...prev,
                        settings: { ...prev.settings, playerName: event.target.value },
                      }))
                    }
                    className="w-full rounded-md border border-[#292929] bg-[#171717] px-3 py-2 text-[#f5f5f5]"
                  />
                </label>
                <div className="space-y-2 text-sm text-[#f5f5f5]">
                  <button
                    type="button"
                    onClick={() =>
                      commitSave((prev) => ({
                        ...prev,
                        settings: { ...prev.settings, muted: !prev.settings.muted },
                      }))
                    }
                    className="w-full rounded-md border border-[#292929] bg-[#171717] px-3 py-2 text-left hover:border-[#3a3a3a]"
                  >
                    Sound: <span className="text-[#b0b0b0]">{saveData.settings.muted ? "Muted" : "On"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      commitSave((prev) => ({
                        ...prev,
                        settings: { ...prev.settings, reducedMotion: !prev.settings.reducedMotion },
                      }))
                    }
                    className="w-full rounded-md border border-[#292929] bg-[#171717] px-3 py-2 text-left hover:border-[#3a3a3a]"
                  >
                    Reduced Motion: <span className="text-[#b0b0b0]">{saveData.settings.reducedMotion ? "On" : "Off"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      commitSave((prev) => ({
                        ...prev,
                        settings: { ...prev.settings, showScreenShake: !prev.settings.showScreenShake },
                      }))
                    }
                    className="w-full rounded-md border border-[#292929] bg-[#171717] px-3 py-2 text-left hover:border-[#3a3a3a]"
                  >
                    Screen Shake: <span className="text-[#b0b0b0]">{saveData.settings.showScreenShake ? "On" : "Off"}</span>
                  </button>
                </div>
              </div>
            </section>
          )}

          <motion.footer initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-xs text-[#777777]">
            <Flame className="h-3.5 w-3.5 text-[#e53945]" />
            Progress and high scores are local to this browser.
          </motion.footer>
        </div>
      )}
    </main>
  );
}
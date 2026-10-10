import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { motion } from "framer-motion";
import { Bomb, Pause, Play, Snowflake } from "lucide-react";
import { DIFFICULTIES } from "@/config/difficulty";
import type {
  CosmeticStyle,
  DifficultyId,
  GameSettings,
  Particle,
  PowerUpId,
  PowerUpInventory,
  RunSummary,
  WordEntity,
} from "@/types/game";
import { cn } from "@/utils/cn";
import { WordSelector } from "@/utils/wordSelector";

const ARENA_WIDTH = 900;
const ARENA_HEIGHT = 520;
const BOT_Y = ARENA_HEIGHT - 68;

interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  lifeMs: number;
  maxLifeMs: number;
  color: string;
}

interface ArenaProps {
  difficulty: DifficultyId;
  bestScore: number;
  settings: GameSettings;
  cosmetic: CosmeticStyle;
  startingInventory: PowerUpInventory;
  onConsumeInventory: (id: PowerUpId, amount: number) => boolean;
  onRunComplete: (summary: RunSummary) => void;
  onExitToMenu: () => void;
  onRestart: () => void;
  onPlaySound: (type: "type" | "hit" | "combo" | "power" | "gameOver") => void;
}

interface GameSnapshot {
  score: number;
  combo: number;
  maxCombo: number;
  wordsDestroyed: number;
  totalTyped: number;
  correctTyped: number;
  tokensRun: number;
  typedBuffer: string;
  targetText: string;
  runState: "playing" | "paused" | "gameOver";
  inventory: PowerUpInventory;
  lives: number;
  chillRemainingMs: number;
  bombCooldownMs: number;
  elapsedSec: number;
  newHighScore: boolean;
}

interface EngineState {
  words: WordEntity[];
  particles: Particle[];
  floatingTexts: FloatingText[];
  typedBuffer: string;
  targetId: string | null;
  score: number;
  combo: number;
  maxCombo: number;
  wordsDestroyed: number;
  totalTyped: number;
  correctTyped: number;
  tokensRun: number;
  elapsedMs: number;
  spawnTimerMs: number;
  lastTimestampMs: number;
  lastUiPublishMs: number;
  nextWordId: number;
  runState: "playing" | "paused" | "gameOver";
  finalizeDone: boolean;
  lives: number;
  inventory: PowerUpInventory;
  chillUntilMs: number;
  invulnerableUntilMs: number;
  bombCooldownUntilMs: number;
  lastBombActivationMs: number;
  botPulseMs: number;
  shakeMs: number;
  flashMs: number;
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function accuracyPercent(correct: number, total: number): number {
  if (total <= 0) {
    return 100;
  }
  return Math.round((correct / total) * 100);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function GameArena({
  difficulty,
  bestScore,
  settings,
  cosmetic,
  startingInventory,
  onConsumeInventory,
  onRunComplete,
  onExitToMenu,
  onRestart,
  onPlaySound,
}: ArenaProps) {
  const difficultyConfig = DIFFICULTIES[difficulty];
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mobileInputRef = useRef<HTMLInputElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const settingsRef = useRef(settings);
  const selectorRef = useRef<WordSelector>(
    new WordSelector(
      difficultyConfig.wordPool,
      Math.max(10, Math.min(24, Math.floor(difficultyConfig.wordPool.length / 7)))
    )
  );

  const initialSnapshot = useMemo<GameSnapshot>(
    () => ({
      score: 0,
      combo: 0,
      maxCombo: 0,
      wordsDestroyed: 0,
      totalTyped: 0,
      correctTyped: 0,
      tokensRun: 0,
      typedBuffer: "",
      targetText: "",
      runState: "playing",
      inventory: startingInventory,
      lives: 1,
      chillRemainingMs: 0,
      bombCooldownMs: 0,
      elapsedSec: 0,
      newHighScore: false,
    }),
    [startingInventory]
  );

  const [snapshot, setSnapshot] = useState<GameSnapshot>(initialSnapshot);

  const stateRef = useRef<EngineState>({
    words: [],
    particles: [],
    floatingTexts: [],
    typedBuffer: "",
    targetId: null,
    score: 0,
    combo: 0,
    maxCombo: 0,
    wordsDestroyed: 0,
    totalTyped: 0,
    correctTyped: 0,
    tokensRun: 0,
    elapsedMs: 0,
    spawnTimerMs: 0,
    lastTimestampMs: 0,
    lastUiPublishMs: 0,
    nextWordId: 1,
    runState: "playing",
    finalizeDone: false,
    lives: 1,
    inventory: { ...startingInventory },
    chillUntilMs: 0,
    invulnerableUntilMs: 0,
    bombCooldownUntilMs: 0,
    lastBombActivationMs: 0,
    botPulseMs: 0,
    shakeMs: 0,
    flashMs: 0,
  });

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const publishSnapshot = useCallback((nowMs: number) => {
    const state = stateRef.current;
    const target = state.words.find((word) => word.id === state.targetId);
    setSnapshot({
      score: state.score,
      combo: state.combo,
      maxCombo: state.maxCombo,
      wordsDestroyed: state.wordsDestroyed,
      totalTyped: state.totalTyped,
      correctTyped: state.correctTyped,
      tokensRun: state.tokensRun,
      typedBuffer: state.typedBuffer,
      targetText: target?.text ?? "",
      runState: state.runState,
      inventory: { ...state.inventory },
      lives: state.lives,
      chillRemainingMs: Math.max(0, state.chillUntilMs - nowMs),
      bombCooldownMs: Math.max(0, state.bombCooldownUntilMs - nowMs),
      elapsedSec: Math.floor(state.elapsedMs / 1000),
      newHighScore: state.score > bestScore,
    });
  }, [bestScore]);

  const addParticles = useCallback((x: number, y: number, count: number, color: string) => {
    const particles = stateRef.current.particles;
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 55 + Math.random() * 150;
      particles.push({
        id: createId("p"),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        lifeMs: 420 + Math.random() * 340,
        maxLifeMs: 420 + Math.random() * 340,
        size: 1.5 + Math.random() * 2.8,
        color,
      });
    }
    if (particles.length > 220) {
      particles.splice(0, particles.length - 220);
    }
  }, []);

  const addFloatingText = useCallback((text: string, x: number, y: number, color: string) => {
    const list = stateRef.current.floatingTexts;
    list.push({ id: createId("float"), text, x, y, color, lifeMs: 760, maxLifeMs: 760 });
    if (list.length > 20) {
      list.shift();
    }
  }, []);

  const removeWordById = useCallback((wordId: string) => {
    const state = stateRef.current;
    state.words = state.words.filter((word) => word.id !== wordId);
    if (state.targetId === wordId) {
      state.targetId = null;
      state.typedBuffer = "";
    }
  }, []);

  const completeWord = useCallback(
    (word: WordEntity) => {
      const state = stateRef.current;
      const comboMult = 1 + Math.min(2.5, state.combo * 0.04);
      const gain = Math.round(word.text.length * 12 * difficultyConfig.scoreMultiplier * comboMult);
      const tokenGain = Math.max(
        1,
        Math.floor((word.text.length * 0.32 + state.combo * 0.1) * difficultyConfig.tokenMultiplier)
      );

      state.score += gain;
      state.combo += 1;
      state.maxCombo = Math.max(state.maxCombo, state.combo);
      state.wordsDestroyed += 1;
      state.tokensRun += tokenGain;
      state.lives = 1;
      state.botPulseMs = 140;
      state.flashMs = 60;
      state.shakeMs = 65;
      addParticles(word.x, word.y, 18, "rgba(255, 80, 105, 0.9)");
      addFloatingText(`+${gain}`, word.x + 4, word.y - 10, "#69ff95");
      addFloatingText(`+${tokenGain}T`, word.x + 22, word.y + 12, "#ffcb45");
      removeWordById(word.id);
      onPlaySound(state.combo % 5 === 0 ? "combo" : "hit");
      if (state.combo % 5 === 0) {
        addFloatingText(`Combo x${state.combo}`, ARENA_WIDTH * 0.5, BOT_Y - 54, "#ff8a4d");
      }
    },
    [addFloatingText, addParticles, difficultyConfig.scoreMultiplier, difficultyConfig.tokenMultiplier, onPlaySound, removeWordById]
  );

  const spawnWord = useCallback((elapsedMs: number) => {
    const state = stateRef.current;
    if (state.words.length >= difficultyConfig.maxWords) {
      return;
    }
    const text = selectorRef.current.next(state.words.map((word) => word.text));
    const id = `word-${state.nextWordId}`;
    state.nextWordId += 1;
    const x = 80 + Math.random() * (ARENA_WIDTH - 160);
    const progress = elapsedMs / 60000;
    const speed = difficultyConfig.speedPxPerSec * (1 + progress * difficultyConfig.speedRampPerMinute);
    state.words.push({
      id,
      text,
      typedCount: 0,
      x,
      y: -difficultyConfig.spawnPaddingTop,
      speed,
      createdAt: elapsedMs,
    });
  }, [difficultyConfig]);

  const finalizeRun = useCallback(() => {
    const state = stateRef.current;
    if (state.finalizeDone) {
      return;
    }
    state.finalizeDone = true;
    const summary: RunSummary = {
      score: state.score,
      wordsDestroyed: state.wordsDestroyed,
      accuracy: accuracyPercent(state.correctTyped, state.totalTyped),
      bestCombo: state.maxCombo,
      tokensEarned: state.tokensRun,
    };
    onPlaySound("gameOver");
    onRunComplete(summary);
  }, [onPlaySound, onRunComplete]);

  const findBestCandidate = useCallback((prefix: string, lockToCurrent: boolean): WordEntity | null => {
    const state = stateRef.current;
    if (!prefix) {
      return null;
    }
    const candidates = state.words.filter((word) => word.text.startsWith(prefix));
    if (candidates.length === 0) {
      return null;
    }
    if (lockToCurrent && state.targetId) {
      const current = candidates.find((word) => word.id === state.targetId);
      if (current) {
        return current;
      }
    }
    return candidates.sort((a, b) => b.y - a.y || a.text.length - b.text.length)[0] ?? null;
  }, []);

  const handleWrongInput = useCallback(() => {
    const state = stateRef.current;
    state.combo = 0;
    state.flashMs = 80;
    addFloatingText("miss", ARENA_WIDTH * 0.5, BOT_Y - 34, "#ff5f5f");
  }, [addFloatingText]);

  const applyTypedCounts = useCallback((targetId: string | null, typedCount: number) => {
    const state = stateRef.current;
    state.words = state.words.map((word) => {
      const nextTyped = word.id === targetId ? typedCount : 0;
      return word.typedCount === nextTyped ? word : { ...word, typedCount: nextTyped };
    });
  }, []);

  const handleTypeChar = useCallback(
    (char: string) => {
      const state = stateRef.current;
      if (state.runState !== "playing") {
        return;
      }
      const letter = char.toLowerCase();
      if (!/^[a-z]$/.test(letter)) {
        return;
      }

      state.totalTyped += 1;
      const nextPrefix = state.typedBuffer + letter;
      const candidate = findBestCandidate(nextPrefix, true);
      if (!candidate) {
        handleWrongInput();
        return;
      }

      state.correctTyped += 1;
      state.typedBuffer = nextPrefix;
      state.targetId = candidate.id;
      applyTypedCounts(candidate.id, state.typedBuffer.length);
      onPlaySound("type");

      if (state.typedBuffer.length >= candidate.text.length) {
        completeWord(candidate);
      }
    },
    [applyTypedCounts, completeWord, findBestCandidate, handleWrongInput, onPlaySound]
  );

  const handleBackspace = useCallback(() => {
    const state = stateRef.current;
    if (state.runState !== "playing") {
      return;
    }
    if (!state.typedBuffer.length) {
      return;
    }
    state.totalTyped += 1;
    state.typedBuffer = state.typedBuffer.slice(0, -1);
    const target = state.words.find((word) => word.id === state.targetId);
    if (!state.typedBuffer.length) {
      state.targetId = null;
      if (target) {
        applyTypedCounts(null, 0);
      }
      return;
    }

    const candidate = findBestCandidate(state.typedBuffer, false);
    if (candidate) {
      state.targetId = candidate.id;
      applyTypedCounts(candidate.id, state.typedBuffer.length);
      return;
    }

    state.targetId = null;
    state.typedBuffer = "";
    applyTypedCounts(null, 0);
  }, [applyTypedCounts, findBestCandidate]);

  const cancelTarget = useCallback(() => {
    const state = stateRef.current;
    state.words = state.words.map((word) => (word.typedCount === 0 ? word : { ...word, typedCount: 0 }));
    state.targetId = null;
    state.typedBuffer = "";
  }, []);

  const setRunState = useCallback((runState: EngineState["runState"]) => {
    stateRef.current.runState = runState;
    publishSnapshot(performance.now());
  }, [publishSnapshot]);

  const handleFatal = useCallback(
    (nowMs: number) => {
      const state = stateRef.current;
      if (state.invulnerableUntilMs > nowMs) {
        return;
      }

      if (state.inventory.extraRevive > 0 && onConsumeInventory("extraRevive", 1)) {
        state.inventory.extraRevive -= 1;
        state.combo = 0;
        state.invulnerableUntilMs = nowMs + 1800;
        state.flashMs = 140;
        state.shakeMs = 100;
        addFloatingText("Revived!", ARENA_WIDTH * 0.5, BOT_Y - 36, "#8effa0");
        onPlaySound("power");
        state.words = state.words.filter((word) => word.y < BOT_Y - 120);
        return;
      }

      state.lives -= 1;
      if (state.lives <= 0) {
        state.runState = "gameOver";
        state.shakeMs = 180;
        state.flashMs = 180;
        finalizeRun();
      }
    },
    [addFloatingText, finalizeRun, onConsumeInventory, onPlaySound]
  );

  const triggerMiniBomb = useCallback(() => {
    const state = stateRef.current;
    const nowMs = performance.now();
    if (state.runState !== "playing") {
      return;
    }
    if (state.inventory.miniBomb <= 0 || state.bombCooldownUntilMs > nowMs) {
      return;
    }
    if (nowMs - state.lastBombActivationMs < 120) {
      return;
    }

    const targets = state.words
      .map((word) => ({ word, distance: Math.hypot(word.x - ARENA_WIDTH * 0.5, word.y - BOT_Y) }))
      .sort((a, b) => b.word.y - a.word.y || a.distance - b.distance)
      .slice(0, 4);

    if (targets.length === 0) {
      return;
    }

    state.lastBombActivationMs = nowMs;
    if (!onConsumeInventory("miniBomb", 1)) {
      return;
    }

    state.inventory.miniBomb -= 1;
    state.bombCooldownUntilMs = nowMs + 5500;

    let bombScore = 0;
    for (const item of targets) {
      addParticles(item.word.x, item.word.y, 24, "rgba(255, 176, 80, 0.9)");
      addFloatingText("BOOM", item.word.x, item.word.y - 8, "#ffd272");
      removeWordById(item.word.id);
      bombScore += 16;
      state.wordsDestroyed += 1;
    }

    addParticles(ARENA_WIDTH * 0.5, BOT_Y - 20, 30, "rgba(255, 196, 81, 0.9)");
    addFloatingText("Mini Bomb", ARENA_WIDTH * 0.5, BOT_Y - 30, "#f5c451");

    state.score += bombScore;
    state.combo = 0;
    state.flashMs = 100;
    state.shakeMs = 90;
    onPlaySound("power");
  }, [addFloatingText, addParticles, onConsumeInventory, onPlaySound, removeWordById]);

  const triggerChill = useCallback(() => {
    const state = stateRef.current;
    if (state.runState !== "playing" || state.inventory.chillBoost <= 0) {
      return;
    }
    if (!onConsumeInventory("chillBoost", 1)) {
      return;
    }
    state.inventory.chillBoost -= 1;
    const nowMs = performance.now();
    state.chillUntilMs = Math.max(state.chillUntilMs, nowMs) + 8000;
    state.flashMs = 80;
    addFloatingText("Chill Field", ARENA_WIDTH * 0.5, BOT_Y - 22, "#88ebff");
    onPlaySound("power");
  }, [addFloatingText, onConsumeInventory, onPlaySound]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const state = stateRef.current;
      const target = event.target as HTMLElement | null;
      const isInputTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;
      if (isInputTarget && target !== mobileInputRef.current) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        if (state.runState === "playing") {
          setRunState("paused");
        } else if (state.runState === "paused") {
          setRunState("playing");
        }
        return;
      }

      if (state.runState !== "playing") {
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        handleBackspace();
        return;
      }
      if (event.key === "Tab") {
        event.preventDefault();
        cancelTarget();
        return;
      }
      if (event.key === " ") {
        event.preventDefault();
        triggerMiniBomb();
        return;
      }
      if (/^[a-zA-Z]$/.test(event.key)) {
        event.preventDefault();
        handleTypeChar(event.key);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [cancelTarget, handleBackspace, handleTypeChar, setRunState, triggerMiniBomb]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const resize = () => {
      const width = wrapper.clientWidth;
      const scale = clamp(width / ARENA_WIDTH, 0.5, 1);
      const viewWidth = ARENA_WIDTH * scale;
      const viewHeight = ARENA_HEIGHT * scale;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewWidth * dpr);
      canvas.height = Math.floor(viewHeight * dpr);
      canvas.style.width = `${viewWidth}px`;
      canvas.style.height = `${viewHeight}px`;
      context.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(wrapper);

    const renderFrame = (timestamp: number) => {
      const state = stateRef.current;
      const dtMs = state.lastTimestampMs ? Math.min(48, timestamp - state.lastTimestampMs) : 16;
      state.lastTimestampMs = timestamp;
      const dtSec = dtMs / 1000;

      if (state.runState === "playing") {
        state.elapsedMs += dtMs;

        const chillActive = state.chillUntilMs > timestamp;
        const speedFactor = chillActive ? 0.62 : 1;
        const spawnFactor = chillActive ? 1.45 : 1;
        const progress = state.elapsedMs / 60000;
        const interval = Math.max(
          difficultyConfig.minSpawnIntervalMs,
          difficultyConfig.spawnIntervalMs - progress * difficultyConfig.spawnRampPerMinute
        );

        state.spawnTimerMs += dtMs;
        if (state.spawnTimerMs >= interval * spawnFactor) {
          state.spawnTimerMs = 0;
          spawnWord(state.elapsedMs);
        }

        for (const word of state.words) {
          word.y += word.speed * dtSec * speedFactor;
        }

        const collidingWord = state.words.find((word) => word.y >= BOT_Y - 15);
        if (collidingWord) {
          removeWordById(collidingWord.id);
          handleFatal(timestamp);
        }

        state.botPulseMs = Math.max(0, state.botPulseMs - dtMs);
        state.shakeMs = Math.max(0, state.shakeMs - dtMs);
        state.flashMs = Math.max(0, state.flashMs - dtMs);

        for (const particle of state.particles) {
          particle.x += particle.vx * dtSec;
          particle.y += particle.vy * dtSec;
          particle.vy += 220 * dtSec;
          particle.lifeMs -= dtMs;
        }
        state.particles = state.particles.filter((particle) => particle.lifeMs > 0);

        for (const item of state.floatingTexts) {
          item.lifeMs -= dtMs;
          item.y -= 28 * dtSec;
        }
        state.floatingTexts = state.floatingTexts.filter((item) => item.lifeMs > 0);
      }

      context.clearRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

      context.save();
      const reduceMotion = settingsRef.current.reducedMotion;
      if (!reduceMotion && settingsRef.current.showScreenShake && state.shakeMs > 0) {
        const shake = (state.shakeMs / 180) * 4;
        const dx = (Math.random() - 0.5) * shake;
        const dy = (Math.random() - 0.5) * shake;
        context.translate(dx, dy);
      }

      const bgGradient = context.createLinearGradient(0, 0, 0, ARENA_HEIGHT);
      bgGradient.addColorStop(0, "#0d0d0f");
      bgGradient.addColorStop(0.55, "#101012");
      bgGradient.addColorStop(1, "#0b0b0d");
      context.fillStyle = bgGradient;
      context.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

      const edgeGlowLeft = context.createRadialGradient(
        0,
        ARENA_HEIGHT,
        20,
        0,
        ARENA_HEIGHT,
        380
      );
      edgeGlowLeft.addColorStop(0, "rgba(229, 57, 69, 0.09)");
      edgeGlowLeft.addColorStop(1, "rgba(229, 57, 69, 0)");
      context.fillStyle = edgeGlowLeft;
      context.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

      const edgeGlowRight = context.createRadialGradient(
        ARENA_WIDTH,
        0,
        20,
        ARENA_WIDTH,
        0,
        320
      );
      edgeGlowRight.addColorStop(0, "rgba(229, 57, 69, 0.07)");
      edgeGlowRight.addColorStop(1, "rgba(229, 57, 69, 0)");
      context.fillStyle = edgeGlowRight;
      context.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

      context.strokeStyle = "rgba(229, 57, 69, 0.08)";
      context.lineWidth = 1;
      for (let y = 26; y < ARENA_HEIGHT; y += 44) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(ARENA_WIDTH, y);
        context.stroke();
      }

      const dangerWord = state.words.reduce<WordEntity | null>((prev, word) => {
        if (!prev || word.y > prev.y) {
          return word;
        }
        return prev;
      }, null);
      const danger = dangerWord ? clamp(dangerWord.y / BOT_Y, 0, 1) : 0;
      context.fillStyle = "rgba(31, 20, 22, 0.95)";
      context.fillRect(14, 12, 180, 7);
      const meterGradient = context.createLinearGradient(14, 0, 194, 0);
      meterGradient.addColorStop(0, "#6bff95");
      meterGradient.addColorStop(0.58, "#ffad37");
      meterGradient.addColorStop(1, "#e53945");
      context.fillStyle = meterGradient;
      context.fillRect(14, 12, 180 * danger, 7);

      context.font = "600 16px Inter, sans-serif";
      context.textAlign = "left";
      context.textBaseline = "middle";
      for (const word of state.words) {
        const isTarget = word.id === state.targetId;
        if (isTarget) {
          context.fillStyle = "rgba(229, 57, 69, 0.2)";
          const w = context.measureText(word.text).width;
          context.fillRect(word.x - w / 2 - 10, word.y - 15, w + 20, 26);
        }

        const typed = word.text.slice(0, word.typedCount);
        const remaining = word.text.slice(word.typedCount);
        const fullWidth = context.measureText(word.text).width;
        const startX = word.x - fullWidth / 2;
        context.fillStyle = "#68d391";
        context.fillText(typed, startX, word.y);
        context.fillStyle = "#f5f5f5";
        context.fillText(remaining, startX + context.measureText(typed).width, word.y);
      }

      for (const particle of state.particles) {
        const alpha = clamp(particle.lifeMs / particle.maxLifeMs, 0, 1);
        context.globalAlpha = alpha;
        context.fillStyle = particle.color;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();
        context.globalAlpha = 1;
      }

      const pulse = 1 + state.botPulseMs / 520;
      const botRadius = 24 * pulse;
      const coreGradient = cosmetic.gradientTo
        ? context.createLinearGradient(ARENA_WIDTH / 2 - botRadius, BOT_Y - botRadius, ARENA_WIDTH / 2 + botRadius, BOT_Y + botRadius)
        : null;
      if (coreGradient && cosmetic.gradientTo) {
        coreGradient.addColorStop(0, cosmetic.core);
        coreGradient.addColorStop(1, cosmetic.gradientTo);
      }

      context.shadowBlur = 24;
      context.shadowColor = cosmetic.glow;
      context.fillStyle = coreGradient ?? cosmetic.core;
      context.beginPath();
      context.arc(ARENA_WIDTH / 2, BOT_Y, botRadius, 0, Math.PI * 2);
      context.fill();

      context.shadowBlur = 0;
      context.strokeStyle = cosmetic.outline;
      context.lineWidth = 3;
      context.beginPath();
      context.arc(ARENA_WIDTH / 2, BOT_Y, botRadius + 2, 0, Math.PI * 2);
      context.stroke();

      if (cosmetic.outline2) {
        context.strokeStyle = cosmetic.outline2;
        context.lineWidth = 2;
        context.beginPath();
        context.arc(ARENA_WIDTH / 2, BOT_Y, botRadius + 8, 0, Math.PI * 2);
        context.stroke();
      }

      if (state.invulnerableUntilMs > timestamp) {
        context.strokeStyle = "rgba(136, 233, 255, 0.9)";
        context.lineWidth = 2;
        context.setLineDash([6, 5]);
        context.beginPath();
        context.arc(ARENA_WIDTH / 2, BOT_Y, botRadius + 14, 0, Math.PI * 2);
        context.stroke();
        context.setLineDash([]);
      }

      for (const item of state.floatingTexts) {
        const alpha = clamp(item.lifeMs / item.maxLifeMs, 0, 1);
        context.globalAlpha = alpha;
        context.fillStyle = item.color;
        context.font = "700 14px Inter, sans-serif";
        context.textAlign = "center";
        context.fillText(item.text, item.x, item.y);
      }
      context.globalAlpha = 1;

      if (state.flashMs > 0) {
        context.fillStyle = `rgba(229, 57, 69, ${state.flashMs / 450})`;
        context.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
      }

      context.restore();

      if (timestamp - state.lastUiPublishMs > 55) {
        state.lastUiPublishMs = timestamp;
        publishSnapshot(timestamp);
      }

      rafRef.current = requestAnimationFrame(renderFrame);
    };

    rafRef.current = requestAnimationFrame(renderFrame);

    return () => {
      resizeObserver.disconnect();
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [cosmetic, difficultyConfig, handleFatal, publishSnapshot, removeWordById, spawnWord]);

  const onNativeInput = useCallback(
    (event: FormEvent<HTMLInputElement>) => {
      const native = event.nativeEvent as InputEvent;
      const data = native.data;
      if (typeof data === "string") {
        for (const char of data) {
          handleTypeChar(char);
        }
      }
      event.currentTarget.value = "";
    },
    [handleTypeChar]
  );

  const onNativeKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Backspace") {
        event.preventDefault();
        handleBackspace();
      }
      if (event.key === "Tab") {
        event.preventDefault();
        cancelTarget();
      }
    },
    [cancelTarget, handleBackspace]
  );

  const accuracy = accuracyPercent(snapshot.correctTyped, snapshot.totalTyped);

  const keyRows = [
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
    ["z", "x", "c", "v", "b", "n", "m"],
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-3 pb-4 pt-[max(env(safe-area-inset-top),0.75rem)] text-[#f5f5f5] sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#292929] bg-[#171717]/90 px-3 py-2">
        <div className="flex items-center gap-3 text-sm text-[#b0b0b0]">
          <span className="font-semibold text-[#e53945]">{difficultyConfig.name}</span>
          <span>Score: {snapshot.score}</span>
          <span>Best: {bestScore}</span>
          <span>Combo: x{snapshot.combo}</span>
          <span>Acc: {accuracy}%</span>
          <span>Lives: {snapshot.lives}</span>
          <span className="text-[#f5c451]">Tokens: +{snapshot.tokensRun}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#b0b0b0] sm:text-sm">
          <span>Bomb {snapshot.inventory.miniBomb}</span>
          <span>Revive {snapshot.inventory.extraRevive}</span>
          <span>Chill {snapshot.inventory.chillBoost}</span>
          <button
            type="button"
            onClick={() => setRunState(snapshot.runState === "paused" ? "playing" : "paused")}
            className="rounded-md border border-[#292929] bg-[#111111] px-2 py-1 text-[#f5f5f5] hover:border-[#e53945] hover:text-white focus-visible:outline-2 focus-visible:outline-[#e53945]"
          >
            {snapshot.runState === "paused" ? "Resume" : "Pause"}
          </button>
        </div>
      </div>

      <div ref={wrapperRef} className="relative mx-auto w-full overflow-hidden rounded-xl border border-[#292929] bg-[#111111]">
        <canvas ref={canvasRef} aria-label="Typing Racer game arena" className="mx-auto block max-w-full" />

        <div className="pointer-events-none absolute left-2 top-2 rounded bg-black/50 px-2 py-1 text-xs text-[#b0b0b0]">
          Target: {snapshot.targetText || "none"} | Input: {snapshot.typedBuffer || "_"}
        </div>

        {snapshot.chillRemainingMs > 0 && (
          <div className="pointer-events-none absolute right-3 top-2 rounded bg-cyan-400/20 px-2 py-1 text-xs text-cyan-200">
            Chill {Math.ceil(snapshot.chillRemainingMs / 1000)}s
          </div>
        )}

        {snapshot.bombCooldownMs > 0 && (
          <div className="pointer-events-none absolute right-3 top-10 rounded bg-amber-400/15 px-2 py-1 text-xs text-[#f5c451]">
            Bomb CD {Math.ceil(snapshot.bombCooldownMs / 1000)}s
          </div>
        )}

        {snapshot.runState === "paused" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-[90%] max-w-sm rounded-lg border border-[#292929] bg-[#171717] p-4 text-center"
            >
              <h3 className="text-xl font-semibold text-[#f5f5f5]">Paused</h3>
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setRunState("playing")}
                  className="rounded bg-[#e53945] px-3 py-2 font-semibold text-white hover:bg-[#ff4d57]"
                >
                  Resume
                </button>
                <button
                  type="button"
                  onClick={onRestart}
                  className="rounded border border-[#292929] px-3 py-2 hover:border-[#e53945]"
                >
                  Restart
                </button>
                <button
                  type="button"
                  onClick={onExitToMenu}
                  className="rounded border border-[#292929] px-3 py-2 hover:border-[#e53945]"
                >
                  Main Menu
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {snapshot.runState === "gameOver" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/72">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-[90%] max-w-md rounded-lg border border-[#292929] bg-[#171717] p-5"
            >
              <h3 className="text-2xl font-semibold text-[#f5f5f5]">Game Over</h3>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-[#b0b0b0]">
                <span>Final Score</span>
                <span className="text-right text-[#f5f5f5]">{snapshot.score}</span>
                <span>Words Destroyed</span>
                <span className="text-right">{snapshot.wordsDestroyed}</span>
                <span>Accuracy</span>
                <span className="text-right">{accuracy}%</span>
                <span>Best Combo</span>
                <span className="text-right">x{snapshot.maxCombo}</span>
                <span>Tokens Earned</span>
                <span className="text-right text-[#f5c451]">+{snapshot.tokensRun}</span>
              </div>
              {snapshot.newHighScore && <p className="mt-2 text-sm text-[#f5c451]">New local high score</p>}
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={onRestart}
                  className="flex-1 rounded bg-[#e53945] px-3 py-2 font-semibold text-white hover:bg-[#ff4d57]"
                >
                  Restart
                </button>
                <button
                  type="button"
                  onClick={onExitToMenu}
                  className="flex-1 rounded border border-[#292929] px-3 py-2 hover:border-[#e53945]"
                >
                  Main Menu
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#292929] bg-[#171717]/80 p-2 text-xs sm:text-sm">
        <button
          type="button"
          onClick={triggerMiniBomb}
          disabled={snapshot.inventory.miniBomb <= 0 || snapshot.bombCooldownMs > 0 || snapshot.runState !== "playing"}
          className={cn(
              "inline-flex items-center gap-1 rounded px-3 py-2 focus-visible:outline-2 focus-visible:outline-[#e53945]",
            snapshot.inventory.miniBomb <= 0 || snapshot.bombCooldownMs > 0 || snapshot.runState !== "playing"
                ? "cursor-not-allowed bg-[#111111] text-[#777777]"
                : "bg-[#f5c451]/80 text-[#1a1a1a] hover:bg-[#f5c451]"
          )}
        >
          <Bomb className="h-4 w-4" /> Mini Bomb
        </button>
        <button
          type="button"
          onClick={triggerChill}
          disabled={snapshot.inventory.chillBoost <= 0 || snapshot.runState !== "playing"}
          className={cn(
              "inline-flex items-center gap-1 rounded px-3 py-2 focus-visible:outline-2 focus-visible:outline-[#e53945]",
            snapshot.inventory.chillBoost <= 0 || snapshot.runState !== "playing"
                ? "cursor-not-allowed bg-[#111111] text-[#777777]"
                : "bg-cyan-700/80 hover:bg-cyan-600"
          )}
        >
          <Snowflake className="h-4 w-4" /> Chill
        </button>
        <button
          type="button"
          onClick={() => setRunState(snapshot.runState === "paused" ? "playing" : "paused")}
          className="inline-flex items-center gap-1 rounded border border-[#292929] bg-[#111111] px-3 py-2 hover:border-[#e53945]"
        >
          {snapshot.runState === "paused" ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />} Pause
        </button>
        <button
          type="button"
          onClick={cancelTarget}
          className="rounded border border-[#292929] px-3 py-2 hover:border-[#e53945]"
        >
          Cancel Target (Tab)
        </button>
        <span className="ml-auto text-[#777777]">Backspace to correct. Space uses Mini Bomb.</span>
      </div>

      <div className="rounded-lg border border-[#292929] bg-[#171717]/80 p-2 lg:hidden">
        <label htmlFor="mobile-typing" className="mb-2 block text-xs text-[#b0b0b0]">
          Mobile typing field
        </label>
        <input
          id="mobile-typing"
          ref={mobileInputRef}
          type="text"
          inputMode="text"
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          onInput={onNativeInput}
          onKeyDown={onNativeKeyDown}
          disabled={snapshot.runState !== "playing"}
          className="mb-2 w-full rounded border border-[#292929] bg-[#111111] px-3 py-2 text-sm text-[#f5f5f5]"
          placeholder="Tap and type here"
        />
        <div className="space-y-1">
          {keyRows.map((row, rowIndex) => (
            <div key={`row-${rowIndex}`} className="flex justify-center gap-1">
              {row.map((key) => (
                <button
                  key={key}
                  type="button"
                  disabled={snapshot.runState !== "playing"}
                  onClick={() => handleTypeChar(key)}
                  className="min-w-8 rounded border border-[#292929] bg-[#111111] px-2 py-2 text-xs uppercase text-[#f5f5f5]"
                >
                  {key}
                </button>
              ))}
            </div>
          ))}
          <div className="mt-1 flex justify-center gap-1">
            <button
              type="button"
              disabled={snapshot.runState !== "playing"}
              onClick={handleBackspace}
              className="rounded border border-[#292929] bg-[#111111] px-3 py-2 text-xs"
            >
              Backspace
            </button>
            <button
              type="button"
              disabled={snapshot.runState !== "playing"}
              onClick={cancelTarget}
              className="rounded border border-[#292929] bg-[#111111] px-3 py-2 text-xs"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
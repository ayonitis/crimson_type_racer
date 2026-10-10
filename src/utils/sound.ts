type SoundType = "type" | "hit" | "combo" | "power" | "gameOver";

interface SoundConfig {
  frequency: number;
  duration: number;
  gain: number;
  type: OscillatorType;
}

const CONFIGS: Record<SoundType, SoundConfig> = {
  type: { frequency: 440, duration: 0.03, gain: 0.02, type: "square" },
  hit: { frequency: 620, duration: 0.08, gain: 0.04, type: "triangle" },
  combo: { frequency: 800, duration: 0.12, gain: 0.05, type: "sawtooth" },
  power: { frequency: 250, duration: 0.18, gain: 0.05, type: "sine" },
  gameOver: { frequency: 140, duration: 0.26, gain: 0.06, type: "sine" },
};

export class SoundManager {
  private ctx: AudioContext | null = null;

  private ensureContext() {
    if (typeof window === "undefined") {
      return null;
    }
    if (!this.ctx) {
      this.ctx = new window.AudioContext();
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  play(type: SoundType, muted: boolean) {
    if (muted) {
      return;
    }
    const ctx = this.ensureContext();
    if (!ctx) {
      return;
    }

    const config = CONFIGS[type];
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = config.type;
    osc.frequency.value = config.frequency;
    gain.gain.value = config.gain;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + config.duration);
    osc.stop(ctx.currentTime + config.duration);
  }
}
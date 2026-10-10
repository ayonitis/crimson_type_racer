function shuffle<T>(list: T[]): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export class WordSelector {
  private weightedWords: string[];

  private uniqueWords: string[];

  private bag: string[];

  private recent: string[];

  private readonly recentLimit: number;

  constructor(words: readonly string[], recentLimit: number) {
    this.weightedWords = words.length > 0 ? [...words] : ["code"];
    this.uniqueWords = Array.from(new Set(this.weightedWords));
    this.recentLimit = Math.max(8, Math.min(recentLimit, 32));
    this.bag = shuffle(this.weightedWords);
    this.recent = [];
  }

  private pushRecent(word: string) {
    this.recent.push(word);
    if (this.recent.length > this.recentLimit) {
      this.recent.shift();
    }
  }

  private refillBag() {
    this.bag = shuffle(this.weightedWords);
  }

  next(activeWords: readonly string[]): string {
    if (this.uniqueWords.length === 0) {
      return "code";
    }
    if (this.bag.length === 0) {
      this.refillBag();
    }

    const activeSet = new Set(activeWords);
    const deferred: string[] = [];

    while (this.bag.length > 0) {
      const candidate = this.bag.pop();
      if (!candidate) {
        break;
      }
      const isRecent = this.recent.includes(candidate);
      const isActive = activeSet.has(candidate);
      if (!isRecent && !isActive) {
        this.bag.push(...deferred);
        this.pushRecent(candidate);
        return candidate;
      }
      deferred.push(candidate);
    }

    if (this.bag.length === 0) {
      this.refillBag();
    }

    while (this.bag.length > 0) {
      const candidate = this.bag.pop();
      if (!candidate) {
        break;
      }
      if (!activeSet.has(candidate)) {
        this.bag.push(...deferred);
        this.pushRecent(candidate);
        return candidate;
      }
      deferred.push(candidate);
    }

    const fallback = this.uniqueWords[Math.floor(Math.random() * this.uniqueWords.length)] ?? "code";
    this.bag.push(...deferred);
    this.pushRecent(fallback);
    return fallback;
  }
}
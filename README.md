# Crimson Typing Racer

A polished browser typing survival game built with React, Vite, TypeScript, Tailwind CSS, and Canvas.

## Features

- Three balanced difficulty modes: Chill, Normal, Intense.
- Real-time typing target lock with prefix matching, backspace correction, and target cancel.
- Canvas-rendered arena with particle effects, combo feedback, danger meter, and bot cosmetics.
- Full game lifecycle: start, difficulty select, active run, pause, game over, restart.
- Local progression system: score, tokens, combos, accuracy, and rewards.
- Shop with cosmetic bot skins and power-ups (Mini Bomb, Extra Revive, Chill Power-Up).
- Local leaderboard (per difficulty) persisted in LocalStorage.
- Settings for player name, muted audio, reduced motion, and screen shake.
- Mobile support with touch-friendly controls and an on-screen keyboard fallback.

## Stack

- React 19 + TypeScript (strict)
- Vite 7
- Tailwind CSS 4
- Framer Motion
- Lucide React icons

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Start the dev server:

```bash
npm run dev
```

3. Build for production:

```bash
npm run build
```

4. Preview production build:

```bash
npm run preview
```

## Validation Commands

Available checks for this repository:

```bash
npx eslint src --ext .ts,.tsx
npx tsc --noEmit
npm run build
```

## Controls

- Type letters to lock and complete matching words.
- Backspace: remove last typed letter.
- Tab: clear current target lock.
- Space: use Mini Bomb.
- Escape: pause/resume.

Mobile:

- Tap the mobile typing field for native keyboard input.
- Use the on-screen key buttons as a fallback.

## Persistence

LocalStorage key: `typing-racer-save-v1`

Stored data includes:

- Tokens
- Cosmetics owned/equipped
- Power-up inventory
- Best scores
- Local high scores
- User settings

Invalid or malformed saved data falls back safely to defaults.

## Deploy to Vercel

1. Push the repository to GitHub.
2. Create a new Vercel project and import the repo.
3. Keep default settings (Framework Preset: Vite).
4. Build command: `npm run build`
5. Output directory: `dist`

No server, database, or env variables are required.
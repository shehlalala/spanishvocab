/**
 * SM-2 scheduler (SuperMemo 2, with a short relearning step for "Again").
 * Pure functions only: callers pass `now` so the logic is deterministic and testable.
 */

export type Grade = "again" | "hard" | "good" | "easy";

export interface ReviewState {
  entryId: string;
  /** Ease factor, never below 1.3. Starts at 2.5. */
  ease: number;
  /** Current interval in days (0 while learning). */
  interval: number;
  /** Consecutive successful reviews. */
  reps: number;
  lapses: number;
  /** Epoch ms when the card is next due. */
  due: number;
  lastReviewed: number | null;
  /** Epoch ms of the first review, used for the daily new-card limit. */
  firstSeen: number;
  /** Epoch ms of the last change, used for sync conflict resolution. */
  updatedAt: number;
}

export const MIN_EASE = 1.3;
export const START_EASE = 2.5;
const DAY = 86_400_000;
const MINUTE = 60_000;
/** Cards graded "again" come back in this session after a short delay. */
export const RELEARN_DELAY = 10 * MINUTE;
const EASY_BONUS = 1.3;
const HARD_FACTOR = 1.2;

const QUALITY: Record<Grade, number> = { again: 1, hard: 3, good: 4, easy: 5 };

export function newState(entryId: string, now: number): ReviewState {
  return {
    entryId,
    ease: START_EASE,
    interval: 0,
    reps: 0,
    lapses: 0,
    due: now,
    lastReviewed: null,
    firstSeen: now,
    updatedAt: now,
  };
}

/** SM-2 ease update: EF' = EF + (0.1 − (5 − q)(0.08 + (5 − q)·0.02)), floored at 1.3. */
export function nextEase(ease: number, grade: Grade): number {
  const q = QUALITY[grade];
  const e = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  return Math.max(MIN_EASE, Math.round(e * 100) / 100);
}

export function schedule(state: ReviewState, grade: Grade, now: number): ReviewState {
  const ease = nextEase(state.ease, grade);
  const base = { ...state, ease, lastReviewed: now, updatedAt: now };

  if (grade === "again") {
    return {
      ...base,
      reps: 0,
      interval: 0,
      lapses: state.reps > 0 ? state.lapses + 1 : state.lapses,
      due: now + RELEARN_DELAY,
    };
  }

  let interval: number;
  if (state.reps === 0) interval = grade === "easy" ? 4 : 1;
  else if (state.reps === 1) interval = grade === "hard" ? 3 : grade === "easy" ? 8 : 6;
  else if (grade === "hard") interval = Math.max(state.interval + 1, Math.round(state.interval * HARD_FACTOR));
  else if (grade === "easy") interval = Math.round(state.interval * ease * EASY_BONUS);
  else interval = Math.round(state.interval * ease);

  return { ...base, reps: state.reps + 1, interval, due: now + interval * DAY };
}

export function startOfDay(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** End of the local day containing `now` — "due today" means due before this. */
export function endOfDay(now: number): number {
  const d = new Date(now);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function isDue(state: ReviewState, now: number): boolean {
  return state.due <= endOfDay(now);
}

/** Map a typed-answer verdict to an SM-2 grade. */
export function gradeFromVerdict(kind: "exact" | "variant" | "accent" | "plural" | "wrong", usedHint: boolean): Grade {
  if (kind === "wrong") return "again";
  if (kind === "accent" || kind === "plural" || usedHint) return "hard";
  return "good";
}

import { describe, expect, it } from "vitest";
import {
  MIN_EASE,
  RELEARN_DELAY,
  START_EASE,
  endOfDay,
  gradeFromVerdict,
  isDue,
  newState,
  nextEase,
  schedule,
} from "./srs";

const DAY = 86_400_000;
const T0 = new Date(2026, 9, 2, 9, 0, 0).getTime();

describe("nextEase (SM-2 formula)", () => {
  it("good keeps ease, easy raises it, hard and again lower it", () => {
    expect(nextEase(2.5, "good")).toBe(2.5);
    expect(nextEase(2.5, "easy")).toBe(2.6);
    expect(nextEase(2.5, "hard")).toBe(2.36);
    expect(nextEase(2.5, "again")).toBe(1.96);
  });
  it("never drops below 1.3", () => {
    let e = START_EASE;
    for (let i = 0; i < 20; i++) e = nextEase(e, "again");
    expect(e).toBe(MIN_EASE);
  });
});

describe("schedule", () => {
  it("new card: good → 1 day, then 6 days, then interval × ease", () => {
    let s = newState("x", T0);
    s = schedule(s, "good", T0);
    expect(s).toMatchObject({ reps: 1, interval: 1, due: T0 + DAY });
    s = schedule(s, "good", s.due);
    expect(s).toMatchObject({ reps: 2, interval: 6 });
    s = schedule(s, "good", s.due);
    expect(s.interval).toBe(15); // round(6 × 2.5)
    s = schedule(s, "good", s.due);
    expect(s.interval).toBe(38); // round(15 × 2.5)
  });
  it("easy on a new card skips ahead and raises ease", () => {
    const s = schedule(newState("x", T0), "easy", T0);
    expect(s.interval).toBe(4);
    expect(s.ease).toBe(2.6);
  });
  it("again resets reps, counts a lapse and brings the card back in 10 minutes", () => {
    let s = schedule(newState("x", T0), "good", T0);
    s = schedule(s, "good", s.due);
    const failed = schedule(s, "again", T0 + 7 * DAY);
    expect(failed).toMatchObject({ reps: 0, interval: 0, lapses: 1 });
    expect(failed.due).toBe(T0 + 7 * DAY + RELEARN_DELAY);
    expect(failed.ease).toBeLessThan(s.ease);
  });
  it("again on a brand-new card is not a lapse", () => {
    expect(schedule(newState("x", T0), "again", T0).lapses).toBe(0);
  });
  it("hard grows the interval more slowly than good, but always grows it", () => {
    let s = schedule(newState("x", T0), "good", T0);
    s = schedule(s, "good", s.due);
    const hard = schedule(s, "hard", s.due);
    const good = schedule(s, "good", s.due);
    expect(hard.interval).toBeGreaterThan(s.interval);
    expect(hard.interval).toBeLessThan(good.interval);
  });
  it("records review and update timestamps and does not mutate input", () => {
    const s = newState("x", T0);
    const copy = { ...s };
    const r = schedule(s, "good", T0 + 5);
    expect(s).toEqual(copy);
    expect(r.lastReviewed).toBe(T0 + 5);
    expect(r.updatedAt).toBe(T0 + 5);
  });
});

describe("due dates", () => {
  it("counts anything due before midnight as due today", () => {
    const s = { ...newState("x", T0), due: endOfDay(T0) };
    expect(isDue(s, T0)).toBe(true);
    expect(isDue({ ...s, due: endOfDay(T0) + 1 }, T0)).toBe(false);
  });
});

describe("gradeFromVerdict", () => {
  it("maps typed-answer results to grades", () => {
    expect(gradeFromVerdict("exact", false)).toBe("good");
    expect(gradeFromVerdict("variant", false)).toBe("good");
    expect(gradeFromVerdict("accent", false)).toBe("hard");
    expect(gradeFromVerdict("plural", false)).toBe("hard");
    expect(gradeFromVerdict("exact", true)).toBe("hard");
    expect(gradeFromVerdict("wrong", false)).toBe("again");
  });
});

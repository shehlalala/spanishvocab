"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { dailyQueue } from "@/lib/queue";
import { useSettings } from "@/lib/client/settings";
import { useStudyData } from "./useStudyData";

export function Today() {
  const [settings] = useSettings();
  const { content, reviews, error } = useStudyData();
  const [now] = useState(() => Date.now());
  const daily = useMemo(
    () => (content ? dailyQueue(content.entries, content.sets, reviews, { ...settings, now }) : null),
    [content, reviews, settings, now],
  );
  if (error) return <p className="text-bad">Couldn’t load your words: {error}</p>;
  if (!content || !daily) return <div className="tile min-h-[220px] text-muted">Loading…</div>;

  const learned = [...reviews.values()].filter((r) => r.reps > 0).length;
  const total = daily.due.length + daily.fresh.length;
  return (
    <>
      <div className="tile min-h-[220px]" data-testid="today">
        {total ? (
          <>
            <div className="font-serif text-6xl font-bold" data-testid="due-count">
              {total}
            </div>
            <div className="mt-1 text-lg font-semibold text-tile">cards for today</div>
            <div className="mt-2 text-muted">
              {daily.due.length} to review · {daily.fresh.length} new
            </div>
          </>
        ) : (
          <>
            <div className="font-serif text-5xl font-bold">¡Hecho!</div>
            <div className="mt-2 max-w-[30ch] text-muted">
              You’re done for today. {daily.tomorrow ? `${daily.tomorrow} cards are due tomorrow.` : ""}
            </div>
          </>
        )}
      </div>
      <div className="mt-3.5 grid gap-2">
        {total ? (
          <Link className="btn btn-primary" href="/study?set=due&mode=cards" data-testid="start">
            Start reviewing
          </Link>
        ) : null}
        <div className="grid grid-cols-3 gap-2">
          <Link className="btn text-sm" href="/study?set=due&mode=quiz">
            Quiz
          </Link>
          <Link className="btn text-sm" href="/study?set=due&mode=type">
            EN → ES
          </Link>
          <Link className="btn text-sm" href="/sets">
            All sets
          </Link>
        </div>
      </div>
      <p className="mt-4 text-center text-sm text-muted">
        {learned} of {content.entries.length} words learned · progress is saved on this device
      </p>
    </>
  );
}

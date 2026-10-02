"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { buildQueue, dailyQueue, MODES, type Mode } from "@/lib/queue";
import { useSettings } from "@/lib/client/settings";
import type { Entry, Sentence, StudySet } from "@/lib/types";
import { useStudyData } from "../useStudyData";
import { Flashcards } from "./Flashcards";
import { Quiz } from "./Quiz";
import { SentenceDrill } from "./SentenceDrill";
import { TypeDrill } from "./TypeDrill";

const isMode = (m: string | null): m is Mode => MODES.some((x) => x.id === m);
export const DUE = "due";

export function StudyApp() {
  const params = useSearchParams();
  const router = useRouter();
  const [settings] = useSettings();
  const { content, reviews, error, grade } = useStudyData();
  const mode: Mode = isMode(params.get("mode")) ? (params.get("mode") as Mode) : "cards";
  const setSlug = params.get("set") ?? DUE;
  const [round, setRound] = useState(0);

  const sentences = useMemo(() => {
    const m = new Map<string, Sentence[]>();
    for (const s of content?.sentences ?? []) m.set(s.entryId, [...(m.get(s.entryId) ?? []), s]);
    return m;
  }, [content]);

  // The deck is fixed when a session starts, so grading cards doesn't reshuffle it mid-round.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const session = useMemo(() => buildSession(), [content, setSlug, mode, round, settings.region]);
  function buildSession(): { deck: Entry[]; queue: Entry[]; title: string } | null {
    if (!content) return null;
    const now = Date.now();
    const byId = new Map(content.entries.map((e) => [e.id, e]));
    let deck: Entry[];
    let title: string;
    if (setSlug === DUE) {
      const d = dailyQueue(content.entries, content.sets, reviews, { ...settings, now });
      deck = [...d.due, ...d.fresh];
      title = "Due today";
      // Due cards come first, in due order; new cards after.
      if (mode === "cards") return { deck, queue: deck, title };
    } else {
      const set = content.sets.find((s) => s.slug === setSlug);
      deck = (set?.entryIds ?? []).map((id) => byId.get(id)).filter((e): e is Entry => !!e);
      title = set?.name ?? "Unknown set";
    }
    const queue = buildQueue(mode, deck, { reviews, hasSentence: (id) => sentences.has(id), now });
    return { deck, queue, title };
  }

  const go = (patch: { set?: string; mode?: Mode }) => {
    const q = new URLSearchParams({ set: patch.set ?? setSlug, mode: patch.mode ?? mode });
    router.replace(`/study?${q.toString()}`, { scroll: false });
  };

  if (error) return <p className="text-bad">Couldn’t load your words: {error}. Connect once to download them.</p>;
  if (!content || !session) return <p className="text-muted">Loading…</p>;

  const restart = () => setRound((r) => r + 1);
  const key = `${setSlug}:${mode}:${round}`;
  const common = { pref: settings.region, onGrade: grade, onRestart: restart };

  return (
    <>
      <label className="mb-2.5 block">
        <span className="mb-1 block text-sm text-muted">Word set</span>
        <SetPicker sets={content.sets} value={setSlug} onChange={(s) => go({ set: s })} />
      </label>
      <div
        className="mb-2.5 flex overflow-hidden rounded-[10px] border-[1.5px] border-tile"
        role="group"
        aria-label="Mode"
      >
        {MODES.map((m) => (
          <button
            key={m.id}
            aria-pressed={m.id === mode}
            onClick={() => go({ mode: m.id })}
            className={`min-h-11 flex-1 px-1 text-[0.88rem] font-semibold ${m.id === mode ? "bg-tile text-white" : "text-tile"}`}
          >
            {m.label}
          </button>
        ))}
      </div>
      {session.deck.length === 0 ? (
        <div className="tile min-h-[200px]" data-testid="empty">
          <div className="max-w-[34ch] text-muted">
            {setSlug === DUE ? (
              <>
                Nothing due right now. Pick a set above to practise, or{" "}
                <Link className="text-tile underline" href="/settings">
                  add more new words per day
                </Link>
                .
              </>
            ) : (
              "This set is empty."
            )}
          </div>
        </div>
      ) : mode === "cards" ? (
        <Flashcards key={key} deck={session.deck} initialQueue={session.queue} reviews={reviews} {...common} />
      ) : mode === "quiz" ? (
        <Quiz key={key} deck={session.deck} queue={session.queue} {...common} />
      ) : mode === "write" ? (
        <SentenceDrill key={key} queue={session.queue} sentences={sentences} {...common} />
      ) : (
        <TypeDrill key={key} deck={session.deck} queue={session.queue} {...common} />
      )}
    </>
  );
}

function SetPicker({
  sets,
  value,
  onChange,
}: {
  sets: readonly StudySet[];
  value: string;
  onChange: (s: string) => void;
}) {
  const mine = sets.filter((s) => s.kind === "mine");
  const custom = sets.filter((s) => s.kind === "custom");
  const b1 = sets.filter((s) => s.kind === "b1");
  const opt = (s: StudySet) => (
    <option key={s.slug} value={s.slug}>
      {s.name} ({s.entryIds.length})
    </option>
  );
  return (
    <select
      className="min-h-[46px] w-full rounded-[10px] border-[1.5px] border-tile bg-card px-2.5 py-2 font-semibold text-ink"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      data-testid="set-picker"
    >
      <option value={DUE}>Due today</option>
      <optgroup label="My words">{mine.map(opt)}</optgroup>
      {custom.length ? <optgroup label="Imported">{custom.map(opt)}</optgroup> : null}
      <optgroup label="B1 word list by topic">{b1.map(opt)}</optgroup>
    </select>
  );
}

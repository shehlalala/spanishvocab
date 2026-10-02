"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/client/db";
import { hasSpanishVoice, speak } from "@/lib/client/speech";
import { useSettings, type Theme } from "@/lib/client/settings";
import { REGION_LABEL, type RegionPref } from "@/lib/region";
import type { ReviewState } from "@/lib/srs";

function Choice<T extends string>(props: {
  name: string;
  value: T;
  options: { v: T; label: string; hint?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid gap-2" role="radiogroup" aria-label={props.name}>
      {props.options.map((o) => (
        <label
          key={o.v}
          className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-[1.5px] px-3 py-2 ${props.value === o.v ? "border-tile bg-card" : "border-line"}`}
        >
          <input
            type="radio"
            name={props.name}
            checked={props.value === o.v}
            onChange={() => props.onChange(o.v)}
            className="h-5 w-5 accent-[var(--tile)]"
          />
          <span>
            <span className="block font-semibold">{o.label}</span>
            {o.hint ? <span className="block text-sm text-muted">{o.hint}</span> : null}
          </span>
        </label>
      ))}
    </div>
  );
}

export function SettingsForm() {
  const [s, set] = useSettings();
  const [voice, setVoice] = useState<boolean | null>(null);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    void hasSpanishVoice().then(setVoice);
  }, []);

  const exportProgress = async () => {
    const reviews = await db().reviews.toArray();
    const blob = new Blob([JSON.stringify({ app: "vocabulario", version: 1, reviews }, null, 1)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `vocabulario-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importProgress = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as { reviews?: ReviewState[] };
      const rows = (data.reviews ?? []).filter((r) => typeof r.entryId === "string" && typeof r.due === "number");
      // Keep whichever copy of each card was reviewed most recently.
      const existing = new Map((await db().reviews.toArray()).map((r) => [r.entryId, r]));
      const newer = rows.filter((r) => (existing.get(r.entryId)?.updatedAt ?? 0) < r.updatedAt);
      await db().reviews.bulkPut(newer);
      setMsg(`Imported ${newer.length} cards.`);
    } catch {
      setMsg("That file isn’t a Vocabulario progress export.");
    }
  };

  const section = "mt-6 mb-2 font-serif text-xl font-bold";
  return (
    <div>
      <h2 className={section}>Spanish variety</h2>
      <p className="mb-2 text-sm text-muted">
        Chooses which word is shown and which answers count as exact. The other region’s word is still accepted, with a
        note.
      </p>
      <Choice<RegionPref>
        name="region"
        value={s.region}
        onChange={(region) => set({ region })}
        options={[
          { v: "es-ES", label: REGION_LABEL["es-ES"], hint: "zumo, tirita, aparcamiento" },
          { v: "es-419", label: REGION_LABEL["es-419"], hint: "jugo, curita, estacionamiento" },
        ]}
      />

      <h2 className={section}>Daily new cards</h2>
      <label className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={50}
          step={5}
          value={s.newPerDay}
          onChange={(e) => set({ newPerDay: Number(e.target.value) })}
          className="flex-1 accent-[var(--tile)]"
          aria-label="New cards per day"
        />
        <span className="w-10 text-right font-semibold">{s.newPerDay}</span>
      </label>
      <p className="mt-2 mb-2 text-sm text-muted">New cards come from:</p>
      <Choice<string>
        name="daily-source"
        value={s.dailySets.join(",")}
        onChange={(v) => set({ dailySets: v.split(",") })}
        options={[
          { v: "mine-all", label: "My words", hint: "Sets 1–8 in order" },
          { v: "mine-all,b1-all", label: "My words, then the B1 list" },
          { v: "b1-all", label: "The B1 list only" },
        ]}
      />

      <h2 className={section}>Theme</h2>
      <Choice<Theme>
        name="theme"
        value={s.theme}
        onChange={(theme) => set({ theme })}
        options={[
          { v: "system", label: "Match my device" },
          { v: "light", label: "Light" },
          { v: "dark", label: "Dark" },
        ]}
      />

      <h2 className={section}>Pronunciation</h2>
      {voice === null ? (
        <p className="text-muted">Checking for a Spanish voice…</p>
      ) : voice ? (
        <button
          className="btn"
          onClick={() => speak(s.region === "es-ES" ? "el zumo de naranja" : "el jugo de naranja", s.region)}
        >
          Test the {REGION_LABEL[s.region]} voice
        </button>
      ) : (
        <p className="text-muted">
          This device has no Spanish text-to-speech voice, so the pronounce buttons are hidden. On Android, install
          Spanish under Settings → Text-to-speech; on iOS, under Accessibility → Spoken Content → Voices.
        </p>
      )}

      <h2 className={section}>Your progress</h2>
      <p className="mb-2 text-sm text-muted">
        Progress is stored on this device and works offline. Export it as a backup or to move it to another device.
      </p>
      <div className="flex flex-wrap gap-2">
        <button className="btn" onClick={() => void exportProgress()}>
          Export progress
        </button>
        <label className="btn cursor-pointer">
          Import progress
          <input
            type="file"
            accept="application/json"
            className="sr-only"
            onChange={(e) => e.target.files?.[0] && void importProgress(e.target.files[0])}
          />
        </label>
        <button
          className="btn btn-bad"
          onClick={async () => {
            if (!confirm("Reset all progress on this device? This can’t be undone.")) return;
            await db().reviews.clear();
            setMsg("Progress reset.");
          }}
        >
          Reset
        </button>
      </div>
      {msg ? (
        <p className="mt-2 text-sm" role="status">
          {msg}
        </p>
      ) : null}
    </div>
  );
}

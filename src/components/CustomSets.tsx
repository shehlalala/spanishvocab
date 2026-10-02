"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { db } from "@/lib/client/db";
import { invalidateContent } from "@/lib/client/content";
import type { StudySet } from "@/lib/types";

/** Sets the learner imported on this device. */
export function CustomSets() {
  const [sets, setSets] = useState<StudySet[] | null>(null);
  useEffect(() => {
    void db().customSets.toArray().then(setSets);
  }, []);
  if (!sets?.length) return null;

  const remove = async (slug: string) => {
    if (!confirm("Delete this set and its words from this device?")) return;
    const set = sets.find((s) => s.slug === slug);
    await db().transaction("rw", [db().customSets, db().customEntries, db().customSentences], async () => {
      await db().customSets.delete(slug);
      for (const id of set?.entryIds ?? []) {
        await db().customEntries.delete(id);
        await db().customSentences.where("entryId").equals(id).delete();
      }
    });
    invalidateContent();
    setSets((xs) => (xs ?? []).filter((s) => s.slug !== slug));
  };

  return (
    <section>
      <h2 className="font-serif text-xl font-bold">Imported</h2>
      <ul>
        {sets.map((s) => (
          <li key={s.slug} className="flex items-center gap-2 border-b border-line py-2">
            <div className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{s.name}</span>
              <span className="text-sm text-muted">{s.entryIds.length} words · on this device</span>
            </div>
            <button className="btn !min-h-11 text-sm" onClick={() => void remove(s.slug)}>
              Delete
            </button>
            <Link className="btn btn-primary !min-h-11 text-sm" href={`/study?set=${s.slug}&mode=cards`}>
              Study
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

"use client";
import Dexie, { type EntityTable } from "dexie";
import type { ReviewState } from "../srs";
import type { Entry, Sentence, StudySet } from "../types";

export interface CustomSentence extends Sentence {
  id?: number;
}

/** Everything the learner owns lives here, so the app works fully offline. */
class VocabDB extends Dexie {
  reviews!: EntityTable<ReviewState, "entryId">;
  customEntries!: EntityTable<Entry, "id">;
  customSets!: EntityTable<StudySet, "slug">;
  customSentences!: EntityTable<CustomSentence, "id">;

  constructor() {
    super("vocabulario");
    this.version(1).stores({
      reviews: "entryId, due, updatedAt",
      customEntries: "id, slug",
      customSets: "slug",
      customSentences: "++id, entryId",
    });
  }
}

let instance: VocabDB | null = null;
export function db(): VocabDB {
  instance ??= new VocabDB();
  return instance;
}

export async function allReviews(): Promise<Map<string, ReviewState>> {
  const rows = await db().reviews.toArray();
  return new Map(rows.map((r) => [r.entryId, r]));
}

export async function saveReview(r: ReviewState): Promise<void> {
  await db().reviews.put(r);
}

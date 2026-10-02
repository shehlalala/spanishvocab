"use client";
import { useCallback, useEffect, useState } from "react";
import { loadContent } from "@/lib/client/content";
import { allReviews, saveReview } from "@/lib/client/db";
import { newState, schedule, type Grade, type ReviewState } from "@/lib/srs";
import type { Content } from "@/lib/types";

export interface StudyData {
  content: Content | null;
  reviews: ReadonlyMap<string, ReviewState>;
  error: string | null;
  grade: (entryId: string, grade: Grade) => void;
}

/** Loads words and progress from the local cache; works offline once the app has been opened once. */
export function useStudyData(): StudyData {
  const [content, setContent] = useState<Content | null>(null);
  const [reviews, setReviews] = useState<ReadonlyMap<string, ReviewState>>(new Map());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    Promise.all([loadContent(), allReviews()])
      .then(([c, r]) => {
        if (!live) return;
        setContent(c);
        setReviews(r);
      })
      .catch((e: unknown) => live && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      live = false;
    };
  }, []);

  const grade = useCallback((entryId: string, g: Grade) => {
    setReviews((prev) => {
      const now = Date.now();
      const next = schedule(prev.get(entryId) ?? newState(entryId, now), g, now);
      void saveReview(next);
      const m = new Map(prev);
      m.set(entryId, next);
      return m;
    });
  }, []);

  return { content, reviews, error, grade };
}

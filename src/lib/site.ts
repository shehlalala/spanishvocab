export const SITE_NAME = "Vocabulario";
export const SITE_TAGLINE = "Spanish vocabulary with flashcards, quizzes and spaced repetition";
export const SITE_DESCRIPTION =
  "Learn B1 Spanish vocabulary: 1,300 words with articles, gender, meanings, usage notes, example sentences and Latin American equivalents, plus offline flashcards and spaced repetition.";

/** Canonical origin. Set NEXT_PUBLIC_SITE_URL in production; Vercel's production URL is the fallback. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/$/, "");

export const abs = (path: string): string => `${SITE_URL}${path}`;

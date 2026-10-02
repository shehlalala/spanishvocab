# Vocabulario

A mobile-first, offline-capable Spanish vocabulary trainer. It began as a single HTML page (`vocabulario.html`), which is
kept in the repo as the source of the word data.

- **Study app:** "Due today" home screen with SM-2 spaced repetition, plus four modes: flashcards, multiple-choice quiz,
  sentence fill-in and EN → ES typing. Progress lives in IndexedDB, so the app works with no connection once it has
  been opened.
- **Public pages:** one static page per word (`/es/palabra/[slug]`), topic (`/es/tema/[slug]`) and set (`/set/[slug]`),
  written so search engines and AI assistants can quote them. These pages include JSON-LD, `llms.txt` and sitemaps.
- **Regional variants:** Spain or Latin America, chosen in Settings. The choice changes which word is shown and which
  answers count as exact.

## Local setup

Requires Node 20.9+.

```bash
npm install
npm run dev            # http://localhost:3000
```

The service worker only registers in production builds. To try offline mode or "Add to Home Screen":

```bash
npm run build && npm start
```

## Scripts

| Command             | What it does                                                            |
| ------------------- | ----------------------------------------------------------------------- |
| `npm run dev`       | Development server                                                      |
| `npm run build`     | Production build (about 2,800 static pages and images, roughly 30 s)    |
| `npm run import`    | Re-generate `data/content.json` from `vocabulario.html`                 |
| `npm test`          | Vitest unit tests (answer checking, SM-2, queues, importer, word pages) |
| `npm run test:e2e`  | Playwright end-to-end tests (builds and starts the app on port 3300)    |
| `npm run lint`      | ESLint                                                                  |
| `npm run typecheck` | `tsc --noEmit` (strict)                                                 |
| `npm run format`    | Prettier                                                                |

If you already have a Chromium installed, point Playwright at it with
`CHROMIUM_PATH=/path/to/chrome npm run test:e2e`.

## The data import

`scripts/import-html.ts` reads `vocabulario.html` and writes:

- `data/content.json`: typed entries, sentences, topics and sets (see `src/lib/types.ts`). This file is committed and is
  the app's source of truth.
- `data/import-report.md`: counts checked against the expected totals, lines that failed to parse, merged duplicates,
  gender guesses to review, and notes that were moved to private.

How the importer works:

- It **does not regex-scrape**. It runs the page's own `const S1…`, `SENT` and `B1` declarations in an isolated VM
  context, then normalises the results.
- The same word in a personal set and the B1 list becomes **one entry** in both places. When the meanings differ, it
  stays as **separate senses** that share a page, for example _presa_ (dam / prey).
- B1 nouns come without articles, so the importer infers gender from the word ending. Weak guesses are listed in the
  report.
- Notes in Turkish are kept as `privateNote`. They show while you study and never on public pages.

Two hand-curated input files:

- `data/variants.json` lists Spain-only words and their Latin American equivalents (for example _zumo → jugo_).
- `data/confusions.json` lists commonly confused pairs (for example _suceso / éxito_), which appear on the word pages.

Edit either file and run `npm run import`. If the content hasn't changed, re-running the import leaves `updatedAt`
unchanged.

## Adding a word set

**On your phone, right away:** open **+ Add a set** (`/import`).

1. Paste one word per line as `word - meaning`. Tabs, `–`, `=`, `|` and `: ` also work as separators. A third field
   becomes a note.
2. The importer fills in the article and part of speech and highlights its guesses so you can check them.
3. Optionally add a sentence containing `___` for the Sentences mode.

The set is saved on that device (IndexedDB) and works offline. It is not published as a public page.

**Permanently, for everyone:** add a new block to `vocabulario.html` next to the others, in the same
`word|meaning|note` format:

```js
const S9 = `el relámpago|lightning|el trueno = thunder
merendar|to have an afternoon snack|`;
```

Add sentences to `SENT`, keyed by the exact word string. Then run `npm run import`, update `EXPECTED_MINE` in the
script if the report flags the new total, and commit. The new set gets its own `/set/set-9` page and its words get
public pages on the next deploy.

## Deploying to Vercel

1. Import the GitHub repo in Vercel. No settings or environment variables are needed: everything is static and
   progress is stored on the device.
2. Optionally set `NEXT_PUBLIC_SITE_URL` (for example `https://vocabulario.example`) for canonical URLs, sitemaps and
   Open Graph tags. Without it, Vercel's production URL is used.

This fits comfortably in Vercel's free Hobby plan, which is for non-commercial use.

## Project layout

```
scripts/import-html.ts       one-off importer (HTML → data/content.json + report)
data/                        content.json, import-report.md, variants.json, confusions.json
src/lib/answer.ts            answer normalisation and checking (accents, articles, alternates, plurals)
src/lib/srs.ts               SM-2 scheduler
src/lib/queue.ts             session queues, quiz options, Due today
src/lib/region.ts            Spain / Latin America forms and accepted answers
src/lib/word-page.ts         text for public word pages (lead answer, FAQs)
src/lib/client/              IndexedDB (Dexie), settings, speech, client content loader
src/components/study/        the four study modes
src/app/es/palabra|tema/     public word and topic pages
src/app/set/                 public set pages and CSV export
public/sw.js                 service worker
e2e/                         Playwright tests
```

## Not built yet

- **Accounts and server sync** (Auth.js plus Postgres on Neon). Progress is currently per device. Settings → Export /
  Import progress moves it between devices in the meantime.
- **Server-side admin import.** Pasted sets stay on the device. Permanent sets go through `vocabulario.html`, as
  described above.
- **Example sentences for the ~1,080 words that don't have one yet**, and more confusion pairs.

import type { Page } from "@playwright/test";
import type { Content, Entry, Sentence } from "../src/lib/types";

let cached: Content | null = null;
export async function content(page: Page): Promise<Content> {
  if (!cached) cached = (await (await page.request.get("/content.json")).json()) as Content;
  return cached;
}

export async function entryByDisplay(page: Page, display: string): Promise<Entry> {
  const c = await content(page);
  const e = c.entries.find((x) => x.display === display);
  if (!e) throw new Error(`No entry shown as ${display}`);
  return e;
}

export async function sentenceByText(page: Page, before: string): Promise<Sentence> {
  const c = await content(page);
  const s = c.sentences.find((x) => x.text.startsWith(before.trim()));
  if (!s) throw new Error(`No sentence starting with ${before}`);
  return s;
}

export const stripAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

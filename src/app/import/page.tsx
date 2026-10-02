import type { Metadata } from "next";
import { ImportForm } from "@/components/ImportForm";

export const metadata: Metadata = { title: "Add a word set", robots: { index: false } };

export default function ImportPage() {
  return (
    <main className="mx-auto max-w-[640px] px-4 pt-3">
      <h1 className="mb-2 font-serif text-[1.9rem] leading-tight font-bold">Add a word set</h1>
      <p className="mb-4 text-muted">
        Paste one word per line as <code>word - meaning</code>. Articles and parts of speech are filled in for you;
        check the highlighted guesses before saving.
      </p>
      <ImportForm />
    </main>
  );
}

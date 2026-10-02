import type { Metadata } from "next";
import { Suspense } from "react";
import { StudyApp } from "@/components/study/StudyApp";

export const metadata: Metadata = { title: "Study", robots: { index: false } };

export default function StudyPage() {
  return (
    <main className="mx-auto max-w-[520px] px-4 pt-3">
      <h1 className="sr-only">Study</h1>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <StudyApp />
      </Suspense>
    </main>
  );
}

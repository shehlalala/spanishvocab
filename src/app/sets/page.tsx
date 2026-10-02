import type { Metadata } from "next";
import Link from "next/link";
import { CustomSets } from "@/components/CustomSets";
import { content } from "@/lib/content";
import { topicEn } from "@/lib/topic-names";
import type { StudySet } from "@/lib/types";

export const metadata: Metadata = {
  title: "Word sets",
  description: "All Spanish vocabulary sets: personal sets and the B1 word list grouped into 47 topics.",
  alternates: { canonical: "/sets" },
};

function Row({ set }: { set: StudySet }) {
  const topic = set.slug.startsWith("b1-") && set.slug !== "b1-all" ? set.slug.slice(3) : null;
  return (
    <li className="flex items-center gap-2 border-b border-line py-2">
      <Link href={`/set/${set.slug}`} className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{set.name}</span>
        <span className="text-sm text-muted">
          {topic ? `${topicEn(topic)} · ` : ""}
          {set.entryIds.length} words
        </span>
      </Link>
      <Link className="btn btn-primary !min-h-11 shrink-0 text-sm" href={`/study?set=${set.slug}&mode=cards`}>
        Study
      </Link>
    </li>
  );
}

export default function SetsPage() {
  const mine = content.sets.filter((s) => s.kind === "mine");
  const b1 = content.sets.filter((s) => s.kind === "b1");
  return (
    <main className="mx-auto max-w-[520px] px-4 pt-3">
      <h1 className="mb-4 font-serif text-[1.9rem] leading-tight font-bold">Word sets</h1>
      <CustomSets />
      <h2 className="mt-4 font-serif text-xl font-bold">My words</h2>
      <ul>
        {mine.map((s) => (
          <Row key={s.slug} set={s} />
        ))}
      </ul>
      <h2 className="mt-6 font-serif text-xl font-bold">B1 word list by topic</h2>
      <ul>
        {b1.map((s) => (
          <Row key={s.slug} set={s} />
        ))}
      </ul>
    </main>
  );
}

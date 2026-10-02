import Link from "next/link";
import { Today } from "@/components/Today";
import { content } from "@/lib/content";
import { topicEn } from "@/lib/topic-names";

export default function Home() {
  return (
    <main className="mx-auto max-w-[520px] px-4 pt-3">
      <h1 className="mb-4 font-serif text-[1.9rem] leading-tight font-bold">Tu vocabulario</h1>
      <Today />
      <section className="prose-page mt-8 text-[0.95rem]">
        <h2>What is Vocabulario?</h2>
        <p>
          Vocabulario is a free Spanish vocabulary trainer with {content.entries.length.toLocaleString("en")} B1-level
          words. Each word has its article and gender, an English meaning, usage notes and, for many words, example
          sentences. It works offline and schedules reviews with spaced repetition.
        </p>
        <h2>Browse Spanish vocabulary by topic</h2>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
          {content.topics.map((t) => (
            <li key={t.slug}>
              <Link href={`/es/tema/${t.slug}`}>{topicEn(t.slug)}</Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

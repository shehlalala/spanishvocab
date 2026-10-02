import Link from "next/link";
import type { Entry } from "@/lib/types";

/** Word → meaning definition list: parses cleanly as term/definition pairs. */
export function WordList({ entries }: { entries: readonly Entry[] }) {
  return (
    <dl className="facts">
      {entries.map((e) => (
        <div key={e.id} className="contents">
          <dt lang="es">
            <Link href={`/es/palabra/${e.slug}`}>{e.display}</Link>
          </dt>
          <dd>{e.meaning}</dd>
        </div>
      ))}
    </dl>
  );
}

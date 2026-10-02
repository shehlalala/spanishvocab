import { content, entriesOf, setBySlug } from "@/lib/content";

export const dynamicParams = false;
export function generateStaticParams() {
  return content.sets.map((s) => ({ slug: s.slug }));
}

const cell = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

export async function GET(_req: Request, ctx: RouteContext<"/set/[slug]/csv">) {
  const { slug } = await ctx.params;
  const set = setBySlug(slug);
  if (!set) return new Response("Not found", { status: 404 });
  const rows = [
    ["spanish", "english", "part_of_speech", "note"],
    ...entriesOf(set.entryIds).map((e) => [e.display, e.meaning, e.pos, e.note]),
  ];
  return new Response("﻿" + rows.map((r) => r.map(cell).join(",")).join("\n") + "\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.csv"`,
    },
  });
}

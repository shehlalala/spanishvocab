import Link from "next/link";
import { content } from "@/lib/content";

export function Breadcrumbs({ items }: { items: { name: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3 text-sm text-muted">
      <ol className="flex flex-wrap gap-1">
        {items.map((it, i) => (
          <li key={i} className="flex gap-1">
            {i > 0 ? <span aria-hidden="true">›</span> : null}
            {it.href ? (
              <Link href={it.href} className="underline-offset-2 hover:underline">
                {it.name}
              </Link>
            ) : (
              <span aria-current="page">{it.name}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Visible modified date; matches dateModified in the page's JSON-LD. */
export function Updated() {
  const d = new Date(content.updatedAt);
  return (
    <p className="mt-10 text-sm text-muted">
      Last updated{" "}
      <time dateTime={content.updatedAt}>
        {d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}
      </time>
    </p>
  );
}

export const breadcrumbLd = (items: { name: string; url: string }[]) => ({
  "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: it.url })),
});

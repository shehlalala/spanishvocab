import "server-only";
import { allSlugs, content } from "./content";
import { abs } from "./site";

export const SITEMAP_FILES = ["pages.xml", "words.xml", "topics.xml", "sets.xml"] as const;
export type SitemapFile = (typeof SITEMAP_FILES)[number];

export function urlsFor(file: SitemapFile): string[] {
  switch (file) {
    case "pages.xml":
      return ["/", "/sets", "/es/palabras", "/es/temas"].map(abs);
    case "words.xml":
      return allSlugs().map((s) => abs(`/es/palabra/${encodeURIComponent(s)}`));
    case "topics.xml":
      return content.topics.map((t) => abs(`/es/tema/${t.slug}`));
    case "sets.xml":
      return content.sets.map((s) => abs(`/set/${s.slug}`));
  }
}

const xml = (body: string) =>
  new Response(`<?xml version="1.0" encoding="UTF-8"?>\n${body}\n`, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });

export function sitemapIndex(): Response {
  const items = SITEMAP_FILES.map(
    (f) => `  <sitemap><loc>${abs(`/sitemaps/${f}`)}</loc><lastmod>${content.updatedAt}</lastmod></sitemap>`,
  );
  return xml(
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items.join("\n")}\n</sitemapindex>`,
  );
}

export function sitemap(file: SitemapFile): Response {
  const items = urlsFor(file).map(
    (u) =>
      `  <url><loc>${u}</loc><lastmod>${content.updatedAt}</lastmod><xhtml:link rel="alternate" hreflang="en" href="${u}"/><xhtml:link rel="alternate" hreflang="x-default" href="${u}"/></url>`,
  );
  return xml(
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${items.join("\n")}\n</urlset>`,
  );
}

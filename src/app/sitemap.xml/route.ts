import { sitemapIndex } from "@/lib/sitemaps";

export const dynamic = "force-static";

/** Sitemap index pointing at one sitemap per page type. */
export function GET() {
  return sitemapIndex();
}

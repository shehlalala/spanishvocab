import { SITEMAP_FILES, sitemap, type SitemapFile } from "@/lib/sitemaps";

export const dynamicParams = false;
export function generateStaticParams() {
  return SITEMAP_FILES.map((file) => ({ file }));
}

export async function GET(_req: Request, ctx: RouteContext<"/sitemaps/[file]">) {
  const { file } = await ctx.params;
  if (!(SITEMAP_FILES as readonly string[]).includes(file)) return new Response("Not found", { status: 404 });
  return sitemap(file as SitemapFile);
}

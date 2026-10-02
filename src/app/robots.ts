import type { MetadataRoute } from "next";
import { abs } from "@/lib/site";

const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "PerplexityBot",
  "Google-Extended",
];
const PRIVATE = ["/study", "/settings", "/import", "/content.json"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // AI crawlers are explicitly welcome: the word pages are written to be quoted.
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: "/", disallow: PRIVATE })),
      { userAgent: "*", allow: "/", disallow: PRIVATE },
    ],
    sitemap: abs("/sitemap.xml"),
  };
}

import { content } from "@/lib/content";

export const dynamic = "force-static";

/** The whole word list for the offline study app (cached by the service worker). */
export function GET() {
  return Response.json(content);
}

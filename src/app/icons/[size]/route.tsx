import { ImageResponse } from "next/og";
import { LogoMark } from "@/components/Logo";

const SIZES = {
  "192": { px: 192, pad: 16 },
  "512": { px: 512, pad: 40 },
  maskable: { px: 512, pad: 96 },
  apple: { px: 180, pad: 14 },
} as const;
type SizeKey = keyof typeof SIZES;

export const dynamicParams = false;
export function generateStaticParams() {
  return Object.keys(SIZES).map((size) => ({ size }));
}

export async function GET(_req: Request, ctx: RouteContext<"/icons/[size]">) {
  const { size } = await ctx.params;
  const s = SIZES[size as SizeKey];
  if (!s) return new Response("Not found", { status: 404 });
  return new ImageResponse(<LogoMark size={s.px} padding={s.pad} />, { width: s.px, height: s.px });
}

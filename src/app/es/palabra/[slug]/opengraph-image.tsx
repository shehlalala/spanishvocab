import { ImageResponse } from "next/og";
import { allSlugs, entriesForSlug, grammarLabel } from "@/lib/content";
import { SITE_NAME } from "@/lib/site";

export const alt = "Spanish word card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return allSlugs().map((slug) => ({ slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const e = entriesForSlug(decodeURIComponent(slug))[0];
  const tile = "repeating-linear-gradient(45deg, #1d4e9e 0px, #1d4e9e 22px, #f2b632 22px, #f2b632 44px)";
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        padding: 28,
        background: "#1d4e9e",
        backgroundImage: tile,
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          borderRadius: 36,
          color: "#14213d",
        }}
      >
        <div style={{ fontSize: 108, fontWeight: 700, fontFamily: "serif" }}>{e?.display ?? slug}</div>
        <div style={{ fontSize: 56, color: "#1d4e9e", marginTop: 12 }}>{e?.meaning ?? ""}</div>
        <div style={{ fontSize: 30, color: "#56637d", marginTop: 28 }}>
          {`${e ? grammarLabel(e) : ""} · ${SITE_NAME}`}
        </div>
      </div>
    </div>,
    size,
  );
}

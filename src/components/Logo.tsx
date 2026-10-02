/** Tile-pattern "V" mark, used for app icons and social images (ImageResponse-compatible styles only). */
export function LogoMark({ size, padding = 0 }: { size: number; padding?: number }) {
  const inner = size - padding * 2;
  const border = Math.round(inner * 0.09);
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1d4e9e",
      }}
    >
      <div
        style={{
          width: inner,
          height: inner,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: inner * 0.18,
          border: `${border}px solid #f2b632`,
          background: "#ffffff",
          color: "#1d4e9e",
          fontSize: inner * 0.62,
          fontWeight: 700,
          fontFamily: "serif",
        }}
      >
        V
      </div>
    </div>
  );
}

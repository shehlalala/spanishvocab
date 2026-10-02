import type { Metadata, Viewport } from "next";
import { Alegreya, Karla } from "next/font/google";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { Nav } from "@/components/Nav";
import { ServiceWorker } from "@/components/ServiceWorker";
import { THEME_BOOT } from "@/lib/client/settings";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL, abs } from "@/lib/site";
import "./globals.css";

const alegreya = Alegreya({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-alegreya", display: "swap" });
const karla = Karla({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-karla", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME}: ${SITE_TAGLINE}`, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "default" },
  openGraph: { siteName: SITE_NAME, type: "website", locale: "en" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Resize the layout when the on-screen keyboard opens, so it never covers the answer field.
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef2f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1830" },
  ],
};

const siteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": abs("/#organization"),
      name: SITE_NAME,
      url: abs("/"),
      logo: abs("/icons/512"),
    },
    {
      "@type": "WebSite",
      "@id": abs("/#website"),
      name: SITE_NAME,
      url: abs("/"),
      description: SITE_DESCRIPTION,
      inLanguage: "en",
      publisher: { "@id": abs("/#organization") },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${alegreya.variable} ${karla.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className="min-h-dvh antialiased">
        <JsonLd data={siteJsonLd} />
        <header className="mx-auto flex max-w-[640px] items-center justify-between px-4 pt-4">
          <Link href="/" className="font-serif text-lg font-bold text-tile">
            {SITE_NAME}
          </Link>
          <Link href="/import" className="text-sm font-semibold text-muted underline-offset-2 hover:underline">
            + Add a set
          </Link>
        </header>
        <div className="pb-[calc(76px+env(safe-area-inset-bottom))]">{children}</div>
        <Nav />
        <ServiceWorker />
      </body>
    </html>
  );
}

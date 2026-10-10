import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { BrandTheme } from "@/components/brand-theme";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { QuickBar } from "@/components/quick-bar";
import { Preloader } from "@/components/preloader";
import { Tracker } from "@/components/tracker";
import { ChunkRecovery } from "@/components/chunk-recovery";
import { ChatWidget } from "@/components/chat-widget";
import { LeadCaptureModal } from "@/components/lead-capture-modal";
import { ServiceWorker } from "@/components/service-worker";
import { JsonLd } from "@/components/json-ld";
import { getDb, getPref } from "@/lib/store";
import { BRAND_DEFAULTS } from "@/lib/brand";
import { activeAnnouncement } from "@/lib/cms";
import { display, body } from "@/lib/fonts";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const pick = (k: string): string => {
    try { return getPref(k, BRAND_DEFAULTS[k] ?? ""); } catch { return BRAND_DEFAULTS[k] ?? ""; }
  };
  const name = pick("site_name") || "CodeRender";
  const tagline = pick("site_tagline");
  const description = pick("site_description") || BRAND_DEFAULTS.site_description;
  const keywords = pick("site_keywords").split(",").map((s) => s.trim()).filter(Boolean);
  const favicon = pick("brand_favicon");
  const apple = pick("brand_pwa_apple") || favicon;
  const icon = favicon || "/icon.svg";
  return {
    title: {
      default: tagline ? `${name} — ${tagline}` : name,
      template: `%s — ${name}`,
    },
    description,
    keywords: keywords.length > 0 ? keywords : undefined,
    metadataBase: new URL("https://coderender.in"),
    icons: { icon, ...(apple ? { apple } : {}) },
    openGraph: {
      title: tagline ? `${name} — ${tagline}` : name,
      description,
      siteName: name,
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: name }],
    },
    twitter: {
      card: "summary_large_image",
      title: tagline ? `${name} — ${tagline}` : name,
      description,
      images: ["/opengraph-image"],
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  let announcement = "";
  try {
    const hit = activeAnnouncement();
    if (hit?.text) {
      announcement = hit.text;
    } else {
      const b = getDb().prepare("SELECT body FROM ContentBlock WHERE key='announcement' AND published=1").get() as
        { body: string } | undefined;
      announcement = b?.body ?? "";
    }
  } catch { /* first boot before tables exist */ }
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${body.variable}`}>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <Preloader />
          <ChunkRecovery />
          <Tracker />
          <BrandTheme />
          <ServiceWorker />
          <JsonLd />
          <SiteHeader announcement={announcement || undefined} />
          <main className="pb-20 md:pb-0">{children}</main>
          <SiteFooter />
          <QuickBar />
          <ChatWidget />
          <LeadCaptureModal />
        </ThemeProvider>
      </body>
    </html>
  );
}

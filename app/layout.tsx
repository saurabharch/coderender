import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { QuickBar } from "@/components/quick-bar";
import { Preloader } from "@/components/preloader";
import { Tracker } from "@/components/tracker";
import { ChatWidget } from "@/components/chat-widget";
import { JsonLd } from "@/components/json-ld";
import { getDb } from "@/lib/store";
import { display, body } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CodeRender — WhatsApp Automation, Google Business Profile & Local SEO",
    template: "%s — CodeRender",
  },
  description:
    "CodeRender grows local businesses with WhatsApp Business API automation, Google Business Profile management, local SEO, lead generation, and fast websites. Salons, clinics, gyms, restaurants and more.",
  keywords: [
    "whatsapp business api", "whatsapp automation", "google business profile management",
    "local seo india", "lead generation services", "salon marketing", "clinic marketing",
    "restaurant marketing", "gym marketing", "google maps ranking",
  ],
  metadataBase: new URL("https://coderender.in"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  let announcement = "";
  try {
    const b = getDb().prepare("SELECT body FROM ContentBlock WHERE key='announcement' AND published=1").get() as
      { body: string } | undefined;
    announcement = b?.body ?? "";
  } catch { /* first boot before tables exist */ }
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${body.variable}`}>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <Preloader />
          <Tracker />
          <JsonLd />
          <SiteHeader announcement={announcement || undefined} />
          <main className="pb-20 md:pb-0">{children}</main>
          <SiteFooter />
          <QuickBar />
          <ChatWidget />
        </ThemeProvider>
      </body>
    </html>
  );
}

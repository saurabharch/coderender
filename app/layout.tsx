import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { QuickBar } from "@/components/quick-bar";
import { display, body } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "CodeRender — Marketing that delivers revenue",
  description: "Google Business Profile, WhatsApp automation, local SEO, and websites for local businesses.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${body.variable}`}>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <SiteHeader />
          <main className="pb-20 md:pb-0">{children}</main>
          <SiteFooter />
          <QuickBar />
        </ThemeProvider>
      </body>
    </html>
  );
}

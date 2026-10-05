"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import {
  MantineProvider, createTheme, useMantineColorScheme,
  type MantineColorsTuple,
} from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { Spotlight, SpotlightActionData, spotlight } from "@mantine/spotlight";
import { NavigationProgress, nprogress } from "@mantine/nprogress";

// Mantine CSS: imported here (admin subtree only) so storefront tokens never
// meet Mantine's. All classes are .mantine-* namespaced; project tokens win.
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/charts/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/spotlight/styles.css";
import "@mantine/carousel/styles.css";
import "@mantine/dropzone/styles.css";
import "@mantine/code-highlight/styles.css";
import "@mantine/nprogress/styles.css";
import "@mantine/lightbox/styles.css";

const brand: MantineColorsTuple = [
  "#effdf9", "#ccfbf1", "#99f0dd", "#5ee3c3", "#2dd0a5",
  "#0d9488", "#0f766e", "#115e59", "#134e4a", "#042f2e",
];

const theme = createTheme({
  primaryColor: "brand",
  colors: { brand },
  fontFamily: "var(--font-body), system-ui, sans-serif",
  headings: { fontFamily: "var(--font-display), system-ui, sans-serif" },
});

// next-themes (class) → Mantine scheme bridge. One direction only.
function SchemeBridge() {
  const { resolvedTheme } = useTheme();
  const { setColorScheme } = useMantineColorScheme();
  useEffect(() => {
    setColorScheme(resolvedTheme === "dark" ? "dark" : "light");
  }, [resolvedTheme, setColorScheme]);
  return null;
}

function ProgressBridge() {
  const path = usePathname();
  const query = useSearchParams();
  useEffect(() => {
    nprogress.complete();
  }, [path, query]);
  useEffect(() => {
    nprogress.start();
    const t = setTimeout(() => nprogress.complete(), 2500);
    return () => clearTimeout(t);
  }, [path]);
  return null;
}

const SEARCH_ACTIONS: SpotlightActionData[] = [
  { id: "overview", label: "Overview", description: "Business at a glance", onClick: () => { window.location.href = "/admin"; } },
  { id: "shop", label: "Shop", description: "Products and orders", onClick: () => { window.location.href = "/admin/shop"; } },
  { id: "stock", label: "Stock", description: "Levels, POs, bins", onClick: () => { window.location.href = "/admin/stock"; } },
  { id: "billing", label: "Billing", description: "Bills, accounts, expenses", onClick: () => { window.location.href = "/admin/billing"; } },
  { id: "retail", label: "Retail", description: "Counter, campaigns, shipments", onClick: () => { window.location.href = "/admin/retail"; } },
  { id: "crm", label: "CRM", description: "Customers, loyalty, reviews", onClick: () => { window.location.href = "/admin/crm"; } },
  { id: "services", label: "Services", description: "Job cards, branches", onClick: () => { window.location.href = "/admin/services"; } },
  { id: "people", label: "People", description: "Team, payroll, BI", onClick: () => { window.location.href = "/admin/people"; } },
  { id: "bi", label: "BI", description: "Analytics command center", onClick: () => { window.location.href = "/admin/bi"; } },
  { id: "scale", label: "Scale", description: "Channels, franchise, import", onClick: () => { window.location.href = "/admin/scale"; } },
  { id: "settings", label: "Settings", description: "Business, tax, team, keys", onClick: () => { window.location.href = "/admin/settings"; } },
];

export function MantineShell({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        spotlight.open();
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);
  // Server + first paint: plain children (every Mantine subtree below
  // self-gates the same way). Providers mount client-side only.
  if (!ready) return <>{children}</>;
  return (
    <MantineProvider theme={theme} defaultColorScheme="light">
      <SchemeBridge />
      <ProgressBridge />
      <NavigationProgress />
      <Notifications position="bottom-right" />
      <Spotlight
        actions={SEARCH_ACTIONS}
        searchProps={{ placeholder: "Search admin… (products, orders, bills)" }}
        shortcut={["mod + K", "ctrl + K"]}
      />
      <ModalsProvider />
      {children}
    </MantineProvider>
  );
}

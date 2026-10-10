import {
  Archivo, Inter,
  Noto_Sans_Devanagari, Noto_Sans_Bengali, Noto_Sans_Tamil,
  Noto_Sans_Telugu, Noto_Sans_Kannada, Noto_Sans_Gujarati,
  Noto_Naskh_Arabic,
} from "next/font/google";

export const display = Archivo({
  subsets: ["latin", "latin-ext"],
  weight: ["700", "800"],
  variable: "--font-display",
  display: "swap",
});

export const body = Inter({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

// Regional scripts (Hindi/Marathi, Bengali, Tamil, Telugu, Kannada,
// Gujarati, Urdu/Arabic). Build-time only — no runtime font downloads.
export const indic = Noto_Sans_Devanagari({
  subsets: ["latin", "latin-ext", "devanagari"],
  weight: ["400", "600", "700"],
  variable: "--font-indic",
  display: "swap",
});

export const bengali = Noto_Sans_Bengali({
  subsets: ["latin", "bengali"],
  weight: ["400", "600", "700"],
  variable: "--font-bengali",
  display: "swap",
});

export const tamil = Noto_Sans_Tamil({
  subsets: ["latin", "tamil"],
  weight: ["400", "600", "700"],
  variable: "--font-tamil",
  display: "swap",
});

export const telugu = Noto_Sans_Telugu({
  subsets: ["latin", "telugu"],
  weight: ["400", "600", "700"],
  variable: "--font-telugu",
  display: "swap",
});

export const kannada = Noto_Sans_Kannada({
  subsets: ["latin", "kannada"],
  weight: ["400", "600", "700"],
  variable: "--font-kannada",
  display: "swap",
});

export const gujarati = Noto_Sans_Gujarati({
  subsets: ["latin", "gujarati"],
  weight: ["400", "600", "700"],
  variable: "--font-gujarati",
  display: "swap",
});

export const arabic = Noto_Naskh_Arabic({
  subsets: ["latin", "arabic"],
  weight: ["400", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

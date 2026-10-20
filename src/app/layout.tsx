import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next } from "next/font/google";
import "./globals.css";

// Designed by the Braille Institute for legibility: clinical readability on small screens.
const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin"],
  // next/font has no metric overrides for this family; fall back to the system UI font.
  adjustFontFallback: false,
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: { default: "ShiftPatch", template: "%s | ShiftPatch" },
  description: "Nursing shift marketplace: agencies post open shifts, credentialed nurses claim them.",
};

export const viewport: Viewport = {
  themeColor: "#3d74b8",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${atkinson.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}

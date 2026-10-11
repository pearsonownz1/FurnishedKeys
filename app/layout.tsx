import type { Metadata } from "next";
import { Instrument_Serif, Inter } from "next/font/google";
import { brand } from "@/lib/brand";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.furnishedkeys.com"),
  title: {
    default: brand.title,
    template: "%s | Furnished Keys",
  },
  description: brand.subline,
  applicationName: brand.name,
  openGraph: {
    title: brand.title,
    description: brand.subline,
    siteName: brand.name,
    type: "website",
    images: [
      {
        url: "/demo/hero.jpg",
        alt: "Furnished living room with pines beyond the windows",
      },
    ],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-surface focus:px-3 focus:py-2 focus:text-ink"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}

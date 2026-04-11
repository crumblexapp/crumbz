import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";

const manrope = localFont({
  src: "./fonts/Manrope-Bold.ttf",
  variable: "--font-manrope",
  display: "swap",
});

const youngSerif = localFont({
  src: "./fonts/YoungSerif-Regular.ttf",
  variable: "--font-young-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "crumbz",
  description: "the feed that keeps you hungry.",
  metadataBase: new URL("https://app.crumbz.pl"),
  applicationName: "crumbz",
  alternates: {
    canonical: "https://app.crumbz.pl",
  },
  icons: {
    icon: "/brand/crumbz-home-icon.png",
    apple: "/brand/crumbz-home-icon.png",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "crumbz",
  },
  openGraph: {
    title: "crumbz",
    description: "the feed that keeps you hungry.",
    siteName: "crumbz",
    images: [
      {
        url: "https://app.crumbz.pl/opengraph-image",
        width: 1200,
        height: 630,
        alt: "crumbz",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "crumbz",
    description: "the feed that keeps you hungry.",
    images: ["https://app.crumbz.pl/opengraph-image"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light notranslate" translate="no" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        translate="no"
        className={`${manrope.variable} ${youngSerif.variable} min-h-screen bg-background font-sans text-foreground antialiased`}
        style={
          {
            "--font-geist-sans": '"Manrope", system-ui, sans-serif',
            "--font-geist-mono": '"SFMono-Regular", "SF Mono", Consolas, "Liberation Mono", monospace',
            "--font-space-grotesk": '"Manrope", system-ui, sans-serif',
            "--font-bricolage": '"Manrope", system-ui, sans-serif',
            "--font-instrument-serif": '"Times New Roman", Georgia, serif',
          } as React.CSSProperties
        }
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";
import { asset } from "@/lib/asset";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://pulsarcompute.xyz"),
  title: {
    default: "Pulsar — The Signal Layer for Decentralized AI Compute",
    template: "%s · Pulsar",
  },
  description:
    "PULSAR is the utility token powering decentralized AI compute — pay $PULSAR to run models, earn $PULSAR by supplying GPU power. On Base.",
  keywords: [
    "Pulsar",
    "$PULSAR",
    "decentralized AI",
    "AI compute",
    "Base",
    "ERC-20",
    "GPU network",
    "inference",
    "utility token",
  ],
  authors: [{ name: "Pulsar Compute" }],
  creator: "Pulsar Compute",
  openGraph: {
    title: "Pulsar — The Signal Layer for Decentralized AI Compute",
    description:
      "Pay $PULSAR to run AI inference. Earn $PULSAR by supplying GPU power. Deflationary by design, on Base.",
    url: "https://pulsarcompute.xyz",
    siteName: "Pulsar",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pulsar — The Signal Layer for Decentralized AI Compute",
    description:
      "Pay $PULSAR to run AI inference. Earn $PULSAR by supplying GPU power. On Base.",
    creator: "@pulsarcompute",
  },
  icons: {
    icon: asset("/favicon.svg"),
    apple: asset("/favicon.svg"),
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${spaceGrotesk.variable} ${inter.variable} font-body antialiased bg-cosmos text-foreground min-h-screen flex flex-col selection:bg-pulsar/30 selection:text-white`}
      >
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}

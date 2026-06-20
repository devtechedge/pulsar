import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeBootstrap } from "@/components/ThemeBootstrap";
import { themeInitScript } from "@/lib/theme-init";

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

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
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
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" data-theme="dark" style={{ colorScheme: "dark" }} suppressHydrationWarning>
      <head>
        {/* Inline FOUC-prevention script — sets theme class before paint.
            JSX defaults to "dark" so SSR + first paint is always dark (no FOUC).
            The script + ThemeBootstrap then upgrade to the user's preferred theme
            (stored or system) before React commits its hydration pass. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} font-body antialiased bg-background text-foreground min-h-screen flex flex-col selection:bg-pulsar/30 selection:text-white`}
      >
        <ThemeBootstrap />
        <ThemeProvider>
          <Providers>{children}</Providers>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}

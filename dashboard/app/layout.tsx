import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://zaimonitor.vercel.app";
const SITE_TITLE = "ZAI Monitor – AI Inference Latency & Throughput Dashboard";
const SITE_DESCRIPTION =
  "Real-time monitoring of Z.AI model inference performance. Track TTFT, token throughput, and reliability trends for GLM-5.2, GLM-5.1, and GLM-5.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s | ZAI Monitor",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "ZAI",
    "Z.AI",
    "AI inference",
    "LLM benchmark",
    "TTFT",
    "token throughput",
    "GLM-5.2",
    "GLM-5.1",
    "GLM-5",
    "latency dashboard",
    "AI performance monitoring",
  ],
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "ZAI Monitor",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}

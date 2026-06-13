import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#070a13",
};

export const metadata: Metadata = {
  title: "Aether | Educational Progress & Streak Tracker",
  description: "Track your daily study habits, LeetCode progress, and milestones using heatmaps, interactive graphs, and active streak challenges.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

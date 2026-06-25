import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/lib/WalletContext";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Waypoint — Milestone Escrow",
  description: "Funds unlock milestone by milestone, on Stellar.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-parchment-50 antialiased">
        <WalletProvider>
          <SiteNav />
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </WalletProvider>
      </body>
    </html>
  );
}

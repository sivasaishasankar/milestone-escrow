import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/lib/WalletContext";

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
      <body className="antialiased">
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}

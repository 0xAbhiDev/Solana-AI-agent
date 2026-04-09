import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Geist, IBM_Plex_Serif } from "next/font/google";
import { cn } from "@/lib/utils";
import WalletContextProvider from "./WalletContextProvider";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const ibmPlexSerif = IBM_Plex_Serif({
  variable: "--font-ibm-plex-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Blockchain AI Buddy",
  description: "Pay on-chain and generate AI responses with Solana.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("font-sans", geist.variable, ibmPlexSerif.variable)}
    >
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <WalletContextProvider>
          {children}
        </WalletContextProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Disclaimer } from "@/components/Disclaimer";

export const metadata: Metadata = {
  title: "Helm — oracle-safe perps on Solana",
  description:
    "A Solana devnet perpetual-futures venue that refuses to mark, trade, or liquidate on a stale, wide, or jumped oracle."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="min-h-screen antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('helm-theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}`
          }}
        />
        <Header />
        <main className="mx-auto max-w-6xl px-5 pb-16 pt-8">{children}</main>
        <Disclaimer />
      </body>
    </html>
  );
}

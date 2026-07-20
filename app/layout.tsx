import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "DVD-samlingen",
  description: "Privat DVD-katalog",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nb">
      <body>
        <header>
          <div className="container header-row">
            <Link className="app-title" href="/">
              DVD-samlingen
            </Link>
            <nav className="header-actions" aria-label="Hovedhandlinger">
              <Link className="button primary" href="/releases/new">
                + Legg til
              </Link>
              <Link className="button" href="/api/export">
                Eksporter
              </Link>
              <Link className="button" href="/unlock">
                Skrivetilgang
              </Link>
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
